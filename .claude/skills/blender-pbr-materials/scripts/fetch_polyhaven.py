"""Search, plan and download Poly Haven PBR textures or HDRIs (host Python, no bpy).

Usage:
  python3 fetch_polyhaven.py search "weathered wood" --limit 5
  python3 fetch_polyhaven.py plan rough_wood --resolution 2k
  python3 fetch_polyhaven.py download rough_wood --resolution 2k --out /absolute/textures/rough_wood
  python3 fetch_polyhaven.py download studio_small_09 --type hdris --resolution 1k
Network requests identify this tool; downloads are bounded, checked and cached.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import time
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

API = 'https://api.polyhaven.com'
USER_AGENT = 'CodexBlenderSkills-MaterialSourcing/1.2'
CACHE = Path.home()/'.cache/blender-skills/polyhaven'
ALIASES = {
    'basecolor': ('diffuse', 'diff', 'albedo', 'basecolor', 'color'),
    'normal': ('norgl', 'normalgl', 'normalopengl'),
    'roughness': ('rough', 'roughness'),
    'metallic': ('metal', 'metallic', 'metalness'),
    'ao': ('ao', 'ambientocclusion'),
    'height': ('displacement', 'disp', 'height'),
    'hdri': ('hdri',),
}


def _json(path, params=None, *, cache=CACHE, refresh=False):
    url = API+path+('?' + urlencode(params) if params else '')
    target = Path(cache)/'api'/(hashlib.sha256(url.encode()).hexdigest()+'.json')
    if not refresh and target.exists() and time.time()-target.stat().st_mtime < 86400:
        return json.loads(target.read_text())
    with urlopen(Request(url, headers={'User-Agent': USER_AGENT}), timeout=30) as response:
        data = json.load(response)
    target.parent.mkdir(parents=True, exist_ok=True)
    _write_json(target, data)
    return data


def _write_json(path, data):
    path = Path(path)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as f:
        tmp = Path(f.name)
        try:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        except BaseException:
            tmp.unlink(missing_ok=True)
            raise
    os.replace(tmp, path)


def _slug(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-z0-9][a-z0-9_-]*', value):
        raise ValueError('expected a Poly Haven asset ID, without a URL or path')
    return value


def _metadata(asset_id, info):
    return {'id': asset_id, 'name': info.get('name', asset_id),
            'source': 'Poly Haven', 'asset_url': f'https://polyhaven.com/a/{asset_id}',
            'license': 'CC0-1.0', 'license_url': 'https://polyhaven.com/license',
            'commercial_use': True, 'authors': info.get('authors', {}),
            'description': info.get('description'), 'category': info.get('category'),
            'attributes': info.get('attributes', {}), 'tags': info.get('tags', []),
            'dimensions_mm': info.get('dimensions'), 'thumbnail_url': info.get('thumbnail_url'),
            'credit': f"{info.get('name', asset_id)} — Poly Haven (CC0), https://polyhaven.com/a/{asset_id}"}


def _plan(files, resolution, requested, asset_id):
    """Choose real API entries; never synthesize download URLs or mix resolutions."""
    normalized = {re.sub('[^a-z0-9]', '', k.lower()): (k, v) for k, v in files.items()}
    selected = []
    for key in requested:
        if key not in ALIASES:
            raise ValueError(f'unsupported map: {key}')
        match = next((normalized[a] for a in ALIASES[key] if a in normalized), None)
        if not match:
            raise ValueError(f'{asset_id}: no {key} map; available: {list(files)}')
        api_map, levels = match
        formats = levels.get(resolution, {})
        order = ('hdr', 'exr') if key == 'hdri' else ('jpg', 'png') if key == 'basecolor' else ('png', 'exr')
        fmt = next((f for f in order if f in formats and 'url' in formats[f]), None)
        if not fmt:
            raise ValueError(f'{api_map}: no supported {resolution} file; choose an available resolution/format')
        entry = formats[fmt]
        url = urlparse(entry['url'])
        if url.scheme != 'https' or url.hostname not in {'dl.polyhaven.org', 'cdn.polyhaven.com'}:
            raise ValueError('unexpected Poly Haven download host')
        size = entry.get('size')
        md5 = entry.get('md5', '')
        if not isinstance(size, int) or size <= 0 or not re.fullmatch('[0-9a-fA-F]{32}', md5):
            raise ValueError('API entry is missing size or checksum; refresh metadata')
        selected.append({'map': key, 'api_map': api_map, 'resolution': resolution, 'format': fmt,
                         'filename': f'{asset_id}_{key}_{resolution}.{fmt}',
                         'url': entry['url'], 'bytes': size, 'md5': md5.lower()})
    return selected


def _digest(path, algorithm):
    h = hashlib.new(algorithm)
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1024*1024), b''): h.update(block)
    return h.hexdigest()


def _download(entry, folder):
    dest = Path(folder)/entry['filename']
    if dest.exists():
        if dest.stat().st_size != entry['bytes'] or _digest(dest, 'md5') != entry['md5']:
            raise FileExistsError(f'existing file differs: {dest}; choose another output directory')
        return {'path': str(dest), 'cached': True, 'sha256': _digest(dest, 'sha256')}
    temp = None
    try:
        req = Request(entry['url'], headers={'User-Agent': USER_AGENT})
        with urlopen(req, timeout=30) as response, tempfile.NamedTemporaryFile(dir=folder, delete=False) as f:
            temp = Path(f.name)
            count = 0
            for block in iter(lambda: response.read(1024*1024), b''):
                count += len(block)
                if count > entry['bytes']: raise ValueError('download exceeds advertised size')
                f.write(block)
        if count != entry['bytes'] or _digest(temp, 'md5') != entry['md5']:
            raise ValueError(f"size/checksum mismatch for {entry['filename']}; retry after refreshing metadata")
        os.replace(temp, dest)
    finally:
        if temp is not None: temp.unlink(missing_ok=True)
    return {'path': str(dest), 'cached': False, 'sha256': _digest(dest, 'sha256')}


def run(action='search', query=None, asset_id=None, asset_type='textures', resolution='2k',
        maps=None, out=None, max_mb=128, limit=5, cache=CACHE, refresh=False):
    """Return JSON-compatible search results, metadata, a download plan or manifest."""
    if asset_type not in ('textures', 'hdris'): raise ValueError('type must be textures or hdris')
    if not re.fullmatch(r'[1-9][0-9]*k', resolution): raise ValueError('resolution must be e.g. 1k, 2k, 4k')
    if max_mb <= 0 or not 1 <= limit <= 50: raise ValueError('positive byte budget and limit 1..50 required')
    kw = {'cache': cache, 'refresh': refresh}
    if action == 'search':
        if not query or not query.strip(): raise ValueError('search query required')
        hits = _json('/search', {'q': query, 't': asset_type}, **kw)
        catalog = _json('/assets', {'type': asset_type}, **kw)
        rows = []
        for hit in hits['results']:
            slug = hit['slug']
            if slug in catalog:
                rows.append({**_metadata(slug, catalog[slug]), 'score': hit.get('score')})
            if len(rows) >= limit: break
        return {'ok': True, 'source': 'Poly Haven', 'query': query, 'type': asset_type,
                'results': rows, 'note': 'API relevance is a shortlist; inspect previews, grain direction and physical scale.'}
    asset_id = _slug(asset_id)
    info = _json('/info/'+asset_id, **kw)
    metadata = _metadata(asset_id, info)
    if action == 'info': return {'ok': True, **metadata}
    if action not in ('plan', 'download'): raise ValueError('action must be search, info, plan or download')
    expected_type = 1 if asset_type == 'textures' else 0
    if info.get('type') != expected_type: raise ValueError('asset type does not match --type')
    files = _json('/files/'+asset_id, **kw)
    if maps is None:
        maps = ['hdri'] if asset_type == 'hdris' else ['basecolor', 'normal', 'roughness']
        if asset_type == 'textures':
            normalized = {re.sub('[^a-z0-9]', '', k.lower()) for k in files}
            maps += [k for k in ('metallic', 'ao') if any(a in normalized for a in ALIASES[k])]
    maps = list(dict.fromkeys(maps))
    if not maps: raise ValueError('request at least one map')
    if asset_type == 'hdris' and maps != ['hdri']: raise ValueError('HDRIs use only the hdri map')
    plan = _plan(files, resolution, maps, asset_id)
    total = sum(e['bytes'] for e in plan)
    if total > max_mb*1024*1024:
        raise ValueError(f'{total/1024/1024:.1f} MiB exceeds {max_mb} MiB budget; select lower resolution or raise --max-mb')
    result = {'ok': True, **metadata, 'resolution': resolution, 'bytes': total,
              'files_hash': info.get('files_hash'), 'files': plan}
    if action == 'plan': return result
    folder = Path(out).expanduser().resolve() if out else (Path(cache)/'assets'/asset_id/resolution).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    for entry in plan: entry.update(_download(entry, folder))
    result.update(downloaded_at=datetime.now(timezone.utc).isoformat(),
                  user_agent=USER_AGENT, api_terms_url='https://github.com/Poly-Haven/Public-API/blob/master/ToS.md',
                  manifest=str(folder/'source_manifest.json'),
                  texture_files=[e['path'] for e in plan], normal_convention='OpenGL' if 'normal' in maps else None)
    _write_json(folder/'source_manifest.json', result)
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument('action', choices=['search', 'info', 'plan', 'download'])
    p.add_argument('term', help='search text, or exact asset ID for other actions')
    p.add_argument('--type', dest='asset_type', choices=['textures','hdris'], default='textures')
    p.add_argument('--resolution', default='2k')
    p.add_argument('--maps', nargs='+', choices=list(ALIASES))
    p.add_argument('--out')
    p.add_argument('--max-mb', type=float, default=128)
    p.add_argument('--limit', type=int, default=5)
    p.add_argument('--cache', default=str(CACHE))
    p.add_argument('--refresh', action='store_true')
    args = vars(p.parse_args())
    term = args.pop('term')
    args['query' if args['action']=='search' else 'asset_id'] = term
    try:
        print(json.dumps(run(**args), ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({'ok':False, 'error':f'{type(e).__name__}: {e}'}, ensure_ascii=False))
        return 1
    return 0


if __name__ == '__main__': raise SystemExit(main())

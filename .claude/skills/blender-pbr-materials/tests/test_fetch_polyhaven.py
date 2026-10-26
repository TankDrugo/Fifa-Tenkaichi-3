"""Offline behavioral checks for material downloads and provenance."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1]/'scripts/fetch_polyhaven.py'
spec = importlib.util.spec_from_file_location('polyhaven_fetcher', SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
PAYLOAD = b'verified fixture payload'


def entry(fmt='png'):
    return {'url':f'https://dl.polyhaven.org/file/fixture.{fmt}',
            'size':len(PAYLOAD), 'md5':hashlib.md5(PAYLOAD).hexdigest()}


FILES = {'Diffuse':{'1k':{'jpg':entry('jpg')}},
         'nor_dx':{'1k':{'png':entry()}}, 'nor_gl':{'1k':{'png':entry()}},
         'Rough':{'1k':{'jpg':entry('jpg'),'png':entry()}}}
INFO = {'name':'Fixture Wood', 'type':1, 'authors':{'Test Artist':'All'},
        'dimensions':[1500,1500], 'files_hash':'fixture-version'}


class FetchTests(unittest.TestCase):
    def test_selects_opengl_and_lossless_data_maps(self):
        plan=m._plan(FILES,'1k',['basecolor','normal','roughness'],'fixture')
        self.assertEqual([x['api_map'] for x in plan],['Diffuse','nor_gl','Rough'])
        self.assertEqual([x['format'] for x in plan],['jpg','png','png'])

    def test_unavailable_resolution_and_jpeg_only_normal_fail(self):
        with self.assertRaises(ValueError): m._plan(FILES,'2k',['normal'],'fixture')
        with self.assertRaises(ValueError):
            m._plan({'nor_gl':{'1k':{'jpg':entry('jpg')}}},'1k',['normal'],'fixture')

    def test_budget_is_enforced_before_download(self):
        with patch.object(m,'_json',side_effect=[INFO,FILES]), patch.object(m,'_download') as transfer:
            with self.assertRaises(ValueError):
                m.run('download',asset_id='fixture',resolution='1k',max_mb=.000001)
            transfer.assert_not_called()

    def test_download_manifest_checksums_and_cache(self):
        with tempfile.TemporaryDirectory() as out:
            with patch.object(m,'_json',side_effect=[INFO,FILES]), patch.object(m,'urlopen',side_effect=lambda *a,**k:io.BytesIO(PAYLOAD)):
                r=m.run('download',asset_id='fixture',resolution='1k',out=out)
            data=json.loads(Path(r['manifest']).read_text())
            self.assertEqual(data['license'],'CC0-1.0')
            self.assertEqual(data['authors'],INFO['authors'])
            self.assertEqual(data['dimensions_mm'],[1500,1500])
            self.assertEqual(len(data['texture_files']),3)
            for file in data['files']:
                self.assertEqual(Path(file['path']).read_bytes(),PAYLOAD)
                self.assertEqual(file['sha256'],hashlib.sha256(PAYLOAD).hexdigest())
            with patch.object(m,'_json',side_effect=[INFO,FILES]), patch.object(m,'urlopen') as transfer:
                again=m.run('download',asset_id='fixture',resolution='1k',out=out)
                self.assertTrue(all(f['cached'] for f in again['files']))
                transfer.assert_not_called()

    def test_corrupt_transfer_leaves_no_partial_file(self):
        with tempfile.TemporaryDirectory() as out:
            plan=m._plan(FILES,'1k',['normal'],'fixture')[0]
            with patch.object(m,'urlopen',return_value=io.BytesIO(b'x'*len(PAYLOAD))):
                with self.assertRaises(ValueError): m._download(plan,out)
            self.assertEqual(list(Path(out).iterdir()),[])

    def test_user_file_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as out:
            plan=m._plan(FILES,'1k',['normal'],'fixture')[0]
            p=Path(out)/plan['filename'];p.write_bytes(b'user edit')
            with self.assertRaises(FileExistsError): m._download(plan,out)
            self.assertEqual(p.read_bytes(),b'user edit')

    def test_metadata_cache_reuses_request_and_names_application(self):
        with tempfile.TemporaryDirectory() as cache:
            with patch.object(m,'urlopen',return_value=io.BytesIO(json.dumps(INFO).encode())) as request:
                a=m._json('/info/fixture',cache=cache)
                b=m._json('/info/fixture',cache=cache)
                self.assertEqual(a,b)
                self.assertEqual(request.call_count,1)
                self.assertIn('CodexBlenderSkills',request.call_args.args[0].get_header('User-agent'))

    def test_path_and_unexpected_download_hosts_are_rejected(self):
        with self.assertRaises(ValueError):m._slug('../escape')
        files={'nor_gl':{'1k':{'png':{**entry(),'url':'http://other.invalid/file'}}}}
        with self.assertRaises(ValueError):m._plan(files,'1k',['normal'],'fixture')


if __name__=='__main__': unittest.main()

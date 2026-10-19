package main

// The newest game, from the site GitHub Pages builds out of the repository's main branch
// (.github/workflows/pages.yml): version.json names the commit, strikelegends-web.zip holds the
// game. A copy is kept in the user's cache folder (%LOCALAPPDATA%\StrikeLegends on Windows), so
// the game starts without the network too; the copy inside the exe is the last resort.

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"
)

const siteURL = "https://tankdrugo.github.io/Fifa-Tenkaichi-3/"

type siteVersion struct {
	Version string `json:"version"`
	Date    string `json:"date"`
}

func cacheDir() string {
	d, err := os.UserCacheDir()
	if err != nil {
		return ""
	}
	return filepath.Join(d, "StrikeLegends")
}

func exists(p string) bool { _, err := os.Stat(p); return err == nil }

func cachedVersion(dir string) string {
	b, err := os.ReadFile(filepath.Join(dir, "version.txt"))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(b))
}

// gameFS gives the newest game it can find and where it came from: the site, when it answers
// within a few seconds; else the copy downloaded before; else the one inside the exe.
// STRIKELEGENDS_SITE replaces the site's address (for tests).
func gameFS(embedded fs.FS) (fs.FS, string) {
	base := os.Getenv("STRIKELEGENDS_SITE")
	if base == "" {
		base = siteURL
	}
	dir := cacheDir()
	if dir == "" {
		return embedded, "exe"
	}
	_ = update(base, dir)
	if game := filepath.Join(dir, "game"); exists(filepath.Join(game, "index.html")) {
		return os.DirFS(game), cachedVersion(dir)
	}
	return embedded, "exe"
}

// update downloads the site's game into dir/game when its version differs from the copy there.
// The new copy is unpacked beside the old one and swapped in only once it is complete.
func update(base, dir string) error {
	if !strings.HasSuffix(base, "/") {
		base += "/"
	}
	stamp := fmt.Sprintf("?t=%d", time.Now().Unix()) // past the CDN's ten-minute cache
	quick := http.Client{Timeout: 6 * time.Second}
	res, err := quick.Get(base + "version.json" + stamp)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("version.json: %s", res.Status)
	}
	var v siteVersion
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<16)).Decode(&v); err != nil || v.Version == "" {
		return errors.New("version.json without a version")
	}
	game := filepath.Join(dir, "game")
	if v.Version == cachedVersion(dir) && exists(filepath.Join(game, "index.html")) {
		return nil
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	slow := http.Client{Timeout: 3 * time.Minute}
	zres, err := slow.Get(base + "strikelegends-web.zip" + stamp)
	if err != nil {
		return err
	}
	defer zres.Body.Close()
	if zres.StatusCode != http.StatusOK {
		return fmt.Errorf("strikelegends-web.zip: %s", zres.Status)
	}
	tmp, err := os.CreateTemp(dir, "download-*.zip")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if _, err := io.Copy(tmp, io.LimitReader(zres.Body, 512<<20)); err != nil {
		tmp.Close()
		return err
	}
	tmp.Close()
	fresh := filepath.Join(dir, "game.new")
	_ = os.RemoveAll(fresh)
	if err := unpack(tmp.Name(), fresh); err != nil {
		_ = os.RemoveAll(fresh)
		return err
	}
	old := filepath.Join(dir, "game.old")
	_ = os.RemoveAll(old)
	if exists(game) {
		if err := os.Rename(game, old); err != nil {
			return err
		}
	}
	if err := os.Rename(fresh, game); err != nil {
		_ = os.Rename(old, game)
		return err
	}
	_ = os.RemoveAll(old)
	return os.WriteFile(filepath.Join(dir, "version.txt"), []byte(v.Version+"\n"), 0o644)
}

// unpack writes the zip into dst; it refuses a zip without index.html at its root and any
// entry that would land outside dst.
func unpack(src, dst string) error {
	z, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer z.Close()
	hasIndex := false
	for _, f := range z.File {
		name := path.Clean(strings.ReplaceAll(f.Name, "\\", "/"))
		if name == "." || strings.HasPrefix(name, "../") || name == ".." || path.IsAbs(name) || strings.Contains(name, ":") {
			return fmt.Errorf("zip entry outside the game: %q", f.Name)
		}
		if name == "index.html" {
			hasIndex = true
		}
	}
	if !hasIndex {
		return errors.New("zip without index.html")
	}
	for _, f := range z.File {
		name := path.Clean(strings.ReplaceAll(f.Name, "\\", "/"))
		target := filepath.Join(dst, filepath.FromSlash(name))
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		r, err := f.Open()
		if err != nil {
			return err
		}
		w, err := os.Create(target)
		if err != nil {
			r.Close()
			return err
		}
		_, err = io.Copy(w, io.LimitReader(r, 64<<20))
		r.Close()
		if cerr := w.Close(); err == nil {
			err = cerr
		}
		if err != nil {
			return err
		}
	}
	return nil
}

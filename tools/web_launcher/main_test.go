package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"testing/fstest"
)

func TestHandler(t *testing.T) {
	root := fstest.MapFS{
		"index.html": {Data: []byte("<!doctype html>\n<title>x</title><body></body>")},
		"js/ui.js":   {Data: []byte("1")},
	}
	var last atomic.Int64
	srv := httptest.NewServer(handler(root, &last))
	defer srv.Close()
	get := func(p string) (string, string) {
		res, err := srv.Client().Get(srv.URL + p)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		b, _ := io.ReadAll(res.Body)
		return string(b), res.Header.Get("Content-Type")
	}
	if body, _ := get("/"); !strings.Contains(body, "/__ping") || !strings.HasPrefix(body, "<!doctype html>") {
		t.Errorf("index without the ping or the doctype: %q", body)
	}
	if _, typ := get("/js/ui.js"); !strings.HasPrefix(typ, "text/javascript") {
		t.Errorf("js served as %q", typ)
	}
	if body, _ := get(marker); body != "ok" {
		t.Errorf("marker answered %q", body)
	}
	get("/__ping")
	if last.Load() == 0 {
		t.Error("ping not recorded")
	}
}

func TestUpdate(t *testing.T) {
	mkzip := func(files map[string]string) []byte {
		var b bytes.Buffer
		w := zip.NewWriter(&b)
		for n, c := range files {
			f, _ := w.Create(n)
			f.Write([]byte(c))
		}
		w.Close()
		return b.Bytes()
	}
	version, body := "v1", mkzip(map[string]string{"index.html": "one", "js/a.js": "1"})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/version.json":
			fmt.Fprintf(w, `{"version":%q}`, version)
		case "/strikelegends-web.zip":
			w.Write(body)
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()
	dir := t.TempDir()
	read := func() string { b, _ := os.ReadFile(filepath.Join(dir, "game", "index.html")); return string(b) }
	if err := update(srv.URL, dir); err != nil || read() != "one" {
		t.Fatalf("first update: %v, index %q", err, read())
	}
	version, body = "v2", mkzip(map[string]string{"index.html": "two"})
	if err := update(srv.URL, dir); err != nil || read() != "two" || cachedVersion(dir) != "v2" {
		t.Fatalf("second update: %v, index %q", err, read())
	}
	// a zip that would write outside the game, or one without index.html, leaves the copy as it was
	version, body = "v3", mkzip(map[string]string{"index.html": "bad", "../evil.txt": "x"})
	if err := update(srv.URL, dir); err == nil || read() != "two" {
		t.Fatalf("zip-slip accepted: %v, index %q", err, read())
	}
	version, body = "v4", mkzip(map[string]string{"js/a.js": "1"})
	if err := update(srv.URL, dir); err == nil || read() != "two" {
		t.Fatalf("zip without index accepted: %v", err)
	}
	// the site down: the copy stays
	srv.Close()
	if err := update(srv.URL, dir); err == nil || read() != "two" {
		t.Fatalf("offline: %v, index %q", err, read())
	}
}

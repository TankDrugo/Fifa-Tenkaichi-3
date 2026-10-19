package main

import (
	"io"
	"net/http/httptest"
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

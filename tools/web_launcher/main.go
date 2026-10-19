// Strike Legends (browser game) for Windows: one exe that carries web/ inside it, serves it on
// this computer only (127.0.0.1) and opens it in a window of its own (Edge or Chrome in app mode,
// else the default browser). The game's saves live in the browser's storage for the page's
// address, so the address keeps the same port every time (basePort); a second launch while the
// first is running opens the same address instead of a new server. The page pings the server
// every few seconds; once the window is closed the pings stop and the server ends.
//
// Built by tools/build_web_dist.sh, which copies web/ next to this file as site/ first:
// go:embed only reads below the module's own folder.
package main

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"mime"
	"net"
	"net/http"
	"strings"
	"sync/atomic"
	"time"
)

//go:embed site
var site embed.FS

const (
	basePort = 47820           // the address the saves belong to
	tries    = 10              // further ports if basePort is taken by something else
	idleQuit = 20 * time.Second // no ping for this long after the first: the window is closed
	marker   = "/__strikelegends"
)

// The page's own ping, added to index.html as it is served (the game in web/ does not need it).
const pingScript = `<script>setInterval(function(){fetch("/__ping",{cache:"no-store"}).catch(function(){})},3000)</script>`

// Windows can map .js to text/plain through the registry; the game's types are set here.
func init() {
	for ext, typ := range map[string]string{".js": "text/javascript; charset=utf-8", ".json": "application/json", ".html": "text/html; charset=utf-8", ".png": "image/png", ".css": "text/css; charset=utf-8", ".wav": "audio/wav", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".webp": "image/webp"} {
		_ = mime.AddExtensionType(ext, typ)
	}
}

func main() {
	root, err := fs.Sub(site, "site")
	if err != nil {
		fail(fmt.Errorf("il gioco dentro l'exe è danneggiato: %w", err))
		return
	}
	for port := basePort; port < basePort+tries; port++ {
		url := fmt.Sprintf("http://127.0.0.1:%d/", port)
		ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
		if err != nil {
			// already running: the same game answers on its marker, so open that window again
			if ours(url) {
				openWindow(url)
				return
			}
			continue
		}
		var last atomic.Int64
		srv := &http.Server{Handler: handler(root, &last), ReadHeaderTimeout: 10 * time.Second}
		go func() { _ = srv.Serve(ln) }()
		openWindow(url)
		waitForClose(&last)
		_ = srv.Close()
		return
	}
	fail(fmt.Errorf("le porte da %d a %d di questo computer sono tutte occupate da altri programmi", basePort, basePort+tries-1))
}

// handler serves the game, answers the marker and records each ping.
func handler(root fs.FS, last *atomic.Int64) http.Handler {
	files := http.FileServer(http.FS(root))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		switch r.URL.Path {
		case marker:
			fmt.Fprint(w, "ok")
		case "/__ping":
			last.Store(time.Now().UnixNano())
			w.WriteHeader(http.StatusNoContent)
		case "/", "/index.html":
			page, err := fs.ReadFile(root, "index.html")
			if err != nil {
				http.Error(w, "index.html mancante", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			html := string(page)
			if i := strings.LastIndex(html, "</body>"); i >= 0 {
				html = html[:i] + pingScript + html[i:]
			} else {
				html += pingScript
			}
			fmt.Fprint(w, html)
		default:
			files.ServeHTTP(w, r)
		}
	})
}

func ours(url string) bool {
	c := http.Client{Timeout: 2 * time.Second}
	res, err := c.Get(strings.TrimSuffix(url, "/") + marker)
	if err != nil {
		return false
	}
	defer res.Body.Close()
	b := make([]byte, 2)
	n, _ := res.Body.Read(b)
	return res.StatusCode == http.StatusOK && string(b[:n]) == "ok"
}

// waitForClose returns once the page has pinged at least once and then stayed silent for
// idleQuit; if no ping ever comes (the browser did not open), it waits ten minutes.
func waitForClose(last *atomic.Int64) {
	start := time.Now()
	for {
		time.Sleep(2 * time.Second)
		t := last.Load()
		if t == 0 {
			if time.Since(start) > 10*time.Minute {
				return
			}
			continue
		}
		if time.Since(time.Unix(0, t)) > idleQuit {
			return
		}
	}
}

var errNoBrowser = errors.New("nessun browser trovato")

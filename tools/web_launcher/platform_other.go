//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/exec"
)

// On Linux and macOS (tests, and anyone who builds it there): the default browser.
func openWindow(url string) {
	fmt.Println("Strike Legends:", url)
	for _, c := range [][]string{{"xdg-open", url}, {"open", url}} {
		if exec.Command(c[0], c[1:]...).Start() == nil {
			return
		}
	}
}

func fail(err error) { fmt.Fprintln(os.Stderr, "Il gioco non è partito: "+err.Error()) }

//go:build windows

package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"unsafe"
)

// openWindow opens the game in a window of its own: Edge, then Chrome, in app mode (no tabs,
// no address bar); else the default browser.
func openWindow(url string) {
	for _, exe := range []string{
		filepath.Join(os.Getenv("ProgramFiles(x86)"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("ProgramFiles"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("ProgramFiles"), `Google\Chrome\Application\chrome.exe`),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), `Google\Chrome\Application\chrome.exe`),
		filepath.Join(os.Getenv("LOCALAPPDATA"), `Google\Chrome\Application\chrome.exe`),
	} {
		if _, err := os.Stat(exe); err == nil {
			if exec.Command(exe, "--app="+url, "--start-maximized").Start() == nil {
				return
			}
		}
	}
	if exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start() != nil {
		fail(errNoBrowser)
	}
}

// fail shows the error in a message box: the exe has no console (-H windowsgui).
func fail(err error) {
	user32 := syscall.NewLazyDLL("user32.dll")
	box := user32.NewProc("MessageBoxW")
	text, _ := syscall.UTF16PtrFromString(err.Error())
	title, _ := syscall.UTF16PtrFromString("Strike Legends - il gioco non è partito")
	box.Call(0, uintptr(unsafe.Pointer(text)), uintptr(unsafe.Pointer(title)), 0x10)
}

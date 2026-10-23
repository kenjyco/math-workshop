package main

import (
	"context"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"math-workshop/internal/workshop"
	"math-workshop/web"
)

var version = "development"
var sourceDigest = "development"

func main() {
	data := flag.String("data-dir", "", "Directory for learner data (default: user config/MathWorkshopFoundation)")
	port := flag.Int("port", 8713, "Loopback port; 0 selects a free port")
	showVersion := flag.Bool("version", false, "Print application and source identity")
	flag.Parse()
	if *showVersion {
		fmt.Printf("%s source=%s\n", version, sourceDigest)
		return
	}
	if *port < 0 || *port > 65535 {
		log.Fatal("port must be 0 through 65535")
	}
	if *data == "" {
		base, err := os.UserConfigDir()
		if err != nil {
			log.Fatal(err)
		}
		*data = filepath.Join(base, "MathWorkshopFoundation")
	}
	absolute, err := filepath.Abs(*data)
	if err != nil {
		log.Fatal(err)
	}
	store, err := workshop.Open(absolute, version+" source="+sourceDigest)
	if err != nil {
		log.Fatal(err)
	}
	defer store.DB.Close()
	assets, err := fs.Sub(web.Assets, "dist")
	if err != nil {
		log.Fatal(err)
	}
	if _, err = fs.ReadFile(assets, "index.html"); err != nil {
		log.Fatal("built frontend missing: ", err)
	}
	listener, err := net.Listen("tcp4", fmt.Sprintf("127.0.0.1:%d", *port))
	if err != nil {
		log.Fatal("cannot start local server (choose another --port): ", err)
	}
	server := &http.Server{
		Handler: (workshop.Server{
			Store:  store,
			Host:   listener.Addr().String(),
			Assets: assets,
		}).Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		timeout, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := server.Shutdown(timeout); err != nil {
			log.Print(err)
		}
	}()
	fmt.Printf("Math Workshop %s\nURL http://%s\nData %s\n", version, listener.Addr(), absolute)
	if err = server.Serve(listener); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

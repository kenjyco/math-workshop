package web

import "embed"

// A clean Go build deliberately fails until the locked frontend build exists.
//
//go:embed dist
var Assets embed.FS

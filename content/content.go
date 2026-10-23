package content

import _ "embed"

// Starter is structured, original lesson data; it is never executable markup.
//
//go:embed starter.json
var Starter []byte

// Legacy retains the original revision-1 bodies for immutable comparisons.
//
//go:embed legacy.json
var Legacy []byte

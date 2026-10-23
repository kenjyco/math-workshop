package workshop

import (
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"strings"
)

type Server struct {
	Store  *Store
	Host   string
	Assets fs.FS
}

func (s Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/learners", func(w http.ResponseWriter, r *http.Request) { v, e := s.Store.Learners(); reply(w, v, e) })
	mux.HandleFunc("GET /api/history", func(w http.ResponseWriter, r *http.Request) { v, e := s.Store.History(); reply(w, v, e) })
	mux.HandleFunc("GET /api/info", func(w http.ResponseWriter, r *http.Request) {
		reply(w, map[string]any{"application": s.Store.Application, "validator": Validator, "schema": schemaVersion, "storage": "workshop.sqlite in the server's data directory (shown at startup)", "binding": "loopback only"}, nil)
	})
	mux.HandleFunc("POST /api/learners/{learner}/sessions", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			New bool `json:"new"`
		}
		if !decode(w, r, &in) {
			return
		}
		v, e := s.Store.Start(r.PathValue("learner"), in.New)
		reply(w, v, e)
	})
	mux.HandleFunc("GET /api/learners/{learner}/sessions/{session}", func(w http.ResponseWriter, r *http.Request) {
		v, e := s.Store.Session(r.PathValue("learner"), r.PathValue("session"))
		reply(w, v, e)
	})
	mux.HandleFunc("PUT /api/learners/{learner}/sessions/{session}/draft", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			ExpectedVersion *int  `json:"expectedVersion"`
			Draft           Draft `json:"draft"`
		}
		if !decode(w, r, &in) {
			return
		}
		if in.ExpectedVersion == nil || *in.ExpectedVersion < 0 {
			reply(w, nil, ErrInvalid)
			return
		}
		v, e := s.Store.Save(r.PathValue("learner"), r.PathValue("session"), *in.ExpectedVersion, in.Draft)
		reply(w, map[string]any{"version": v, "sessionId": r.PathValue("session")}, e)
	})
	mux.HandleFunc("POST /api/learners/{learner}/sessions/{session}/assist", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Level int `json:"level"`
		}
		if !decode(w, r, &in) {
			return
		}
		v, e := s.Store.Assist(r.PathValue("learner"), r.PathValue("session"), in.Level)
		reply(w, map[string]int{"assistance": v}, e)
	})
	mux.HandleFunc("POST /api/learners/{learner}/sessions/{session}/attempts", func(w http.ResponseWriter, r *http.Request) {
		var in Submission
		if !decode(w, r, &in) {
			return
		}
		v, e := s.Store.Submit(r.PathValue("learner"), r.PathValue("session"), in)
		reply(w, v, e)
	})
	mux.Handle("/", http.FileServerFS(s.Assets))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
		w.Header().Set("Cache-Control", "no-store")
		if r.Host != s.Host {
			http.Error(w, "Unexpected Host", http.StatusForbidden)
			return
		}
		if origin := r.Header.Get("Origin"); origin != "" && origin != "http://"+s.Host {
			http.Error(w, "Unexpected Origin", http.StatusForbidden)
			return
		}
		if r.Method != "GET" && r.Method != "HEAD" {
			media, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
			if err != nil || media != "application/json" || r.Header.Get("X-Workshop-Request") != "1" {
				http.Error(w, "Expected same-origin JSON request", http.StatusForbidden)
				return
			}
		}
		if strings.HasPrefix(r.URL.Path, "/api/") {
			w.Header().Set("Content-Type", "application/json")
		}
		mux.ServeHTTP(w, r)
	})
}
func decode(w http.ResponseWriter, r *http.Request, out any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 16384)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(out); err != nil {
		reply(w, nil, ErrInvalid)
		return false
	}
	if err := d.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		reply(w, nil, ErrInvalid)
		return false
	}
	return true
}
func reply(w http.ResponseWriter, value any, err error) {
	if err != nil {
		status, message := http.StatusServiceUnavailable, "Storage is unavailable. Your answer was not graded. Retry when storage is available."
		switch {
		case errors.Is(err, ErrInvalid):
			status, message = http.StatusBadRequest, err.Error()
		case errors.Is(err, ErrConflict):
			status, message = http.StatusConflict, "Another tab saved work, or this submission ID has different content. Recover the saved work before continuing."
		case errors.Is(err, ErrNotFound):
			status, message = http.StatusNotFound, ErrNotFound.Error()
		default:
			log.Printf("storage operation failed: %v", err)
		}
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
		return
	}
	_ = json.NewEncoder(w).Encode(value)
}

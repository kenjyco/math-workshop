package workshop

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func TestHTTPBoundaries(t *testing.T) {
	s := testStore(t)
	handler := (Server{Store: s, Host: "127.0.0.1:8713", Assets: fstest.MapFS{"index.html": &fstest.MapFile{Data: []byte("workshop")}}}).Handler()
	call := func(method, path, body, host, origin, marker string) int {
		t.Helper()
		r := httptest.NewRequest(method, "http://127.0.0.1:8713"+path, strings.NewReader(body))
		r.Host = host
		r.Header.Set("Origin", origin)
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-Workshop-Request", marker)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w.Code
	}
	for _, tc := range []struct {
		method, path, body, host, origin, marker string
		status                                   int
	}{
		{"GET", "/api/learners", "", "evil.example", "", "", 403},
		{"GET", "/api/learners", "", "127.0.0.1:8713", "http://evil.example", "", 403},
		{"POST", "/api/learners/sprout/sessions", "{}", "127.0.0.1:8713", "", "", 403},
		{"POST", "/api/learners/sprout/sessions", "{\"parameters\":{\"a\":99}}", "127.0.0.1:8713", "", "1", 400},
		{"POST", "/api/learners/sprout/sessions", "{} {}", "127.0.0.1:8713", "", "1", 400},
		{"POST", "/api/learners/missing/sessions", "{}", "127.0.0.1:8713", "", "1", 404},
		{"POST", "/api/learners/sprout/sessions", strings.Repeat(" ", 17000), "127.0.0.1:8713", "", "1", 400},
		{"POST", "/api/learners/sprout/sessions", "{\"new\":false}", "127.0.0.1:8713", "http://127.0.0.1:8713", "1", 200},
	} {
		if got := call(tc.method, tc.path, tc.body, tc.host, tc.origin, tc.marker); got != tc.status {
			t.Fatalf("%+v: %d", tc, got)
		}
	}
	sess, _ := s.Start("comet", false)
	for _, draft := range []string{`{"factor":{"width":6.5,"height":4,"tiles":[]}}`, `{"factor":{"width":"6","height":4,"tiles":[]}}`, `{"factor":{"width":6,"height":4,"tiles":[{"id":25,"x":0,"y":0}]}}`} {
		if got := call("PUT", "/api/learners/comet/sessions/"+sess.ID+"/draft", `{"expectedVersion":0,"draft":`+draft+`}`, "127.0.0.1:8713", "", "1"); got != 400 {
			t.Fatal(got)
		}
	}
	s.DB.Close()
	if got := call(http.MethodGet, "/api/learners", "", "127.0.0.1:8713", "", ""); got != 503 {
		t.Fatal(got)
	}
}

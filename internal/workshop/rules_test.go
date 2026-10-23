package workshop

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"math-workshop/content"
	"net/http/httptest"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"testing/fstest"
)

func configured(t *testing.T, change func(*starterContent)) []byte {
	t.Helper()
	var c starterContent
	if err := strictJSON(content.Starter, &c); err != nil {
		t.Fatal(err)
	}
	change(&c)
	raw, err := json.Marshal(c)
	if err != nil {
		t.Fatal(err)
	}
	return raw
}
func TestCountingSelectionAndAnswers(t *testing.T) {
	for _, tc := range []struct {
		name      string
		a, b      Bounds
		opening   [][2]int
		size, max int
	}{
		{"default", Bounds{0, 5}, Bounds{0, 5}, nil, 36, 10},
		{"small", Bounds{0, 2}, Bounds{0, 3}, [][2]int{{0, 0}, {2, 3}}, 12, 5},
		{"zero", Bounds{0, 0}, Bounds{0, 0}, [][2]int{}, 1, 0},
	} {
		t.Run(tc.name, func(t *testing.T) {
			raw := configured(t, func(c *starterContent) {
				c.Count.Rules = CountRules{tc.a, tc.b}
				if tc.opening != nil {
					c.Count.Opening = tc.opening
				}
			})
			s, err := openWithContent(t.TempDir(), "configured", raw)
			if err != nil {
				t.Fatal(err)
			}
			defer s.DB.Close()
			seen := map[[2]int]bool{}
			var first Parameters
			for i := 0; i < tc.size; i++ {
				session, err := s.Start("sprout", true)
				if err != nil {
					t.Fatal(err)
				}
				p := session.Parameters
				if i == 0 {
					first = p
				}
				pair := [2]int{p.A, p.B}
				if seen[pair] || p.A < 0 || p.A > tc.a.Max || p.B < 0 || p.B > tc.b.Max {
					t.Fatal("invalid selection", pair)
				}
				seen[pair] = true
				if *session.Rules.Answers != (Bounds{0, tc.max}) || session.Validator != "math-v2" || session.LessonRevision != 2 {
					t.Fatal(session)
				}
				for answer := 0; answer <= tc.max; answer++ {
					d := Draft{Count: &CounterDraft{Answer: number(answer)}}
					r, err := s.Submit("sprout", session.ID, Submission{SubmissionID: fmt.Sprintf("answer-%d-%d", i, answer), Draft: d})
					want := "retry"
					if answer == p.A+p.B {
						want = "correct"
					}
					if err != nil || r.Outcome != want {
						t.Fatal(pair, answer, r, err)
					}
				}
				all := []int{}
				for id := 1; id <= p.A+p.B; id++ {
					all = append(all, id)
				}
				d := Draft{Count: &CounterDraft{Marked: all, Together: true}}
				if _, err := s.Save("sprout", session.ID, 0, d); err != nil {
					t.Fatal(err)
				}
				r, err := s.Submit("sprout", session.ID, Submission{SubmissionID: fmt.Sprintf("unsubmitted-%d", i), Draft: d})
				if err != nil || r.Outcome != "unfinished" {
					t.Fatal(r, err)
				}
				for _, bad := range []CounterDraft{{Answer: number(-1)}, {Answer: number(tc.max + 1)}, {Marked: []int{1, 1}}, {Marked: []int{0}}, {Marked: []int{p.A + p.B + 1}}} {
					if _, err := s.Save("sprout", session.ID, 1, Draft{Count: &bad}); err == nil {
						t.Fatal("accepted invalid draft", bad)
					}
				}
			}
			for a := 0; a <= tc.a.Max; a++ {
				for b := 0; b <= tc.b.Max; b++ {
					if !seen[[2]int{a, b}] {
						t.Fatal("omitted", a, b)
					}
				}
			}
			again, err := s.Start("sprout", true)
			if err != nil || !reflect.DeepEqual(again.Parameters, first) {
				t.Fatal("cycle", again, err)
			}
		})
	}
}
func TestConfigurationRejection(t *testing.T) {
	for _, change := range []func(*starterContent){
		func(c *starterContent) { c.Count.Rules.A.Max = 6 },
		func(c *starterContent) { c.Count.Rules.A.Min = -1 },
		func(c *starterContent) { c.Count.Rules.B = Bounds{3, 2} },
		func(c *starterContent) { c.Count.Opening = append(c.Count.Opening, [2]int{7, 3}) },
		func(c *starterContent) { c.Count.Opening = append(c.Count.Opening, c.Count.Opening[0]) },
		func(c *starterContent) { c.Factor.Rules.Total = 0 },
		func(c *starterContent) { c.Factor.Rules.Total = 37 },
		func(c *starterContent) { c.Factor.Rules.Widths.Max = 25 },
		func(c *starterContent) { c.Factor.Rules.Widths.Min = 0 },
		func(c *starterContent) { c.Factor.Rules.ExampleWidth = 5 },
		func(c *starterContent) { c.Factor.Rules.StartWidth = 25 },
		func(c *starterContent) { c.Factor.Rules.Widths = Bounds{4, 6} },
	} {
		if s, err := openWithContent(t.TempDir(), "bad", configured(t, change)); err == nil {
			s.DB.Close()
			t.Fatal("accepted invalid definition")
		}
	}
	good := string(content.Starter)
	for _, raw := range []string{
		strings.Replace(good, `"min": 0`, `"min": null`, 1), strings.Replace(good, `"min": 0,`, ``, 1),
		strings.Replace(good, `"max": 5`, `"max": 100000000000000000000`, 1),
		strings.Replace(good, `"max": 5`, `"max": 2.5`, 1), strings.Replace(good, `"max": 5`, `"unknown": 5`, 1),
		strings.Replace(good, `[2, 1]`, `[null, 1]`, 1), strings.Replace(good, `[2, 1]`, `[2]`, 1),
		strings.Replace(good, `[2, 1]`, `[2,1,0]`, 1), strings.Replace(good, `"total": 24`, `"total": null`, 1),
		`{}`, `null`, good + `{}`,
	} {
		if s, err := openWithContent(t.TempDir(), "bad", []byte(raw)); err == nil {
			s.DB.Close()
			t.Fatal("accepted malformed JSON", raw)
		}
	}
	s := testStore(t)
	for _, setting := range []string{`{}`, `null`, `{"totalLimit":5}`, `{"lessonId":"missing","revision":2}`, `{"lessonId":"count-combine","revision":null}`} {
		if _, err := s.DB.Exec("UPDATE learners SET settings=? WHERE id='sprout'", setting); err != nil {
			t.Fatal(err)
		}
		if _, err := s.Start("sprout", true); err == nil {
			t.Fatal("accepted settings", setting)
		}
	}
	if _, err := s.DB.Exec("UPDATE learners SET activity='unknown' WHERE id='comet'"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Start("comet", true); err == nil {
		t.Fatal("unknown activity became factors")
	}
}
func TestPinnedContractValidation(t *testing.T) {
	s := testStore(t)
	sess, err := s.Start("sprout", true)
	if err != nil {
		t.Fatal(err)
	}
	for _, change := range []func(*Session){
		func(s *Session) { s.Parameters.A = 7; s.Parameters.B = 3 }, func(s *Session) { s.Parameters.A = -1 },
		func(s *Session) { s.Validator = "math-v99" }, func(s *Session) { s.Parameters.Rules = nil },
		func(s *Session) { s.Validator = LegacyValidator }, func(s *Session) { s.Activity = "unknown" },
	} {
		bad := sess
		change(&bad)
		if _, err := resolveRules(bad); err == nil {
			t.Fatal("accepted invalid pins", bad)
		}
	}
	for _, raw := range []string{`{}`, `{"a":null,"b":0,"total":0}`, `{"a":0,"b":0,"total":0}`, `{"a":0,"b":0,"total":0,"rules":null}`} {
		if _, err := s.DB.Exec("UPDATE sessions SET parameters=? WHERE id=?", raw, sess.ID); err != nil {
			t.Fatal(err)
		}
		if _, err := s.Session("sprout", sess.ID); err == nil {
			t.Fatal("corrupt session accepted", raw)
		}
		if _, err := s.Save("sprout", sess.ID, 0, Draft{Count: &CounterDraft{}}); err == nil {
			t.Fatal("corrupt save accepted")
		}
		if _, err := s.Submit("sprout", sess.ID, Submission{SubmissionID: "corrupt-check", Draft: Draft{Count: &CounterDraft{}}}); err == nil {
			t.Fatal("corrupt check accepted")
		}
	}
}
func TestFactorConfigurationsThroughHandler(t *testing.T) {
	for _, tc := range []struct {
		n, start int
		pairs    []string
	}{
		{1, 1, []string{"1 × 1"}}, {7, 7, []string{"1 × 7"}}, {12, 4, []string{"1 × 12", "2 × 6", "3 × 4"}},
		{16, 4, []string{"1 × 16", "2 × 8", "4 × 4"}}, {24, 6, []string{"1 × 24", "2 × 12", "3 × 8", "4 × 6"}},
		{36, 6, []string{"1 × 36", "2 × 18", "3 × 12", "4 × 9", "6 × 6"}},
	} {
		t.Run(fmt.Sprint(tc.n), func(t *testing.T) {
			raw := configured(t, func(c *starterContent) {
				c.Factor.ID = fmt.Sprintf("factor-%d", tc.n)
				c.Factor.Rules = FactorRules{tc.n, Bounds{1, tc.n}, tc.start, tc.start}
			})
			dir := t.TempDir()
			s, err := openWithContent(dir, "alternate", raw)
			if err != nil {
				t.Fatal(err)
			}
			defer func() { s.DB.Close() }()
			handler := (Server{Store: s, Host: "127.0.0.1:8713", Assets: fstest.MapFS{}}).Handler()
			call := func(method, path string, in, out any) {
				t.Helper()
				body, _ := json.Marshal(in)
				req := httptest.NewRequest(method, "http://127.0.0.1:8713/api"+path, bytes.NewReader(body))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("X-Workshop-Request", "1")
				w := httptest.NewRecorder()
				handler.ServeHTTP(w, req)
				if w.Code != 200 {
					t.Fatal(w.Code, w.Body.String())
				}
				if err := json.Unmarshal(w.Body.Bytes(), out); err != nil {
					t.Fatal(err)
				}
			}
			var sess Session
			call("POST", "/learners/comet/sessions", map[string]bool{"new": true}, &sess)
			if sess.Parameters.Total != tc.n || sess.Rules.PairCount != len(tc.pairs) || sess.Draft.Factor.Width != tc.start {
				t.Fatal(sess)
			}
			seen := map[string]bool{}
			version := 0
			for w := 1; w <= tc.n; w++ {
				h := (tc.n + w - 1) / w
				for turn := 0; turn < 2; turn++ {
					bw, bh := w, h
					if turn == 1 {
						bw, bh = h, w
					}
					d := filled(bw, bh, tc.n)
					for i := range d.Factor.Tiles {
						d.Factor.Tiles[i].ID = tc.n - i
					}
					var ack map[string]any
					call("PUT", "/learners/comet/sessions/"+sess.ID+"/draft", map[string]any{"expectedVersion": version, "draft": d}, &ack)
					version++
					var result Result
					call("POST", "/learners/comet/sessions/"+sess.ID+"/attempts", Submission{SubmissionID: fmt.Sprintf("factor-%d-%d", w, turn), Draft: d}, &result)
					want := "retry"
					if w*h == tc.n {
						want = "correct"
						seen[result.Pair] = true
					}
					if result.Outcome != want {
						t.Fatal(result)
					}
					if want == "correct" && !strings.Contains(result.Feedback, fmt.Sprintf("= %d.", tc.n)) {
						t.Fatal(result)
					}
					if want == "retry" && !strings.Contains(result.Feedback, fmt.Sprintf("has %d ", w*h-tc.n)) {
						t.Fatal(result)
					}
					d.Factor.Tiles = d.Factor.Tiles[:tc.n-1]
					if r := Evaluate("factor", sess.Parameters, d); r.Outcome != "unfinished" || !strings.Contains(r.Feedback, fmt.Sprintf("all %d tiles", tc.n)) {
						t.Fatal(r)
					}
				}
			}
			if len(seen) != len(tc.pairs) {
				t.Fatal(seen)
			}
			for _, pair := range tc.pairs {
				if !seen[pair] {
					t.Fatal(pair)
				}
			}
			for _, mutate := range []func(*Board){
				func(b *Board) { b.Width = 0 },
				func(b *Board) { b.Height = tc.n + 1 },
				func(b *Board) { b.Tiles[0].ID = tc.n + 1 },
				func(b *Board) { b.Tiles[0].X = -1 },
				func(b *Board) { b.Tiles[0].Y = b.Height },
				func(b *Board) { b.Tiles = append(b.Tiles, b.Tiles[0]) },
			} {
				d := filled(tc.start, tc.n/tc.start, tc.n)
				mutate(d.Factor)
				if ValidateDraft("factor", sess.Parameters, sess.Rules, d) == nil {
					t.Fatal("invalid board accepted", d)
				}
			}
			s.DB.Close()
			s, err = openWithContent(dir, "restart", raw)
			if err != nil {
				t.Fatal(err)
			}
			resumed, err := s.Start("comet", false)
			if err != nil || resumed.ID != sess.ID || resumed.Version != version || len(resumed.Discoveries) != len(tc.pairs) {
				t.Fatal(resumed, err)
			}
			history, err := s.History()
			if err != nil || len(history) == 0 || history[0].Parameters.Total != tc.n {
				t.Fatal(history, err)
			}
		})
	}
}

// Source-generated schema-1 fixture: no prior executable or binary fixture needed.
func legacyDatabase(t *testing.T, dir string) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", filepath.Join(dir, "workshop.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(migration1); err != nil {
		t.Fatal(err)
	}
	var lessons map[string]json.RawMessage
	json.Unmarshal(content.Legacy, &lessons)
	for _, raw := range lessons {
		var id struct {
			ID       string
			Revision int
		}
		json.Unmarshal(raw, &id)
		if _, err = db.Exec("INSERT INTO lessons VALUES(?,?,?)", id.ID, id.Revision, string(raw)); err != nil {
			t.Fatal(err)
		}
	}
	for _, v := range []struct{ id, activity, lesson, p, d string }{
		{"sprout", "count", "count-combine", `{"a":2,"b":3,"total":0}`, `{"count":{"answer":5,"marked":[1,5],"together":true}}`},
		{"comet", "factor", "factor-24", `{"a":0,"b":0,"total":24}`, canonical(filled(6, 4, 24))},
	} {
		if _, err = db.Exec("INSERT INTO sessions(id,learner_id,activity,lesson_id,lesson_revision,parameters,draft,version,assistance,validator,application) VALUES(?,?,?,?,1,?,?,7,2,'math-v1','old-app')", v.id, v.id, v.activity, v.lesson, v.p, v.d); err != nil {
			t.Fatal(err)
		}
		result := `{"sessionId":"` + v.id + `","submissionId":"legacy-` + v.id + `","clientVersion":3,"outcome":"correct","feedback":"Original recorded feedback","pair":"","assistance":1}`
		if v.id == "comet" {
			result = strings.Replace(result, `"pair":""`, `"pair":"4 × 6"`, 1)
		}
		if _, err = db.Exec("INSERT INTO attempts VALUES(?,?,?,?,'old-time')", "legacy-"+v.id, v.id, "3:"+v.d, result); err != nil {
			t.Fatal(err)
		}
	}
	return db
}
func tableSnapshot(t *testing.T, db *sql.DB, table string) string {
	t.Helper()
	rows, err := db.Query("SELECT * FROM " + table + " ORDER BY rowid")
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	cols, _ := rows.Columns()
	out := []any{}
	for rows.Next() {
		values := make([]any, len(cols))
		p := make([]any, len(cols))
		for i := range p {
			p[i] = &values[i]
		}
		if err := rows.Scan(p...); err != nil {
			t.Fatal(err)
		}
		out = append(out, values)
	}
	raw, _ := json.Marshal(out)
	return string(raw)
}
func TestPopulatedLegacyMigration(t *testing.T) {
	dir := t.TempDir()
	db := legacyDatabase(t, dir)
	// Unrelated settings are neither overwritten nor silently used as defaults.
	if _, err := db.Exec(`INSERT INTO learners VALUES('custom',1,'Custom','count','{"totalLimit":3}')`); err != nil {
		t.Fatal(err)
	}
	sessions, attempts := tableSnapshot(t, db, "sessions"), tableSnapshot(t, db, "attempts")
	var legacyBody string
	db.QueryRow("SELECT body FROM lessons WHERE id='count-combine' AND revision=1").Scan(&legacyBody)
	db.Close()
	s, err := Open(dir, "new-app")
	if err != nil {
		t.Fatal(err)
	}
	defer s.DB.Close()
	if tableSnapshot(t, s.DB, "sessions") != sessions || tableSnapshot(t, s.DB, "attempts") != attempts {
		t.Fatal("migration rewrote old work")
	}
	var body, settings string
	var version int
	s.DB.QueryRow("SELECT body FROM lessons WHERE id='count-combine' AND revision=1").Scan(&body)
	s.DB.QueryRow("PRAGMA user_version").Scan(&version)
	if body != legacyBody || version != 2 {
		t.Fatal(body, version)
	}
	s.DB.QueryRow("SELECT settings FROM learners WHERE id='custom'").Scan(&settings)
	if settings != `{"totalLimit":3}` {
		t.Fatal(settings)
	}
	if _, err = s.Start("custom", true); err == nil {
		t.Fatal("unsupported setting silently ignored")
	}
	for _, id := range []string{"sprout", "comet"} {
		sess, err := s.Start(id, false)
		if err != nil || sess.ID != id || sess.Version != 7 || sess.Assistance != 2 || sess.Validator != "math-v1" || sess.Application != "old-app" {
			t.Fatal(sess, err)
		}
		if id == "sprout" && *sess.Rules.Answers != (Bounds{0, 5}) {
			t.Fatal(sess)
		}
		if id == "comet" && !reflect.DeepEqual(sess.Discoveries, []string{"4 × 6"}) {
			t.Fatal(sess)
		}
		result, err := s.Submit(id, id, Submission{SubmissionID: "legacy-" + id, ClientVersion: 3, Draft: sess.Draft})
		if err != nil || result.Feedback != "Original recorded feedback" || result.Assistance != 1 {
			t.Fatal(result, err)
		}
		if _, err = s.Save(id, id, 7, sess.Draft); err != nil {
			t.Fatal(err)
		}
		fresh, err := s.Start(id, true)
		if err != nil || fresh.LessonRevision != 2 || fresh.Validator != "math-v2" {
			t.Fatal(fresh, err)
		}
		if id == "sprout" && (fresh.Parameters.A != 2 || fresh.Parameters.B != 1 || fresh.Rules.Answers.Max != 10) {
			t.Fatal(fresh)
		}
	}
	if _, err = s.Save("sprout", "sprout", 8, Draft{Count: &CounterDraft{Answer: number(10)}}); err == nil {
		t.Fatal("legacy answer pad expanded")
	}
	if tableSnapshot(t, s.DB, "attempts") != attempts {
		t.Fatal("replay rewrote history")
	}
}
func TestMigrationRollbackAndImmutableBodies(t *testing.T) {
	dir := t.TempDir()
	db := legacyDatabase(t, dir)
	if _, err := db.Exec(`INSERT INTO lessons VALUES('count-combine',2,'{"wrong":true}')`); err != nil {
		t.Fatal(err)
	}
	before := tableSnapshot(t, db, "learners")
	db.Close()
	if s, err := Open(dir, "bad"); err == nil {
		s.DB.Close()
		t.Fatal("accepted changed immutable revision")
	}
	db, _ = sql.Open("sqlite", filepath.Join(dir, "workshop.sqlite"))
	defer db.Close()
	var version int
	db.QueryRow("PRAGMA user_version").Scan(&version)
	if version != 1 || tableSnapshot(t, db, "learners") != before {
		t.Fatal("failed migration partially applied")
	}
	var n int
	db.QueryRow("SELECT count(*) FROM lessons WHERE id='factor-24' AND revision=2").Scan(&n)
	if n != 0 {
		t.Fatal("partial lesson insertion")
	}
}

func TestRestrictedWidthsAndChangedDefaultsKeepPins(t *testing.T) {
	dir := t.TempDir()
	old := configured(t, func(c *starterContent) { c.Factor.Rules.Widths = Bounds{4, 24} })
	s, err := openWithContent(dir, "first", old)
	if err != nil {
		t.Fatal(err)
	}
	prior, err := s.Start("comet", true)
	if err != nil {
		t.Fatal(err)
	}
	// Width 13 gives 13x2. Turn is exactly 2x13, not a newly selected 2x12.
	d := Draft{Factor: &Board{Width: 2, Height: 13, Tiles: []Tile{{ID: 24, X: 1, Y: 12}}}}
	if _, err = s.Save("comet", prior.ID, 0, d); err != nil {
		t.Fatal(err)
	}
	if ValidateDraft("factor", prior.Parameters, prior.Rules, filled(3, 13, 0)) == nil {
		t.Fatal("unsupported shape")
	}
	s.DB.Close()
	next := configured(t, func(c *starterContent) { c.Factor.Revision = 3; c.Factor.Rules = FactorRules{12, Bounds{1, 12}, 4, 4} })
	s, err = openWithContent(dir, "second", next)
	if err != nil {
		t.Fatal(err)
	}
	defer s.DB.Close()
	// An explicit reference change controls new work; it cannot change a saved session.
	if _, err = s.DB.Exec(`UPDATE learners SET settings='{"lessonId":"factor-24","revision":3}' WHERE id='comet'`); err != nil {
		t.Fatal(err)
	}
	resumed, err := s.Start("comet", false)
	if err != nil || resumed.Parameters.Total != 24 || resumed.Rules.Factor.Widths.Min != 4 || !reflect.DeepEqual(resumed.Draft, d) {
		t.Fatal(resumed, err)
	}
	fresh, err := s.Start("comet", true)
	if err != nil || fresh.Parameters.Total != 12 || fresh.LessonRevision != 3 || fresh.Rules.PairCount != 3 {
		t.Fatal(fresh, err)
	}
}

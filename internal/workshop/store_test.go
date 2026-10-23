package workshop

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"sync"
	"testing"
)

func testStore(t *testing.T) *Store {
	t.Helper()
	s, e := Open(t.TempDir(), "test-preview")
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { s.DB.Close() })
	return s
}
func TestDraftSubmissionOwnershipAndRestart(t *testing.T) {
	dir := t.TempDir()
	s, e := Open(dir, "test-preview")
	if e != nil {
		t.Fatal(e)
	}
	sess, e := s.Start("sprout", false)
	if e != nil {
		t.Fatal(e)
	}
	if sess.Parameters.A != 2 || sess.Parameters.B != 1 {
		t.Fatal(sess.Parameters)
	}
	d := Draft{Count: &CounterDraft{Answer: number(3), Marked: []int{1}, Together: true}}
	if v, e := s.Save("sprout", sess.ID, 0, d); e != nil || v != 1 {
		t.Fatal(v, e)
	}
	if _, e = s.Save("sprout", sess.ID, 0, Draft{Count: &CounterDraft{Answer: number(4)}}); !errors.Is(e, ErrConflict) {
		t.Fatal(e)
	}
	if h, e := s.History(); e != nil || len(h) != 0 {
		t.Fatal("draft became attempt", h, e)
	}
	if _, e = s.Save("comet", sess.ID, 1, d); !errors.Is(e, ErrNotFound) {
		t.Fatal(e)
	}
	in := Submission{SubmissionID: "stable-submission", ClientVersion: 19, Draft: d}
	result, e := s.Submit("sprout", sess.ID, in)
	if e != nil || result.Outcome != "correct" {
		t.Fatal(result, e)
	}
	replay, e := s.Submit("sprout", sess.ID, in)
	if e != nil || !reflect.DeepEqual(result, replay) {
		t.Fatal(replay, e)
	}
	in.Draft.Count.Answer = number(2)
	if _, e = s.Submit("sprout", sess.ID, in); !errors.Is(e, ErrConflict) {
		t.Fatal(e)
	}
	if _, e = s.Submit("comet", sess.ID, in); !errors.Is(e, ErrNotFound) {
		t.Fatal(e)
	}
	if _, e = s.Assist("sprout", sess.ID, 2); e != nil {
		t.Fatal(e)
	}
	if v, e := s.Assist("sprout", sess.ID, 1); e != nil || v != 2 {
		t.Fatal("help erased", v, e)
	}
	if e = s.DB.Close(); e != nil {
		t.Fatal(e)
	}
	s, e = Open(dir, "next-application")
	if e != nil {
		t.Fatal(e)
	}
	defer s.DB.Close()
	resumed, e := s.Start("sprout", false)
	if e != nil {
		t.Fatal(e)
	}
	if resumed.ID != sess.ID || resumed.Version != 1 || resumed.Assistance != 2 || resumed.Draft.Count.Answer == nil || *resumed.Draft.Count.Answer != 3 || resumed.Application != "test-preview" {
		t.Fatalf("bad restart %+v", resumed)
	}
	h, e := s.History()
	if e != nil || len(h) != 1 || h[0].Result.Assistance != 0 {
		t.Fatal(h, e)
	}
}
func TestContentPinningAndFailures(t *testing.T) {
	s := testStore(t)
	sess, e := s.Start("comet", false)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.DB.Exec("INSERT INTO lessons VALUES('factor-24',3,'{\"total\":36}')"); e != nil {
		t.Fatal(e)
	}
	current, e := s.Session("comet", sess.ID)
	if e != nil || current.LessonRevision != 2 || current.Parameters.Total != 24 {
		t.Fatal(current, e)
	}
	if _, e = s.DB.Exec("UPDATE lessons SET body='changed' WHERE revision=1"); e == nil {
		t.Fatal("changed immutable revision")
	}
	if _, e = s.DB.Exec("INSERT INTO sessions(id,learner_id,activity,lesson_id,lesson_revision,parameters,draft,validator,application) VALUES('bad','missing','factor','factor-24',1,'{}','{}','v','a')"); e == nil {
		t.Fatal("foreign keys disabled")
	}
	if _, e = s.DB.Exec("PRAGMA query_only=ON"); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Save("comet", sess.ID, 0, filled(6, 4, 24)); e == nil {
		t.Fatal("storage failure reported saved")
	}
	if _, e = s.Submit("comet", sess.ID, Submission{SubmissionID: "failure-attempt", Draft: filled(6, 4, 24)}); e == nil {
		t.Fatal("storage failure reported graded")
	}
	if h, e := s.History(); e != nil || len(h) != 0 {
		t.Fatal(h, e)
	}
}
func TestConcurrentCompareAndSwapAndDiscoveries(t *testing.T) {
	s := testStore(t)
	sess, e := s.Start("comet", false)
	if e != nil {
		t.Fatal(e)
	}
	results := make(chan error, 2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); _, e := s.Save("comet", sess.ID, 0, filled(6, 4, 1)); results <- e }()
	}
	wg.Wait()
	close(results)
	wins, conflicts := 0, 0
	for e := range results {
		if e == nil {
			wins++
		} else if errors.Is(e, ErrConflict) {
			conflicts++
		} else {
			t.Fatal(e)
		}
	}
	if wins != 1 || conflicts != 1 {
		t.Fatal(wins, conflicts)
	}
	for _, tc := range []struct {
		id   string
		w, h int
	}{{"orientation-one", 6, 4}, {"orientation-two", 4, 6}} {
		if _, e = s.Submit("comet", sess.ID, Submission{SubmissionID: tc.id, Draft: filled(tc.w, tc.h, 24)}); e != nil {
			t.Fatal(e)
		}
	}
	saved, e := s.Session("comet", sess.ID)
	if e != nil || len(saved.Discoveries) != 1 || saved.Discoveries[0] != "4 × 6" {
		t.Fatal(saved, e)
	}
	if _, e = s.Save("comet", sess.ID, 1, filled(6, 4, 0)); e != nil {
		t.Fatal(e)
	}
	saved, _ = s.Session("comet", sess.ID)
	if len(saved.Discoveries) != 1 {
		t.Fatal("reset erased history")
	}
	fresh, e := s.Start("comet", true)
	if e != nil || fresh.ID == sess.ID || len(fresh.Discoveries) != 0 {
		t.Fatal(fresh, e)
	}
}
func TestStoppedBackupRestoreAndNewerSchema(t *testing.T) {
	dir := t.TempDir()
	s, e := Open(dir, "test")
	if e != nil {
		t.Fatal(e)
	}
	sess, e := s.Start("comet", false)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.Save("comet", sess.ID, 0, filled(5, 5, 24)); e != nil {
		t.Fatal(e)
	}
	if e = s.DB.Close(); e != nil {
		t.Fatal(e)
	}
	bytes, e := os.ReadFile(filepath.Join(dir, "workshop.sqlite"))
	if e != nil {
		t.Fatal(e)
	}
	restored := t.TempDir()
	if e = os.WriteFile(filepath.Join(restored, "workshop.sqlite"), bytes, 0600); e != nil {
		t.Fatal(e)
	}
	s, e = Open(restored, "test")
	if e != nil {
		t.Fatal(e)
	}
	var integrity string
	if e = s.DB.QueryRow("PRAGMA integrity_check").Scan(&integrity); e != nil || integrity != "ok" {
		t.Fatal(integrity, e)
	}
	saved, e := s.Start("comet", false)
	if e != nil || saved.Draft.Factor.Width != 5 || len(saved.Draft.Factor.Tiles) != 24 {
		t.Fatal(saved, e)
	}
	if _, e = s.DB.Exec("PRAGMA user_version=99"); e != nil {
		t.Fatal(e)
	}
	s.DB.Close()
	before, _ := os.ReadFile(filepath.Join(restored, "workshop.sqlite"))
	if newer, e := Open(restored, "test"); e == nil {
		newer.DB.Close()
		t.Fatal("accepted newer schema")
	}
	after, _ := os.ReadFile(filepath.Join(restored, "workshop.sqlite"))
	if !reflect.DeepEqual(before, after) {
		t.Fatal("newer database changed")
	}
}
func TestStarterSequence(t *testing.T) {
	s := testStore(t)
	want := [][2]int{{2, 1}, {0, 0}, {0, 4}, {2, 3}, {1, 1}, {5, 0}, {1, 3}}
	for _, p := range want {
		sess, e := s.Start("sprout", true)
		if e != nil || sess.Parameters.A != p[0] || sess.Parameters.B != p[1] {
			t.Fatal(sess, e)
		}
	}
}

func TestHistoryUsesPinnedProblemAndFrozenSubmission(t *testing.T) {
	s := testStore(t)
	count, err := s.Start("sprout", false)
	if err != nil {
		t.Fatal(err)
	}
	wrong := Submission{SubmissionID: "history-wrong-count", ClientVersion: 4, Draft: Draft{Count: &CounterDraft{Answer: number(2), Marked: []int{}}}}
	original, err := s.Submit("sprout", count.ID, wrong)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Assist("sprout", count.ID, 2); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Save("sprout", count.ID, 0, Draft{Count: &CounterDraft{Answer: number(3)}}); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Start("sprout", true); err != nil {
		t.Fatal(err)
	}
	history, err := s.History()
	if err != nil || len(history) != 1 {
		t.Fatal(history, err)
	}
	h := history[0]
	if h.Parameters == nil || h.Parameters.A != 2 || h.Parameters.B != 1 || h.Submission == nil || *h.Submission.Count.Answer != 2 || h.Result != original || h.Result.Assistance != 0 || h.CreatedAt == "" {
		t.Fatalf("history changed: %+v", h)
	}
	factor, err := s.Start("comet", false)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Submit("comet", factor.ID, Submission{SubmissionID: "history-partial-factor", Draft: filled(12, 2, 5)}); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Save("comet", factor.ID, 0, filled(2, 12, 24)); err != nil {
		t.Fatal(err)
	}
	history, err = s.History()
	if err != nil || len(history) != 2 {
		t.Fatal(history, err)
	}
	b := history[0].Submission.Factor
	if b.Width != 12 || b.Height != 2 || len(b.Tiles) != 5 || history[0].Parameters.Total != 24 || history[0].Result.Outcome != "unfinished" {
		t.Fatal(history[0])
	}
}

func TestHistoricResultIsNotRewrittenOrRegraded(t *testing.T) {
	s := testStore(t)
	sess, err := s.Start("sprout", false)
	if err != nil {
		t.Fatal(err)
	}
	in := Submission{SubmissionID: "historic-v1-attempt", Draft: Draft{Count: &CounterDraft{Answer: number(2), Marked: []int{}}}}
	old := `{"sessionId":"` + sess.ID + `","submissionId":"historic-v1-attempt","clientVersion":0,"outcome":"retry","feedback":"You chose 2. Tap each counter once, then try again. You can use your fingers too.","pair":"","assistance":0}`
	if _, err = s.DB.Exec("INSERT INTO attempts(submission_id,session_id,payload,result) VALUES(?,?,?,?)", in.SubmissionID, sess.ID, "0:"+canonical(in.Draft), old); err != nil {
		t.Fatal(err)
	}
	result, err := s.Submit("sprout", sess.ID, in)
	if err != nil || result.FeedbackVersion != "" || result.Feedback != "You chose 2. Tap each counter once, then try again. You can use your fingers too." {
		t.Fatal(result, err)
	}
	var raw string
	if err = s.DB.QueryRow("SELECT result FROM attempts WHERE submission_id=?", in.SubmissionID).Scan(&raw); err != nil || raw != old {
		t.Fatal(raw, err)
	}
	h, err := s.History()
	if err != nil || h[0].Result != result || *h[0].Submission.Count.Answer != 2 {
		t.Fatal(h, err)
	}
}

func TestUnavailableHistoricalContextIsNotInvented(t *testing.T) {
	s := testStore(t)
	sess, err := s.Start("sprout", false)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Submit("sprout", sess.ID, Submission{SubmissionID: "unavailable-evidence", Draft: Draft{Count: &CounterDraft{Answer: number(2)}}}); err != nil {
		t.Fatal(err)
	}
	// Simulate missing retained fields. Never infer the problem/answer from prose.
	if _, err = s.DB.Exec("UPDATE sessions SET parameters='{}' WHERE id=?", sess.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = s.DB.Exec("UPDATE attempts SET payload='unavailable' WHERE submission_id='unavailable-evidence'"); err != nil {
		t.Fatal(err)
	}
	h, err := s.History()
	if err != nil || len(h) != 1 || h[0].Parameters != nil || h[0].Submission != nil || h[0].Result.Outcome != "retry" {
		t.Fatal(h, err)
	}
}

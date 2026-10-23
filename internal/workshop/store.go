package workshop

import (
	"bytes"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"math-workshop/content"
	_ "modernc.org/sqlite"
)

type Store struct {
	DB          *sql.DB
	Application string
	starter     starterContent
}
type Learner struct {
	ID       string          `json:"id"`
	Name     string          `json:"name"`
	Activity string          `json:"activity"`
	Settings json.RawMessage `json:"settings"`
	Rules    ResolvedRules   `json:"rules"`
}
type Session struct {
	ID             string        `json:"id"`
	LearnerID      string        `json:"learnerId"`
	Activity       string        `json:"activity"`
	LessonID       string        `json:"lessonId"`
	LessonRevision int           `json:"lessonRevision"`
	Parameters     Parameters    `json:"parameters"`
	Rules          ResolvedRules `json:"rules"`
	Draft          Draft         `json:"draft"`
	Version        int           `json:"version"`
	Assistance     int           `json:"assistance"`
	Validator      string        `json:"validator"`
	Application    string        `json:"application"`
	Discoveries    []string      `json:"discoveries"`
}
type scanner interface{ Scan(...any) error }

const sessionColumns = `id,learner_id,activity,lesson_id,lesson_revision,parameters,draft,version,assistance,validator,application`

func Open(dir, application string) (*Store, error) {
	return openWithContent(dir, application, content.Starter)
}

// Internal construction seam: tests use the same parsing, migration and start path.
func openWithContent(dir, application string, definition []byte) (*Store, error) {
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}
	path := filepath.Join(dir, "workshop.sqlite")
	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return nil, err
	}
	if err = file.Close(); err != nil {
		return nil, err
	}
	dsn := (&url.URL{Scheme: "file", Path: path}).String() + "?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	// One connection and rollback journaling suit a single local process. All writes
	// use transactions; expected-version updates remain atomic across processes too.
	db.SetMaxOpenConns(1)
	s := &Store{DB: db, Application: application}
	if err = s.initialize(definition); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}
func (s *Store) initialize(definition []byte) error {
	if err := strictJSON(definition, &s.starter); err != nil {
		return fmt.Errorf("invalid activity configuration: %w", err)
	}
	if err := s.starter.validate(); err != nil {
		return err
	}
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var version int
	if err = tx.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		return err
	}
	if version > schemaVersion {
		return fmt.Errorf("database schema %d is newer than supported %d; no migration performed", version, schemaVersion)
	}
	if version == 0 {
		if _, err = tx.Exec(migration1); err != nil {
			return err
		}
	}
	// Preserve legacy serialized bodies exactly. Never pass them through new structs.
	for _, document := range [][]byte{content.Legacy, definition} {
		var lessons map[string]json.RawMessage
		if err = json.Unmarshal(document, &lessons); err != nil {
			return err
		}
		for _, raw := range lessons {
			var identity struct {
				ID       string `json:"id"`
				Revision int    `json:"revision"`
			}
			if err = json.Unmarshal(raw, &identity); err != nil {
				return err
			}
			var body bytes.Buffer
			if err = json.Compact(&body, raw); err != nil {
				return err
			}
			if _, err = tx.Exec("INSERT OR IGNORE INTO lessons VALUES(?,?,?)", identity.ID, identity.Revision, body.String()); err != nil {
				return err
			}
			var existing string
			if err = tx.QueryRow("SELECT body FROM lessons WHERE id=? AND revision=?", identity.ID, identity.Revision).Scan(&existing); err != nil {
				return err
			}
			if existing != body.String() {
				return errors.New("embedded lesson revision disagrees with stored immutable revision")
			}
		}
	}
	if version < 2 {
		if err = migrateSettings(tx, s.starter); err != nil {
			return err
		}
	}
	return tx.Commit()
}
func (s *Store) Learners() ([]Learner, error) {
	rows, err := s.DB.Query("SELECT id,name,activity,settings FROM learners ORDER BY rowid")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []Learner{}
	for rows.Next() {
		var l Learner
		var raw string
		if err = rows.Scan(&l.ID, &l.Name, &l.Activity, &raw); err != nil {
			return nil, err
		}
		l.Settings = json.RawMessage(raw)
		if l.Rules, err = s.starter.learnerRules(l.Activity, []byte(raw)); err != nil {
			return nil, err
		}
		result = append(result, l)
	}
	return result, rows.Err()
}
func readSession(row scanner) (Session, error) {
	var s Session
	var p, d string
	err := row.Scan(&s.ID, &s.LearnerID, &s.Activity, &s.LessonID, &s.LessonRevision, &p, &d, &s.Version, &s.Assistance, &s.Validator, &s.Application)
	if errors.Is(err, sql.ErrNoRows) {
		return s, ErrNotFound
	}
	if err != nil {
		return s, err
	}
	if err = required([]byte(p), "a", "b", "total"); err != nil {
		return s, err
	}
	if err = strictJSON([]byte(p), &s.Parameters); err != nil {
		return s, err
	}
	if s.Rules, err = resolveRules(s); err != nil {
		return s, err
	}
	err = json.Unmarshal([]byte(d), &s.Draft)
	s.Discoveries = []string{}
	return s, err
}
func newID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b[:])
}
func (s *Store) Start(learner string, fresh bool) (Session, error) {
	tx, err := s.DB.Begin()
	if err != nil {
		return Session{}, err
	}
	defer tx.Rollback()
	var activity, settings string
	if err = tx.QueryRow("SELECT activity,settings FROM learners WHERE id=?", learner).Scan(&activity, &settings); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			err = ErrNotFound
		}
		return Session{}, err
	}
	if !fresh {
		current, e := readSession(tx.QueryRow("SELECT "+sessionColumns+" FROM sessions WHERE learner_id=? ORDER BY rowid DESC LIMIT 1", learner))
		if e == nil {
			if err = tx.Commit(); err != nil {
				return Session{}, err
			}
			return s.Session(learner, current.ID)
		}
		if !errors.Is(e, ErrNotFound) {
			return Session{}, e
		}
	}
	rules, err := s.starter.learnerRules(activity, []byte(settings))
	if err != nil {
		return Session{}, err
	}
	ref, _ := s.starter.reference(activity)
	sess := Session{ID: newID(), LearnerID: learner, Activity: activity, LessonID: ref.ID, LessonRevision: ref.Revision, Validator: Validator, Application: s.Application, Rules: rules}
	sess.Parameters.Rules = &rules.Rules
	switch activity {
	case "count":
		var n int
		if err = tx.QueryRow("SELECT count(*) FROM sessions WHERE learner_id=? AND lesson_id=? AND lesson_revision=?", learner, ref.ID, ref.Revision).Scan(&n); err != nil {
			return sess, err
		}
		sequence := s.starter.Count.sequence()
		p := sequence[n%len(sequence)]
		sess.Parameters.A = p[0]
		sess.Parameters.B = p[1]
		sess.Draft = Draft{Count: &CounterDraft{Marked: []int{}}}
	case "factor":
		f := rules.Factor
		sess.Parameters.Total = f.Total
		sess.Draft = Draft{Factor: &Board{Width: f.StartWidth, Height: (f.Total + f.StartWidth - 1) / f.StartWidth, Tiles: []Tile{}}}
	default:
		return sess, invalid("unsupported activity")
	}
	p, _ := json.Marshal(sess.Parameters)
	_, err = tx.Exec("INSERT INTO sessions(id,learner_id,activity,lesson_id,lesson_revision,parameters,draft,validator,application) VALUES(?,?,?,?,?,?,?,?,?)", sess.ID, learner, activity, sess.LessonID, sess.LessonRevision, string(p), canonical(sess.Draft), Validator, s.Application)
	if err != nil {
		return sess, err
	}
	if err = tx.Commit(); err != nil {
		return sess, err
	}
	return s.Session(learner, sess.ID)
}
func (s *Store) Session(learner, id string) (Session, error) {
	sess, err := readSession(s.DB.QueryRow("SELECT "+sessionColumns+" FROM sessions WHERE id=? AND learner_id=?", id, learner))
	if err != nil {
		return sess, err
	}
	rows, err := s.DB.Query("SELECT DISTINCT json_extract(result,'$.pair') FROM attempts WHERE session_id=? AND json_extract(result,'$.pair')<>'' ORDER BY json_extract(result,'$.pair')", id)
	if err != nil {
		return sess, err
	}
	defer rows.Close()
	for rows.Next() {
		var p string
		if err = rows.Scan(&p); err != nil {
			return sess, err
		}
		sess.Discoveries = append(sess.Discoveries, p)
	}
	return sess, rows.Err()
}
func (s *Store) Save(learner, id string, version int, draft Draft) (int, error) {
	tx, err := s.DB.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	sess, err := readSession(tx.QueryRow("SELECT "+sessionColumns+" FROM sessions WHERE id=? AND learner_id=?", id, learner))
	if err != nil {
		return 0, err
	}
	if err = ValidateDraft(sess.Activity, sess.Parameters, sess.Rules, draft); err != nil {
		return 0, err
	}
	r, err := tx.Exec("UPDATE sessions SET draft=?,version=version+1 WHERE id=? AND learner_id=? AND version=?", canonical(draft), id, learner, version)
	if err != nil {
		return 0, err
	}
	n, err := r.RowsAffected()
	if err != nil {
		return 0, err
	}
	if n != 1 {
		return 0, ErrConflict
	}
	if err = tx.Commit(); err != nil {
		return 0, err
	}
	return version + 1, nil
}
func (s *Store) Assist(learner, id string, level int) (int, error) {
	if level < 1 || level > 2 {
		return 0, ErrInvalid
	}
	var actual int
	err := s.DB.QueryRow("UPDATE sessions SET assistance=max(assistance,?) WHERE id=? AND learner_id=? RETURNING assistance", level, id, learner).Scan(&actual)
	if errors.Is(err, sql.ErrNoRows) {
		err = ErrNotFound
	}
	return actual, err
}

type Submission struct {
	SubmissionID  string `json:"submissionId"`
	ClientVersion int    `json:"clientVersion"`
	Draft         Draft  `json:"draft"`
}

func (s *Store) Submit(learner, id string, in Submission) (Result, error) {
	if len(in.SubmissionID) < 8 || len(in.SubmissionID) > 80 || in.ClientVersion < 0 {
		return Result{}, ErrInvalid
	}
	tx, err := s.DB.Begin()
	if err != nil {
		return Result{}, err
	}
	defer tx.Rollback()
	sess, err := readSession(tx.QueryRow("SELECT "+sessionColumns+" FROM sessions WHERE id=? AND learner_id=?", id, learner))
	if err != nil {
		return Result{}, err
	}
	if err = ValidateDraft(sess.Activity, sess.Parameters, sess.Rules, in.Draft); err != nil {
		return Result{}, err
	}
	payload := fmt.Sprintf("%d:%s", in.ClientVersion, canonical(in.Draft))
	var priorSession, priorPayload, raw string
	err = tx.QueryRow("SELECT session_id,payload,result FROM attempts WHERE submission_id=?", in.SubmissionID).Scan(&priorSession, &priorPayload, &raw)
	if err == nil {
		if priorSession != id || priorPayload != payload {
			return Result{}, ErrConflict
		}
		var result Result
		err = json.Unmarshal([]byte(raw), &result)
		return result, err
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Result{}, err
	}
	result := Evaluate(sess.Activity, sess.Parameters, in.Draft)
	result.SessionID = id
	result.SubmissionID = in.SubmissionID
	result.ClientVersion = in.ClientVersion
	result.Assistance = sess.Assistance
	encoded, _ := json.Marshal(result)
	_, err = tx.Exec("INSERT INTO attempts(submission_id,session_id,payload,result) VALUES(?,?,?,?)", in.SubmissionID, id, payload, string(encoded))
	if err != nil {
		return Result{}, err
	}
	return result, tx.Commit()
}

type History struct {
	Learner    string      `json:"learner"`
	Activity   string      `json:"activity"`
	CreatedAt  string      `json:"createdAt"`
	Result     Result      `json:"result"`
	Parameters *Parameters `json:"parameters"`
	Submission *Draft      `json:"submission"`
}

func (s *Store) History() ([]History, error) {
	rows, err := s.DB.Query("SELECT learners.name,sessions.activity,attempts.created_at,attempts.result,sessions.parameters,attempts.payload FROM attempts JOIN sessions ON sessions.id=attempts.session_id JOIN learners ON learners.id=sessions.learner_id ORDER BY attempts.rowid DESC LIMIT 50")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []History{}
	for rows.Next() {
		var h History
		var raw, parameters, payload string
		if err = rows.Scan(&h.Learner, &h.Activity, &h.CreatedAt, &raw, &parameters, &payload); err != nil {
			return nil, err
		}
		if err = json.Unmarshal([]byte(raw), &h.Result); err != nil {
			return nil, err
		}
		// Read immutable structured evidence, never current drafts or feedback prose.
		// The original payload format is clientVersion + ':' + canonical Draft JSON.
		var p *Parameters
		var fields map[string]json.RawMessage
		if json.Unmarshal([]byte(parameters), &p) == nil && p != nil && json.Unmarshal([]byte(parameters), &fields) == nil {
			present := func(key string) bool { value, ok := fields[key]; return ok && string(value) != "null" }
			if (h.Activity == "count" && present("a") && present("b")) || (h.Activity == "factor" && present("total")) {
				h.Parameters = p
			}
		}
		version, body, found := strings.Cut(payload, ":")
		_, versionError := strconv.Atoi(version)
		var draft Draft
		if found && versionError == nil && json.Unmarshal([]byte(body), &draft) == nil {
			h.Submission = &draft
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

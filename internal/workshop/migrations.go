package workshop

import (
	"database/sql"
	"encoding/json"
)

const schemaVersion = 2

const migration1 = `
CREATE TABLE households(id INTEGER PRIMARY KEY, name TEXT NOT NULL);
INSERT INTO households VALUES(1,'Local household');
CREATE TABLE learners(id TEXT PRIMARY KEY, household_id INTEGER NOT NULL REFERENCES households(id), name TEXT NOT NULL, activity TEXT NOT NULL, settings TEXT NOT NULL);
INSERT INTO learners VALUES('sprout',1,'Sprout','count','{"totalLimit":5}'),('comet',1,'Comet','factor','{"total":24}');
CREATE TABLE lessons(id TEXT NOT NULL, revision INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(id,revision));
CREATE TRIGGER lessons_immutable_update BEFORE UPDATE ON lessons BEGIN SELECT RAISE(ABORT,'lesson revisions are immutable'); END;
CREATE TRIGGER lessons_immutable_delete BEFORE DELETE ON lessons BEGIN SELECT RAISE(ABORT,'lesson revisions are immutable'); END;
CREATE TABLE sessions(
 id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(id), activity TEXT NOT NULL,
 lesson_id TEXT NOT NULL, lesson_revision INTEGER NOT NULL, parameters TEXT NOT NULL,
 draft TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, assistance INTEGER NOT NULL DEFAULT 0,
 validator TEXT NOT NULL, application TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 FOREIGN KEY(lesson_id,lesson_revision) REFERENCES lessons(id,revision));
CREATE TABLE attempts(
 submission_id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
 payload TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX learner_sessions ON sessions(learner_id);
CREATE INDEX session_attempts ON attempts(session_id);
PRAGMA user_version=1;
`

// Migration 2 changes only the exact known seeded settings. All session/attempt
// bytes and unrelated learner choices remain untouched. Fresh installs run 1 then 2.
func migrateSettings(tx *sql.Tx, starter starterContent) error {
	for _, seed := range []struct{ id, activity, old string }{{"sprout", "count", `{"totalLimit":5}`}, {"comet", "factor", `{"total":24}`}} {
		ref, err := starter.reference(seed.activity)
		if err != nil {
			return err
		}
		raw, err := json.Marshal(ref)
		if err != nil {
			return err
		}
		if _, err = tx.Exec("UPDATE learners SET settings=? WHERE id=? AND activity=? AND settings=?", string(raw), seed.id, seed.activity, seed.old); err != nil {
			return err
		}
	}
	_, err := tx.Exec("PRAGMA user_version=2")
	return err
}

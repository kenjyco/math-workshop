"""Exercise a real executable using only disposable synthetic learner data."""
import argparse
import hashlib
import json
import pathlib
import selectors
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from contextlib import contextmanager


@contextmanager
def running(executable, directory):
    process = subprocess.Popen([str(executable), "--data-dir", str(directory), "--port", "0"],
                               cwd=directory.parent, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    try:
        # Read bytes without buffered readline prefetch hiding a ready URL line.
        output = b""
        while b"\nData " not in output:
            if not selector.select(15):
                raise RuntimeError("server did not print its loopback URL within 15 seconds")
            chunk = process.stdout.read1(4096)
            if not chunk:
                raise RuntimeError("server exited: " + process.stderr.read().decode())
            output += chunk
        url = next(line[4:] for line in output.decode().splitlines() if line.startswith("URL "))
        yield url
    finally:
        selector.close()
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
                raise RuntimeError("test-owned server failed to stop cleanly")
        if process.returncode != 0:
            raise RuntimeError("server did not exit cleanly: " + process.stderr.read().decode())


def request(url, endpoint, method="GET", body=None, expected=200):
    headers = {"Content-Type": "application/json", "X-Workshop-Request": "1"}
    req = urllib.request.Request(url + "/api" + endpoint, method=method, headers=headers,
                                 data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            code, payload = response.status, response.read()
    except urllib.error.HTTPError as error:
        code, payload = error.code, error.read()
    if code != expected:
        raise AssertionError(f"{method} {endpoint}: expected {expected}, got {code}: {payload!r}")
    return json.loads(payload)


def run(executable):
    with tempfile.TemporaryDirectory(prefix="workshop-smoke-") as temporary:
        root = pathlib.Path(temporary)
        data = root / "original"
        with running(executable, data) as url:
            count = request(url, "/learners/sprout/sessions", "POST", {"new": False})
            assert count["parameters"] == {"a": 2, "b": 1, "total": 0,
                "rules": {"count": {"a": {"min": 0, "max": 5}, "b": {"min": 0, "max": 5}}}}
            assert count["rules"]["answers"] == {"min": 0, "max": 10}
            assert request(url, "/info")["schema"] == 2
            base = "/learners/sprout/sessions/" + count["id"]
            draft = {"count": {"answer": 3, "marked": [1], "together": True}}
            ack = request(url, base + "/draft", "PUT", {"expectedVersion": 0, "draft": draft})
            assert ack["version"] == 1
            request(url, base + "/draft", "PUT", {"expectedVersion": 0, "draft": draft}, 409)
            assert request(url, "/history") == []
            submission = {"submissionId": "smoke-count-001", "clientVersion": 7, "draft": draft}
            result = request(url, base + "/attempts", "POST", submission)
            assert result["outcome"] == "correct"
            assert request(url, base + "/attempts", "POST", submission) == result
            submission["draft"]["count"]["answer"] = 4
            request(url, base + "/attempts", "POST", submission, 409)
            factor = request(url, "/learners/comet/sessions", "POST", {"new": False})
            fbase = "/learners/comet/sessions/" + factor["id"]
            tiles = [{"id": i + 1, "x": i % 6, "y": i // 6} for i in range(24)]
            board = {"factor": {"width": 6, "height": 4, "tiles": tiles}}
            correct = request(url, fbase + "/attempts", "POST", {"submissionId": "smoke-factor-001", "clientVersion": 0, "draft": board})
            assert correct["pair"] == "4 × 6" and correct["outcome"] == "correct"
            request(url, fbase + "/draft", "PUT", {"expectedVersion": 0, "draft": board})
        # The process is stopped before copying. No online-file-copy claim.
        restored = root / "restored"
        restored.mkdir()
        shutil.copy2(data / "workshop.sqlite", restored / "workshop.sqlite")
        with sqlite3.connect(restored / "workshop.sqlite") as database:
            assert database.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        with running(executable, restored) as url:
            resumed = request(url, "/learners/comet/sessions", "POST", {"new": False})
            assert resumed["id"] == factor["id"] and resumed["draft"] == board
            assert resumed["discoveries"] == ["4 × 6"]
            sprout = request(url, "/learners/sprout/sessions", "POST", {"new": False})
            assert sprout["draft"]["count"]["answer"] == 3
            assert len(request(url, "/history")) == 2
        with sqlite3.connect(restored / "workshop.sqlite") as database:
            database.execute("PRAGMA user_version=99")
        file = restored / "workshop.sqlite"
        before = hashlib.sha256(file.read_bytes()).hexdigest()
        rejected = subprocess.run([str(executable), "--data-dir", str(restored), "--port", "0"],
                                  capture_output=True, timeout=10)
        assert rejected.returncode != 0 and b"newer than supported" in rejected.stderr
        assert hashlib.sha256(file.read_bytes()).hexdigest() == before
    print("PASS: executable API, draft/attempt separation, replay/conflict, both activities,")
    print("stopped-app backup/restore, integrity, persisted discoveries, newer-schema refusal.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--executable", required=True, type=pathlib.Path,
                        help="built Math Workshop executable; creates and removes its own temporary data")
    parser.add_argument("--previous-executable", type=pathlib.Path,
                        help="optional prior preview to create a synthetic compatibility database")
    arguments = parser.parse_args()
    executable = arguments.executable.resolve()
    if not executable.is_file():
        parser.error(f"executable does not exist: {executable}")
    try:
        run(executable)
        if arguments.previous_executable:
            compatibility(arguments.previous_executable.resolve(), executable)
    except (AssertionError, OSError, RuntimeError, subprocess.TimeoutExpired, ValueError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    return 0


def compatibility(previous, revised):
    """Create prior-schema evidence with the old binary, never owner data."""
    with tempfile.TemporaryDirectory(prefix="workshop-compatibility-") as temporary:
        data = pathlib.Path(temporary) / "synthetic-prior"
        with running(previous, data) as url:
            count = request(url, "/learners/sprout/sessions", "POST", {"new": False})
            cbase = "/learners/sprout/sessions/" + count["id"]
            draft = {"count": {"answer": 2, "marked": [1], "together": True}}
            request(url, cbase + "/draft", "PUT", {"expectedVersion": 0, "draft": draft})
            submission = {"submissionId": "prior-synthetic-count", "clientVersion": 1, "draft": draft}
            recorded = request(url, cbase + "/attempts", "POST", submission)
            request(url, cbase + "/assist", "POST", {"level": 1})
            factor = request(url, "/learners/comet/sessions", "POST", {"new": False})
            fbase = "/learners/comet/sessions/" + factor["id"]
            complete = {"factor": {"width": 6, "height": 4, "tiles": [
                {"id": i+1, "x": i%6, "y": i//6} for i in range(24)]}}
            request(url, fbase + "/attempts", "POST", {"submissionId": "prior-factor-pair",
                "clientVersion": 0, "draft": complete})
            board = {"factor": {"width": 12, "height": 2, "tiles": [{"id": 24, "x": 11, "y": 1}]}}
            request(url, fbase + "/draft", "PUT", {"expectedVersion": 0, "draft": board})
            request(url, fbase + "/attempts", "POST", {"submissionId": "prior-synthetic-factor", "clientVersion": 1, "draft": board})
        with sqlite3.connect(data / "workshop.sqlite") as database:
            original = database.execute("SELECT * FROM attempts ORDER BY rowid").fetchall()
            original_sessions = database.execute("SELECT * FROM sessions ORDER BY rowid").fetchall()
            original_lessons = database.execute("SELECT * FROM lessons ORDER BY rowid").fetchall()
            assert database.execute("PRAGMA user_version").fetchone()[0] == 1
        with running(revised, data) as url:
            resumed = request(url, "/learners/sprout/sessions", "POST", {"new": False})
            assert resumed["id"] == count["id"] and resumed["application"] == count["application"]
            assert resumed["validator"] == count["validator"] and resumed["draft"] == draft and resumed["assistance"] == 1
            assert request(url, cbase + "/attempts", "POST", submission) == recorded
            assert resumed["parameters"] == count["parameters"]
            assert resumed["rules"]["answers"] == {"min": 0, "max": 5}
            request(url, cbase + "/draft", "PUT", {"expectedVersion": 1,
                "draft": {"count": {"answer": 10, "marked": [], "together": False}}}, 400)
            factor_resumed = request(url, "/learners/comet/sessions", "POST", {"new": False})
            assert factor_resumed["id"] == factor["id"] and factor_resumed["draft"] == board
            assert factor_resumed["discoveries"] == ["4 × 6"]
            entries = request(url, "/history")
            assert entries[-1]["parameters"] == count["parameters"] and entries[-1]["submission"] == draft
            # Preserve the whole prior result, whether its feedback was versioned
            # or came from the original unversioned preview.
            assert entries[-1]["result"] == recorded
            assert entries[0]["submission"] == board and entries[0]["parameters"]["total"] == 24
        with sqlite3.connect(data / "workshop.sqlite") as database:
            assert database.execute("SELECT * FROM attempts ORDER BY rowid").fetchall() == original
            assert database.execute("SELECT * FROM sessions ORDER BY rowid").fetchall() == original_sessions
            assert database.execute("SELECT * FROM lessons WHERE revision=1 ORDER BY rowid").fetchall() == original_lessons
            assert database.execute("PRAGMA user_version").fetchone()[0] == 2
            assert database.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        with running(revised, data) as url:
            fresh = request(url, "/learners/sprout/sessions", "POST", {"new": True})
            assert fresh["id"] != count["id"] and fresh["lessonRevision"] == 2
            assert fresh["validator"] == "math-v2" and fresh["rules"]["answers"]["max"] == 10
    print("PASS: prior-preview synthetic schema-1 database migrates to schema 2 and resumes both activities;")
    print("original attempt bytes, replay identity, problem/board context and assistance preserved.")


if __name__ == "__main__":
    sys.exit(main())

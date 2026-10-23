# Math Workshop

This package contains an executable with its interface and original starter lessons.
VERSION.txt identifies its version, platform and source. No Node or Python is
needed to run it. Verify the extracted files before starting:

```sh
shasum -a 256 -c SHA256SUMS
./math-workshop --version
./math-workshop --help
./math-workshop --data-dir /path/to/my-workshop-data --port 0
```

Choose a private writable data directory outside the package. Without `--data-dir`,
the OS user config directory plus `MathWorkshopFoundation` is used. Open the exact
printed URL. Access is local-only on 127.0.0.1. Port 0 chooses a free port; a specified
occupied port is an error. Stop with Ctrl-C and wait for exit. There is no background
service. Run only one instance per data directory.

To back up, stop every app using that data directory and wait for exit, then copy
`workshop.sqlite` to a separate backup directory. A live main-file copy is not a
coherent backup. Restore into a different empty directory and launch with that
`--data-dir`; confirm expected learners, drafts and attempts before adopting it.
Keep the original untouched. Unsupported newer schemas are refused; do not lower
the schema number manually.

New counting uses independent addends 0–5 and answer choices 0–10. Factor
rectangles use 24 tiles by default. Resumed older work keeps its original rules.
Profiles are local choices, not authentication. THIRD-PARTY-NOTICES.txt contains
bundled dependency notices; no license for original code/content has been granted.

# Find help with homework

From the root of a portable Math Workshop copy, use Python 3.9 or later and Pandoc (tested with 3.2). Choose a new output directory outside the source tree.

```sh
python3 search/build.py --out ../homework-site
python3 search/verify.py --site ../homework-site --work ../homework-check
python3 -m http.server 8000 --bind 127.0.0.1 --directory ../homework-site
```

Open <http://127.0.0.1:8000/>. Stop the preview with Ctrl+C. The generated directory can be served at its own URL prefix. Its search script fetches the adjacent index over HTTP and matches locally. The reader uses ordinary links. Only building needs Python and Pandoc.

## Catalog and reader

Each catalog destination identifies one source heading. Its claims name the goal, matching terms, relationship, explanation and editorial order. A claim can override the preview. Chapter claims also identify the precise worked heading supporting the explanation. The builder obtains grades from the goal contracts’ standard rows and checks chapter claims against worked links in that section. Shared worked records keep their distinct goal slices. The public index contains display and matching fields, grades and goal IDs.

Phrases use Unicode normalization, case folding to lowercase, dash/space equivalence, a finite plural list and reviewed variants. Full recognized terms take precedence. For other wording, the words “help”, “with”, “the”, “how”, “to”, “for” and “and” can be skipped. All remaining words must be covered by complete supported terms for one heading and grade. Within each group, direct instruction comes first, followed by supported names, related representations and prerequisites. A combined request takes the weakest relationship required. Where possible, one claim explains the combination. Editorial order and the stable ID break ties.

Query and grade appear in the URL fragment. Browser history also remembers the expanded groups, last link and position. A normal reader navigation link starts a fresh search. Future activities would need real playable local destinations with verified grade and term claims before adding another result type.

## Checks

The builder parses GFM with Pandoc’s dollar and GFM math extensions disabled. It preserves heading identifiers and rewrites course links to HTML. It validates the result destinations, relative link graph, tables, preformatted blocks and original SVGs before installing a fresh output directory.

The verifier checks pinned path-and-byte fingerprints of the original foundation and teaching files. With `--site` it inspects an existing build. With `--work` it builds twice into a new directory and compares every output byte. Supply both to compare a third bundle. Neither step uses repository history.

For a browser check, try “place-value blocks” in Grade 2, then “partial quotients” in Grade 4. Open the rods or group ledger, check the exact heading and use Back. Try “compatible numbers” in Grades 4 and 2. For a longer list, use “addition” across all grades, expand both groups and return from a later result. Tab through the controls and results, check the counts after a grade change, and try a narrow window and 200% browser zoom.

# Math Workshop V2

Math Workshop is a source-first mathematics course for kindergarten through Grade 4. You can read the teaching chapters, worked examples and learning goals as Markdown on GitHub or in a standalone copy.

- [Read the teaching course](teaching/README.md). Explore 22 chapters that connect mathematical questions with explanations, diagrams and worked checks. For a first question, try “Where should my finger stop?” as you count around a circle.
- [Browse worked examples](examples/README.md). Choose your grade to find one of 53 worked records, with visual representations you can count, measure or compare.
- [Find help with homework](search/README.md). Use the local static site to search for a classroom term, select a grade and open the exact section of a chapter or worked example.

## Run Homework Search locally

You need Python 3.9 or later and Pandoc (tested with version 3.2). From the repository root, run the commands below. The builder creates the sibling directory `../homework-site`. That path must not already exist. Keep the generated files outside the repository.

```sh
python3 search/build.py --out ../homework-site
python3 -m http.server 8000 --bind 127.0.0.1 --directory ../homework-site
```

Open <http://127.0.0.1:8000/>. Search for **place-value blocks** and choose **2** in the Grade menu. Under **Chapter sections**, open **Trade and return with tens and hundreds**. In “Trade and return,” follow **a hundred from ten rods** to see how ten rods of ten ones cover one flat.

Stop the server with Ctrl+C. To use the same site again, run just the server command. The source file `search/index.html` is a template. The browser search uses the generated page and index together over HTTP. For commands to verify the site and compare fresh builds, see the [Homework Search guide](search/README.md).

## How the mathematics is checked

The [K–4 foundation goals](goals/README.md) identify the standards and their sources, the number ranges for each grade and the reasoning each example must show. The worked examples check intermediate steps as well as answers. Short parent bridges alongside the examples connect classroom representations to familiar methods while keeping each grade’s requirements clear.

## Project and contributor guidance

Interactive practice activities are planned for future work. The [North Star](NORTH_STAR.md) describes how learners could explore an explanation and return to an unfinished problem. Contributors can start with the [repository instructions](AGENTS.md) and [reading order](.context/README.md).

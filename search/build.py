"""Render the portable course and its section-level search index."""
import argparse
from collections import defaultdict
from html import escape
import json
import os
from pathlib import Path
import posixpath
import re
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit, urlunsplit
from xml.etree import ElementTree

sys.dont_write_bytecode = True
from verify import Page, check_site, require

SEARCH = Path(__file__).resolve().parent
ROOT = SEARCH.parent
COLLECTIONS = ('teaching', 'examples')
READER = 'gfm-tex_math_dollars-tex_math_gfm'


def nodes(item):
    if isinstance(item, list):
        for child in item:
            yield from nodes(child)
    elif isinstance(item, dict):
        if 't' in item:
            yield item
        yield from nodes(item.get('c', []))


def pandoc(data, source, target):
    return subprocess.run(['pandoc', '--from', source, '--to', target, '--wrap=none'],
                          input=data, stdout=subprocess.PIPE, check=True).stdout


def goal_grades():
    grades = {}
    assignments = []
    for path in (ROOT / 'goals').glob('*.md'):
        text = path.read_text(encoding='utf-8')
        for goal, section in re.findall(r'^## (G\d\d)\. [^\n]+(.*?)(?=^## |\Z)', text, re.M | re.S):
            codes = re.findall(r'^\| \[([K1-4]\.[A-Z]+\.[A-Z]\.\d+(?:\.[a-z])?)\]\(', section, re.M)
            require(len(codes) == len(set(codes)), f'{goal}: duplicate standard')
            assignments.extend(codes)
            evidence = {code[0] for code in codes}
            require(len(evidence) == 1 and goal not in grades, f'{path.name}: {goal} grade evidence')
            grade = evidence.pop()
            title = 'Kindergarten' if grade == 'K' else 'Grade ' + grade
            require(text.startswith('# ' + title), f'{goal}: inconsistent contract grade')
            grades[goal] = grade
    require(set(grades) == {f'G{i:02}' for i in range(1, 62)}, 'Incomplete goal contracts')
    require(len(assignments) == 152 and len(set(assignments)) == 151, 'Incomplete standards coverage')
    return grades


def unique_object(pairs):
    result = dict(pairs)
    require(len(result) == len(pairs), 'Duplicate key in worked evidence')
    return result


def normalize_headings(blocks, aliases):
    """Put historical targets on the heading itself and keep its readable slug."""
    remaining = aliases.copy()
    output = []
    pending = None
    for block in blocks:
        raw = [node for node in nodes(block) if node['t'] in ('RawInline', 'RawBlock')]
        if raw:
            require(pending is None and block == {'t': 'Para', 'c': raw} and
                    len(raw) == 2 and all(n['t'] == 'RawInline' and n['c'][0] == 'html' for n in raw),
                    'Expected an empty historical anchor before a heading')
            anchor = ElementTree.fromstring(''.join(n['c'][1] for n in raw))
            pending = anchor.get('name')
            require(anchor.tag == 'a' and set(anchor.attrib) == {'name'} and not len(anchor)
                    and not anchor.text and pending in remaining, 'Unreviewed heading anchor')
            continue
        if pending is not None:
            require(block['t'] == 'Header', f'Detached anchor {pending}')
            _, attr, content = block['c']
            slug = attr[0]
            require(slug == remaining.pop(pending), f'{pending}: wrong heading {slug}')
            attr[0] = pending
            content.insert(0, {'t': 'Span', 'c': [[slug, [], []], []]})
            pending = None
        output.append(block)
    require(pending is None and not remaining, 'Missing historical heading')
    return output


def course_inventory(grades):
    docs, headings, evidence, links = {}, {}, {}, defaultdict(set)
    mapping = json.loads((ROOT / 'goals/worked-evidence.json').read_text(encoding='utf-8'),
                         object_pairs_hook=unique_object)
    records = {p.relative_to(ROOT).as_posix() for p in (ROOT / 'examples').rglob('*.md') if p.name != 'README.md'}
    require(len(records) == 53 and set(mapping) == records, 'Incomplete worked evidence')
    for collection in COLLECTIONS:
        for path in sorted((ROOT / collection).rglob('*.md')):
            src = path.relative_to(ROOT).as_posix()
            ast = json.loads(pandoc(path.read_bytes(), READER, 'json'))
            docs[src] = ast
            headings[src] = set()
            assignment = mapping.get(src)
            slices = assignment if isinstance(assignment, dict) else {}
            goal = assignment if isinstance(assignment, str) else None
            if src in records:
                grade = re.search(r'^(Kindergarten|Grade [1-4]) · ', path.read_text(encoding='utf-8'), re.M)
                assigned = set(slices.values()) if slices else {goal}
                require(grade, f'{src}: missing worked grade')
                label = 'K' if grade[1] == 'Kindergarten' else grade[1][-1]
                require(all(grades.get(g) == label for g in assigned),
                        f'{src}: worked grade disagrees with contract')
            aliases = {frag: frag.split('--', 1)[1] for frag in slices if re.match(r'g\d\d--', frag)}
            if src == 'examples/README.md':
                aliases = {'foundational-examples': 'worked-examples', 'grade-4-foundation': 'grade-4',
                           'grade-4-pilot': 'more-grade-4-examples'}
            ast['blocks'] = normalize_headings(ast['blocks'], aliases)
            seen_slices = set()
            parents = []
            for block in ast['blocks']:
                if block['t'] == 'Header':
                    level, (frag, _, _), _ = block['c']
                    require(frag and frag not in headings[src], f'{src}: duplicate heading {frag}')
                    headings[src].add(frag)
                    parents = [(n, k) for n, k in parents if n < level] + [(level, frag)]
                    if level == 2 and slices:
                        require(frag in slices, f'{src}: missing assignment for {frag}')
                        goal = slices[frag]
                        seen_slices.add(frag)
                    if goal and collection == 'examples':
                        evidence[src, frag] = goal
                if collection == 'teaching':
                    for node in nodes(block):
                        if node['t'] == 'Link':
                            url = urlsplit(node['c'][-1][0])
                            target = posixpath.normpath(posixpath.join(collection, url.path))
                            if target.startswith('examples/'):
                                for _, frag in parents:
                                    links[src, frag].add((target, url.fragment))
            require(seen_slices == set(slices), f'{src}: orphan worked section')
    return docs, headings, evidence, links


def public_catalog(headings, evidence, links, grades):
    data = json.loads((SEARCH / 'catalog.json').read_text(encoding='utf-8'))
    ids, locations, covered, worked_goals, terms = set(), set(), set(), set(), set()
    chapter_links = defaultdict(set)
    for (src, _), targets in links.items():
        chapter_links[src].update(targets)
    result = []
    for dest in data['destinations']:
        src, sep, frag = dest['source'].partition('#')
        key = src, frag
        kind = src.split('/')[0]
        require(kind in ('examples', 'teaching') and dest['type'] == {'teaching':'chapter', 'examples':'example'}[kind],
                f'{src}: unsupported result type')
        require(sep and frag in headings.get(src, set()) and key not in locations, f'Bad or duplicate target {src}#{frag}')
        require(re.fullmatch('[a-z0-9-]+', dest['id']) and dest['id'] not in ids, f'Invalid ID {dest["id"]}')
        require(dest['title'].strip() and dest['preview'].strip() and dest['claims'], f'{key}: missing description')
        ids.add(dest['id'])
        locations.add(key)
        covered.add(src)
        claims = []
        for claim in dest['claims']:
            goal = claim['goal']
            require(goal in grades and claim['relation'] in ('direct', 'related', 'prerequisite'), f'{key}: {claim}')
            if kind == 'examples':
                require(evidence.get(key) == goal, f'{key}: worked section does not support {goal}')
                worked_goals.add(goal)
            else:
                worked = tuple(claim['worked'].split('#'))
                require(worked in chapter_links[src] and evidence.get(worked) == goal,
                        f'{key}: worked evidence {worked} does not support {goal}')
                require(any(evidence.get(link) == goal for link in links[key]),
                        f'{key}: section needs a worked source link supporting {goal}')
            require(claim['terms'] and all(t.strip() for t in claim['terms']) and claim['reason'].strip()
                    and isinstance(claim['order'], int), f'{key}: incomplete evidence')
            terms.update(claim['terms'])
            fields = ('terms', 'relation', 'reason', 'order', 'alias', 'preview')
            require(set(claim) <= set(fields) | {'worked', 'goal'}, f'{key}: unknown claim field')
            public_claim = {k: claim[k] for k in fields if k in claim}
            claims.append(dict(public_claim, grade=grades[goal]))
        public = {field:dest[field] for field in ('id', 'type', 'title', 'preview')}
        result.append(dict(public, url=src[:-3] + '.html#' + frag, claims=claims))
    expected = {src for src in headings if not src.endswith('/README.md')}
    require(covered == expected and worked_goals == set(grades), 'Missing worked records, chapters or goal routes')
    require(set(data['variants'].values()) <= terms, 'Unknown vocabulary variant target')
    return {'variants': data['variants'], 'destinations': result}


def render(out):
    grades = goal_grades()
    docs, headings, evidence, links = course_inventory(grades)
    catalog = public_catalog(headings, evidence, links, grades)
    for src, ast in docs.items():
        page = out / (src[:-3] + '.html')
        page.parent.mkdir(parents=True, exist_ok=True)
        for node in nodes(ast['blocks']):
            if node['t'] not in ('Link', 'Image'):
                continue
            pair = node['c'][-1]
            url = urlsplit(pair[0])
            if url.scheme in ('https', 'http') and node['t'] == 'Link':
                continue
            require(not url.scheme and not url.netloc and not url.path.startswith('/'), f'{src}: {pair[0]}')
            target = posixpath.normpath(posixpath.join(posixpath.dirname(src), url.path)) if url.path else src
            if target in docs:
                require(not url.fragment or url.fragment in headings[target], f'{src}: missing {pair[0]}')
                if url.path:
                    pair[0] = urlunsplit(('', '', url.path[:-3] + '.html', url.query, url.fragment))
            else:
                asset = ROOT / target
                require(target.startswith('examples/') and asset.suffix == '.svg' and asset.is_file(),
                        f'{src}: missing or unsupported target {pair[0]}')
                (out / target).parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(asset, out / target)
        html = pandoc(json.dumps(ast).encode(), 'json', 'html5').decode()
        # Contain wide tables while retaining native table semantics.
        html = re.sub(r'<table(?=[ >])', '<div class="table-scroll"><table', html).replace('</table>', '</table></div>')
        title = next(line[2:] for line in (ROOT / src).read_text(encoding='utf-8').splitlines() if line.startswith('# '))
        up = os.path.relpath(out, page.parent)
        page.write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)} · Math Workshop</title><link rel="stylesheet" href="{up}/style.css"></head>
<body><header class="reader-nav"><nav><a href="{up}/index.html">Find help with homework</a></nav></header>
<main class="reader">{html}</main></body></html>
''', encoding='utf-8')
        require(Page(page).headings == headings[src], f'{src}: HTML heading identifiers changed')
    for asset in ('index.html', 'style.css', 'search.js'):
        shutil.copyfile(SEARCH / asset, out / asset)
    (out / 'index.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    return check_site(out)


def build(out):
    out = out.resolve()
    require(not out.is_relative_to(ROOT) and not out.exists(), 'Choose a fresh output path outside the source tree')
    out.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=out.parent) as temp:
        site = Path(temp) / 'site'
        stats = render(site)
        out.mkdir()  # Exclusive reservation, including when another build finishes first.
        site.replace(out)
    print('Built', out.name, stats)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    build(parser.parse_args().out)

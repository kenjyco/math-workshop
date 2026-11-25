"""Check the pinned course, rendered bundle and reproducibility without Git."""
import argparse
from collections import Counter
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PINNED = {
    'foundation': (110, 'f1d5c5f880967f0f1814fbcdaa21e945a18749fc0a8be3af1cb6d5277fbddbf6'),
    'teaching': (23, '6d5423e7386861167dc6047eafcd3d93662969f22822c009a2e1d7d5e7fc4a0c'),
}
ASSETS = {'index.html', 'index.json', 'search.js', 'style.css'}


def require(condition, message):
    if not condition:
        raise ValueError(str(message))


def fingerprint(path):
    return sha256(path.read_bytes()).hexdigest()


def check_sources():
    groups = {key: [] for key in PINNED}
    for path in ROOT.rglob('*'):
        first = path.relative_to(ROOT).parts[0]
        if first in ('.git', 'search') or not path.is_file():
            continue
        groups['teaching' if first == 'teaching' else 'foundation'].append(path)
    for group, paths in groups.items():
        rows = ''.join(f'{fingerprint(p)}  {p.relative_to(ROOT).as_posix()}\n' for p in sorted(paths))
        require((len(paths), sha256(rows.encode()).hexdigest()) == PINNED[group], f'{group}: source bytes or paths changed')


# Match the whole code, including any unexpected suffix, before checking its link.
STANDARD = re.compile(r'(?<![\w.])[K1-9]\.[A-Z]+\.[A-Z]\.\d+(?:\.\w+)*(?!\w)')
DEVELOPMENT = re.compile(r'\b(?:G\d{2}|goal (?:contracts?|slices?|numbers?|and source)|foundation goals|pilot|MP[1-8])\b', re.I)


def standard_urls():
    codes = {code for path in (ROOT / 'goals').glob('*.md')
             for code in re.findall(r'^\| \[([K1-4]\.[A-Z]+\.[A-Z]\.\d+(?:\.[a-z])?)\]\(',
                                    path.read_text(encoding='utf-8'), re.M)}
    require(len(codes) == 151, 'Incomplete K–4 standards')
    codes.add('5.NBT.B.5')
    return {code: 'https://www.thecorestandards.org/Math/Content/' + code.replace('.', '/') + '/'
            for code in codes}


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.name = path.name
        self.text = ''
        self.anchor = None
        self.link_spans = {}
        self.literal = 0
        self.ids = set()
        self.headings = set()
        self.targets = []
        self.tags = Counter()
        self.feed(path.read_text(encoding='utf-8'))
        self.close()

    def handle_starttag(self, tag, attrs):
        self.tags[tag] += 1
        attrs = dict(attrs)
        for attr in ('aria-label', 'aria-description', 'alt', 'title', 'content'):
            require(not DEVELOPMENT.search(attrs.get(attr, '')), f'{self.name}: development label')
        if tag in ('p', 'li', 'td', 'th', 'div', 'br', 'main', 'title') or re.fullmatch('h[1-6]', tag):
            self.text += '\n'
        if tag in ('code', 'pre', 'script', 'style'):
            self.literal += 1
        if tag == 'a':
            require(self.anchor is None, f'{self.name}: nested link')
            self.anchor = len(self.text), attrs.get('href')
        if 'id' in attrs:
            require(attrs['id'] not in self.ids, f'Duplicate HTML id {attrs["id"]}')
            self.ids.add(attrs['id'])
            if re.fullmatch('h[1-6]', tag):
                self.headings.add(attrs['id'])
        for attr in ('href', 'src'):
            if attr in attrs:
                self.targets.append((tag, attrs[attr]))
        if tag == 'img':
            require(attrs.get('alt', '').strip(), 'Missing image description')

    def handle_data(self, data):
        self.text += ' ' * len(data) if self.literal else data

    def handle_endtag(self, tag):
        if tag == 'a':
            start, href = self.anchor
            self.link_spans[start, len(self.text)] = href
            self.anchor = None
        if tag in ('code', 'pre', 'script', 'style'):
            self.literal -= 1

    def check_copy(self, urls):
        require(not DEVELOPMENT.search(self.text), f'{self.name}: development copy')
        found = Counter()
        for match in STANDARD.finditer(self.text):
            code = match.group()
            require(code in urls and self.link_spans.get(match.span()) == urls[code],
                    f'{self.name}: incorrect standard link {code}')
            found[code] += 1
        for (a, b), href in self.link_spans.items():
            if href and 'thecorestandards.org/Math/Content/' in href:
                require(urls.get(self.text[a:b]) == href, f'{self.name}: mislabeled standard')
        return found


def check_public_claims(catalog):
    """Independently check emitted grades against the cited worked reader's own grade."""
    source = json.loads((ROOT / 'search/catalog.json').read_text(encoding='utf-8'))
    require(set(catalog) == {'variants', 'destinations'} and catalog['variants'] == source['variants'],
            'Unexpected public vocabulary')
    require(len(catalog['destinations']) == len(source['destinations']), 'Missing public result')
    grades = {}
    for dest, authored in zip(catalog['destinations'], source['destinations']):
        require(dest['id'] == authored['id'] and dest['url'] == authored['source'].replace('.md#', '.html#')
                and len(dest['claims']) == len(authored['claims']), 'Changed public route or claim order')
        for claim, original in zip(dest['claims'], authored['claims']):
            worked = original.get('worked', authored['source']).partition('#')[0]
            if worked not in grades:
                intro = (ROOT / worked).read_text(encoding='utf-8').splitlines()[2]
                grade = re.match(r'^(Kindergarten|Grade ([1-4])) · ', intro)
                require(grade, f'{worked}: missing worked grade')
                grades[worked] = grade[2] or 'K'
            expected = {k: v for k, v in original.items() if k not in ('worked', 'goal')}
            require(claim == dict(expected, grade=grades[worked]), f'{worked}: incorrect public claim')


def check_site(site):
    files = {p.relative_to(site).as_posix() for p in site.rglob('*') if p.is_file()}
    docs = [p for group in ('teaching', 'examples') for p in (ROOT / group).rglob('*.md')]
    readers = {p.relative_to(ROOT).with_suffix('.html').as_posix() for p in docs}
    images = {p.relative_to(ROOT).as_posix() for p in (ROOT / 'examples').rglob('*.svg')}
    require(len(readers) == 77 and len(images) == 39, 'Incomplete course')
    expected = ASSETS | readers | images
    require(files == expected, f'Incorrect bundle membership: {sorted(files ^ expected)}')
    for name in images:
        require((site / name).read_bytes() == (ROOT / name).read_bytes(), f'Changed image: {name}')
    for name in files:
        data = (site / name).read_text(encoding='utf-8')
        require(not re.search(r'/(?:Users|home)/[^/\s]+/|file://|development/(?:qa|plans|references|scratch)/', data),
                f'{name}: private path')
    pages = {name: Page(site / name) for name in readers | {'index.html'}}
    urls = standard_urls()
    standards = sum((page.check_copy(urls) for page in pages.values()), Counter())
    require(set(standards) == set(urls) and sum(standards.values()) == 174, 'Incomplete standard links')
    catalog = json.loads((site / 'index.json').read_text(encoding='utf-8'))
    check_public_claims(catalog)
    ids, routes = set(), set()
    for dest in catalog['destinations']:
        require(set(dest) == {'id', 'url', 'title', 'preview', 'type', 'claims'}, 'Unexpected result fields')
        for claim in dest['claims']:
            fields = {'terms', 'relation', 'reason', 'order', 'grade'}
            require(fields <= set(claim) <= fields | {'alias', 'preview'}, 'Unexpected public claim fields')
        url = urlsplit(dest['url'])
        require(dest['id'] not in ids and dest['url'] not in routes, 'Duplicate public destination')
        ids.add(dest['id'])
        routes.add(dest['url'])
        require(dest['type'] in ('chapter', 'example') and url.path in readers and
                url.fragment in pages[url.path].headings, f'Invalid search destination {dest["url"]}')
    internal = external = 0
    # Resolve as a browser would with a deliberately nested hosting prefix.
    prefix = 'https://preview.invalid/course/math/'
    for name, page in pages.items():
        for tag, ref in page.targets:
            url = urlsplit(ref)
            if url.scheme in ('http', 'https') and tag == 'a':
                external += 1
                continue
            require(ref and not url.scheme and not ref.startswith('/'), f'{name}: nonrelative {ref}')
            target = urljoin(prefix + name, ref)
            require(target.startswith(prefix), f'{name}: escaping {ref}')
            url = urlsplit(target[len(prefix):])
            path, fragment = unquote(url.path), unquote(url.fragment)
            require(path in files, f'{name}: missing {ref}')
            if fragment:
                require(path in pages and fragment in pages[path].ids, f'{name}: missing fragment {ref}')
            internal += 1
    counts = sum((pages[n].tags for n in readers), Counter())
    require(counts['table'] == 87 and counts['pre'] == 38 and counts['img'] == 39,
            'Lost table, preformatted block or image')
    require(len(routes) == 139 and sum(len(d['claims']) for d in catalog['destinations']) == 234,
            'Incomplete search index')
    require((internal, external) == (598, 181), 'Course link inventory changed')
    return dict(readers=len(readers), headings=sum(len(pages[n].headings) for n in readers),
                tables=counts['table'], pre=counts['pre'], images=len(images),
                internal_links_and_assets=internal, external_links=external, results=len(routes))


def compare_sites(a, b):
    def snapshot(site):
        return {p.relative_to(site): fingerprint(p) for p in site.rglob('*') if p.is_file()}
    require(snapshot(a) == snapshot(b), 'Bundle paths or bytes differ')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=Path, help='fresh directory for two independent builds')
    parser.add_argument('--site', type=Path, help='inspect an existing generated bundle')
    args = parser.parse_args()
    require(args.work or args.site, 'Pass --work or --site')
    check_sources()
    if args.site:
        print('Verified bundle', check_site(args.site))
    if args.work:
        work = args.work.resolve()
        require(not work.is_relative_to(ROOT), 'Build outside the source tree')
        work.mkdir(parents=True, exist_ok=False)
        for name in ('first', 'second'):
            subprocess.run([sys.executable, str(ROOT / 'search/build.py'), '--out', str(work / name)], check=True)
        compare_sites(work / 'first', work / 'second')
        if args.site:
            compare_sites(work / 'first', args.site)
        print('Fresh builds match byte for byte.')
    print('Protected foundation and teaching fingerprints match.')


if __name__ == '__main__':
    main()

"""Check the pinned course, rendered bundle and reproducibility without Git."""
import argparse
from collections import Counter, defaultdict
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
    'foundation': (110, '0c435fb4b030d57d78525b8ea3feb678fc3d6ea16da13f311eca387446d5a44e'),
    'teaching': (23, '6d5423e7386861167dc6047eafcd3d93662969f22822c009a2e1d7d5e7fc4a0c'),
}
ASSETS = {'index.html', 'index.json', 'search.js', 'style.css', 'standard-preview.js'}


def require(condition, message):
    if not condition:
        raise ValueError(str(message))


def fingerprint(path):
    return sha256(path.read_bytes()).hexdigest()


def load_standards():
    path = ROOT / 'search/standards.json'
    # Reviewed code-specific summaries and passage joins, including distinct siblings.
    require(fingerprint(path) == '5e091aeda62b3f750aaa7565b6c1060d9a83014475bb360561bba0a2dae52779',
            'Unreviewed standards inventory')
    return json.loads(path.read_text(encoding='utf-8'))


def check_sources():
    load_standards()
    require(fingerprint(ROOT / 'search/catalog.json') ==
            '4d78ef619df4248b0d5bbef555955e3ec7e1685add0a88843235e59d259b93fd', 'Historical catalog changed')
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
        self.in_nav = False
        self.navigation = []
        self.current_heading = self.record = ''
        self.heading_labels = {}
        self.citations = []
        self.summaries = []
        self.summary_start = None
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
        if tag == 'nav':
            self.in_nav = True
        if tag == 'a' and self.in_nav:
            self.navigation.append((attrs.get('href'), attrs.get('aria-current')))
        if tag == 'a':
            require(self.anchor is None, f'{self.name}: nested link')
            self.anchor = len(self.text), attrs.get('href')
        if 'id' in attrs:
            require(attrs['id'] not in self.ids, f'Duplicate HTML id {attrs["id"]}')
            self.ids.add(attrs['id'])
            if attrs.get('class') == 'standard-summary':
                self.summary_start = len(self.text)
            if re.fullmatch('h[1-6]', tag):
                self.headings.add(attrs['id'])
                self.current_heading = attrs['id']
                self.heading_start = len(self.text)
        for attr in ('href', 'src'):
            if attr in attrs:
                self.targets.append((tag, attrs[attr]))
        if tag == 'img':
            require(attrs.get('alt', '').strip(), 'Missing image description')

    def handle_data(self, data):
        self.text += ' ' * len(data) if self.literal else data

    def handle_endtag(self, tag):
        if re.fullmatch('h[1-6]', tag) and self.current_heading:
            label = self.text[self.heading_start:].strip()
            self.heading_labels[self.current_heading] = label
            if tag == 'h1':
                self.record = label
        if tag == 'span' and self.summary_start is not None:
            self.summaries.append(self.text[self.summary_start:])
            self.summary_start = None
        if tag == 'nav':
            self.in_nav = False
        if tag == 'a':
            start, href = self.anchor
            if href and '/Math/Content/' in href:
                self.citations.append((self.text[start:], self.current_heading))
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
    require(set(catalog) == {'variants', 'destinations', 'standards', 'phrases'} and catalog['variants'] == source['variants'],
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


def check_standards(catalog, pages):
    editorial = load_standards()
    rows = editorial['standards']
    require(set(catalog['standards']) == set(rows) and catalog['phrases'] == editorial['phrases'],
            'Incorrect public standards or phrase associations')
    cards = {d['url']: d['id'] for d in catalog['destinations']}
    physical = defaultdict(list)
    original_readers = {}
    for name, page in sorted(pages.items()):
        found = page.citations
        expected_summaries = [f'Standard summary: {rows[code]["summary"]}' for code, _ in found]
        require(page.summaries == expected_summaries, f'{name}: wrong individual standard summary')
        for code, frag in found:
            physical[code].append(name.replace('.html', '.md') + '#' + frag)
        enhanced = bool(found) or name == 'index.html'
        rights = editorial['attribution']
        require(('standards-notice' in page.ids) == enhanced and
                page.targets.count(('a', rights['license'])) == int(enhanced) and
                sum(tag == 'script' and url.endswith('standard-preview.js') for tag, url in page.targets) == int(enhanced)
                and page.targets.count(('a', '#standards-notice')) == len(found), f'{name}: preview resources')
        if name != 'index.html':
            extra_ids = set()
            if found:
                extra_ids.add('standards-notice')
                for i in range(1, len(found) + 1):
                    extra_ids.update((f'citation-{i}-panel', f'citation-{i}-panel-summary'))
            require(extra_ids <= page.ids, f'{name}: missing preview target')
            extra_targets = {('a', rights['license']), ('a', '#standards-notice')}
            if found:
                up = '../' * name.count('/')
                extra_targets.add(('script', up + 'standard-preview.js'))
            original_readers[name] = [sorted(page.ids - extra_ids), sorted(page.headings),
                                      [ref for ref in page.targets if ref not in extra_targets]]
        if enhanced:
            require(rights['acknowledgment'] in page.text and rights['copyright'] in page.text,
                    f'{name}: incomplete acknowledgment')
    graph = sha256(json.dumps(original_readers, sort_keys=True).encode()).hexdigest()
    require(graph == '61e8bed25b35daea9ca9275abaf1d764b549319a6c391148b2fef6bbe8f7c9f6',
            'Historical reader IDs, headings or links changed')
    for code, row in rows.items():
        require(Counter(physical[code]) == Counter(row['citations']), f'{code}: cited headings changed')
        citations = []
        for source in dict.fromkeys(row['citations']):
            url, frag = source.replace('.md#', '.html#').split('#')
            page = pages[url]
            citations.append(dict(record=page.record, heading=page.heading_labels[frag]))
        worked = [s.replace('.md#', '.html#') for s in row['worked']]
        for target in worked:
            path, frag = target.split('#')
            require(frag in pages[path].headings, f'{code}: missing mathematical passage')
        expected = {k: row[k] for k in ('grade', 'url', 'summary', 'boundary')}
        expected['citations'] = citations
        expected['worked'] = [] if row['boundary'] else [cards[url] for url in worked if url in cards]
        expected['teaching'] = [dict(id=cards[j['source'].replace('.md#', '.html#')], reason=j['reason'])
                                for j in row['teaching']]
        require(catalog['standards'][code] == expected, f'{code}: incorrect standards result')


def check_site(site):
    files = set()
    for path in site.rglob('*'):
        require(not path.is_symlink(), f'Unexpected symbolic link: {path}')
        if path.is_dir() and any(path.iterdir()):
            continue
        require(path.is_file() and path.stat().st_nlink == 1, f'Unexpected artifact entry: {path}')
        files.add(path.relative_to(site).as_posix())
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
    check_standards(catalog, pages)
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
        routes_in_nav = ['teaching/README.html', 'examples/README.html']
        if name != 'index.html':
            routes_in_nav.insert(0, 'index.html')
        expected_nav = [(prefix + target, 'page' if target == name else None) for target in routes_in_nav]
        actual_nav = [(urljoin(prefix + name, href), current) for href, current in page.navigation]
        require(actual_nav == expected_nav, f'{name}: incorrect course navigation')
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
    require((internal, external) == (981, 235), f'Course link inventory changed: {internal}, {external}')
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

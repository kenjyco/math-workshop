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
    'foundation': (108, 'ca24277065fc548ca8b5ff42cdc2a05584d1195d196152843d5166b6d76c90aa'),
    'teaching': (23, '82d9dabb044d31a3930bb1a78fd7c52192e71b1847ed26277fa786ed05dddc0c'),
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


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.ids = set()
        self.headings = set()
        self.targets = []
        self.tags = Counter()
        self.feed(path.read_text(encoding='utf-8'))
        self.close()

    def handle_starttag(self, tag, attrs):
        self.tags[tag] += 1
        attrs = dict(attrs)
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


def check_site(site):
    files = {p.relative_to(site).as_posix() for p in site.rglob('*') if p.is_file()}
    docs = [p for group in ('teaching', 'examples', 'goals') for p in (ROOT / group).rglob('*.md')]
    readers = {p.relative_to(ROOT).with_suffix('.html').as_posix() for p in docs}
    images = {p.relative_to(ROOT).as_posix() for p in (ROOT / 'examples').rglob('*.svg')}
    require(len(readers) == 87 and len(images) == 39, 'Incomplete course')
    expected = ASSETS | readers | images
    require(files == expected, f'Incorrect bundle membership: {sorted(files ^ expected)}')
    for name in images:
        require((site / name).read_bytes() == (ROOT / name).read_bytes(), f'Changed image: {name}')
    for name in files:
        data = (site / name).read_text(encoding='utf-8')
        require(not re.search(r'/(?:Users|home)/[^/\s]+/|file://|development/(?:qa|plans|references|scratch)/', data),
                f'{name}: private path')
    pages = {name: Page(site / name) for name in readers | {'index.html'}}
    catalog = json.loads((site / 'index.json').read_text(encoding='utf-8'))
    ids, routes = set(), set()
    for dest in catalog['destinations']:
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
    require(counts['table'] == 152 and counts['pre'] == 38 and counts['img'] == 39,
            'Lost table, preformatted block or image')
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

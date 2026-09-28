import argparse
import http.server
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def options():
    parser = argparse.ArgumentParser(description='Serve a production build with an SPA fallback.')
    parser.add_argument(
        'root',
        nargs='?',
        default=os.environ.get('SERVE_ROOT', REPO_ROOT / 'frontend' / 'build'),
        help='Build directory to serve. Defaults to SERVE_ROOT or frontend/build.',
    )
    parser.add_argument('--bind', default=os.environ.get('BIND', '127.0.0.1'))
    parser.add_argument('--port', type=int, default=int(os.environ.get('PORT', '4173')))
    return parser.parse_args()


class H(http.server.SimpleHTTPRequestHandler):
    root = None

    def translate_path(self, path):
        p = path.split('?')[0]
        root = os.path.realpath(self.root)
        full = os.path.join(root, p.lstrip('/'))
        if p.endswith('/'): full=os.path.join(full,'index.html')
        if not os.path.isfile(full): full=os.path.join(root,'index.html')  # SPA fallback like Cloudflare Pages
        return full

    def end_headers(self):
        self.send_header('Cache-Control','no-cache'); super().end_headers()

    def log_message(self,*a): pass


if __name__ == '__main__':
    args = options()
    root = Path(os.path.abspath(Path(args.root).expanduser()))
    if not (root / 'index.html').is_file():
        raise SystemExit(f'Build root does not contain index.html: {root}')
    H.root = root
    http.server.ThreadingHTTPServer((args.bind, args.port), H).serve_forever()

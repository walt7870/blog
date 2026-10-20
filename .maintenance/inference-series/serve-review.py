"""Serve only the isolated review output, preserving the site's /blog/ base."""

import sys
sys.dont_write_bytecode = True

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent / "preview-dist"


class ReviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        parts = urlsplit(path)
        if parts.path.startswith("/blog/"):
            path = urlunsplit(parts._replace(path=parts.path[5:]))
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    print("独立验收预览：http://127.0.0.1:5188/blog/", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 5188), ReviewHandler).serve_forever()

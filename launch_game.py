#!/usr/bin/env python3
"""Local launcher for AI Fighter Forge Deluxe."""

from __future__ import annotations

import argparse
import http.server
import socketserver
import sys
import webbrowser
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Launch AI Fighter Forge Deluxe locally.")
    parser.add_argument("--port", type=int, default=4173, help="Port to host the local web server on.")
    parser.add_argument("--no-browser", action="store_true", help="Do not auto-open a browser tab.")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *handler_args, **handler_kwargs):
            super().__init__(*handler_args, directory=str(root), **handler_kwargs)

    with socketserver.TCPServer(("0.0.0.0", args.port), Handler) as httpd:
        url = f"http://127.0.0.1:{args.port}"
        print(f"AI Fighter Forge Deluxe running at {url}")
        print("Press Ctrl+C to stop.")
        if not args.no_browser:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down launcher...")
    return 0


if __name__ == "__main__":
    sys.exit(main())

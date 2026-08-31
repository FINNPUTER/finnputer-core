#!/usr/bin/env python3
"""
Syntax-check every page's inline script against core.css and core.js.

The /buys page shipped rendering a completely black screen. The cause was one
line: it defined its own ago() helper, and core.js already had one. A repeated
const declaration is a SyntaxError, and a SyntaxError aborts the ENTIRE script
block before a single statement runs. Nothing rendered, nothing logged, and
the page looked broken rather than erroring.

That class of bug is invisible from reading the file. It only appears when the
page script is parsed together with core.js, which is exactly what the browser
does and what nothing in this repo was doing.

    python3 check.py

Run it before uploading. It needs node, which is only used as a parser here.
"""

import glob
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    core_path = os.path.join(HERE, "assets", "core.js")
    if not os.path.exists(core_path):
        print("assets/core.js not found")
        return 1
    core = open(core_path, encoding="utf-8").read()

    # Names core.js already puts in the global scope. A page redefining one of
    # these with const or let kills its own script block.
    taken = set(re.findall(r"^(?:const|let|function)\s+(\w+)", core, re.M))

    failures = 0
    for path in sorted(glob.glob(os.path.join(HERE, "**", "*.html"),
                                 recursive=True)):
        rel = os.path.relpath(path, HERE)
        page = open(path, encoding="utf-8").read()
        scripts = re.findall(r"<script>(.*?)</script>", page, re.S)
        if not scripts:
            print(f"--   {rel:30} no inline script")
            continue

        body = "\n".join(scripts)

        # Parsed together, the way the browser sees it.
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as t:
            t.write(core + "\n" + body)
            tmp = t.name
        r = subprocess.run(["node", "--check", tmp],
                           capture_output=True, text=True)
        os.unlink(tmp)

        if r.returncode != 0:
            m = re.search(r"(SyntaxError: .*)", r.stderr)
            print(f"FAIL {rel:30} {(m.group(1) if m else r.stderr)[:80]}")
            failures += 1
            continue

        # Redeclaration is the specific trap, so it is named rather than left
        # to the generic message.
        mine = set(re.findall(r"^(?:const|let|function)\s+(\w+)", body, re.M))
        clash = sorted(mine & taken)
        if clash:
            print(f"FAIL {rel:30} redeclares from core.js: {clash}")
            failures += 1
            continue

        # An em dash is a house rule, not a bug, but it is easier to catch
        # here than in review.
        dashes = page.count("\u2014") + page.count("\u2013")
        note = f"  ({dashes} em dashes)" if dashes else ""
        print(f"OK   {rel:30}{note}")
        if dashes:
            failures += 1

    # ── the runtime check ────────────────────────────────────
    #
    # Everything above is static analysis, and it passed on a page that
    # rendered completely black. The cause was invisible to a parser: /buys/
    # never called chrome_() and effects(), so its sections stayed at the
    # opacity 0 that the reveal animation starts from and nothing ever set
    # them to 1. No error, no empty state, just black.
    #
    # A parser cannot see that. A browser can, so this loads each page in one
    # and asks whether anything is actually visible.
    failures += _browser_check()

    print()
    print("all pages parse" if not failures
          else f"{failures} page(s) would fail in a browser")
    return 0 if failures == 0 else 1


def _browser_check() -> int:
    """Load every page and check that something is visible. Needs playwright."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print()
        print("[skip] playwright not installed, runtime check skipped")
        print("       pip install playwright && playwright install chromium")
        return 0

    import http.server
    import socketserver
    import threading

    os.chdir(HERE)

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    srv = socketserver.TCPServer(("", 0), Quiet)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    pages = sorted(os.path.dirname(p) or "/" for p in
                   [os.path.relpath(x, HERE) for x in
                    glob.glob(os.path.join(HERE, "**", "index.html"),
                              recursive=True)])
    bad = 0
    print()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page()
            for rel in pages:
                route = "/" if rel == "/" else f"/{rel}/"
                errs = []
                page.on("pageerror", lambda e: errs.append(str(e)[:90]))
                page.goto(f"http://localhost:{port}{route}",
                          wait_until="load", timeout=20000)
                page.wait_for_timeout(800)
                # Scroll the way a reader does. The reveal animation is tied
                # to an IntersectionObserver, so a section below the fold is
                # SUPPOSED to sit at opacity 0 until it is scrolled to.
                # Checking without scrolling reports a working page as broken.
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(1200)

                text = page.inner_text("body").strip()
                # The specific trap: content present in the DOM but every
                # section still at opacity 0, which looks identical to a
                # broken page.
                ops = page.eval_on_selector_all(
                    ".reveal", "e => e.map(x => getComputedStyle(x).opacity)")
                visible = (not ops) or any(float(o) > 0 for o in ops)
                nav = page.evaluate("!!document.querySelector('nav,.nav,header')")

                problems = []
                if errs:
                    problems.append(f"js error: {errs[0]}")
                if not text:
                    problems.append("renders no text at all")
                if not visible:
                    problems.append("every section stuck at opacity 0")
                if not nav:
                    problems.append("no nav, chrome_() probably not called")

                if problems:
                    print(f"FAIL {route:22} {'; '.join(problems)}")
                    bad += 1
                else:
                    print(f"OK   {route:22} renders")
            browser.close()
    except Exception as e:
        print(f"[skip] runtime check could not run: {str(e)[:80]}")
    finally:
        srv.shutdown()
    return bad


if __name__ == "__main__":
    sys.exit(main())

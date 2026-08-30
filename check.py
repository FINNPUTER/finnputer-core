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

    print()
    print("all pages parse" if not failures
          else f"{failures} page(s) would fail in a browser")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

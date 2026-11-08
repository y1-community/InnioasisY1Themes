#!/usr/bin/env python3
"""
Generate static multilingual versions of pages for search engines, SEO, and archival.
Uses scripts/i18n/prerender.py architecture to produce language trees (e.g. /es/, /zh-CN/, /de/, etc.)
"""

import os
import sys
from pathlib import Path

HERE = Path(__file__).parent.resolve()
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

def run_prerender():
    os.chdir(ROOT)
    cmd = f"python3 scripts/i18n/prerender.py --locales all --tiers core --out dist"
    print(f"Running: {cmd}")
    ret = os.system(cmd)
    if ret == 0:
        print("Static multilingual pages built successfully in dist/.")
    else:
        print(f"Prerender finished with exit code {ret}.")

if __name__ == "__main__":
    run_prerender()

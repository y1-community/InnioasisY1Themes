from pathlib import Path

root = Path(__file__).resolve().parent.parent / "Stranger Things" / "Variants"
for p in root.glob("*/config.json"):
    t = p.read_text(encoding="utf-8")
    t2 = t.replace('"../', '"../../')
    if t != t2:
        p.write_text(t2, encoding="utf-8")
        print("fixed", p)

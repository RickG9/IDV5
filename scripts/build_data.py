#!/usr/bin/env python3
"""Build src/data/*.json from the raw research files in research/.

research/roster.json          canonical survivor roster (CN wiki: names, roles, difficulty, release)
research/hunters_roster.json  canonical hunter roster
research/raw/survivors/*.md   community-research outputs (JSON arrays, one per batch)
research/raw/hunters/*.md
research/raw/skins/*.md

Run: python3 scripts/build_data.py
"""
import json
import pathlib
import re
import sys

try:
    import json_repair  # tolerant parser for occasional malformed model output
except ImportError:  # pragma: no cover
    json_repair = None

ROOT = pathlib.Path(__file__).resolve().parent.parent
RES = ROOT / "research"
OUT = ROOT / "src" / "data"

TRAITS = ["kite", "decode", "rescue", "support", "disrupt", "info", "survivability",
          "selfSufficiency", "teamDependency", "earlyGame", "lateGame"]
DEMANDS = ["mechanics", "aim", "timing", "reaction", "mapKnowledge", "gameSense", "multitask", "comms"]
KITE = {"looping", "mobility", "stun", "stealth", "tank", "displacement", "trick"}
SUPPORT = {"heal", "shield", "speed", "info", "rescue-assist", "decode-buff", "hunter-debuff", "revive"}
HUNTER_TAGS = {"ranged", "anti-stun", "anti-loop", "chip", "terror", "camp", "mobility", "reveal", "area",
               "multi-target", "anti-heal", "burst"}
VIBES = {
    "gothic": ["gothic", "dark", "grim", "macabre", "morbid", "somber", "sombre", "haunted", "death"],
    "elegant": ["elegant", "refined", "graceful", "aristocrat", "noble", "classy", "poised", "regal", "sophisticated"],
    "playful": ["playful", "cheerful", "whimsical", "bubbly", "energetic", "cute", "sunny", "upbeat", "fun", "circus"],
    "tragic": ["tragic", "melanchol", "sad", "sorrow", "wistful", "lonely", "haunted past", "doomed"],
    "mysterious": ["myster", "eerie", "enigmatic", "creepy", "occult", "mystic", "uncanny", "cryptic", "ethereal", "spooky"],
    "heroic": ["heroic", "brave", "loyal", "protective", "valiant", "courage", "selfless", "chivalr", "knight"],
    "rugged": ["rugged", "tough", "gritty", "stoic", "soldier", "wild", "feral", "hardy", "rough", "athletic"],
    "cunning": ["cunning", "mischiev", "sly", "trickster", "sneaky", "roguish", "gambler", "scheming", "chaotic"],
    "gentle": ["gentle", "kind", "caring", "warm", "sweet", "nurtur", "innocent", "soft", "timid", "shy", "introvert", "hopeful", "healing"],
    "eccentric": ["eccentric", "artistic", "quirky", "genius", "obsess", "theatrical", "inventor", "mad", "creative", "flamboyant", "ingenious", "clockwork", "collector", "doll"],
}


def parse_array(path):
    text = path.read_text(encoding="utf-8")
    i, j = text.find("["), text.rfind("]")
    chunk = text[i:j + 1]
    try:
        return json.loads(chunk)
    except json.JSONDecodeError:
        if not json_repair:
            raise
        print(f"  repaired malformed JSON in {path.name}", file=sys.stderr)
        return json_repair.loads(chunk)


def num(x, lo, hi, default):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, round(v, 1)))


def bi(x, fallback=""):
    if isinstance(x, dict):
        return {"en": str(x.get("en", fallback)), "cn": str(x.get("cn", x.get("en", fallback)))}
    return {"en": str(x or fallback), "cn": str(x or fallback)}


def bilist(x):
    if isinstance(x, dict):
        return {"en": [str(s) for s in x.get("en", [])], "cn": [str(s) for s in x.get("cn", x.get("en", []))]}
    return {"en": [str(s) for s in (x or [])], "cn": [str(s) for s in (x or [])]}


def split_pair(s):
    s = str(s)
    m = re.match(r"\s*([^:：]+)[:：]\s*(.*)", s)
    return (m.group(1).strip(), m.group(2).strip()) if m else (s.strip(), "")


def vibe_tags(tags):
    out = set()
    for t in tags or []:
        t = str(t).lower()
        for k, keys in VIBES.items():
            if any(key in t for key in keys):
                out.add(k)
    return sorted(out)


def load_batches(folder):
    items = {}
    for p in sorted((RES / "raw" / folder).glob("*.md")):
        for obj in parse_array(p):
            if isinstance(obj, dict) and obj.get("id"):
                items[obj["id"]] = obj
    return items


def build_survivors():
    roster = json.loads((RES / "roster.json").read_text(encoding="utf-8"))
    raw = load_batches("survivors")
    ids = {r["id"] for r in roster}
    out, missing = [], []
    for r in roster:
        d = raw.get(r["id"])
        if not d:
            missing.append(r["id"])
            continue
        sc = d.get("scores", {})
        meta = d.get("meta", {}) or {}
        if "recentChanges" in d and "recentChanges" not in meta:
            meta["recentChanges"] = d["recentChanges"]
        syn = []
        for s in d.get("synergy", []) or []:
            sid, why = split_pair(s)
            sid = sid.lower().strip()
            if sid in ids and sid != r["id"]:
                syn.append({"id": sid, "reason": why})
        mu = d.get("hunterMatchups", {}) or {}
        conf = int(num(d.get("confidence"), 1, 5, 3))
        out.append({
            "id": r["id"],
            "name": {"en": r["en"], "cn": r["cn"]},
            "roles": r["roles"],
            "officialDifficulty": r["officialDifficulty"],
            "release": r["releaseCN"].replace("/", "-"),
            "kit": bi(d.get("kit")),
            "traits": {t: num(sc.get(t), 0, 10, 5) for t in TRAITS},
            "demands": {k: num(sc.get("demand" + k[0].upper() + k[1:]), 0, 10, 5) for k in DEMANDS},
            "skillFloor": num(sc.get("skillFloor"), 0, 10, 5),
            "skillCeiling": num(sc.get("skillCeiling"), 0, 10, 5),
            "forgiveness": num(sc.get("forgiveness"), 0, 10, 5),
            "kiteStyles": [k for k in d.get("kiteStyles", []) if k in KITE],
            "supportStyles": [k for k in d.get("supportStyles", []) if k in SUPPORT],
            "archetypes": [str(a) for a in d.get("archetypes", [])][:6],
            "meta": {
                "low": num(meta.get("low"), 1, 5, 3), "mid": num(meta.get("mid"), 1, 5, 3),
                "high": num(meta.get("high"), 1, 5, 3), "pro": num(meta.get("pro"), 1, 5, 3),
                "notes": str(meta.get("pickBanNotes", "")), "changes": str(meta.get("recentChanges", "")),
            },
            "queue": {"solo": num((d.get("queue") or {}).get("solo"), 1, 5, 3),
                      "premade": num((d.get("queue") or {}).get("premade"), 1, 5, 3)},
            "quickMatch": num(d.get("quickMatch"), 1, 5, 3),
            "strengths": bilist(d.get("strengths")),
            "weaknesses": bilist(d.get("weaknesses")),
            "sentiment": bi(d.get("sentiment")),
            "tips": bilist(d.get("tips")),
            "synergy": syn,
            "matchups": {
                "good": [dict(zip(("hunter", "reason"), split_pair(x))) for x in mu.get("good", [])],
                "bad": [dict(zip(("hunter", "reason"), split_pair(x))) for x in mu.get("bad", [])],
            },
            "vibe": vibe_tags(d.get("vibe")),
            "vibeRaw": [str(v) for v in d.get("vibe", [])],
            "sources": [str(s) for s in d.get("sources", []) if str(s).startswith("http")],
            "confidence": conf,
            **({"provisional": True} if conf <= 2 or r["releaseCN"] >= "2026/09" else {}),
        })
    return out, missing


def build_hunters():
    roster = json.loads((RES / "hunters_roster.json").read_text(encoding="utf-8"))
    raw = load_batches("hunters")
    out, missing = [], []
    for h in roster:
        d = raw.get(h["id"])
        if not d:
            missing.append(h["id"])
        d = d or {}
        out.append({
            "id": h["id"],
            "name": {"en": h["en"], "cn": h["cn"]},
            "tags": [t for t in d.get("tags", []) if t in HUNTER_TAGS],
            "summary": bi(d.get("summary"), ""),
            "punishes": [str(x) for x in d.get("punishes", [])],
            "strugglesVs": [str(x) for x in d.get("strugglesVs", [])],
            "counteredBy": [str(x) for x in d.get("counteredBy", [])],
            "strongVs": [str(x) for x in d.get("strongVs", [])],
            "meta": {k: num((d.get("meta") or {}).get(k), 1, 5, 3) for k in ("low", "mid", "high", "pro")},
            "sources": [str(s) for s in d.get("sources", []) if str(s).startswith("http")],
        })
    return out, missing


def build_skins():
    raw = load_batches("skins")
    out = []
    for sid, d in raw.items():
        out.append({
            "id": sid,
            "counts": {k: int(num(v, 0, 999, 0)) for k, v in (d.get("counts") or {}).items()},
            "total": int(num(d.get("total"), 0, 999, 0)),
            "notable": [{
                "name": bi(n.get("name")), "tier": str(n.get("tier", "")),
                "reception": n.get("reception") if n.get("reception") in ("loved", "liked", "mixed", "disliked") else "unknown",
                "note": str(n.get("note", "")), "obtain": str(n.get("obtain", "")),
                "server": n.get("server") if n.get("server") in ("both", "cn", "global") else "both",
            } for n in (d.get("notable") or [])][:6],
            "summary": bi(d.get("summary")),
            "sources": [str(s) for s in d.get("sources", []) if str(s).startswith("http")],
            "confidence": int(num(d.get("confidence"), 1, 5, 3)),
            "asOf": "2026-09-30",
        })
    return out


def load_polish(kind):
    """Copy-edited bilingual text (facts unchanged) that replaces terse research notes."""
    p = RES / "polish" / f"{kind}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    survivors, sm = build_survivors()
    hunters, hm = build_hunters()
    skins = build_skins()
    for s in survivors:
        s["sentiment"] = load_polish("sentiment").get(s["id"], s["sentiment"])
    polished_skins = load_polish("skins")
    for s in skins:
        s["summary"] = polished_skins.get(s["id"], s["summary"])
    (OUT / "survivors.json").write_text(json.dumps(survivors, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "hunters.json").write_text(json.dumps(hunters, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "skins.json").write_text(json.dumps(skins, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"survivors: {len(survivors)} (missing: {sm or 'none'})")
    print(f"hunters: {len(hunters)} (no research yet: {hm or 'none'})")
    print(f"skins: {len(skins)}")


if __name__ == "__main__":
    main()

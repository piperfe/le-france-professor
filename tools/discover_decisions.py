#!/usr/bin/env python3
"""
Bottom-up architectural decision discovery from the conversations database.

Uses only generic decision-language queries — no technology names, no
pre-defined domains. Results are grouped by date so you can read and
classify yourself.

Usage:
  python3 tools/discover_decisions.py
  python3 tools/discover_decisions.py --min-score 2
"""

import sqlite3
import re
import sys
from pathlib import Path
from collections import defaultdict

DB_PATH = Path.home() / ".claude/conversations.db"

# ── Signal queries — generic decision language only ───────────────────────────
# No technology names. No domain assumptions.

SIGNAL_QUERIES = [
    "decided OR chose OR choosing",
    "\"instead of\" OR \"rather than\"",
    "\"the reason\" OR \"that's why\"",
    "\"going forward\" OR \"from now on\"",
    "\"the rule is\" OR \"the pattern is\" OR \"the convention is\"",
    "\"trade-off\" OR tradeoff OR \"pros and cons\"",
    "\"let's use\" OR \"let's go with\" OR \"we agreed\"",
    "\"we discovered\" OR \"we realized\" OR \"it turns out\"",
    "\"we decided\" OR \"we chose\" OR \"we picked\"",
    "\"the problem is\" OR \"the issue was\" OR \"the issue is\"",
    "\"avoid\" OR \"don't use\" OR \"should not use\"",
    "\"never use\" OR \"always use\" OR \"must not\"",
    "\"we use\" OR \"we'll use\" OR \"we should use\"",
    "\"not suitable\" OR \"doesn't work\" OR \"won't work\"",
    "\"better approach\" OR \"better to\" OR \"preferred\"",
]

# ── Decision strength scorer ──────────────────────────────────────────────────

STRONG_PATTERNS = [
    r"\bwe (decided|chose|agreed|will use|should use|are using)\b",
    r"\b(never|always|must not|should not|don't use|avoid)\b",
    r"\binstead of\b",
    r"\bthe reason (is|was|we)\b",
    r"\bgoing forward\b",
    r"\bfrom now on\b",
    r"\b(the rule|the pattern|the convention) (is|was)\b",
    r"\blet's (use|go with|not)\b",
    r"\b(chose|choosing) .{0,40} (because|since|over)\b",
    r"\bwe (discovered|realized|decided|picked)\b",
    r"\bbetter (approach|to use|option)\b",
    r"\bnot suitable\b",
    r"\bdoesn't work\b",
]

def score(prompt: str, response: str) -> int:
    combined = (prompt + " " + response).lower()
    return sum(1 for pat in STRONG_PATTERNS if re.search(pat, combined))

# ── Search ────────────────────────────────────────────────────────────────────

def run_discovery(conn, min_score: int):
    seen_ids = set()
    candidates = []

    for query in SIGNAL_QUERIES:
        try:
            rows = conn.execute("""
                SELECT p.id, p.date, p.time, p.session_id, p.project,
                       p.prompt, p.response
                FROM pairs_fts
                JOIN pairs p ON pairs_fts.rowid = p.rowid
                WHERE pairs_fts MATCH ?
                ORDER BY rank
                LIMIT 40
            """, (query,)).fetchall()
        except sqlite3.OperationalError:
            continue

        for row in rows:
            pid, date, time, sid, project, prompt, response = row
            if pid in seen_ids:
                continue
            seen_ids.add(pid)

            s = score(prompt, response)
            if s < min_score:
                continue

            candidates.append({
                "id": pid,
                "date": date,
                "time": time,
                "sid": sid,
                "project": project,
                "prompt": prompt,
                "response": response,
                "score": s,
            })

    candidates.sort(key=lambda c: (c["date"], c["time"]))
    return candidates

# ── Formatter ─────────────────────────────────────────────────────────────────

def trunc(text: str, n: int = 200) -> str:
    text = text.replace("\n", " ").strip()
    return text[:n] + "…" if len(text) > n else text

def print_candidates(candidates):
    by_date = defaultdict(list)
    for c in candidates:
        by_date[c["date"]].append(c)

    total = len(candidates)
    print(f"\n{'═'*70}")
    print(f"  Bottom-up decision discovery — {total} candidates")
    print(f"{'═'*70}")

    for date in sorted(by_date):
        items = by_date[date]
        print(f"\n┌─ {date} ({len(items)} candidates) {'─'*(56-len(date))}")
        for c in items:
            stars = "★" * c["score"]
            print(f"│")
            print(f"│  {c['time']}  [{c['project']}]  [{c['sid'][:8]}…]  {stars}")
            print(f"│  You:    {trunc(c['prompt'])}")
            print(f"│  Claude: {trunc(c['response'])}")
        print(f"└{'─'*68}")

    print(f"\n  {total} candidates — no domains assigned, classify as you read")
    print(f"  --min-score 2  to filter to high-confidence decisions only\n")

# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    min_score = 1

    if "--min-score" in args:
        idx = args.index("--min-score")
        min_score = int(args[idx + 1]) if idx + 1 < len(args) else 1

    if not DB_PATH.exists():
        print(f"Database not found: {DB_PATH}")
        print("Run: python3 tools/conversations_db.py --all")
        return

    conn = sqlite3.connect(DB_PATH)
    candidates = run_discovery(conn, min_score=min_score)
    conn.close()

    print_candidates(candidates)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Import Claude Code sessions from all projects into SQLite with FTS5.

Usage:
  python3 tools/conversations_db.py                        # import last 3 active days (all projects)
  python3 tools/conversations_db.py --all                  # import all sessions
  python3 tools/conversations_db.py --project <name>       # filter to one project (partial match)
  python3 tools/conversations_db.py -q "text"              # full-text search
  python3 tools/conversations_db.py -q "text" --project p  # search within a project
  python3 tools/conversations_db.py --stats                # show db stats
"""

import json
import sqlite3
import sys
import re
from datetime import datetime, timedelta
from pathlib import Path

PROJECTS_ROOT = Path.home() / ".claude/projects"
DB_PATH       = Path.home() / ".claude/conversations.db"

# ── Filtering ─────────────────────────────────────────────────────────────────

INJECTION_PATTERNS = [
    r"^\[Request interrupted",
    r"^<local-command-caveat>",
    r"^# Before Commit",
    r"^<command-name>",
    r"^<system-reminder>",
]

def get_content(msg):
    return msg.get("message", {}).get("content", "")

def is_real_prompt(msg, by_uuid):
    if msg.get("type") != "user":
        return False
    content = get_content(msg)
    if isinstance(content, list):
        if any(b.get("type") == "tool_result" for b in content if isinstance(b, dict)):
            return False
    if not isinstance(content, str):
        return False
    text = content.strip()
    if not text:
        return False
    for pat in INJECTION_PATTERNS:
        if re.match(pat, text):
            return False
    parent = by_uuid.get(msg.get("parentUuid", ""))
    if parent:
        parent_content = get_content(parent)
        if isinstance(parent_content, list):
            if any(b.get("type") == "tool_result" for b in parent_content if isinstance(b, dict)):
                return False
    return True

def extract_text(content):
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = [b.get("text", "").strip() for b in content
                 if isinstance(b, dict) and b.get("type") == "text"]
        return "\n".join(p for p in parts if p)
    return ""

# ── Project name ──────────────────────────────────────────────────────────────

def project_short_name(encoded_name):
    """Convert -Users-pipealfaro-WorkSpace-le-france-professor → le-france-professor"""
    home_encoded = str(Path.home()).replace("/", "-")  # e.g. -Users-pipealfaro
    prefix = home_encoded + "-"
    if encoded_name.startswith(prefix):
        rest = encoded_name[len(prefix):]  # WorkSpace-le-france-professor
        idx = rest.find("-")
        return rest[idx + 1:] if idx >= 0 else rest
    return encoded_name

# ── Session parser ────────────────────────────────────────────────────────────

def parse_session(filepath, project):
    messages = []
    with open(filepath, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                messages.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    by_uuid = {m["uuid"]: m for m in messages if "uuid" in m}
    session_id = filepath.stem

    real_prompts = [m for m in messages if is_real_prompt(m, by_uuid)]
    if not real_prompts:
        return []

    pairs = []
    for i, pm in enumerate(real_prompts):
        prompt_text = extract_text(get_content(pm))
        if not prompt_text:
            continue

        next_uuid = real_prompts[i + 1]["uuid"] if i + 1 < len(real_prompts) else None

        response_parts, collecting = [], False
        for msg in messages:
            if msg.get("uuid") == pm["uuid"]:
                collecting = True
                continue
            if next_uuid and msg.get("uuid") == next_uuid:
                break
            if collecting and msg.get("type") == "assistant":
                t = extract_text(get_content(msg))
                if t:
                    response_parts.append(t)

        response_text = "\n\n".join(response_parts).strip()

        ts = pm.get("timestamp", "")
        try:
            dt   = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            date = dt.strftime("%Y-%m-%d")
            time = dt.strftime("%H:%M")
        except Exception:
            date, time = "unknown", "unknown"

        pairs.append({
            "id":         f"{session_id}:{pm['uuid']}",
            "session_id": session_id,
            "project":    project,
            "date":       date,
            "time":       time,
            "timestamp":  ts,
            "prompt":     prompt_text,
            "response":   response_text,
        })

    return pairs

# ── Database ──────────────────────────────────────────────────────────────────

def init_db(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS pairs (
            id          TEXT PRIMARY KEY,
            session_id  TEXT NOT NULL,
            project     TEXT NOT NULL,
            date        TEXT NOT NULL,
            time        TEXT NOT NULL,
            timestamp   TEXT NOT NULL,
            prompt      TEXT NOT NULL,
            response    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id      TEXT PRIMARY KEY,
            project TEXT NOT NULL,
            date    TEXT NOT NULL,
            pairs   INTEGER NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS pairs_fts USING fts5(
            prompt,
            response,
            content=pairs,
            content_rowid=rowid,
            tokenize="unicode61"
        );

        CREATE TRIGGER IF NOT EXISTS pairs_ai AFTER INSERT ON pairs BEGIN
            INSERT INTO pairs_fts(rowid, prompt, response)
            VALUES (new.rowid, new.prompt, new.response);
        END;

        CREATE TRIGGER IF NOT EXISTS pairs_ad AFTER DELETE ON pairs BEGIN
            INSERT INTO pairs_fts(pairs_fts, rowid, prompt, response)
            VALUES ('delete', old.rowid, old.prompt, old.response);
        END;
    """)
    conn.commit()

def import_sessions(conn, files_with_project):
    cur = conn.cursor()
    total = 0
    for fp, project in files_with_project:
        print(f"  [{project}] {fp.name[:36]}... ", end="", flush=True)
        pairs = parse_session(fp, project)

        existing = {row[0]: row[1] for row in cur.execute(
            "SELECT id, response FROM pairs WHERE session_id = ?", (fp.stem,)
        )}

        added = updated = skipped = 0
        for p in pairs:
            if p["id"] not in existing:
                cur.execute("""
                    INSERT INTO pairs
                      (id, session_id, project, date, time, timestamp, prompt, response)
                    VALUES (:id,:session_id,:project,:date,:time,:timestamp,:prompt,:response)
                """, p)
                added += 1
            elif existing[p["id"]] != p["response"]:
                cur.execute("""
                    INSERT OR REPLACE INTO pairs
                      (id, session_id, project, date, time, timestamp, prompt, response)
                    VALUES (:id,:session_id,:project,:date,:time,:timestamp,:prompt,:response)
                """, p)
                updated += 1
            else:
                skipped += 1

        date = pairs[0]["date"] if pairs else "unknown"
        cur.execute(
            "INSERT OR REPLACE INTO sessions (id, project, date, pairs) VALUES (?,?,?,?)",
            (fp.stem, project, date, len(pairs))
        )
        conn.commit()
        print(f"{len(pairs)} pairs  (+{added} added, ~{updated} updated, {skipped} skipped)")
        total += len(pairs)
    return total

def search(conn, query, project_filter=None, limit=10):
    where = "WHERE pairs_fts MATCH ?"
    params = [query]
    if project_filter:
        where += " AND p.project LIKE ?"
        params.append(f"%{project_filter}%")
    params.append(limit)
    return conn.execute(f"""
        SELECT p.date, p.time, p.session_id, p.project,
               snippet(pairs_fts, 0, '>>>', '<<<', '...', 20) AS prompt_snip,
               snippet(pairs_fts, 1, '>>>', '<<<', '...', 30) AS response_snip,
               rank
        FROM pairs_fts
        JOIN pairs p ON pairs_fts.rowid = p.rowid
        {where}
        ORDER BY rank
        LIMIT ?
    """, params).fetchall()

def stats(conn):
    total = conn.execute("SELECT COUNT(*) FROM pairs").fetchone()[0]
    days  = conn.execute("SELECT COUNT(DISTINCT date) FROM pairs").fetchone()[0]
    sess  = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
    projects = conn.execute(
        "SELECT DISTINCT project FROM sessions ORDER BY project"
    ).fetchall()

    print(f"\n{'─'*52}")
    print(f"  Total — {sess} sessions  {days} days  {total} pairs")

    for (proj,) in projects:
        proj_pairs = conn.execute(
            "SELECT COUNT(*) FROM pairs WHERE project = ?", (proj,)
        ).fetchone()[0]
        proj_sess = conn.execute(
            "SELECT COUNT(*) FROM sessions WHERE project = ?", (proj,)
        ).fetchone()[0]
        print(f"{'─'*52}")
        print(f"  [{proj}]  {proj_sess} sessions  {proj_pairs} pairs")
        by_day = conn.execute("""
            SELECT date, COUNT(*) as n FROM pairs WHERE project = ?
            GROUP BY date ORDER BY date DESC
        """, (proj,)).fetchall()
        for date, n in by_day:
            print(f"    {date}  {n:>4} pairs")

    print(f"{'─'*52}")

# ── Discovery ─────────────────────────────────────────────────────────────────

def discover_sessions(project_filter=None):
    """Return list of (Path, project_short_name) for all top-level .jsonl session files."""
    result = []
    for project_dir in sorted(PROJECTS_ROOT.iterdir()):
        if not project_dir.is_dir():
            continue
        proj = project_short_name(project_dir.name)
        if project_filter and project_filter not in proj:
            continue
        for f in sorted(project_dir.glob("*.jsonl"), key=lambda f: f.stat().st_mtime):
            result.append((f, proj))
    return result

# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    project_filter = None
    if "--project" in args:
        idx = args.index("--project")
        project_filter = args[idx + 1] if idx + 1 < len(args) else None
        args = args[:idx] + args[idx + 2:]

    # ── Search mode
    if "-q" in args or "--query" in args:
        flag = "-q" if "-q" in args else "--query"
        idx  = args.index(flag)
        query = args[idx + 1] if idx + 1 < len(args) else None
        if not query:
            print("Usage: -q <search terms>")
            sys.exit(1)
        conn    = sqlite3.connect(DB_PATH)
        results = search(conn, query, project_filter)
        conn.close()
        if not results:
            print(f"\nNo results for: {query}")
        else:
            print(f"\n{len(results)} result(s) for: '{query}'\n{'─'*60}")
            for date, time, sid, project, prompt_snip, response_snip, rank in results:
                print(f"\n  {date} {time}  [{project}]  [{sid[:8]}...]")
                print(f"    You:    {prompt_snip}")
                print(f"    Claude: {response_snip}")
        return

    # ── Stats mode
    if "--stats" in args:
        conn = sqlite3.connect(DB_PATH)
        stats(conn)
        conn.close()
        return

    # ── Import mode
    all_sessions = discover_sessions(project_filter)

    if "--all" in args:
        target = all_sessions
        print(f"Importing all {len(target)} sessions...")
    else:
        cutoff = datetime.now() - timedelta(days=4)
        target = [(f, p) for f, p in all_sessions
                  if datetime.fromtimestamp(f.stat().st_mtime) >= cutoff]
        print(f"Importing {len(target)} sessions (last 3 active days)...")

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    import_sessions(conn, target)
    stats(conn)
    conn.close()

    db_kb = DB_PATH.stat().st_size / 1024
    print(f"\n✓ {DB_PATH}  ({db_kb:.0f} KB)")

if __name__ == "__main__":
    main()

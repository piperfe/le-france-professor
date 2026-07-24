#!/usr/bin/env python3
"""
Scan raw Claude Code sessions for repeated instructions and key discoveries.
Covers both le-france-professor and pti-salmoneras.

Usage:
  python3 tools/pattern_scan.py                       # both projects, all time
  python3 tools/pattern_scan.py --since 2026-04-01    # from a date
  python3 tools/pattern_scan.py --since 7d            # last 7 days
  python3 tools/pattern_scan.py --project lfp         # one project only
  python3 tools/pattern_scan.py --mode repeats        # repeated instructions only
  python3 tools/pattern_scan.py --mode discovers      # discoveries/decisions only
  python3 tools/pattern_scan.py --top 30              # show top N (default 20)
"""

import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

PROJECTS = {
    "lfp": Path.home() / ".claude/projects/-Users-pipealfaro-WorkSpace-le-france-professor",
    "pti": Path.home() / ".claude/projects/-Users-pipealfaro-WorkSpace-pti-salmoneras",
}

PROJECT_LABELS = {
    "lfp": "Le France Professor",
    "pti": "PTI Salmoneras",
}

# ── Filtering ─────────────────────────────────────────────────────────────────

# Messages that start with these are injected by skills/harness, not the user
SKIP_PREFIXES = [
    "[Request interrupted",
    "<local-command-caveat>",
    "# Before Commit",
    "<command-name>",
    "<system-reminder>",
    "[Tool Result]",
    "[Skipped]",
]

# These substrings anywhere in a message mark it as a skill/harness artifact
SKIP_SUBSTRINGS = [
    "Pick up the last task as if the break never happened",
]

# Sentences containing these are skipped in directive/discovery extraction
SKIP_SENTENCE_SUBSTRINGS = [
    "pick up the last task",
    "break never happened",
]

def get_content(msg):
    return msg.get("message", {}).get("content", "")

def extract_text(content):
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = [b.get("text", "").strip() for b in content
                 if isinstance(b, dict) and b.get("type") == "text"]
        return "\n".join(p for p in parts if p)
    return ""

def is_tool_result_msg(msg):
    content = get_content(msg)
    if isinstance(content, list):
        return any(b.get("type") == "tool_result" for b in content if isinstance(b, dict))
    return False

SQL_KEYWORDS = re.compile(
    r"\b(ADD COLUMN|ALTER TABLE|CREATE TABLE|INSERT INTO|SELECT .* FROM|DROP TABLE|PRAGMA)\b",
    re.IGNORECASE,
)

def is_data_paste(text):
    """True if the message looks like pasted schema/table/code data, not prose."""
    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return False
    # SQL content anywhere → data paste
    if SQL_KEYWORDS.search(text):
        return True
    # If most lines look like table rows (many | chars) — it's data
    pipe_lines = sum(1 for l in lines if l.count("|") >= 2)
    code_lines  = sum(1 for l in lines if l.strip().startswith(("```", "SELECT ", "INSERT ", "ALTER ")))
    if (pipe_lines + code_lines) / len(lines) > 0.4:
        return True
    # Skip prompts that are almost entirely a code block
    if text.count("```") >= 2 and len(re.sub(r"```.*?```", "", text, flags=re.DOTALL).strip()) < 60:
        return True
    return False

def msg_timestamp(msg):
    ts = msg.get("timestamp", "")
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return None

def is_real_user_prompt(msg, by_uuid, since_dt=None):
    if msg.get("type") != "user":
        return False
    if is_tool_result_msg(msg):
        return False
    content = get_content(msg)
    if not isinstance(content, str):
        return False
    text = content.strip()
    if not text or len(text) < 8:
        return False
    for prefix in SKIP_PREFIXES:
        if text.startswith(prefix):
            return False
    for sub in SKIP_SUBSTRINGS:
        if sub.lower() in text.lower():
            return False
    if is_data_paste(text):
        return False
    parent = by_uuid.get(msg.get("parentUuid", ""))
    if parent and is_tool_result_msg(parent):
        return False
    if since_dt is not None:
        dt = msg_timestamp(msg)
        if dt is None or dt < since_dt:
            return False
    return True

# ── Session reader ────────────────────────────────────────────────────────────

def read_session(filepath, since_dt=None):
    messages = []
    for line in filepath.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            messages.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    # Quick skip: if since_dt set and session has no message after cutoff, bail early
    if since_dt is not None:
        timestamps = [msg_timestamp(m) for m in messages if msg_timestamp(m)]
        if timestamps and max(timestamps) < since_dt:
            return [], []

    by_uuid = {m["uuid"]: m for m in messages if "uuid" in m}
    session_id = filepath.stem
    prompts, responses = [], []

    for msg in messages:
        if is_real_user_prompt(msg, by_uuid, since_dt):
            text = extract_text(get_content(msg))
            if text:
                prompts.append((session_id, text))
        elif msg.get("type") == "assistant":
            # Only collect assistant responses after the cutoff too
            if since_dt is not None:
                dt = msg_timestamp(msg)
                if dt is None or dt < since_dt:
                    continue
            t = extract_text(get_content(msg))
            if t and len(t) > 30:
                responses.append((session_id, t))

    return prompts, responses

def parse_since(since_arg):
    """Parse --since value: YYYY-MM-DD or Nd (N days ago)."""
    if re.match(r"^\d+d$", since_arg):
        days = int(since_arg[:-1])
        return datetime.now(timezone.utc) - timedelta(days=days)
    try:
        dt = datetime.strptime(since_arg, "%Y-%m-%d")
        return dt.replace(tzinfo=timezone.utc)
    except ValueError:
        print(f"  ⚠ Could not parse --since '{since_arg}'. Use YYYY-MM-DD or Nd.")
        sys.exit(1)

def load_all(projects_to_scan, since_dt=None):
    # project -> [(session_id, text)]
    all_prompts   = defaultdict(list)
    all_responses = defaultdict(list)
    for key in projects_to_scan:
        path = PROJECTS[key]
        if not path.exists():
            print(f"  ⚠ {key}: directory not found")
            continue
        files = sorted(path.glob("*.jsonl"))
        loaded = 0
        for f in files:
            p, r = read_session(f, since_dt)
            all_prompts[key].extend(p)
            all_responses[key].extend(r)
            if p or r:
                loaded += 1
        since_label = f" since {since_dt.date()}" if since_dt else ""
        print(f"  {PROJECT_LABELS[key]}: {loaded}/{len(files)} sessions{since_label}")
    return all_prompts, all_responses

# ── Repeated instructions ─────────────────────────────────────────────────────

INSTRUCTION_TRIGGERS = [
    r"don'?t\b", r"never\b", r"always\b", r"make sure\b", r"remember\b",
    r"stop\b", r"avoid\b", r"instead\b", r"must\b",
    r"should\b.{0,30}(not|never)",
    r"no[,\s]", r"wrong\b", r"incorrect\b", r"that'?s not\b",
    r"please\b.{0,20}(don'?t|never|always)",
]

CAMELCASE_RE = re.compile(r'[a-z][A-Z][a-z]')   # camelCase indicator

def is_prose_sentence(s):
    """Rough check: reject tabular/form data and code masquerading as prose."""
    # Checkbox characters → form spec
    if any(c in s for c in ("☐", "☑", "✓", "✗")):
        return False
    # Multiple consecutive spaces → tabular columns
    if "    " in s:
        return False
    # Contains a newline → multi-line (usually a code block)
    if "\n" in s:
        return False
    # High ratio of non-alpha chars → data, not prose
    alpha = sum(c.isalpha() for c in s)
    if len(s) > 0 and alpha / len(s) < 0.45:
        return False
    # Code-like: camelCase + parentheses/braces → function calls
    if CAMELCASE_RE.search(s) and any(c in s for c in ("(", "{", "=>")):
        return False
    return True

def extract_directives(text):
    sentences = re.split(r'(?<=[.!?])\s+|\n', text)
    out = []
    for s in sentences:
        s = s.strip()
        if len(s) < 10 or len(s) > 180:
            continue
        if s.startswith(("#", "-", "*", "|", "`", ">")):
            continue
        if not is_prose_sentence(s):
            continue
        lower = s.lower()
        if any(sub in lower for sub in SKIP_SENTENCE_SUBSTRINGS):
            continue
        for pat in INSTRUCTION_TRIGGERS:
            if re.search(pat, lower):
                out.append(s)
                break
    return out

def normalize(s):
    s = s.lower()
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def find_repeated_instructions(all_prompts, top_n):
    # Count total occurrences (per message) — tracks repetition within and across sessions
    msg_counts   = Counter()   # norm -> total messages containing it
    session_sets = defaultdict(set)   # norm -> set of session_ids (for display)
    examples     = {}
    by_project   = defaultdict(lambda: defaultdict(int))

    for project, pairs in all_prompts.items():
        for session_id, prompt in pairs:
            seen_in_this_msg = set()
            for directive in extract_directives(prompt):
                norm = normalize(directive)
                if norm in seen_in_this_msg:
                    continue  # deduplicate within same message
                seen_in_this_msg.add(norm)
                msg_counts[norm] += 1
                session_sets[norm].add(session_id)
                by_project[norm][project] += 1
                if norm not in examples:
                    examples[norm] = directive

    repeated = [(norm, count) for norm, count in msg_counts.items() if count >= 2]
    repeated.sort(key=lambda x: -x[1])
    return repeated[:top_n], examples, by_project, session_sets

# ── Discoveries / decisions ───────────────────────────────────────────────────

DISCOVERY_PATTERNS = [
    (r"turns? out\b",                                         "finding"),
    (r"the (issue|problem|bug|root cause) (is|was)\b",        "finding"),
    (r"this (happens|fails|breaks) because\b",                "finding"),
    (r"the reason (is|was|this)\b",                           "finding"),
    (r"I (realized|found|discovered|learned|noticed)\b",      "finding"),
    (r"the (fix|solution) (is|was)\b",                        "finding"),
    (r"that'?s why\b",                                        "finding"),
    (r"(decided|chose|choosing|going with)\b",                "decision"),
    (r"instead of\b",                                         "decision"),
    (r"rather than\b",                                        "decision"),
    (r"going forward\b",                                      "decision"),
    (r"from now on\b",                                        "decision"),
    (r"the (rule|pattern|convention) is\b",                   "decision"),
    (r"we'?re (going to|switching to|using)\b",               "decision"),
]

def extract_discovery_sentences(text):
    sentences = re.split(r'(?<=[.!?])\s+|\n', text)
    out = []
    for s in sentences:
        s = s.strip()
        if len(s) < 20 or len(s) > 280:
            continue
        if s.startswith(("#", "|", "`", ">", "//")):
            continue
        if not is_prose_sentence(s):
            continue
        lower = s.lower()
        if any(sub in lower for sub in SKIP_SENTENCE_SUBSTRINGS):
            continue
        if re.match(r'^[-*]\s+"?', s):
            continue
        for pat, cat in DISCOVERY_PATTERNS:
            if re.search(pat, lower):
                out.append((s, cat))
                break
    return out

def find_discoveries(all_prompts, all_responses, top_n):
    discoveries = []  # (text, category, project, source)
    seen_norms  = set()

    def add(text, cat, project, source):
        norm = normalize(text)
        if norm in seen_norms:
            return
        seen_norms.add(norm)
        discoveries.append((text, cat, project, source))

    for project, pairs in all_prompts.items():
        for _sid, text in pairs:
            for s, cat in extract_discovery_sentences(text):
                add(s, cat, project, "user")

    for project, pairs in all_responses.items():
        for _sid, text in pairs:
            for s, cat in extract_discovery_sentences(text):
                add(s, cat, project, "claude")

    return discoveries

# ── Display ───────────────────────────────────────────────────────────────────

def print_repeats(repeated, examples, by_project, session_sets, top_n):
    print(f"\n{'═'*70}")
    print(f"  REPEATED INSTRUCTIONS  (top {min(top_n, len(repeated))} · 2+ messages)")
    print(f"{'═'*70}")
    if not repeated:
        print("  (none found)")
        return
    for norm, count in repeated[:top_n]:
        n_sessions = len(session_sets[norm])
        proj_info  = "  ".join(
            f"{PROJECT_LABELS.get(p, p)}×{c}"
            for p, c in sorted(by_project[norm].items())
        )
        session_label = f"{n_sessions} session{'s' if n_sessions != 1 else ''}"
        print(f"\n  [{count}× in {session_label}]  {examples[norm]}")
        print(f"  ↳ {proj_info}")

def print_discoveries(discoveries, top_n):
    by_cat = defaultdict(list)
    for text, cat, project, source in discoveries:
        by_cat[cat].append((text, project, source))

    cat_order  = ["decision", "finding"]
    cat_labels = {
        "decision": "DECISIONS / CHOICES",
        "finding":  "TECHNICAL FINDINGS & DISCOVERIES",
    }

    print(f"\n{'═'*70}")
    print(f"  DISCOVERIES & DECISIONS")
    print(f"{'═'*70}")

    per_cat = max(top_n // len(cat_order), 5)
    for cat in cat_order:
        items = by_cat.get(cat, [])
        if not items:
            continue
        print(f"\n  ── {cat_labels[cat]} ──")
        for text, project, source in items[:per_cat]:
            label = PROJECT_LABELS.get(project, project)
            who   = "You" if source == "user" else "Claude"
            print(f"\n  [{label} · {who}]")
            print(f"  {text}")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]

    def flag(name):
        if name in args:
            idx = args.index(name)
            return args[idx + 1] if idx + 1 < len(args) else None
        return None

    project_filter = flag("--project")
    mode           = flag("--mode") or "both"
    since_arg      = flag("--since")
    top_n          = int(flag("--top") or 20)

    since_dt = parse_since(since_arg) if since_arg else None

    projects_to_scan = list(PROJECTS.keys())
    if project_filter:
        if project_filter not in PROJECTS:
            print(f"Unknown project '{project_filter}'. Use: lfp, pti")
            sys.exit(1)
        projects_to_scan = [project_filter]

    print(f"\nScanning raw sessions...")
    all_prompts, all_responses = load_all(projects_to_scan, since_dt)

    total_p = sum(len(v) for v in all_prompts.values())
    total_r = sum(len(v) for v in all_responses.values())
    print(f"  {total_p} user prompts · {total_r} assistant responses\n")

    if mode in ("both", "repeats"):
        repeated, examples, by_project, session_sets = find_repeated_instructions(all_prompts, top_n)
        print_repeats(repeated, examples, by_project, session_sets, top_n)

    if mode in ("both", "discovers"):
        discoveries = find_discoveries(all_prompts, all_responses, top_n)
        print_discoveries(discoveries, top_n)

    print(f"\n{'─'*70}")
    print(f"  --mode repeats|discovers  --project lfp|pti  --since YYYY-MM-DD|Nd  --top N\n")

if __name__ == "__main__":
    main()

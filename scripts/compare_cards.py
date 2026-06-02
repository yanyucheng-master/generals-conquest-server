# -*- coding: utf-8 -*-
import openpyxl
import re
import json
from pathlib import Path

xlsx_path = Path(r'c:\Users\YYC\Desktop\01_将领征服_现行卡牌数据表.xlsx')
cards_ts = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'cards.ts'
out_path = Path(__file__).resolve().parent.parent / 'card_diff_report.json'

content = cards_ts.read_text(encoding='utf-8')
pattern = re.compile(
    r"\{\s*id:\s*(\d+),\s*name:\s*'([^']+)',\s*cost:\s*(\d+),\s*quality:\s*'([^']+)',\s*"
    r"type:\s*'([^']+)',\s*subtype:\s*'([^']+)',\s*atk:\s*(\d+),\s*hp:\s*(\d+),\s*armor:\s*(\d+),\s*"
    r"desc:\s*'([^']*)',\s*skills:\s*\[([^\]]*)\],\s*faction:\s*'([^']+)'",
    re.MULTILINE,
)

old_cards = {}
for m in pattern.finditer(content):
    skills_raw = m.group(11).strip()
    skills = [s.strip().strip("'") for s in skills_raw.split(',') if s.strip()]
    cid = int(m.group(1))
    old_cards[cid] = {
        'id': cid,
        'name': m.group(2),
        'cost': int(m.group(3)),
        'quality': m.group(4),
        'type': m.group(5),
        'subtype': m.group(6),
        'atk': int(m.group(7)),
        'hp': int(m.group(8)),
        'armor': int(m.group(9)),
        'desc': m.group(10),
        'skills': skills,
        'faction': m.group(12),
    }

wb = openpyxl.load_workbook(xlsx_path, data_only=True)
# 最后一页为全卡牌汇总
ws = wb.worksheets[-1]
new_cards = {}
for row in ws.iter_rows(min_row=3, values_only=True):
    if not row or row[0] is None:
        continue
    try:
        cid = int(row[0])
    except (TypeError, ValueError):
        continue
    skills_raw = str(row[10] or '').strip()
    if skills_raw in ('-', 'None', ''):
        skills = []
    else:
        skills = [
            s.strip()
            for s in skills_raw.replace('，', ',').split(',')
            if s.strip() and s.strip() != '-'
        ]
    subtype = str(row[5] or '').strip()
    if subtype in ('None', 'nan'):
        subtype = ''
    new_cards[cid] = {
        'id': cid,
        'name': str(row[1]).strip(),
        'cost': int(row[2]),
        'quality': str(row[3]).strip(),
        'type': str(row[4]).strip(),
        'subtype': subtype,
        'atk': int(row[6] or 0),
        'hp': int(row[7] or 0),
        'armor': int(row[8] or 0),
        'desc': str(row[9] or '').strip(),
        'skills': skills,
        'faction': str(row[11] or '').strip(),
    }

fields = ['name', 'cost', 'quality', 'type', 'subtype', 'atk', 'hp', 'armor', 'desc', 'skills', 'faction']
changes = []
added = []
removed = []

for cid in sorted(set(old_cards) | set(new_cards)):
    o, n = old_cards.get(cid), new_cards.get(cid)
    if o and not n:
        removed.append(o)
        continue
    if n and not o:
        added.append(n)
        continue
    diffs = {}
    for f in fields:
        ov, nv = o[f], n[f]
        if f == 'skills':
            ov, nv = sorted(ov), sorted(nv)
        if ov != nv:
            diffs[f] = {'old': o[f], 'new': n[f]}
    if diffs:
        changes.append({'id': cid, 'name': n['name'], 'old_name': o['name'], 'diffs': diffs})

report = {
    'old_count': len(old_cards),
    'new_count': len(new_cards),
    'added': added,
    'removed': removed,
    'changes': changes,
}
out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({
    'old_count': len(old_cards),
    'new_count': len(new_cards),
    'added': len(added),
    'removed': len(removed),
    'changed': len(changes),
}, ensure_ascii=False))

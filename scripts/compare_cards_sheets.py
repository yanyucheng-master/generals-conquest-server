# -*- coding: utf-8 -*-
import openpyxl
import re
import json
from pathlib import Path

xlsx_path = Path(r'c:\Users\YYC\Desktop\01_将领征服_现行卡牌数据表.xlsx')
cards_ts = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'cards.ts'

content = cards_ts.read_text(encoding='utf-8')
pattern = re.compile(
    r"\{\s*id:\s*(\d+),\s*name:\s*'([^']+)',\s*cost:\s*(\d+),\s*quality:\s*'([^']+)',\s*"
    r"type:\s*'([^']+)',\s*subtype:\s*'([^']+)',\s*atk:\s*(\d+),\s*hp:\s*(\d+),\s*armor:\s*(\d+),\s*"
    r"desc:\s*'([^']*)',\s*skills:\s*\[([^\]]*)\],\s*faction:\s*'([^']+)'",
    re.MULTILINE,
)

def parse_cards_ts():
    cards = {}
    for m in pattern.finditer(content):
        skills_raw = m.group(11).strip()
        skills = [s.strip().strip("'") for s in skills_raw.split(',') if s.strip()]
        cid = int(m.group(1))
        cards[cid] = {
            'id': cid, 'name': m.group(2), 'cost': int(m.group(3)), 'quality': m.group(4),
            'type': m.group(5), 'subtype': m.group(6), 'atk': int(m.group(7)), 'hp': int(m.group(8)),
            'armor': int(m.group(9)), 'desc': m.group(10), 'skills': skills, 'faction': m.group(12),
        }
    return cards

def parse_sheet(ws):
    cards = {}
    for row in ws.iter_rows(min_row=3, values_only=True):
        if not row or row[0] is None:
            continue
        try:
            cid = int(row[0])
        except (TypeError, ValueError):
            continue
        skills_raw = str(row[10] or '').strip()
        skills = [] if skills_raw in ('-', 'None', '') else [
            s.strip() for s in skills_raw.replace('，', ',').split(',') if s.strip() and s.strip() != '-'
        ]
        subtype = str(row[5] or '').strip()
        if subtype in ('None', 'nan'):
            subtype = ''
        cards[cid] = {
            'id': cid, 'name': str(row[1]).strip(), 'cost': int(row[2]), 'quality': str(row[3]).strip(),
            'type': str(row[4]).strip(), 'subtype': subtype, 'atk': int(row[6] or 0),
            'hp': int(row[7] or 0), 'armor': int(row[8] or 0), 'desc': str(row[9] or '').strip(),
            'skills': skills, 'faction': str(row[11] or '').strip(),
        }
    return cards

def diff_cards(base, other, base_label, other_label):
    fields = ['name', 'cost', 'quality', 'type', 'subtype', 'atk', 'hp', 'armor', 'desc', 'skills', 'faction']
    changes = []
    for cid in sorted(set(base) | set(other)):
        b, o = base.get(cid), other.get(cid)
        if not b or not o:
            continue
        diffs = {}
        for f in fields:
            bv, ov = b[f], o[f]
            if f == 'skills':
                bv, ov = sorted(bv), sorted(ov)
            if bv != ov:
                diffs[f] = {'from': bv, 'to': ov}
        if diffs:
            changes.append({'id': cid, 'name': o['name'], 'diffs': diffs, 'base': base_label, 'other': other_label})
    return changes

wb = openpyxl.load_workbook(xlsx_path, data_only=True)
ts_cards = parse_cards_ts()
summary = parse_sheet(wb.worksheets[-1])

print('=== xlsx faction sheets vs cards.ts ===')
all_faction_changes = []
for ws in wb.worksheets[1:-1]:  # skip cover and summary
    faction_cards = parse_sheet(ws)
    changes = diff_cards(ts_cards, faction_cards, 'cards.ts', ws.title)
    if changes:
        print(f'\nSheet: {ws.title} ({len(changes)} diffs vs cards.ts)')
        for c in changes:
            print(f"  ID{c['id']} {c['name']}")
            for k, v in c['diffs'].items():
                print(f"    {k}: {v['from']} -> {v['to']}")
        all_faction_changes.extend(changes)

print('\n=== xlsx faction sheets vs 全卡牌汇总 ===')
internal = []
for ws in wb.worksheets[1:-1]:
    faction_cards = parse_sheet(ws)
    changes = diff_cards(summary, faction_cards, 'summary', ws.title)
    if changes:
        print(f'\nSheet: {ws.title} ({len(changes)} diffs vs summary)')
        for c in changes:
            print(f"  ID{c['id']} {c['name']}")
            for k, v in c['diffs'].items():
                print(f"    {k}: {v['from']} -> {v['to']}")
        internal.extend(changes)

print('\n=== cards.ts vs 全卡牌汇总 ===')
ts_vs_sum = diff_cards(ts_cards, summary, 'cards.ts', 'summary')
print(f'count: {len(ts_vs_sum)}')

Path(__file__).resolve().parent.parent.joinpath('card_diff_report.json').write_text(
    json.dumps({
        'faction_vs_cards_ts': all_faction_changes,
        'faction_vs_summary': internal,
        'cards_ts_vs_summary': ts_vs_sum,
    }, ensure_ascii=False, indent=2),
    encoding='utf-8',
)

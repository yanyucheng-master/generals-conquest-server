# -*- coding: utf-8 -*-
"""从已汇总 Excel 生成 cards.ts 卡牌数组（含技能列与描述不一致时的修正）。"""
import openpyxl
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / 'card_data_export'
xlsx = sorted(OUT_DIR.glob('将领征服_卡牌数据表_已汇总_*.xlsx'))[-1]
wb = openpyxl.load_workbook(xlsx, data_only=True)

FACTION_MAP = {
    '帝国军团': 'EMPIRE_CARDS',
    '荒野游侠': 'WILD_CARDS',
    '奥术学院': 'ARCANE_CARDS',
    '通用': 'NEUTRAL_CARDS',
}

# 描述已改但 Excel 技能列未同步的卡牌
SKILL_OVERRIDES: dict[int, list[str]] = {
    25: ['bleed'],
    26: ['poison'],
    46: ['fly', 'lucky', 'tear'],
    50: ['drawCard'],
    52: ['magicBoost'],
    59: ['spellReflect', 'magicBoost'],
    61: ['interest', 'drawCard'],
    62: ['balance', 'drawCard'],
    64: ['jamming', 'physResist'],
    66: ['silence', 'magicBoost'],
}

DESC_FIXES: dict[int, str] = {
    28: '2/2 伏击1',  # 身材 2/2，描述仍为 1/2
}

cards_by_faction = {k: [] for k in FACTION_MAP}

ws_sum = wb.worksheets[-1]
for row in ws_sum.iter_rows(min_row=3, values_only=True):
    if not row or row[0] is None:
        continue
    try:
        cid = int(row[0])
    except (TypeError, ValueError):
        continue
    faction = str(row[11] or '').strip()
    key = faction if faction in FACTION_MAP else '通用'
    skills_raw = str(row[10] or '').strip()
    if cid in SKILL_OVERRIDES:
        skills = SKILL_OVERRIDES[cid]
    elif skills_raw in ('-', 'None', ''):
        skills = []
    else:
        skills = [s.strip() for s in skills_raw.replace('，', ',').split(',') if s.strip()]
    subtype = str(row[5] or '').strip()
    if not subtype or subtype == 'None':
        subtype = '法术卡' if str(row[4]) == '法术' else '近战'
    desc = str(row[9] or '').strip()
    if cid in DESC_FIXES:
        desc = DESC_FIXES[cid]
    desc = desc.replace("'", "\\'")
    cards_by_faction[key].append({
        'id': cid,
        'name': str(row[1]).strip(),
        'cost': int(row[2]),
        'quality': str(row[3]).strip(),
        'type': str(row[4]).strip(),
        'subtype': subtype,
        'atk': int(row[6] or 0),
        'hp': int(row[7] or 0),
        'armor': int(row[8] or 0),
        'desc': desc,
        'skills': skills,
        'faction': faction if faction in FACTION_MAP else '通用',
    })

for k in cards_by_faction:
    cards_by_faction[k].sort(key=lambda c: c['id'])

def emit_card(c):
    sk = ', '.join(f"'{s}'" for s in c['skills'])
    sk_part = f"[{sk}]" if c['skills'] else '[]'
    return (
        f"  {{ id: {c['id']}, name: '{c['name']}', cost: {c['cost']}, quality: '{c['quality']}', "
        f"type: '{c['type']}', subtype: '{c['subtype']}', atk: {c['atk']}, hp: {c['hp']}, armor: {c['armor']}, "
        f"desc: '{c['desc']}', skills: {sk_part}, faction: '{c['faction']}' }},"
    )

lines = []
counts = {'帝国军团': 25, '荒野游侠': 26, '奥术学院': 25, '通用': 4}
for fname, var in FACTION_MAP.items():
    cards = cards_by_faction[fname]
    lines.append(f'// ======== {fname} {counts[fname]}张 ========')
    lines.append(f'const {var}: CardDef[] = [')
    for c in cards:
        lines.append(emit_card(c))
    lines.append('];')
    lines.append('')

out = Path(__file__).resolve().parent / '_cards_generated.txt'
out.write_text('\n'.join(lines), encoding='utf-8')
print('cards', sum(len(v) for v in cards_by_faction.values()), '->', out)

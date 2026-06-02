# -*- coding: utf-8 -*-
import openpyxl
from pathlib import Path

xlsx = Path(r'c:\Users\YYC\Desktop\01_将领征服_现行卡牌数据表.xlsx')
out = Path(__file__).resolve().parent.parent / 'card_faction_detail.txt'
wb = openpyxl.load_workbook(xlsx, data_only=True)
ids = [21, 23, 25, 26, 28, 31, 32, 38, 42, 43, 46, 50, 51, 52, 54, 55, 56, 59, 61, 62, 64, 66, 70]
lines = []
for ws in wb.worksheets[1:-1]:
    lines.append(f'=== {ws.title} ===')
    for row in ws.iter_rows(min_row=3, values_only=True):
        if row[0] in ids:
            lines.append(f"ID{row[0]} {row[1]} | {row[6]}/{row[7]} | 技能:{row[10]} | {row[9]}")
out.write_text('\n'.join(lines), encoding='utf-8')
print('written', out)

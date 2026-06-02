# -*- coding: utf-8 -*-
import openpyxl
from pathlib import Path
OUT_DIR = Path(__file__).resolve().parent.parent / 'card_data_export'
xlsx = sorted(OUT_DIR.glob('将领征服_卡牌数据表_已汇总_*.xlsx'))[-1]
wb = openpyxl.load_workbook(xlsx, data_only=True)
ws = wb.worksheets[-1]
ids = [21,23,25,26,28,31,32,38,42,43,46,50,51,52,54,55,56,59,61,62,64,66,70,82]
for row in ws.iter_rows(min_row=3, values_only=True):
    if row[0] in ids:
        print(row[0], row[1], f"{row[6]}/{row[7]}", row[5], row[10], row[9])

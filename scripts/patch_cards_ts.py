# -*- coding: utf-8 -*-
"""将 _cards_generated.txt 合并进 cards.ts"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
cards_ts = root / 'src' / 'data' / 'cards.ts'
generated = root / 'scripts' / '_cards_generated.txt'

header_end = "// ======== 帝国军团"
footer_start = "export const ALL_CARDS"

text = cards_ts.read_text(encoding='utf-8')
gen = generated.read_text(encoding='utf-8').rstrip() + '\n\n'

head = text[:text.index(header_end)]
tail = text[text.index(footer_start):]

footer_extra = '''
/** 魔法士兵子类型（法术卡 type=法术 与此不同） */
export function isMagicUnitSubtype(subtype: string): boolean {
  return subtype === '魔法';
}

'''

# Insert helper before SUBTYPE_RANGE in tail - actually put in tail section before getDamageType update

cards_ts.write_text(head + gen + tail, encoding='utf-8')
print('patched', cards_ts)

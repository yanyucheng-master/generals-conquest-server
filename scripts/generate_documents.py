# -*- coding: utf-8 -*-
"""从现行代码与卡牌数据生成 documents/ 目录下全部设计文档（HTML / XLSX / PDF / MD）。"""
from __future__ import annotations

import importlib.util
import re
import shutil
import subprocess
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
DOCS = APP.parent / "documents"
CARDS_TS = APP / "src" / "data" / "cards.ts"
TODAY = date.today()
DATE_CN = f"{TODAY.year}年{TODAY.month}月"
VERSION = "V1.0"
NEUTRAL_CARD_LINE = "帝国军团 25张 | 荒野游侠 26张 | 奥术学院 25张 | 通用 4张"
POISON_EFFECT_NOTE = "中毒单位的强运、战术指挥、射击指挥失效"
STEALTH_NOTE = "未开放 / 未实现 / 暂不参与正式平衡"
DIY_DESC = "允许玩家自由组合，但必须通过评分公式限制强度"
DIY_EDITOR_NOTE = "现行编辑器仅创建品质固定为彩的士兵卡，可设置费用、子类型、属性、部署位置与最多3个技能"
COMMERCIAL_DESC = "轻度养成与收集驱动，但避免明显 P2W"
INTERNAL_EFFECT_CODES = {"magicDmg", "manaPierce"}

CARD_PATTERN = re.compile(
    r"\{\s*id:\s*(\d+),\s*name:\s*'([^']+)',\s*cost:\s*(\d+),\s*quality:\s*'([^']+)',"
    r"\s*type:\s*'([^']+)',\s*subtype:\s*'([^']+)',\s*atk:\s*(\d+),\s*hp:\s*(\d+),\s*armor:\s*(\d+),"
    r"\s*desc:\s*'([^']*)',\s*skills:\s*\[([^\]]*)\],\s*faction:\s*'([^']+)'",
    re.MULTILINE,
)

QUALITY_CLASS = {"铜": "copper", "银": "silver", "金": "gold", "彩": "rainbow", "传奇": "rainbow"}
FACTION_ORDER = ["帝国军团", "荒野游侠", "奥术学院", "通用"]

SKILL_CATEGORY: dict[str, tuple[str, str]] = {
    "flashStrike": ("部署触发类", "cat-deploy"),
    "magicSwap": ("法术效果类", "cat-spell"),
    "bleed": ("伤害输出类", "cat-damage"),
    "tear": ("伤害输出类", "cat-damage"),
    "poison": ("伤害输出类", "cat-damage"),
    "taunt": ("控制效果类", "cat-special"),
    "counter": ("反击互动类", "cat-defense"),
    "ambush": ("反击互动类", "cat-defense"),
    "dodge": ("防御减伤类", "cat-defense"),
    "fly": ("防御减伤类", "cat-defense"),
    "disguise": ("防御减伤类", "cat-defense"),
    "physResist": ("防御减伤类", "cat-defense"),
    "magicResist": ("防御减伤类", "cat-defense"),
    "allResist": ("防御减伤类", "cat-defense"),
    "spellReflect": ("防御减伤类", "cat-defense"),
    "pierce": ("护甲系统类", "cat-damage"),
    "piercePlus": ("护甲系统类", "cat-damage"),
    "magicPierce": ("护甲系统类", "cat-damage"),
    "manaPierce": ("护甲系统类", "cat-damage"),
    "drawCard": ("法术效果类", "cat-spell"),
    "silence": ("控制效果类", "cat-special"),
    "agile": ("部署触发类", "cat-deploy"),
    "holyLight": ("法术效果类", "cat-spell"),
    "magicDmg": ("法术效果类", "cat-spell"),
    "interest": ("资源经济类", "cat-special"),
    "magicBoost": ("部署触发类", "cat-deploy"),
}


def load_skill_module():
    spec = importlib.util.spec_from_file_location(
        "gss", APP / "scripts" / "generate_skill_summary.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def parse_cards() -> list[dict]:
    text = CARDS_TS.read_text(encoding="utf-8")
    cards = []
    for m in CARD_PATTERN.finditer(text):
        skills = [s.strip().strip("'") for s in m.group(11).split(",") if s.strip()]
        cards.append(
            {
                "id": int(m.group(1)),
                "name": m.group(2),
                "cost": int(m.group(3)),
                "quality": m.group(4),
                "type": m.group(5),
                "subtype": m.group(6),
                "atk": int(m.group(7)),
                "hp": int(m.group(8)),
                "armor": int(m.group(9)),
                "desc": m.group(10),
                "skills": skills,
                "faction": m.group(12),
            }
        )
    return sorted(cards, key=lambda c: (FACTION_ORDER.index(c["faction"]) if c["faction"] in FACTION_ORDER else 99, c["id"]))


def card_stats(cards: list[dict]) -> dict:
    by_faction: dict[str, list] = defaultdict(list)
    for c in cards:
        by_faction[c["faction"]].append(c)
    q = Counter(c["quality"] for c in cards)
    t = Counter(c["type"] for c in cards)
    st = Counter(c["subtype"] for c in cards)
    faction_lines = NEUTRAL_CARD_LINE
    return {
        "total": len(cards),
        "by_faction": dict(by_faction),
        "quality": dict(q),
        "type": dict(t),
        "subtype": dict(st),
        "faction_lines": faction_lines,
    }


def skill_stats(skill_registry: dict) -> dict:
    counts = Counter(v.get("status", "未知") for v in skill_registry.values())
    return {
        "total": len(skill_registry),
        "done": counts.get("已实现", 0),
        "partial": counts.get("部分实现", 0),
        "none": counts.get("未实现", 0),
    }


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def cover_block(title: str, subtitle: str, meta_html: str, landscape: bool = False) -> str:
    h = "297mm" if not landscape else "210mm"
    w = "210mm" if not landscape else "297mm"
    return f"""
<div class="cover" style="width:{w};height:{h};">
<div class="cover-content">
<h1 class="cover-title">将领：征服</h1>
<p class="cover-subtitle">{esc(subtitle)}</p>
<div class="cover-meta">{meta_html}</div>
</div>
</div>"""


def gen_01(cards: list[dict], stats: dict) -> str:
    css = """body{margin:0;padding:0;font-family:"Noto Serif SC",Georgia,serif;font-size:10pt;line-height:1.5;color:#333}
@page{size:A4 landscape;margin:1.5cm 1cm}
.cover{width:297mm;height:210mm;margin:0;position:relative;overflow:hidden;page-break-after:always;background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)}
.cover-content{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;width:80%}
.cover-title{font-size:32pt;font-weight:700;color:#f5f5f5;margin-bottom:.5cm;letter-spacing:4pt}
.cover-subtitle{font-size:16pt;color:#e0e0e0;margin-bottom:2cm}
.cover-meta{font-size:12pt;color:#ccc;line-height:2}
.section-title{font-size:14pt;font-weight:bold;margin:1em 0 .5em;padding:.3em 0;border-bottom:2px solid #333;page-break-after:avoid}
.stats{background:#f8f8f8;padding:.8em;border-left:3px solid #333;margin:.5em 0;font-size:9pt}
table{width:100%;border-collapse:collapse;font-size:8pt;margin:.5em 0}
th,td{border:1px solid #999;padding:3px 5px;text-align:center;vertical-align:middle}
th{background:#f0f0f0;font-weight:bold}
.copper{background:#fff8e1}.silver{background:#f5f5f5}.gold{background:#fffde7}.rainbow{background:#f3e5f5}
.skill-tag{display:inline-block;padding:1px 4px;border-radius:2px;background:#e3f2fd;color:#1565c0;font-size:7pt;margin:1px}"""
    q = stats["quality"]
    meta = (
        f"<p>总卡牌数：{stats['total']}张 | 三阵营 + 通用</p>"
        f"<p>{stats['faction_lines']}</p><p>{DATE_CN} | {VERSION}</p>"
    )
    body = cover_block("", f"现行卡牌数据表 {VERSION}", meta, landscape=True)
    body += '<div class="section-title">数据汇总</div><div class="stats">'
    body += (
        f"<p><b>总卡牌数:</b> {stats['total']}张 — "
        f"品质: 铜:{q.get('铜',0)} 银:{q.get('银',0)} 金:{q.get('金',0)} 彩:{q.get('彩',0)}</p>"
        f"<p><b>类型:</b> 士兵:{stats['type'].get('士兵',0)} 法术:{stats['type'].get('法术',0)}</p>"
        f"<p><b>子类型:</b> "
        + " ".join(f"{k}:{v}" for k, v in sorted(stats["subtype"].items()))
        + "</p></div>"
    )
    for faction in FACTION_ORDER:
        fc = stats["by_faction"].get(faction, [])
        if not fc:
            continue
        fq = Counter(c["quality"] for c in fc)
        ft = Counter(c["type"] for c in fc)
        body += f'<div class="section-title">{esc(faction)} ({len(fc)}张)</div>'
        body += (
            f'<div class="stats"><b>{esc(faction)}</b> — '
            f"铜:{fq.get('铜',0)} 银:{fq.get('银',0)} 金:{fq.get('金',0)} 彩:{fq.get('彩',0)} | "
            f"士兵:{ft.get('士兵',0)} 法术:{ft.get('法术',0)}</div>"
        )
        body += """<table><thead><tr>
<th>ID</th><th>名称</th><th>费用</th><th>品质</th><th>类型</th><th>子类型</th>
<th>攻击</th><th>生命</th><th>护甲</th><th style="width:30%">描述</th><th style="width:20%">技能 / 内部效果码</th>
</tr></thead><tbody>"""
        for c in fc:
            cls = QUALITY_CLASS.get(c["quality"], "")
            tags = " ".join(
                f'<span class="skill-tag">{esc(s)}{"（内部效果码）" if s in INTERNAL_EFFECT_CODES else ""}</span>'
                for s in c["skills"]
            ) or "-"
            body += (
                f'<tr class="{cls}"><td>{c["id"]}</td><td>{esc(c["name"])}</td><td>{c["cost"]}</td>'
                f'<td>{esc(c["quality"])}</td><td>{esc(c["type"])}</td><td>{esc(c["subtype"])}</td>'
                f'<td>{c["atk"]}</td><td>{c["hp"]}</td><td>{c["armor"]}</td>'
                f'<td style="text-align:left;font-size:7pt;">{esc(c["desc"])}</td>'
                f'<td style="text-align:left;">{tags}</td></tr>'
            )
        body += "</tbody></table>"
    return f'<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>将领：征服 — 现行卡牌数据表</title><style>{css}</style></head><body>{body}</body></html>'


def gen_02(skill_registry: dict, gss_mod) -> str:
    usage = gss_mod.parse_skills_from_cards()
    order = gss_mod.parse_skill_type_order()
    for sk in skill_registry:
        if sk not in order:
            order.append(sk)
    ss = skill_stats(skill_registry)
    css = """body{margin:0;padding:0;font-family:"Noto Serif SC",Georgia,serif;font-size:10pt;color:#333}
@page{size:A4;margin:2cm}
.cover{width:210mm;height:297mm;page-break-after:always;background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);position:relative}
.cover-content{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;width:80%}
.cover-title{font-size:28pt;font-weight:700;color:#f5f5f5;margin-bottom:.5cm}
.cover-subtitle{font-size:14pt;color:#e0e0e0;margin-bottom:2cm}
.cover-meta{font-size:11pt;color:#ccc;line-height:2}
table{width:100%;border-collapse:collapse;font-size:8.5pt;margin:.5em 0}
th,td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f0f0f0}
.status-done{color:#2e7d32;font-weight:bold}.status-partial{color:#e65100;font-weight:bold}.status-none{color:#c62828;font-weight:bold}
.section-title{font-size:14pt;font-weight:bold;margin:1em 0 .5em;border-bottom:2px solid #333}
.category{padding:.3em .6em;border-radius:2px;font-size:8pt;display:inline-block;margin:1px}
.cat-damage{background:#ffebee;color:#b71c1c}.cat-defense{background:#e3f2fd;color:#0d47a1}
.cat-special{background:#f3e5f5;color:#4a148c}.cat-deploy{background:#e8f5e9;color:#1b5e20}.cat-spell{background:#fff3e0;color:#e65100}"""
    meta = (
        f"<p>总计技能: {ss['total']}个 | 已实现: {ss['done']}个 | "
        f"部分实现: {ss['partial']}个 | 未实现: {ss['none']}个</p>"
        f"<p>{DATE_CN} | {VERSION}</p>"
    )
    body = cover_block("", f"技能及内部效果运行逻辑表 {VERSION}", meta)
    body += (
        '<div class="section-title">阅读说明</div>'
        '<p><b>官方技能</b>会按触发时机参与技能展示；'
        '<code>magicDmg</code> 是伤害类型的内部效果码，'
        '<code>manaPierce</code> 是旧数据兼容别名，二者不应被当作独立官方技能或播放技能特效。</p>'
    )

    def rows_for_status(status_label: str, css_class: str) -> str:
        rows = []
        for sk in order:
            meta = skill_registry.get(sk, {})
            if meta.get("status") != status_label:
                continue
            cat_name, cat_cls = SKILL_CATEGORY.get(sk, ("其他", "cat-special"))
            ref = meta.get("files", "—").split("/")[-1].strip() or "—"
            rows.append(
                f"<tr><td><b>{esc(meta.get('name', sk))}</b><br>"
                f'<code style="font-size:7pt;color:#666;">{esc(sk)}</code></td>'
                f"<td>{esc(meta.get('logic', '—'))}</td>"
                f'<td><span class="category {cat_cls}">{esc(cat_name)}</span></td>'
                f'<td><code style="font-size:7pt;">{esc(ref)}</code></td>'
                f'<td class="{css_class}">{esc(status_label)}</td></tr>'
            )
        return "".join(rows)

    for label, css_cls, title in [
        ("已实现", "status-done", f"一、已实现技能 ({ss['done']}个)"),
        ("部分实现", "status-partial", f"二、部分实现技能 ({ss['partial']}个)"),
        ("未实现", "status-none", f"三、未实现技能 ({ss['none']}个)"),
    ]:
        section_rows = rows_for_status(label, css_cls)
        if section_rows:
            body += f'<div class="section-title">{title}</div><table><thead><tr>'
            body += "<th style='width:15%'>技能</th><th style='width:40%'>运行逻辑</th><th style='width:12%'>类别</th><th style='width:18%'>代码位置</th><th style='width:10%'>状态</th>"
            body += f"</tr></thead><tbody>{section_rows}</tbody></table>"

    body += f'<div class="section-title">四、数据说明</div><p>卡牌技能/内部效果码引用数合计 {sum(len(v) for v in usage.values())} 条；生成日期 {TODAY.isoformat()}。</p>'
    return f'<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>将领：征服 — 技能运行逻辑表</title><style>{css}</style></head><body>{body}</body></html>'


def faction_table_rows(stats: dict) -> str:
    rows = []
    totals = Counter()
    for f in FACTION_ORDER:
        fc = stats["by_faction"].get(f, [])
        if not fc:
            continue
        q = Counter(c["quality"] for c in fc)
        t = Counter(c["type"] for c in fc)
        row = {
            "铜": q.get("铜", 0),
            "银": q.get("银", 0),
            "金": q.get("金", 0),
            "彩": q.get("彩", 0),
            "士兵": t.get("士兵", 0),
            "法术": t.get("法术", 0),
            "total": len(fc),
        }
        for k, v in row.items():
            totals[k] += v
        rows.append(
            f"<tr><td>{esc(f)}</td><td>{row['铜']}</td><td>{row['银']}</td><td>{row['金']}</td>"
            f"<td>{row['彩']}</td><td>{row['士兵']}</td><td>{row['法术']}</td><td>{row['total']}</td></tr>"
        )
    rows.append(
        f"<tr><td><b>合计</b></td><td><b>{totals['铜']}</b></td><td><b>{totals['银']}</b></td>"
        f"<td><b>{totals['金']}</b></td><td><b>{totals['彩']}</b></td><td><b>{totals['士兵']}</b></td>"
        f"<td><b>{totals['法术']}</b></td><td><b>{totals['total']}</b></td></tr>"
    )
    return "".join(rows)


def count_lines(path: Path) -> int:
    if path.is_file():
        return len(path.read_text(encoding="utf-8").splitlines())
    return 0


def gen_03(cards: list[dict], stats: dict, ss: dict) -> str:
    ge = count_lines(APP / "src/engine/gameEngine.ts")
    ug = count_lines(APP / "src/hooks/useGame.ts")
    um = count_lines(APP / "src/hooks/useMultiplayer.ts")
    base = (DOCS / "03_development_report.html").read_text(encoding="utf-8") if (DOCS / "03_development_report.html").exists() else ""
    # 重建关键区块
    html_head = base.split("<body>")[0] if "<body>" in base else ""
    if not html_head:
        html_head = "<!DOCTYPE html><html lang='zh-CN'><head><meta charset='UTF-8'><title>开发报告</title></head>"
    body = f"""
<div class="cover"><div class="cover-content">
<h1 class="cover-title">将领：征服</h1>
<p class="cover-subtitle">开发报告 {VERSION}</p>
<div class="cover-meta">
<p>精确距离策略卡牌对战游戏</p>
<p>当前版本: {VERSION} | 总部血量: 40HP | 卡牌总数: {stats['total']}张</p>
<p>{DATE_CN}</p>
</div></div></div>

<h1 id="sec1">一、项目概述</h1>
<p>《将领：征服》是一款基于<strong>精确距离体系</strong>的1v1策略卡牌对战网页游戏。支持本地PvAI、公网联机PvP、抽卡与DIY卡组构建。</p>
<div class="stats">
<p><strong>部署：</strong>前端 Netlify | 联机服 Render WebSocket</p>
<p><strong>DIY 系统：</strong>{DIY_DESC}</p>
<p><strong>商业化方向：</strong>{COMMERCIAL_DESC}</p>
<p><strong>最新进展（现行构建，{TODAY.isoformat()}）：</strong>80张卡牌平衡调整、战场与卡组构筑UI优化、技能仅在实际触发时显示特效、流血/中毒/总部恢复严格显示数值、联机重连快照与随机效果同步</p>
</div>

<h1 id="sec2">二、版本演进（摘要）</h1>
<h2>{VERSION} — 平衡与联机（{DATE_CN}）</h2>
<ul>
<li>卡牌池 {stats['total']} 张，新增「计划」ID=82，法术子类型统一为「法术卡」</li>
<li>修复天火降临、混乱风暴、疾行、沉默、圣光、利息、法力贯穿等技能</li>
<li>联机：state_sync 棋盘快照、DeploySync/SpellSync 确定性随机、断线遮罩</li>
<li>UI：棋盘/抽卡/教程/主菜单重构，移除未使用 shadcn 组件</li>
</ul>

<h1 id="sec3">三、技术架构</h1>
<p><span class="tech-stack">React 19</span> <span class="tech-stack">TypeScript</span> <span class="tech-stack">Tailwind CSS</span> <span class="tech-stack">Vite 7</span> <span class="tech-stack">WebSocket</span></p>

<h1 id="sec7">七、数据概览</h1>
<h2>7.1 卡牌统计</h2>
<table><thead><tr><th>阵营</th><th>铜</th><th>银</th><th>金</th><th>彩</th><th>士兵</th><th>法术</th><th>总计</th></tr></thead>
<tbody>{faction_table_rows(stats)}</tbody></table>

<h2>7.2 技能统计</h2>
<p>登记技能 {ss['total']} 个：已实现 {ss['done']} | 部分实现 {ss['partial']} | 未实现 {ss['none']}</p>

<h2>7.3 代码规模（自动统计）</h2>
<table><thead><tr><th>模块</th><th>文件</th><th>行数</th></tr></thead><tbody>
<tr><td>核心引擎</td><td>gameEngine.ts</td><td>{ge}</td></tr>
<tr><td>游戏Hook</td><td>useGame.ts</td><td>{ug}</td></tr>
<tr><td>联机Hook</td><td>useMultiplayer.ts</td><td>{um}</td></tr>
<tr><td>卡牌数据</td><td>cards.ts</td><td>{count_lines(CARDS_TS)}</td></tr>
</tbody></table>
"""
    style = ""
    if "<style>" in html_head:
        m = re.search(r"<style>.*?</style>", html_head, re.DOTALL)
        if m:
            style = m.group(0)
    return f"<!DOCTYPE html><html lang='zh-CN'><head><meta charset='UTF-8'><title>将领：征服 — 开发报告</title>{style}</head><body>{body}</body></html>"


def patch_html(path: Path, replacements: list[tuple[str, str]]) -> None:
    text = path.read_text(encoding="utf-8")
    for old, new in replacements:
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


def update_static_html(stats: dict, ss: dict) -> None:
    total = str(stats["total"])
    common = [
        ("2025年6月", DATE_CN),
        ("79张", f"{total}张"),
        ("卡牌总数: 79张", f"卡牌总数: {total}张"),
        ("全79张", f"全{total}张"),
        ("(79张)", f"({total}张)"),
        ("v2.1", VERSION),
        ("v2.0", VERSION),
        ("v1.3", VERSION),
        ("v1.2", VERSION),
        ("v1.1", VERSION),
        ("v3.0", VERSION),
        ("v2.5", VERSION),
        ("v4.0", VERSION),
        ("v0.99", VERSION),
        ("v1.0", VERSION),
        ("V1.0 DEMO", VERSION),
        ("v2.0 DEMO", VERSION),
        ("shadcn/ui</span>", "Lucide React</span>"),
        ("总计技能: 58个 | 已实现: 56个 | 部分实现: 2个", f"总计技能: {ss['total']}个 | 已实现: {ss['done']}个 | 部分实现: {ss['partial']}个 | 未实现: {ss['none']}个"),
        ("subtype: '魔法'", "subtype: '法术卡'"),  # manual examples if any
    ]
    for name in ["04_comprehensive_manual.html", "05_future_roadmap.html", "06_business_plan.html"]:
        p = DOCS / name
        if p.exists():
            patch_html(p, common)
    # 05 路线图：标记已完成项
    p5 = DOCS / "05_future_roadmap.html"
    if p5.exists():
        t = p5.read_text(encoding="utf-8")
        t = t.replace("（V1.0 - V1.0，", "（V1.0 后续规划，")
        t = t.replace(
            "<li><strong>断线重连</strong>：WebSocket断开后自动重连，恢复对局状态</li>",
            "<li><strong>断线重连</strong>：✅ 已实现（rejoin + state_sync 快照）</li>",
        )
        t = t.replace(
            "<tr><td><span class=\"priority-high\">高</span></td><td>疾行(agile)技能完善</td><td>攻击优先权/额外移动</td><td>2-3天</td></tr>",
            "<tr><td><span class=\"priority-low\">低</span></td><td>疾行(agile)技能</td><td>✅ 已实现本回合移动</td><td>完成</td></tr>",
        )
        t = t.replace(
            "<tr><td><span class=\"priority-mid\">中</span></td><td>游戏状态序列化</td><td>完整保存/恢复对局状态</td><td>3-5天</td></tr>",
            "<tr><td><span class=\"priority-low\">低</span></td><td>游戏状态序列化</td><td>✅ 联机重连快照已上线</td><td>完成</td></tr>",
        )
        p5.write_text(t, encoding="utf-8")


def apply_content_standards() -> None:
    """统一硬编码文案：通用卡数量、中毒、隐踪、DIY、商业化。"""
    poison_block_old = """<li>中毒时强运(lucky)失效</li>
<li>中毒时战术指挥/射击指挥加成失效</li>"""
    poison_block_new = f"<li>{POISON_EFFECT_NOTE}</li>"

    stealth_row_old = "<tr><td>隐踪(stealth)</td><td>士兵部署到战场</td><td>获得隐身状态</td></tr>"
    stealth_row_new = f"<tr><td>隐踪(stealth)</td><td>—</td><td>{STEALTH_NOTE}</td></tr>"

    tactic_row_old = "<tr><td>战术/射击指挥</td><td>全局计算</td><td>近战/弓箭友军+1攻（中毒时失效）</td></tr>"
    tactic_row_new = f"<tr><td>战术/射击指挥</td><td>全局计算</td><td>近战/弓箭友军+攻（{POISON_EFFECT_NOTE}）</td></tr>"

    diy_old = "允许玩家创建自定义卡牌并构建卡组："
    diy_new = f"{DIY_DESC}。玩家可创建自定义卡牌并构建卡组："

    diy_formula_old = "<li><strong>评判公式</strong>：属性价值 + 技能价值 - 费用惩罚，得分<1偏弱，1~3适中，>3偏强</li>"
    diy_formula_new = "<li><strong>评分公式</strong>：属性价值 + 技能价值 - 费用惩罚，得分&lt;1偏弱，1~3适中，&gt;3偏强（超限不可保存）</li>"

    biz_model_old = "<p><strong>商业模式：</strong>赛季通行证 +  cosmetic商城（皮肤/特效/战场） + 广告收入</p>"
    biz_model_new = f"<p><strong>商业模式：</strong>{COMMERCIAL_DESC}</p>"

    diy_biz_old = "<p>玩家可以创建自定义卡牌，系统通过评判公式自动评估卡牌强度，确保对战平衡。</p>"
    diy_biz_new = f"<p>{DIY_DESC}。系统通过评分公式自动评估卡牌强度，确保对战平衡。</p>"

    roadmap_commercial_old = """<h2>商业化方向</h2>
<ul>
<li><strong>赛季通行证</strong>：每月新赛季，新卡牌/皮肤/奖励</li>
<li><strong> cosmetic商店</strong>：卡牌皮肤、战场背景、特效（不影响平衡）</li>
<li><strong>赞助内容</strong>：与桌游/卡牌品牌联动</li>
</ul>"""
    roadmap_commercial_new = f"""<h2>商业化方向</h2>
<p>{COMMERCIAL_DESC}</p>
<ul>
<li><strong>赛季通行证</strong>：外观与收集向奖励，不影响对战数值</li>
<li><strong> cosmetic商店</strong>：卡牌皮肤、战场背景、特效（不影响平衡）</li>
<li><strong>赞助内容</strong>：与桌游/卡牌品牌联动</li>
</ul>"""

    p04 = DOCS / "04_comprehensive_manual.html"
    if p04.exists():
        t = p04.read_text(encoding="utf-8")
        t = t.replace(poison_block_old, poison_block_new)
        t = t.replace(stealth_row_old, stealth_row_new)
        t = t.replace(tactic_row_old, tactic_row_new)
        t = t.replace(diy_old, diy_new)
        t = t.replace(diy_formula_old, diy_formula_new)
        t = t.replace("评判公式", "评分公式")
        p04.write_text(t, encoding="utf-8")
        print("standards", p04.name)

    p06 = DOCS / "06_business_plan.html"
    if p06.exists():
        t = p06.read_text(encoding="utf-8")
        t = t.replace(biz_model_old, biz_model_new)
        t = t.replace(diy_biz_old, diy_biz_new)
        t = t.replace("<td>3张</td></tr>\n</tbody>", "<td>4张</td></tr>\n</tbody>")
        t = t.replace("通用</td><td>全阵营可用</td><td>强力但费用高的法术</td><td>3张</td>", "通用</td><td>全阵营可用</td><td>强力但费用高的法术</td><td>4张</td>")
        t = t.replace("评判公式", "评分公式")
        p06.write_text(t, encoding="utf-8")
        print("standards", p06.name)

    p05 = DOCS / "05_future_roadmap.html"
    if p05.exists():
        t = p05.read_text(encoding="utf-8")
        t = t.replace("<li><strong>新通用卡牌</strong>：5张通用法术卡</li>", "<li><strong>新通用卡牌</strong>：在现有4张通用卡体系上扩展</li>")
        if roadmap_commercial_old in t:
            t = t.replace(roadmap_commercial_old, roadmap_commercial_new)
        p05.write_text(t, encoding="utf-8")
        print("standards", p05.name)

    arch = DOCS / "核心代码架构.md"
    if arch.exists():
        t = arch.read_text(encoding="utf-8")
        t = t.replace("stealth: boolean;          // 是否隐身", f"isStealthed: boolean;     // 隐踪：{STEALTH_NOTE}")
        t = t.replace("| 'stealth'        // 隐身：部署后隐身", f"| 'stealth'        // 隐踪：{STEALTH_NOTE}")
        t = t.replace("// 中毒时战术指挥/射击指挥失效（buff加成仍有效）", f"// {POISON_EFFECT_NOTE}（buff加成仍有效）")
        if DIY_DESC not in t:
            t = t.replace("| `src/data/diySystem.ts` | DIY卡牌系统 |", f"| `src/data/diySystem.ts` | DIY卡牌系统（{DIY_DESC}） |")
        arch.write_text(t, encoding="utf-8")
        print("standards", arch.name)


def parse_diy_skill_values() -> list[tuple[str, float, str]]:
    text = (APP / "src/data/diySystem.ts").read_text(encoding="utf-8")
    rows: list[tuple[str, float, str]] = []
    for name, val, desc in re.findall(
        r"'([^']+)':\s*\{\s*value:\s*([-\d.]+),\s*desc:\s*'([^']*)'",
        text,
    ):
        if name in ("value", "desc"):
            continue
        rows.append((name, float(val), desc))
    return rows


def parse_diy_skill_groups() -> list[tuple[str, list[str]]]:
    text = (APP / "src/data/diySystem.ts").read_text(encoding="utf-8")
    groups: list[tuple[str, list[str]]] = []
    for block in re.finditer(
        r"label:\s*'([^']+)',\s*skills:\s*\[(.*?)\]",
        text,
        re.DOTALL,
    ):
        label = block.group(1)
        skills = re.findall(r"'([^']+)'", block.group(2))
        if label and skills:
            groups.append((label, skills))
    return groups


def parse_diy_conflicts() -> list[tuple[str, str, str]]:
    text = (APP / "src/data/diySystem.ts").read_text(encoding="utf-8")
    rows: list[tuple[str, str, str]] = []
    for m in re.finditer(
        r"\{\s*skills:\s*\[(.*?)\],\s*(?:requires:\s*'([^']*)',\s*)?reason:\s*'([^']*)',\s*type:\s*'([^']*)'",
        text,
        re.DOTALL,
    ):
        skills = ", ".join(re.findall(r"'([^']+)'", m.group(1)))
        req = m.group(2) or "—"
        reason = m.group(3)
        typ = m.group(4)
        rows.append((skills, typ, reason if req == "—" else f"{reason}（需 {req}）"))
    return rows


def gen_07_diy_judge_formula() -> str:
    css = """body{margin:0;padding:0;font-family:"Noto Serif SC",Georgia,serif;font-size:10.5pt;line-height:1.65;color:#333}
@page{size:A4;margin:2.5cm 2cm}
.cover{width:210mm;height:297mm;page-break-after:always;background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);position:relative}
.cover-content{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;width:80%}
.cover-title{font-size:30pt;font-weight:700;color:#f5f5f5;margin-bottom:.5cm;letter-spacing:3pt}
.cover-subtitle{font-size:15pt;color:#e0e0e0;margin-bottom:2cm}
.cover-meta{font-size:11pt;color:#ccc;line-height:2}
h1{font-size:18pt;margin-top:1.5em;margin-bottom:.5em;border-bottom:2px solid #333;padding-bottom:.2em;page-break-after:avoid}
h2{font-size:14pt;margin-top:1.2em;margin-bottom:.4em;border-left:4px solid #333;padding-left:.5em;page-break-after:avoid}
h3{font-size:11pt;margin-top:1em;margin-bottom:.3em;font-weight:bold}
.theorem{border-left:3px solid #333;padding:.5em 1em;margin:1em 0;background:#fafafa}
table{width:100%;border-collapse:collapse;font-size:8.5pt;margin:.5em 0}
th,td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f0f0f0;font-weight:bold}
tr{page-break-inside:avoid}
code{font-family:"Courier New",monospace;font-size:8.5pt;background:#f5f5f5;padding:.1em .3em}
.note{background:#fff8e1;border-left:3px solid #ffb300;padding:.6em 1em;margin:.6em 0;font-size:9.5pt}
.warn{background:#ffebee;border-left:3px solid #c62828;padding:.6em 1em;margin:.6em 0;font-size:9.5pt}"""

    skill_map = {n: (v, d) for n, v, d in parse_diy_skill_values()}
    groups = parse_diy_skill_groups()
    conflicts = parse_diy_conflicts()

    body = f"""
<div class="cover"><div class="cover-content">
<h1 class="cover-title">将领：征服</h1>
<p class="cover-subtitle">现行 DIY 评判公式 {VERSION}</p>
<div class="cover-meta">
<p>数据来源：<code>src/data/diySystem.ts</code></p>
<p>{DIY_DESC}</p>
<p>{DATE_CN}</p>
</div></div></div>

<h1 id="sec1">一、设计原则</h1>
<p>{DIY_DESC}。{DIY_EDITOR_NOTE}；系统实时计算<strong>评分偏差</strong>并给出可否保存结论。</p>
<div class="warn"><strong>实现边界：</strong><code>diySystem.ts</code> 仍保留法术卡公式和「魔法伤害」条目供内部兼容，但现行卡牌创建界面不会创建法术卡；「魔法伤害」也不属于官方可展示技能。</div>
<ul>
<li>士兵卡：以 <code>攻击 + 生命 + 护甲</code> 作为身材价值，并计入子类型税、协同与组合风险。</li>
<li>法术卡：底层评分器保留此计算能力，但现行编辑器尚未开放法术卡创建。</li>
<li>技能冲突、重叠和依赖缺失只产生警告，不再降低评分；强组合通过组合风险和硬规则约束。</li>
<li>「隐踪、追击、灵动」属于未开放技能：创建界面隐藏，旧数据使用时阻止保存；「疾行」正常开放。</li>
</ul>

<h1 id="sec2">二、核心公式</h1>
<div class="theorem">
<p><strong>费用基准 baseValue</strong></p>
<p>士兵：<code>baseValue = cost × 2.2 + 1</code></p>
<p>法术：<code>baseValue = cost × 1.5 + 0.5</code></p>
<p><strong>总价值 totalValue</strong></p>
<p><code>totalValue = bodyValue + skillValue + subtypeTax + positionBonus + synergyBonus + comboRisk + negativePenalty</code></p>
<p>其中 <code>bodyValue = atk + hp + armor</code>（法术为 0），<code>skillValue = Σ 正面技能价值</code>；悬赏等负面价值单独计入 <code>negativePenalty</code>。</p>
<p><strong>偏差 deviation</strong> = <code>totalValue − baseValue</code></p>
</div>

<h1 id="sec3">三、修正项说明</h1>
<h2>3.1 子类型税 subtypeTax</h2>
<table>
<thead><tr><th>子类型</th><th>近战</th><th>弓箭</th><th>狙击</th><th>魔法</th><th>随机</th></tr></thead>
<tbody><tr><td>价值</td><td>0</td><td>+0.3</td><td>+0.7</td><td>+1.0</td><td>+1.2</td></tr></tbody>
</table>

<h2>3.2 部署位置修正 positionBonus</h2>
<p>仅士兵生效；法术无位置修正。</p>
<table>
<thead><tr><th>子类型</th><th>front（前线）</th><th>back（底线）</th><th>both（均可）</th></tr></thead>
<tbody>
<tr><td>近战</td><td>+0.5</td><td>−0.3</td><td>+0.3</td></tr>
<tr><td>弓箭</td><td>+0.3</td><td>+0.5</td><td>+0.4</td></tr>
<tr><td>狙击</td><td>+0.2</td><td>+0.6</td><td>+0.4</td></tr>
<tr><td>魔法</td><td>+0.3</td><td>+0.4</td><td>+0.3</td></tr>
<tr><td>随机</td><td>+0.3</td><td>+0.3</td><td>+0.3</td></tr>
</tbody></table>

<h2>3.3 协同、组合风险与负面修正</h2>
<ul>
<li><strong>negativePenalty</strong>：含「悬赏」技能时 −0.5</li>
<li><strong>synergyBonus</strong>：正面且已开放技能数 &gt; 1 时，<code>(技能数 − 1) × 0.6</code></li>
<li><strong>comboRisk</strong>：将闪击+DOT、毒爆/撕裂链、飞翔+俯冲、嘲讽防御链、随机+强运、法力增幅链等高收益组合额外计分。</li>
<li><strong>conflictPenalty</strong>：为兼容旧存档保留字段，但现行值恒为 0。</li>
</ul>
<table>
<thead><tr><th>高危组合</th><th>风险值</th></tr></thead>
<tbody>
<tr><td>闪击 + 流血/中毒</td><td>+1.5</td></tr>
<tr><td>闪击 + 毒爆/撕裂</td><td>+2.0</td></tr>
<tr><td>中毒 + 毒爆</td><td>+1.5</td></tr>
<tr><td>流血 + 撕裂</td><td>+1.2</td></tr>
<tr><td>飞翔 + 俯冲</td><td>+0.8</td></tr>
<tr><td>嘲讽 + 全抗/护甲/反击</td><td>+1.0</td></tr>
<tr><td>随机 + 强运</td><td>+1.2</td></tr>
<tr><td>随机 + 高层 DOT</td><td>+1.0</td></tr>
<tr><td>魔法 + 法力增幅</td><td>+1.0</td></tr>
<tr><td>法力增幅 + 刷新增幅</td><td>+2.0</td></tr>
<tr><td>魔法免疫单位且生命 ≥ 6</td><td>+1.2</td></tr>
<tr><td>6费及以上士兵 + 均衡3</td><td>+2.0</td></tr>
</tbody></table>

<h1 id="sec4">四、评级与保存规则</h1>
<table>
<thead><tr><th>偏差 deviation</th><th>评级 verdict</th><th>可否保存 canSave</th></tr></thead>
<tbody>
<tr><td>包含未开放技能</td><td>未开放技能</td><td>否</td></tr>
<tr><td>触发身材上限</td><td>身材超出彩卡上限</td><td>否</td></tr>
<tr><td>触发其他硬规则</td><td>破坏性组合</td><td>否</td></tr>
<tr><td>&gt; hardLimit</td><td>破坏性超模</td><td>否</td></tr>
<tr><td>&gt; warningLimit 且 ≤ hardLimit</td><td>彩色高危</td><td>是</td></tr>
<tr><td>≥ lowerLimit 且 ≤ warningLimit</td><td>彩色平衡</td><td>是</td></tr>
<tr><td>&lt; lowerLimit</td><td>明显亏模</td><td>是（警告）</td></tr>
</tbody></table>
<p>阈值：<code>warningLimit = cost ≤ 2 ? 6 : cost ≤ 5 ? 7 : 8</code>；<code>hardLimit = 9 + cost × 0.8</code>；<code>lowerLimit = −8</code>。</p>

<h2>4.1 身材与低费硬规则</h2>
<ul>
<li>身材上限：1费 8、2费 10、3费 12、4费 14、5费 16、6费 18、7费及以上 22。</li>
<li>1费且身材 ≥ 7：不能携带正面技能；2费且身材 ≥ 9：正面技能价值 ≤ 2；3费且身材 ≥ 11：正面技能价值 ≤ 4。</li>
<li>1至2费满身材上限单位不能叠加正面技能。</li>
<li>1至2费魔法/随机/狙击单位攻击不能高于 3。</li>
<li>1至2费禁止：闪击、消灭、沉默2/5、均衡3、法力增幅5、刷新增幅、抽牌3、DOT爆发链、8点及以上总部直伤、限制部署。</li>
<li>消灭与法力增幅5的最低费用均为 6。</li>
</ul>

<h1 id="sec5">五、卡组携带限制</h1>
<table>
<thead><tr><th>类型</th><th>单卡重复上限</th><th>说明</th></tr></thead>
<tbody>
<tr><td>铜卡</td><td>4 张</td><td>官方卡按品质计数</td></tr>
<tr><td>银卡</td><td>3 张</td><td>—</td></tr>
<tr><td>金卡</td><td>2 张</td><td>—</td></tr>
<tr><td>彩卡</td><td>1 张</td><td>—</td></tr>
<tr><td>DIY 卡</td><td>1 张</td><td>独立配额，品质固定为彩</td></tr>
<tr><td>卡组总数</td><td>40 张</td><td>官方 + DIY 混合</td></tr>
</tbody></table>

<h1 id="sec6">六、技能冲突规则（{len(conflicts)} 条）</h1>
<table>
<thead><tr><th>涉及技能</th><th>类型</th><th>说明</th></tr></thead>
<tbody>"""
    type_label = {
        "overlap": "功能重叠",
        "contradiction": "逻辑矛盾",
        "missing": "依赖缺失",
        "mismatch": "类型不匹配",
        "negative": "负面叠加",
        "synergy": "协同",
    }
    for skills, typ, reason in conflicts:
        body += f"<tr><td>{esc(skills)}</td><td>{esc(type_label.get(typ, typ))}</td><td>{esc(reason)}</td></tr>"
    body += "</tbody></table>"

    body += f"<h1 id=\"sec7\">七、技能价值表（{len(skill_map)} 项）</h1>"
    body += f'<div class="warn"><strong>隐踪 (stealth)：</strong>{STEALTH_NOTE}。价值表保留条目供编辑器参考，但不计入正式平衡环境。</div>'

    for label, skill_names in groups:
        body += f"<h2>{esc(label)}</h2><table><thead><tr><th>技能</th><th>价值</th><th>说明</th><th>备注</th></tr></thead><tbody>"
        for sk in skill_names:
            if sk not in skill_map:
                continue
            val, desc = skill_map[sk]
            note = STEALTH_NOTE if sk == "隐踪" else "—"
            body += f"<tr><td>{esc(sk)}</td><td>{val:+.1f}</td><td>{esc(desc)}</td><td>{esc(note)}</td></tr>"
        body += "</tbody></table>"

    # 未分组的技能
    grouped = {s for _, skills in groups for s in skills}
    orphan = [(n, skill_map[n]) for n in sorted(skill_map) if n not in grouped]
    if orphan:
        body += "<h2>其他</h2><table><thead><tr><th>技能</th><th>价值</th><th>说明</th><th>备注</th></tr></thead><tbody>"
        for name, (val, desc) in orphan:
            note = STEALTH_NOTE if name == "隐踪" else "—"
            body += f"<tr><td>{esc(name)}</td><td>{val:+.1f}</td><td>{esc(desc)}</td><td>{esc(note)}</td></tr>"
        body += "</tbody></table>"

    body += f"""
<div class="note">本文档由 <code>scripts/generate_documents.py</code> 自动从 <code>diySystem.ts</code> 生成。修改公式或技能价值后请重新运行脚本同步。</div>
"""
    return f'<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>将领：征服 — 现行DIY评判公式</title><style>{css}</style></head><body>{body}</body></html>'


def copy_xlsx() -> None:
    card_dir = APP / "card_data_export"
    skill_dir = APP / "skill_summary_export"
    card_xlsx = sorted(card_dir.glob("*.xlsx"), key=lambda p: p.stat().st_mtime)
    skill_xlsx = sorted(skill_dir.glob("*.xlsx"), key=lambda p: p.stat().st_mtime) if skill_dir.is_dir() else []
    if card_xlsx:
        dst = DOCS / "01_将领征服_现行卡牌数据表.xlsx"
        shutil.copy2(card_xlsx[-1], dst)
        print("xlsx", dst.name)
    if skill_xlsx:
        dst = DOCS / "02_将领征服_技能运行逻辑表.xlsx"
        shutil.copy2(skill_xlsx[-1], dst)
        print("xlsx", dst.name)
    elif card_xlsx:
        # 含技能表的合并版
        merged = [p for p in card_xlsx if "含技能" in p.name or "技能" in p.name]
        if merged:
            shutil.copy2(merged[-1], DOCS / "02_将领征服_技能运行逻辑表.xlsx")


def html_to_pdf(html_path: Path, pdf_path: Path) -> bool:
    candidates = [
        Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    ]
    browser = next((p for p in candidates if p.is_file()), None)
    if not browser:
        return False
    uri = html_path.resolve().as_uri()
    try:
        subprocess.run(
            [
                str(browser),
                "--headless",
                "--disable-gpu",
                "--no-pdf-header-footer",
                f"--print-to-pdf={pdf_path.resolve()}",
                uri,
            ],
            check=True,
            capture_output=True,
            timeout=120,
        )
        return pdf_path.is_file()
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return False


def gen_pdfs() -> None:
    mapping = [
        ("01_card_data_table.html", "01_将领征服_现行卡牌数据表.pdf"),
        ("02_skill_logic_table.html", "02_将领征服_技能运行逻辑表.pdf"),
        ("03_development_report.html", "03_将领征服_开发报告V1.0.pdf"),
        ("04_comprehensive_manual.html", "04_将领征服_详尽说明书.pdf"),
        ("05_future_roadmap.html", "05_将领征服_未来开发计划.pdf"),
        ("06_business_plan.html", "06_将领征服_商业计划书.pdf"),
        ("07_diy_judge_formula.html", "07_将领征服_现行DIY评判公式.pdf"),
    ]
    for html_name, pdf_name in mapping:
        html = DOCS / html_name
        pdf = DOCS / pdf_name
        if html.is_file() and html_to_pdf(html, pdf):
            print("pdf", pdf_name)
        else:
            print("pdf skip", pdf_name)


def update_markdown(stats: dict, ss: dict) -> None:
    arch = DOCS / "核心代码架构.md"
    if arch.is_file():
        t = arch.read_text(encoding="utf-8")
        t = re.sub(r"文档版本：.*", f"文档版本：{VERSION}（{TODAY.isoformat()}）", t)
        if "spellOnlyNextTurn" not in t:
            t = t.replace(
                "  drawCount: number;    // 回合抽卡数\n}",
                "  drawCount: number;    // 回合抽卡数\n  spellOnlyNextTurn: boolean; // 混乱风暴：下回合仅法术\n  riddleActive: boolean;      // 谜境激活\n}",
            )
        if "agileUsed" not in t:
            t = t.replace(
                "  randomRange: [number, number]; // 随机伤害范围\n}",
                "  randomRange: [number, number]; // 随机伤害范围\n  agileUsed: boolean;          // 疾行：本回合是否已移动\n}",
            )
        t = t.replace("subtype: string;       // 子类型：近战/弓箭/狙击/魔法/随机", "subtype: string;       // 子类型：近战/弓箭/狙击/魔法/法术卡/随机")
        t = t.replace("~2000行", f"约{count_lines(APP / 'src/engine/gameEngine.ts')}行")
        arch.write_text(t, encoding="utf-8")
        print("md", arch.name)

    mp = DOCS / "联机对战教程.md"
    if mp.is_file():
        t = mp.read_text(encoding="utf-8")
        t = re.sub(r"\*文档版本：.*\*", f"*文档版本：{VERSION}（{TODAY.isoformat()}，基于最新代码）*", t)
        if "state_sync" not in t:
            insert = """
### 6.6 棋盘快照同步（重连）

客户端定期发送：
```json
{ "type": "state_sync", "payload": { "state": "<GameState JSON>" } }
```

服务器保存 `hostStateSnapshot` / `guestStateSnapshot`；重连成功时 `rejoin_ok.payload.gameState` 下发快照恢复对局。

### 6.7 随机效果同步

部署/法术消息可携带 `sync` 字段（`DeploySyncData` / `SpellSyncData`），对手镜像执行时使用相同随机结果，保证双端一致。

"""
            t = t.replace("### 6.5 攻击序列（防竞态）", insert + "### 6.5 攻击序列（防竞态）")
        t = t.replace(
            "const WS_URL = `ws://${window.location.hostname}:8080`;",
            "const WS_URL = getEffectiveWsUrl();",
        )
        mp.write_text(t, encoding="utf-8")
        print("md", mp.name)


def main() -> None:
    DOCS.mkdir(parents=True, exist_ok=True)
    # 先生成技能汇总 xlsx
    gss = load_skill_module()
    gss.main()

    cards = parse_cards()
    stats = card_stats(cards)
    ss = skill_stats(gss.SKILL_REGISTRY)

    outputs = {
        "01_card_data_table.html": gen_01(cards, stats),
        "02_skill_logic_table.html": gen_02(gss.SKILL_REGISTRY, gss),
        "03_development_report.html": gen_03(cards, stats, ss),
        "07_diy_judge_formula.html": gen_07_diy_judge_formula(),
    }
    for name, content in outputs.items():
        (DOCS / name).write_text(content, encoding="utf-8")
        print("html", name)

    update_static_html(stats, ss)
    apply_content_standards()
    copy_xlsx()
    update_markdown(stats, ss)
    gen_pdfs()
    print("done", DOCS)


if __name__ == "__main__":
    main()

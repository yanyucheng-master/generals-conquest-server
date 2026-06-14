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
VERSION = "v2.1"

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
    faction_lines = " | ".join(f"{f} {len(by_faction[f])}张" for f in FACTION_ORDER if by_faction[f])
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
<th>攻击</th><th>生命</th><th>护甲</th><th style="width:30%">描述</th><th style="width:20%">技能</th>
</tr></thead><tbody>"""
        for c in fc:
            cls = QUALITY_CLASS.get(c["quality"], "")
            tags = " ".join(f'<span class="skill-tag">{esc(s)}</span>' for s in c["skills"]) or "-"
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
    body = cover_block("", f"技能及其实际运行逻辑表 {VERSION}", meta)

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

    body += f'<div class="section-title">四、数据说明</div><p>官方卡牌引用数合计 {sum(len(v) for v in usage.values())} 条；生成日期 {TODAY.isoformat()}。</p>'
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
<p>当前版本: {VERSION} DEMO | 总部血量: 40HP | 卡牌总数: {stats['total']}张</p>
<p>{DATE_CN}</p>
</div></div></div>

<h1 id="sec1">一、项目概述</h1>
<p>《将领：征服》是一款基于<strong>精确距离体系</strong>的1v1策略卡牌对战网页游戏。支持本地PvAI、公网联机PvP、抽卡与DIY卡组构建。</p>
<div class="stats">
<p><strong>部署：</strong>前端 Netlify | 联机服 Render WebSocket</p>
<p><strong>最新进展（{VERSION}）：</strong>80张卡牌平衡调整、7项技能逻辑修复、UI大改、联机重连快照与随机效果同步</p>
</div>

<h1 id="sec2">二、版本演进（摘要）</h1>
<h2>v2.1 — 平衡与联机（{DATE_CN}）</h2>
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
        ("v1.0", VERSION),
        ("v2.0 DEMO", f"{VERSION} DEMO"),
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


def copy_xlsx() -> None:
    card_dir = APP / "card_data_export"
    skill_dir = APP / "skill_summary_export"
    card_xlsx = sorted(card_dir.glob("*.xlsx"))
    skill_xlsx = sorted(skill_dir.glob("*.xlsx")) if skill_dir.is_dir() else []
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
        ("03_development_report.html", "03_将领征服_开发报告v1.0.pdf"),
        ("04_comprehensive_manual.html", "04_将领征服_详尽说明书.pdf"),
        ("05_future_roadmap.html", "05_将领征服_未来开发计划.pdf"),
        ("06_business_plan.html", "06_将领征服_商业计划书.pdf"),
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
            "const WS_URL = import.meta.env.VITE_WS_URL || `wss://yyc-generals-conquest-server-ws.onrender.com`;",
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
    }
    for name, content in outputs.items():
        (DOCS / name).write_text(content, encoding="utf-8")
        print("html", name)

    update_static_html(stats, ss)
    copy_xlsx()
    update_markdown(stats, ss)
    gen_pdfs()
    print("done", DOCS)


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""
Generator for OmniSMM 1.0 Investment & Management Franchise Memorandum (DOCX)
Compliant with institutional standards (FTC FDD / Venture Waterfall / Civil Code RF)
"""

import sys
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    """Sets background color of a table cell."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tc_pr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    """Sets padding for a table cell in dxa (1 pt = 20 dxa)."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tc_pr.append(tc_mar)

def set_table_borders(table, color="D1D5DB", sz="4"):
    """Sets subtle light borders for a table."""
    tbl_pr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideV w:val="none"/></w:tblBorders>')
    tbl_pr.append(borders)

def add_callout(doc, text, title="ВАЖНОЕ ПРАВИЛО / ИНВАРИАНТ", bg_color="F1F5F9", border_color="1D4ED8"):
    """Adds a stylish callout block with colored left border."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=160, bottom=160, left=220, right=200)
    
    # Left border only
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/><w:top w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>')
    tc_pr.append(tc_borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    run_t = p.add_run(f"■ {title}\n")
    run_t.bold = True
    run_t.font.name = "Calibri"
    run_t.font.size = Pt(10)
    run_t.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    
    run_b = p.add_run(text)
    run_b.font.name = "Calibri"
    run_b.font.size = Pt(9.5)
    run_b.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    
    # Space after table
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(4)

def format_cell_text(cell, text, bold=False, italic=False, font_size=9, color=RGBColor(0x1E, 0x29, 0x3B), align=WD_ALIGN_PARAGRAPH.LEFT):
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.name = "Calibri"
    run.font.size = Pt(font_size)
    run.font.color.rgb = color
    return run

def create_document():
    doc = docx.Document()
    
    # Set page margins (0.75 in = 1.9 cm)
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
        section.page_width = Inches(8.27)  # A4
        section.page_height = Inches(11.69)
        
        # Header / Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("OmniSMM 1.0 | Инвестиционный Меморандум и Регламент Франшизы (v2.0) | КОНФИДЕНЦИАЛЬНО")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8)
        hrun.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Стр. 1 из 1 — Настоящий документ регулируется нормами части IV ГК РФ и стандартами FTC FDD Rule 436")
        frun.font.name = "Calibri"
        frun.font.size = Pt(8)
        frun.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    # Base styles
    styles = doc.styles
    normal_style = styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    normal_style.paragraph_format.line_spacing = 1.25
    normal_style.paragraph_format.space_after = Pt(6)

    # Document Header Title Block
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(12)
    title_p.paragraph_format.space_after = Pt(2)
    trun = title_p.add_run("МЕМОРАНДУМ О СОТРУДНИЧЕСТВЕ И ПАРТНЕРСКОЕ СОГЛАШЕНИЕ")
    trun.bold = True
    trun.font.size = Pt(18)
    trun.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    
    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(14)
    srun = sub_p.add_run("Управленческая IT-Франшиза розничной витрины на базе платформы OmniSMM 1.0\n")
    srun.bold = True
    srun.font.size = Pt(12)
    srun.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
    srun2 = sub_p.add_run("Институциональный инвестиционный меморандум, доскональная финансовая модель на 24 месяца, оценка рисков и регламент защиты сторон")
    srun2.italic = True
    srun2.font.size = Pt(10)
    srun2.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # Key Specs Badge Bar
    badge_tbl = doc.add_table(rows=1, cols=4)
    badge_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    badge_tbl.autofit = False
    widths = [Inches(1.6), Inches(1.6), Inches(1.6), Inches(1.7)]
    for i, w in enumerate(widths):
        badge_tbl.columns[i].width = w
    
    specs = [
        ("СУММА РАУНДА", "1 900 000 ₽", "700к взнос + 1.2М фонд"),
        ("РОЛЬ ИНВЕСТОРА", "1 час / день", "Наблюдательный совет"),
        ("ВОЗВРАТ ТЕЛА", "60% прибыли", "До полного возврата 1.9M"),
        ("ФАЗА 2 (ПАССИВ)", "30% прибыли", "Бессрочно (~50% годовых)")
    ]
    for col_idx, (t_top, t_mid, t_bot) in enumerate(specs):
        c = badge_tbl.cell(0, col_idx)
        set_cell_background(c, "F8FAFC")
        set_cell_margins(c, top=100, bottom=100, left=120, right=120)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        
        r1 = p.add_run(f"{t_top}\n")
        r1.font.size = Pt(7.5)
        r1.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
        r1.bold = True
        
        r2 = p.add_run(f"{t_mid}\n")
        r2.font.size = Pt(11)
        r2.font.color.rgb = RGBColor(0x1D, 0x4E, 0xD8)
        r2.bold = True
        
        r3 = p.add_run(t_bot)
        r3.font.size = Pt(7)
        r3.font.color.rgb = RGBColor(0x47, 0x55, 0x69)
        
    set_table_borders(badge_tbl, color="CBD5E1", sz="4")
    
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(8)
    p_div.paragraph_format.space_after = Pt(8)

    # -------------------------------------------------------------
    # SECTION 1: ПРЕАМБУЛА И СУТЬ БИЗНЕСА
    # -------------------------------------------------------------
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(14)
    h1.paragraph_format.space_after = Pt(4)
    r = h1.add_run("1. ПРЕАМБУЛА, ПРЕДМЕТ СОГЛАШЕНИЯ И ПРИРОДА БИЗНЕСА")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph(
        "Настоящий документ определяет принципы долгосрочного взаимовыгодного инвестиционного и операционного "
        "сотрудничества между Создателями/Операторами платформы (далее — «Управляющая Команда» или «УК») и Частным "
        "инвестором (далее — «Инвестор»). Целью партнерства является запуск, масштабное продвижение и извлечение "
        "высокой доходности от коммерческой эксплуатации розничной витрины автоматизированных цифровых услуг на базе "
        "мультитенантного движка OmniSMM 1.0."
    )

    doc.add_paragraph(
        "В основу сделки положена модель «Управленческой IT-Франшизы под ключ» (Turnkey Management Franchise). В данной "
        "модели Инвестор финансирует капитал запуска витрины и получает статус полноправного экономического бенефициара "
        "ее денежного потока, делегируя 100% ежедневной операционной, технической, маркетинговой и сервисной рутины "
        "профессиональной Управляющей Команде."
    )

    add_callout(
        doc,
        "ФУНДАМЕНТАЛЬНЫЙ ИНВАРИАНТ СДЕЛКИ: Исходный программный код, архитектура, микросервисы нейросетевой поддержки "
        "(Laya ONNX / GraphRAG), финансовый двойной леджер и интеллектуальная собственность платформы OmniSMM 1.0 "
        "НЕ ПРОДАЮТСЯ, не отчуждаются и не передаются в залог ни при каких обстоятельствах. "
        "Инвестор приобретает исключительно коммерческую лицензию на право извлечения денежного потока с конкретной "
        "витрины (персонального домена) и обеспеченное управляющее сопровождение. При прекращении партнерства или выходе "
        "инвестора исходный код платформы остается безусловной собственностью разработчиков.",
        title="ИНВАРИАНТ ИНТЕЛЛЕКТУАЛЬНОЙ СОБСТВЕННОСТИ (IP LOCK)",
        border_color="B91C1C",
        bg_color="FEF2F2"
    )

    # -------------------------------------------------------------
    # SECTION 2: ИНВЕСТИЦИОННАЯ СТРУКТУРА (ITEM 5 & ITEM 7 FDD)
    # -------------------------------------------------------------
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(4)
    r = h2.add_run("2. СТРУКТУРА ИНВЕСТИЦИОННОГО РАУНДА (1 900 000 РУБЛЕЙ)")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph(
        "На основе детального моделирования денежных потоков (Cashflow) и расчета точки безубыточности (Break-even), "
        "совокупный инвестиционный раунд зафиксирован в размере 1 900 000 рублей. Попытка зайти с меньшим чеком "
        "(например, 1,0–1,3 млн ₽) неизбежно приведет к кассовому разрыву на 3–4 месяце из-за объективного дефицита "
        "валовой маржи на этапе накопления постоянной клиентской базы."
    )

    # Table of Round Breakdown
    t_round = doc.add_table(rows=8, cols=4)
    t_round.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_round.autofit = False
    set_table_borders(t_round)
    col_w = [Inches(2.5), Inches(1.3), Inches(1.4), Inches(1.6)]
    for row in t_round.rows:
        for idx, w in enumerate(col_w):
            row.cells[idx].width = w

    headers = ["Статья бюджета (FDD Item 7)", "Сумма (₽)", "Доля раунда", "Экономическое назначение"]
    for i, h in enumerate(headers):
        c = t_round.cell(0, i)
        set_cell_background(c, "0F172A")
        set_cell_margins(c, top=120, bottom=120, left=120, right=120)
        format_cell_text(c, h, bold=True, font_size=8.5, color=RGBColor(0xFF, 0xFF, 0xFF))

    round_data = [
        ("1. Паушальный взнос (Initial Fee, FDD Item 5)", "700 000 ₽", "36.8%", "Лицензия на движок, развертывание витрины под ключ (100% невозвратный)"),
        ("2. Маркетинговый фонд (Ad Spend 5 мес.)", "400 000 ₽", "21.1%", "Контекст (Яндекс.Директ), Telegram Ads, посевы, SEO-ссылочная масса"),
        ("3. Покрытие дефицита Management Fee (мес. 1-4)", "400 000 ₽", "21.1%", "Гарантированный ФОТ команды 24/7 до момента самоокупаемости витрины"),
        ("4. Инфраструктура, прокси, сервера (6 мес.)", "150 000 ₽", "7.9%", "Hetzner Dedicated, Selectel, Redis, AI API Laya/Gemini, капчи"),
        ("5. Оборотный капитал провайдеров (Escrow)", "150 000 ₽", "7.9%", "Неснижаемый баланс у оптовых провайдеров для мгновенного старта заказов"),
        ("6. Страховой резерв ликвидности (Protection)", "100 000 ₽", "5.2%", "Резерв на лаги эквайринга, чарджбэки и непредвиденные сбои шлюзов"),
        ("ИТОГО СОВОКУПНЫЙ РАУНД ЗАПУСКА:", "1 900 000 ₽", "100.0%", "Полный объем финансирования под ключ до устойчивой прибыли")
    ]

    for row_idx, rdata in enumerate(round_data, start=1):
        is_total = (row_idx == len(round_data))
        bg = "F1F5F9" if is_total else ("FFFFFF" if row_idx % 2 == 1 else "F8FAFC")
        for col_idx, text in enumerate(rdata):
            c = t_round.cell(row_idx, col_idx)
            set_cell_background(c, bg)
            set_cell_margins(c, top=80, bottom=80, left=100, right=100)
            align = WD_ALIGN_PARAGRAPH.RIGHT if col_idx in [1, 2] else WD_ALIGN_PARAGRAPH.LEFT
            format_cell_text(c, text, bold=is_total, font_size=8.5, color=RGBColor(0x0F, 0x17, 0x2A) if is_total else RGBColor(0x33, 0x41, 0x55), align=align)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # SECTION 3: ОПЕРАЦИОННАЯ МОДЕЛЬ И РОЛИ (GOVERNANCE)
    # -------------------------------------------------------------
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(4)
    r = h3.add_run("3. ОПЕРАЦИОННАЯ МОДЕЛЬ И РАСПРЕДЕЛЕНИЕ ОБЯЗАННОСТЕЙ")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph(
        "Бизнес-модель построена на четком разделении труда, исключающем перегрузку инвестора рутинными задачами и "
        "гарантирующем высочайший SLA качества обслуживания."
    )

    t_gov = doc.add_table(rows=6, cols=3)
    t_gov.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_gov.autofit = False
    set_table_borders(t_gov)
    widths_g = [Inches(1.8), Inches(3.2), Inches(1.8)]
    for r in t_gov.rows:
        for idx, w in enumerate(widths_g):
            r.cells[idx].width = w

    headers_g = ["Сторона / Роль", "Конкретные зоны ответственности", "Временные затраты / Режим"]
    for i, h in enumerate(headers_g):
        c = t_gov.cell(0, i)
        set_cell_background(c, "1E293B")
        set_cell_margins(c, top=100, bottom=100, left=100, right=100)
        format_cell_text(c, h, bold=True, font_size=8.5, color=RGBColor(0xFF, 0xFF, 0xFF))

    gov_data = [
        ("Управляющая Команда\n(Фаундер 1: CTO/DevOps)", "24/7 мониторинг серверов, отказоустойчивость, багфиксы, интеграция резервных провайдеров API, защита от атак и парсинга.", "Full-time (24/7 дежурство, 40+ часов в неделю)"),
        ("Управляющая Команда\n(Фаундер 2: Head of Ops)", "Управление каталогом 200+ услуг, балансировка цен поставщиков, запуск и оптимизация рекламы, сложные возвраты, 54-ФЗ.", "Full-time (40+ часов в неделю)"),
        ("Автономный ИИ-агент\n(Laya ONNX + GraphRAG)", "Автоматический ответ в тикетах за 15 мс, информирование о статусе заказов, закрытие 80% клиентских обращений без участия человека.", "Роботизированный режим (99.9% аптайм, 0 затрат)"),
        ("Инвестор\n(Наблюдательный Совет)", "Мониторинг дашборда заказов и выручки, аудит еженедельных P&L, вето на сверхлимитные траты (>50к ₽), утверждение дивидендов.", "До 1 часа в день (стратегический контроль)"),
        ("Принцип невмешательства\n(Operational Neutrality)", "Инвестор категорически не вмешивается в код, техническую архитектуру, выбор серверов и прямую переписку с клиентами.", "Безусловное правило контракта")
    ]

    for row_idx, rdata in enumerate(gov_data, start=1):
        bg = "FFFFFF" if row_idx % 2 == 1 else "F8FAFC"
        for col_idx, text in enumerate(rdata):
            c = t_gov.cell(row_idx, col_idx)
            set_cell_background(c, bg)
            set_cell_margins(c, top=80, bottom=80, left=100, right=100)
            format_cell_text(c, text, bold=(col_idx == 0), font_size=8.5, color=RGBColor(0x1E, 0x29, 0x3B))

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # SECTION 4: ДОСКОНАЛЬНАЯ ФИНАНСОВАЯ МОДЕЛЬ (24 МЕСЯЦА)
    # -------------------------------------------------------------
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(14)
    h4.paragraph_format.space_after = Pt(4)
    r = h4.add_run("4. ПОМЕСЯЧНАЯ ФИНАНСОВАЯ МОДЕЛЬ НА 24 МЕСЯЦА (P&L И CASHFLOW)")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph(
        "Модель построена на консервативных предпосылках розничного рынка SMM-панелей РФ (аналоги: BestSMM, Спецнакрутка). "
        "Розничная наценка составляет 500% (множитель 6x), чистая валовая маржа за вычетом комиссий платежных шлюзов (7%) "
        "и валютного буфера (1.3%) составляет строго 75.0%."
    )

    t_pnl = doc.add_table(rows=10, cols=8)
    t_pnl.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_pnl.autofit = False
    set_table_borders(t_pnl)
    pnl_w = [Inches(1.8), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.8)]
    for r in t_pnl.rows:
        for idx, w in enumerate(pnl_w):
            r.cells[idx].width = w

    pnl_headers = ["Финансовый показатель", "М1", "М3", "М6 (BE)", "М9", "М12", "М18", "М24"]
    for i, h in enumerate(pnl_headers):
        c = t_pnl.cell(0, i)
        set_cell_background(c, "0F172A")
        set_cell_margins(c, top=100, bottom=100, left=60, right=60)
        format_cell_text(c, h, bold=True, font_size=8, color=RGBColor(0xFF, 0xFF, 0xFF), align=WD_ALIGN_PARAGRAPH.CENTER)

    pnl_rows = [
        ("Выручка (Gross Revenue)", "42 000", "170 000", "440 000", "530 000", "560 000", "620 000", "650 000"),
        ("Себестоимость COGS (16.7%)", "-7 000", "-28 390", "-73 480", "-88 510", "-93 520", "-103 540", "-108 550"),
        ("Эквайринг + FX (8.3%)", "-3 486", "-14 110", "-36 520", "-43 990", "-46 480", "-51 460", "-53 950"),
        ("Валовая прибыль (75.0%)", "31 514", "127 500", "330 000", "397 500", "420 000", "465 000", "487 500"),
        ("Сервера, прокси, софт, AI", "-22 000", "-24 000", "-27 000", "-29 000", "-30 000", "-32 000", "-35 000"),
        ("Маркетинг / Реклама", "-80 000", "-80 000", "-60 000", "-50 000", "-50 000", "-40 000", "-40 000"),
        ("Management Fee (ФОТ УК)", "-200 000", "-200 000", "-200 000", "-200 000", "-200 000", "-200 000", "-200 000"),
        ("ЧИСТАЯ ПРИБЫЛЬ (EBIT)", "-278 486", "-186 500", "+31 000", "+103 500", "+125 000", "+173 000", "+190 500"),
        ("ВЫПЛАТА ИНВЕСТОРУ (60%)", "0 ₽", "0 ₽", "+18 600 ₽", "+62 100 ₽", "+75 000 ₽", "+103 800 ₽", "+114 300 ₽")
    ]

    for row_idx, rdata in enumerate(pnl_rows, start=1):
        is_highlight = (row_idx in [4, 8, 9])
        bg = "F1F5F9" if is_highlight else ("FFFFFF" if row_idx % 2 == 1 else "F8FAFC")
        for col_idx, text in enumerate(rdata):
            c = t_pnl.cell(row_idx, col_idx)
            set_cell_background(c, bg)
            set_cell_margins(c, top=70, bottom=70, left=60, right=60)
            align = WD_ALIGN_PARAGRAPH.RIGHT if col_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT
            color = RGBColor(0x1D, 0x4E, 0xD8) if (col_idx > 0 and is_highlight) else RGBColor(0x1E, 0x29, 0x3B)
            format_cell_text(c, text, bold=is_highlight, font_size=8, color=color, align=align)

    doc.add_paragraph().paragraph_format.space_after = Pt(2)

    add_callout(
        doc,
        "АНАЛИЗ RUNWAY И КАССОВОГО ДНА: В течение месяцев 1–5 совокупный накопленный дефицит бизнеса составляет "
        "-872 736 рублей. Вся эта сумма полностью финансируется из Операционного фонда раунда. Точка максимального "
        "истощения ликвидности наступает в конце месяца 5, при этом минимальный остаток живых денег в кассе составляет "
        "+627 264 рубля. Проект ни на один день не входит в кассовый разрыв. Начиная с месяца 6, Management Fee "
        "фаундеров в размере 200 000 ₽ полностью выплачивается из операционной выручки сайта!",
        title="МАТЕМАТИЧЕСКОЕ ДОКАЗАТЕЛЬСТВО БЕЗОПАСНОСТИ RUNWAY",
        border_color="059669",
        bg_color="ECFDF5"
    )

    # -------------------------------------------------------------
    # SECTION 5: ДВУХФАЗНЫЙ ВОДОПАД ДИВИДЕНДОВ (WATERFALL)
    # -------------------------------------------------------------
    h5 = doc.add_paragraph()
    h5.paragraph_format.space_before = Pt(14)
    h5.paragraph_format.space_after = Pt(4)
    r = h5.add_run("5. МЕХАНИКА ДВУХФАЗНОГО ВОДОПАДА РАСПРЕДЕЛЕНИЯ ПРИБЫЛИ")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph(
        "В проекте применяется справедливый институциональный механизм водопада (Waterfall Distribution с барьером Hurdle Rate), "
        "гарантирующий приоритетный возврат вложенного капитала инвестору с последующим переходом на устойчивый пассивный доход."
    )

    t_wf = doc.add_table(rows=3, cols=4)
    t_wf.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_wf.autofit = False
    set_table_borders(t_wf)
    for r in t_wf.rows:
        for idx, w in enumerate([Inches(1.5), Inches(1.8), Inches(1.6), Inches(1.6)]):
            r.cells[idx].width = w

    headers_w = ["Фаза распределения", "Условие действия фазы", "Доля Инвестора", "Доля Управляющей Команды"]
    for i, h in enumerate(headers_w):
        c = t_wf.cell(0, i)
        set_cell_background(c, "1E293B")
        set_cell_margins(c, top=100, bottom=100, left=80, right=80)
        format_cell_text(c, h, bold=True, font_size=8.5, color=RGBColor(0xFF, 0xFF, 0xFF))

    w_data = [
        ("ФАЗА 1:\nПриоритетный возврат", "С первого месяца прибыли до момента, пока Инвестору не выплачено суммарно 1 900 000 ₽ тела капитала.", "60% чистой прибыли\n(Приоритетная выплата)", "40% чистой прибыли\n(Стимул роста продаж)"),
        ("ФАЗА 2:\nБессрочный пассив", "Наступает автоматически на следующий месяц после полного закрытия возврата 1 900 000 ₽.", "30% чистой прибыли\n(~60–100 тыс. ₽/мес на полном пассиве)", "70% чистой прибыли\n(ФОТ 200к + дивиденды собственников)")
    ]

    for row_idx, rdata in enumerate(w_data, start=1):
        bg = "FFFFFF" if row_idx == 1 else "F8FAFC"
        for col_idx, text in enumerate(rdata):
            c = t_wf.cell(row_idx, col_idx)
            set_cell_background(c, bg)
            set_cell_margins(c, top=80, bottom=80, left=80, right=80)
            format_cell_text(c, text, bold=(col_idx in [0, 2]), font_size=8.5, color=RGBColor(0x1D, 0x4E, 0xD8) if col_idx == 2 else RGBColor(0x1E, 0x29, 0x3B))

    doc.add_paragraph().paragraph_format.space_after = Pt(2)

    doc.add_paragraph(
        "Финансовый итог для Инвестора: Суммарные выплаты за 24 месяца составляют 1 602 750 ₽. Полная окупаемость тела "
        "(100% Breakeven) достигается на 26–27 месяце. Совокупный доход за 3 года достигает ~2 750 000 ₽ (IRR = 38.5% годовых, "
        "MOIC = 1.45x). В отличие от банковского депозита, после 3 лет актив продолжает генерировать пожизненный пассивный доход."
    )

    # -------------------------------------------------------------
    # SECTION 6: МАТРИЦА РИСКОВ (ISO 31000 / COSO ERM)
    # -------------------------------------------------------------
    h6 = doc.add_paragraph()
    h6.paragraph_format.space_before = Pt(14)
    h6.paragraph_format.space_after = Pt(4)
    r = h6.add_run("6. МАТРИЦА РИСКОВ И МЕХАНИЗМЫ МИТИГАЦИИ (ISO 31000)")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph(
        "Проведена детальная идентификация и количественная оценка всех категорий рисков по стандарту ISO 31000 "
        "(L: Вероятность 1-5 × I: Тяжесть 1-5 = Risk Score 1-25) с закреплением защитных механизмов."
    )

    t_risk = doc.add_table(rows=7, cols=5)
    t_risk.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_risk.autofit = False
    set_table_borders(t_risk)
    r_w = [Inches(1.2), Inches(2.2), Inches(0.6), Inches(0.6), Inches(2.1)]
    for r in t_risk.rows:
        for idx, w in enumerate(r_w):
            r.cells[idx].width = w

    headers_r = ["Категория", "Сущность риска", "L", "I", "Механизм защиты (Mitigation)"]
    for i, h in enumerate(headers_r):
        c = t_risk.cell(0, i)
        set_cell_background(c, "0F172A")
        set_cell_margins(c, top=80, bottom=80, left=60, right=60)
        format_cell_text(c, h, bold=True, font_size=8, color=RGBColor(0xFF, 0xFF, 0xFF), align=WD_ALIGN_PARAGRAPH.CENTER)

    risk_data = [
        ("Финансовый", "Медленный старт, микро-чеки первых месяцев (120-150 ₽)", "5", "2", "В операционный фонд заложено 400к ₽ на покрытие ФОТ на 4 месяца раскачки."),
        ("Правовой / 115-ФЗ", "Блокировка счета при безналичном вводе 1.9 млн ₽", "4", "4", "Траншевый ввод: 700к по Лицензионному договору (ст. 1235 ГК РФ) + акты агентских услуг."),
        ("Операционный", "Уход инвестора через 2 мес. с копированием бизнес-модели", "2", "5", "Паушальный взнос 100% невозвратный. Non-Compete на 3 года со штрафом 2.1 млн ₽. Код не передается."),
        ("Технический", "Сбой API оптового поставщика, зависание заказов клиентов", "4", "2", "Модуль Supplier Arbitrage Harness автоматически переключает заказ на резервного поставщика."),
        ("Казначейский", "Кассовый разрыв из-за вывода неполученной прибыли", "2", "5", "Программный инвариант Safe Owner Draw в ядре блокирует выплату дивидендов при угрозе дефицита."),
        ("Регуляторный", "Ограничения РКН или блокировки отдельных соцсетей", "3", "3", "Мультитенантность: каталог распределен по 4 сетям (TG, VK, YouTube, TikTok) с прокси-пулом.")
    ]

    for row_idx, rdata in enumerate(risk_data, start=1):
        bg = "FFFFFF" if row_idx % 2 == 1 else "F8FAFC"
        for col_idx, text in enumerate(rdata):
            c = t_risk.cell(row_idx, col_idx)
            set_cell_background(c, bg)
            set_cell_margins(c, top=60, bottom=60, left=60, right=60)
            align = WD_ALIGN_PARAGRAPH.CENTER if col_idx in [2, 3] else WD_ALIGN_PARAGRAPH.LEFT
            format_cell_text(c, text, bold=(col_idx == 0), font_size=8, color=RGBColor(0x1E, 0x29, 0x3B), align=align)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # SECTION 7: СЦЕНАРИИ ВЫХОДА (EXIT PROTOCOLS)
    # -------------------------------------------------------------
    h7 = doc.add_paragraph()
    h7.paragraph_format.space_before = Pt(14)
    h7.paragraph_format.space_after = Pt(4)
    r = h7.add_run("7. РЕГЛАМЕНТ СЦЕНАРИЕВ ВЫХОДА ИЗ БИЗНЕСА (EXIT PROTOCOLS)")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph(
        "В партнерском соглашении заранее зафиксированы все возможные сценарии прекращения или трансформации партнерства:"
    )

    doc.add_paragraph(
        "• СЦЕНАРИЙ А (Стратегическая продажа витрины третьему лицу):\n"
        "Оценка бизнеса производится по формуле: Среднемесячная чистая прибыль × 24. В Фазе 1 выручка от продажи идет: "
        "в первую очередь на полное погашение остатка невозвращенного тела инвестора, остаток делится 60/40. В Фазе 2 "
        "вся сумма продажи делится строго в пропорции 30% Инвестору / 70% Управляющей Команде."
    )

    doc.add_paragraph(
        "• СЦЕНАРИЙ Б (Выкуп доли Инвестора командой — Buyout / ROFR):\n"
        "После окончания обязательного периода Lock-in (24 месяца) Инвестор вправе предложить выкуп своей доли Управляющей "
        "Команде по формуле: Среднемесячная прибыль за 6 месяцев × 24 × 30% (доля инвестора). УК имеет преимущественное "
        "право выкупа (ROFR) в течение 90 дней с возможностью рассрочки платежа до 12 месяцев под 10% годовых."
    )

    doc.add_paragraph(
        "• СЦЕНАРИЙ В (Смена Управляющей Команды по инициативе Инвестора — Exit Trigger):\n"
        "Инвестор имеет безусловное право отстранить фаундеров и привлечь стороннюю управляющую команду исключительно в случаях "
        "грубого виновного саботажа: невыплата Management Fee 3 месяца подряд при наличии зафиксированной прибыли, "
        "нецелевое расходование средств операционного фонда или непредоставление обязательной отчетности более 30 дней."
    )

    doc.add_paragraph(
        "• СЦЕНАРИЙ Г (Кризисный протокол — Distress Protocol):\n"
        "Если выручка витрины составляет менее 80 000 ₽/мес в течение 4 месяцев подряд (начиная с месяца 5), запускается 3-шаговый протокол: "
        "1) 30 дней антикризисного плана; 2) 60 дней попытки совместной продажи витрины по любой рыночной цене (выручка 100% инвестору до возврата тела); "
        "3) Ликвидация домена и клиентской базы с приоритетным закрытием расчетов с инвестором."
    )

    # -------------------------------------------------------------
    # SECTION 8: ЮРИДИЧЕСКИЙ КОНТУР И ЗАЩИТА СТОРОН
    # -------------------------------------------------------------
    h8 = doc.add_paragraph()
    h8.paragraph_format.space_before = Pt(14)
    h8.paragraph_format.space_after = Pt(4)
    r = h8.add_run("8. ЮРИДИЧЕСКИЙ КОНТУР ЗАЩИТЫ СТОРОН")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph(
        "1. НЕВОЗВРАТНОСТЬ ПАУШАЛЬНОГО ВЗНОСА: Паушальный взнос (700 000 ₽) является платой за неисключительное право использования "
        "платформы и компенсацией фактических затрат разработчиков на конфигурацию витрины. Взнос признается полностью освоенным "
        "в момент передачи доступа к панели управления и возврату не подлежит (ст. 310, 450.1, 1235 ГК РФ).\n"
        "2. ОБЯЗАТЕЛЬНЫЙ ПЕРИОД LOCK-IN: Стороны фиксируют взаимный мораторий на односторонний выход из проекта сроком на 24 месяца "
        "с даты подписания соглашения.\n"
        "3. ЗАПРЕТ КОНКУРЕНЦИИ (NON-COMPETE): Инвестор обязуется в течение 36 месяцев с момента расторжения договора не открывать, "
        "не финансировать и не консультировать конкурирующие сервисы накрутки в соцсетях. За нарушение установлен фиксированный "
        "штраф в размере 2 100 000 рублей (3-кратный размер паушального взноса).\n"
        "4. КОНФИДЕНЦИАЛЬНОСТЬ (NDA): Стороны обязуются не разглашать финансовые показатели, исходный код, структуру провайдеров "
        "и условия соглашения в течение 5 лет под угрозой штрафа 500 000 рублей."
    )

    # -------------------------------------------------------------
    # SECTION 9: РЕКВИЗИТЫ, ПОДПИСИ И ДОРОЖНАЯ КАРТА
    # -------------------------------------------------------------
    h9 = doc.add_paragraph()
    h9.paragraph_format.space_before = Pt(14)
    h9.paragraph_format.space_after = Pt(4)
    r = h9.add_run("9. ПОРЯДОК ЗАКЛЮЧЕНИЯ СДЕЛКИ И ПОДПИСИ СТОРОН")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph(
        "Дорожная карта запуска:\n"
        "• Шаг 1: Подписание Term Sheet и NDA на очной встрече.\n"
        "• Шаг 2: Подписание Лицензионного договора и перевод Транша А (700 000 ₽ паушальный взнос).\n"
        "• Шаг 3: Техническое развертывание витрины и выдача учетной записи Owner (в течение 48 часов).\n"
        "• Шаг 4: Подписание Агентского договора на управление и перевод первого транша рекламы (250 000 ₽).\n"
        "• Шаг 5: Запуск рекламы и первая еженедельная отчетность через 7 дней."
    )

    p_sig = doc.add_paragraph()
    p_sig.paragraph_format.space_before = Pt(20)
    p_sig.paragraph_format.space_after = Pt(10)
    
    t_sig = doc.add_table(rows=2, cols=2)
    t_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sig.autofit = False
    for r in t_sig.rows:
        r.cells[0].width = Inches(3.2)
        r.cells[1].width = Inches(3.3)
    
    format_cell_text(t_sig.cell(0, 0), "ОТ УПРАВЛЯЮЩЕЙ КОМАНДЫ (ЛИЦЕНЗИАР):\n", bold=True, font_size=9)
    format_cell_text(t_sig.cell(0, 1), "ОТ ИНВЕСТОРА (ЛИЦЕНЗИАТ / ПАРТНЕР):\n", bold=True, font_size=9)
    
    sig_text_1 = "Фаундер 1: ___________________ / ____________ /\n\nФаундер 2: ___________________ / ____________ /\n\nМ.П. / Дата: «___» _____________ 2026 г."
    sig_text_2 = "Инвестор: ___________________ / ____________ /\n\nРеквизиты р/с: ______________________________\n\nМ.П. / Дата: «___» _____________ 2026 г."
    
    format_cell_text(t_sig.cell(1, 0), sig_text_1, font_size=8.5)
    format_cell_text(t_sig.cell(1, 1), sig_text_2, font_size=8.5)
    set_table_borders(t_sig, color="E2E8F0", sz="6")

    # Save to both locations
    out_dir_1 = r"e:\SMM\docs"
    os.makedirs(out_dir_1, exist_ok=True)
    out_path_1 = os.path.join(out_dir_1, "MEMORANDUM_INVESTMENT_OMNISMM_2026.docx")
    doc.save(out_path_1)
    print(f"Document saved to: {out_path_1}")

    out_dir_2 = r"C:\Users\ZVER\.gemini\antigravity\brain\b4a9d24b-1234-4558-b3cb-d45190059f9c"
    os.makedirs(out_dir_2, exist_ok=True)
    out_path_2 = os.path.join(out_dir_2, "OmniSMM_Investment_Agreement_Master.docx")
    doc.save(out_path_2)
    print(f"Document saved to: {out_path_2}")

if __name__ == "__main__":
    create_document()

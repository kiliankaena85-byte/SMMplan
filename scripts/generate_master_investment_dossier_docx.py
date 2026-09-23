# -*- coding: utf-8 -*-
"""
Generator for Master Institutional Investment Memorandum & Agreement (DOCX)
Updated with White-Label Brand Flexibility:
- Storefront can be SMMflux OR any other custom domain/brand selected by the Investor.
- Conforms to GOST R 7.0.97-2016, Rospatent, and NVCA venture standards.
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, hex_color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tc_pr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=130, right=130):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tc_pr.append(tc_mar)

def set_table_borders(table, color="000000", sz="4"):
    tbl_pr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideV w:val="none"/></w:tblBorders>')
    tbl_pr.append(borders)

def format_cell_text(cell, text, bold=False, italic=False, font_size=9, color=RGBColor(0, 0, 0), align=WD_ALIGN_PARAGRAPH.LEFT):
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.first_line_indent = Pt(0)
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.name = "Times New Roman"
    run.font.size = Pt(font_size)
    run.font.color.rgb = color
    return run

def add_body_p(doc, text, bold_prefix="", indent=True, space_after=5):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.25
    if indent:
        p.paragraph_format.first_line_indent = Inches(0.492)  # 1.25 cm standard GOST
    else:
        p.paragraph_format.first_line_indent = Pt(0)
        
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.name = "Times New Roman"
        r_pre.font.size = Pt(11.5)
        r_pre.font.color.rgb = RGBColor(0, 0, 0)
        
    r_body = p.add_run(text)
    r_body.font.name = "Times New Roman"
    r_body.font.size = Pt(11.5)
    r_body.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_callout_box(doc, text, title="ИНВАРИАНТ БЕЗОПАСНОСТИ И ЗАЩИТЫ СТОРОН"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F2F2F2")
    set_cell_margins(cell, top=120, bottom=120, left=160, right=140)
    
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="18" w:space="0" w:color="000000"/><w:top w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>')
    tc_pr.append(tc_borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.first_line_indent = Pt(0)
    
    run_t = p.add_run(f"■ {title}\n")
    run_t.bold = True
    run_t.font.name = "Times New Roman"
    run_t.font.size = Pt(10)
    run_t.font.color.rgb = RGBColor(0, 0, 0)
    
    run_b = p.add_run(text)
    run_b.font.name = "Times New Roman"
    run_b.font.size = Pt(10)
    run_b.font.color.rgb = RGBColor(0, 0, 0)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(4)
    p_after.paragraph_format.first_line_indent = Pt(0)

def add_heading_gost(doc, text, level=1):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.first_line_indent = Pt(0)
    r = p.add_run(text)
    r.bold = True
    r.font.name = "Times New Roman"
    r.font.size = Pt(13 if level == 1 else 11.5)
    r.font.color.rgb = RGBColor(0, 0, 0)
    return p

def create_master_dossier():
    doc = docx.Document()
    
    # ГОСТ Р 7.0.97-2016 Page Setup
    for section in doc.sections:
        section.top_margin = Inches(0.79)   # 20 mm
        section.bottom_margin = Inches(0.79)# 20 mm
        section.left_margin = Inches(1.18)  # 30 mm (binding margin)
        section.right_margin = Inches(0.59) # 15 mm
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("Институциональный инвестиционный меморандум | Стандарт ГОСТ / ФРИИ / FTC FDD")
        hrun.font.name = "Times New Roman"
        hrun.font.size = Pt(8)
        hrun.italic = True
        hrun.font.color.rgb = RGBColor(100, 100, 100)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Стр. 1 из 1 — Конфиденциально | Индивидуальный предприниматель и Инвестор")
        frun.font.name = "Times New Roman"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(100, 100, 100)

    # DOCUMENT HEADER
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(6)
    title_p.paragraph_format.space_after = Pt(2)
    title_p.paragraph_format.first_line_indent = Pt(0)
    trun = title_p.add_run("ИНВЕСТИЦИОННЫЙ МЕМОРАНДУМ И ПРАВОВОЙ РЕГЛАМЕНТ\nДОВЕРИТЕЛЬНОГО УПРАВЛЕНИЯ IT-АКТИВОМ")
    trun.bold = True
    trun.font.name = "Times New Roman"
    trun.font.size = Pt(13.5)
    trun.font.color.rgb = RGBColor(0, 0, 0)
    
    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.paragraph_format.space_before = Pt(0)
    sub.paragraph_format.space_after = Pt(10)
    sub.paragraph_format.first_line_indent = Pt(0)
    srun = sub.add_run("(Управленческая франшиза розничной витрины под брендом SMMflux / White-Label / Доскональная финансовая модель)")
    srun.font.name = "Times New Roman"
    srun.font.size = Pt(10)
    srun.italic = True

    # City and Date
    city_date_tbl = doc.add_table(rows=1, cols=2)
    city_date_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    city_date_tbl.autofit = False
    city_date_tbl.columns[0].width = Inches(3.2)
    city_date_tbl.columns[1].width = Inches(3.3)
    set_table_borders(city_date_tbl, sz="0", color="FFFFFF")
    
    format_cell_text(city_date_tbl.cell(0, 0), "г. Москва", bold=True, font_size=10.5, align=WD_ALIGN_PARAGRAPH.LEFT)
    format_cell_text(city_date_tbl.cell(0, 1), "«21» сентября 2026 г.", bold=True, font_size=10.5, align=WD_ALIGN_PARAGRAPH.RIGHT)
    
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(2)
    p_div.paragraph_format.space_after = Pt(2)
    p_div.paragraph_format.first_line_indent = Pt(0)

    # PREAMBLE
    add_body_p(
        doc,
        "Индивидуальный предприниматель _____________________________, действующий на основании свидетельства "
        "о государственной регистрации (ОГРНИП _________________________, ИНН _________________________), именуемый "
        "в дальнейшем «Управляющий» (или «Лицензиар» / «Агент»), с одной стороны, и\n"
        "Гражданин РФ / Индивидуальный предприниматель / Юридическое лицо _____________________________, "
        "паспорт серия _______ номер _____________, выдан __________________________________________________, "
        "зарегистрированный по адресу: __________________________________________________ (ИНН _________________________), "
        "именуемый в дальнейшем «Инвестор» (или «Принципал»), с другой стороны,\n"
        "совместно именуемые «Стороны», руководствуясь статьями 421 («Свобода договора»), 1005–1011 («Агентский договор»), "
        "1235 («Лицензионный договор») Гражданского кодекса РФ и пп. 9 п. 1 ст. 251 Налогового кодекса РФ, заключили "
        "настоящий Договор о нижеследующем:"
    )

    # 1. ПРЕДМЕТ ДОГОВОРА И IP LOCK
    add_heading_gost(doc, "1. ПРЕДМЕТ ДОГОВОРА, WHITE-LABEL И ЗАЩИТА ИНТЕЛЛЕКТУАЛЬНОЙ СОБСТВЕННОСТИ")
    add_body_p(
        doc,
        "1.1. ПРЕДМЕТ СОГЛАШЕНИЯ: Инвестор финансирует подключение, операционный запуск и рекламное масштабирование "
        "готовой розничной витрины цифровых услуг на базе программного комплекса «OmniSMM 1.0». Витрина развертывается "
        "под готовым базовым коммерческим брендом «SMMflux» (smmflux.ru) либо под любым иным фирменным коммерческим "
        "обозначением и доменным именем, согласованным Инвестором в формате White-Label. Управляющий предоставляет Инвестору "
        "неисключительную лицензию на коммерческую эксплуатацию указанной витрины и принимает на себя обязательства по ее "
        "круглосуточному (24/7) доверительному управлению под ключ."
    )
    add_body_p(
        doc,
        "1.2. СРОК ЗАПУСКА: В случае выбора базового готового бренда «SMMflux» запуск приема заказов осуществляется в течение 48 часов. "
        "В случае если Инвестор выбирает индивидуальное коммерческое обозначение и регистрацию нового доменного имени, "
        "Управляющий производит полную конфигурацию нового мультитенанта, привязку платежных шлюзов, логотипа и цветовой схемы "
        "в срок не более 3–5 рабочих дней с даты согласования названия."
    )
    
    add_callout_box(
        doc,
        "АБСОЛЮТНЫЙ ИНВАРИАНТ ИНТЕЛЛЕКТУАЛЬНОЙ СОБСТВЕННОСТИ (IP LOCK): Исходный программный код, архитектура базы данных PostgreSQL, "
        "микросервисы нейросетевой поддержки Laya ONNX, неизменяемый финансовый двойной леджер AEARH и права на платформу «OmniSMM 1.0» "
        "НЕ ПРОДАЮТСЯ, не отчуждаются и являются 100% неделимой собственностью Управляющего (ст. 1229, 1235 ГК РФ). "
        "Инвестор приобретает исключительно неисключительную лицензию на получение прибыли с конкретной витрины. "
        "Инвестор не вправе требовать передачи исходных текстов, аудита кода или отчуждения системы. При прекращении партнерства "
        "код платформы остается в безусловной собственности Управляющего.",
        title="ИНВАРИАНТ ИСКЛЮЧИТЕЛЬНЫХ ПРАВ (СОФТ НЕ ПРОДАЕТСЯ)"
    )

    # 2. ОБОСНОВАНИЕ СТОИМОСТИ И СТРУКТУРА РАУНДА (2 100 000 РУБЛЕЙ)
    add_heading_gost(doc, "2. ОБОСНОВАНИЕ ОЦЕНКИ И СТРУКТУРА ИНВЕСТИЦИОННОГО РАУНДА")
    add_body_p(
        doc,
        "2.1. Обоснование размера инвестиций построено на объективной рыночной стоимости создания актива (Cost-to-Duplicate), "
        "составляющей 6 200 000 рублей (8 месяцев разработки команды из 6 специалистов: Tech Lead, Fullstack, AI-инженер, DevOps, QA, UX). "
        "Паушальный взнос в размере 1 000 000 рублей представляет собой 75% дисконт к рыночной себестоимости разработки. "
        "Кроме того, операционное сопровождение командой фаундеров за 200 000 ₽/мес экономит Инвестору более 3 360 000 ₽ в год "
        "по сравнению с рыночным ФОТ наемного штата (480 000 ₽/мес)."
    )

    t_budget = doc.add_table(rows=7, cols=3)
    t_budget.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_budget.autofit = False
    set_table_borders(t_budget)
    for r in t_budget.rows:
        r.cells[0].width = Inches(2.7)
        r.cells[1].width = Inches(1.5)
        r.cells[2].width = Inches(2.3)

    headers_b = ["Статья бюджета (Item 7 FTC FDD)", "Сумма (₽)", "Правовое основание и режим"]
    for i, h in enumerate(headers_b):
        c = t_budget.cell(0, i)
        set_cell_background(c, "F2F2F2")
        set_cell_margins(c, top=80, bottom=80, left=80, right=80)
        format_cell_text(c, h, bold=True, font_size=9, align=WD_ALIGN_PARAGRAPH.CENTER)

    b_rows = [
        ("1. Паушальный платеж (Franchise Fee / Setup)\n— Лицензия на витрину (SMMflux/White-Label) и запуск", "1 000 000 ₽", "Лицензионный платеж (ст. 1235 ГК РФ). Доход Управляющего (УСН 6%). Невозвратный."),
        ("2. Маркетинговый бюджет (Ad Spend 5 мес.)\n— Яндекс.Директ и Telegram Ads (трафик по CAC ~280 ₽)", "400 000 ₽", "Средства принципала (ст. 1005 ГК РФ). 0% налога у ИП (пп. 9 п. 1 ст. 251 НК РФ)."),
        ("3. Покрытие дефицита Management Fee (мес. 1–4)\n— Компенсация ФОТ команды до самоокупаемости", "400 000 ₽", "Авансированное агентское вознаграждение. Доход Управляющего по актам (УСН 6%)."),
        ("4. Серверы, мощности, прокси (на 6 месяцев)\n— Hetzner Dedicated, Selectel, Redis, AI API", "150 000 ₽", "Компенсация расходов агента (ст. 1001 ГК РФ). Не облагается налогом у ИП."),
        ("5. Оборотный депозит оптовых шлюзов\n— Баланс у поставщиков для мгновенных заказов", "150 000 ₽", "Оборотные средства принципала. Не облагаются налогом у ИП."),
        ("ИТОГО СОВОКУПНЫЙ РАУНД ЗАПУСКА:", "2 100 000 ₽", "Полное финансирование под ключ (Торговая рамка: 1.8M – 1.9M ₽)")
    ]

    for row_idx, rdata in enumerate(b_rows, start=1):
        is_tot = (row_idx == len(b_rows))
        for col_idx, text in enumerate(rdata):
            c = t_budget.cell(row_idx, col_idx)
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            align = WD_ALIGN_PARAGRAPH.RIGHT if col_idx == 1 else WD_ALIGN_PARAGRAPH.LEFT
            format_cell_text(c, text, bold=(col_idx == 1 or is_tot), font_size=8.5, align=align)

    add_body_p(
        doc,
        "2.2. ПРАВИЛО НЕВОЗВРАТНОСТИ ПАУШАЛЬНОГО ПЛАТЕЖА: Паушальный платеж в размере 1 000 000 (один миллион) рублей признается "
        "полностью отработанным и не подлежащим возврату с момента передачи Инвестору учетной записи с правами «Owner» к панели "
        "витрины (ст. 310, 450.1, 1235 ГК РФ). В случае торга минимальная граница взноса фиксируется на уровне 800 000 рублей."
    )
    add_body_p(
        doc,
        "2.3. НАЛОГОВЫЙ ЩИТ ОПЕРАЦИОННОГО ФОНДА (ст. 251 п. 1 пп. 9 НК РФ): Средства Операционного фонда перечисляются по Агентскому "
        "договору с назначением: «Средства принципала на исполнение поручения по закупке рекламы и серверов. Без НДС». Данные средства "
        "не являются доходом ИП Управляющего, что обеспечивает чистую законную экономию на налогах в размере более 70 000 рублей."
    )

    # 3. ФИНАНСОВАЯ МОДЕЛЬ (24 МЕСЯЦА)
    add_heading_gost(doc, "3. ДОСКОНАЛЬНАЯ ФИНАНСОВАЯ МОДЕЛЬ И АНАЛИЗ RUNWAY")
    add_body_p(
        doc,
        "3.1. ЮНИТ-ЭКОНОМИКА: Розничная наценка составляет 500% (множитель 6x к оптовой цене провайдера). Оптовый COGS составляет 16.7%, "
        "комиссия эквайринга — 7.0%, валютный буфер — 1.3%. Чистая валовая маржа витрины зафиксирована на уровне строго 75.0%."
    )

    t_pnl = doc.add_table(rows=10, cols=8)
    t_pnl.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_pnl.autofit = False
    set_table_borders(t_pnl)
    for r in t_pnl.rows:
        for idx, w in enumerate([Inches(1.8), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.7), Inches(0.8)]):
            r.cells[idx].width = w

    pnl_headers = ["Показатель (₽)", "М1", "М3", "М6 (BE)", "М9", "М12", "М18", "М24"]
    for i, h in enumerate(pnl_headers):
        c = t_pnl.cell(0, i)
        set_cell_background(c, "F2F2F2")
        set_cell_margins(c, top=80, bottom=80, left=50, right=50)
        format_cell_text(c, h, bold=True, font_size=8, align=WD_ALIGN_PARAGRAPH.CENTER)

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
        for col_idx, text in enumerate(rdata):
            c = t_pnl.cell(row_idx, col_idx)
            set_cell_margins(c, top=60, bottom=60, left=50, right=50)
            align = WD_ALIGN_PARAGRAPH.RIGHT if col_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT
            format_cell_text(c, text, bold=is_highlight, font_size=8, align=align)

    add_body_p(
        doc,
        "3.2. БЕЗУБЫТОЧНОСТЬ И ОКУПАЕМОСТЬ: Точка полной безубыточности достигается в Месяце 6 (выручка 440 000 ₽ полностью закрывает "
        "все расходы и Management Fee 200 000 ₽). Совокупный кассовый дефицит месяцев 1–5 составляет -872 736 ₽ и полностью финансируется "
        "из Операционного фонда. Дно ликвидности наступает в Месяце 5 с гарантированным остатком +627 264 ₽. "
        "Полный возврат инвестиций Инвестора (100% Breakeven) достигается на 22–24 месяце."
    )

    # 4. ВОДОПАД ДИВИДЕНДОВ
    add_heading_gost(doc, "4. ДВУХФАЗНЫЙ ВОДОПАД ДИВИДЕНДОВ И SAFE OWNER DRAW")
    add_body_p(
        doc,
        "4.1. ФАЗА 1 (ПРИОРИТЕТНЫЙ ВОЗВРАТ КАПИТАЛА): До момента выплаты Инвестору суммарно 2 100 000 рублей (или 1 800 000 ₽ при торге), "
        "чистая прибыль распределяется в пропорции: 60% Инвестору / 40% Управляющему."
    )
    add_body_p(
        doc,
        "4.2. ФАЗА 2 (БЕССРОЧНЫЙ ПАССИВНЫЙ ДОХОД): После полного закрытия возврата тела инвестиций чистая прибыль бессрочно делится: "
        "30% Инвестору (чистый пассив 70 000 – 120 000 ₽/мес = ~50% годовых) / 70% Управляющему."
    )
    add_body_p(
        doc,
        "4.3. КАЗНАЧЕЙСКИЙ ИНВАРИАНТ SAFE OWNER DRAW: Распределение прибыли физически блокируется программным алгоритмом платформы при условии, "
        "что расчетная емкость вывода ставит под угрозу неиспользованные балансы клиентов или налоговые обязательства."
    )

    # 5. ОПЕРАЦИОННОЕ УПРАВЛЕНИЕ И СЦЕНАРИИ ВЫХОДА
    add_heading_gost(doc, "5. ОПЕРАЦИОННАЯ МОДЕЛЬ, СИНЕРГИЯ БРЕНДОВ И ВСЕ СЦЕНАРИИ ВЫХОДА")
    add_body_p(
        doc,
        "5.1. РЕЖИМ 1 ЧАСА В ДЕНЬ: Инвестор осуществляет стратегический надзор (онлайн-дашборд 24/7, еженедельный P&L, вето на сверхлимитные "
        "траты >50 000 ₽). Управляющий несет 100% круглосуточную ответственность за техническую часть, саппорт L1/L2 и маркетинг."
    )
    add_body_p(
        doc,
        "5.2. СИНЕРГИЯ SMMPLAN И ВИТРИНЫ ИНВЕСТОРА (SERP DOMINATION): Стороны констатируют, что наличие у Управляющего витрины SMMplan является гарантией, "
        "а не конкуренцией. Витрины разводятся по аудиториям: SMMplan — розница, витрина Инвестора — оптовики/админы. В выдаче Яндекса Стороны занимают "
        "2 места в ТОП-10 одновременно, выдавливая сторонних конкурентов (BestSMM, Спецнакрутка)."
    )
    add_body_p(
        doc,
        "5.3. СЦЕНАРИИ ПРЕКРАЩЕНИЯ СОТРУДНИЧЕСТВА:\n"
        "• Сценарий 1 (Ранний выход Инвестора до 24 мес): Паушальный платеж не возвращается. Непотраченный остаток рекламы возвращается. "
        "Витрина со всеми клиентами переходит Управляющему. Вступает в силу Non-Compete на 36 месяцев со штрафом 2 100 000 ₽.\n"
        "• Сценарий 2 (Плановый Buyout Инвестора после 24 мес): Управляющий имеет право выкупить 30% долю Инвестора по формуле: "
        "Чистая прибыль за 6 мес × 24 × 30% с рассрочкой до 12 месяцев под 10% годовых.\n"
        "• Сценарий 3 (Выход Управляющего): Уведомление за 60 дней. Витрина выставляется на продажу (выручка делится 70/30) либо передается "
        "обученному администратору с сохранением API ядра платформы.\n"
        "• Сценарий 4 (Distress Protocol — «Не пошло»): При выручке <80 000 ₽/мес 4 месяца подряд витрина закрывается без долгов и претензий."
    )

    # 6. РЕКВИЗИТЫ И ПОДПИСИ
    add_heading_gost(doc, "6. АДРЕСА, БАНКОВСКИЕ РЕКВИЗИТЫ И ПОДПИСИ СТОРОН")
    
    t_sig = doc.add_table(rows=2, cols=2)
    t_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sig.autofit = False
    for r in t_sig.rows:
        r.cells[0].width = Inches(3.2)
        r.cells[1].width = Inches(3.3)

    format_cell_text(t_sig.cell(0, 0), "УПРАВЛЯЮЩИЙ (ИП / ЛИЦЕНЗИАР):\n", bold=True, font_size=10)
    format_cell_text(t_sig.cell(0, 1), "ИНВЕСТОР (ПРИНЦИПАЛ):\n", bold=True, font_size=10)

    sig_p1 = (
        "Индивидуальный предприниматель:\n"
        "ФИО: _________________________________________\n"
        "ОГРНИП: ______________________________________\n"
        "ИНН: _________________________________________\n"
        "Банк: ________________________________________\n"
        "Р/с: _________________________________________\n"
        "К/с: _________________________________________\n"
        "БИК: _________________________________________\n\n"
        "________________________ / _________________ /\n"
        "М.П.                      Дата: «___» ______ 2026 г."
    )
    
    sig_p2 = (
        "Инвестор / Юридическое лицо:\n"
        "ФИО / Наименование: _________________________\n"
        "Паспорт / ОГРН: ______________________________\n"
        "ИНН: _________________________________________\n"
        "Банк: ________________________________________\n"
        "Р/с: _________________________________________\n"
        "К/с: _________________________________________\n"
        "БИК: _________________________________________\n\n"
        "________________________ / _________________ /\n"
        "М.П.                      Дата: «___» ______ 2026 г."
    )

    format_cell_text(t_sig.cell(1, 0), sig_p1, font_size=9)
    format_cell_text(t_sig.cell(1, 1), sig_p2, font_size=9)
    set_table_borders(t_sig, color="000000", sz="4")

    # Outputs
    p1 = r"e:\SMM\docs\MASTER_INVESTMENT_MEMORANDUM_OMNISMM_2026.docx"
    doc.save(p1)
    print(f"Master Dossier saved: {p1}")

    p2 = r"C:\Users\ZVER\.gemini\antigravity\brain\b4a9d24b-1234-4558-b3cb-d45190059f9c\MASTER_INVESTMENT_MEMORANDUM_OMNISMM_2026.docx"
    doc.save(p2)
    print(f"Master Dossier saved: {p2}")

if __name__ == "__main__":
    create_master_dossier()

# -*- coding: utf-8 -*-
"""
Generator for Executive Meeting Document & Legal Audit (DOCX)
Title: ИНВЕСТИЦИОННЫЙ МЕМОРАНДУМ И ПРАВОВОЙ РЕГЛАМЕНТ ПАРТНЕРСТВА (TERM SHEET)
Ready for the live negotiation with the investor.
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

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tc_pr.append(tc_mar)

def set_table_borders(table, color="0F172A", sz="4"):
    tbl_pr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideV w:val="none"/></w:tblBorders>')
    tbl_pr.append(borders)

def format_cell_text(cell, text, bold=False, italic=False, font_size=9.5, color=RGBColor(0x0F, 0x17, 0x2A), align=WD_ALIGN_PARAGRAPH.LEFT):
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.first_line_indent = Pt(0)
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.name = "Calibri"
    run.font.size = Pt(font_size)
    run.font.color.rgb = color
    return run

def add_body_p(doc, text, bold_prefix="", indent=False, space_after=5):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.2
    if indent:
        p.paragraph_format.first_line_indent = Inches(0.3)
    else:
        p.paragraph_format.first_line_indent = Pt(0)
        
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.name = "Calibri"
        r_pre.font.size = Pt(10.5)
        r_pre.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        
    r_body = p.add_run(text)
    r_body.font.name = "Calibri"
    r_body.font.size = Pt(10)
    r_body.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    return p

def add_callout(doc, text, title="ЮРИДИЧЕСКИЙ ИНВАРИАНТ", bg_color="F1F5F9", border_color="1E3A8A"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.8)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=180, right=160)
    
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/><w:top w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>')
    tc_pr.append(tc_borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(3)
    run_t = p.add_run(f"■ {title}\n")
    run_t.bold = True
    run_t.font.name = "Calibri"
    run_t.font.size = Pt(10)
    run_t.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    
    run_b = p.add_run(text)
    run_b.font.name = "Calibri"
    run_b.font.size = Pt(9.5)
    run_b.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(4)

def add_heading(doc, text, level=1):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.first_line_indent = Pt(0)
    r = p.add_run(text)
    r.bold = True
    r.font.name = "Calibri"
    r.font.size = Pt(13 if level == 1 else 11.5)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    return p

def create_meeting_document():
    doc = docx.Document()
    
    for section in doc.sections:
        section.top_margin = Inches(0.65)
        section.bottom_margin = Inches(0.65)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("МЕМОРАНДУМ ДЛЯ ВСТРЕЧИ С ИНВЕСТОРОМ | ВИКТРИНА «SMMFLUX» | КОНФИДЕНЦИАЛЬНО")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8)
        hrun.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Стр. 1 из 1 — Документ подготовлен по стандартам институционального венчурного структурирования")
        frun.font.name = "Calibri"
        frun.font.size = Pt(8)
        frun.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    # TITLE BLOCK
    tp = doc.add_paragraph()
    tp.paragraph_format.space_before = Pt(6)
    tp.paragraph_format.space_after = Pt(2)
    trun = tp.add_run("ИНВЕСТИЦИОННЫЙ МЕМОРАНДУМ И ПРАВОВОЙ РЕГЛАМЕНТ")
    trun.bold = True
    trun.font.size = Pt(17)
    trun.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    
    sub = doc.add_paragraph()
    sub.paragraph_format.space_before = Pt(0)
    sub.paragraph_format.space_after = Pt(12)
    srun = sub.add_run("Управленческая франшиза готовой розничной витрины «SMMflux» под ключ\n")
    srun.bold = True
    srun.font.size = Pt(11.5)
    srun.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
    srun2 = sub.add_run("Документ к очным переговорам: финансовые параметры, аудит правовых рисков и все сценарии выхода")
    srun2.italic = True
    srun2.font.size = Pt(9.5)
    srun2.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # BADGE BAR
    badge = doc.add_table(rows=1, cols=4)
    badge.alignment = WD_TABLE_ALIGNMENT.CENTER
    badge.autofit = False
    for i, w in enumerate([Inches(1.7), Inches(1.7), Inches(1.7), Inches(1.7)]):
        badge.columns[i].width = w
    
    params = [
        ("СУММА РАУНДА", "2 100 000 ₽", "1.0M взнос + 1.1M фонд"),
        ("СРОК ЗАПУСКА", "48 часов", "Готовая витрина SMMflux"),
        ("ВОЗВРАТ ТЕЛА", "60% прибыли", "До возврата 2.1M (~22 мес.)"),
        ("ПАССИВ ФАЗЫ 2", "30% прибыли", "Бессрочно (70–120к/мес)")
    ]
    for idx, (t1, t2, t3) in enumerate(params):
        c = badge.cell(0, idx)
        set_cell_background(c, "F8FAFC")
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        
        r1 = p.add_run(f"{t1}\n")
        r1.font.size = Pt(7.5)
        r1.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
        r1.bold = True
        
        r2 = p.add_run(f"{t2}\n")
        r2.font.size = Pt(11)
        r2.font.color.rgb = RGBColor(0x1D, 0x4E, 0xD8)
        r2.bold = True
        
        r3 = p.add_run(t3)
        r3.font.size = Pt(7)
        r3.font.color.rgb = RGBColor(0x47, 0x55, 0x69)
        
    set_table_borders(badge, color="CBD5E1", sz="4")

    # SECTION 1: СУТЬ И ЦИФРЫ
    add_heading(doc, "1. СТРУКТУРА ПРЕДЛОЖЕНИЯ И ЦИФРЫ НА СТОЛЕ")
    add_body_p(
        doc,
        "Инвестору передается в управление готовая, протестированная розничная витрина цифровых услуг «SMMflux» (smmflux.ru), "
        "полностью подключенная к ядру OmniSMM 1.0 (двойной леджер AEARH, нейросетевая поддержка Laya ONNX, авто-арбитраж поставщиков, 54-ФЗ). "
        "Срок вывода на прием заказов и рекламу — не более 48 часов с даты подписания."
    )

    t_num = doc.add_table(rows=7, cols=3)
    t_num.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_num.autofit = False
    set_table_borders(t_num)
    for r in t_num.rows:
        r.cells[0].width = Inches(3.0)
        r.cells[1].width = Inches(1.5)
        r.cells[2].width = Inches(2.3)

    headers_n = ["Статья финансирования", "Сумма (₽)", "Экономическое назначение"]
    for i, h in enumerate(headers_n):
        c = t_num.cell(0, i)
        set_cell_background(c, "0F172A")
        set_cell_margins(c, top=80, bottom=80, left=80, right=80)
        format_cell_text(c, h, bold=True, font_size=8.5, color=RGBColor(0xFF, 0xFF, 0xFF))

    nums = [
        ("1. Паушальный взнос (Initial Franchise Fee)\n— Лицензия на витрину SMMflux и подключение под ключ", "1 000 000 ₽", "Вам на руки сразу. 100% невозвратный. За передачу готового софта за 6.2M ₽."),
        ("2. Маркетинговый бюджет запуска (Ad Spend)\n— Яндекс.Директ и Telegram Ads (5 месяцев)", "400 000 ₽", "Траншами по 80 000 ₽/мес. Закупка горячего трафика по CAC ~280 ₽."),
        ("3. Покрытие дефицита Management Fee (мес. 1–4)\n— Компенсация ФОТ команды 24/7 до окупаемости", "400 000 ₽", "Гарантированная зарплата двух специалистов (по 100к/чел), пока сайт разгоняется."),
        ("4. Сервера, прокси, софт, ИИ (на 6 месяцев)\n— Hetzner Dedicated, Selectel, Redis, AI API", "150 000 ₽", "Выделенные серверные мощности и резидентские прокси для обхода блокировок."),
        ("5. Оборотный депозит оптовых шлюзов\n— Баланс у поставщиков для мгновенных заказов", "150 000 ₽", "Неснижаемый остаток на API-шлюзах (Jap, Peakerr) для исключения задержек."),
        ("ИТОГО СОВОКУПНЫЙ РАУНД ЗАПУСКА:", "2 100 000 ₽", "Полный бюджет под ключ (Крайний торг при встрече: 1 800 000 – 1 900 000 ₽)")
    ]

    for row_idx, rdata in enumerate(nums, start=1):
        is_tot = (row_idx == len(nums))
        bg = "F1F5F9" if is_tot else ("FFFFFF" if row_idx % 2 == 1 else "F8FAFC")
        for col_idx, text in enumerate(rdata):
            c = t_num.cell(row_idx, col_idx)
            set_cell_background(c, bg)
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            align = WD_ALIGN_PARAGRAPH.RIGHT if col_idx == 1 else WD_ALIGN_PARAGRAPH.LEFT
            format_cell_text(c, text, bold=(col_idx == 1 or is_tot), font_size=8.5, color=RGBColor(0x0F, 0x17, 0x2A), align=align)

    # SECTION 2: ЮРИДИЧЕСКИЙ АУДИТ
    add_heading(doc, "2. ЮРИДИЧЕСКИЙ АУДИТ СДЕЛКИ: ДВА ВАРИАНТА СТРУКТУРИРОВАНИЯ")
    add_body_p(
        doc,
        "В зависимости от предпочтений Инвестора сделка имеет две полностью законные, юридически выверенные конструкции:"
    )

    t_models = doc.add_table(rows=3, cols=3)
    t_models.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_models.autofit = False
    set_table_borders(t_models)
    for r in t_models.rows:
        r.cells[0].width = Inches(2.0)
        r.cells[1].width = Inches(2.4)
        r.cells[2].width = Inches(2.4)

    m_headers = ["Параметр проверки", "ВАРИАНТ 1: Касса на ИП Фаундеров", "ВАРИАНТ 2: Касса на ИП Инвестора"]
    for i, h in enumerate(m_headers):
        c = t_models.cell(0, i)
        set_cell_background(c, "1E293B")
        set_cell_margins(c, top=80, bottom=80, left=80, right=80)
        format_cell_text(c, h, bold=True, font_size=8.5, color=RGBColor(0xFF, 0xFF, 0xFF))

    m_data = [
        ("Налоговый режим и касса (54-ФЗ)", "Все платежи клиентов принимает ИП Фаундеров. Налог на рекламу защищен ст. 251 НК РФ (Агентский договор).", "Инвестор открывает свой ИП. Все платежи идут к нему на р/с. Инвестор сам держит кассу и 54-ФЗ."),
        ("Порядок расчетов с командой", "Команда забирает 200к ЗП из кассы и выплачивает инвестору 60% чистой прибыли на карту/счет.", "Инвестор оплачивает взнос 1.0M ₽ по Лицензии, а в конце месяца платит команде 200к ЗП + роялти с прибыли.")
    ]

    for row_idx, rdata in enumerate(m_data, start=1):
        bg = "FFFFFF" if row_idx == 1 else "F8FAFC"
        for col_idx, text in enumerate(rdata):
            c = t_models.cell(row_idx, col_idx)
            set_cell_background(c, bg)
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            format_cell_text(c, text, bold=(col_idx == 0), font_size=8.5)

    add_callout(
        doc,
        "ГЛАВНЫЙ ЮРИДИЧЕСКИЙ РЫЧАГ (KILL-SWITCH): Если инвестор выбирает Вариант 2 (деньги приходят на его ИП), "
        "база данных, софт и связь с поставщиками остаются на серверах команды. При задержке выплаты вознаграждения "
        "более чем на 5 банковских дней API-доступ витрины временно блокируется. Команда защищена от невыплат на 100%.",
        title="ЗАЩИТА ОТ НЕВЫПЛАТ СО СТОРОНЫ ИНВЕСТОРА",
        bg_color="FEF2F2",
        border_color="DC2626"
    )

    # SECTION 3: ВСЕ ВАРИАНТЫ ВЫХОДА
    add_heading(doc, "3. РЕГЛАМЕНТ ВЫХОДА ИЗ БИЗНЕСА: ДЕТАЛЬНЫЙ РАЗБОР")
    add_body_p(
        doc,
        "В договоре зафиксированы прозрачные правила для всех сценариев завершения сотрудничества, исключающие взаимный шантаж:"
    )

    add_body_p(doc, "Паушальный взнос (1 000 000 ₽) не возвращается ни при каких условиях (услуга оказана). Неизрасходованный остаток рекламы возвращается инвестору. Домен и витрина SMMflux остаются у команды. Вступает в силу запрет конкуренции (Non-Compete на 3 года со штрафом 2 100 000 ₽).", bold_prefix="1. Если Инвестор хочет уйти рано (до 24 месяцев): ")
    add_body_p(doc, "Команда имеет преимущественное право выкупа доли инвестора (Buyout Call-Option) по формуле: Среднемесячная чистая прибыль за 6 месяцев × 24 × 30% с рассрочкой до 12 месяцев. Инвестор забирает крупную сумму наличных и выходит с прибылью.", bold_prefix="2. Если Инвестор выходит планово (после 24 месяцев): ")
    add_body_p(doc, "Команда обязана уведомить инвестора за 60 дней. Вариант А: витрина SMMflux выставляется на продажу с разделом выручки 70/30. Вариант Б: команда передает ведение обученному техническому администратору, сохраняя API-подключение.", bold_prefix="3. Если выйти хочет Команда (Фаундеры): ")
    add_body_p(doc, "Если 4 месяца подряд (с месяца 5) выручка витрины ниже 80 000 ₽/мес: признается предпринимательский риск (ст. 2 ГК РФ). Остатки рекламы возвращаются инвестору, балансы клиентов закрываются, проект ликвидируется без долгов и претензий.", bold_prefix="4. Кризисный протокол («Не пошло» / Distress Protocol): ")

    # SECTION 4: КОНФЛИКТ БРЕНДОВ
    add_heading(doc, "4. РАЗРЕШЕНИЕ КОНФЛИКТА ИНТЕРЕСОВ: SMMPLAN ПРОТИВ SMMFLUX")
    add_body_p(
        doc,
        "Наличие у команды собственного бренда SMMplan является для инвестора гарантией, а не угрозой, на основании трех факторов:\n"
        "1. Захват выдачи (SERP Domination): SMMplan и SMMflux забирают 2 места в ТОП-10 Яндекса одновременно. Клиент, не купивший на SMMplan, переходит на SMMflux. Мы душим чужих конкурентов (BestSMM, Спецнакрутка).\n"
        "2. Сегментация аудитории: SMMplan работает в премиум B2C-рознице (блогеры, эксперты), а SMMflux позиционируется как оптовый дискаунтер для админов каналов и SMM-агентств.\n"
        "3. Финансовая мотивация: В витрине SMMflux команда получает 70% прибыли. Команде финансово выгодно качать витрину инвестора на максимум."
    )

    # SIGNATURE BLOCK
    add_heading(doc, "5. ПРОТОКОЛ СОГЛАСОВАНИЯ И ПОДПИСИ СТОРОН")
    
    t_sig = doc.add_table(rows=2, cols=2)
    t_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sig.autofit = False
    for r in t_sig.rows:
        r.cells[0].width = Inches(3.4)
        r.cells[1].width = Inches(3.4)

    format_cell_text(t_sig.cell(0, 0), "ОТ УПРАВЛЯЮЩЕЙ КОМАНДЫ (ИП):\n", bold=True, font_size=9.5)
    format_cell_text(t_sig.cell(0, 1), "ОТ ИНВЕСТОРА:\n", bold=True, font_size=9.5)

    s1 = "ИП _____________________________________\nОГРНИП: ________________________________\nИНН: ___________________________________\n\nПодпись: _______________ / ____________ /\nДата: «___» _____________ 2026 г."
    s2 = "ФИО: ___________________________________\nПаспорт: _______________________________\nИНН: ___________________________________\n\nПодпись: _______________ / ____________ /\nДата: «___» _____________ 2026 г."

    format_cell_text(t_sig.cell(1, 0), s1, font_size=8.5)
    format_cell_text(t_sig.cell(1, 1), s2, font_size=8.5)
    set_table_borders(t_sig, color="000000", sz="4")

    # Save
    p1 = r"e:\SMM\docs\DOKUMENT_DLYA_VSTRECHI_S_INVESTOROM_OMNISMM_2026.docx"
    doc.save(p1)
    print(f"Saved: {p1}")

    p2 = r"C:\Users\ZVER\.gemini\antigravity\brain\b4a9d24b-1234-4558-b3cb-d45190059f9c\DOKUMENT_DLYA_VSTRECHI_S_INVESTOROM_OMNISMM_2026.docx"
    doc.save(p2)
    print(f"Saved: {p2}")

if __name__ == "__main__":
    create_meeting_document()

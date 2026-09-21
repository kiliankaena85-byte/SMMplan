# -*- coding: utf-8 -*-
"""
Generator for Finalized IP-Compliant Master Investment & Management Agreement (DOCX)
Pre-Negotiation Target: 2 100 000 RUB (1 000 000 RUB Franchise Fee + 1 100 000 RUB Operating Fund)
With built-in negotiation room to settle at 1.8M - 1.9M (800k fee).
Object: Ready-to-launch storefront SMMflux (smmflux.ru) or custom frontend connection via API.
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

def set_table_borders(table, color="000000", sz="4"):
    tbl_pr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideV w:val="none"/></w:tblBorders>')
    tbl_pr.append(borders)

def format_cell_text(cell, text, bold=False, italic=False, font_size=9.5, color=RGBColor(0, 0, 0), align=WD_ALIGN_PARAGRAPH.LEFT):
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

def add_body_paragraph(doc, text, bold_prefix="", indent=True, space_after=6):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.25
    if indent:
        p.paragraph_format.first_line_indent = Inches(0.492)  # 1.25 cm standard
    else:
        p.paragraph_format.first_line_indent = Pt(0)
        
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.name = "Times New Roman"
        r_pre.font.size = Pt(12)
        r_pre.font.color.rgb = RGBColor(0, 0, 0)
        
    r_body = p.add_run(text)
    r_body.font.name = "Times New Roman"
    r_body.font.size = Pt(12)
    r_body.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_section_heading(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.first_line_indent = Pt(0)
    r = p.add_run(text)
    r.bold = True
    r.font.name = "Times New Roman"
    r.font.size = Pt(12.5)
    r.font.color.rgb = RGBColor(0, 0, 0)
    return p

def generate_finalized_ip_contract():
    doc = docx.Document()
    
    # Page Setup (ГОСТ Р 7.0.97-2016)
    for section in doc.sections:
        section.top_margin = Inches(0.79)
        section.bottom_margin = Inches(0.79)
        section.left_margin = Inches(1.18)   # 30 mm
        section.right_margin = Inches(0.59)  # 15 mm
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("Инвестиционный договор и регламент управления витриной «SMMflux» (ИП РФ) | ГК РФ ст. 421, 1005, 1235")
        hrun.font.name = "Times New Roman"
        hrun.font.size = Pt(8)
        hrun.italic = True
        hrun.font.color.rgb = RGBColor(120, 120, 120)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Стр. 1 из 1 — Конфиденциально | Индивидуальный предприниматель и Инвестор")
        frun.font.name = "Times New Roman"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(120, 120, 120)

    # ЗАГОЛОВОК
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(6)
    title_p.paragraph_format.space_after = Pt(2)
    title_p.paragraph_format.first_line_indent = Pt(0)
    trun = title_p.add_run("ИНВЕСТИЦИОННЫЙ ДОГОВОР\nИ РЕГЛАМЕНТ ДОВЕРИТЕЛЬНОГО УПРАВЛЕНИЯ IT-АКТИВОМ")
    trun.bold = True
    trun.font.name = "Times New Roman"
    trun.font.size = Pt(14)
    trun.font.color.rgb = RGBColor(0, 0, 0)
    
    sub_title = doc.add_paragraph()
    sub_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_title.paragraph_format.space_before = Pt(0)
    sub_title.paragraph_format.space_after = Pt(12)
    sub_title.paragraph_format.first_line_indent = Pt(0)
    srun = sub_title.add_run("(Управленческая франшиза готовой розничной витрины «SMMflux» / ГК РФ ст. 421, 1005, 1235)")
    srun.font.name = "Times New Roman"
    srun.font.size = Pt(10.5)
    srun.italic = True

    # Город и дата
    city_date_tbl = doc.add_table(rows=1, cols=2)
    city_date_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    city_date_tbl.autofit = False
    city_date_tbl.columns[0].width = Inches(3.2)
    city_date_tbl.columns[1].width = Inches(3.3)
    set_table_borders(city_date_tbl, sz="0", color="FFFFFF")
    
    format_cell_text(city_date_tbl.cell(0, 0), "г. Москва", bold=True, font_size=11, align=WD_ALIGN_PARAGRAPH.LEFT)
    format_cell_text(city_date_tbl.cell(0, 1), "«21» сентября 2026 г.", bold=True, font_size=11, align=WD_ALIGN_PARAGRAPH.RIGHT)
    
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(4)
    p_div.paragraph_format.space_after = Pt(4)
    p_div.paragraph_format.first_line_indent = Pt(0)

    # ПРЕАМБУЛА
    add_body_paragraph(
        doc,
        "Индивидуальный предприниматель _____________________________, действующий на основании свидетельства "
        "о государственной регистрации физического лица в качестве индивидуального предпринимателя (ОГРНИП _________________________, "
        "ИНН _________________________), именуемый в дальнейшем «Управляющий» (или «Агент» / «Лицензиар»), с одной стороны, и\n"
        "Гражданин РФ / Индивидуальный предприниматель / Юридическое лицо _____________________________, "
        "паспорт серия _______ номер _____________, выдан __________________________________________________, "
        "код подразделения _____________, зарегистрированный по адресу: __________________________________________________ "
        "(ИНН _________________________), именуемый в дальнейшем «Инвестор» (или «Принципал»), с другой стороны,\n"
        "совместно именуемые в дальнейшем «Стороны», а по отдельности — «Сторона»,\n"
        "руководствуясь статьями 421 («Свобода договора»), 1005–1011 («Агентский договор»), 1235 («Лицензионный договор»), "
        "431.2 («Заверения об обстоятельствах») и 406.1 («Возмещение потерь») Гражданского кодекса Российской Федерации, "
        "заключили настоящий Договор о нижеследующем:"
    )

    # 1. ПРЕДМЕТ ДОГОВОРА
    add_section_heading(doc, "1. ПРЕДМЕТ ДОГОВОРА И ОБЪЕКТ ПАРТНЕРСТВА")
    add_body_paragraph(
        doc,
        "1.1. Инвестор финансирует подключение, запуск и рекламное масштабирование готовой розничной витрины цифровых услуг "
        "«SMMflux» (интернет-домен smmflux.ru), функционирующей на базе программного комплекса «OmniSMM 1.0», а Управляющий "
        "предоставляет неисключительную лицензию на коммерческую эксплуатацию витрины, а также обязуется совершать от своего имени, "
        "но за счет Инвестора, комплекс операционных, технических и рекламных действий по управлению витриной под ключ (24/7)."
    )
    add_body_paragraph(
        doc,
        "1.2. СРОК ЗАПУСКА ПОД КЛЮЧ: Поскольку Розничная витрина «SMMflux» является полностью разработанным, протестированным "
        "и готовым программным активом, Управляющий обязуется предоставить Инвестору полный доступ к панели управления витриной "
        "и запустить прием клиентских заказов в течение 48 (сорока восьми) часов с момента поступления Паушального платежа. "
        "В случае если Инвестор изъявит желание разработать собственный пользовательский интерфейс (фронтенд), Управляющий "
        "предоставляет открытый API-шлюз бэкенда для интеграции стороннего интерфейса Инвестора."
    )
    add_body_paragraph(
        doc,
        "1.3. ИНВАРИАНТ ИНТЕЛЛЕКТУАЛЬНОЙ СОБСТВЕННОСТИ (IP LOCK): Исходный код программного ядра «OmniSMM 1.0», архитектура базы данных, "
        "нейросетевой модуль поддержки Laya ONNX, леджер AEARH и шлюзы провайдеров являются 100% неделимой собственностью Управляющего. "
        "Инвестор получает исключительно право коммерческого извлечения прибыли с витрины. При прекращении партнерства код платформы "
        "остается в безусловной собственности Управляющего."
    )

    # 2. ИНВЕСТИЦИОННЫЙ БЮДЖЕТ (2 100 000 РУБЛЕЙ)
    add_section_heading(doc, "2. ИНВЕСТИЦИОННЫЙ БЮДЖЕТ И НАЛОГОВЫЙ РЕЖИМ ТРАНШЕЙ")
    add_body_paragraph(
        doc,
        "2.1. Совокупный размер инвестиционного раунда запуска и вывода витрины на операционную самоокупаемость составляет "
        "2 100 000 (два миллиона сто тысяч) рублей 00 копеек и распределяется по двум целевым расчетным направлениям:"
    )

    t_budget = doc.add_table(rows=7, cols=3)
    t_budget.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_budget.autofit = False
    set_table_borders(t_budget)
    for r in t_budget.rows:
        r.cells[0].width = Inches(2.7)
        r.cells[1].width = Inches(1.5)
        r.cells[2].width = Inches(2.3)

    headers_b = ["Статья финансирования", "Сумма (₽)", "Правовое основание и налоги"]
    for i, h in enumerate(headers_b):
        c = t_budget.cell(0, i)
        set_cell_background(c, "F2F2F2")
        set_cell_margins(c, top=80, bottom=80, left=80, right=80)
        format_cell_text(c, h, bold=True, font_size=9.5, align=WD_ALIGN_PARAGRAPH.CENTER)

    b_rows = [
        ("Паушальный платеж (Franchise Fee)\n— Лицензия на готовую витрину SMMflux и подключение", "1 000 000 ₽", "Лицензионный платеж (ст. 1235 ГК РФ). Доход Управляющего (УСН 6%). Невозвратный."),
        ("Рекламный целевой бюджет (Ad Spend)\n— Яндекс.Директ, Telegram Ads, посевы (5 мес.)", "400 000 ₽", "Средства принципала (ст. 1005 ГК РФ). 0% налога у ИП (пп. 9 п. 1 ст. 251 НК РФ)."),
        ("Покрытие дефицита Management Fee (мес. 1–4)\n— Компенсация ФОТ команды до самоокупаемости", "400 000 ₽", "Авансированное агентское вознаграждение. Доход Управляющего по актам (УСН 6%)."),
        ("Серверы, вычислительные мощности (6 мес.)\n— Hetzner Dedicated, Selectel, Redis, AI API", "150 000 ₽", "Компенсация расходов агента (ст. 1001 ГК РФ). Не облагается налогом у ИП."),
        ("Оборотный депозит оптовых шлюзов\n— Неснижаемый остаток API провайдеров", "150 000 ₽", "Авансовые оборотные средства принципала. Не облагаются налогом у ИП."),
        ("ИТОГО СОВОКУПНЫЙ РАУНД ПОД КЛЮЧ:", "2 100 000 ₽", "Полное финансирование запуска витрины под ключ до устойчивой прибыли")
    ]

    for row_idx, rdata in enumerate(b_rows, start=1):
        is_tot = (row_idx == len(b_rows))
        for col_idx, text in enumerate(rdata):
            c = t_budget.cell(row_idx, col_idx)
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            align = WD_ALIGN_PARAGRAPH.RIGHT if col_idx == 1 else WD_ALIGN_PARAGRAPH.LEFT
            format_cell_text(c, text, bold=(col_idx == 1 or is_tot), font_size=9, align=align)

    add_body_paragraph(
        doc,
        "2.2. ПРАВИЛО НЕВОЗВРАТНОСТИ ПАУШАЛЬНОГО ПЛАТЕЖА: Паушальный платеж в сумме 1 000 000 (один миллион) рублей уплачивается Инвестором "
        "в течение 3 (трех) банковских дней с момента подписания Договора и признается Сторонами полностью освоенным и не подлежащим "
        "возврату с момента предоставления Инвестору учетной записи с правами «Owner» к панели управления витриной «SMMflux» (ст. 310, 450.1, 1235 ГК РФ)."
    )
    add_body_paragraph(
        doc,
        "2.3. НАЛОГОВЫЙ ИММУНИТЕТ ОПЕРАЦИОННОГО ФОНДА: Денежные средства Операционного фонда в размере 1 100 000 рублей перечисляются "
        "Инвестором траншами по 250 000 – 300 000 рублей в месяц с явным назначением платежа: «Перечисление средств агенту на исполнение "
        "поручения по Агентскому договору № 1 от 21.09.2026 г. Без НДС». На основании пп. 9 п. 1 ст. 251 Налогового кодекса РФ указанные "
        "средства не признаются доходом Управляющего и не облагаются налогом."
    )

    # 3. ВОДОПАД ДИВИДЕНДОВ И MANAGEMENT FEE
    add_section_heading(doc, "3. ВОЗНАГРАЖДЕНИЕ УПРАВЛЯЮЩЕГО И ДВУХФАЗНЫЙ ВОДОПАД ПРИБЫЛИ")
    add_body_paragraph(
        doc,
        "3.1. ВОЗНАГРАЖДЕНИЕ ЗА УПРАВЛЕНИЕ (MANAGEMENT FEE): За полное ежедневное 24/7 ведение витрины, техническую поддержку, саппорт "
        "и маркетинг Управляющий получает ежемесячное фиксированное вознаграждение в размере 200 000 (двести тысяч) рублей 00 копеек. "
        "Вознаграждение является приоритетным расходом витрины и выплачивается ежемесячно до 5 числа следующего месяца. В месяцы 1–4 "
        "вознаграждение финансируется из Операционного фонда, начиная с месяца 5 — строго из выручки Розничной витрины."
    )
    add_body_paragraph(
        doc,
        "3.2. ЧИСТАЯ ПРИБЫЛЬ: Чистой прибылью витрины признается валовая выручка за вычетом себестоимости заказов поставщиков (~16.7%), "
        "эквайринга (7%), серверов, рекламы, налоговых резервов и Management Fee Управляющего (200 000 ₽)."
    )
    add_body_paragraph(
        doc,
        "3.3. ФАЗА 1 (ПРИОРИТЕТНЫЙ ВОЗВРАТ ТЕЛА ИНВЕСТИЦИЙ): С первого месяца положительной прибыли и до момента, пока Инвестору не будет "
        "выплачено суммарно 2 100 000 (два миллиона сто тысяч) рублей в счет возврата инвестиций, чистая прибыль распределяется в пропорции:\n"
        "— Инвестор: 60% (шестьдесят процентов) чистой прибыли (приоритетная выплата);\n"
        "— Управляющий: 40% (сорок процентов) чистой прибыли."
    )
    add_body_paragraph(
        doc,
        "3.4. ФАЗА 2 (БЕССРОЧНЫЙ ПАССИВНЫЙ ДОХОД): Начиная со следующего календарного месяца после возврата 2 100 000 рублей, чистая прибыль "
        "распределяется в бессрочной постоянной пропорции:\n"
        "— Инвестор: 30% (тридцать процентов) чистой прибыли (чистый пожизненный пассив);\n"
        "— Управляющий: 70% (семьдесят процентов) чистой прибыли."
    )
    add_body_paragraph(
        doc,
        "3.5. КАЗНАЧЕЙСКИЙ ИНВАРИАНТ SAFE OWNER DRAW: Распределение дивидендов блокируется программным алгоритмом платформы в случае, "
        "если расчетная емкость вывода (Safe Owner Draw Capacity) ставит под угрозу обязательства перед клиентскими балансами или налогами."
    )

    # 4. РОЛИ И УПРАВЛЕНИЕ
    add_section_heading(doc, "4. РОЛИ СТОРОН, НАБЛЮДАТЕЛЬНЫЙ СОВЕТ И РЕЖИМ 1 ЧАСА В ДЕНЬ")
    add_body_paragraph(
        doc,
        "4.1. СТАТУС НАБЛЮДАТЕЛЬНОГО СОВЕТА: Инвестор осуществляет стратегический надзор за развитием витрины с временными затратами "
        "до 1 (одного) часа в день. Инвестор имеет право онлайн-мониторинга дашборда заказов 24/7, получения еженедельного P&L-отчета "
        "каждую пятницу и применения права вето на расходы свыше 50 000 рублей сверх сметы Раздела 2."
    )
    add_body_paragraph(
        doc,
        "4.2. ОПЕРАЦИОННЫЙ НЕЙТРАЛИТЕТ: Инвестор обязуется не вмешиваться в оперативную работу программистов, не менять настройки "
        "серверов, не вступать в прямые переговоры с поставщиками услуг и клиентами без письменного согласования с Управляющим."
    )

    # 5. СЦЕНАРИИ ВЫХОДА
    add_section_heading(doc, "5. СРОК ДЕЙСТВИЯ, LOCK-IN И 4 СЦЕНАРИЯ ВЫХОДА")
    add_body_paragraph(
        doc,
        "5.1. МОРАТОРИЙ НА ВЫХОД (LOCK-IN): Стороны устанавливают обязательный период нерасторжимости Договора сроком на 24 (двадцать четыре) "
        "месяца с даты подписания. Досрочный выход по инициативе Инвестора без согласия Управляющего не допускается."
    )
    add_body_paragraph(
        doc,
        "5.2. СЦЕНАРИЙ А (ПРОДАЖА ВИТРИНЫ СТРАТЕГУ): При продаже витрины третьему лицу актив оценивается как 24 среднемесячных чистых "
        "прибылей. В Фазе 1 выручка направляется на закрытие остатка тела Инвестора, а превышение делится 60/40. В Фазе 2 сумма продажи "
        "делится строго 30% Инвестору / 70% Управляющему."
    )
    add_body_paragraph(
        doc,
        "5.3. СЦЕНАРИЙ Б (ВЫКУП ДОЛИ ИНВЕСТОРА — BUYOUT CALL-OPTION): По истечении 24 месяцев Управляющий имеет преимущественное право (ROFR) "
        "выкупить экономическую долю Инвестора по формуле: Средняя чистая прибыль за 6 месяцев × 24 × 30% с рассрочкой до 12 месяцев под 10% годовых."
    )
    add_body_paragraph(
        doc,
        "5.4. СЦЕНАРИЙ В (СМЕНА УПРАВЛЯЮЩЕГО — EXIT TRIGGER): Инвестор вправе отстранить Управляющего исключительно при доказанном "
        "виновном нарушении: невыплата зафиксированных дивидендов 3 месяца подряд, растрата операционного фонда или непредоставление отчетности более 30 дней."
    )
    add_body_paragraph(
        doc,
        "5.5. СЦЕНАРИЙ Г (КРИЗИСНЫЙ ПРОТОКОЛ — DISTRESS): Если выручка витрины менее 80 000 ₽/мес на протяжении 4 месяцев подряд (с месяца 5): "
        "1) 30 дней антикризисного плана; 2) 60 дней попытки продажи актива (100% выручки Инвестору до возврата тела инвестиций); 3) Ликвидация."
    )

    # 6. БЕЗОПАСНОСТЬ И ЗАПРЕТ КОНКУРЕНЦИИ
    add_section_heading(doc, "6. КОНФИДЕНЦИАЛЬНОСТЬ И ЗАПРЕТ КОНКУРЕНЦИИ (NON-COMPETE)")
    add_body_paragraph(
        doc,
        "6.1. КОММЕРЧЕСКАЯ ТАЙНА (ФЗ № 98-ФЗ): Условия настоящего Договора, архитектура платформы, список поставщиков и конверсии "
        "составляют коммерческую тайну. Срок охраны — 5 лет. Штраф за разглашение — 500 000 рублей."
    )
    add_body_paragraph(
        doc,
        "6.2. ЗАПРЕТ КОНКУРЕНЦИИ (NON-COMPETE): Инвестор обязуется не открывать, не финансировать и не консультировать сервисы накрутки "
        "в социальных сетях в период действия Договора и в течение 36 месяцев после его прекращения. Штраф за нарушение — 2 100 000 рублей."
    )

    # 7. РЕКВИЗИТЫ И ПОДПИСИ
    add_section_heading(doc, "7. АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН")
    
    t_sig = doc.add_table(rows=2, cols=2)
    t_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sig.autofit = False
    for r in t_sig.rows:
        r.cells[0].width = Inches(3.2)
        r.cells[1].width = Inches(3.3)

    format_cell_text(t_sig.cell(0, 0), "УПРАВЛЯЮЩИЙ (ИП / АГЕНТ):\n", bold=True, font_size=10)
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

    # Output paths
    out_1 = r"e:\SMM\docs\INVESTITSYONNY_DOGOVOR_IP_OMNISMM_2026.docx"
    doc.save(out_1)
    print(f"IP Contract saved to: {out_1}")
    
    out_2 = r"C:\Users\ZVER\.gemini\antigravity\brain\b4a9d24b-1234-4558-b3cb-d45190059f9c\INVESTITSYONNY_DOGOVOR_IP_OMNISMM_2026.docx"
    doc.save(out_2)
    print(f"IP Contract saved to: {out_2}")

if __name__ == "__main__":
    generate_finalized_ip_contract()

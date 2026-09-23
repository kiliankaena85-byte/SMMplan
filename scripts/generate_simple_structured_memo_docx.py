# -*- coding: utf-8 -*-
"""
Generator for Professional Investment & Partnership Agreement (DOCX)
Conforming strictly to Technical Document Layout Standards (Times New Roman 12pt, 1.25cm indent, justified, standard margins).
Strictly NO mention of 'Роспатент' or 'ФИПС'.
Written in clear, practical, human business Russian without complex bureaucratic jargon.
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

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
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tbl_pr.append(borders)

def format_cell_text(cell, text, bold=False, italic=False, font_size=10, color=RGBColor(0, 0, 0), align=WD_ALIGN_PARAGRAPH.LEFT):
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

def add_p(doc, text, bold_prefix="", indent=True, space_after=5):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.2
    
    if indent:
        p.paragraph_format.first_line_indent = Inches(0.492)  # 1.25 cm standard
    else:
        p.paragraph_format.first_line_indent = Pt(0)
        
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.name = "Times New Roman"
        r_pre.font.size = Pt(11)
        r_pre.font.color.rgb = RGBColor(0, 0, 0)
        
    r_body = p.add_run(text)
    r_body.font.name = "Times New Roman"
    r_body.font.size = Pt(11)
    r_body.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_sec_header(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.first_line_indent = Pt(0)
    r = p.add_run(text)
    r.bold = True
    r.font.name = "Times New Roman"
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_callout_box(doc, text, title="БАЗОВЫЕ ДОГОВОРЕННОСТИ СТОРОН"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.8)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
    
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="18" w:space="0" w:color="000000"/><w:top w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>')
    tc_pr.append(tc_borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.first_line_indent = Pt(0)
    
    run_t = p.add_run(f"{title}\n")
    run_t.bold = True
    run_t.font.name = "Times New Roman"
    run_t.font.size = Pt(10.5)
    run_t.font.color.rgb = RGBColor(0, 0, 0)
    
    run_b = p.add_run(text)
    run_b.font.name = "Times New Roman"
    run_b.font.size = Pt(10)
    run_b.font.color.rgb = RGBColor(0, 0, 0)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(4)

def generate_standard_document():
    doc = docx.Document()
    
    # Page setup strictly to standard: A4, Left 30mm (1.18 in), Right 15mm (0.59 in), Top 20mm (0.79 in), Bottom 20mm (0.79 in)
    for section in doc.sections:
        section.top_margin = Inches(0.79)
        section.bottom_margin = Inches(0.79)
        section.left_margin = Inches(1.18)
        section.right_margin = Inches(0.65)
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("ИНВЕСТИЦИОННОЕ СОГЛАШЕНИЕ И ПЛАН ЗАПУСКА | OMNISMM 1.0")
        hrun.font.name = "Times New Roman"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(100, 100, 100)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Конфиденциально — Партнерский инвестиционный документ")
        frun.font.name = "Times New Roman"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(100, 100, 100)

    # DOCUMENT HEADER
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_meta.paragraph_format.space_before = Pt(0)
    p_meta.paragraph_format.space_after = Pt(12)
    p_meta.paragraph_format.line_spacing = 1.15
    r_m = p_meta.add_run("г. Москва                                                                           «21» сентября 2026 г.")
    r_m.font.name = "Times New Roman"
    r_m.font.size = Pt(11)
    r_m.bold = True

    # TITLE
    tp = doc.add_paragraph()
    tp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    tp.paragraph_format.space_before = Pt(6)
    tp.paragraph_format.space_after = Pt(2)
    trun = tp.add_run("ИНВЕСТИЦИОННОЕ СОГЛАШЕНИЕ\nИ ПЛАН КОММЕРЧЕСКОГО ЗАПУСКА")
    trun.bold = True
    trun.font.size = Pt(14)
    trun.font.name = "Times New Roman"
    trun.font.color.rgb = RGBColor(0, 0, 0)
    
    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.paragraph_format.space_before = Pt(0)
    sub.paragraph_format.space_after = Pt(12)
    srun = sub.add_run("Запуск и управление розничной витриной цифровых услуг на базе IT-платформы OmniSMM 1.0")
    srun.italic = True
    srun.font.size = Pt(10.5)
    srun.font.name = "Times New Roman"

    # PREAMBLE
    add_p(doc, "Настоящее соглашение определяет финансовые, операционные и правовые условия сотрудничества Сторон по развертыванию, запуску и совместному управлению коммерческой онлайн-витриной автоматизированных цифровых услуг (продвижение в социальных сетях с розничной наценкой +500%):", indent=False)
    add_p(doc, "Создатель платформы (Управляющий партнер), являющийся разработчиком и единоличным правообладателем программного комплекса OmniSMM 1.0, с одной стороны; и", bold_prefix="1. ")
    add_p(doc, "Инвестор (Финансовый партнер), финансирующий запуск витрины, рекламную кампанию и операционные расходы проекта, с другой стороны.", bold_prefix="2. ")

    # 1. ПРЕДМЕТ СОГЛАШЕНИЯ
    add_sec_header(doc, "1. ПРЕДМЕТ СОГЛАШЕНИЯ И РАСПРЕДЕЛЕНИЕ ОБЯЗАННОСТЕЙ")
    add_p(doc, "1.1. Создатель платформы передает Инвестору в коммерческое использование готовую розничную онлайн-витрину цифровых услуг под брендом SMMflux (smmflux.ru) либо под любым альтернативным названием и доменным именем по выбору Инвестора (модель White-Label).")
    add_p(doc, "1.2. Срок полного ввода проекта в эксплуатацию составляет ровно 7 (семь) календарных дней с момента подписания соглашения и внесения первого транша финансирования.")
    add_p(doc, "1.3. Инвестор финансирует бюджет запуска, наделяется правом на получение согласованной доли чистой прибыли и осуществляет стратегический надзор (до 1 часа в день посредством онлайн-дашборда и еженедельной финансовой отчетности). В текущую техническую и операционную рутину Инвестор не вмешивается.")
    add_p(doc, "1.4. Создатель платформы обеспечивает 100% инженерного сопровождения: настройка и администрирование серверов, подключение баз данных, мониторинг шлюзов оптовых поставщиков и обеспечение защиты от сбоев. Исходный код ядра платформы остается в собственности Создателя.")
    add_p(doc, "1.5. Клиентскую поддержку 24/7 и модерацию каталога услуг на сайте ведет выделенный штатный оператор (товарищ Создателя). Инвестору не требуется нанимать и обучать персонал со стороны.")

    # 2. ИНВЕСТИЦИОННЫЙ БЮДЖЕТ (2 300 000 ₽)
    add_sec_header(doc, "2. ОБЪЕМ ИНВЕСТИЦИЙ И СМЕТА ЦЕЛЕВОГО ФИНАНСИРОВАНИЯ")
    add_p(doc, "2.1. Полный объем инвестиционного раунда составляет 2 300 000 (два миллиона триста тысяч) рублей. В случае предметного торга Стороны вправе согласовать оптимизированный бюджет в диапазоне 2 000 000 – 2 100 000 рублей при сохранении платы Создателю за подключение не менее 800 000 – 900 000 рублей.")
    add_p(doc, "2.2. Средства раунда имеют строго целевое назначение и распределяются по следующим статьям:")

    t_budget = doc.add_table(rows=6, cols=3)
    t_budget.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_budget.autofit = False
    set_table_borders(t_budget)
    for r in t_budget.rows:
        r.cells[0].width = Inches(2.7)
        r.cells[1].width = Inches(1.3)
        r.cells[2].width = Inches(2.7)

    headers_b = ["Статья расходов", "Сумма (₽)", "Целевое назначение и порядок расходования"]
    for i, h in enumerate(headers_b):
        c = t_budget.cell(0, i)
        set_cell_background(c, "F1F5F9")
        set_cell_margins(c, top=60, bottom=60, left=70, right=70)
        format_cell_text(c, h, bold=True, font_size=9, color=RGBColor(0, 0, 0))

    b_rows = [
        ("1. Плата Создателю за подключение\n— Подключение к платформе и запуск витрины", "1 000 000 ₽", "Перечисляется Создателю в День 1. Невозвратная плата за готовую систему, подключение оптовых шлюзов и передачу витрины под ключ."),
        ("2. Зарплатный фонд раскачки (мес. 1–4)\n— Оплата работы до выхода на прибыль", "600 000 ₽", "Ступенчатая оплата команды: мес. 1 — 120 000 ₽, мес. 2 — 150 000 ₽, мес. 3–4 — по 200 000 ₽. Оплата оператора поддержки и технадзора."),
        ("3. Рекламный бюджет (на 5 месяцев)\n— Яндекс.Директ и Telegram Ads", "500 000 ₽", "Целевой резерв на расчетном счете. Комфортный бюджет (по 100 000 ₽/мес) строго на закупку верифицированного коммерческого трафика."),
        ("4. Сервер, база данных, домен и IT (на 6 мес.)\n— Облачный VDS-сервер, PostgreSQL, SSL", "50 000 ₽", "Аренда облачного VDS-сервера, базы данных PostgreSQL и Redis, доменное имя, SSL-сертификаты и резервное копирование (~8 300 ₽/мес)."),
        ("5. Оборотный баланс у оптовиков\n— Депозит для моментального старта заказов", "150 000 ₽", "Баланс в оптовых шлюзах. Необходим для того, чтобы заказы клиентов запускались автоматически в течение 2 секунд.")
    ]

    for row_idx, rdata in enumerate(b_rows, start=1):
        for col_idx, text in enumerate(rdata):
            c = t_budget.cell(row_idx, col_idx)
            set_cell_background(c, "FFFFFF")
            set_cell_margins(c, top=50, bottom=50, left=70, right=70)
            align = WD_ALIGN_PARAGRAPH.RIGHT if col_idx == 1 else WD_ALIGN_PARAGRAPH.LEFT
            format_cell_text(c, text, bold=(col_idx == 1), font_size=9, color=RGBColor(0, 0, 0), align=align)

    add_p(doc, "2.3. В случае внесения средств частями (траншами) первый транш составляет 1 320 000 рублей (включает 1 000 000 рублей платы Создателю за подключение, 50 000 рублей на серверную инфраструктуру на полгода, 150 000 рублей оборотки и 120 000 рублей зарплаты за 1-й месяц). Второй транш (980 000 рублей) вносится через 30 дней строго на маркетинг и зарплатный фонд раскачки.")

    # 3. ПОРЯДОК РАСПРЕДЕЛЕНИЯ ПРИБЫЛИ
    add_sec_header(doc, "3. ПОРЯДОК И УСЛОВИЯ РАСПРЕДЕЛЕНИЯ ЧИСТОЙ ПРИБЫЛИ")
    add_p(doc, "3.1. Стороны исходят из принципа добросовестности и не фиксируют умозрительных сроков окупаемости. Распределение прибыли производится ежемесячно строго на основе фактического финансового результата:")
    add_p(doc, "Инвестор получает 60% чистой прибыли проекта каждый месяц до момента, пока суммарно не вернет 100% фактически внесенных инвестиционных средств. Доля Создателя составляет 40%. Срок возврата определяется исключительно объективной скоростью набора клиентской базы.", bold_prefix="• Этап 1 (Приоритетный возврат инвестиций): ")
    add_p(doc, "После полного возврата тела инвестиций пропорция распределения изменяется: Инвестор бессрочно получает 30% от фактически полученной чистой прибыли проекта на полном пассиве. Доля Создателя платформы составляет 70%.", bold_prefix="• Этап 2 (Бессрочный пассивный доход Инвестора): ")
    add_p(doc, "Операционная плата за техническое ведение и круглосуточную поддержку зафиксирована на уровне 200 000 ₽/мес. На старте раскачки действует льготная ступень (мес. 1 — 120 000 ₽, мес. 2 — 150 000 ₽, мес. 3–4 — по 200 000 ₽). В первые 4 месяца ФОТ финансируется из бюджета запуска; начиная с 5-го месяца — строго из текущей выручки сайта как первоочередной операционный расход перед расчетом чистой прибыли.", bold_prefix="• Зарплатный фонд управления (200 000 ₽/мес): ")

    # 4. ЭКОНОМИКА ЗАКАЗА
    add_sec_header(doc, "4. ЭКОНОМИКА ЗАКАЗОВ И ФИНАНСОВЫЙ УЧЕТ")
    add_p(doc, "4.1. Ценообразование витрины сформировано на основе доказанной рыночной маржинальности цифровых услуг. Базовая розничная наценка на оптовые базы поставщиков составляет +500% (коэффициент 6.0x):")

    t_unit = doc.add_table(rows=5, cols=3)
    t_unit.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_unit.autofit = False
    set_table_borders(t_unit)
    for r in t_unit.rows:
        r.cells[0].width = Inches(3.2)
        r.cells[1].width = Inches(1.3)
        r.cells[2].width = Inches(2.2)

    unit_h = ["Элемент структуры стоимости", "Доля от чека", "Экономическое обоснование"]
    for i, h in enumerate(unit_h):
        c = t_unit.cell(0, i)
        set_cell_background(c, "F1F5F9")
        set_cell_margins(c, top=50, bottom=50, left=60, right=60)
        format_cell_text(c, h, bold=True, font_size=9, color=RGBColor(0, 0, 0))

    unit_data = [
        ("Розничная оплата клиента на сайте (Выручка)", "100.0%", "Фактически поступившие средства клиентов на счет"),
        ("Оптовая себестоимость исполнения заказа", "16.7%", "Списание оптовому шлюзу за выполнение услуги"),
        ("Банковский интернет-эквайринг и касса 54-ФЗ", "7.0%", "Официальная комиссия банка за прием карт и СБП"),
        ("ЧИСТАЯ ВАЛОВАЯ МАРЖА С КАЖДОГО ЗАКАЗА", "76.3%", "Маржинальный доход на покрытие расходов и прибыль")
    ]

    for row_idx, rdata in enumerate(unit_data, start=1):
        is_hi = (row_idx == 4)
        for col_idx, text in enumerate(rdata):
            c = t_unit.cell(row_idx, col_idx)
            set_cell_background(c, "F1F5F9" if is_hi else "FFFFFF")
            set_cell_margins(c, top=45, bottom=45, left=60, right=60)
            align = WD_ALIGN_PARAGRAPH.RIGHT if col_idx == 1 else WD_ALIGN_PARAGRAPH.LEFT
            format_cell_text(c, text, bold=is_hi, font_size=9, color=RGBColor(0, 0, 0), align=align)

    add_p(doc, "4.2. Формула чистой прибыли: Чистая прибыль = Выручка минус списания оптовикам, минус комиссия банка, минус сервера, реклама и зарплатный фонд. Все финансовые потоки прозрачны и отражаются в административном дашборде и выписках расчетного счета.")

    # 5. ПРАВА НА ИС, РЕГЛАМЕНТ ВЫХОДА И ЗАЩИТА АКТИВОВ
    add_sec_header(doc, "5. ПРАВА НА ИНТЕЛЛЕКТУАЛЬНУЮ СОБСТВЕННОСТЬ, ВЫХОД ИЗ ПРОЕКТА И ЗАЩИТА АКТИВОВ")
    
    add_callout_box(
        doc,
        "1. НЕОТЧУЖДАЕМОСТЬ ПРОГРАММНОГО КОДА: Исходный код IT-ядра OmniSMM 1.0, архитектура базы данных и модули автоматизации являются исключительной собственностью Создателя платформы. Инвестору передаются исключительно коммерческие права на извлечение прибыли с конкретной запущенной витрины (smmflux.ru).\n"
        "2. НЕВОЗВРАТНОСТЬ ПЛАТЫ ЗА ПОДКЛЮЧЕНИЕ: Плата за подключение (1 000 000 ₽) является фиксированным вознаграждением за готовую IT-систему, интеграцию оптовых шлюзов и запуск витрины под ключ. При любом досрочном выходе Инвестора данная сумма не возвращается.\n"
        "3. ЗАПРЕТ КОНКУРЕНЦИИ (NON-COMPETE): Инвестор обязуется в течение 36 месяцев с даты подписания соглашения и 24 месяцев после любого выхода не запускать, не соинвестировать и не развивать конкурирующие сервисы в сфере SMM (штрафная неустойка за прямое нарушение — 2 100 000 ₽).",
        title="ФУНДАМЕНТАЛЬНЫЕ ПРАВОВЫЕ ОГРАНИЧЕНИЯ"
    )

    add_p(doc, "5.1. Сценарий 1 (Досрочный добровольный выход Инвестора на этапе раскачки): При одностороннем выходе Инвестора в первые месяцы до возврата тела инвестиций действует следующий регламент взаиморасчетов:")
    add_p(doc, "Инвестор направляет письменное уведомление за 14 календарных дней. Плата за подключение (1 000 000 ₽) и фактически выплаченный зарплатный фонд возврату не подлежат. Неизрасходованный остаток рекламного фонда на расчетном счете возвращается Инвестору в течение 10 банковских дней. Фактический остаток депозита у оптовых поставщиков возвращается Инвестору после завершения принятых клиентских заказов (до 14 рабочих дней). Доменное имя, сайт, аккаунты и база зарегистрированных клиентов переходят в 100% распоряжение Создателя без доплат. Инвестор утрачивает права на долю в прибыли, а стороны подписывают соглашение о расторжении без взаимных претензий.", bold_prefix="• Порядок расчетов и судьба витрины: ")

    add_p(doc, "5.2. Сценарий 2 (Плановый выкуп доли Инвестора Создателем — Консолидация бизнеса): Через 24 месяца с даты запуска витрины и строго при условии 100% возврата первоначальных инвестиций Создатель вправе консолидировать 100% владения витриной:")
    add_p(doc, "Создатель направляет Инвестору предложение о выкупе его 30% доли. Оценка проводится по рыночной формуле: Цена выкупа = (Сумма чистой прибыли за последние 6 месяцев / 6) × 24 месяца × 30%. Выплата производится в рассрочку: 30% суммы — в день подписания соглашения о выкупе, 70% — равными долями ежемесячно в течение 12 месяцев. На период рассрочки Инвестор освобождается от операционных рисков и получает фиксированные платежи, а по завершении выплат Создатель становится единоличным владельцем 100% чистой прибыли витрины.", bold_prefix="• Формула оценки и порядок выплат: ")

    add_p(doc, "5.3. Сценарий 3 (Продажа доли Инвестора третьему лицу — Право первой руки ROFR): Инвестор после возврата вложений вправе продать свои 30% пассивного дохода стороннему лицу на следующих условиях:")
    add_p(doc, "У Создателя действует безусловное преимущественное право выкупа доли (Right of First Refusal) на предложенных сторонним покупателем условиях в течение 30 календарных дней. В случае отказа Создателя продажа допускается строго с письменного согласия Создателя. Новый участник приобретает исключительно право на 30% пассивных дивидендов, без доступа к исходному коду, серверам, базам данных и без права вмешательства в управление проектом.", bold_prefix="• Преимущественное право и статус покупателя: ")

    add_p(doc, "5.4. Сценарий 4 (Выход Создателя платформы из операционного управления): В случае невозможности или нежелания Создателя лично осуществлять технический надзор:")
    add_p(doc, "Создатель уведомляет Инвестора за 60 календарных дней. Стороны согласованно выбирают один из двух вариантов: А) Продажа витрины как готового бизнеса на открытом рынке с разделом выручки (в первую очередь закрывается остаток долга перед Инвестором при его наличии, остаток делится 70% Создателю / 30% Инвестору; покупатель переходит на SaaS-подписку к ядру платформы); либо Б) Наем внешнего обученного технического администратора из зарплатного фонда (200 000 ₽/мес) с сохранением за Создателем и Инвестором статуса пассивных совладельцев (70/30).", bold_prefix="• Варианты цивилизованной передачи: ")

    add_p(doc, "5.5. Сценарий 5 (Рыночный тупик и плановая ликвидация): При возникновении неблагоприятных внешних факторов:")
    add_p(doc, "Если 4 месяца подряд среднемесячная выручка составляет менее 80 000 рублей, либо чистая прибыль проекта равна нулю при расходовании более 80% рекламного бюджета, Стороны фиксируют рыночный тупик. Платная реклама останавливается, обязательства перед клиентами исполняются, налоги закрываются. Все оставшиеся на счетах денежные средства и остатки у оптовиков переводятся Инвестору в счет компенсации его затрат. Проект закрывается без взаимных долговых обязательств, а финансовый результат признается совместным предпринимательским риском.", bold_prefix="• Критерии и ликвидационный протокол: ")

    add_p(doc, "5.6. Сценарий 6 (Операционный иммунитет и разрешение разногласий Deadlock): Для защиты проекта от управленческого паралича:")
    add_p(doc, "За Создателем зафиксировано безусловное право решающего голоса (Veto Power) по всем техническим, архитектурным, продуктовым и тарифным вопросам. Инвестор не вправе блокировать текущую операционную деятельность. При возникновении неустранимых разногласий Стороны проводят 14-дневный раунд переговоров, а при недостижении согласия — инициируют выкуп доли Создателем (п. 5.2) либо совместную продажу витрины (п. 5.4).", bold_prefix="• Принцип решающего голоса: ")

    add_p(doc, "5.7. Защита персонала и конфиденциальность коммерческой информации:")
    add_p(doc, "Инвестору категорически запрещается делать предложения о трудоустройстве и переманивать штатного оператора клиентской поддержки, разработчиков и подрядчиков, привлеченных Создателем (штрафная неустойка — 1 000 000 ₽). Вся информация о реальной оптовой себестоимости услуг, наценке +500%, поставщиках и источниках рекламы является охраняемой коммерческой тайной и не подлежит разглашению третьим лицам.", bold_prefix="• Защита от переманивания (Non-Solicitation) и NDA: ")

    # Таблица распределения активов при выходе
    add_p(doc, "5.8. Регламентная таблица распределения активов и обязательств при прекращении сотрудничества:")
    t_exit = doc.add_table(rows=7, cols=3)
    t_exit.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_exit.autofit = False
    set_table_borders(t_exit)
    for r in t_exit.rows:
        r.cells[0].width = Inches(2.4)
        r.cells[1].width = Inches(1.8)
        r.cells[2].width = Inches(2.6)

    h_exit = ["Наименование актива / ресурса", "Принадлежность при выходе", "Порядок передачи и правовое основание"]
    for i, h in enumerate(h_exit):
        c = t_exit.cell(0, i)
        set_cell_background(c, "F1F5F9")
        set_cell_margins(c, top=50, bottom=50, left=60, right=60)
        format_cell_text(c, h, bold=True, font_size=8.5, color=RGBColor(0, 0, 0))

    exit_rows = [
        ("Исходный код ядра OmniSMM 1.0, БД, алгоритмы", "100% Создателю платформы", "Исключительная неотчуждаемая интеллектуальная собственность автора. Не передается."),
        ("Плата за подключение (1 000 000 ₽)", "Создателю платформы", "Невозвратное вознаграждение за готовую IT-разработку и запуск под ключ."),
        ("Неизрасходованный рекламный бюджет", "Инвестору (в полном объеме)", "Целевой остаток выводится с расчетного счета Инвестору в течение 10 банковских дней."),
        ("Остаток депозита у оптовых поставщиков", "Инвестору (за вычетом заказов)", "Возвращается Инвестору после завершения всех принятых клиентских заказов (до 14 дней)."),
        ("Доменное имя, сайт и база клиентов витрины", "Создателю платформы", "Инфраструктура витрины переходит Создателю для автономного коммерческого ведения."),
        ("Штатный оператор поддержки 24/7 (товарищ)", "Остается в команде Создателя", "Сотрудник команды платформы. Переманивание Инвестором запрещено договором.")
    ]

    for row_idx, rdata in enumerate(exit_rows, start=1):
        for col_idx, text in enumerate(rdata):
            c = t_exit.cell(row_idx, col_idx)
            set_cell_background(c, "FFFFFF")
            set_cell_margins(c, top=40, bottom=40, left=60, right=60)
            is_bold = (col_idx == 1)
            format_cell_text(c, text, bold=is_bold, font_size=8.5, color=RGBColor(0, 0, 0))


    # 6. КАЛЕНДАРНЫЙ ПЛАН
    add_sec_header(doc, "6. КАЛЕНДАРНЫЙ ПЛАН ВВОДА В ЭКСПЛУАТАЦИЮ (7 КАЛЕНДАРНЫХ ДНЕЙ)")
    add_p(doc, "День 1: Подписание соглашения, оплата подключения Создателю, подача заявки на открытие счета ИП.", bold_prefix="• ")
    add_p(doc, "Дни 2–3: Открытие расчетного счета, аренда VDS-сервера, настройка базы данных, SSL-сертификатов и доменного имени.", bold_prefix="• ")
    add_p(doc, "Дни 4–5: Подключение шлюзов оплаты картами и СБП, регистрация онлайн-кассы по 54-ФЗ, прохождение модерации.", bold_prefix="• ")
    add_p(doc, "День 6: Тестовые контрольные заказы, проверка автоматического исполнения через шлюзы и проверка тикет-системы.", bold_prefix="• ")
    add_p(doc, "День 7: Запуск рекламных кампаний в Яндексе и Telegram — прием первых розничных клиентов.", bold_prefix="• ")

    # 7. РЕКВИЗИТЫ И ПОДПИСИ
    add_sec_header(doc, "7. АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН")
    t_sig = doc.add_table(rows=2, cols=2)
    t_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sig.autofit = False
    for r in t_sig.rows:
        r.cells[0].width = Inches(3.35)
        r.cells[1].width = Inches(3.35)

    format_cell_text(t_sig.cell(0, 0), "СОЗДАТЕЛЬ И ПРАВООБЛАДАТЕЛЬ:\n", bold=True, font_size=9.5)
    format_cell_text(t_sig.cell(0, 1), "ИНВЕСТОР (ФИНАНСОВЫЙ ПАРТНЕР):\n", bold=True, font_size=9.5)

    s1 = (
        "Индивидуальный предприниматель\n"
        "ФИО: _____________________________________\n"
        "ОГРНИП: __________________________________\n"
        "ИНН: _____________________________________\n"
        "Расчетный счет: __________________________\n"
        "Банк: ____________________________________\n\n"
        "Подпись: ________________ / ____________ /\n"
        "М.П."
    )
    s2 = (
        "Индивидуальный предприниматель / Физ. лицо\n"
        "ФИО: _____________________________________\n"
        "ИНН: _____________________________________\n"
        "Паспортные данные: _______________________\n"
        "Выдан: ___________________________________\n"
        "Контактный телефон: ______________________\n\n"
        "Подпись: ________________ / ____________ /\n"
        "Дата: «___» ________________ 2026 г."
    )

    format_cell_text(t_sig.cell(1, 0), s1, font_size=8.5)
    format_cell_text(t_sig.cell(1, 1), s2, font_size=8.5)
    set_table_borders(t_sig, color="000000", sz="4")

    # Outputs
    p1 = r"e:\SMM\docs\PARTNERSKOE_PREDLOZHENIE_OMNISMM_2026.docx"
    doc.save(p1)
    print(f"Saved standard document: {p1}")

    p2 = r"C:\Users\ZVER\.gemini\antigravity\brain\b4a9d24b-1234-4558-b3cb-d45190059f9c\PARTNERSKOE_PREDLOZHENIE_OMNISMM_2026.docx"
    try:
        doc.save(p2)
        print(f"Saved standard document: {p2}")
    except Exception as e:
        print(f"Notice: Artifact path is locked: {e}")

if __name__ == "__main__":
    generate_standard_document()

import sys
import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

sys.stdout.reconfigure(encoding='utf-8')

print("=== GENERATING VISUAL CHARTS FOR BIGDATA REPORT ===")

artifact_dir = r"C:\Users\ZVER\.gemini\antigravity\brain\f24f8253-a4d6-4e70-ab2f-e6e9e30fa996"
charts_dir = os.path.join(artifact_dir, "charts")
os.makedirs(charts_dir, exist_ok=True)

# Load daily data
daily = pd.read_csv(r'e:\SMM\scripts\daily_erp_metrics.csv')
daily['date'] = pd.to_datetime(daily['date'])

# Load parsed pubs
pubs = pd.read_csv(r'e:\SMM\scripts\parsed_publications.csv')
pubs['effective_date'] = pd.to_datetime(pubs['effective_date'])

pub_counts = pubs.groupby('effective_date').size().reset_index(name='ad_count')
pub_counts.rename(columns={'effective_date': 'date'}, inplace=True)
daily = daily.merge(pub_counts, on='date', how='left').fillna({'ad_count': 0})

# Chart styling defaults
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Segoe UI']
plt.rcParams['axes.edgecolor'] = '#cbd5e1'
plt.rcParams['axes.linewidth'] = 1.0

# -------------------------------------------------------------------------
# CHART 1: Timeline & Waves Dual-Axis Chart
# -------------------------------------------------------------------------
print("Generating Chart 1: Timeline & Waves...")
fig, ax1 = plt.subplots(figsize=(15, 7), dpi=200)

color_orders = '#2563eb' # Blue
color_ads = '#ef4444'    # Red / Coral
color_rev = '#10b981'    # Emerald

ax1.set_title('PrimeLike: Динамика рекламных выходов vs Заказы и Выручка в ERP (2024–2026)', fontsize=15, fontweight='bold', pad=15)
ax1.set_xlabel('Дата', fontsize=12)
ax1.set_ylabel('Завершенных заказов в сутки (7d MA)', color=color_orders, fontsize=12, fontweight='semibold')
line1 = ax1.plot(daily['date'], daily['orders_7d_ma'], color=color_orders, linewidth=2.2, label='Заказы (7-дневная скользящая средняя)')
ax1.tick_params(axis='y', labelcolor=color_orders)

ax2 = ax1.twinx()
ax2.set_ylabel('Количество рекламных публикаций в день', color=color_ads, fontsize=12, fontweight='semibold')
bars = ax2.bar(daily['date'], daily['ad_count'], color=color_ads, alpha=0.65, width=2.0, label='Выходы рекламы (статьи/обновления)')
ax2.tick_params(axis='y', labelcolor=color_ads)
ax2.grid(False)

# Format X-axis
ax1.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
ax1.xaxis.set_major_formatter(mdates.DateFormatter('%b %Y'))
fig.autofmt_xdate()

# Add phase markers
phases = [
    (pd.to_datetime('2024-10-11'), 'Запуск ERP\n(Фаза 0)'),
    (pd.to_datetime('2025-01-15'), 'Волна 1\n(DTF/Cossa)'),
    (pd.to_datetime('2025-05-15'), 'Пик новых пользователей\n(+18.4k users)'),
    (pd.to_datetime('2025-09-16'), 'Старт РБК\nКомпании'),
    (pd.to_datetime('2026-01-15'), 'Волна 2: Блиц-пик\n(46 публикаций)')
]
for p_date, p_label in phases:
    ax1.axvline(p_date, color='#64748b', linestyle='--', alpha=0.5, linewidth=1.2)
    ax1.annotate(p_label, xy=(p_date, ax1.get_ylim()[1]*0.82), xytext=(5, 0), 
                 textcoords='offset points', fontsize=9, fontweight='semibold',
                 bbox=dict(boxstyle='round,pad=0.3', facecolor='#f8fafc', edgecolor='#94a3b8', alpha=0.9))

plt.tight_layout()
chart1_path = os.path.join(charts_dir, 'chart1_timeline_dual_axis.png')
plt.savefig(chart1_path)
plt.close()
print(f"Saved: {chart1_path}")

# -------------------------------------------------------------------------
# CHART 2: Topic Attribution & Category Lifts
# -------------------------------------------------------------------------
print("Generating Chart 2: Category Lifts...")
cat_df = pd.read_csv(r'e:\SMM\scripts\category_attribution_study.csv')
topic_summary = cat_df.groupby('topic').agg(
    cat_order_lift=('cat_order_lift_pct', 'mean'),
    cat_rev_lift=('cat_rev_lift_pct', 'mean'),
    total_order_lift=('total_order_lift_pct', 'mean'),
    pubs_count=('pub_id', 'count')
).reset_index()

fig, ax = plt.subplots(figsize=(10, 6), dpi=200)
x = np.arange(len(topic_summary))
width = 0.35

rects1 = ax.bar(x - width/2, topic_summary['cat_order_lift'], width, label='Прирост целевой категории (%)', color='#3b82f6')
rects2 = ax.bar(x + width/2, topic_summary['total_order_lift'], width, label='Общий прирост всех заказов (%)', color='#94a3b8')

ax.set_title('Специфичность рекламы: Прирост целевой категории vs Общий фон платформы', fontsize=13, fontweight='bold', pad=15)
ax.set_ylabel('Lift (%) в окне [T0, T+3]', fontsize=11)
ax.set_xticks(x)
ax.set_xticklabels([f"{r['topic']} (n={r['pubs_count']})" for _, r in topic_summary.iterrows()], fontsize=11)
ax.legend(frameon=True, facecolor='#ffffff')
ax.axhline(0, color='#334155', linewidth=0.8)

# Add value labels
for rect in rects1:
    h = rect.get_height()
    va = 'bottom' if h >= 0 else 'top'
    ax.annotate(f"{h:+.1f}%", xy=(rect.get_x() + rect.get_width()/2, h), xytext=(0, 3 if h>=0 else -10),
                textcoords="offset points", ha='center', va=va, fontsize=10, fontweight='bold')

for rect in rects2:
    h = rect.get_height()
    va = 'bottom' if h >= 0 else 'top'
    ax.annotate(f"{h:+.1f}%", xy=(rect.get_x() + rect.get_width()/2, h), xytext=(0, 3 if h>=0 else -10),
                textcoords="offset points", ha='center', va=va, fontsize=9, color='#475569')

plt.tight_layout()
chart2_path = os.path.join(charts_dir, 'chart2_category_attribution.png')
plt.savefig(chart2_path)
plt.close()
print(f"Saved: {chart2_path}")

# -------------------------------------------------------------------------
# CHART 3: Retention Decay & LTV Growth
# -------------------------------------------------------------------------
print("Generating Chart 3: Retention & LTV...")
ret_df = pd.read_csv(r'e:\SMM\scripts\cohort_retention_table.csv', index_col=0)
ltv_df = pd.read_csv(r'e:\SMM\scripts\cohort_ltv_table.csv', index_col=0)

# Filter out early test months (2024-10, 2024-11, 2024-12) to get clean stable cohorts
stable_cohorts = ret_df.loc['2025-01-01':'2025-12-01']
avg_retention = stable_cohorts[['0', '1', '2', '3', '4', '5', '6']].mean()
avg_ltv = ltv_df.loc['2025-01-01':'2025-12-01'][['0', '1', '2', '3', '4', '5', '6']].mean()

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.5), dpi=200)

# Retention subplot
ax1.plot(['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'], avg_retention.values, marker='o', color='#8b5cf6', linewidth=2.5, markersize=8)
ax1.set_title('Кривая удержания пользователей (Retention Rate)', fontsize=13, fontweight='bold', pad=12)
ax1.set_ylabel('Доля активных покупателей (%)', fontsize=11)
ax1.set_xlabel('Месяц с момента первой покупки', fontsize=11)
ax1.set_ylim(0, 105)
for i, v in enumerate(avg_retention.values):
    ax1.annotate(f"{v:.1f}%", (i, v), textcoords="offset points", xytext=(0, 7), ha='center', fontsize=10, fontweight='bold')

# LTV subplot
ax2.plot(['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'], avg_ltv.values, marker='s', color='#10b981', linewidth=2.5, markersize=8)
ax2.set_title('Динамика совокупного LTV на пользователя', fontsize=13, fontweight='bold', pad=12)
ax2.set_ylabel('LTV (выручка на пользователя, ₽)', fontsize=11)
ax2.set_xlabel('Месяц с момента первой покупки', fontsize=11)
for i, v in enumerate(avg_ltv.values):
    ax2.annotate(f"{v:.0f} ₽", (i, v), textcoords="offset points", xytext=(0, 7), ha='center', fontsize=10, fontweight='bold')

plt.tight_layout()
chart3_path = os.path.join(charts_dir, 'chart3_retention_ltv.png')
plt.savefig(chart3_path)
plt.close()
print(f"Saved: {chart3_path}")

# -------------------------------------------------------------------------
# CHART 4: Diminishing Marginal Returns (Audience Saturation)
# -------------------------------------------------------------------------
print("Generating Chart 4: Diminishing Returns...")
waves_df = pd.read_csv(r'e:\SMM\scripts\ad_waves_performance.csv')

fig, ax1 = plt.subplots(figsize=(11, 6), dpi=200)

waves_names = ['Wave 1: Launch\n(Jan–May 25)', 'Summer Plateau\n(Jun–Aug 25)', 'Wave 2 Build-up\n(Sep–Nov 25)', 'Wave 2 Blitz\n(Dec 25–Feb 26)']
waves_sub = waves_df[waves_df['Wave'].isin(['Wave 1: Launch & Scale', 'Summer Plateau', 'Wave 2 Build-up (RBK Launch)', 'Wave 2 Peak (Mass Blitz)'])]

ax1.set_title('Закон убывающей предельной отдачи: Деградация отдачи на 1 статью', fontsize=13, fontweight='bold', pad=15)
bars = ax1.bar(waves_names, waves_sub['Users_Per_Ad'], color='#f59e0b', width=0.5, edgecolor='#d97706')
ax1.set_ylabel('Новых пользователей на 1 рекламную статью', fontsize=11, color='#b45309', fontweight='semibold')
ax1.tick_params(axis='y', labelcolor='#b45309')

for bar in bars:
    h = bar.get_height()
    ax1.annotate(f"{h:,.0f} чел.", xy=(bar.get_x() + bar.get_width()/2, h), xytext=(0, 5),
                 textcoords="offset points", ha='center', fontsize=11, fontweight='bold')

ax2 = ax1.twinx()
ax2.plot(waves_names, waves_sub['Pubs_Total'], color='#dc2626', marker='D', linewidth=2.5, markersize=8, label='Кол-во статей в волне')
ax2.set_ylabel('Количество статей в волне', color='#dc2626', fontsize=11, fontweight='semibold')
ax2.tick_params(axis='y', labelcolor='#dc2626')
ax2.grid(False)

plt.tight_layout()
chart4_path = os.path.join(charts_dir, 'chart4_diminishing_returns.png')
plt.savefig(chart4_path)
plt.close()
print(f"Saved: {chart4_path}")

# -------------------------------------------------------------------------
# CHART 5: Pareto User Distribution
# -------------------------------------------------------------------------
print("Generating Chart 5: User Segments Pareto...")
rep_df = pd.read_csv(r'e:\SMM\scripts\user_repeat_distribution.csv')

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.5), dpi=200)

colors = ['#cbd5e1', '#94a3b8', '#64748b', '#3b82f6', '#1d4ed8']

# Users Pie
ax1.pie(rep_df['pct_users'], labels=rep_df['user_bucket'], autopct='%1.1f%%', startangle=140, colors=colors, textprops={'fontsize': 10})
ax1.set_title('Структура базы пользователей (% клиентов)', fontsize=13, fontweight='bold')

# Revenue Pie
ax2.pie(rep_df['pct_revenue'], labels=rep_df['user_bucket'], autopct='%1.1f%%', startangle=140, colors=colors, textprops={'fontsize': 10})
ax2.set_title('Структура выручки (% денег)', fontsize=13, fontweight='bold')

plt.tight_layout()
chart5_path = os.path.join(charts_dir, 'chart5_pareto_revenue.png')
plt.savefig(chart5_path)
plt.close()
print(f"Saved: {chart5_path}")

print("=== ALL CHARTS GENERATED SUCCESSFULLY ===")

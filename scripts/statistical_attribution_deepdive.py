import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from scipy import stats

sys.stdout.reconfigure(encoding='utf-8')

print("=== STATISTICAL ATTRIBUTION & LAG ANALYSIS ===")

# Load daily metrics
daily = pd.read_csv(r'e:\SMM\scripts\daily_erp_metrics.csv')
daily['date'] = pd.to_datetime(daily['date'])

# Load parsed publications
pubs = pd.read_csv(r'e:\SMM\scripts\parsed_publications.csv')
pubs['effective_date'] = pd.to_datetime(pubs['effective_date'])

# Build daily ad release count series
pub_counts_daily = pubs.groupby('effective_date').agg(
    total_pubs=('id', 'count'),
    new_pubs=('is_retrofit', lambda x: (x == False).sum()),
    retrofit_pubs=('is_retrofit', lambda x: (x == True).sum())
).reset_index().rename(columns={'effective_date': 'date'})

daily = daily.merge(pub_counts_daily, on='date', how='left').fillna({
    'total_pubs': 0, 'new_pubs': 0, 'retrofit_pubs': 0
})

# Rolling ad features: 3-day, 7-day, 14-day, 30-day cumulative pubs
for window in [3, 7, 14, 30]:
    daily[f'pubs_{window}d_sum'] = daily['total_pubs'].rolling(window, min_periods=1).sum()
    daily[f'new_pubs_{window}d_sum'] = daily['new_pubs'].rolling(window, min_periods=1).sum()
    daily[f'retrofit_{window}d_sum'] = daily['retrofit_pubs'].rolling(window, min_periods=1).sum()

# Pearson and Spearman Correlations
print("\n--- CORRELATION MATRIX (Ad Publications vs Daily Business Metrics) ---")
corr_vars = [
    'new_users', 'completed_orders', 'completed_revenue', 'topups_count', 'topups_amount',
    'tg_completed_orders', 'vk_completed_orders', 'tt_completed_orders', 'yt_completed_orders'
]
ad_vars = ['total_pubs', 'new_pubs', 'retrofit_pubs', 'pubs_7d_sum', 'pubs_14d_sum', 'pubs_30d_sum']

corr_table = []
for av in ad_vars:
    row = {'Ad_Variable': av}
    for cv in corr_vars:
        r, p = stats.pearsonr(daily[av], daily[cv])
        row[cv] = round(r, 3)
    corr_table.append(row)

corr_df = pd.DataFrame(corr_table)
print(corr_df.to_string(index=False))

# Lag Analysis: Cross-Correlation Function (CCF)
print("\n--- LAG CROSS-CORRELATION (Lag -7 to +30 days) ---")
# Lag k: correlation between Ad Publications at day t and Business Metric at day t + k
lags = [-7, -3, 0, 1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60]
lag_results = []
for lag in lags:
    # shift ad series by lag
    shifted_pubs = daily['total_pubs'].shift(lag)
    # drop na
    valid_idx = ~shifted_pubs.isna()
    
    r_users, _ = stats.pearsonr(shifted_pubs[valid_idx], daily.loc[valid_idx, 'new_users'])
    r_orders, _ = stats.pearsonr(shifted_pubs[valid_idx], daily.loc[valid_idx, 'completed_orders'])
    r_rev, _ = stats.pearsonr(shifted_pubs[valid_idx], daily.loc[valid_idx, 'completed_revenue'])
    r_topups, _ = stats.pearsonr(shifted_pubs[valid_idx], daily.loc[valid_idx, 'topups_amount'])
    
    lag_results.append({
        'Lag_Days': lag,
        'Corr_New_Users': round(r_users, 3),
        'Corr_Completed_Orders': round(r_orders, 3),
        'Corr_Completed_Revenue': round(r_rev, 3),
        'Corr_Topups_Amount': round(r_topups, 3)
    })

lag_df = pd.DataFrame(lag_results)
print(lag_df.to_string(index=False))

# Detailed Breakdown of Ad Waves
print("\n--- AD WAVES COMPARISON: Volume, Performance & Returns ---")
waves = [
    {'name': 'Phase 0: Seeding', 'start': '2024-09-01', 'end': '2024-12-31'},
    {'name': 'Wave 1: Launch & Scale', 'start': '2025-01-01', 'end': '2025-05-31'},
    {'name': 'Summer Plateau', 'start': '2025-06-01', 'end': '2025-08-31'},
    {'name': 'Wave 2 Build-up (RBK Launch)', 'start': '2025-09-01', 'end': '2025-11-30'},
    {'name': 'Wave 2 Peak (Mass Blitz)', 'start': '2025-12-01', 'end': '2026-02-28'},
    {'name': 'Phase 3: Exhaustion & Tail', 'start': '2026-03-01', 'end': '2026-07-15'}
]

wave_records = []
for w in waves:
    s_dt = pd.to_datetime(w['start'])
    e_dt = pd.to_datetime(w['end'])
    
    d_sub = daily[(daily['date'] >= s_dt) & (daily['date'] <= e_dt)]
    p_sub = pubs[(pubs['effective_date'] >= s_dt) & (pubs['effective_date'] <= e_dt)]
    
    days = len(d_sub)
    pubs_in_wave = len(p_sub)
    retro_in_wave = (p_sub['is_retrofit'] == True).sum()
    new_in_wave = (p_sub['is_retrofit'] == False).sum()
    
    tot_orders = d_sub['completed_orders'].sum()
    tot_rev = d_sub['completed_revenue'].sum()
    tot_users = d_sub['new_users'].sum()
    tot_topups = d_sub['topups_amount'].sum()
    
    daily_avg_orders = tot_orders / days if days > 0 else 0
    daily_avg_rev = tot_rev / days if days > 0 else 0
    daily_avg_users = tot_users / days if days > 0 else 0
    
    # Efficiency per article published in this wave:
    rev_per_ad = (tot_rev / pubs_in_wave) if pubs_in_wave > 0 else 0
    users_per_ad = (tot_users / pubs_in_wave) if pubs_in_wave > 0 else 0
    
    wave_records.append({
        'Wave': w['name'],
        'Period': f"{w['start']} to {w['end']}",
        'Days': days,
        'Pubs_Total': pubs_in_wave,
        'Pubs_New': new_in_wave,
        'Pubs_Retrofit': retro_in_wave,
        'Total_New_Users': int(tot_users),
        'Total_Orders': int(tot_orders),
        'Total_Revenue_RUB': round(tot_rev, 2),
        'Daily_Avg_Orders': round(daily_avg_orders, 1),
        'Daily_Avg_Revenue': round(daily_avg_rev, 1),
        'Daily_Avg_Users': round(daily_avg_users, 1),
        'Rev_Per_Ad_RUB': round(rev_per_ad, 1),
        'Users_Per_Ad': round(users_per_ad, 1)
    })

waves_df = pd.DataFrame(wave_records)
print(waves_df[['Wave', 'Pubs_Total', 'Pubs_Retrofit', 'Total_New_Users', 'Total_Revenue_RUB', 'Daily_Avg_Orders', 'Daily_Avg_Revenue', 'Users_Per_Ad']].to_string(index=False))

# Save outputs
corr_df.to_csv(r'e:\SMM\scripts\ad_correlation_matrix.csv', index=False)
lag_df.to_csv(r'e:\SMM\scripts\ad_lag_ccf.csv', index=False)
waves_df.to_csv(r'e:\SMM\scripts\ad_waves_performance.csv', index=False)

print("\n=== COMPLETED STATISTICAL ATTRIBUTION ===")

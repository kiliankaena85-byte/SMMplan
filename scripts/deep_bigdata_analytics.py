import sys
import os
import psycopg2
import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding='utf-8')

print("=== STARTING BIGDATA AD ATTRIBUTION & ERP ANALYSIS ===")

# 1. Connect to PostgreSQL
conn = psycopg2.connect(
    dbname='smm_erp',
    user='smm_erp_user',
    password='smm_secure_pass_123',
    host='127.0.0.1',
    port=5432
)

# 2. Extract Daily ERP Metrics for PrimeLike (site_id = 1)
print("1. Extracting daily order metrics...")
orders_daily_sql = """
SELECT 
    created_at::date as date,
    count(*) as total_orders,
    count(distinct user_email) as active_orderers,
    sum(case when status in ('Завершен', 'Исполнен частично') then 1 else 0 end) as completed_orders,
    sum(case when status in ('Завершен', 'Исполнен частично') then price else 0 end) as completed_revenue,
    sum(price) as total_price,
    -- Category breakdown
    sum(case when category = 'Telegram' and status in ('Завершен', 'Исполнен частично') then 1 else 0 end) as tg_completed_orders,
    sum(case when category = 'Telegram' and status in ('Завершен', 'Исполнен частично') then price else 0 end) as tg_completed_rev,
    sum(case when category = 'Instagram' and status in ('Завершен', 'Исполнен частично') then 1 else 0 end) as insta_completed_orders,
    sum(case when category = 'Instagram' and status in ('Завершен', 'Исполнен частично') then price else 0 end) as insta_completed_rev,
    sum(case when category = 'Вконтакте' and status in ('Завершен', 'Исполнен частично') then 1 else 0 end) as vk_completed_orders,
    sum(case when category = 'Вконтакте' and status in ('Завершен', 'Исполнен частично') then price else 0 end) as vk_completed_rev,
    sum(case when category = 'TikTok' and status in ('Завершен', 'Исполнен частично') then 1 else 0 end) as tt_completed_orders,
    sum(case when category = 'TikTok' and status in ('Завершен', 'Исполнен частично') then price else 0 end) as tt_completed_rev,
    sum(case when category = 'YouTube' and status in ('Завершен', 'Исполнен частично') then 1 else 0 end) as yt_completed_orders,
    sum(case when category = 'YouTube' and status in ('Завершен', 'Исполнен частично') then price else 0 end) as yt_completed_rev
FROM orders
WHERE site_id = 1
GROUP BY 1
ORDER BY 1;
"""
daily_orders_df = pd.read_sql(orders_daily_sql, conn)
daily_orders_df['date'] = pd.to_datetime(daily_orders_df['date'])

print(f"Extracted {len(daily_orders_df)} days of orders data.")

print("2. Extracting daily topup transactions...")
tx_daily_sql = """
SELECT 
    created_at::date as date,
    count(*) as topups_count,
    sum(amount) as topups_amount,
    count(distinct user_email) as active_topup_users
FROM transactions
WHERE site_id = 1 AND type = 'Пополнение баланса' AND status = 'Выполнено'
GROUP BY 1
ORDER BY 1;
"""
daily_tx_df = pd.read_sql(tx_daily_sql, conn)
daily_tx_df['date'] = pd.to_datetime(daily_tx_df['date'])
print(f"Extracted {len(daily_tx_df)} days of transactions data.")

print("3. Extracting daily user registrations...")
users_daily_sql = """
SELECT 
    created_at::date as date,
    count(*) as new_users
FROM users
WHERE site_id = 1
GROUP BY 1
ORDER BY 1;
"""
daily_users_df = pd.read_sql(users_daily_sql, conn)
daily_users_df['date'] = pd.to_datetime(daily_users_df['date'])
print(f"Extracted {len(daily_users_df)} days of users registration data.")

print("4. Extracting support dialogues...")
dialogues_daily_sql = """
SELECT 
    created_at::date as date,
    count(*) as tickets_count
FROM dialogues
WHERE site_id = 1
GROUP BY 1
ORDER BY 1;
"""
daily_dialogues_df = pd.read_sql(dialogues_daily_sql, conn)
daily_dialogues_df['date'] = pd.to_datetime(daily_dialogues_df['date'])

# Merge all daily series onto continuous date calendar
min_date = min(daily_orders_df['date'].min(), daily_tx_df['date'].min(), daily_users_df['date'].min())
max_date = max(daily_orders_df['date'].max(), daily_tx_df['date'].max(), daily_users_df['date'].max())
full_calendar = pd.DataFrame({'date': pd.date_range(min_date, max_date)})

daily_metrics = full_calendar.merge(daily_orders_df, on='date', how='left') \
                             .merge(daily_tx_df, on='date', how='left') \
                             .merge(daily_users_df, on='date', how='left') \
                             .merge(daily_dialogues_df, on='date', how='left') \
                             .fillna(0)

# Compute rolling averages (7-day and 14-day)
daily_metrics['orders_7d_ma'] = daily_metrics['completed_orders'].rolling(7, min_periods=1).mean()
daily_metrics['rev_7d_ma'] = daily_metrics['completed_revenue'].rolling(7, min_periods=1).mean()
daily_metrics['users_7d_ma'] = daily_metrics['new_users'].rolling(7, min_periods=1).mean()
daily_metrics['topups_7d_ma'] = daily_metrics['topups_amount'].rolling(7, min_periods=1).mean()

print(f"Daily metrics dataframe ready from {min_date.date()} to {max_date.date()} ({len(daily_metrics)} days).")

# Save daily metrics
daily_metrics.to_csv(r'e:\SMM\scripts\daily_erp_metrics.csv', index=False)
print("Saved daily metrics to e:\\SMM\\scripts\\daily_erp_metrics.csv")

# 5. Load parsed publications
pubs_df = pd.read_csv(r'e:\SMM\scripts\parsed_publications.csv')
pubs_df['pub_date_dt'] = pd.to_datetime(pubs_df['pub_date'])
pubs_df['effective_date_dt'] = pd.to_datetime(pubs_df['effective_date'])

print("\n3. Running Event Study Analysis on Publications...")
# For each publication, calculate metrics before and after
event_results = []
for idx, pub in pubs_df.iterrows():
    eff_date = pub['effective_date_dt']
    if pd.isna(eff_date):
        continue
    
    # 7-day Pre window: [eff_date - 7 days, eff_date - 1 day]
    pre_start = eff_date - timedelta(days=7)
    pre_end = eff_date - timedelta(days=1)
    
    # Immediate Post window: [eff_date, eff_date + 3 days]
    post_start = eff_date
    post_end_imm = eff_date + timedelta(days=3)
    
    # Extended Post window: [eff_date, eff_date + 14 days]
    post_end_ext = eff_date + timedelta(days=14)
    
    pre_data = daily_metrics[(daily_metrics['date'] >= pre_start) & (daily_metrics['date'] <= pre_end)]
    post_imm = daily_metrics[(daily_metrics['date'] >= post_start) & (daily_metrics['date'] <= post_end_imm)]
    post_ext = daily_metrics[(daily_metrics['date'] >= post_start) & (daily_metrics['date'] <= post_end_ext)]
    
    if len(pre_data) == 0 or len(post_imm) == 0:
        continue
        
    pre_orders_mean = pre_data['completed_orders'].mean()
    post_orders_imm_mean = post_imm['completed_orders'].mean()
    post_orders_ext_mean = post_ext['completed_orders'].mean()
    
    pre_users_mean = pre_data['new_users'].mean()
    post_users_imm_mean = post_imm['new_users'].mean()
    post_users_ext_mean = post_ext['new_users'].mean()
    
    pre_rev_mean = pre_data['completed_revenue'].mean()
    post_rev_imm_mean = post_imm['completed_revenue'].mean()
    
    orders_imm_lift = ((post_orders_imm_mean - pre_orders_mean) / pre_orders_mean * 100) if pre_orders_mean > 0 else 0
    users_imm_lift = ((post_users_imm_mean - pre_users_mean) / pre_users_mean * 100) if pre_users_mean > 0 else 0
    rev_imm_lift = ((post_rev_imm_mean - pre_rev_mean) / pre_rev_mean * 100) if pre_rev_mean > 0 else 0
    
    # Topic detection
    title_lower = str(pub['title']).lower()
    detected_topic = 'General'
    if 'тик ток' in title_lower or 'tiktok' in title_lower:
        detected_topic = 'TikTok'
    elif 'телеграм' in title_lower or 'telegram' in title_lower:
        detected_topic = 'Telegram'
    elif 'вк' in title_lower or 'вконтакте' in title_lower:
        detected_topic = 'VK'
    elif 'ютуб' in title_lower or 'youtube' in title_lower:
        detected_topic = 'YouTube'
    elif 'дзен' in title_lower:
        detected_topic = 'Dzen'
    elif 'инстаграм' in title_lower or 'instagram' in title_lower:
        detected_topic = 'Instagram'
    elif 'лайк' in title_lower or 'likee' in title_lower:
        detected_topic = 'Likee'
        
    event_results.append({
        'pub_id': pub['id'],
        'effective_date': eff_date.strftime('%Y-%m-%d'),
        'platform': pub['platform'],
        'format': pub['format'],
        'is_retrofit': pub['is_retrofit'],
        'detected_topic': detected_topic,
        'title': pub['title'],
        'pre_orders_mean': round(pre_orders_mean, 1),
        'post_orders_imm_mean': round(post_orders_imm_mean, 1),
        'orders_imm_lift_pct': round(orders_imm_lift, 1),
        'pre_users_mean': round(pre_users_mean, 1),
        'post_users_imm_mean': round(post_users_imm_mean, 1),
        'users_imm_lift_pct': round(users_imm_lift, 1),
        'pre_rev_mean': round(pre_rev_mean, 1),
        'post_rev_imm_mean': round(post_rev_imm_mean, 1),
        'rev_imm_lift_pct': round(rev_imm_lift, 1),
        'post_orders_14d_mean': round(post_orders_ext_mean, 1),
        'post_users_14d_mean': round(post_users_ext_mean, 1)
    })

events_df = pd.DataFrame(event_results)
events_df.to_csv(r'e:\SMM\scripts\publication_event_study.csv', index=False)
print(f"Calculated event study for {len(events_df)} publications.")
print("Saved event study to e:\\SMM\\scripts\\publication_event_study.csv")

# Print top 10 publications by User Lift
print("\nTop 10 Publications by Immediate User Lift (%):")
top_lift = events_df.sort_values(by='users_imm_lift_pct', ascending=False).head(10)
print(top_lift[['pub_id', 'effective_date', 'platform', 'users_imm_lift_pct', 'pre_users_mean', 'post_users_imm_mean', 'title']].to_string())

# Platform performance comparison
print("\nPlatform Average Immediate User Lift (%):")
platform_perf = events_df.groupby('platform').agg(
    pubs_count=('pub_id', 'count'),
    avg_user_lift_pct=('users_imm_lift_pct', 'mean'),
    median_user_lift_pct=('users_imm_lift_pct', 'median'),
    avg_order_lift_pct=('orders_imm_lift_pct', 'mean'),
    avg_rev_lift_pct=('rev_imm_lift_pct', 'mean')
).sort_values(by='avg_user_lift_pct', ascending=False)
print(platform_perf.to_string())

# Retrofit vs New publications comparison
print("\nRetrofit vs New Publications Performance:")
retrofit_perf = events_df.groupby('is_retrofit').agg(
    count=('pub_id', 'count'),
    avg_user_lift=('users_imm_lift_pct', 'mean'),
    median_user_lift=('users_imm_lift_pct', 'median'),
    avg_order_lift=('orders_imm_lift_pct', 'mean'),
    avg_rev_lift=('rev_imm_lift_pct', 'mean')
)
print(retrofit_perf.to_string())

conn.close()
print("\n=== COMPLETED PART 1 ===")

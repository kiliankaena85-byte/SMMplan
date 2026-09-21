import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding='utf-8')

print("=== CATEGORY-SPECIFIC AD ATTRIBUTION ===")

daily_df = pd.read_csv(r'e:\SMM\scripts\daily_erp_metrics.csv')
daily_df['date'] = pd.to_datetime(daily_df['date'])

events_df = pd.read_csv(r'e:\SMM\scripts\publication_event_study.csv')
events_df['effective_date'] = pd.to_datetime(events_df['effective_date'])

# Mapping between detected_topic and daily_df category columns
topic_col_map = {
    'TikTok': ('tt_completed_orders', 'tt_completed_rev'),
    'VK': ('vk_completed_orders', 'vk_completed_rev'),
    'Telegram': ('tg_completed_orders', 'tg_completed_rev'),
    'YouTube': ('yt_completed_orders', 'yt_completed_rev'),
    'Instagram': ('insta_completed_orders', 'insta_completed_rev'),
}

category_results = []

for idx, ev in events_df.iterrows():
    topic = ev['detected_topic']
    if topic not in topic_col_map:
        continue
        
    order_col, rev_col = topic_col_map[topic]
    eff_date = ev['effective_date']
    
    pre_start = eff_date - timedelta(days=7)
    pre_end = eff_date - timedelta(days=1)
    post_start = eff_date
    post_end = eff_date + timedelta(days=3)
    
    pre_sub = daily_df[(daily_df['date'] >= pre_start) & (daily_df['date'] <= pre_end)]
    post_sub = daily_df[(daily_df['date'] >= post_start) & (daily_df['date'] <= post_end)]
    
    if len(pre_sub) == 0 or len(post_sub) == 0:
        continue
        
    pre_cat_orders = pre_sub[order_col].mean()
    post_cat_orders = post_sub[order_col].mean()
    
    pre_cat_rev = pre_sub[rev_col].mean()
    post_cat_rev = post_sub[rev_col].mean()
    
    cat_order_lift = ((post_cat_orders - pre_cat_orders) / pre_cat_orders * 100) if pre_cat_orders > 0 else 0
    cat_rev_lift = ((post_cat_rev - pre_cat_rev) / pre_cat_rev * 100) if pre_cat_rev > 0 else 0
    
    # Also get general (non-topic) orders for control comparison
    pre_total_orders = pre_sub['completed_orders'].mean()
    post_total_orders = post_sub['completed_orders'].mean()
    total_order_lift = ((post_total_orders - pre_total_orders) / pre_total_orders * 100) if pre_total_orders > 0 else 0
    
    # Topic specificity: difference between target category lift and total orders lift
    specificity = cat_order_lift - total_order_lift
    
    category_results.append({
        'pub_id': ev['pub_id'],
        'date': eff_date.strftime('%Y-%m-%d'),
        'platform': ev['platform'],
        'topic': topic,
        'title': ev['title'],
        'is_retrofit': ev['is_retrofit'],
        'pre_cat_orders': round(pre_cat_orders, 1),
        'post_cat_orders': round(post_cat_orders, 1),
        'cat_order_lift_pct': round(cat_order_lift, 1),
        'total_order_lift_pct': round(total_order_lift, 1),
        'topic_specificity_pct': round(specificity, 1),
        'cat_rev_lift_pct': round(cat_rev_lift, 1)
    })

cat_df = pd.DataFrame(category_results)
cat_df.to_csv(r'e:\SMM\scripts\category_attribution_study.csv', index=False)

print("\n--- TOPIC-SPECIFIC LIFT AGGREGATED BY TARGET TOPIC ---")
topic_agg = cat_df.groupby('topic').agg(
    pubs_count=('pub_id', 'count'),
    avg_cat_order_lift=('cat_order_lift_pct', 'mean'),
    median_cat_order_lift=('cat_order_lift_pct', 'median'),
    avg_total_order_lift=('total_order_lift_pct', 'mean'),
    avg_topic_specificity=('topic_specificity_pct', 'mean'),
    avg_cat_rev_lift=('cat_rev_lift_pct', 'mean')
)
print(topic_agg.to_string())

print("\n--- TOP 10 ARTICLES BY TOPIC-SPECIFIC ORDER LIFT ---")
top_cat = cat_df.sort_values(by='cat_order_lift_pct', ascending=False).head(10)
print(top_cat[['pub_id', 'date', 'platform', 'topic', 'cat_order_lift_pct', 'total_order_lift_pct', 'topic_specificity_pct', 'title']].to_string())

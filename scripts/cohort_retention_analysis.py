import sys
import psycopg2
import pandas as pd
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

print("=== RUNNING COHORT RETENTION & LTV ANALYSIS ===")

conn = psycopg2.connect(
    dbname='smm_erp',
    user='smm_erp_user',
    password='smm_secure_pass_123',
    host='127.0.0.1',
    port=5432
)

cohort_sql = """
WITH user_first_order AS (
    SELECT 
        user_email,
        date_trunc('month', min(created_at))::date as cohort_month,
        min(created_at) as first_order_at
    FROM orders
    WHERE site_id = 1 AND user_email IS NOT NULL AND TRIM(user_email) != ''
    GROUP BY user_email
),
order_activity AS (
    SELECT 
        o.user_email,
        u.cohort_month,
        date_trunc('month', o.created_at)::date as order_month,
        (EXTRACT(year from o.created_at) - EXTRACT(year from u.cohort_month)) * 12 + 
        (EXTRACT(month from o.created_at) - EXTRACT(month from u.cohort_month)) as month_offset,
        o.price,
        case when o.status in ('Завершен', 'Исполнен частично') then o.price else 0 end as completed_price
    FROM orders o
    JOIN user_first_order u ON o.user_email = u.user_email
    WHERE o.site_id = 1
)
SELECT 
    cohort_month,
    month_offset::int as month_offset,
    count(distinct user_email) as active_users,
    count(*) as orders_count,
    sum(completed_price) as cohort_rev
FROM order_activity
GROUP BY 1, 2
ORDER BY 1, 2;
"""

print("Executing SQL query for cohorts...")
cohort_raw_df = pd.read_sql(cohort_sql, conn)
print(f"Loaded {len(cohort_raw_df)} cohort-offset rows.")

# Pivot into Retention Table
cohort_sizes = cohort_raw_df[cohort_raw_df['month_offset'] == 0].set_index('cohort_month')['active_users']

pivot_users = cohort_raw_df.pivot(index='cohort_month', columns='month_offset', values='active_users')
pivot_retention = pivot_users.divide(cohort_sizes, axis=0) * 100

pivot_rev = cohort_raw_df.pivot(index='cohort_month', columns='month_offset', values='cohort_rev').fillna(0)
pivot_ltv = pivot_rev.cumsum(axis=1).divide(cohort_sizes, axis=0)

print("\n--- COHORT SIZES & RETENTION RATE (%) ---")
retention_display = pivot_retention[[0, 1, 2, 3, 4, 5, 6, 9, 12]].copy()
retention_display.insert(0, 'Cohort Size', cohort_sizes)
print(retention_display.round(1).to_string())

print("\n--- CUMULATIVE LTV PER USER (RUB) ---")
ltv_display = pivot_ltv[[0, 1, 2, 3, 4, 5, 6, 9, 12]].copy()
ltv_display.insert(0, 'Cohort Size', cohort_sizes)
print(ltv_display.round(2).to_string())

# Repeat order distribution
repeat_sql = """
WITH user_order_counts AS (
    SELECT 
        user_email,
        count(*) as total_orders,
        sum(case when status in ('Завершен', 'Исполнен частично') then price else 0 end) as total_spend
    FROM orders
    WHERE site_id = 1 AND user_email IS NOT NULL AND TRIM(user_email) != ''
    GROUP BY user_email
)
SELECT 
    case 
        when total_orders = 1 then '1 order (one-shot)'
        when total_orders between 2 and 5 then '2-5 orders'
        when total_orders between 6 and 20 then '6-20 orders'
        when total_orders between 21 and 50 then '21-50 orders'
        else '50+ orders (heavy users)'
    end as user_bucket,
    count(*) as user_count,
    sum(total_orders) as total_orders,
    sum(total_spend) as total_spend,
    avg(total_spend) as avg_spend_per_user
FROM user_order_counts
GROUP BY 1
ORDER BY min(total_orders);
"""

print("\n--- USER REPEAT PURCHASE DISTRIBUTION ---")
repeat_df = pd.read_sql(repeat_sql, conn)
total_users = repeat_df['user_count'].sum()
total_spend = repeat_df['total_spend'].sum()
repeat_df['pct_users'] = (repeat_df['user_count'] / total_users * 100).round(1)
repeat_df['pct_revenue'] = (repeat_df['total_spend'] / total_spend * 100).round(1)
print(repeat_df.to_string(index=False))

# Save outputs to CSV
retention_display.to_csv(r'e:\SMM\scripts\cohort_retention_table.csv')
ltv_display.to_csv(r'e:\SMM\scripts\cohort_ltv_table.csv')
repeat_df.to_csv(r'e:\SMM\scripts\user_repeat_distribution.csv', index=False)

conn.close()
print("\n=== COMPLETED COHORT ANALYSIS ===")

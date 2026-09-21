import sys
import psycopg2
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg2.connect(
    dbname='smm_erp',
    user='smm_erp_user',
    password='smm_secure_pass_123',
    host='127.0.0.1',
    port=5432
)

q = """
SELECT 
    date_trunc('month', created_at)::date as month,
    count(*) as new_users
FROM users
WHERE site_id IN (14, 15, 16)
GROUP BY 1
ORDER BY 1;
"""
df = pd.read_sql(q, conn)
print('=== SMMplan Combined (sites 14+15+16) Monthly New User Acquisition ===')
print(df.to_string(index=False))

total_users = 12990 + 31473 + 15904
total_rev = 3187423.09 + 8111371.01 + 3244231.81
print(f'\nTotal buyers (sites 14+15+16): {total_users:,} users')
print(f'Total revenue (sites 14+15+16): {total_rev:,.2f} RUB')

# Peak month
peak_idx = df['new_users'].idxmax()
peak_month = df.loc[peak_idx, 'month']
peak_users = df.loc[peak_idx, 'new_users']
print(f'Peak month: {peak_month} with {peak_users:,} new users')

conn.close()

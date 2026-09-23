import sys
import pandas as pd
import openpyxl
import re

sys.stdout.reconfigure(encoding='utf-8')

excel_path = r'C:\Users\ZVER\OneDrive\Документы\primelike_ad_audit_v2.xlsx'

# 1. Parse 'Рекламные публикации'
df_pubs = pd.read_excel(excel_path, sheet_name='Рекламные публикации', skiprows=2)

def parse_date(val):
    if pd.isna(val):
        return None
    val_str = str(val).strip()
    if val_str in ['—', '-', '']:
        return None
    # match DD.MM.YYYY
    m = re.match(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', val_str)
    if m:
        d, m, y = m.groups()
        return f"{y}-{int(m):02d}-{int(d):02d}"
    # match MM.YYYY
    m = re.match(r'(\d{1,2})\.(\d{4})', val_str)
    if m:
        m, y = m.groups()
        return f"{y}-{int(m):02d}-01"
    return None

df_clean = []
for idx, r in df_pubs.iterrows():
    num = r['№']
    if pd.isna(num):
        continue
    pub_raw = r['Дата публикации']
    upd_raw = r['Дата обновления']
    pub_date = parse_date(pub_raw)
    upd_date = parse_date(upd_raw)
    site = str(r['Площадка']).strip() if pd.notna(r['Площадка']) else ''
    author = str(r['Автор / сообщество']).strip() if pd.notna(r['Автор / сообщество']) else ''
    fmt = str(r['Формат']).strip() if pd.notna(r['Формат']) else ''
    title = str(r['Заголовок']).strip() if pd.notna(r['Заголовок']) else ''
    url = str(r['URL']).strip() if pd.notna(r['URL']) else ''
    pos = str(r['Позиция PrimeLike']).strip() if pd.notna(r['Позиция PrimeLike']) else ''
    promo = str(r['Промокод / ссылка']).strip() if pd.notna(r['Промокод / ссылка']) else ''
    status = str(r['Статус']).strip() if pd.notna(r['Статус']) else ''
    note = str(r['Примечание']).strip() if pd.notna(r['Примечание']) else ''
    
    is_retrofit = 'ретрофиттинг' in note.lower() or 'ретрофит' in note.lower()
    
    # Effective date when PrimeLike was exposed to users:
    if is_retrofit and upd_date:
        effective_date = upd_date
    else:
        effective_date = pub_date or upd_date
        
    df_clean.append({
        'id': int(num),
        'pub_date_raw': pub_raw,
        'upd_date_raw': upd_raw,
        'pub_date': pub_date,
        'upd_date': upd_date,
        'effective_date': effective_date,
        'platform': site,
        'author': author,
        'format': fmt,
        'title': title,
        'url': url,
        'position': pos,
        'promo': promo,
        'status': status,
        'is_retrofit': is_retrofit,
        'note': note
    })

pubs_df = pd.DataFrame(df_clean)
print(f"Loaded {len(pubs_df)} publications successfully.")
print("\nSample rows:")
print(pubs_df[['id', 'pub_date', 'upd_date', 'effective_date', 'platform', 'is_retrofit', 'title']].head(10).to_string())

# Check breakdown by effective_month
pubs_df['effective_date_dt'] = pd.to_datetime(pubs_df['effective_date'])
pubs_df['effective_month'] = pubs_df['effective_date_dt'].dt.to_period('M')

print("\nPublications by Effective Month (when PrimeLike was actually live in the article):")
print(pubs_df['effective_month'].value_counts().sort_index())

print("\nBreakdown by Platform:")
print(pubs_df['platform'].value_counts())

print("\nRetrofit vs New Publications:")
print(pubs_df['is_retrofit'].value_counts())

# Save clean CSV for analysis
pubs_df.to_csv(r'e:\SMM\scripts\parsed_publications.csv', index=False, encoding='utf-8')
print("\nSaved parsed publications to e:\SMM\scripts\parsed_publications.csv")

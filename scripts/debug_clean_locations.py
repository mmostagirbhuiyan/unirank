import pandas as pd
import re
import argparse

# Mapping dictionary from usnews_direct_extractor_selenium.py
COUNTRY_MAPPING = {
    'cambridge (u.s.)': 'United States',
    'cambridge': 'United States',
    'stanford': 'United States',
    'new haven': 'United States',
    'princeton': 'United States',
    'berkeley': 'United States',
    'los angeles': 'United States',
    'ann arbor': 'United States',
    'seattle': 'United States',
    'philadelphia': 'United States',
    'chicago': 'United States',
    'boston': 'United States',
    'new york': 'United States',
    'baltimore': 'United States',
    'atlanta': 'United States',
    'durham': 'United States',
    'ithaca': 'United States',
    'oxford': 'United Kingdom',
    'cambridge (u.k.)': 'United Kingdom',
    'london': 'United Kingdom',
    'edinburgh': 'United Kingdom',
    'glasgow': 'United Kingdom',
    'toronto': 'Canada',
    'vancouver': 'Canada',
    'montreal': 'Canada',
    'sydney': 'Australia',
    'melbourne': 'Australia',
    'canberra': 'Australia',
    'zurich': 'Switzerland',
    'beijing': 'China',
    'shanghai': 'China',
    'hong kong': 'Hong Kong',
    'singapore': 'Singapore',
    'tokyo': 'Japan',
    'kyoto': 'Japan',
    'munich': 'Germany',
    'berlin': 'Germany',
    'heidelberg': 'Germany',
    'paris': 'France',
    'stockholm': 'Sweden',
    'copenhagen': 'Denmark',
    'oslo': 'Norway',
    'helsinki': 'Finland',
    'amsterdam': 'Netherlands',
    'utrecht': 'Netherlands',
    'milan': 'Italy',
    'rome': 'Italy',
    'madrid': 'Spain',
    'barcelona': 'Spain',
    'vienna': 'Austria',
    'brussels': 'Belgium',
    'tel aviv': 'Israel',
    'jerusalem': 'Israel',
    'seoul': 'South Korea',
    'taipei': 'Taiwan',
    'mumbai': 'India',
    'delhi': 'India',
    'bangalore': 'India',
    'são paulo': 'Brazil',
    'rio de janeiro': 'Brazil',
    'mexico city': 'Mexico'
}

COUNTRY_PATTERNS = {
    'United States': ['u.s.', 'usa', 'america', 'states'],
    'United Kingdom': ['u.k.', 'uk', 'britain', 'england', 'scotland', 'wales'],
    'China': ['prc', 'mainland china'],
    'South Korea': ['korea', 'republic of korea'],
    'Taiwan': ['republic of china', 'roc'],
    'Hong Kong': ['hk', 'hong kong sar']
}

def normalize_country(raw):
    if not isinstance(raw, str):
        return raw

    text = re.sub(r'\|.*', '', raw)
    text = re.sub(r',.*', '', text)
    text = text.strip()
    lower = text.lower()

    if lower in COUNTRY_MAPPING:
        return COUNTRY_MAPPING[lower]

    for country, patterns in COUNTRY_PATTERNS.items():
        for p in patterns:
            if p in lower:
                return country

    for mapped in set(COUNTRY_MAPPING.values()):
        if mapped.lower() in lower:
            return mapped

    return text.title()


def clean_file(input_csv, output_csv):
    df = pd.read_csv(input_csv)
    if 'Country' not in df.columns:
        raise ValueError('CSV must contain Country column')

    df['Country'] = df['Country'].apply(normalize_country)
    df.to_csv(output_csv, index=False)


def main():
    parser = argparse.ArgumentParser(description='Clean existing USNews CSV country fields')
    parser.add_argument('input_csv', help='Input CSV path')
    parser.add_argument('-o', '--output', default='usnews_rankings_clean.csv', help='Output CSV path')
    args = parser.parse_args()
    clean_file(args.input_csv, args.output)
    print(f"Cleaned CSV written to {args.output}")

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Simplified scraper for US News Global University Rankings using the site's Next.js data."""

import argparse
import json
import logging
import re
from typing import List

import pandas as pd
import requests

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class USNewsNextExtractor:
    BASE_URL = "https://www.usnews.com/education/best-global-universities/rankings"

    def __init__(self, max_entries: int = 1000):
        self.max_entries = max_entries
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        })

    def _fetch_next_data(self) -> dict:
        resp = self.session.get(self.BASE_URL, timeout=30)
        resp.raise_for_status()
        m = re.search(r'"buildId":"([^"]+)"', resp.text)
        if not m:
            raise RuntimeError("Could not locate Next.js buildId on page")
        build_id = m.group(1)
        logging.info("Discovered build id: %s", build_id)
        data_url = f"https://www.usnews.com/_next/data/{build_id}/education/best-global-universities/rankings.json"
        logging.info("Fetching JSON from %s", data_url)
        j = self.session.get(data_url, timeout=30)
        j.raise_for_status()
        return j.json()

    def _search_rankings_list(self, obj) -> List[dict]:
        if isinstance(obj, list):
            if obj and isinstance(obj[0], dict):
                keys = obj[0].keys()
                if {'rank', 'name'}.issubset(keys) or {'rank', 'university'}.issubset(keys):
                    return obj
            for item in obj:
                res = self._search_rankings_list(item)
                if res:
                    return res
        elif isinstance(obj, dict):
            for value in obj.values():
                res = self._search_rankings_list(value)
                if res:
                    return res
        return []

    def extract_rankings(self) -> pd.DataFrame:
        data = self._fetch_next_data()
        rankings = self._search_rankings_list(data)
        if not rankings:
            raise RuntimeError("Could not locate rankings data in JSON")
        df = pd.DataFrame(rankings)
        # Normalise columns
        if 'name' in df.columns and 'university' not in df.columns:
            df.rename(columns={'name': 'University'}, inplace=True)
        if 'university' in df.columns:
            df.rename(columns={'university': 'University'}, inplace=True)
        if 'rank' in df.columns:
            df.rename(columns={'rank': 'Rank'}, inplace=True)
        if 'country' in df.columns:
            df.rename(columns={'country': 'Country'}, inplace=True)
        df = df[['Rank', 'University', 'Country']].head(self.max_entries)
        df.sort_values('Rank', inplace=True)
        return df

    def save_csv(self, df: pd.DataFrame, path: str) -> None:
        df.to_csv(path, index=False)
        logging.info("Saved %d rows to %s", len(df), path)


def main():
    parser = argparse.ArgumentParser(description="Extract US News rankings via Next.js JSON")
    parser.add_argument('-o', '--output', default='../frontend/public/data/usnews_rankings.csv')
    parser.add_argument('-n', '--max-entries', type=int, default=1000)
    args = parser.parse_args()

    extractor = USNewsNextExtractor(max_entries=args.max_entries)
    df = extractor.extract_rankings()
    extractor.save_csv(df, args.output)
    print(f"Saved {len(df)} rankings to {args.output}")


if __name__ == '__main__':
    main()

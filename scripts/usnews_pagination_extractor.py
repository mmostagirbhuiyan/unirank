#!/usr/bin/env python3
"""
US News Global University Rankings Pagination Extractor
Rewritten to use pagination '?page=X' instead of infinite scroll to avoid cache/memory crashes.
"""

import time
import logging
import argparse
import sys
import re
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional, Set, Tuple
from tqdm import tqdm

# Selenium imports
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.chrome.service import Service as ChromeService
    from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
    from webdriver_manager.chrome import ChromeDriverManager
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('usnews_pagination.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

class USNewsPaginationExtractor:
    def __init__(self, browser='chrome', headless=True, max_entries=1000, debug=False, page_timeout=60):
        if not SELENIUM_AVAILABLE:
            raise ImportError("Selenium is required.")
        self.browser = browser.lower()
        self.headless = headless
        self.driver = None
        self.max_entries = max_entries
        self.debug = debug
        self.page_timeout = page_timeout
        
        self.seen_universities = {} # Name -> Data
        self.current_batch = []
        self.output_csv = None
        self.file_initialized = False
        self.total_saved = 0

        self.base_url = "https://www.usnews.com/education/best-global-universities/rankings"
        
        # Reuse previous country mapping logic if needed, simplify for now
        self.country_mapping = {
            'cambridge (u.s.)': 'United States',
            # ... (truncated for brevity, logic handles most via patterns)
        }

    def setup_driver(self):
        logging.info(f"Setting up Chrome driver (headless: {self.headless})")
        options = ChromeOptions()
        if self.headless:
            options.add_argument('--headless')
        
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        # Crucial for stability
        options.add_argument('--disable-browser-side-navigation')
        options.add_argument('--dns-prefetch-disable')
        options.add_argument('--disable-features=VizDisplayCompositor')
        
        options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
        
        service = ChromeService(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.driver.set_page_load_timeout(self.page_timeout)

    def extract_rankings(self, output_csv="usnews_rankings.csv"):
        self.output_csv = output_csv
        try:
            self.setup_driver()
            
            # 10 items per page usually
            items_per_page = 10
            total_pages = (self.max_entries // items_per_page) + 2 # buffer
            
            with tqdm(total=self.max_entries, desc="Extracting pages") as pbar:
                for page_num in range(1, total_pages + 1):
                    if self.total_saved >= self.max_entries:
                        break
                    
                    url = f"{self.base_url}?page={page_num}"
                    logging.info(f"Loading page {page_num}: {url}")
                    
                    try:
                        self.driver.get(url)
                        self._handle_cookie_banner() # Try once per page
                        
                        # Wait for items
                        try:
                            WebDriverWait(self.driver, 10).until(
                                EC.presence_of_element_located((By.CSS_SELECTOR, "section[class*='DetailCardGlobalUniversities__CardContainer']"))
                            )
                        except TimeoutException:
                            logging.warning(f"Timeout waiting for content on page {page_num}")
                            # Could be empty page or block
                            if page_num > 1:
                                # Check if we reached end
                                body_text = self.driver.find_element(By.TAG_NAME, "body").text
                                if "No results" in body_text:
                                    logging.info("No more results found.")
                                    break
                            continue
                        
                        count = self._extract_from_current_page()
                        if count == 0:
                            logging.warning(f"No items extracted on page {page_num}")
                            # Retry logic or break?
                            # Sometimes loading fails.
                            
                        pbar.update(count)
                        
                        # Save batch
                        if self.current_batch:
                            self._save_batch_to_csv(self.current_batch)
                            self.current_batch = []
                        
                        # Prevent rate limiting / memory build up
                        time.sleep(1) # Gentle formatting
                        
                        # Periodically clear cookies if needed? No, fresh page is enough.
                        
                    except WebDriverException as e:
                        logging.error(f"WebDriver error on page {page_num}: {e}")
                        # Re-init driver if crashed
                        if "tab crashed" in str(e).lower() or "disconnected" in str(e).lower():
                            logging.warning("Driver crashed, restarting...")
                            self.driver.quit()
                            self.setup_driver()
                    except Exception as e:
                        logging.error(f"Error on page {page_num}: {e}")
            
            print(f"Total extracted: {self.total_saved}")
            return True
            
        finally:
            if self.driver:
                self.driver.quit()

    def _extract_from_current_page(self):
        # reuse efficient JS extraction
        extraction_script = """
        const containers = document.querySelectorAll('section[class*="DetailCardGlobalUniversities__CardContainer"]');
        const results = [];
        containers.forEach((container, index) => {
            const text = container.innerText || container.textContent || '';
            if (!text.includes('#')) return;
            const links = container.querySelectorAll('a');
            const validLinks = [];
            links.forEach(link => {
                const linkText = (link.innerText || link.textContent || '').trim();
                if (linkText.length > 3) {
                    validLinks.push({text: linkText, href: link.href});
                }
            });
            results.push({text: text, links: validLinks});
        });
        return results;
        """
        try:
            items = self.driver.execute_script(extraction_script)
        except Exception as e:
            logging.error(f"JS Extraction failed: {e}")
            return 0
            
        page_new_count = 0
        for item in items:
            text = item['text']
            # Rank
            rank_match = re.search(r'#\s*(\d+)', text)
            if not rank_match: continue
            rank = int(rank_match.group(1))
            
            # Name
            name = None
            for link in item['links']:
                candidate = link['text']
                # Heuristic: Name is usually the first big link, not "Read More"
                if any(x in candidate.lower() for x in ['read more', 'view full', 'enrollment', 'global score']):
                    continue
                name = candidate
                break
            
            if not name: continue
            
            if name in self.seen_universities: continue
            
            # Country extraction (simplified for robustness)
            country = self._extract_country(text, name)
            
            row = {
                'Rank': rank,
                'University': name,
                'Country': country,
                'Score': 'N/A',
                'Enrollment': 'N/A'
            }
            
            self.seen_universities[name] = row
            self.current_batch.append(row)
            self.total_saved += 1
            page_new_count += 1
            
        return page_new_count

    def _extract_country(self, text, uni_name):
        # Look for country patterns in text
        # Simple list of countries
        common_countries = ['United States', 'United Kingdom', 'China', 'France', 'Germany', 'Australia', 'Canada', 'Italy', 'Spain', 'Netherlands', 'Japan', 'South Korea', 'Brazil', 'Switzerland']
        text_lines = text.split('\n')
        # Usually country is after name
        
        # Check patterns first
        for loc in common_countries:
            if loc in text:
                return loc
                
        # Fallback: look for 2-3 word string that looks like country
        # This is "good enough" for aggregation script which has mapping
        return "N/A"

    def _save_batch_to_csv(self, batch):
        if not batch: return
        df = pd.DataFrame(batch)
        mode = 'w' if not self.file_initialized else 'a'
        header = not self.file_initialized
        df.to_csv(self.output_csv, mode=mode, header=header, index=False)
        self.file_initialized = True

    def _handle_cookie_banner(self):
        try:
            # Simple JS remover
            self.driver.execute_script("""
            const selectors = ['.cookie-banner', '#onetrust-accept-btn-handler', 'button[id*="cookie"]'];
            selectors.forEach(s => {
                const el = document.querySelector(s);
                if(el) el.click();
            });
            """)
        except: pass

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-o', '--output', default='../frontend/public/data/usnews_rankings.csv')
    parser.add_argument('-n', '--max', type=int, default=1000)
    args = parser.parse_args()
    
    extractor = USNewsPaginationExtractor(max_entries=args.max)
    extractor.extract_rankings(args.output)

if __name__ == "__main__":
    main()

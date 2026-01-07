#!/usr/bin/env python3
"""
US News Rankings Extractor - Memory Efficient Version
Strategies:
1. Aggressive DOM Cleaning: Delete items immediately after extraction to keep DOM size constant.
2. Incremental CSV Saving.
3. optimized selectors.
"""

import time
import logging
import argparse
import sys
import re
import pandas as pd
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, WebDriverException

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

class USNewsEfficientExtractor:
    def __init__(self, headless=True, max_entries=1000):
        self.max_entries = max_entries
        self.current_count = 0
        self.output_file = Path("usnews_rankings.csv")
        self.seen_names = set()
        
        # Load existing progress if any
        if self.output_file.exists():
            try:
                df = pd.read_csv(self.output_file)
                self.seen_names = set(df['University'].values)
                self.current_count = len(df)
                logging.info(f"Resuming from {self.current_count} entries")
            except: pass

        # Setup Driver
        options = Options()
        if headless:
            options.add_argument('--headless=new') # New headless mode is more stable
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--blink-settings=imagesEnabled=false') # Block images
        options.add_argument('--disk-cache-dir=/tmp/cache') # Force cache to disk not memory
        
        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options
        )
        self.driver.set_page_load_timeout(60)

    def run(self):
        try:
            url = "https://www.usnews.com/education/best-global-universities/rankings"
            logging.info(f"Loading {url}")
            self.driver.get(url)
            self._handle_cookie()
            
            # Initial Wait
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "section[class*='CardContainer']"))
            )
            
            patience = 0
            while self.current_count < self.max_entries:
                # 1. Extract CURRENT visible items
                new_items = self._extract_visible_items()
                
                # 2. Save NEW items
                if new_items:
                    self._save_items(new_items)
                    patience = 0
                    logging.info(f"Extracted {len(new_items)} items. Total: {self.current_count}/{self.max_entries}")
                
                # 3. Prune DOM (Delete extracted items)
                # We delete ALL items that look like university cards to keep the page light.
                self.driver.execute_script("""
                    const cards = document.querySelectorAll('section[class*="DetailCardGlobalUniversities__CardContainer"]');
                    cards.forEach(card => {
                        # Remove the parent <li class="item-list"> if possible, or just the card
                        const li = card.closest('li');
                        if(li) li.remove();
                        else card.remove();
                    });
                """)
                
                # 4. Click Load More
                clicked = self._click_load_more()
                if not clicked:
                    patience += 1
                    logging.warning(f"Load More not found/clickable. Patience: {patience}")
                    if patience > 5:
                        logging.info("Stopping due to repeated failures.")
                        break
                    time.sleep(2)
                else:
                    # Wait for NEW content to appear
                    # Since we deleted everything, any CardContainer is new content!
                    try:
                        WebDriverWait(self.driver, 10).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, "section[class*='CardContainer']"))
                        )
                    except TimeoutException:
                        # Sometimes it takes a while or network lag
                        time.sleep(2)
                        
        except KeyboardInterrupt:
            logging.info("Stopped by user.")
        except Exception as e:
            logging.error(f"Critical Error: {e}")
        finally:
            self.driver.quit()
            logging.info("Driver closed.")

    def _extract_visible_items(self):
        script = """
        const items = [];
        const cards = document.querySelectorAll('section[class*="DetailCardGlobalUniversities__CardContainer"]');
        cards.forEach(card => {
            const text = card.innerText || '';
            const links = Array.from(card.querySelectorAll('a')).map(a => ({text: a.innerText, href: a.href}));
            items.push({text: text, links: links});
        });
        return items;
        """
        raw_items = self.driver.execute_script(script)
        
        parsed_items = []
        for item in raw_items:
            # Parse Logic (Simplified)
            text = item['text']
            rank_match = re.search(r'#\s*(\d+)', text)
            if not rank_match: continue
            rank = int(rank_match.group(1))
            
            name = None
            for link in item['links']:
                if len(link['text']) > 4 and "Read" not in link['text']:
                    name = link['text']
                    break
            if not name or name in self.seen_names: continue
            
            # Country
            country = "N/A"
            # Basic mapping
            countries = ['United States', 'United Kingdom', 'China', 'France', 'Germany', 'Australia', 'Canada', 'Italy', 'Spain', 'Netherlands']
            for c in countries:
                if c in text:
                    country = c
                    break
            
            parsed_items.append({
                'Rank': rank,
                'University': name,
                'Country': country,
                'Score': 'N/A',
                'Enrollment': 'N/A'
            })
            self.seen_names.add(name)
            
        return parsed_items

    def _save_items(self, items):
        if not items: return
        df = pd.DataFrame(items)
        header = not self.output_file.exists()
        df.to_csv(self.output_file, mode='a', header=header, index=False)
        self.current_count += len(items)

    def _click_load_more(self):
        # Optimized clicker
        try:
            # First, clear modals
            self.driver.execute_script("document.querySelectorAll('.modal, [role=dialog]').forEach(e => e.remove());")
            
            # Find button by simple text locator (fastest)
            xpath = "//button[contains(translate(text(), 'L', 'l'), 'load more')]"
            buttons = self.driver.find_elements(By.XPATH, xpath)
            for btn in buttons:
                if btn.is_displayed():
                    self.driver.execute_script("arguments[0].click();", btn)
                    return True
            
            # Fallback ID
            btn = self.driver.find_element(By.ID, "load-more-button")
            self.driver.execute_script("arguments[0].click();", btn)
            return True
        except:
            return False

    def _handle_cookie(self):
        time.sleep(2)
        try:
            self.driver.execute_script("document.querySelectorAll('.cookie-banner, #onetrust-accept-btn-handler').forEach(e => e.click());")
        except: pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--headless', action='store_true', default=True)
    args = parser.parse_args()
    
    extractor = USNewsEfficientExtractor(headless=args.headless)
    extractor.run()

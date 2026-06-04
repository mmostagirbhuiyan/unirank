
import logging
import time
import re
import os
import pandas as pd
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# Configure logging - Console AND File
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("usnews_playwright.log"),
        logging.StreamHandler()
    ]
)

OUTPUT_CSV = "frontend/public/data/usnews_rankings.csv"
MAX_ENTRIES = 1200  # Target slightly more than 1000 to be safe
ITEMS_PER_PAGE = 10 # Estimated

class USNewsPlaywrightExtractor:
    def __init__(self):
        self.seen_universities = set()
        self.all_data = []
        # Force fresh start to avoid infinite scroll sync issues
        if os.path.exists(OUTPUT_CSV):
            logging.info("Starting fresh scrape (overwriting existing file)...")
            try:
                os.remove(OUTPUT_CSV)
            except: pass
    
    def run(self):
        try:
            with sync_playwright() as p:
                # Launch browser
                logging.info("Launching Playwright (Firefox)...")
                browser = p.firefox.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0",
                    viewport={"width": 1920, "height": 1080},
                    extra_http_headers={
                        "Accept-Language": "en-US,en;q=0.5",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
                    }
                )
                
                context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                page = context.new_page()

                # Navigate
                url = "https://www.usnews.com/education/best-global-universities/rankings"
                logging.info(f"Navigating to {url}")
                
                page.goto(url, timeout=60000, wait_until="commit")
                logging.info("Page commit reached. Waiting 5s...")
                time.sleep(5)

                self._handle_cookie_banner(page)

                # Main Loop
                logging.info("Waiting for initial data to appear...")
                try:
                    page.wait_for_selector("section[class*='DetailCardGlobalUniversities__CardContainer']", timeout=30000)
                    logging.info("Initial data found.")
                except Exception as e:
                    logging.error(f"Failed to find initial data: {e}")
                    page.screenshot(path="debug_failed_initial_data.png")
                    raise e

                no_new_data_count = 0
                
                while len(self.all_data) < MAX_ENTRIES:
                    
                    # Scroll to bottom to trigger lazy loads / make button clickable
                    # Use a smoother scroll for better JS triggers
                    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    time.sleep(1)
                    
                    # 1. Extract CURRENT visible items
                    new_count = self._extract_items(page)
                    
                    logging.info(f"Progress: {len(self.all_data)}/{MAX_ENTRIES} universities collected (New: {new_count})")
                    
                    if new_count > 0:
                        self._save_csv() # Save incrementally
                        no_new_data_count = 0
                    else:
                        no_new_data_count += 1
                        logging.warning(f"No new items found. Stuck count: {no_new_data_count}")
                        
                        # Debugging state
                        if no_new_data_count == 3:
                            page.screenshot(path="stuck_debug.png")
                            # Check if we are blocked
                            body_text = page.inner_text("body").lower()
                            if "register" in body_text or "sign in" in body_text:
                                logging.warning("Potential login wall detected.")
                        
                        if no_new_data_count >= 10:
                            logging.error("Stuck for too long. Stopping.")
                            break

                    if len(self.all_data) >= MAX_ENTRIES:
                        break

                    # 2. Click "Load More"
                    clicked = self._click_load_more(page)
                    
                    if clicked:
                        time.sleep(3)  
                    else:
                        time.sleep(2)
                        
                    self._handle_modals(page)

                self._save_csv()
                browser.close()
                logging.info("Browser closed.")
        except Exception as e:
            logging.error(f"Global Crash: {e}")
            import traceback
            traceback.print_exc()

    def _extract_items(self, page):
        # We run JS in browser to get all items quickly
        # We only return NEW items to add to our list
        
        # This script extracts all currently visible cards
        # We process them in Python to dedup
        
        items = page.evaluate("""() => {
            const cards = Array.from(document.querySelectorAll('section[class*="DetailCardGlobalUniversities__CardContainer"]'));
            return cards.map(card => {
                const text = card.innerText;
                const links = Array.from(card.querySelectorAll('a')).map(a => ({text: a.innerText, href: a.href}));
                return {text, links};
            });
        }""")

        added_count = 0
        for item in items:
            text = item['text']
            
            # Extract Rank
            rank_match = re.search(r'#\s*(\d+)', text)
            if not rank_match: continue
            rank = int(rank_match.group(1))
            
            # Extract Name
            name = None
            for link in item['links']:
                t = link['text']
                # Heuristics for name
                if len(t) > 3 and not any(x in t.lower() for x in ['read more', 'view', 'score', 'enrollment']):
                    name = t
                    break
            
            if not name: continue
            
            # Unique Key: Name
            if name in self.seen_universities:
                continue
                
            self.seen_universities.add(name)
            
            # Country Extraction
            # Comprehensive list covering all ~90+ countries in US News global rankings.
            # Ordered longest-first within shared prefixes to avoid false matches
            # (e.g., "New Zealand" before "New", "South Korea" before "South Africa").
            country = "N/A"
            common_countries = [
                # Americas
                'United States', 'Canada', 'Brazil', 'Argentina', 'Chile', 'Colombia',
                'Mexico', 'Peru', 'Uruguay', 'Venezuela', 'Costa Rica', 'Cuba', 'Ecuador',
                # Europe
                'United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Netherlands',
                'Switzerland', 'Sweden', 'Denmark', 'Belgium', 'Norway', 'Finland',
                'Austria', 'Ireland', 'Portugal', 'Poland', 'Czech Republic', 'Greece',
                'Hungary', 'Romania', 'Croatia', 'Serbia', 'Slovakia', 'Slovenia',
                'Estonia', 'Lithuania', 'Latvia', 'Luxembourg', 'Iceland', 'Bulgaria',
                'Cyprus', 'Northern Cyprus', 'Malta', 'Belarus', 'Ukraine', 'Georgia',
                'Russia',
                # Asia
                'South Korea', 'China', 'Japan', 'Singapore', 'Hong Kong', 'Macao',
                'Taiwan', 'India', 'Malaysia', 'Thailand', 'Indonesia', 'Philippines',
                'Viet Nam', 'Vietnam', 'Bangladesh', 'Pakistan', 'Kazakhstan',
                'Uzbekistan', 'Kyrgyzstan', 'Azerbaijan', 'Brunei',
                # Middle East
                'United Arab Emirates', 'Saudi Arabia', 'Israel', 'Turkey', 'Iran',
                'Iraq', 'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'Jordan', 'Lebanon',
                'Palestine',
                # Africa
                'South Africa', 'Egypt', 'Nigeria', 'Ghana', 'Ethiopia', 'Uganda',
                'Morocco', 'Tunisia',
                # Oceania
                'Australia', 'New Zealand',
            ]
            for c in common_countries:
                if c in text:
                    country = c
                    break
            
            self.all_data.append({
                'Rank': rank,
                'University': name,
                'Country': country,
                'Score': 'N/A',
                'Enrollment': 'N/A'
            })
            added_count += 1
            
        return added_count

    def _click_load_more(self, page):
        # Try multiple strategies to click
        try:
            # Clean possible overlays first
            self._handle_modals(page)

            # Strategy 1: JS Click on anything that looks like load more in the relevant area
            # We look for the button at the bottom of the list
            clicked = page.evaluate("""() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                for (const btn of buttons) {
                    const text = (btn.innerText || '').toLowerCase();
                    if (text.includes('load more') || text.includes('show more')) {
                        btn.scrollIntoView();
                        btn.click();
                        return true;
                    }
                }
                
                // Try specific ID
                const idBtn = document.getElementById('load-more-button');
                if (idBtn) {
                     idBtn.scrollIntoView();
                     idBtn.click();
                     return true;
                }
                return false;
            }""")
            
            if clicked:
                logging.info("Clicked 'Load More' via JS")
                return True

            # Strategy 2: Playwright locator (fallback)
            load_more = page.locator("button:has-text('Load More'), a:has-text('Load More')").first
            if load_more.is_visible():
                load_more.scroll_into_view_if_needed()
                load_more.click(force=True)
                logging.info("Clicked 'Load More' via Locator")
                return True
                
            return False
            
        except Exception as e:
            # logging.warning(f"Click warning: {e}")
            return False
    
    def _handle_cookie_banner(self, page):
        try:
            page.locator("button:has-text('Accept'), #onetrust-accept-btn-handler").click(timeout=2000)
        except:
            pass
    
    def _handle_modals(self, page):
        # Generic modal closer
        try:
            # check for close button first
            if page.locator("button[aria-label='Close'], button[title*='Close'], .modal-close").is_visible(timeout=500):
                page.locator("button[aria-label='Close'], button[title*='Close'], .modal-close").click(timeout=500)
                
            # If "Create an Account" modal covers screen
            if page.locator("text='Create an Account'").is_visible(timeout=500):
                # Try to remove it via JS if close button fails
                 page.evaluate("""() => {
                    document.querySelectorAll('div[class*="Modal"], div[role="dialog"]').forEach(e => e.remove());
                    document.querySelectorAll('div[class*="Overlay"], div[class*="Backdrop"]').forEach(e => e.remove());
                }""")
        except:
            pass

    def _save_csv(self):
        if not self.all_data:
            return
            
        df = pd.DataFrame(self.all_data)
        df.sort_values(by="Rank", inplace=True)
        df.to_csv(OUTPUT_CSV, index=False)
        # No log spam for continuous saving, just do it.

if __name__ == "__main__":
    extractor = USNewsPlaywrightExtractor()
    extractor.run()

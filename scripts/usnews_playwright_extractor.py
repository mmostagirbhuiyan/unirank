#!/usr/bin/env python3
"""
US News Global University Rankings Extractor - Playwright Version
High-performance extraction without Selenium bottlenecks
"""

import time
import logging
import argparse
import sys
import re
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional, Set
import json
import asyncio
from datetime import datetime

# Playwright imports
try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("Warning: Playwright not available. Install with: pip install playwright")
    print("Then run: playwright install chromium")

# Configure logging with cleaner format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    datefmt='%H:%M:%S',
    handlers=[
        logging.FileHandler('usnews_extractor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

class USNewsPlaywrightExtractor:
    def __init__(self, browser='chromium', headless=True, max_entries=500, debug=False, page_load_timeout=120):
        if not PLAYWRIGHT_AVAILABLE:
            raise ImportError("Playwright is required. Install with: pip install playwright && playwright install chromium")
        
        self.browser_type = browser.lower()
        self.headless = headless
        self.page = None
        self.browser = None
        self.playwright = None
        self.max_entries = max_entries
        self.debug = debug
        self.page_load_timeout = page_load_timeout * 1000  # Convert to milliseconds
        
        # Data management
        self.universities = []
        self.seen_universities = set()
        self.output_csv = None
        self.start_time = None
        
        # Progress tracking
        self.progress_bar = None
        self.last_update_time = 0
        
        # US News URL
        self.base_url = "https://www.usnews.com/education/best-global-universities/rankings"
        
        # Country mapping (same as before)
        self.country_mapping = {
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
        
    def setup_browser(self):
        """Initialize Playwright browser"""
        logging.info(f"Setting up {self.browser_type} browser (headless: {self.headless})")
        
        self.playwright = sync_playwright().start()
        
        # Browser setup
        browser_args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
        
        if self.browser_type == 'chromium':
            self.browser = self.playwright.chromium.launch(
                headless=self.headless,
                args=browser_args
            )
        elif self.browser_type == 'firefox':
            self.browser = self.playwright.firefox.launch(
                headless=self.headless
            )
        else:
            raise ValueError("Browser must be 'chromium' or 'firefox'")
            
        # Create context with viewport
        context = self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        )
        
        # Create page
        self.page = context.new_page()
        self.page.set_default_timeout(self.page_load_timeout)
        
        logging.info("Browser initialized successfully")
        
    def print_progress(self, force=False):
        """Print progress bar at bottom of screen"""
        current_time = time.time()
        
        # Update every 0.5 seconds unless forced
        if not force and current_time - self.last_update_time < 0.5:
            return
            
        self.last_update_time = current_time
        
        # Calculate progress
        progress = len(self.universities)
        percentage = (progress / self.max_entries) * 100 if self.max_entries > 0 else 0
        
        # Calculate rate
        elapsed = current_time - self.start_time if self.start_time else 1
        rate = progress / elapsed if elapsed > 0 else 0
        
        # Create progress bar
        bar_length = 40
        filled_length = int(bar_length * progress // self.max_entries)
        bar = '█' * filled_length + '░' * (bar_length - filled_length)
        
        # Clear line and print progress
        sys.stdout.write('\r')
        sys.stdout.write(f'Progress: [{bar}] {progress}/{self.max_entries} ({percentage:.1f}%) - {rate:.1f} unis/sec')
        sys.stdout.flush()
        
    def load_all_universities(self, max_wait_time=300):
        """Load and extract all universities"""
        self.start_time = time.time()
        logging.info(f"Loading US News rankings page: {self.base_url}")
        
        # Navigate to page
        try:
            self.page.goto(self.base_url, wait_until='domcontentloaded', timeout=30000)
        except PlaywrightTimeout:
            logging.warning("Initial page load timeout - continuing anyway")
            
        # Handle cookie banner
        self._handle_cookie_banner()
        
        # Wait for content
        try:
            self.page.wait_for_selector("li[class*='item-list']", timeout=15000)
            logging.info("Content loaded successfully")
        except:
            logging.warning("Content selector timeout - attempting to continue")
            
        # Extract universities with loading
        self._extract_with_loading(max_wait_time)
        
        # Final progress update
        self.print_progress(force=True)
        print()  # New line after progress bar
        
        return len(self.universities)
        
    def _handle_cookie_banner(self):
        """Handle all modals including account creation and cookie banners"""
        logging.info("Handling modals...")
        
        # Multiple attempts with different strategies
        for attempt in range(3):
            time.sleep(2)
            
            # Strategy 1: Look for close/X buttons first
            try:
                # Close button with X or Close text
                close_button = self.page.locator("button[aria-label*='Close' i], button[title*='Close' i], .close, .close-button, button:has-text('×')").first
                if close_button.is_visible(timeout=1000):
                    close_button.click()
                    logging.info("Clicked close button")
                    time.sleep(1)
                    # Check if we can see content now
                    if self._check_content_visible():
                        return
            except:
                pass
            
            # Strategy 2: ESC key to dismiss modals
            try:
                self.page.keyboard.press("Escape")
                logging.info("Pressed ESC to dismiss modal")
                time.sleep(1)
                if self._check_content_visible():
                    return
            except:
                pass
            
            # Strategy 3: JavaScript removal of all blocking elements
            try:
                self.page.evaluate("""
                    // Remove all modals and overlays
                    const selectors = [
                        '[role="dialog"]',
                        '[aria-modal="true"]',
                        '.modal',
                        '.overlay',
                        '.cookie-banner',
                        '.consent',
                        '.popup',
                        '[class*="modal"]',
                        '[class*="overlay"]',
                        '[class*="cookie"]',
                        '[class*="consent"]',
                        '[class*="banner"]',
                        '[id*="modal"]',
                        '[id*="overlay"]',
                        '[id*="cookie"]',
                        '[id*="consent"]',
                        // Account creation modal
                        'div:has(> h2:has-text("Create Account"))',
                        'div:has(> button:has-text("Continue"))'
                    ];
                    
                    selectors.forEach(selector => {
                        try {
                            document.querySelectorAll(selector).forEach(el => {
                                el.style.display = 'none';
                                el.remove();
                            });
                        } catch (e) {}
                    });
                    
                    // Remove fixed position overlays
                    document.querySelectorAll('div').forEach(div => {
                        const style = window.getComputedStyle(div);
                        if (style.position === 'fixed' && 
                            (parseInt(style.zIndex) > 1000 || 
                             style.backgroundColor.includes('rgba'))) {
                            div.remove();
                        }
                    });
                    
                    // Force enable scrolling
                    document.body.style.overflow = 'auto';
                    document.documentElement.style.overflow = 'auto';
                    document.body.style.position = 'static';
                """)
                logging.info("Removed modals via JavaScript")
                time.sleep(1)
            except:
                pass
            
            # Check if content is now visible
            if self._check_content_visible():
                return
                
        logging.warning("Could not fully dismiss modals, attempting to continue anyway")
    
    def _check_content_visible(self):
        """Check if university content is visible"""
        try:
            return self.page.locator("li[class*='item-list']").first.is_visible(timeout=1000)
        except:
            return False
            
    def _extract_with_loading(self, max_wait_time):
        """Extract universities with automatic loading"""
        start_time = time.time()
        no_new_data_count = 0
        
        logging.info("Starting extraction...")
        
        # Initial wait for content
        try:
            self.page.wait_for_selector("li[class*='item-list']", timeout=10000)
        except:
            logging.warning("Initial content not found, checking page state...")
            # Debug what's on the page
            page_text = self.page.inner_text("body")[:500]
            logging.debug(f"Page content preview: {page_text}")
            
        while time.time() - start_time < max_wait_time:
            # Extract current batch
            new_count = self._extract_visible_universities()
            
            if new_count > 0:
                no_new_data_count = 0
            else:
                no_new_data_count += 1
                if no_new_data_count > 5:
                    # Before giving up, try one more modal removal
                    if no_new_data_count == 6:
                        logging.info("Attempting final modal cleanup...")
                        self._handle_cookie_banner()
                        continue
                    logging.info("No new data found after multiple attempts - extraction complete")
                    break
                    
            # Check if we've reached target
            if len(self.universities) >= self.max_entries:
                logging.info(f"Reached target of {self.max_entries} universities")
                break
                
            # Scroll and load more
            if not self._scroll_and_load_more():
                # If load more fails, try scrolling anyway
                self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(2)
                
    def _extract_visible_universities(self):
        """Extract universities using Playwright's efficient selectors"""
        # Get all data in one JavaScript call - this is where Playwright shines
        extracted_data = self.page.evaluate("""
            () => {
                const containers = document.querySelectorAll('li[class*="item-list"]');
                const results = [];
                
                containers.forEach((container) => {
                    const text = container.innerText || '';
                    if (!text.includes('#')) return;
                    
                    // Extract rank
                    const rankMatch = text.match(/#\s*(\d+)/);
                    if (!rankMatch) return;
                    
                    // Find university link
                    const link = container.querySelector('a[href*="/education/best-global-universities/"]');
                    if (!link) return;
                    
                    const linkText = link.innerText.trim();
                    if (!linkText || linkText.length < 4) return;
                    
                    // Skip navigation links
                    if (/read more|view|rankings|methodology|news/i.test(linkText)) return;
                    
                    results.push({
                        rank: parseInt(rankMatch[1]),
                        name: linkText,
                        containerText: text,
                        href: link.href
                    });
                });
                
                return results;
            }
        """)
        
        # Process extracted data
        new_count = 0
        for data in extracted_data:
            # Skip if already seen
            if data['name'] in self.seen_universities:
                continue
                
            # Extract country
            country = self._extract_country(data['containerText'], data['name'])
            
            # Add university
            self.universities.append({
                'Rank': data['rank'],
                'University': data['name'],
                'Country': country,
                'Score': 'N/A',
                'Enrollment': 'N/A'
            })
            
            self.seen_universities.add(data['name'])
            new_count += 1
            
            # Update progress
            self.print_progress()
            
            # Stop if we've reached the limit
            if len(self.universities) >= self.max_entries:
                break
                
        if new_count > 0:
            logging.info(f"Extracted {new_count} new universities (total: {len(self.universities)})")
            
        return new_count
        
    def _scroll_and_load_more(self):
        """Scroll and click load more button with improved detection"""
        # First scroll to bottom smoothly
        self.page.evaluate("""
            window.scrollTo({ 
                top: document.body.scrollHeight, 
                behavior: 'smooth' 
            });
        """)
        time.sleep(1)
        
        # Try to find and click load more button
        load_more_clicked = False
        
        # Multiple button text patterns to try
        button_patterns = [
            "Load More",
            "Show More", 
            "View More",
            "Loading...",
            "loading",
            "load more"
        ]
        
        for pattern in button_patterns:
            try:
                # Try case-insensitive search
                load_more = self.page.locator("button").filter(has_text=re.compile(pattern, re.I)).first
                
                if load_more.is_visible(timeout=1000):
                    # Scroll button into view first
                    load_more.scroll_into_view_if_needed()
                    time.sleep(0.5)
                    load_more.click()
                    logging.info(f"Clicked '{pattern}' button")
                    load_more_clicked = True
                    break
            except:
                continue
        
        if load_more_clicked:
            # Wait for new content to load
            time.sleep(3)
            return True
        else:
            # Even without button, scroll might trigger lazy loading
            return True
        
    def _extract_country(self, container_text, university_name):
        """Extract country from container text"""
        lines = [line.strip() for line in container_text.split('\n') if line.strip()]
        
        # Find university name line
        uni_index = -1
        for i, line in enumerate(lines):
            if university_name in line:
                uni_index = i
                break
                
        # Look for country after university name
        if uni_index >= 0:
            for i in range(uni_index + 1, min(uni_index + 4, len(lines))):
                line = lines[i]
                
                # Skip non-location lines
                if any(skip in line.lower() for skip in ['#', 'score', 'enrollment', 'read more', 'global', 'rank']):
                    continue
                    
                # Check if location
                if self._is_likely_location(line):
                    mapped = self._map_location_to_country(line)
                    if mapped != 'N/A':
                        return mapped
                        
                    cleaned = self._clean_location_text(line)
                    if cleaned and len(cleaned) > 2:
                        return cleaned
                        
        return 'N/A'
        
    def _is_likely_location(self, text):
        """Check if text is likely a location"""
        text_lower = text.lower().strip()
        
        # Skip patterns
        skip_patterns = [
            r'^\d+$', r'global score', r'enrollment', r'founded',
            r'read more', r'^#\d+', r'best global', r'universities', r'rank'
        ]
        
        for pattern in skip_patterns:
            if re.search(pattern, text_lower):
                return False
                
        # Location indicators
        location_indicators = [
            r'\b(u\.s\.)\b', r'\b(u\.k\.)\b',
            r'\b(united states|united kingdom|canada|australia|germany|france|china|japan|india|brazil|italy|spain|netherlands|sweden|switzerland|belgium|austria|denmark|norway|finland|singapore|hong kong|south korea|taiwan|israel|mexico)\b',
            r'\b(cambridge|oxford|london|paris|tokyo|beijing|sydney|toronto|munich|zurich|stockholm|amsterdam|copenhagen|vienna|brussels|madrid|barcelona|milan|rome)\b'
        ]
        
        for pattern in location_indicators:
            if re.search(pattern, text_lower):
                return True
                
        # Short capitalized phrase
        if len(text.split()) <= 3 and text[0].isupper() and not any(char.isdigit() for char in text) and len(text) > 2:
            return True
            
        return False
        
    def _map_location_to_country(self, location_text):
        """Map location to country name"""
        location_lower = location_text.lower().strip()
        location_lower = re.sub(r'\s*\(.*?\)\s*', '', location_lower)
        location_lower = re.sub(r'\s*-.*$', '', location_lower).strip()
        
        # Direct mapping
        if location_lower in self.country_mapping:
            return self.country_mapping[location_lower]
            
        # Pattern matching
        country_patterns = {
            'United States': ['u.s.', 'usa', 'america', 'states'],
            'United Kingdom': ['u.k.', 'uk', 'britain', 'england', 'scotland', 'wales'],
            'China': ['prc', 'mainland china'],
            'South Korea': ['korea', 'republic of korea'],
            'Taiwan': ['republic of china', 'roc'],
            'Hong Kong': ['hk', 'hong kong sar']
        }
        
        for country, patterns in country_patterns.items():
            for pattern in patterns:
                if pattern in location_lower:
                    return country
                    
        # Check if contains known country
        for country in set(self.country_mapping.values()):
            if country.lower() in location_lower:
                return country
                
        return 'N/A'
        
    def _clean_location_text(self, text):
        """Clean location text"""
        cleaned = text.strip()
        cleaned = re.sub(r'\s*\(.*?\)\s*', '', cleaned)
        cleaned = re.sub(r'\s*-.*$', '', cleaned)
        cleaned = re.sub(r'^\s*[^A-Za-z]*', '', cleaned).strip()
        
        if len(cleaned) > 1:
            cleaned = ' '.join(word.capitalize() for word in cleaned.split())
            
        return cleaned
        
    def save_to_csv(self, output_file):
        """Save results to CSV - always creates new file"""
        if not self.universities:
            logging.warning("No universities to save")
            return False
            
        # Ensure file is created fresh
        output_path = Path(output_file)
        if output_path.exists():
            output_path.unlink()
            logging.info(f"Removed existing file: {output_file}")
            
        # Sort by rank
        self.universities.sort(key=lambda x: x['Rank'])
        
        # Apply max_entries limit if needed
        if self.max_entries > 0 and len(self.universities) > self.max_entries:
            self.universities = self.universities[:self.max_entries]
            
        # Save to CSV
        df = pd.DataFrame(self.universities)
        df.to_csv(output_file, index=False)
        
        logging.info(f"Saved {len(df)} universities to {output_file}")
        
        # Print summary
        print(f"\n{'='*50}")
        print(f"EXTRACTION COMPLETE")
        print(f"{'='*50}")
        print(f"Total universities: {len(df)}")
        print(f"Output file: {output_file}")
        print(f"Countries represented: {df['Country'].nunique()}")
        print(f"Extraction time: {time.time() - self.start_time:.1f} seconds")
        
        # Verify TU Munich
        tu_munich = df[df['University'].str.contains('Munich', case=False, na=False)]
        if not tu_munich.empty:
            print(f"\nTU Munich verification:")
            print(tu_munich.to_string(index=False))
        
        print(f"\nFirst 10 universities:")
        print(df.head(10).to_string(index=False))
        
        return True
        
    def close(self):
        """Close browser and cleanup"""
        if self.page:
            self.page.close()
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
        logging.info("Browser closed")
        
    def extract_rankings(self, output_csv="usnews_rankings.csv", max_wait_time=300):
        """Main extraction workflow"""
        try:
            self.output_csv = output_csv
            self.setup_browser()
            loaded_count = self.load_all_universities(max_wait_time)
            
            if loaded_count == 0:
                logging.error("No universities found")
                return False
                
            return self.save_to_csv(output_csv)
            
        except Exception as e:
            logging.error(f"Extraction failed: {e}")
            return False
        finally:
            self.close()

def main():
    parser = argparse.ArgumentParser(description='Extract US News Global University Rankings using Playwright')
    parser.add_argument('-o', '--output', default='../frontend/public/data/usnews_rankings.csv', help='Output CSV file')
    parser.add_argument('-b', '--browser', choices=['chromium', 'firefox'], default='chromium', help='Browser to use')
    parser.add_argument('--no-headless', action='store_true', help='Run browser in visible mode')
    parser.add_argument('-n', '--max-entries', type=int, default=1000, help='Maximum entries to extract')
    parser.add_argument('-t', '--timeout', type=int, default=500, help='Maximum wait time in seconds')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    parser.add_argument('--page-timeout', type=int, default=60, help='Page load timeout in seconds')
    
    args = parser.parse_args()
    
    if not PLAYWRIGHT_AVAILABLE:
        print("\nError: Playwright is required. Install with:")
        print("  pip install playwright")
        print("  playwright install chromium")
        sys.exit(1)
        
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        
    # Clear console for clean output
    print("\033[H\033[J", end='')
    
    print(f"US News Rankings Extractor - Playwright Edition")
    print(f"{'='*50}")
    print(f"Browser: {args.browser}")
    print(f"Headless: {not args.no_headless}")
    print(f"Max entries: {args.max_entries}")
    print(f"Output: {args.output}")
    print(f"{'='*50}\n")
    
    extractor = USNewsPlaywrightExtractor(
        browser=args.browser,
        headless=not args.no_headless,
        max_entries=args.max_entries,
        debug=args.debug,
        page_load_timeout=args.page_timeout
    )
    
    success = extractor.extract_rankings(args.output, args.timeout)
    
    if success:
        print(f"\n✅ Extraction completed successfully!")
    else:
        print(f"\n❌ Extraction failed. Check logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()
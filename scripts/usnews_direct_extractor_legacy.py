#!/usr/bin/env python3
"""
Polished US News Global University Rankings CSV Extractor
Updated to produce clean, consistent output format
"""

import time
import logging
import argparse
import sys
import re
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional
import json
from tqdm import tqdm

# Selenium imports
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.firefox.options import Options as FirefoxOptions
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("Warning: Selenium not available. Install with: pip install selenium")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('usnews_extractor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

class USNewsPolishedExtractor:
    def __init__(self, browser='chrome', headless=True, max_entries=500, debug=False, page_load_timeout=120):
        if not SELENIUM_AVAILABLE:
            raise ImportError("Selenium is required. Install with: pip install selenium")
        self.browser = browser.lower()
        self.headless = headless
        self.driver = None
        self.max_entries = max_entries
        self.debug = debug
        self.page_load_timeout = page_load_timeout
        self.universities = []
        self.visited_links = set()  # Track visited university links
        self.output_csv = None

        # US News Global Rankings URL
        self.base_url = "https://www.usnews.com/education/best-global-universities/rankings"
        
        # Country mapping for common locations to standardize country names
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
        
    def setup_driver(self):
        """Initialize the browser driver"""
        logging.info(f"Setting up {self.browser} driver (headless: {self.headless})")
        
        try:
            if self.browser == 'chrome':
                self.driver = self._setup_chrome()
            elif self.browser == 'firefox':
                self.driver = self._setup_firefox()
            else:
                raise ValueError("Browser must be 'chrome' or 'firefox'")

            # Ensure we don't hang indefinitely on slow page loads
            self.driver.set_page_load_timeout(self.page_load_timeout)
                
            logging.info("Browser driver initialized successfully")
            
        except Exception as e:
            logging.error(f"Failed to setup browser driver: {e}")
            raise

    def _setup_chrome(self):
        """Setup Chrome driver with optimal settings"""
        options = ChromeOptions()
        
        if self.headless:
            options.add_argument('--headless')
        
        # Performance and stability options
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # User agent to appear more like a regular browser
        options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
        
        return webdriver.Chrome(options=options)

    def _setup_firefox(self):
        """Setup Firefox driver"""
        options = FirefoxOptions()
        
        if self.headless:
            options.add_argument('--headless')
        
        options.add_argument('--width=1920')
        options.add_argument('--height=1080')
        
        return webdriver.Firefox(options=options)

    def load_all_universities(self, max_wait_time=300):
        """Load the page and scroll/click to load all university entries"""
        logging.info(f"Loading US News rankings page: {self.base_url}")
        
        self.driver.get(self.base_url)
        
        # Handle cookies and initial page load
        time.sleep(5)
        logging.info("Handling cookie consent...")
        self._handle_cookie_banner()
        time.sleep(3)
        
        # Wait for content to load
        self._wait_for_content()
        
        # Scroll and load more content
        loaded_count = self._scroll_and_load_content(max_wait_time)
        
        logging.info(f"Finished loading. Total entries visible: {loaded_count}")
        return loaded_count

    def _handle_cookie_banner(self):
        """Handle cookie consent banner if present"""
        try:
            time.sleep(5)  # Increased initial sleep time
        
            # Try various methods to close modals/banners
            close_methods = [
                ("button[aria-label='Close']", "aria-label close"),
                ("button[title='Close']", "title close"),
                (".close-button", "close button class"),
                ("button[id*='accept']", "accept id"),
                ("button[class*='accept']", "accept class"),
                ("button[class*='cookie']", "cookie class"),
                ("div[aria-modal='true'] button", "modal button"),  # Added more specific selector
                ("div[role='dialog'] button", "dialog button"),  # Added more specific selector
                ("div[id*='dialog'] button", "dialog id button")  # Added more specific selector
            ]
        
            for selector, method_name in close_methods:
                try:
                    if self._try_close_modal(selector, method_name):
                        return
                except Exception as e:
                    logging.debug(f"Failed to close modal using {method_name}: {e}")
                    continue
        
            # Try text-based button search
            buttons = self.driver.find_elements(By.TAG_NAME, "button")
            for button in buttons:
                try:
                    if any(text in button.text.lower() for text in ['confirm', 'choice', 'accept', 'continue']):
                        if button.is_displayed():
                            # Use a more robust JavaScript click
                            self.driver.execute_script("arguments[0].click();", button)
                            logging.info(f"Closed modal using button text: {button.text}")
                            time.sleep(2)
                            return
                except Exception as e:
                    logging.debug(f"Failed to click button with text: {e}")
                    continue
        
            # Last resort: ESC key
            from selenium.webdriver.common.keys import Keys
            self.driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
            logging.info("Attempted to dismiss modal with ESC key")
            time.sleep(2)
                
        except Exception as e:
            logging.debug(f"Cookie handling failed: {e}")

    def _try_close_modal(self, selector, method_name):
        """Try to close modal with given selector"""
        try:
            element = self.driver.find_element(By.CSS_SELECTOR, selector)
            if element.is_displayed():
                self.driver.execute_script("arguments[0].click();", element)
                logging.info(f"Closed modal using {method_name}")
                time.sleep(2)
                return True
        except NoSuchElementException:
            pass
        return False

    def _wait_for_content(self):
        """Wait for initial content to load"""
        content_selectors = [
            "li[class*='item-list']",
            "[data-testid='ranking-item']",
            ".RankingItem",
            ".ranking-item",
            "a[href*='/education/best-global-universities/']",
            "h1, h2, h3"
        ]
        
        for selector in content_selectors:
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                logging.info(f"Content loaded with selector: {selector}")
                return
            except TimeoutException:
                continue
        
        logging.warning("No specific content selectors found - proceeding anyway")

    def _scroll_and_load_content(self, max_wait_time):
        """
        Scroll and click 'Load More' until the button is truly gone.
        This version IGNORES all item counts for controlling the loop.
        """
        import random
        start_time = time.time()
        patience_counter = 0
        MAX_PATIENCE = 3 # Will try 3 times before giving up

        logging.info("Starting final loading strategy: Clicking 'Load More' until it disappears.")

        # Initialize tqdm progress bar
        with tqdm(
            total=self.max_entries,
            desc="Extracting US News Rankings",
            unit="uni",
            bar_format=" {l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}{postfix}]",
            colour="green",
            ascii=False,
            ncols=80  # Adjust width as needed
        ) as pbar:
            while time.time() - start_time < max_wait_time:
                # Gradual scrolling
                try:
                    scroll_height = self.driver.execute_script("return document.body.scrollHeight;")
                    current_position = self.driver.execute_script("return window.pageYOffset;")
                except Exception as e:
                    logging.error(f"Error getting scroll height or position: {e}")
                    continue
                scroll_step = 500  # Adjust scroll step as needed

                while current_position < scroll_height:
                    try:
                        self.driver.execute_script(f"window.scrollTo(0, {current_position + scroll_step});")
                        current_position += scroll_step
                        time.sleep(random.uniform(0.5, 1.5))  # Adjust sleep time as needed
                        scroll_height = self.driver.execute_script("return document.body.scrollHeight;") # Update scroll height
                    except Exception as e:
                        logging.error(f"Error during scrolling: {e}")
                        break

                load_more_clicked = self._click_load_more_button()

                if load_more_clicked:
                    patience_counter = 0  # Reset patience on a successful click

                    # Extract new data and add to the list
                    new_data = self._extract_new_university_data()
                    self.universities.extend(new_data)
                    logging.info(f"Total universities: {len(self.universities)}")
                    pbar.update(len(new_data))  # Update progress bar

                    # Dynamic wait for new content
                    wait_time = 0
                    while wait_time < 10:  # Maximum wait time of 10 seconds
                        time.sleep(1)
                        wait_time += 1
                        new_links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/education/best-global-universities/']")
                        if len(new_links) > len(self.visited_links):
                            logging.info("New content detected, continuing...")
                            break
                    else:
                        logging.info("No new content detected after 10 seconds, continuing...")

                else:
                    patience_counter += 1
                    logging.warning(f"Could not find a clickable 'Load More' button. Patience attempt {patience_counter}/{MAX_PATIENCE}.")
                    if patience_counter >= MAX_PATIENCE:
                        logging.info("Reached max patience. Assuming all content is loaded.")
                        break  # Exit the loop
                    time.sleep(3)

        logging.info("Finished scrolling and loading content.")
        return len(self.universities)

    def _click_load_more_button(self):
        """Find and click the 'Load More' button."""
        # Broaden the search to include loading states.
        possible_texts = ["load more", "show more", "view more", "loading"]
        
        for attempt in range(3):  # Retry up to 3 times
            try:
                # Give the page a moment to render the button after a scroll
                time.sleep(1)
                buttons = self.driver.find_elements(By.TAG_NAME, "button")
                
                for button in buttons:
                    try:
                        button_text = button.text.lower()
                        # Check if the button is visible and contains one of our keywords
                        if button.is_displayed() and any(text in button_text for text in possible_texts):
                            # Use a robust JavaScript click that can handle most obscured elements
                            self.driver.execute_script("arguments[0].scrollIntoView(true);", button)
                            time.sleep(0.5) # Brief pause after scrolling to it
                            self.driver.execute_script("arguments[0].click();", button)
                            
                            logging.info(f"Successfully clicked button with text: '{button.text}'")
                            return True
                    except Exception as e:
                        # This specific button might be stale or non-interactable, continue to the next
                        logging.warning(f"Attempt {attempt+1} failed to click button: {e}")
                        continue
                
                # If we loop through all buttons and none are successfully clicked, we fail for this attempt
                logging.warning(f"Attempt {attempt+1}: No clickable 'Load More' button found.")
                time.sleep(2)  # Wait before retrying
            
            except Exception as e:
                logging.error(f"A critical error occurred while searching for the 'Load More' button: {e}")
                return False
        
        logging.info("All attempts to click 'Load More' button failed.")
        return False

    def _count_university_entries(self, use_link_selector=True):
        """Count the number of university entries currently visible."""
        selectors = [
            "li[class*='item-list']",
            "[data-testid='ranking-item']",
            ".RankingItem"
        ]
        # The link selector often gives an inflated count, so we make it optional
        if use_link_selector:
            selectors.append("a[href*='/education/best-global-universities/']")
        
        max_count = 0
        for selector in selectors:
            try:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                count = len([el for el in elements if el.is_displayed()])
                max_count = max(max_count, count)
                if self.debug and count > 0:
                    logging.debug(f"Selector '{selector}' found {count} elements")
            except Exception:
                continue
        
        return max_count

    def _extract_new_university_data(self):
        """Extracts university data from newly loaded content."""
        logging.info("Extracting new university data...")

        links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/education/best-global-universities/']")
        
        # Filter out already visited links
        links_to_process = [link for link in links if link.get_attribute('href') not in self.visited_links]
        
        new_universities = []

        for link in links_to_process:
            try:
                if not link.is_displayed():
                    continue

                name = link.text.strip()
                link_href = link.get_attribute('href')

                if not name or len(name) < 4 or any(keyword in name.lower() for keyword in ['rankings', 'methodology', 'education', 'news', 'view', 'read more']):
                    continue

                # More aggressive duplicate filtering
                if (link_href, name) in self.visited_links:
                    continue

                item_container = None
                for query in ["./ancestor::li", "./ancestor::div[contains(@class, 'ranking-item')]"]:
                    try:
                        item_container = link.find_element(By.XPATH, query)
                        if item_container:
                            break
                    except NoSuchElementException:
                        continue

                if not item_container:
                    continue

                container_text = item_container.text

                if '#' not in container_text:
                    if self.debug:
                        logging.debug(f"Discarding '{name}': no rank symbol.")
                    continue

                rank_match = re.search(r'#\s*(\d+)', container_text)
                rank = int(rank_match.group(1)) if rank_match else len(self.universities) + len(new_universities) + 1

                country = self._extract_and_clean_country(container_text, name)

                new_universities.append({
                    'Rank': rank,
                    'University': name,
                    'Country': country,
                    'Score': 'N/A',
                    'Enrollment': 'N/A'
                })
                self.visited_links.add((link_href, name))

            except Exception as e:
                if self.debug:
                    logging.warning(f"Could not parse item for link text: '{link.text}'. Error: {e}")
                continue

        logging.info(f"Found {len(new_universities)} new universities.")
        return new_universities

    def _extract_and_clean_country(self, item_text, university_name):
        """Extract and clean country information from item text"""
        country = 'N/A'
        
        # Split text into lines for analysis
        lines = [line.strip() for line in item_text.split('\n') if line.strip()]
        
        # Look for location patterns in the text
        for i, line in enumerate(lines):
            line_lower = line.lower()
            
            # Skip lines that contain the university name or are obviously not locations
            if (university_name.lower() in line_lower or 
                line.startswith('#') or 
                'score' in line_lower or 
                'enrollment' in line_lower or
                'read more' in line_lower):
                continue
            
            # Check if this line might be a location
            if self._is_likely_location(line):
                # Try to map to standard country name
                mapped_country = self._map_location_to_country(line)
                if mapped_country != 'N/A':
                    country = mapped_country
                    break
                
                # If no mapping, use the line as-is but clean it
                cleaned_line = self._clean_location_text(line)
                if len(cleaned_line) > 2:
                    country = cleaned_line
                    break
        
        return country

    def _is_likely_location(self, text):
        """Check if text is likely a location/country"""
        text_lower = text.lower().strip()
        
        # Skip obviously non-location text
        skip_patterns = [
            r'^\d+$',  # Just numbers
            r'global score',
            r'enrollment',
            r'founded',
            r'read more',
            r'^#\d+',
            r'best global',
            r'universities'
        ]
        
        for pattern in skip_patterns:
            if re.search(pattern, text_lower):
                return False
        
        # Check for common location indicators
        location_indicators = [
            r'\b(u\.s\.)\b',
            r'\b(u\.k\.)\b',
            r'\b(united states|united kingdom|canada|australia|germany|france|china|japan|india|brazil|italy|spain|netherlands|sweden|switzerland|belgium|austria|denmark|norway|finland|singapore|hong kong|south korea|taiwan|israel|mexico)\b',
            r'\b(cambridge|oxford|london|paris|tokyo|beijing|sydney|toronto|munich|zurich|stockholm|amsterdam|copenhagen|vienna|brussels|madrid|barcelona|milan|rome)\b'
        ]
        
        for pattern in location_indicators:
            if re.search(pattern, text_lower):
                return True
        
        # If it's a short, capitalized phrase, it might be a location
        if (len(text.split()) <= 3 and 
            text[0].isupper() and 
            not any(char.isdigit() for char in text)):
            return True
        
        return False

    def _map_location_to_country(self, location_text):
        """Map location text to standardized country name"""
        location_lower = location_text.lower().strip()
        
        # Remove common suffixes/prefixes
        location_lower = re.sub(r'\s*\(.*?\)\s*', '', location_lower)  # Remove parentheses
        location_lower = re.sub(r'\s*-.*$', '', location_lower)  # Remove dash and everything after
        location_lower = location_lower.strip()
        
        # Direct mapping
        if location_lower in self.country_mapping:
            return self.country_mapping[location_lower]
        
        # Partial matching for known countries
        country_patterns = {
            'united states': ['u.s.', 'usa', 'america', 'states'],
            'United Kingdom': ['u.k.', 'uk', 'britain', 'england', 'scotland', 'wales'],
            'China': ['prc', 'mainland china'],
            'South Korea': ['korea', 'republic of korea'],
            'Taiwan': ['republic of china', 'roc'],
            'Hong Kong': ['hk', 'hong kong sar']
        }
        
        for standard_country, patterns in country_patterns.items():
            for pattern in patterns:
                if pattern in location_lower:
                    return standard_country
        
        # Check if the location contains a known country name
        for mapped_country in self.country_mapping.values():
            if mapped_country.lower() in location_lower:
                return mapped_country
        
        return 'N/A'

    def _clean_location_text(self, text):
        """Clean location text to extract just the essential part"""
        # Remove extra whitespace and common prefixes/suffixes
        cleaned = text.strip()
        cleaned = re.sub(r'\s*\(.*?\)\s*', '', cleaned)  # Remove parentheses content
        cleaned = re.sub(r'\s*-.*$', '', cleaned)  # Remove dash and everything after
        cleaned = re.sub(r'^\s*[^A-Za-z]*', '', cleaned)  # Remove leading non-letters
        cleaned = cleaned.strip()
        
        # Capitalize properly
        if len(cleaned) > 1:
            cleaned = ' '.join(word.capitalize() for word in cleaned.split())
        
        return cleaned

    def _clean_and_standardize_data(self, universities):
        """Final cleaning and standardization of extracted data with enhanced logging."""
        cleaned = []
        seen_names = set()
        discard_count = 0
        
        for uni in universities:
            # Clean university name
            name = uni['University'].strip()
            
            # Skip invalid entries
            if not name or len(name) < 3 or name.lower() in ['read more', 'view more', 'details', 'unknown university']:
                if self.debug:
                    logging.debug(f"Discarding entry due to invalid name: {uni}")
                discard_count += 1
                continue

            if name in seen_names:
                if self.debug:
                    logging.debug(f"Discarding entry due to duplicate name: {uni}")
                discard_count += 1
                continue

            seen_names.add(name)
            
            # Validate rank
            try:
                rank = int(uni['Rank'])
                if rank <= 0:
                    if self.debug:
                        logging.debug(f"Discarding entry due to out-of-range rank: {uni}")
                    discard_count += 1
                    continue
            except (ValueError, TypeError):
                if self.debug:
                    logging.debug(f"Discarding entry due to invalid or missing rank: {uni}")
                discard_count += 1
                continue
            
            # Standardize country field
            country = uni.get('Country', 'N/A').strip() or 'N/A'
            
            cleaned.append({
                'Rank': rank,
                'University': name,
                'Country': country,
                'Score': 'N/A',
                'Enrollment': 'N/A'
            })
        
        if discard_count > 0:
            logging.info(f"Discarded {discard_count} entries during the cleaning process.")

        # Sort by rank to ensure order
        cleaned.sort(key=lambda x: x['Rank'])
        
        return cleaned

    def save_to_csv(self, universities, output_file, append=True):
        """Save cleaned data to CSV file, applying the max_entries limit."""
        if not universities:
            logging.info("No university data to save in this batch.")
            return False

        # --- THIS IS THE NEW LOGIC ---
        # If a max_entries limit is set, trim the full list before saving.
        # The list is already sorted by rank from the cleaning step.
        limited_universities = universities
        if self.max_entries > 0 and len(universities) > self.max_entries:
            logging.info(f"Applying max_entries limit: Trimming full list from {len(universities)} down to {self.max_entries} universities.")
            limited_universities = universities[:self.max_entries]
        # --- END OF NEW LOGIC ---

        df = pd.DataFrame(limited_universities)
        
        # Check if the file exists and if we should write the header
        file_exists = Path(output_file).is_file()
        header = not file_exists if not append else False
        
        df.to_csv(output_file, mode='a' if append else 'w', header=header, index=False)

        logging.info(f"Saved {len(df)} universities to {output_file} (append={append})")

        # Print summary using the final, possibly limited, data
        print(f"\n=== EXTRACTION SUMMARY ===")
        print(f"Total universities saved in this batch: {len(df)}")
        if not df.empty:
            print(f"Rank range: {df['Rank'].min()} - {df['Rank'].max()}")
            print(f"Countries represented: {df['Country'].nunique()}")
            print(f"Universities with identified countries: {len(df[df['Country'] != 'N/A'])}")
        print(f"Output file: {output_file}")

        # Show first few entries
        print(f"\nFirst 10 entries:")
        print(df.head(10).to_string(index=False))

        return True

    def close(self):
        """Close the browser driver"""
        if self.driver:
            self.driver.quit()
            logging.info("Browser driver closed")

    def extract_rankings(self, output_csv="usnews_rankings_clean.csv", max_wait_time=300):
        """Complete workflow: setup, load content, extract data, save clean CSV"""
        try:
            self.setup_driver()
            self.output_csv = output_csv
            loaded_count = self.load_all_universities(max_wait_time)

            if loaded_count == 0:
                logging.error("No university entries found")
                return False

            # universities = self.extract_university_data() # Removed

            # if not self.universities: # Removed
            #     logging.error("Failed to extract university data")
            #     return False

            success = self.save_to_csv(self.universities, self.output_csv)
            return success

        except Exception as e:
            logging.error(f"Extraction failed: {e}")
            return False
        finally:
            self.close()

def main():
    parser = argparse.ArgumentParser(description='Extract US News Global University Rankings directly to CSV')
    parser.add_argument('-o', '--output', default='../frontend/public/data/usnews_rankings.csv', help='Output CSV file')
    parser.add_argument('-b', '--browser', choices=['chrome', 'firefox'], default='chrome', help='Browser to use')
    parser.add_argument('--no-headless', action='store_true', help='Run browser in visible mode')
    parser.add_argument('-n', '--max-entries', type=int, default=1000, help='Maximum entries to extract')
    parser.add_argument('-t', '--timeout', type=int, default=500, help='Maximum wait time in seconds')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    parser.add_argument('--page-timeout', type=int, default=60,
                        help='Page load timeout in seconds')
    
    args = parser.parse_args()
    
    if not SELENIUM_AVAILABLE:
        print("Error: Selenium is required. Install with: pip install selenium")
        print("You'll also need the appropriate browser driver:")
        print("- Chrome: Download chromedriver from https://chromedriver.chromium.org/")
        print("- Firefox: Download geckodriver from https://github.com/mozilla/geckodriver/releases")
        sys.exit(1)
    
    # Set debug logging if requested
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    extractor = USNewsPolishedExtractor(
        browser=args.browser,
        headless=not args.no_headless,
        max_entries=args.max_entries,
        debug=args.debug,
        page_load_timeout=args.page_timeout
    )
    
    print(f"Starting direct extraction of US News Rankings...")
    print(f"Browser: {args.browser}")
    print(f"Headless: {not args.no_headless}")
    print(f"Max entries: {args.max_entries}")
    print(f"Output: {args.output}")
    
    success = extractor.extract_rankings(args.output, args.timeout)
    
    if success:
        print(f"\n✅ Successfully extracted rankings to: {args.output}")
    else:
        print("\n❌ Extraction failed. Check the logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()

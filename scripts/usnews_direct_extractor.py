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

try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    logging.warning("tqdm not available. Install with: pip install tqdm for progress bar.")

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
        logging.FileHandler('usnews_extractor.log')
    ]
)

# Custom handler for console output that respects tqdm
class TqdmStreamHandler(logging.StreamHandler):
    def emit(self, record):
        try:
            msg = self.format(record)
            if TQDM_AVAILABLE:
                tqdm.write(msg, file=self.stream)
            else:
                self.stream.write(msg + self.terminator)
            self.flush()
        except Exception:
            self.handleError(record)

# Add the custom handler to the root logger
logging.getLogger().addHandler(TqdmStreamHandler(sys.stdout))

class USNewsPolishedExtractor:
    def __init__(self, browser='chrome', headless=True, max_entries=500, debug=False, page_load_timeout=60):
        if not SELENIUM_AVAILABLE:
            raise ImportError("Selenium is required. Install with: pip install selenium")
        
        self.browser = browser.lower()
        self.headless = headless
        self.driver = None
        self.max_entries = max_entries
        self.debug = debug
        self.page_load_timeout = page_load_timeout
        self.universities = []
        
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
        
        # Optional: Disable images for faster loading
        if not self.debug: # Only disable if not in debug mode (where visual inspection might be needed)
            prefs = {"profile.managed_default_content_settings.images": 2}
            options.add_experimental_option("prefs", prefs)
        
        # Optional: Disable images for faster loading
        # Use a more recent and realistic User-Agent
        options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
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
        import random
        import time

        # Add a small random delay before loading the page
        delay = random.uniform(2, 5)
        logging.info(f"Adding a {delay:.2f} second delay before loading the page to appear more human-like.")
        time.sleep(delay)

        logging.info(f"Loading US News rankings page: {self.base_url}")
        
        self.driver.get(self.base_url)
        
        # Handle cookies and initial page load
        # Give the page a moment to load and for the cookie banner to appear
        time.sleep(5)
        logging.info("Handling cookie consent...")
        self._handle_cookie_banner()
        
        # Now wait for the main content to load after the cookie banner is dismissed
        self._wait_for_content()
        
        # Scroll and load more content, and extract data incrementally
        self._scroll_and_load_content(max_wait_time)
        
        logging.info(f"Finished loading and incremental extraction. Total unique universities found: {len(self.universities)}")
        return len(self.universities)

    def _handle_cookie_banner(self):
        """Handle cookie consent banner if present"""
        try:
            time.sleep(3)
            
            # Try various methods to close modals/banners
            close_methods = [
                ("button[aria-label='Close']", "aria-label close"),
                ("button[title='Close']", "title close"),
                (".close-button", "close button class"),
                ("button[id*='accept']", "accept id"),
                ("button[class*='accept']", "accept class"),
                ("button[class*='cookie']", "cookie class")
            ]
            
            for selector, method_name in close_methods:
                try:
                    if self._try_close_modal(selector, method_name):
                        return
                except Exception:
                    continue
            
            # Try text-based button search
            buttons = self.driver.find_elements(By.TAG_NAME, "button")
            for button in buttons:
                if any(text in button.text.lower() for text in ['confirm', 'choice', 'accept', 'continue']):
                    if button.is_displayed():
                        self.driver.execute_script("arguments[0].click();", button)
                        logging.info(f"Closed modal using button text: {button.text}")
                        time.sleep(2)
                        return
            
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
        Scroll and click 'Load More' until the button is truly gone,
        and extract university data incrementally.
        """
        start_time = time.time()
        patience_counter = 0
        MAX_PATIENCE = 3 # Will try 3 times before giving up

        logging.info("Starting incremental loading and extraction strategy.")
        
        # Initialize lists/sets for incremental extraction
        self.universities = []
        parsed_names = set()
        generic_keywords = ['rankings', 'methodology', 'education', 'news', 'view']

        # Use tqdm for progress bar
        if TQDM_AVAILABLE:
            # Initialize tqdm with total as max_entries, and a custom formatter for time remaining
            pbar = tqdm(total=self.max_entries, unit="uni", desc="Extracting Universities", dynamic_ncols=True, leave=True, colour='cyan')
        else:
            pbar = None

        try:
            prev_li_count = 0
            while time.time() - start_time < max_wait_time:
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                try:
                    WebDriverWait(self.driver, 10).until(
                        lambda d: any(
                            btn.is_displayed() and any(txt in btn.text.lower() for txt in ["load more", "show more", "view more", "loading"])
                            for btn in d.find_elements(By.TAG_NAME, "button")
                        )
                    )
                except TimeoutException:
                    pass

                load_more_clicked = self._click_load_more_button()
                if load_more_clicked:
                    time.sleep(2.5)

                # Select all <li> university entries
                li_nodes = self.driver.find_elements(By.CSS_SELECTOR, "li.item-list__ListItemStyled-sc-18yjqdy-1")
                new_li_nodes = li_nodes[prev_li_count:]
                newly_extracted_count = 0
                debug_print_limit = 5

                for idx, li in enumerate(new_li_nodes):
                    try:
                        # University name
                        try:
                            name_elem = li.find_element(By.CSS_SELECTOR, "section h2 a")
                            name = name_elem.text.strip()
                        except Exception:
                            name = ''
                        if not name or len(name) < 4 or any(keyword in name.lower() for keyword in generic_keywords):
                            continue
                        if name in parsed_names:
                            continue

                        # Country/city
                        try:
                            spans = li.find_elements(By.CSS_SELECTOR, "section p span")
                            country = spans[0].text.strip() if len(spans) > 0 else 'N/A'
                            city = spans[1].text.strip() if len(spans) > 1 else 'N/A'
                        except Exception:
                            country = 'N/A'
                            city = 'N/A'

                        # Rank
                        try:
                            rank_elem = li.find_element(By.CSS_SELECTOR, "section ul li a div strong")
                            rank = int(rank_elem.text.strip().replace('#', ''))
                        except Exception:
                            rank = len(self.universities) + 1

                        # Score and Enrollment
                        score = 'N/A'
                        enrollment = 'N/A'
                        try:
                            stat_divs = li.find_elements(By.CSS_SELECTOR, "section div div dl div")
                            for stat in stat_divs:
                                try:
                                    label = stat.find_element(By.CSS_SELECTOR, "dt").text.strip().lower()
                                    value = stat.find_element(By.CSS_SELECTOR, "dd").text.strip()
                                    if 'score' in label:
                                        score = value
                                    elif 'enrollment' in label:
                                        enrollment = value
                                except Exception:
                                    continue
                        except Exception:
                            pass

                        # Debug output for first 5
                        if self.debug and idx < debug_print_limit:
                            print(f"[DEBUG] Name: {name}\n[DEBUG] Country: {country}\n[DEBUG] City: {city}\n[DEBUG] Rank: {rank}\n[DEBUG] Score: {score}\n[DEBUG] Enrollment: {enrollment}\n---")

                        self.universities.append({
                            'Rank': rank,
                            'University': name,
                            'Country': country,
                            'Score': score,
                            'Enrollment': enrollment
                        })
                        parsed_names.add(name)
                        newly_extracted_count += 1

                        # Prune processed <li> node
                        try:
                            self.driver.execute_script("arguments[0].parentNode.removeChild(arguments[0]);", li)
                        except Exception as prune_exc:
                            if self.debug:
                                logging.debug(f"Failed to prune <li> node for '{name}': {prune_exc}")
                    except Exception as e:
                        if self.debug:
                            logging.warning(f"Could not parse <li> entry. Error: {e}")
                        continue

                prev_li_count = len(li_nodes)

                if newly_extracted_count > 0:
                    if pbar:
                        pbar.update(newly_extracted_count)
                    logging.info(f"Extracted {newly_extracted_count} new universities. Total extracted: {len(self.universities)}")
                    patience_counter = 0
                elif load_more_clicked:
                    logging.info("Load More clicked, but no new universities found. Waiting for content to render...")
                    time.sleep(5)
                else:
                    patience_counter += 1
                    logging.warning(f"Could not find a clickable 'Load More' button and no new universities found. Patience attempt {patience_counter}/{MAX_PATIENCE}.")
                    if patience_counter >= MAX_PATIENCE:
                        logging.info("Reached max patience. Assuming all content is loaded and extracted.")
                        break
                    time.sleep(1)

                if pbar:
                    elapsed_time = time.time() - start_time
                    remaining_time = max_wait_time - elapsed_time
                    pbar.set_description(f"Extracting Universities (Time Left: {max(0, int(remaining_time))}s)")

                if self.max_entries > 0 and len(self.universities) >= self.max_entries:
                    logging.info(f"Reached max_entries limit ({self.max_entries}). Stopping extraction.")
                    break

            logging.info("Finished loading and incremental extraction phase.")
            # Final cleaning and standardization will happen after this function returns
        finally:
            if pbar:
                pbar.close()

    def _click_load_more_button(self):
        """Find and click the 'Load More' button using a robust method."""
        # Broaden the search to include loading states, based on previous logs.
        possible_texts = ["load more", "show more", "view more", "loading"]
        
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
                except Exception:
                    # This specific button might be stale or non-interactable, continue to the next
                    continue
            
            # If we loop through all buttons and none are successfully clicked, we fail for this attempt
            return False
            
        except Exception as e:
            logging.error(f"A critical error occurred while searching for the 'Load More' button: {e}")
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
                if rank <= 0 or rank > 2500: # Increased max rank just in case
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

    def save_to_csv(self, output_file="../frontend/public/data/usnews_rankings.csv"):
        """Save cleaned data to CSV file, applying the max_entries limit."""
        if not self.universities:
            logging.error("No university data to save")
            return False
        
        # --- THIS IS THE NEW LOGIC ---
        # If a max_entries limit is set, trim the full list before saving.
        # The list is already sorted by rank from the cleaning step.
        limited_universities = self.universities
        if self.max_entries > 0 and len(self.universities) > self.max_entries:
            logging.info(f"Applying max_entries limit: Trimming full list from {len(self.universities)} down to {self.max_entries} universities.")
            limited_universities = self.universities[:self.max_entries]
        # --- END OF NEW LOGIC ---

        df = pd.DataFrame(limited_universities)
        df.to_csv(output_file, index=False)
        
        logging.info(f"Saved {len(df)} universities to {output_file}")
        
        # Print summary using the final, possibly limited, data
        print(f"\n=== EXTRACTION SUMMARY ===")
        print(f"Total universities saved: {len(df)}")
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
            loaded_count = self.load_all_universities(max_wait_time)
            
            if loaded_count == 0:
                logging.error("No university entries found or extracted.")
                return False
            
            # Data is already incrementally extracted into self.universities
            # Now, perform final cleaning and standardization
            self.universities = self._clean_and_standardize_data(self.universities)
            logging.info("Final data cleaning and standardization complete.")

            if not self.universities:
                logging.error("No university data remaining after cleaning.")
                return False
            
            success = self.save_to_csv(output_csv)
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
    parser.add_argument('-t', '--timeout', type=int, default=360, help='Maximum wait time in seconds')
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

#!/usr/bin/env python3
"""
US News Global University Rankings CSV Extractor - Fixed Version
Corrected selectors based on DOM analysis
"""

import time
import logging
import argparse
import sys
import re
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional, Set, Tuple
import json
from tqdm import tqdm
from collections import deque

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

class USNewsFixedExtractor:
    def __init__(self, browser='chrome', headless=True, max_entries=500, debug=False, page_load_timeout=120):
        if not SELENIUM_AVAILABLE:
            raise ImportError("Selenium is required. Install with: pip install selenium")
        self.browser = browser.lower()
        self.headless = headless
        self.driver = None
        self.max_entries = max_entries
        self.debug = debug
        self.page_load_timeout = page_load_timeout
        
        # Fixed data structures for performance
        self.processed_containers = set()  # Track processed container elements by unique ID
        self.seen_universities = {}  # Map university name -> data for deduplication
        self.last_container_count = 0  # Track container count for progress
        self.output_csv = None
        self.total_saved = 0
        
        # Write to CSV incrementally
        self.batch_size = 50
        self.file_initialized = False
        self.current_batch = []

        # US News Global Rankings URL
        self.base_url = "https://www.usnews.com/education/best-global-universities/rankings"
        
        # Country mapping (keep existing mapping)
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
        
        # Use shorter timeout for initial load to catch hangs
        original_timeout = self.driver.timeouts.page_load
        self.driver.set_page_load_timeout(30)
        
        try:
            self.driver.get(self.base_url)
        except TimeoutException:
            logging.warning("Initial page load timeout - attempting to continue")
            # Often the page is loaded enough to continue
            self.driver.execute_script("window.stop();")
        finally:
            # Restore original timeout
            self.driver.set_page_load_timeout(original_timeout)
        
        # Wait for any redirects or dynamic loading to settle
        time.sleep(3)
        
        # Handle cookie banner with multiple strategies
        logging.info("Handling cookie consent...")
        cookie_handled = self._robust_cookie_handler()
        
        if not cookie_handled:
            logging.warning("Cookie banner handling may have failed - attempting to continue")
        
        time.sleep(2)
        
        # Wait for content to load
        self._wait_for_content()
        
        # Scroll and load more content with fixed approach
        loaded_count = self._fixed_scroll_and_load(max_wait_time)
        
        # Save any remaining batch
        if self.current_batch:
            self._save_batch_to_csv(self.current_batch)
        
        logging.info(f"Finished loading. Total entries saved: {self.total_saved}")
        return loaded_count

    def _robust_cookie_handler(self):
        """Robust cookie/modal handler that tries multiple strategies"""
        max_attempts = 3
        
        for attempt in range(max_attempts):
            try:
                # Strategy 1: Wait for any modal/overlay to appear
                time.sleep(2)
                
                # Check if page is interactable (no blocking overlays)
                test_element = self.driver.find_element(By.TAG_NAME, "body")
                if self.driver.execute_script("return document.readyState") == "complete":
                    # Try clicking body to see if it's blocked
                    try:
                        test_element.click()
                        logging.info("Page appears interactable - no blocking modal detected")
                        return True
                    except:
                        # Click was blocked, there's likely a modal
                        pass
                
                # Strategy 2: Find and close any visible modal/overlay
                modal_closed = self._find_and_close_modal()
                if modal_closed:
                    return True
                
                # Strategy 3: JavaScript to force close all modals
                self.driver.execute_script("""
                    // Remove common modal elements
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
                        '[id*="consent"]'
                    ];
                    
                    selectors.forEach(selector => {
                        document.querySelectorAll(selector).forEach(el => {
                            if (el.style.display !== 'none') {
                                el.style.display = 'none';
                                el.remove();
                            }
                        });
                    });
                    
                    // Remove any backdrop/overlay divs
                    document.querySelectorAll('div').forEach(div => {
                        const style = window.getComputedStyle(div);
                        if (style.position === 'fixed' && 
                            (style.zIndex > 1000 || style.backgroundColor.includes('rgba'))) {
                            div.remove();
                        }
                    });
                    
                    // Enable scrolling if disabled
                    document.body.style.overflow = 'auto';
                    document.documentElement.style.overflow = 'auto';
                """)
                
                time.sleep(1)
                
                # Check if we can now interact with the page
                try:
                    test_scroll = self.driver.execute_script("window.scrollTo(0, 100); return window.pageYOffset;")
                    if test_scroll > 0:
                        logging.info(f"Cookie handling successful on attempt {attempt + 1}")
                        return True
                except:
                    pass
                    
            except Exception as e:
                logging.debug(f"Cookie handling attempt {attempt + 1} failed: {e}")
                
            if attempt < max_attempts - 1:
                time.sleep(2)
        
        return False
    
    def _find_and_close_modal(self):
        """Find and close modal using multiple methods"""
        # Comprehensive list of button selectors to try
        button_selectors = [
            # Specific close buttons
            "button[aria-label*='Close']",
            "button[aria-label*='close']",
            "button[title*='Close']",
            "button[title*='close']",
            "*[aria-label*='Close']",
            "*[aria-label*='close']",
            
            # Accept/consent buttons
            "button:has-text('Accept')",
            "button:has-text('Continue')",
            "button:has-text('Agree')",
            "button:has-text('OK')",
            "button:has-text('Got it')",
            "button:has-text('I Accept')",
            "button:has-text('Confirm')",
            
            # Generic close elements
            ".close",
            ".close-button",
            ".modal-close",
            "[class*='close']",
            "[class*='Close']",
            
            # Cookie specific
            "[class*='cookie'] button",
            "[class*='consent'] button",
            "[class*='banner'] button",
            "[id*='cookie'] button",
            "[id*='consent'] button",
            
            # Any visible button in a modal
            "[role='dialog'] button",
            "[aria-modal='true'] button",
            ".modal button",
            ".overlay button"
        ]
        
        for selector in button_selectors:
            try:
                # Try CSS selector
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                except:
                    # If CSS selector fails, try XPath for text content
                    if ":has-text(" in selector:
                        text = selector.split("'")[1]
                        elements = self.driver.find_elements(
                            By.XPATH, 
                            f"//button[contains(text(), '{text}')] | //button[contains(., '{text}')]"
                        )
                    else:
                        continue
                
                for element in elements:
                    if element.is_displayed() and element.is_enabled():
                        try:
                            # Try multiple click methods
                            try:
                                element.click()
                            except:
                                # JavaScript click as fallback
                                self.driver.execute_script("arguments[0].click();", element)
                            
                            logging.info(f"Successfully closed modal using: {selector}")
                            time.sleep(1)
                            return True
                        except:
                            continue
                            
            except Exception as e:
                logging.debug(f"Failed with selector {selector}: {e}")
                continue
        
        # Last resort: Press ESC key
        try:
            from selenium.webdriver.common.keys import Keys
            self.driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
            logging.info("Sent ESC key to dismiss modal")
            time.sleep(1)
        except:
            pass
            
        return False

    def _try_close_modal(self, selector, method_name):
        """Try to close modal with given selector"""
        # Removed - functionality merged into _find_and_close_modal
        pass

    def _wait_for_content(self):
        """Wait for initial content to load"""
        # Based on debug report, we know li[class*='item-list'] is the correct container
        try:
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "li[class*='item-list']"))
            )
            logging.info("Content loaded successfully")
        except TimeoutException:
            logging.warning("Content load timeout - proceeding anyway")

    def _fixed_scroll_and_load(self, max_wait_time):
        """
        Fixed scroll and load approach using correct selectors
        """
        import random
        start_time = time.time()
        patience_counter = 0
        MAX_PATIENCE = 3
        no_new_data_counter = 0

        logging.info("Starting fixed loading strategy with correct selectors")

        with tqdm(
            total=self.max_entries,
            desc="Extracting US News Rankings",
            unit="uni",
            bar_format=" {l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}{postfix}]",
            colour="green",
            ascii=False,
            ncols=80
        ) as pbar:
            while time.time() - start_time < max_wait_time and self.total_saved < self.max_entries:
                # Extract data from current state
                new_count = self._extract_universities_correctly()
                
                if new_count > 0:
                    pbar.update(new_count)
                    no_new_data_counter = 0
                else:
                    no_new_data_counter += 1
                    if no_new_data_counter > 5:
                        logging.warning("No new data for 5 iterations, checking DOM state")
                        self._debug_current_state()
                
                # Check if we've reached the target
                if self.total_saved >= self.max_entries:
                    break
                
                # Smooth scrolling
                try:
                    scroll_height = self.driver.execute_script("return document.body.scrollHeight;")
                    current_position = self.driver.execute_script("return window.pageYOffset;")
                    
                    # Scroll to bottom
                    self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    time.sleep(random.uniform(1, 2))
                    
                except Exception as e:
                    logging.error(f"Error during scrolling: {e}")
                    continue
                
                # Try to load more
                load_more_clicked = self._click_load_more_button()
                
                if load_more_clicked:
                    patience_counter = 0
                    # Wait for new content with exponential backoff
                    wait_time = min(5 * (1.5 ** no_new_data_counter), 20)
                    time.sleep(wait_time)
                else:
                    patience_counter += 1
                    logging.warning(f"No load more button found. Patience {patience_counter}/{MAX_PATIENCE}")
                    if patience_counter >= MAX_PATIENCE:
                        logging.info("Max patience reached. Extracting final data...")
                        self._extract_universities_correctly()
                        break
                    time.sleep(3)

        return self.total_saved

    def _extract_universities_correctly(self):
        """
        Extract universities with optimized text access to avoid performance cliff
        """
        # Use JavaScript to extract all data at once - MUCH faster than individual .text calls
        extraction_script = """
        const containers = document.querySelectorAll('li[class*="item-list"]');
        const results = [];
        
        containers.forEach((container, index) => {
            const text = container.innerText || container.textContent || '';
            if (!text.includes('#')) return;
            
            const links = container.querySelectorAll('a[href*="/education/best-global-universities/"]');
            const validLinks = [];
            
            links.forEach(link => {
                const linkText = (link.innerText || link.textContent || '').trim();
                if (linkText && linkText.length > 4) {
                    validLinks.push({
                        text: linkText,
                        href: link.href
                    });
                }
            });
            
            results.push({
                index: index,
                text: text,
                links: validLinks,
                elementId: container.id || 'container_' + index
            });
        });
        
        return results;
        """
        
        # Get all container data in one JavaScript call
        container_data = self.driver.execute_script(extraction_script)
        
        new_universities = []
        
        for data in container_data:
            try:
                # Check if already processed
                element_id = data['elementId']
                if element_id in self.processed_containers:
                    continue
                
                container_text = data['text']
                if not container_text:
                    continue
                
                # Extract rank
                rank_match = re.search(r'#\s*(\d+)', container_text)
                if not rank_match:
                    continue
                rank = int(rank_match.group(1))
                
                # Find university name from links
                university_name = None
                for link_data in data['links']:
                    name = link_data['text']
                    # Skip navigation/utility links
                    if not any(skip in name.lower() for skip in ['read more', 'view', 'rankings', 'methodology', 'news']):
                        university_name = name
                        break
                
                if not university_name:
                    continue
                
                # Skip duplicates
                if university_name in self.seen_universities:
                    existing = self.seen_universities[university_name]
                    if existing.get('Rank', 999999) <= rank:
                        continue
                
                # Extract country
                country = self._extract_country_from_container(container_text, university_name)
                
                # Create university entry
                university_data = {
                    'Rank': rank,
                    'University': university_name,
                    'Country': country,
                    'Score': 'N/A',
                    'Enrollment': 'N/A'
                }
                
                # Add to batch and tracking
                new_universities.append(university_data)
                self.processed_containers.add(element_id)
                self.seen_universities[university_name] = university_data
                
                # Add to current batch
                self.current_batch.append(university_data)
                
                # Save batch if it's full
                if len(self.current_batch) >= self.batch_size:
                    self._save_batch_to_csv(self.current_batch)
                    self.current_batch = []
                
            except Exception as e:
                if self.debug:
                    logging.error(f"Error processing container data: {e}")
                continue
        
        return len(new_universities)

    def _extract_country_from_container(self, container_text, university_name):
        """Extract and normalize country name from container text"""
        lines = [line.strip() for line in container_text.split('\n') if line.strip()]

        # Identify the university line
        uni_index = -1
        for i, line in enumerate(lines):
            if university_name in line:
                uni_index = i
                break

        if uni_index >= 0:
            for i in range(uni_index + 1, min(uni_index + 4, len(lines))):
                line = lines[i]

                if any(skip in line.lower() for skip in ['#', 'score', 'enrollment', 'read more', 'global', 'rank']):
                    continue

                if self._is_likely_location(line):
                    segments = re.split(r'[|,;]', line)
                    for segment in segments:
                        segment = segment.strip()
                        if not segment:
                            continue

                        mapped = self._map_location_to_country(segment)
                        if mapped != 'N/A':
                            return mapped

                        cleaned = self._clean_location_text(segment)
                        if cleaned in self.country_mapping.values():
                            return cleaned

                    mapped_full = self._map_location_to_country(line)
                    if mapped_full != 'N/A':
                        return mapped_full

                    cleaned_line = self._clean_location_text(line)

                    if '|' in cleaned_line:
                        cleaned_line = cleaned_line.split('|')[0].strip()
                    elif ',' in cleaned_line:
                        parts = [p.strip() for p in cleaned_line.split(',') if p.strip()]
                        if parts:
                            cleaned_line = parts[-1]

                    return cleaned_line

        return 'N/A'

    def _is_likely_location(self, text):
        """Check if text is likely a location/country"""
        text_lower = text.lower().strip()
        
        # Skip patterns
        skip_patterns = [
            r'^\d+$',
            r'global score',
            r'enrollment',
            r'founded',
            r'read more',
            r'^#\d+',
            r'best global',
            r'universities',
            r'rank'
        ]
        
        for pattern in skip_patterns:
            if re.search(pattern, text_lower):
                return False
        
        # Location indicators
        location_indicators = [
            r'\b(u\.s\.)\b',
            r'\b(u\.k\.)\b',
            r'\b(united states|united kingdom|canada|australia|germany|france|china|japan|india|brazil|italy|spain|netherlands|sweden|switzerland|belgium|austria|denmark|norway|finland|singapore|hong kong|south korea|taiwan|israel|mexico)\b',
            r'\b(cambridge|oxford|london|paris|tokyo|beijing|sydney|toronto|munich|zurich|stockholm|amsterdam|copenhagen|vienna|brussels|madrid|barcelona|milan|rome)\b'
        ]
        
        for pattern in location_indicators:
            if re.search(pattern, text_lower):
                return True
        
        # Check format (short, capitalized)
        if (len(text.split()) <= 3 and 
            text[0].isupper() and 
            not any(char.isdigit() for char in text) and
            len(text) > 2):
            return True
        
        return False

    def _map_location_to_country(self, location_text):
        """Map location text to standardized country name"""
        location_lower = location_text.lower().strip()
        
        # Clean up
        location_lower = re.sub(r'\s*\(.*?\)\s*', '', location_lower)
        location_lower = re.sub(r'\s*-.*$', '', location_lower)
        location_lower = location_lower.strip()
        
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
        
        for standard_country, patterns in country_patterns.items():
            for pattern in patterns:
                if pattern in location_lower:
                    return standard_country
        
        # Check if location contains known country
        for mapped_country in set(self.country_mapping.values()):
            if mapped_country.lower() in location_lower:
                return mapped_country
        
        return 'N/A'

    def _clean_location_text(self, text):
        """Clean location text"""
        cleaned = text.strip()
        cleaned = re.sub(r'\s*\(.*?\)\s*', '', cleaned)
        cleaned = re.sub(r'\s*-.*$', '', cleaned)
        cleaned = re.sub(r'^\s*[^A-Za-z]*', '', cleaned)
        cleaned = cleaned.strip()

        # Remove any city details separated by pipe or comma
        cleaned = re.split(r'[|,]', cleaned)[0].strip()

        if len(cleaned) > 1:
            cleaned = ' '.join(word.capitalize() for word in cleaned.split())

        return cleaned

    def _save_batch_to_csv(self, universities):
        """Save a batch of universities to CSV immediately"""
        if not universities or not self.output_csv:
            return
        
        # Sort by rank before saving
        universities.sort(key=lambda x: x['Rank'])
        
        df = pd.DataFrame(universities)
        
        # Initialize file with headers on first write
        if not self.file_initialized:
            df.to_csv(self.output_csv, mode='w', header=True, index=False)
            self.file_initialized = True
        else:
            df.to_csv(self.output_csv, mode='a', header=False, index=False)
        
        self.total_saved += len(universities)
        logging.debug(f"Saved batch of {len(universities)} universities. Total: {self.total_saved}")

    def _click_load_more_button(self):
        """Find and click the 'Load More' button"""
        possible_texts = ["load more", "show more", "view more", "loading"]
        
        for attempt in range(3):
            try:
                time.sleep(1)
                buttons = self.driver.find_elements(By.TAG_NAME, "button")
                
                for button in buttons:
                    try:
                        button_text = button.text.lower()
                        if button.is_displayed() and any(text in button_text for text in possible_texts):
                            self.driver.execute_script("arguments[0].scrollIntoView(true);", button)
                            time.sleep(0.5)
                            self.driver.execute_script("arguments[0].click();", button)
                            logging.info(f"Clicked button: '{button.text}'")
                            return True
                    except Exception as e:
                        continue
                
                time.sleep(2)
            
            except Exception as e:
                logging.error(f"Critical error clicking load more: {e}")
                return False
        
        return False

    def _debug_current_state(self):
        """Debug helper to understand current DOM state"""
        if not self.debug:
            return
            
        containers = self.driver.find_elements(By.CSS_SELECTOR, "li[class*='item-list']")
        logging.debug(f"Current container count: {len(containers)}")
        
        # Sample last few containers
        for container in containers[-3:]:
            try:
                text_preview = container.text[:100].replace('\n', ' ')
                logging.debug(f"Container sample: {text_preview}...")
            except:
                pass

    def close(self):
        """Close the browser driver"""
        if self.driver:
            self.driver.quit()
            logging.info("Browser driver closed")

    def extract_rankings(self, output_csv="usnews_rankings_clean.csv", max_wait_time=300):
        """Complete workflow"""
        try:
            self.output_csv = output_csv
            self.setup_driver()
            loaded_count = self.load_all_universities(max_wait_time)

            if loaded_count == 0:
                logging.error("No university entries found")
                return False

            # Print final summary
            print(f"\n=== EXTRACTION COMPLETE ===")
            print(f"Total universities extracted: {self.total_saved}")
            print(f"Output file: {self.output_csv}")
            
            # Verify TU Munich
            if Path(self.output_csv).exists():
                df = pd.read_csv(self.output_csv)
                
                # Check for TU Munich
                tu_munich = df[df['University'].str.contains('Munich', case=False, na=False)]
                if not tu_munich.empty:
                    print(f"\nTU Munich check:")
                    print(tu_munich.to_string(index=False))
                else:
                    print("\nWARNING: TU Munich not found in results!")
                
                print(f"\nFirst 10 entries:")
                print(df.head(10).to_string(index=False))
                print(f"\nTotal countries: {df['Country'].nunique()}")

            return True

        except Exception as e:
            logging.error(f"Extraction failed: {e}")
            return False
        finally:
            self.close()

def main():
    parser = argparse.ArgumentParser(description='Extract US News Global University Rankings')
    parser.add_argument('-o', '--output', default='../frontend/public/data/usnews_rankings.csv', help='Output CSV file')
    parser.add_argument('-b', '--browser', choices=['chrome', 'firefox'], default='chrome', help='Browser to use')
    parser.add_argument('--no-headless', action='store_true', help='Run browser in visible mode')
    parser.add_argument('-n', '--max-entries', type=int, default=1000, help='Maximum entries to extract')
    parser.add_argument('-t', '--timeout', type=int, default=500, help='Maximum wait time in seconds')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    parser.add_argument('--page-timeout', type=int, default=60, help='Page load timeout in seconds')
    
    args = parser.parse_args()
    
    if not SELENIUM_AVAILABLE:
        print("Error: Selenium is required. Install with: pip install selenium")
        sys.exit(1)
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    extractor = USNewsFixedExtractor(
        browser=args.browser,
        headless=not args.no_headless,
        max_entries=args.max_entries,
        debug=args.debug,
        page_load_timeout=args.page_timeout
    )
    
    print(f"Starting fixed extraction of US News Rankings...")
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
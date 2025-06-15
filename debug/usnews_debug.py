#!/usr/bin/env python3
"""
US News Rankings Debug Script
Diagnoses why extraction stalls around 400+ entries
"""

import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.common.exceptions import NoSuchElementException
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

class USNewsDebugger:
    def __init__(self):
        self.driver = None
        self.debug_data = {
            'dom_snapshots': [],
            'link_analysis': [],
            'container_analysis': [],
            'performance_metrics': []
        }
        
    def setup_driver(self):
        options = ChromeOptions()
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        self.driver = webdriver.Chrome(options=options)
        logging.info("Browser initialized")
        
    def load_initial_page(self):
        self.driver.get("https://www.usnews.com/education/best-global-universities/rankings")
        time.sleep(5)
        
        # Handle cookie banner
        try:
            close_button = self.driver.find_element(By.CSS_SELECTOR, "button[aria-label='Close']")
            if close_button.is_displayed():
                self.driver.execute_script("arguments[0].click();", close_button)
                logging.info("Closed cookie banner")
                time.sleep(2)
        except:
            pass
            
    def scroll_to_position(self, target_count):
        """Scroll and load until we have approximately target_count universities"""
        logging.info(f"Scrolling to load ~{target_count} universities...")
        
        while True:
            # Count current universities
            links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/education/best-global-universities/']")
            filtered_links = [l for l in links if l.text.strip() and len(l.text.strip()) > 4]
            current_count = len(filtered_links)
            
            logging.info(f"Current count: {current_count}")
            
            if current_count >= target_count:
                break
                
            # Scroll to bottom
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            
            # Try to click load more
            try:
                buttons = self.driver.find_elements(By.TAG_NAME, "button")
                for button in buttons:
                    if button.is_displayed() and 'load' in button.text.lower():
                        self.driver.execute_script("arguments[0].click();", button)
                        logging.info(f"Clicked: {button.text}")
                        time.sleep(5)
                        break
            except:
                pass
                
    def analyze_dom_at_position(self, position_name):
        """Capture detailed DOM analysis at current position"""
        logging.info(f"\n=== Analyzing DOM at {position_name} ===")
        
        analysis = {
            'position': position_name,
            'timestamp': time.time(),
            'metrics': {}
        }
        
        # 1. Count all links
        all_links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/education/best-global-universities/']")
        analysis['metrics']['total_links'] = len(all_links)
        
        # 2. Analyze link patterns
        link_info = []
        for i, link in enumerate(all_links[:5]):  # Sample first 5
            try:
                info = {
                    'text': link.text.strip(),
                    'href': link.get_attribute('href'),
                    'displayed': link.is_displayed(),
                    'parent_tag': link.find_element(By.XPATH, "..").tag_name,
                    'parent_classes': link.find_element(By.XPATH, "..").get_attribute('class')
                }
                link_info.append(info)
            except:
                pass
        analysis['sample_links'] = link_info
        
        # 3. Check for different container structures
        container_selectors = [
            "li[class*='item-list']",
            "[data-testid='ranking-item']",
            ".RankingItem",
            "div[class*='ranking']",
            "article",
            "[role='listitem']"
        ]
        
        container_counts = {}
        for selector in container_selectors:
            elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
            if elements:
                container_counts[selector] = len(elements)
                # Sample the structure
                if len(elements) > 0:
                    sample = elements[-1]  # Get last one
                    analysis[f'sample_{selector}'] = {
                        'text_length': len(sample.text),
                        'html_snippet': sample.get_attribute('outerHTML')[:200] + '...',
                        'has_rank': '#' in sample.text
                    }
        
        analysis['container_counts'] = container_counts
        
        # 4. Check for lazy loading indicators
        lazy_indicators = self.driver.execute_script("""
            return {
                images_loading: document.querySelectorAll('img[loading="lazy"]').length,
                skeletons: document.querySelectorAll('[class*="skeleton"], [class*="loading"]').length,
                hidden_content: document.querySelectorAll('[style*="display: none"], [hidden]').length,
                viewport_height: window.innerHeight,
                document_height: document.body.scrollHeight,
                current_scroll: window.pageYOffset
            };
        """)
        analysis['lazy_loading'] = lazy_indicators
        
        # 5. Check for virtual scrolling or pagination info
        pagination_info = self.driver.execute_script("""
            // Look for React/Vue data attributes
            const elements = document.querySelectorAll('[data-index], [data-page], [data-item-index]');
            const indices = Array.from(elements).slice(0, 5).map(el => ({
                index: el.getAttribute('data-index') || el.getAttribute('data-item-index'),
                classes: el.className
            }));
            
            // Check for infinite scroll markers
            const scrollMarkers = document.querySelectorAll('[class*="infinite"], [class*="virtual"]');
            
            return {
                data_indices: indices,
                scroll_markers: scrollMarkers.length,
                list_containers: document.querySelectorAll('ul, ol, [role="list"]').length
            };
        """)
        analysis['pagination'] = pagination_info
        
        # 6. Performance check
        performance = self.driver.execute_script("""
            return {
                dom_nodes: document.getElementsByTagName('*').length,
                memory: performance.memory ? performance.memory.usedJSHeapSize : 'N/A'
            };
        """)
        analysis['performance'] = performance
        
        self.debug_data['dom_snapshots'].append(analysis)
        
        # Print summary
        logging.info(f"Total links found: {analysis['metrics']['total_links']}")
        logging.info(f"Container counts: {json.dumps(container_counts, indent=2)}")
        logging.info(f"DOM nodes: {performance['dom_nodes']}")
        
    def find_extraction_differences(self):
        """Analyze why extraction might fail at higher numbers"""
        logging.info("\n=== Analyzing extraction patterns ===")
        
        # Get samples at different scroll positions
        samples = []
        
        # Sample at current bottom
        links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/education/best-global-universities/']")
        
        # Get samples from different parts of the list
        positions = [0, len(links)//4, len(links)//2, 3*len(links)//4, len(links)-1]
        
        for pos in positions:
            if pos < len(links):
                link = links[pos]
                try:
                    # Navigate up to find container
                    container = link
                    for _ in range(5):  # Go up max 5 levels
                        parent = container.find_element(By.XPATH, "..")
                        if '#' in parent.text:
                            container = parent
                            break
                        container = parent
                    
                    sample = {
                        'position': pos,
                        'link_text': link.text.strip(),
                        'container_html': container.get_attribute('outerHTML')[:300],
                        'container_tag': container.tag_name,
                        'container_classes': container.get_attribute('class'),
                        'has_rank': '#' in container.text,
                        'text_length': len(container.text)
                    }
                    samples.append(sample)
                except Exception as e:
                    logging.error(f"Error sampling position {pos}: {e}")
                    
        self.debug_data['extraction_samples'] = samples
        
        # Log patterns
        for sample in samples:
            logging.info(f"\nPosition {sample['position']}:")
            logging.info(f"  University: {sample['link_text']}")
            logging.info(f"  Container: {sample['container_tag']}.{sample['container_classes']}")
            logging.info(f"  Has rank: {sample['has_rank']}")
            
    def save_debug_report(self):
        """Save condensed debug report"""
        report = {
            'summary': {
                'total_snapshots': len(self.debug_data['dom_snapshots']),
                'extraction_samples': len(self.debug_data.get('extraction_samples', []))
            },
            'snapshots': []
        }
        
        # Condense snapshots
        for snapshot in self.debug_data['dom_snapshots']:
            condensed = {
                'position': snapshot['position'],
                'total_links': snapshot['metrics']['total_links'],
                'containers': snapshot['container_counts'],
                'performance': snapshot['performance'],
                'lazy_loading': snapshot['lazy_loading']
            }
            
            # Add sample structure if different from previous
            if snapshot.get('sample_links'):
                condensed['link_pattern'] = {
                    'sample_text': snapshot['sample_links'][0]['text'],
                    'parent_tag': snapshot['sample_links'][0]['parent_tag'],
                    'parent_classes': snapshot['sample_links'][0]['parent_classes']
                }
                
            report['snapshots'].append(condensed)
            
        # Add extraction samples
        if self.debug_data.get('extraction_samples'):
            report['extraction_patterns'] = [
                {
                    'position': s['position'],
                    'university': s['link_text'],
                    'container': f"{s['container_tag']}.{s['container_classes']}",
                    'has_rank': s['has_rank']
                }
                for s in self.debug_data['extraction_samples']
            ]
            
        # Save to file
        with open('usnews_debug_report.json', 'w') as f:
            json.dump(report, f, indent=2)
            
        logging.info("\nDebug report saved to: usnews_debug_report.json")
        
        # Print key insights
        print("\n=== KEY INSIGHTS ===")
        if len(report['snapshots']) >= 2:
            early = report['snapshots'][0]
            late = report['snapshots'][-1]
            
            print(f"\nDOM Growth:")
            print(f"  Early ({early['position']}): {early['performance']['dom_nodes']} nodes")
            print(f"  Late ({late['position']}): {late['performance']['dom_nodes']} nodes")
            
            print(f"\nLink Count:")
            print(f"  Early: {early['total_links']} links")
            print(f"  Late: {late['total_links']} links")
            
            print(f"\nContainer differences:")
            for selector in early['containers']:
                if selector in late['containers']:
                    early_count = early['containers'][selector]
                    late_count = late['containers'][selector]
                    if early_count != late_count:
                        print(f"  {selector}: {early_count} -> {late_count}")
                        
    def run_diagnosis(self):
        """Run complete diagnosis"""
        try:
            self.setup_driver()
            self.load_initial_page()
            
            # Analyze at ~100 universities
            self.scroll_to_position(100)
            self.analyze_dom_at_position("~100 universities")
            
            # Analyze at ~400 universities
            self.scroll_to_position(400)
            self.analyze_dom_at_position("~400 universities")
            
            # Try to get past 450
            self.scroll_to_position(450)
            self.analyze_dom_at_position("~450 universities")
            
            # Analyze extraction patterns
            self.find_extraction_differences()
            
            # Save report
            self.save_debug_report()
            
        finally:
            if self.driver:
                self.driver.quit()

if __name__ == "__main__":
    debugger = USNewsDebugger()
    debugger.run_diagnosis()
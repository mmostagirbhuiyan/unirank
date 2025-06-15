#!/usr/bin/env python3
"""
US News Performance Profiler
Identifies exact cause of slowdown around 400-500 range
"""

import time
import json
import statistics
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options as ChromeOptions
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

class PerformanceProfiler:
    def __init__(self):
        self.driver = None
        self.performance_data = []
        self.timing_samples = {
            'find_containers': [],
            'process_container': [],
            'extract_text': [],
            'find_links': [],
            'click_load_more': [],
            'dom_query_time': []
        }
        
    def setup_driver(self):
        options = ChromeOptions()
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        self.driver = webdriver.Chrome(options=options)
        logging.info("Browser initialized")
        
    def load_to_position(self, target_containers):
        """Load page to approximately target number of containers"""
        self.driver.get("https://www.usnews.com/education/best-global-universities/rankings")
        time.sleep(5)
        
        # Handle cookie
        try:
            close_button = self.driver.find_element(By.CSS_SELECTOR, "button[aria-label='Close']")
            if close_button.is_displayed():
                self.driver.execute_script("arguments[0].click();", close_button)
                time.sleep(2)
        except:
            pass
            
        # Load to target
        while True:
            containers = self.driver.find_elements(By.CSS_SELECTOR, "li[class*='item-list']")
            if len(containers) >= target_containers:
                break
                
            # Scroll and click load more
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            
            try:
                buttons = self.driver.find_elements(By.TAG_NAME, "button")
                for button in buttons:
                    if button.is_displayed() and 'load' in button.text.lower():
                        self.driver.execute_script("arguments[0].click();", button)
                        logging.info(f"Loading... Current: {len(containers)} containers")
                        time.sleep(5)
                        break
            except:
                pass
                
    def profile_extraction_at_position(self, position_name, sample_count=10):
        """Profile extraction performance at current position"""
        logging.info(f"\n=== Profiling at {position_name} ===")
        
        results = {
            'position': position_name,
            'samples': []
        }
        
        # Get current state
        total_containers = len(self.driver.find_elements(By.CSS_SELECTOR, "li[class*='item-list']"))
        logging.info(f"Total containers: {total_containers}")
        
        # Take multiple samples
        for i in range(sample_count):
            sample = self._measure_extraction_cycle()
            results['samples'].append(sample)
            
            # Also measure specific bottlenecks
            self._measure_dom_operations()
            
        # Calculate statistics
        avg_times = {}
        for key in self.timing_samples:
            if self.timing_samples[key]:
                avg_times[key] = statistics.mean(self.timing_samples[key][-sample_count:])
                
        results['average_times_ms'] = avg_times
        results['total_containers'] = total_containers
        
        # Check for specific slowdown indicators
        results['slowdown_factors'] = self._analyze_slowdown_factors()
        
        self.performance_data.append(results)
        
        # Log summary
        logging.info(f"Average times (ms):")
        for operation, avg_time in avg_times.items():
            logging.info(f"  {operation}: {avg_time:.2f}")
            
    def _measure_extraction_cycle(self):
        """Measure a complete extraction cycle"""
        cycle_start = time.time()
        
        # 1. Find containers
        t1 = time.time()
        containers = self.driver.find_elements(By.CSS_SELECTOR, "li[class*='item-list']")
        t2 = time.time()
        self.timing_samples['find_containers'].append((t2 - t1) * 1000)
        
        # 2. Process last 5 containers (simulate new data)
        process_times = []
        for container in containers[-5:]:
            t3 = time.time()
            
            # Extract text
            t4 = time.time()
            text = container.text
            t5 = time.time()
            self.timing_samples['extract_text'].append((t5 - t4) * 1000)
            
            # Find links
            t6 = time.time()
            links = container.find_elements(By.CSS_SELECTOR, "a[href*='/education/best-global-universities/']")
            t7 = time.time()
            self.timing_samples['find_links'].append((t7 - t6) * 1000)
            
            process_time = (time.time() - t3) * 1000
            process_times.append(process_time)
            
        if process_times:
            avg_process = statistics.mean(process_times)
            self.timing_samples['process_container'].append(avg_process)
            
        cycle_time = (time.time() - cycle_start) * 1000
        
        return {
            'cycle_time_ms': cycle_time,
            'containers_found': len(containers),
            'avg_container_process_ms': avg_process if process_times else 0
        }
        
    def _measure_dom_operations(self):
        """Measure specific DOM operations that might be slow"""
        operations = [
            # Test different selector types
            ("CSS selector query", "li[class*='item-list']"),
            ("Tag name query", "li"),
            ("XPath query", "//li[contains(@class, 'item-list')]"),
            # Test JavaScript execution
            ("JS execution", None)
        ]
        
        for op_name, selector in operations:
            t1 = time.time()
            
            if selector:
                elements = self.driver.find_elements(By.CSS_SELECTOR if "CSS" in op_name else 
                                                   By.TAG_NAME if "Tag" in op_name else 
                                                   By.XPATH, selector)
            else:
                # Test JavaScript execution speed
                self.driver.execute_script("return document.querySelectorAll('li').length")
                
            t2 = time.time()
            
            if "CSS selector" in op_name:  # Track main selector
                self.timing_samples['dom_query_time'].append((t2 - t1) * 1000)
                
    def _analyze_slowdown_factors(self):
        """Check for specific causes of slowdown"""
        factors = {}
        
        # 1. Check DOM complexity
        dom_stats = self.driver.execute_script("""
            return {
                total_elements: document.getElementsByTagName('*').length,
                total_listeners: Array.from(document.querySelectorAll('*')).filter(
                    el => typeof el.onclick === 'function' || el.hasAttribute('onclick')
                ).length,
                images: document.images.length,
                iframes: document.getElementsByTagName('iframe').length,
                scripts: document.scripts.length
            };
        """)
        factors['dom_stats'] = dom_stats
        
        # 2. Check for memory/GC pressure
        if self.driver.capabilities.get('goog:chromeOptions'):
            try:
                memory = self.driver.execute_script("return performance.memory")
                factors['memory'] = {
                    'used_mb': memory.get('usedJSHeapSize', 0) / 1048576,
                    'total_mb': memory.get('totalJSHeapSize', 0) / 1048576
                }
            except:
                pass
                
        # 3. Check for specific container patterns
        containers = self.driver.find_elements(By.CSS_SELECTOR, "li[class*='item-list']")
        if containers:
            # Sample container complexity
            sample_containers = containers[-10:]  # Last 10
            complexities = []
            
            for container in sample_containers:
                child_count = len(container.find_elements(By.XPATH, ".//*"))
                text_length = len(container.text)
                complexities.append({
                    'children': child_count,
                    'text_length': text_length
                })
                
            factors['container_complexity'] = {
                'avg_children': statistics.mean([c['children'] for c in complexities]),
                'avg_text_length': statistics.mean([c['text_length'] for c in complexities])
            }
            
        # 4. Check for lazy loading or virtual scrolling artifacts
        factors['scroll_position'] = self.driver.execute_script("""
            return {
                scroll_y: window.pageYOffset,
                doc_height: document.body.scrollHeight,
                viewport_height: window.innerHeight,
                distance_from_bottom: document.body.scrollHeight - window.pageYOffset - window.innerHeight
            };
        """)
        
        return factors
        
    def save_profile_report(self):
        """Save performance profile report"""
        report = {
            'summary': {
                'positions_profiled': len(self.performance_data)
            },
            'profiles': []
        }
        
        # Summarize each position
        for profile in self.performance_data:
            summary = {
                'position': profile['position'],
                'total_containers': profile['total_containers'],
                'average_times_ms': profile['average_times_ms'],
                'dom_complexity': profile['slowdown_factors']['dom_stats'],
                'memory_mb': profile['slowdown_factors'].get('memory', {}).get('used_mb', 'N/A')
            }
            
            # Add container complexity if available
            if 'container_complexity' in profile['slowdown_factors']:
                summary['container_complexity'] = profile['slowdown_factors']['container_complexity']
                
            report['profiles'].append(summary)
            
        # Identify trends
        if len(report['profiles']) >= 2:
            report['performance_trends'] = self._analyze_trends(report['profiles'])
            
        # Save report
        with open('usnews_performance_profile.json', 'w') as f:
            json.dump(report, f, indent=2)
            
        logging.info("\nPerformance profile saved to: usnews_performance_profile.json")
        
        # Print insights
        print("\n=== PERFORMANCE INSIGHTS ===")
        for i, profile in enumerate(report['profiles']):
            print(f"\n{profile['position']}:")
            print(f"  Containers: {profile['total_containers']}")
            print(f"  Find containers: {profile['average_times_ms'].get('find_containers', 0):.2f}ms")
            print(f"  Process container: {profile['average_times_ms'].get('process_container', 0):.2f}ms")
            print(f"  DOM elements: {profile['dom_complexity']['total_elements']}")
            print(f"  Memory: {profile.get('memory_mb', 'N/A')}MB")
            
    def _analyze_trends(self, profiles):
        """Analyze performance trends across positions"""
        trends = {}
        
        # Compare key metrics
        metrics = ['find_containers', 'process_container', 'extract_text']
        for metric in metrics:
            values = []
            for profile in profiles:
                if metric in profile['average_times_ms']:
                    values.append(profile['average_times_ms'][metric])
                    
            if len(values) >= 2:
                trends[f'{metric}_change'] = {
                    'start': values[0],
                    'end': values[-1],
                    'percent_change': ((values[-1] - values[0]) / values[0] * 100) if values[0] > 0 else 0
                }
                
        # DOM growth
        dom_sizes = [p['dom_complexity']['total_elements'] for p in profiles]
        if len(dom_sizes) >= 2:
            trends['dom_growth'] = {
                'start': dom_sizes[0],
                'end': dom_sizes[-1],
                'percent_growth': ((dom_sizes[-1] - dom_sizes[0]) / dom_sizes[0] * 100)
            }
            
        return trends
        
    def run_profiling(self):
        """Run complete performance profiling"""
        try:
            self.setup_driver()
            
            # Profile at key positions
            positions = [
                (100, "~100 universities"),
                (300, "~300 universities"),
                (400, "~400 universities (pre-slowdown)"),
                (450, "~450 universities (slowdown zone)"),
                (500, "~500 universities (deep slowdown)")
            ]
            
            for target, name in positions:
                logging.info(f"\nLoading to {name}...")
                self.load_to_position(target)
                self.profile_extraction_at_position(name, sample_count=5)
                time.sleep(2)  # Brief pause between profiles
                
            # Save comprehensive report
            self.save_profile_report()
            
        finally:
            if self.driver:
                self.driver.quit()

if __name__ == "__main__":
    profiler = PerformanceProfiler()
    profiler.run_profiling()
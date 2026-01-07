from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time
import logging

def setup_driver():
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    return webdriver.Chrome(options=options)

def test_page(page_num):
    driver = setup_driver()
    url = f"https://www.usnews.com/education/best-global-universities/rankings?page={page_num}"
    print(f"Testing {url}")
    driver.get(url)
    time.sleep(5)
    
    try:
        # Try to find the first rank item
        # Using a generic selector based on previous file knowledge
        items = driver.find_elements(By.CSS_SELECTOR, "section[class*='DetailCardGlobalUniversities__CardContainer']")
        if items:
            text = items[0].text.replace('\n', ' ')[:50]
            print(f"Page {page_num} first item: {text}")
        else:
            print(f"Page {page_num}: No items found")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    test_page(2)
    test_page(3)

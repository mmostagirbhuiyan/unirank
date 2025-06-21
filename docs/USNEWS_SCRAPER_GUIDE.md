# US News Rankings Scraper Guide 📰

**Detailed guide for the US News Best Global Universities Rankings scrapers (`scripts/usnews_direct_extractor_legacy.py` and `scripts/usnews_direct_extractor_selenium.py`)**

---

## 📋 Overview

This section covers the Python scripts responsible for extracting university ranking data from the US News Best Global Universities Rankings. Unlike the other JavaScript-based scrapers that read local files, these scripts are designed for direct extraction from the US News website.

There are two primary scripts for this purpose:

1.  **`usnews_direct_extractor_legacy.py`**: A simpler, potentially less robust scraper, likely for historical or direct static page content.
2.  **`usnews_direct_extractor_selenium.py`**: A more robust scraper that uses Selenium for dynamic content loading, making it more resilient to website changes or JavaScript-rendered data.

Both scripts aim to output the US News ranking data into a standardized CSV format (`usnews_rankings.csv`), which is then consumed by the main aggregation script (`scripts/scrape-rankings.js`).

---

## 🔧 How It Works

### `usnews_direct_extractor_selenium.py` (Recommended)

This script leverages Selenium to interact with a web browser (e.g., Chrome, Firefox) to scrape data from the US News website. This approach is powerful for websites that dynamically load content using JavaScript.

1.  **Browser Automation**: It initializes a headless browser (or a visible one, depending on configuration) using Selenium WebDriver.
2.  **Page Navigation**: It navigates to the US News ranking page.
3.  **Dynamic Content Handling**: It waits for JavaScript-rendered elements to load, ensuring all ranking data is available before extraction.
4.  **Data Extraction**: It identifies and extracts university names, ranks, and countries from the web page's HTML structure.
5.  **Data Cleaning**: Basic cleaning and formatting of extracted data are performed.
6.  **Output**: The extracted data is written to a CSV file.

### `usnews_direct_extractor_legacy.py` (Legacy/Alternative)

This script might use simpler HTTP requests (e.g., `requests` library) or a less sophisticated parsing method (e.g., `BeautifulSoup`) to extract data.

1.  **HTTP Request**: Fetches the HTML content of the US News ranking page.
2.  **HTML Parsing**: Parses the static HTML content to find ranking data.
3.  **Data Extraction & Cleaning**: Extracts and cleans the university name, rank, and country.
4.  **Output**: Writes the extracted data to a CSV file.

---

## 🚀 Usage

Both scripts are typically run from the command line and require Python to be installed.

### `usnews_direct_extractor_selenium.py`

This is the recommended script for up-to-date US News data extraction.

```bash
python scripts/usnews_direct_extractor_selenium.py -o frontend/public/data/usnews_rankings.csv
```

### Parameters:

-   `-o` or `--output`: **Required**. Specifies the output CSV file path. Typically `frontend/public/data/usnews_rankings.csv`.
-   `-l` or `--limit` (optional): Limits the number of universities to scrape. Useful for testing.

### Examples:

-   **Scrape and save to default location**:
    ```bash
    python scripts/usnews_direct_extractor_selenium.py -o frontend/public/data/usnews_rankings.csv
    ```

-   **Scrape top 50 universities**:
    ```bash
    python scripts/usnews_direct_extractor_selenium.py -o frontend/public/data/usnews_rankings.csv -l 50
    ```

### `usnews_direct_extractor_legacy.py`

Use this script as an alternative if `selenium.py` encounters issues or for specific legacy data needs.

```bash
python scripts/usnews_direct_extractor_legacy.py -o frontend/public/data/usnews_rankings.csv
```

### Parameters:

-   `-o` or `--output`: **Required**. Specifies the output CSV file path.
-   `-l` or `--limit` (optional): Limits the number of universities to scrape.

---

## 📊 Expected Output

Both scripts output a CSV file (e.g., `usnews_rankings.csv`) with the following structure:

```csv
"University","Rank","Country"
"Harvard University",1,"United States"
"Massachusetts Institute of Technology (MIT)",2,"United States"
"..."
```

---

## 🔍 Troubleshooting

-   **Missing Python Dependencies**: Ensure all required Python packages (e.g., `selenium`, `pandas`, `requests`, `BeautifulSoup4` depending on the script) are installed. Check `requirements.txt` and install with `pip install -r requirements.txt`.
-   **WebDriver Issues (Selenium)**:
    -   Ensure you have a compatible web browser (Chrome, Firefox) installed.
    -   Make sure the corresponding WebDriver (e.g., `chromedriver`, `geckodriver`) is installed and accessible in your system's PATH.
    -   Check for browser version compatibility with the WebDriver.
-   **Website Structure Changes**: US News might change its website HTML structure frequently. If the script stops working, it's likely due to changes in the website's layout, and the script's selectors will need to be updated.
-   **IP Blocking/Rate Limiting**: Aggressive scraping might lead to your IP being temporarily blocked by the website. Implement delays or use proxies if necessary.

---

## 🔗 Related Components

-   `scripts/scrape-rankings.js`: The main script that reads the `usnews_rankings.csv` generated by these scrapers.
-   `frontend/public/data/usnews_rankings.csv`: The output file for these scrapers.
-   `requirements.txt`: Lists Python dependencies for these scripts.

---

## 💡 Maintenance & Updates

-   **Website Changes**: These scripts are highly susceptible to changes in the US News website structure. Regular maintenance and updates are required to ensure their continued functionality.
-   **WebDriver Updates**: Keep your Selenium WebDriver updated to match your browser version.
-   **Proxy/VPN**: For large-scale scraping, consider integrating proxy rotation or VPN services to avoid IP blocking.

---

<div align="center">

**📈 Keep your US News data fresh and accurate!**

[🏠 Home](../README.md) · [📊 Aggregation Guide](AGGREGATION_GUIDE.md) · [🎯 Mapping Tools](MAPPING_TOOLS_GUIDE.md) · [⚙️ Scrape Rankings](SCRAPE_RANKINGS_GUIDE.md) · [🕷️ QS Scraper](QS_SCRAPER_GUIDE.md) · [🕰️ THE Scraper](THE_SCRAPER_GUIDE.md) · [🏆 ARWU Scraper](ARWU_SCRAPER_GUIDE.md) · [📰 US News Scraper](USNEWS_SCRAPER_GUIDE.md)

</div> 
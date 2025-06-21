# ARWU Rankings Scraper Guide 🏆

**Detailed guide for the Academic Ranking of World Universities (ARWU) scraper (`scripts/arwu-scraper.js`)**

---

## 📋 Overview

The `scripts/arwu-scraper.js` script is responsible for extracting university ranking data from the Academic Ranking of World Universities (ARWU), also known as the Shanghai Ranking. Similar to the other scraper scripts, its purpose is to read pre-downloaded ARWU ranking data and process it into a standardized format for the main aggregation script (`scripts/scrape-rankings.js`).

This script currently reads from a local `.csv` file.

---

## 🔧 How It Works

The `arwu-scraper.js` script performs the following steps:

1.  **File Location**: It expects the ARWU ranking data to be in a CSV file located at `frontend/public/data/arwu_rankings.csv`.
2.  **Data Reading**: It uses the `csv-parser` library to read the specified CSV file.
3.  **Data Extraction**: It iterates through the rows of the CSV, extracting the university name, rank, and country.
4.  **Data Cleaning**: It performs basic cleaning on the extracted data, such as trimming whitespace. ARWU rankings often have combined ranks for universities beyond a certain threshold (e.g., "101-150"), and this script is designed to handle such formats by converting them to a numerical representation (e.g., the lower bound of the range).
5.  **Output Format**: It returns an array of objects, where each object represents a university with its `name`, `rank`, and `country`.

### Key Functions:

-   `scrapeARWURankings(limit)`: This is the main function exposed by the script. It takes an optional `limit` parameter to process only a certain number of top entries.

---

## 🚀 Usage

This script is primarily designed to be called internally by `scripts/scrape-rankings.js`. However, you can run it independently for testing or debugging purposes:

```bash
node scripts/arwu-scraper.js [limit]
```

### Parameters:

-   `[limit]` (optional): An integer specifying the number of top universities to process. If not provided, it processes all available entries in the file.

### Examples:

-   **Process all ARWU rankings**:
    ```bash
    node scripts/arwu-scraper.js
    ```

-   **Process top 100 ARWU rankings**:
    ```bash
    node scripts/arwu-scraper.js 100
    ```

---

## 📊 Expected Output

When `scrapeARWURankings` is called, it returns a Promise that resolves to an array of university objects, structured as follows:

```javascript
[
  {
    name: "Harvard University",
    rank: 1,
    country: "United States"
  },
  {
    name: "Stanford University",
    rank: 2,
    country: "United States"
  },
  // ...
]
```

--- 

## 🔍 Troubleshooting

-   **File Not Found**: Ensure that `frontend/public/data/arwu_rankings.csv` exists and is accessible.
-   **Data Format Issues**: If the script fails to read data, verify that the CSV file's columns for university name, rank, and country are as expected by the script. Pay special attention to rank formats, especially ranges (e.g., "101-150").
-   **Empty Output**: Check if the CSV file contains data and if the `limit` parameter is not set too low, filtering out all entries.

---

## 🔗 Related Components

-   `scripts/scrape-rankings.js`: The main script that calls `arwu-scraper.js` to get ARWU data for aggregation.
-   `frontend/public/data/arwu_rankings.csv`: The source data file for this scraper.
-   `package.json`: Contains the `csv-parser` dependency required for reading CSV files.

---

## 💡 Maintenance & Updates

-   **New ARWU Data**: When new ARWU ranking data is released, you will need to replace `arwu_rankings.csv` with the updated file.
-   **CSV Column Changes**: If the column headers or their order in the ARWU CSV file change, `arwu-scraper.js` will need to be updated to correctly extract the `name`, `rank`, and `country`.

---

<div align="center">

**📈 Keep your ARWU data fresh and accurate!**

[🏠 Home](../README.md) · [📊 Aggregation Guide](AGGREGATION_GUIDE.md) · [🎯 Mapping Tools](MAPPING_TOOLS_GUIDE.md) · [⚙️ Scrape Rankings](SCRAPE_RANKINGS_GUIDE.md) · [🕷️ QS Scraper](QS_SCRAPER_GUIDE.md) · [🕰️ THE Scraper](THE_SCRAPER_GUIDE.md)

</div> 
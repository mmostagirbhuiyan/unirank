# QS Rankings Scraper Guide 🕷️

**Detailed guide for the QS World University Rankings scraper (`scripts/qs-scraper.js`)**

---

## 📋 Overview

The `scripts/qs-scraper.js` script is responsible for extracting university ranking data specifically from the QS World University Rankings source. It's designed to read the QS ranking data, process it, and output it in a standardized format that can be used by the main aggregation script (`scripts/scrape-rankings.js`).

This script currently reads from a local `.xlsx` file, indicating that the QS data is pre-downloaded or manually updated.

---

## 🔧 How It Works

The `qs-scraper.js` script performs the following steps:

1.  **File Location**: It expects the QS ranking data to be in an Excel file (`.xlsx`) located at `frontend/public/data/qs_rankings_2026.xlsx`.
2.  **Data Reading**: It uses the `xlsx` library to read the specified Excel file. It extracts data from the first sheet.
3.  **Data Extraction**: It iterates through the rows of the Excel sheet, extracting the university name, rank, and country.
4.  **Data Cleaning**: It performs basic cleaning on the extracted data, such as trimming whitespace and ensuring data types are correct (e.g., rank is a number).
5.  **Output Format**: It returns an array of objects, where each object represents a university with its `name`, `rank`, and `country`.

### Key Functions:

-   `scrapeQSRankings(limit)`: This is the main function exposed by the script. It takes an optional `limit` parameter to process only a certain number of top entries.

---

## 🚀 Usage

This script is primarily designed to be called internally by `scripts/scrape-rankings.js`. However, you can run it independently for testing or debugging purposes:

```bash
node scripts/qs-scraper.js [limit]
```

### Parameters:

-   `[limit]` (optional): An integer specifying the number of top universities to process. If not provided, it processes all available entries in the file.

### Examples:

-   **Process all QS rankings**:
    ```bash
    node scripts/qs-scraper.js
    ```

-   **Process top 100 QS rankings**:
    ```bash
    node scripts/qs-scraper.js 100
    ```

---

## 📊 Expected Output

When `scrapeQSRankings` is called, it returns a Promise that resolves to an array of university objects, structured as follows:

```javascript
[
  {
    name: "Harvard University",
    rank: 1,
    country: "United States"
  },
  {
    name: "Massachusetts Institute of Technology (MIT)",
    rank: 2,
    country: "United States"
  },
  // ...
]
```

---

## 🔍 Troubleshooting

-   **File Not Found**: Ensure that `frontend/public/data/qs_rankings_2026.xlsx` exists and is accessible.
-   **Data Format Issues**: If the script fails to read data, verify that the Excel file's columns for university name, rank, and country are as expected by the script.
-   **Empty Output**: Check if the Excel sheet contains data and if the `limit` parameter is not set too low, filtering out all entries.

---

## 🔗 Related Components

-   `scripts/scrape-rankings.js`: The main script that calls `qs-scraper.js` to get QS data for aggregation.
-   `frontend/public/data/qs_rankings_2026.xlsx`: The source data file for this scraper.
-   `package.json`: Contains the `xlsx` dependency required for reading Excel files.

---

## 💡 Maintenance & Updates

-   **New QS Data**: When new QS ranking data is released, you will need to replace `qs_rankings_2026.xlsx` with the updated file. You might need to adjust the file name reference in `qs-scraper.js` if the naming convention changes.
-   **QS Website Changes**: If QS changes its website structure or API (if it were to be scraped directly), this script would need significant updates. Since it reads a local file, it's less prone to breaking due to website changes.
-   **Excel Column Changes**: If the column headers or their order in the QS Excel file change, `qs-scraper.js` will need to be updated to correctly extract the `name`, `rank`, and `country`.

---

<div align="center">

**📈 Keep your QS data fresh and accurate!**

[🏠 Home](../README.md) · [📊 Aggregation Guide](AGGREGATION_GUIDE.md) · [🎯 Mapping Tools](MAPPING_TOOLS_GUIDE.md) · [⚙️ Scrape Rankings](SCRAPE_RANKINGS_GUIDE.md)

</div> 
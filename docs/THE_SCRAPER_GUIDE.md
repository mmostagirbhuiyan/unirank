# THE Rankings Scraper Guide 🕰️

**Detailed guide for the Times Higher Education (THE) World University Rankings scraper (`scripts/the-scraper.js`)**

---

## 📋 Overview

The `scripts/the-scraper.js` script is dedicated to extracting university ranking data from the Times Higher Education (THE) World University Rankings source. Similar to the QS scraper, this script is designed to read pre-downloaded THE ranking data and process it into a standardized format for the main aggregation script (`scripts/scrape-rankings.js`).

This script currently reads from a local `.csv` file.

---

## 🔧 How It Works

The `the-scraper.js` script performs the following steps:

1.  **File Location**: It expects the THE ranking data to be in a CSV file located at `frontend/public/data/the_rankings.csv`.
2.  **Data Reading**: It uses the `csv-parser` library to read the specified CSV file.
3.  **Data Extraction**: It iterates through the rows of the CSV, extracting the university name, rank, and country.
4.  **Data Cleaning**: It performs basic cleaning on the extracted data, such as trimming whitespace and handling potential inconsistencies in ranking values (e.g., "701-800" might be converted to a numerical range or an average).
5.  **Output Format**: It returns an array of objects, where each object represents a university with its `name`, `rank`, and `country`.

### Key Functions:

-   `scrapeTHERankings(limit)`: This is the main function exposed by the script. It takes an optional `limit` parameter to process only a certain number of top entries.

---

## 🚀 Usage

This script is primarily designed to be called internally by `scripts/scrape-rankings.js`. However, you can run it independently for testing or debugging purposes:

```bash
node scripts/the-scraper.js [limit]
```

### Parameters:

-   `[limit]` (optional): An integer specifying the number of top universities to process. If not provided, it processes all available entries in the file.

### Examples:

-   **Process all THE rankings**:
    ```bash
    node scripts/the-scraper.js
    ```

-   **Process top 100 THE rankings**:
    ```bash
    node scripts/the-scraper.js 100
    ```

---

## 📊 Expected Output

When `scrapeTHERankings` is called, it returns a Promise that resolves to an array of university objects, structured as follows:

```javascript
[
  {
    name: "University of Oxford",
    rank: 1,
    country: "United Kingdom"
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

-   **File Not Found**: Ensure that `frontend/public/data/the_rankings.csv` exists and is accessible.
-   **Data Format Issues**: If the script fails to read data, verify that the CSV file's columns for university name, rank, and country are as expected by the script. Pay special attention to rank formats (e.g., ranges vs. single numbers).
-   **Empty Output**: Check if the CSV file contains data and if the `limit` parameter is not set too low, filtering out all entries.

---

## 🔗 Related Components

-   `scripts/scrape-rankings.js`: The main script that calls `the-scraper.js` to get THE data for aggregation.
-   `frontend/public/data/the_rankings.csv`: The source data file for this scraper.
-   `package.json`: Contains the `csv-parser` dependency required for reading CSV files.

---

## 💡 Maintenance & Updates

-   **New THE Data**: When new THE ranking data is released, you will need to replace `the_rankings.csv` with the updated file.
-   **CSV Column Changes**: If the column headers or their order in the THE CSV file change, `the-scraper.js` will need to be updated to correctly extract the `name`, `rank`, and `country`.

---

<div align="center">

**📈 Keep your THE data fresh and accurate!**

[🏠 Home](../README.md) · [📊 Aggregation Guide](AGGREGATION_GUIDE.md) · [🎯 Mapping Tools](MAPPING_TOOLS_GUIDE.md) · [⚙️ Scrape Rankings](SCRAPE_RANKINGS_GUIDE.md) · [🕷️ QS Scraper](QS_SCRAPER_GUIDE.md)

</div> 
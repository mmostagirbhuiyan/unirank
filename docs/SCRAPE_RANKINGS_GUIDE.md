# Scrape Rankings Script Usage Guide 📈

**Comprehensive guide for the main data scraping, standardization, and aggregation script**

---

## 📋 Overview

The `scripts/scrape-rankings.js` script is the central orchestrator of the university ranking aggregation process. It performs the following key functions:

1.  **Reads raw data** from various university ranking sources (QS, THE, ARWU, US News).
2.  **Applies standardization rules** to university names, including custom rules, enhanced pattern matching, and manual mappings.
3.  **Consolidates data** from all sources into a unified structure.
4.  **Aggregates rankings** using the Borda Count methodology.
5.  **Saves the final aggregated data** to `frontend/public/data/aggregated-rankings.json`.

This script is crucial for maintaining a consistent and accurate dataset of university rankings.

---

## 🔧 How It Works

The script operates in several stages:

### 1. **Initialization**
-   Loads `manual-university-mapping.json` for manual overrides.
-   Loads US News canonical names from `usnews_rankings.csv`.
-   Initializes the `EnhancedNameMatcher` for advanced standardization.
-   Sets source weights and maximum ranks for aggregation.

### 2. **Data Reading & Standardization**
For each ranking source (QS, THE, ARWU, US News):
-   It calls the respective scraper function (e.g., `scrapeQSRankings`, `scrapeTHERankings`, `scrapeARWURankings`). Note that for US News, it directly reads from the local `usnews_rankings.csv` file.
-   It then applies the `standardizeUniversityName()` function to each university name from the raw data. This function performs:
    -   Basic cleaning (trimming, diacritic removal, punctuation handling).
    -   Application of the `EnhancedNameMatcher`'s pattern-based transformations (e.g., apostrophe removal, geographical indicator removal).
    -   Lookup against loaded manual mappings for overrides.
    -   Fuzzy matching against US News canonical names.
-   Invalid or incomplete entries are filtered out.

### 3. **Data Consolidation**
-   All standardized university data from different sources are merged into a single `universitiesData` object, keyed by the standardized university name.
-   This step ensures that different names for the same university across sources are combined into a single entry.

### 4. **Ranking Aggregation**
-   The consolidated university data is passed to the `aggregateRankings()` function (from `scripts/aggregation.js`).
-   This function calculates an aggregated rank for each university using the Borda Count method, taking into account source weights and maximum ranks.

### 5. **Output**
-   The final aggregated ranking data is saved to `frontend/public/data/aggregated-rankings.json` in a human-readable JSON format.

---

## 🚀 Usage

You can run the `scrape-rankings.js` script from your terminal:

```bash
node scripts/scrape-rankings.js [limit]
```

### Parameters:

-   `[limit]` (optional): An integer specifying the number of top universities to process from each source. If not provided, it defaults to `200`. This is useful for quicker debugging or partial data generation.

### Examples:

-   **Run full aggregation (default limit 200)**:
    ```bash
    node scripts/scrape-rankings.js
    ```

-   **Run aggregation for top 500 universities from each source**:
    ```bash
    node scripts/scrape-rankings.js 500
    ```

-   **Check the consolidated university count**:
    ```bash
    node scripts/scrape-rankings.js | grep "Consolidated data"
    ```
    *(Expected output: `Consolidated data for X unique universities after standardization.`)*

---

## 📊 Key Outputs

-   **Console Logs**: The script provides real-time updates on data processing, standardization, and aggregation progress.
-   **`frontend/public/data/aggregated-rankings.json`**: This is the primary output file, containing the final aggregated and standardized university ranking data.

---

## 🔍 Troubleshooting

-   **University count changes unexpectedly**:
    -   Check `scripts/enhanced_name_matcher.js` for recent changes in transformation rules.
    -   Review `frontend/public/data/manual-university-mapping.json` for unintended overrides.
    -   Run `node scripts/data-quality-monitor.js` for detailed insights on duplicates and variations.
-   **Specific university names are not merging**:
    -   Inspect the raw data from the sources.
    -   Test the names with the `EnhancedNameMatcher` directly (e.g., using a debug script like `scripts/debug_queens_matching.js` from previous tasks, though remember to delete temporary scripts).
    -   Consider adding a new manual mapping if it's an edge case not covered by automation.
-   **Script fails with errors**:
    -   Check the console output for specific error messages.
    -   Ensure all required data files (e.g., `usnews_rankings.csv`) are present in `frontend/public/data/`.
    -   Verify Node.js dependencies are installed (`npm install` in the root directory).

---

## 🔗 Related Components

This script integrates with several other core components:

-   **Individual Scrapers**: `qs-scraper.js`, `the-scraper.js`, `arwu-scraper.js`, `usnews_direct_extractor_selenium.py`, `usnews_direct_extractor_legacy.py`
-   **Aggregation Logic**: `aggregation.js` (Borda Count implementation)
-   **Name Standardization Engine**: `enhanced_name_matcher.js`
-   **Mapping Files**: `manual-university-mapping.json`, `suggested-university-mapping.json`
-   **Data Quality Tools**: `data-quality-monitor.js`, `suggest-new-mappings.js`, `apply-suggested-mappings.js` (covered in `MAPPING_TOOLS_GUIDE.md`)

---

## 📈 Next Steps for Optimization

-   **Performance**: For very large datasets, consider optimizing file I/O or in-memory processing.
-   **Error Handling**: Enhance error logging and reporting.
-   **Extensibility**: Ensure new sources can be easily integrated by following existing scraper patterns.

---

<div align="center">

**📊 A robust and accurate ranking aggregation starts here!**

[🏠 Home](../README.md) · [🛠️ Automation Workflow](AUTOMATION_WORKFLOW_GUIDE.md) · [🎯 Mapping Tools](MAPPING_TOOLS_GUIDE.md)

</div> 
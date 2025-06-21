# University Rankings Data Scrapers Guide 🕷️

**Comprehensive guide for all university ranking data scrapers**

---

## 📋 Overview

The university rankings aggregator uses dedicated scraper scripts to extract data from 4 major ranking sources. Each scraper is designed to process data from its specific source and output standardized university ranking information for the main aggregation pipeline.

### **Available Data Sources**

| Source | Script | Data File | Format | Universities |
|--------|--------|-----------|--------|--------------|
| **QS World Rankings** | `scripts/qs-scraper.js` | `frontend/public/data/qs_rankings.csv` | CSV | ~1000 |
| **THE World Rankings** | `scripts/the-scraper.js` | `frontend/public/data/the_rankings.csv` | CSV | ~999 |
| **ARWU (Shanghai Rankings)** | `scripts/arwu-scraper.js` | `frontend/public/data/arwu_rankings.csv` | CSV | ~1000 |
| **US News Global** | `scripts/usnews_direct_extractor_selenium.py` | `frontend/public/data/usnews_rankings.csv` | CSV | ~980 |

---

## 🔧 How Scrapers Work

### **Common Architecture**

All scrapers follow a similar pattern:

1. **Data Input**: Read from CSV files (or direct scraping for US News)
2. **Data Processing**: Extract university name, rank, and country
3. **Data Cleaning**: Standardize formats and handle special cases
4. **Output**: Return standardized array of university objects

### **Standard Output Format**

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
  }
  // ...
]
```

---

## 📊 **QS World Rankings Scraper**

### **Usage**
```bash
# Process all QS rankings
node scripts/qs-scraper.js

# Process top 100 only
node scripts/qs-scraper.js 100
```

### **Data Source**
- **File**: `frontend/public/data/qs_rankings.csv`
- **Source**: [universityrankings.ch](https://www.universityrankings.ch) QS data
- **Update Frequency**: Annual

### **Special Handling**
- Handles QS-specific ranking format
- Processes university names with parenthetical information
- Manages QS country naming conventions

---

## 🕰️ **THE World Rankings Scraper**

### **Usage**
```bash
# Process all THE rankings
node scripts/the-scraper.js

# Process top 100 only
node scripts/the-scraper.js 100
```

### **Data Source**
- **File**: `frontend/public/data/the_rankings.csv`
- **Source**: [universityrankings.ch](https://www.universityrankings.ch) THE data
- **Update Frequency**: Annual

### **Special Handling**
- Processes THE rank ranges (e.g., "701-800")
- Handles THE-specific university naming patterns
- Manages country code variations

---

## 🏆 **ARWU (Shanghai Rankings) Scraper**

### **Usage**
```bash
# Process all ARWU rankings
node scripts/arwu-scraper.js

# Process top 100 only
node scripts/arwu-scraper.js 100
```

### **Data Source**
- **File**: `frontend/public/data/arwu_rankings.csv`
- **Source**: [universityrankings.ch](https://www.universityrankings.ch) ARWU data
- **Update Frequency**: Annual

### **Special Handling**
- Converts ARWU rank ranges (e.g., "101-150") to numerical values
- Handles ARWU's specific institutional naming
- Processes ARWU country formats

---

## 🇺🇸 **US News Global Rankings Scraper**

### **Usage**
```bash
# Update US News data (Python with Selenium)
python scripts/usnews_direct_extractor_selenium.py -o frontend/public/data/usnews_rankings.csv
```

### **Data Source**
- **Method**: Direct website scraping with Selenium
- **Source**: [usnews.com](https://www.usnews.com/education/best-global-universities/rankings)
- **Update Frequency**: Manual scraping when needed

### **Special Features**
- **Real-time scraping**: Extracts live data from US News website
- **Selenium automation**: Handles dynamic content loading
- **Robust extraction**: Manages pagination and JavaScript rendering
- **CSV output**: Standardized format matching other sources

### **Requirements**
```bash
pip install selenium beautifulsoup4 pandas
```

### **Advanced Options**
```bash
# Scrape with custom output file
python scripts/usnews_direct_extractor_selenium.py -o custom_output.csv
```

---

## 🚀 **Running All Scrapers**

### **Standard Operation**

Most scrapers are automatically called by the main aggregation script:

```bash
# Runs all scrapers and aggregates data
node scripts/scrape-rankings.js
```

### **Manual Updates**

Only US News requires manual updates:

```bash
# 1. Update US News data
python scripts/usnews_direct_extractor_selenium.py -o frontend/public/data/usnews_rankings.csv

# 2. Run aggregation (includes all other scrapers)
node scripts/scrape-rankings.js
```

### **Testing Individual Scrapers**

```bash
# Test each scraper independently
node scripts/qs-scraper.js 10
node scripts/the-scraper.js 10  
node scripts/arwu-scraper.js 10
python scripts/usnews_direct_extractor_selenium.py
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **File Not Found Errors**
```bash
# Ensure data files exist
ls -la frontend/public/data/
# Should show: qs_rankings.csv, the_rankings.csv, arwu_rankings.csv, usnews_rankings.csv
```

#### **Empty Output**
- Check if CSV files contain data
- Verify limit parameter isn't too restrictive
- Ensure file encoding is correct (UTF-8)

#### **Data Format Issues**
- Verify CSV column headers match expected format
- Check for special characters or encoding problems
- Validate rank formats (numbers vs ranges)

#### **US News Scraping Failures**
- Check internet connection
- Verify Selenium webdriver is installed
- US News website structure may have changed
- Try legacy extractor as fallback

### **Debugging Commands**

```bash
# Check file contents
head -5 frontend/public/data/qs_rankings.csv
head -5 frontend/public/data/the_rankings.csv

# Validate JSON output
node scripts/qs-scraper.js 5 | jq .

# Test US News scraper
python scripts/usnews_direct_extractor_selenium.py --test
```

---

## 🔧 **Data Updates & Maintenance**

### **Regular Updates (Annual)**

1. **QS, THE, ARWU**: Download updated CSV files from [universityrankings.ch](https://www.universityrankings.ch)
2. **US News**: Run scraper to get latest data
3. **Validation**: Run aggregation to ensure all sources work correctly

### **Data Sources Updates**

When ranking organizations release new data:

```bash
# 1. Update data files
# Replace frontend/public/data/{source}_rankings.csv with new data

# 2. Validate format
node scripts/{source}-scraper.js 5

# 3. Run full aggregation test
node scripts/scrape-rankings.js
```

### **Scraper Code Updates**

If data source formats change:

1. **Identify changes**: Compare old vs new data file structures
2. **Update parsers**: Modify extraction logic in relevant scraper
3. **Test thoroughly**: Validate output format and data accuracy
4. **Update documentation**: Reflect any changes in this guide

---

## 📈 **Data Quality & Monitoring**

### **Validation Checks**

```bash
# Check data integrity after updates
node scripts/data-integrity-check.js

# Monitor university counts
node scripts/automation-helpers/baseline-monitor.js status

# Verify no data corruption
node scripts/data-quality-monitor.js
```

### **Expected Data Ranges**

| Source | Expected Count | Typical Range |
|--------|----------------|---------------|
| QS | ~1000 | 999-1000 |
| THE | ~999 | 999 |
| ARWU | ~1000 | 1000 |
| US News | ~980 | 980-1000 |

### **Quality Metrics**

- **Coverage**: All sources should have complete data
- **Consistency**: University names should follow standard patterns
- **Accuracy**: Rankings should be sequential and reasonable
- **Completeness**: No missing essential fields (name, rank, country)

---

## 🔗 **Integration with Main System**

### **Aggregation Pipeline**

The scrapers integrate with the main system through:

1. **`scripts/scrape-rankings.js`**: Calls all scrapers and aggregates results
2. **Name standardization**: Applies 5-tier name matching hierarchy
3. **Data validation**: Ensures data integrity and quality
4. **Output generation**: Creates final aggregated rankings JSON

### **Related Components**

- **[Enhanced Matching System](ENHANCED_MATCHING.md)**: University name standardization
- **[Manual Mapping Guide](MANUAL_MAPPING_GUIDE.md)**: Cross-source name mapping
- **[Data Integrity Guide](DATA_INTEGRITY_GUIDE.md)**: Quality assurance
- **[Automation Workflow Guide](AUTOMATION_WORKFLOW_GUIDE.md)**: Pattern automation

---

## 📚 **Development & Extension**

### **Adding New Data Sources**

To add a new ranking source:

1. **Create scraper script**: Follow existing pattern in `scripts/new-source-scraper.js`
2. **Implement standard interface**: Return array of `{name, rank, country}` objects
3. **Add to aggregation**: Include in `scripts/scrape-rankings.js`
4. **Update documentation**: Add to this guide and main README

### **Scraper Template**

```javascript
#!/usr/bin/env node
const csv = require('csv-parser');
const fs = require('fs');

async function scrapeNewSource(limit = null) {
    const results = [];
    
    return new Promise((resolve, reject) => {
        fs.createReadStream('frontend/public/data/new_source_rankings.csv')
            .pipe(csv())
            .on('data', (row) => {
                if (limit && results.length >= limit) return;
                
                results.push({
                    name: row['University Name']?.trim(),
                    rank: parseInt(row['Rank']),
                    country: row['Country']?.trim()
                });
            })
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

module.exports = { scrapeNewSource };

// CLI usage
if (require.main === module) {
    const limit = process.argv[2] ? parseInt(process.argv[2]) : null;
    scrapeNewSource(limit)
        .then(results => console.log(JSON.stringify(results, null, 2)))
        .catch(console.error);
}
```

---

## 🎯 **Best Practices**

### **Data Handling**
- ✅ Always validate input data before processing
- ✅ Handle encoding issues (UTF-8, special characters)
- ✅ Trim whitespace and normalize formats
- ✅ Provide meaningful error messages

### **Error Handling**
- ✅ Graceful degradation when data sources fail
- ✅ Clear error messages for debugging
- ✅ Fallback options when possible
- ✅ Comprehensive logging

### **Performance**
- ✅ Stream processing for large datasets
- ✅ Optional limit parameters for testing
- ✅ Efficient memory usage
- ✅ Fast processing (<30 seconds total)

### **Maintenance**
- ✅ Regular data updates (annual)
- ✅ Monitor for source format changes
- ✅ Keep documentation current
- ✅ Test after any updates

---

<div align="center">

**📊 Keep your university ranking data fresh and accurate!**

[🏠 Home](../README.md) · [📊 Enhanced Matching](ENHANCED_MATCHING.md) · [🛠️ Automation Workflow](AUTOMATION_WORKFLOW_GUIDE.md) · [🎯 Manual Mapping](MANUAL_MAPPING_GUIDE.md)

</div> 
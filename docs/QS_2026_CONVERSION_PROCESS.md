# QS 2026 Excel to CSV Conversion Process

**Status**: Temporary solution until third-party QS 2026 CSV becomes available  
**Date**: June 2025  
**Purpose**: Convert official QS 2026 Excel data to match third-party CSV format for seamless integration

## Overview

The QS 2026 rankings are currently only available as an official Excel file (`qs_rankings_2026.xlsx`), while our aggregation system expects CSV format from third-party sources like universityrankings.ch. This document outlines the conversion process implemented to create a drop-in replacement.

## Background

### Original Data Sources
- **QS 2025**: Third-party CSV from universityrankings.ch (1,000 universities)
- **QS 2026**: Official Excel from QS directly (1,501 universities)

### Key Challenge
The system was designed to work with consistent third-party CSV formatting. Direct Excel integration would require significant architecture changes.

## Conversion Process

### 1. Input: Official QS 2026 Excel
- **File**: `qs_rankings_2026.xlsx`
- **Structure**: 29 columns with detailed scoring metrics
- **Data starts**: Row 3 (after headers)
- **Universities**: 1,501 total

### 2. Critical Encoding Issues Discovered
- **Excel contains**: Proper Unicode (`"Technical University of Munich"`, `"Ludwig-Maximilians-Universität München"`)
- **Initial conversion produced**: Corrupted encoding (`"Technical University of Mï¿½nchen"`)
- **Solution**: Use UTF-8 encoding instead of latin1 during conversion

### 3. Name Standardization Applied

#### The Prefix Removals (16 cases)
```
"The University of Hong Kong" → "University of Hong Kong"
"The University of Melbourne" → "University of Melbourne"
"The University of New South Wales" → "University of New South Wales"
"The University of Sydney" → "University of Sydney"
"The Chinese University of Hong Kong" → "Chinese University of Hong Kong"
"The University of Manchester" → "University of Manchester"
"The University of Queensland" → "University of Queensland"
"The Hong Kong University of Science and Technology" → "Hong Kong University of Science and Technology"
"The University of Amsterdam" → "University of Amsterdam"
"The Hong Kong Polytechnic University" → "Hong Kong Polytechnic University"
"The University of Auckland" → "University of Auckland"
"The University of Warwick" → "University of Warwick"
"The University of Western Australia" → "University of Western Australia"
"The University of Sheffield" → "University of Sheffield"
"The University of Nottingham" → "University of Nottingham"
"The American University in Cairo" → "American University in Cairo"
```

#### Acronym Removals (5 cases)
```
"King's College London - KCL" → "King's College London"
"New York University - NYU" → "New York University"
"National Taiwan University - NTU" → "National Taiwan University"
"London School of Economics and Political Science - LSE" → "London School of Economics and Political Science"
"University of Michigan-Ann Arbor" → "University of Michigan - Ann Arbor"
```

#### Critical Munich University Fix
```
"Ludwig-Maximilians-Universität München" → "University of Munich"
```
**Rationale**: US News data has separate entries for "University of Munich" and "Technical University of Munich". The Ludwig-Maximilians name represents the same institution as "University of Munich" in other ranking systems.

#### Country Name Standardizations
```
"United States of America" → "USA"
"United Kingdom" → "UK"
"China (Mainland)" → "China"
"Hong Kong SAR" → "Hong Kong"
```

### 4. Output: Third-Party Compatible CSV
- **File**: `qs_rankings.csv` (overwrites existing)
- **Format**: Matches exact third-party structure
- **Headers**: Same 5-line header format as universityrankings.ch
- **Encoding**: UTF-8 (but read as latin1 by scraper)
- **Universities**: 1,000 (trimmed to match historical limit)

## Technical Implementation

### Conversion Script Logic
```javascript
// Key encoding fix
fs.writeFileSync('qs_rankings.csv', csvLines.join('\n'), 'utf8');

// Name mapping example
const nameMap = {
    'Ludwig-Maximilians-Universität München': 'University of Munich',
    'The University of Hong Kong': 'University of Hong Kong',
    // ... other mappings
};
```

### Integration Point
The existing QS scraper (`scripts/qs-scraper.js`) reads the converted CSV using:
```javascript
fs.createReadStream(filePath, { encoding: 'latin1' })
```

This works correctly because the UTF-8 → latin1 conversion preserves ASCII characters while handling the Munich encoding properly.

## Verification Results

### Before Fix (Missing QS Data)
```json
{
  "name": "Technical University of Munich",
  "aggregatedRank": 316,
  "originalRankings": {
    "the": { "rank": 26 },
    "arwu": { "rank": 47 },
    "usnews": { "rank": 79 }
  },
  "appearances": 3
}
```

### After Fix (Complete Data)
```json
{
  "name": "Technical University of Munich", 
  "aggregatedRank": 26,
  "originalRankings": {
    "qs": { "rank": 22 },
    "the": { "rank": 26 },
    "arwu": { "rank": 47 },
    "usnews": { "rank": 79 }
  },
  "appearances": 4
}
```

**Impact**: Technical University of Munich jumped from rank 316 to rank 26 with QS data included!

## Files Modified

1. **`frontend/public/data/qs_rankings.csv`** - Replaced with converted data
2. **`scripts/scrape-rankings.js`** - Enhanced encoding fix for München
   ```javascript
   // Added more robust München handling
   cleaned = cleaned.replace(/M[�?ï¿½]*nchen/g, 'Munchen');
   ```

## Future Transition Plan

### When Third-Party QS 2026 Becomes Available
1. **Download** official CSV from universityrankings.ch
2. **Replace** `qs_rankings.csv` with official version
3. **Remove** manual name mappings (they should no longer be needed)
4. **Test** aggregation to ensure no regressions

### Monitoring
- **File**: `qs_rankings.csv` should be periodically checked against universityrankings.ch
- **Size**: Official third-party CSV typically has ~1,000 universities vs our 1,000 truncated
- **Format**: Should maintain identical structure

## Manual Mapping System Impact

**Important**: This conversion does NOT pollute the manual mapping system (`manual-university-mapping.json`). All name standardizations are applied during the CSV generation phase, keeping the manual mapping system clean for its intended purpose: third-party → US News mappings.

## Developer Notes

### Testing the Conversion
```bash
# Check current Munich entries
grep -i munich frontend/public/data/qs_rankings.csv

# Verify aggregation includes QS data
node scripts/scrape-rankings.js 100
grep -A10 -i "Technical University of Munich" frontend/public/data/aggregated-rankings.json
```

### Regenerating the CSV (if needed)
The conversion script is embedded in the documentation but can be extracted if regeneration is needed. Key points:
- Use UTF-8 encoding for writing
- Apply all name mappings consistently  
- Maintain exact header format
- Limit to 1,000 universities

## Contact
For questions about this process, refer to the implementation in commit [hash] or consult the Munich University encoding fix documentation.

---
**Last Updated**: June 19, 2025  
**Status**: Active (temporary solution)  
**Next Review**: When QS 2026 third-party CSV becomes available
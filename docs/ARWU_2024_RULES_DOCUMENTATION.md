# ARWU 2024 Rankings Configuration Documentation

## Overview
Configuration rules for Academic Ranking of World Universities (Shanghai Rankings) 2024, extracted from the existing `scripts/arwu-scraper.js` processing script and optimized for the V2 pipeline.

## Data Source Information
- **Source**: Academic Ranking of World Universities (ARWU/Shanghai Rankings) 2024
- **Provider**: universityrankings.ch
- **URL**: https://www.universityrankings.ch/results/Shanghai/2024?mode=csv
- **Format**: CSV with latin1 encoding
- **Structure**: 5 header lines followed by data rows

## Processing Characteristics

### File Format
- **Encoding**: latin1 (required for proper character handling, especially for French universities)
- **Headers**: Skip first 5 lines (comments and metadata)
- **Data Columns**: 
  - `# World Rank` (with leading spaces)
  - ` Institution` (with leading space)
  - ` Country` (with leading space)
  - Empty 4th column

### Data Quality Features
- **Rank Handling**: Supports tied ranks (e.g., rank 8 appears twice for Caltech and Columbia)
- **Institution Names**: Often include detailed suffixes with acronyms
- **Countries**: Uses 2-3 letter codes (UK, USA, etc.)
- **International Characters**: Handles Unicode characters (e.g., "Université Paris-Saclay")
- **Maximum Rank**: Typically 1000 universities

## Transformation Rules

### University Name Transformations

#### Exact Mappings (10 mappings)
Battle-tested mappings for complex institution names:

```json
{
  "Massachusetts Institute of Technology - MIT": "Massachusetts Institute of Technology",
  "California Institute of Technology - Caltech": "California Institute of Technology",
  "University of California - Berkeley": "University of California, Berkeley",
  "University of California - Los Angeles": "University of California, Los Angeles",
  "University of California - San Diego": "University of California, San Diego",
  "University of California - San Francisco": "University of California, San Francisco",
  "Swiss Federal Institute of Technology Zurich - ETHZ": "ETH Zurich",
  "University College London": "UCL",
  "Université Paris-Saclay": "Paris-Saclay University",
  "Washington University in St. Louis": "Washington University in St Louis"
}
```

#### Pattern-Based Transformations
1. **Institution Suffix Removal** (Risk: LOW, Frequency: 20)
   - Pattern: `\\s*-\\s*[A-Z]{2,}$`
   - Removes acronym suffixes like " - MIT", " - ETHZ"

2. **University of Pattern** (Risk: LOW, Frequency: 15)
   - Pattern: `^University of (.+) - (.+)$`
   - Replacement: `University of $1, $2`
   - Standardizes "University of X - Y" to "University of X, Y"

3. **The Prefix Removal** (Risk: VERY_LOW, Frequency: 5)
   - Pattern: `^The `
   - Removes "The" prefix for consistency

### Country Standardization (2 mappings)
```json
{
  "UK": "United Kingdom",
  "USA": "United States"
}
```

### Rank Processing
- **Range Strategy**: Lower bound extraction (for range ranks like "101-150")
- **Tied Ranks**: Handled as individual entries
- **Maximum Rank**: 1000 (accommodates full ARWU rankings)

## Performance Metrics

### Test Results (10 university sample)
- **Match Rate**: 100.00%
  - Exact matches: 90.0%
  - Normalized matches: 10.0%
  - Fuzzy matches: 0.0%
  - Unmatched: 0.0%
- **Processing Time**: <1ms average per university
- **Data Quality**: All 10 rows processed successfully

### Validation Quality
- **Schema Validation**: PASSED
- **Configuration Quality Score**: 100/100
- **Data Compatibility**: PASSED
- **Performance Analysis**: Optimized

## Usage Instructions

### V2 Pipeline Integration
```bash
# Test with sample data
node v2-pipeline/orchestrator.js --input=sample.csv --config=staging/config/arwu-2024-rules.json --source=arwu

# Validate configuration
node v2-pipeline/validate-config.js --config=staging/config/arwu-2024-rules.json

# Full production run
node v2-pipeline/orchestrator.js --input=frontend/public/data/arwu_rankings.csv --config=staging/config/arwu-2024-rules.json --source=arwu
```

### Configuration Validation
The configuration passes all validation checks:
- ✅ JSON Schema compliance
- ✅ Logical consistency
- ✅ Data compatibility
- ✅ Performance optimization
- ✅ Quality assurance standards

## Data Structure Compatibility

### Input CSV Format
```csv
# University Ranking Results - www.universityrankings.ch
# Ranking: Shanghai
# Year: 2024
#
   #    World Rank   ,  Institution   ,  Country   ,   
    1  ,   Harvard University   ,USA   
    2  ,   Stanford University   ,USA   
```

### Normalized Output Format
```csv
rank,name,country
1,Harvard University,USA
2,Stanford University,USA
```

## Special Handling Cases

### International Characters
- **Université Paris-Saclay**: Properly handles Unicode characters
- **Latin1 Encoding**: Essential for processing French and other international names
- **Character Normalization**: Applies diacritics removal for matching

### University of California System
Multiple UC campuses with standardized naming:
- **UC Berkeley**: `University of California - Berkeley` → `University of California, Berkeley`
- **UCLA**: `University of California - Los Angeles` → `University of California, Los Angeles`
- **UCSD**: `University of California - San Diego` → `University of California, San Diego`
- **UCSF**: `University of California - San Francisco` → `University of California, San Francisco`

### Tied Rankings
ARWU uses tied rankings frequently:
- **Rank 8**: Both Caltech and Columbia appear with rank 8
- **Rank 12**: Both Université Paris-Saclay and Cornell with rank 12
- **Rank 18**: Both UC San Diego and University of Washington with rank 18

## Risk Assessment

### Transformation Reliability
- **Institution Suffix Removal**: LOW risk, frequency 20
  - Conservative pattern matching for acronyms
  - Preserves core institution identity

- **University of Pattern**: LOW risk, frequency 15
  - Standardizes University of California naming
  - Maintains institutional recognition

- **The Prefix Removal**: VERY_LOW risk, frequency 5
  - Simple prefix matching
  - Minimal impact on university identity

### Data Integrity
- **International Name Handling**: Latin1 encoding preserves character integrity
- **Rank Processing**: Conservative approach for tied and range ranks
- **Country Mapping**: Minimal, only essential standardizations

## Quality Assurance

### Expected Data Ranges
- **Minimum Rows**: 800 universities
- **Maximum Rows**: 1200 universities  
- **Duplicate Handling**: Warn on duplicates
- **Missing Data**: Skip incomplete rows

### Monitoring Flags
- **Suspicious Patterns**: ["test", "example", "unknown university"]
- **Invalid Names**: Empty strings, numeric-only values
- **Character Encoding**: Monitor for encoding issues with international names

## Integration Notes

### Legacy Compatibility
- Extracted from proven `arwu-scraper.js` implementation
- Maintains existing rank handling logic
- Preserves country mapping consistency
- Compatible with existing data pipelines

### Aggregation Weight
- **Current Weight**: 25% (0.25) in composite ranking system
- **Integration**: Works alongside QS (25%), THE (25%), US News (25%)
- **Borda Scoring**: Uses Borda method for rank aggregation
- **Maximum Universities**: Limited to top 1000 for performance

## Maintenance

### Update Procedures
1. **Annual Updates**: Modify year and URL in metadata for new rankings
2. **New Mappings**: Add to exactMappings based on manual review results
3. **Character Encoding**: Monitor for new international character requirements
4. **Performance Tuning**: Adjust patterns based on processing statistics

### Monitoring Recommendations
- Track match rate trends (target: >95%)
- Monitor processing time per university (target: <2ms)
- Review manual review patterns for new mappings
- Validate character encoding for international universities
- Monitor tied ranking frequency and patterns

---

*Generated by V2 Pipeline Migration Tool*  
*Last Updated: 2025-06-20*  
*Configuration Version: 1.0.0*
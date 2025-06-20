# QS World University Rankings 2026 - V2 Pipeline Configuration

## Overview

This document provides comprehensive documentation for the QS World University Rankings 2026 configuration file (`staging/config/qs-2026-rules.json`). This configuration was extracted from the existing hardcoded processing script (`scripts/convert-qs-2026-to-csv.js`) as part of the V2 Pipeline migration.

## Configuration File Structure

### Metadata Section

```json
{
  "source": "qs",
  "year": 2026,
  "format": "xlsx",
  "encoding": "utf-8",
  "description": "QS World University Rankings 2026 - Extracted from convert-qs-2026-to-csv.js"
}
```

- **Source**: QS World University Rankings
- **Year**: 2026 ranking cycle
- **Format**: Excel (XLSX) input files
- **Version**: 1.0.0 (initial migration from hardcoded script)

### File Processing Configuration

#### Header Processing
- **Skip Lines**: 2 (removes Excel header rows)
- **Sheet Selection**: First sheet (index 0)
- **Encoding**: UTF-8 for international character support

#### Error Handling
- **Maximum Errors**: 10 before stopping processing
- **Skip Malformed Rows**: Yes (continues processing despite data issues)
- **Critical Error Handling**: Stops on critical errors

### Column Mappings

| Column | Header | Index | Processing Function | Validation |
|--------|--------|-------|-------------------|------------|
| **Rank** | "Rank" | 1 | `handleRangeRanks` | Range support, 1-1500 |
| **Name** | "Institution" | 3 | `normalizeUniversityName` | Min 2 chars, required |
| **Country** | "Country/Territory" | 4 | `standardizeCountry` | Required, standardized |

#### Alternative Headers
- **Rank**: "World Rank", "Ranking"
- **Name**: "University", "Institution Name", "Name"
- **Country**: "Country", "Territory", "Location"

## Transformation Rules

### University Name Transformations

#### 1. Basic Transformations (Applied First)
1. **String Validation**: Ensures valid string input
2. **Case Normalization**: Converts to lowercase for processing
3. **Diacritics Removal**: Removes accents and special characters
4. **Whitespace Normalization**: Standardizes spacing

#### 2. Enhanced Pattern-Based Transformations

##### Acronym Removal
- **Pattern**: ` \([A-Z]{2,}\)$`
- **Purpose**: Removes parenthetical acronyms at end of names
- **Example**: "University of California (UCLA)" → "University of California"
- **Risk Level**: LOW
- **Frequency**: 45 occurrences in QS data

##### Comma Replacement
- **Pattern**: `,`
- **Replacement**: ` -`
- **Purpose**: Standardizes punctuation for consistency
- **Example**: "Berkeley, CA" → "Berkeley - CA"
- **Risk Level**: LOW
- **Frequency**: 23 occurrences

##### "The" Prefix Removal
- **Pattern**: `^The `
- **Purpose**: Removes "The" prefix (after whitelist check)
- **Risk Level**: VERY_LOW
- **Frequency**: 12 occurrences
- **Note**: Only applied after checking against whitelist

#### 3. Exact Mappings (High Priority)

Battle-tested mappings for institutions with complex naming:

| Original Name | Standardized Name |
|---------------|------------------|
| Massachusetts Institute of Technology (MIT) | Massachusetts Institute of Technology - MIT |
| ETH Zurich (Swiss Federal Institute of Technology) | Swiss Federal Institute of Technology Zurich - ETHZ |
| UCL (University College London) | University College London |
| California Institute of Technology (Caltech) | California Institute of Technology - Caltech |
| London School of Economics and Political Science (LSE) | London School of Economics and Political Science |

**Total Exact Mappings**: 12 institutions with verified transformations

#### 4. "The" Prefix Whitelist

Universities that retain "The" prefix (protected from general removal):

- The University of Hong Kong
- The University of Melbourne  
- The University of New South Wales
- The University of Sydney
- The Chinese University of Hong Kong
- The University of Manchester
- The University of Queensland
- The University of Adelaide
- The University of Western Australia
- The Hong Kong University of Science and Technology
- The University of Auckland
- The Australian National University

**Total**: 12 institutions with protected "The" prefix

### Country Standardizations

Comprehensive country name mappings extracted from QS data:

| Original Name | Standardized |
|---------------|-------------|
| United States of America | USA |
| United Kingdom | UK |
| China (Mainland) | China |
| Hong Kong SAR, China | Hong Kong |
| Macao SAR, China | Macao |
| Korea, South | South Korea |
| Russian Federation | Russia |
| Iran, Islamic Republic of | Iran |
| Taiwan, Province of China | Taiwan |

**Additional Variants**:
- United States → USA
- US → USA  
- Great Britain → UK
- Britain → UK
- People's Republic of China → China
- Republic of Korea → South Korea
- Czech Republic → Czechia
- The Netherlands → Netherlands

**Total Mappings**: 18 country standardizations

### Rank Processing

#### Range Handling
- **Strategy**: Lower bound extraction
- **Pattern**: `701-710` → `701`
- **Plus Ranks**: `1000+` → `1000`
- **Maximum Rank**: 1000 (QS typical range)

#### Validation Rules
- **Minimum Rank**: 1
- **Maximum Rank**: 1500 (allows for variations)
- **Range Formats**: Supports hyphen ranges and plus notation
- **Error Handling**: Skips unparseable ranks

## Validation Rules

### Name Validation
- **Minimum Length**: 2 characters
- **Maximum Length**: 200 characters  
- **Empty Values**: Not allowed
- **Invalid Patterns**: Purely numeric, whitespace-only
- **Suspicious Patterns**: "test", "example", "unknown"

### Rank Validation
- **Range**: 1-1500
- **Range Support**: Yes (e.g., "701-710")
- **Plus Notation**: Yes (e.g., "1000+")
- **Empty Values**: Not allowed

### Country Validation
- **Minimum Length**: 2 characters
- **Maximum Length**: 50 characters
- **Empty Values**: Not allowed
- **Standardization**: Applied before validation

## Output Format

### CSV Configuration
- **Columns**: rank, name, country
- **Encoding**: UTF-8
- **Headers**: Included
- **Comments**: QS-specific header comments preserved

### Comment Headers (Preserved from Original)
```
# University Ranking Results - www.universityrankings.ch
# Ranking: QS
# Year: 2026
#
   #    World Rank   ,  Institution   ,  Country   ,   
```

## Quality Assurance

### Data Expectations
- **Minimum Rows**: 500 universities
- **Maximum Rows**: 1200 universities
- **Duplicate Handling**: Warnings generated
- **Missing Data**: Rows skipped with logging

### Outlier Detection
- **Enabled**: Yes
- **Suspicious Patterns**: "test", "example", "unknown university"
- **Action**: Flagged for manual review

## Migration Notes

### Battle-Tested Reliability
- All transformations extracted from production QS 2026 processing script
- **Exact mappings**: 12 verified institution name corrections
- **Country mappings**: 18 standardizations from real QS data
- **Pattern rules**: Frequency-analyzed with risk assessments

### Risk Assessment
- **VERY_LOW**: 1 rule (general "The" prefix removal)
- **LOW**: 2 rules (acronym removal, comma replacement)
- **MEDIUM**: 0 rules
- **HIGH**: 0 rules

### Transformation Frequency
- **Total Transformations**: 3 pattern-based rules
- **Exact Mappings**: 12 high-priority corrections
- **Country Mappings**: 18 standardizations
- **Protected Names**: 12 "The" prefix whitelist entries

## Usage Instructions

### V2 Pipeline Integration

```bash
# Validate configuration
node v2-pipeline/validate-config.js --config=staging/config/qs-2026-rules.json

# Run normalization with QS data
node v2-pipeline/normalize.js \
  --input=staging/raw/qs-2026.xlsx \
  --config=staging/config/qs-2026-rules.json \
  --output=staging/normalized/qs-2026-normalized.csv

# Run complete pipeline
node v2-pipeline/orchestrator.js \
  --config=staging/config/qs-2026-rules.json \
  --input=staging/raw/qs-2026.xlsx \
  --source=qs --year=2026
```

### Testing Recommendations

1. **Configuration Validation**: Always validate before use
2. **Sample Processing**: Test with subset before full processing
3. **Output Comparison**: Compare with original script output for verification
4. **Manual Review**: Check flagged institutions and unmatched universities

## Maintenance Guidelines

### Configuration Updates
- Update `metadata.version` for any changes
- Document changes in `metadata.notes`
- Re-run validation after modifications
- Test with sample data before production use

### Rule Additions
- Add new exact mappings to `exactMappings` section
- Update country mappings in `countries.mappings`
- Use appropriate risk levels for new pattern rules
- Include frequency data when available

### Annual Updates
- Update `metadata.year` for new ranking cycles
- Review and update exact mappings for institution changes
- Verify country names and add new standardizations
- Update expected row ranges in quality assurance

## Related Files

- **Configuration**: `staging/config/qs-2026-rules.json`
- **Schema**: `schemas/normalization-rules-schema.json`
- **Original Script**: `scripts/convert-qs-2026-to-csv.js` (reference)
- **Validation Tool**: `v2-pipeline/validate-config.js`
- **Processing Engine**: `v2-pipeline/normalize.js`

## Support

For questions about this configuration:
1. Review the V2 Developer Onboarding Guide
2. Check the Existing Rules Analysis document
3. Validate configuration with provided tools
4. Test with sample data before production use

---

**Generated as part of V2 Pipeline Migration**  
**Last Updated**: 2024-06-20  
**Configuration Version**: 1.0.0
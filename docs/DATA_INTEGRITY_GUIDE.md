# Data Integrity Verification Guide

This guide documents the comprehensive data integrity verification process for the University Rankings Aggregator system.

## Overview

Data integrity is critical for accurate university rankings aggregation. This system maintains **1753 unique universities** with **≤8 high-confidence duplicates** representing legitimate different institutions.

## Current Status (2024-06-21)

### ✅ Achieved Metrics
- **Total universities**: 1753 (target: 1753 ± 2)
- **High-confidence duplicates**: 8 (target: ≤8)
- **Data integrity**: 100% within acceptable bounds
- **Cross-source merging**: Functional across all 4 ranking sources

### 📊 Historical Improvement
- **From**: 1796 universities, 33 duplicates
- **To**: 1753 universities, 8 duplicates  
- **Improvement**: 75.8% duplicate reduction, 43 universities consolidated

## Data Integrity Standards

### University Count Rules
1. **Never increase**: University count must never go up
2. **Controlled decrease**: Reductions only through verified merges
3. **Target range**: 1753 ± 2 universities (acceptable variance)
4. **Monitoring**: Track changes after every modification

### Duplicate Classification

#### ✅ Acceptable Duplicates (≤8)
Legitimate different institutions with high name similarity:
- Different countries with similar names
- Same country, different institutions with source overlap
- Regional campuses vs main institutions (verified separate)

#### ❌ Problematic Duplicates (0 target)
Same institution appearing multiple times:
- Cross-source naming inconsistencies
- Format variations (abbreviations, language)
- Canonicalization order issues

## Verification Tools

### 1. Primary Quality Monitor
```bash
node scripts/data-quality-monitor.js
```

**Features:**
- Duplicate detection with configurable similarity thresholds
- Source distribution analysis
- Statistical summary and health metrics
- Country-based duplicate investigation

**Output Interpretation:**
```
📊 DATA QUALITY SUMMARY
Universities: 1753
High-confidence duplicates (≥90%): 8
Data integrity: ✅ HEALTHY
```

### 2. Comprehensive Duplicate Analysis
```bash
node debug/analyze-similarity-cases.js
```

**Purpose:** Distinguishes legitimate vs problematic duplicates
- Same country + no source overlap = 🟡 Legitimate merge
- Different countries = 🔴 Keep separate  
- Source overlap = 🔴 Keep separate (different institutions)

### 3. Cross-Country Mapping Detection
```bash
node debug/check-problematic-mappings.js
```

**Purpose:** Identifies incorrect manual mappings that merge universities from different countries

## Verification Workflow

### After System Changes
1. **Run aggregation**
   ```bash
   node scripts/scrape-rankings.js
   ```

2. **Check university count**
   ```bash
   node scripts/data-quality-monitor.js | grep "Universities:"
   ```

3. **Verify duplicate status**
   ```bash
   node scripts/data-quality-monitor.js | grep "duplicates"
   ```

4. **Investigate any increases**
   - University count increase = 🚨 IMMEDIATE ROLLBACK
   - Duplicate increase = 🔍 Investigate new cases

### Before Manual Mapping Changes
1. **Baseline measurement**
   ```bash
   node scripts/data-quality-monitor.js > before.txt
   ```

2. **Apply changes**
   ```bash
   # Edit manual-university-mapping.json
   node scripts/scrape-rankings.js
   ```

3. **Compare results**
   ```bash
   node scripts/data-quality-monitor.js > after.txt
   diff before.txt after.txt
   ```

4. **Validation checks**
   - University count: must not increase
   - Duplicate count: should decrease or stay same
   - New duplicates: investigate legitimacy

## Current Verified "Duplicates"

These 8 high-similarity pairs are confirmed as legitimate different institutions:

### 1. Cross-Country Technology Universities
- **Graz University of Technology** (Austria) - Sources: [qs, the, arwu]
- **Shiraz University of Technology** (Iran) - Sources: [qs, the]
- **Status**: Different countries, source overlap → Keep separate

### 2. Cross-Country Science & Technology  
- **Iran University of Science and Technology** (Iran) - 4 sources
- **Jordan University of Science and Technology** (UAE) - 2 sources  
- **Status**: Different countries, source overlap → Keep separate

### 3. Nanjing Science & Technology Variations
- **Nanjing University of Science & Technology** (China) - 3 sources
- **Nanjing University of Science and Technology** (South Korea) - 2 sources
- **Status**: Different countries, source overlap → Keep separate

### 4. Jordan Science & Technology Variations
- **Jordan University of Science & Technology** (Jordan) - 3 sources
- **Jordan University of Science and Technology** (UAE) - 2 sources
- **Status**: Different countries, source overlap → Keep separate

### 5. Taiwan National Universities
- **National Cheng Kung University** (Taiwan) - 4 sources
- **National Chung Cheng University** (Taiwan) - 1 source
- **Status**: Same country, source overlap → Different institutions

### 6. China Medical University Formats
- **China Medical University Taiwan** (Taiwan) - 2 sources
- **China Medical University (Taiwan)** (Taiwan) - 1 source
- **Status**: Same institution, different formats → **Should be merged**

### 7-8. Iran Medical Universities
- **Iran University of Medical Sciences** (Iran) - 3 sources
- **Guilan University of Medical Sciences** (Iran) - 1 source
- **Arak University of Medical Sciences** (Iran) - 3 sources  
- **Status**: Same country, source overlap → Different cities/institutions

## Alert Conditions

### 🚨 Critical Issues (Immediate Action Required)
- University count increase
- New cross-country duplicates
- Source data corruption
- Manual mapping conflicts

### ⚠️ Warning Conditions (Investigation Needed)
- Duplicate count increase
- Unexpected source redistributions
- New high-similarity pairs
- Canonicalization failures

### ✅ Healthy Indicators
- University count stable or decreased
- Duplicate count stable or decreased
- All sources contributing data
- Manual mappings applied correctly

## Troubleshooting Common Issues

### University Count Increased
1. **Immediate rollback** of recent changes
2. **Identify source** of new universities
3. **Check manual mappings** for incorrect separations
4. **Verify source data** hasn't been corrupted

### New High-Confidence Duplicates
1. **Analyze similarity cases** with verification tool
2. **Check legitimacy** (same vs different institutions)
3. **Add manual mapping** if legitimate merge
4. **Document reasoning** if keeping separate

### Manual Mapping Not Applied
1. **Check canonicalization** order
2. **Add canonicalized form** mapping if needed
3. **Verify JSON syntax** in mapping file
4. **Test with small dataset** first

### Source Integration Issues
1. **Verify file formats** haven't changed
2. **Check encoding** for international characters
3. **Validate data headers** and structure
4. **Test individual source** processing

## Quality Assurance Checklist

### Before Major Changes
- [ ] Backup current aggregated data
- [ ] Record baseline metrics
- [ ] Test changes in isolated environment
- [ ] Prepare rollback plan

### After Changes
- [ ] University count within acceptable range
- [ ] Duplicate count at or below target
- [ ] No new cross-country merges
- [ ] All sources contributing data
- [ ] Manual mappings applied correctly

### Weekly Monitoring
- [ ] Run full data quality check
- [ ] Review new potential duplicates
- [ ] Validate source data freshness
- [ ] Check for automation improvements

## Integration with Development Workflow

### Before Code Changes
```bash
# Establish baseline
node scripts/data-quality-monitor.js > baseline.txt
```

### After Code Changes  
```bash
# Test impact
node scripts/scrape-rankings.js
node scripts/data-quality-monitor.js > current.txt

# Compare with baseline
diff baseline.txt current.txt
```

### Continuous Monitoring
```bash
# Daily health check
node scripts/data-quality-monitor.js | grep -E "(Universities|duplicates|integrity)"
```

## Future Enhancements

### Automated Monitoring
- CI/CD integration for data quality checks
- Automated alerts for integrity violations
- Historical tracking of metrics

### Enhanced Detection
- Machine learning for similarity scoring
- Advanced international name matching
- Real-time duplicate detection

### Reporting
- Dashboard for data quality metrics
- Trend analysis over time
- Source-specific quality reports
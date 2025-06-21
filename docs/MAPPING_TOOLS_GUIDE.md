# University Mapping Tools Usage Guide 🛠️

**Comprehensive guide for using the automated university name mapping suggestion and application tools**

---

## 📋 Overview

This guide covers three essential tools for managing university name mappings:

1. **`data-quality-monitor.js`** - Monitors system health and identifies data quality issues
2. **`suggest-new-mappings.js`** - Discovers potential new manual mappings needed
3. **`apply-suggested-mappings.js`** - Semi-automated application of mapping suggestions

These tools work together to maintain and improve the university name standardization system.

---

## 🔧 Tool Descriptions

### 1. Data Quality Monitor (`data-quality-monitor.js`)

**Purpose**: Monitors system health, detects duplicates, and analyzes mapping effectiveness.

**Features**:
- ✅ Duplicate university detection
- ✅ Name variation analysis  
- ✅ Manual mapping effectiveness evaluation
- ✅ Quality score calculation
- ✅ Comprehensive health reporting

**Usage**:
```bash
# Run comprehensive data quality analysis
node scripts/data-quality-monitor.js
```

**Output**:
- Duplicate detection results
- Name variation analysis
- Manual mapping effectiveness report
- Overall quality score and recommendations

---

### 2. Suggest New Mappings (`suggest-new-mappings.js`)

**Purpose**: Identifies potential duplicate universities that could be merged with manual mappings.

**Features**:
- ✅ High-similarity university detection (≥90% similarity)
- ✅ Confidence scoring based on source coverage
- ✅ Automatic best-name suggestion
- ✅ Conflict detection with existing mappings
- ✅ Detailed suggestion export

**Usage**:
```bash
# Discover new mapping opportunities
node scripts/suggest-new-mappings.js
```

**Output**:
- Creates `frontend/public/data/suggested-new-mappings.json`
- Console report with top suggestions
- Confidence scores and similarity analysis

**Example Output**:
```
🎯 NEW MAPPING SUGGESTIONS REPORT
==================================================

📊 ANALYSIS SUMMARY:
Total Universities Analyzed: 1834
Potential Duplicates Found: 12
High-Confidence Suggestions: 5

💡 TOP MAPPING SUGGESTIONS:

1. CONFIDENCE: 95.2%
   Original: "University of California - Los Angeles"
   Suggested: "University of California Los Angeles"
   Similarity: 92.1%
   Sources: [qs, the] → [arwu, usnews]
```

---

### 3. Apply Suggested Mappings (`apply-suggested-mappings.js`)

**Purpose**: Semi-automated application of mapping suggestions with multiple modes.

**Features**:
- ✅ Interactive review mode (default)
- ✅ Batch mode for high-confidence suggestions
- ✅ Auto mode for bulk application
- ✅ Automatic backup creation
- ✅ Conflict detection and skipping

**Usage**:

#### Interactive Mode (Default)
```bash
# Review each suggestion manually
node scripts/apply-suggested-mappings.js
# or
node scripts/apply-suggested-mappings.js interactive
```

#### Batch Mode
```bash
# Auto-apply only high-confidence suggestions (≥95%)
node scripts/apply-suggested-mappings.js batch
```

#### Auto Mode
```bash
# Apply all suggestions automatically (use with caution)
node scripts/apply-suggested-mappings.js auto
```

**Interactive Commands**:
- `y/yes` - Approve this mapping
- `n/no` - Reject this mapping  
- `s/skip` - Skip this mapping (neutral)
- `q/quit` - Stop review process
- `a/all` - Approve this and all remaining mappings
- `h/help` - Show help message

---

## 🚀 Complete Workflow

### Step 1: Monitor Current State
```bash
# Check current system health
node scripts/data-quality-monitor.js
```

**Look for**:
- Potential duplicates
- Redundant manual mappings
- Quality score trends

### Step 2: Discover New Opportunities
```bash
# Find new mapping suggestions
node scripts/suggest-new-mappings.js
```

**Review**:
- `suggested-new-mappings.json` for detailed suggestions
- Console output for top recommendations
- Confidence scores and similarity analysis

### Step 3: Apply Mappings
```bash
# Interactive review (recommended)
node scripts/apply-suggested-mappings.js

# Or batch apply high-confidence only
node scripts/apply-suggested-mappings.js batch
```

### Step 4: Validate Changes
```bash
# Run aggregation to see impact
node scripts/scrape-rankings.js

# Check university count changes
# Expected: Count should decrease if duplicates were merged
```

### Step 5: Monitor Results
```bash
# Re-run quality monitor to see improvements
node scripts/data-quality-monitor.js
```

---

## 📊 Understanding the Output

### Confidence Scores
- **95-100%**: Very high confidence - safe for batch application
- **90-94%**: High confidence - good for interactive review
- **85-89%**: Medium confidence - requires careful review
- **<85%**: Low confidence - not suggested

### Similarity Scores
- **≥95%**: Extremely similar - likely same university
- **90-94%**: Very similar - probable duplicates
- **85-89%**: Similar - possible duplicates
- **<85%**: Not similar enough for automatic suggestion

### Source Coverage Analysis
- **Different sources**: Higher confidence (likely duplicates)
- **Same sources**: Lower confidence (might be legitimate variations)
- **More sources**: Preferred as canonical name

---

## 🔍 Troubleshooting

### Common Issues

**Q: No suggestions found**
```bash
# This is actually good - means your mappings are comprehensive
# Check data quality monitor for other opportunities
node scripts/data-quality-monitor.js
```

**Q: Too many low-confidence suggestions**
```bash
# Adjust thresholds in suggest-new-mappings.js
# Or use batch mode to apply only high-confidence suggestions
node scripts/apply-suggested-mappings.js batch
```

**Q: Suggestions already exist**
- The tool automatically skips existing mappings
- Check for similar but not identical mappings
- Review manual mappings file for conflicts

**Q: University count not decreasing after applying mappings**
- Mappings may not be taking effect
- Check manual mapping file format
- Re-run aggregation script
- Verify mapping syntax is correct

### Validation Steps

1. **Before applying mappings**:
   ```bash
   # Record current university count
   node scripts/scrape-rankings.js | grep "Consolidated data"
   ```

2. **After applying mappings**:
   ```bash
   # Check new university count
   node scripts/scrape-rankings.js | grep "Consolidated data"
   # Count should decrease if duplicates were merged
   ```

3. **Verify mapping quality**:
   ```bash
   # Run quality monitor
   node scripts/data-quality-monitor.js
   ```

---

## 🎯 Best Practices

### 1. **Start Conservative**
- Begin with batch mode (high-confidence only)
- Use interactive mode for medium-confidence suggestions
- Avoid auto mode unless you're confident in the data

### 2. **Regular Monitoring**
- Run data quality monitor monthly
- Check for new suggestions after data updates
- Monitor university count trends

### 3. **Backup Strategy**
- Tools automatically create backups
- Keep backups of manual mappings before major changes
- Test changes on a copy first if making bulk updates

### 4. **Validation Workflow**
- Always run aggregation after applying mappings
- Check university count changes
- Spot-check a few applied mappings manually

### 5. **Incremental Approach**
- Apply mappings in small batches
- Validate each batch before proceeding
- Monitor impact on aggregated rankings

---

## 📈 Performance Expectations

### Typical Results
- **New installations**: 10-20 high-confidence suggestions
- **Mature systems**: 0-5 suggestions per run
- **After data updates**: 5-15 suggestions
- **University count reduction**: 2-10 universities per batch

### Processing Time
- **Data Quality Monitor**: 10-30 seconds
- **Suggest New Mappings**: 30-60 seconds  
- **Apply Mappings**: Variable (depends on review time)
- **Full Workflow**: 5-15 minutes

---

## 🔗 Related Tools

### Automation Helpers
- **Pattern Discovery**: `scripts/automation-helpers/pattern-discovery.js`
- **Pattern Tester**: `scripts/automation-helpers/pattern-tester.js`
- **Baseline Monitor**: `scripts/automation-helpers/baseline-monitor.js`

### Core Scripts
- **Main Aggregation**: `scripts/scrape-rankings.js`
- **Enhanced Matching**: `scripts/enhanced_name_matcher.js`
- **Legacy Fuzzy Matching**: `scripts/match-universities.js`

### Documentation
- **[Automation Workflow Guide](AUTOMATION_WORKFLOW_GUIDE.md)** - Complete automation development guide
- **[Enhanced Matching](ENHANCED_MATCHING.md)** - Technical details of the matching engine

---

## 📞 Support

### Getting Help
1. Check this guide for common issues
2. Review the main README.md for system overview
3. Check existing manual mappings for examples
4. Run tools with verbose output for debugging

### Contributing
- Report issues with specific university names
- Suggest improvements to confidence scoring
- Share successful workflow patterns
- Contribute to threshold optimization

---

<div align="center">

**🎯 Keep your university rankings accurate and comprehensive!**

[🔧 Automation Tools](../scripts/automation-helpers/) · [📊 Data Quality](../scripts/data-quality-monitor.js) · [🎯 Main Guide](../README.md)

</div> 
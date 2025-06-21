# University Name Mapping & Standardization Guide 🎯

**Comprehensive guide for university name mapping tools, manual mapping management, and legacy fuzzy matching**

---

## 📚 **Table of Contents**

- [Overview](#overview)
- [Manual Mapping System](#manual-mapping-system)
- [Automated Mapping Tools](#automated-mapping-tools)
- [Legacy Fuzzy Matching](#legacy-fuzzy-matching)
- [Complete Workflow](#complete-workflow)
- [Quality Monitoring](#quality-monitoring)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## 📋 **Overview**

The university rankings aggregator uses a sophisticated 5-tier name standardization hierarchy to handle university name variations across different ranking sources:

1. **Pattern-Based Automation** (8 active patterns)
2. **Manual Mapping Lookup** (162 curated entries) ← *Your primary tool*
3. **Legacy Auto-Generated Mappings** (~8k fuzzy matches)
4. **Canonicalized Form Mappings** (handles edge cases)
5. **Original Name Preserved** (fallback)

This guide covers tools and processes for managing **Tier 2** (manual mappings) and **Tier 3** (legacy fuzzy mappings).

---

## 🎯 **Manual Mapping System**

### **Current Statistics**
- **Total Entries**: 162 curated manual mappings
- **Scope**: Cross-source standardization (all 4 ranking sources)
- **Priority**: Highest in the 5-tier hierarchy
- **Purpose**: Handle edge cases that automation cannot reliably resolve

### **File Location**
```
frontend/public/data/manual-university-mapping.json
```

### **Mapping Format**
```json
{
  "originalName": "Original University Name from Source",
  "suggestedStandardizedName": "Preferred Standardized Name"
}
```

### **Common Mapping Categories**

#### **1. Cross-Country Variations (35% of mappings)**
```json
{
  "originalName": "University College London",
  "suggestedStandardizedName": "UCL (University College London)"
}
```

#### **2. Institutional Name Changes (20% of mappings)**
```json
{
  "originalName": "Imperial College of Science, Technology and Medicine",
  "suggestedStandardizedName": "Imperial College London"
}
```

#### **3. Source-Specific Variations (25% of mappings)**
```json
{
  "originalName": "MIT",
  "suggestedStandardizedName": "Massachusetts Institute of Technology"
}
```

#### **4. Complex Academic Structures (20% of mappings)**
```json
{
  "originalName": "University of California - San Francisco",
  "suggestedStandardizedName": "University of California San Francisco"
}
```

### **Adding Manual Mappings**

#### **Method 1: Direct Editing**
```bash
# Open the manual mapping file
code frontend/public/data/manual-university-mapping.json

# Add new entry at the end:
{
  "originalName": "New University Name Variation",
  "suggestedStandardizedName": "Preferred Standard Name"
}
```

#### **Method 2: Using Automated Tools**
```bash
# Discover potential mappings
node scripts/suggest-new-mappings.js

# Review and apply suggestions
node scripts/apply-suggested-mappings.js
```

### **Validation After Adding**
```bash
# Test the mapping works
node scripts/scrape-rankings.js

# Verify university count (should decrease if duplicates merged)
echo "Expected: University count stable or decreased"
```

---

## 🛠️ **Automated Mapping Tools**

### **1. Data Quality Monitor**

**Purpose**: System health monitoring and duplicate detection

```bash
# Run comprehensive analysis
node scripts/data-quality-monitor.js
```

**Features**:
- ✅ Duplicate university detection
- ✅ Name variation analysis  
- ✅ Manual mapping effectiveness evaluation
- ✅ Quality score calculation
- ✅ Comprehensive health reporting

**Output Example**:
```
🏥 DATA QUALITY HEALTH CHECK
================================

📊 SYSTEM OVERVIEW:
- Total Universities: 1753
- Manual Mappings: 162
- High-Confidence Duplicates: 8 (verified as legitimate)
- Data Integrity Score: 98.5%

✅ QUALITY CHECKS:
✅ University count stable
✅ No unexpected duplicates
✅ Manual mappings effective
✅ Source coverage complete
```

### **2. Suggest New Mappings**

**Purpose**: AI-powered discovery of potential duplicate universities

```bash
# Discover mapping opportunities
node scripts/suggest-new-mappings.js
```

**Features**:
- ✅ High-similarity detection (≥90% similarity)
- ✅ Confidence scoring based on source coverage
- ✅ Automatic best-name suggestion
- ✅ Conflict detection with existing mappings
- ✅ Detailed suggestion export

**Output Example**:
```
🎯 NEW MAPPING SUGGESTIONS REPORT
==================================================

📊 ANALYSIS SUMMARY:
Total Universities Analyzed: 1753
Potential Duplicates Found: 12
High-Confidence Suggestions: 5

💡 TOP MAPPING SUGGESTIONS:

1. CONFIDENCE: 95.2%
   Original: "University of California - Los Angeles"
   Suggested: "University of California Los Angeles"
   Similarity: 92.1%
   Sources: [qs, the] → [arwu, usnews]
```

### **3. Apply Suggested Mappings**

**Purpose**: Semi-automated application of mapping suggestions

#### **Interactive Mode (Recommended)**
```bash
# Review each suggestion manually
node scripts/apply-suggested-mappings.js
```

**Interactive Commands**:
- `y/yes` - Approve this mapping
- `n/no` - Reject this mapping  
- `s/skip` - Skip this mapping (neutral)
- `q/quit` - Stop review process
- `a/all` - Approve this and all remaining mappings
- `h/help` - Show help message

#### **Batch Mode**
```bash
# Auto-apply only high-confidence suggestions (≥95%)
node scripts/apply-suggested-mappings.js batch
```

#### **Auto Mode (Use with Caution)**
```bash
# Apply all suggestions automatically
node scripts/apply-suggested-mappings.js auto
```

---

## 🧩 **Legacy Fuzzy Matching**

### **Overview**

The `scripts/match-universities.js` script is a **legacy tool** that generates bulk fuzzy matching suggestions. While still functional, it's largely superseded by pattern-based automation.

### **Current Role**
- **File Generated**: `frontend/public/data/suggested-university-mapping.json`
- **Entries**: ~8,000 fuzzy matches (Tier 3 in hierarchy)
- **Usage**: Fallback when automation and manual mappings don't match
- **Frequency**: Rarely needed (only when adding new data sources)

### **When to Use**
- Adding completely new ranking source with different naming conventions
- Quality of auto-generated mappings degrades significantly
- Major changes to data sources requiring bulk re-matching

### **Usage**
```bash
# Regenerate fuzzy mappings (RARELY NEEDED)
node scripts/match-universities.js
```

⚠️ **Warning**: This script takes several minutes to run and overwrites existing fuzzy mappings. Only use when necessary.

---

## 🚀 **Complete Workflow**

### **Step 1: Monitor Current State**
```bash
# Check system health
node scripts/data-quality-monitor.js
```

**Look for**:
- Potential duplicates
- Redundant manual mappings
- Quality score trends

### **Step 2: Discover New Opportunities**
```bash
# Find new mapping suggestions
node scripts/suggest-new-mappings.js
```

**Review**:
- `suggested-new-mappings.json` for detailed suggestions
- Console output for top recommendations
- Confidence scores and similarity analysis

### **Step 3: Apply Mappings**
```bash
# Interactive review (recommended)
node scripts/apply-suggested-mappings.js

# Or batch apply high-confidence only
node scripts/apply-suggested-mappings.js batch
```

### **Step 4: Validate Changes**
```bash
# Run aggregation to see impact
node scripts/scrape-rankings.js

# Check university count changes
# Expected: Count should decrease if duplicates were merged
```

### **Step 5: Monitor Results**
```bash
# Re-run quality monitor to see improvements
node scripts/data-quality-monitor.js

# Run data integrity check
node scripts/data-integrity-check.js
```

---

## 📈 **Quality Monitoring**

### **Understanding Confidence Scores**
- **95-100%**: Very high confidence - safe for batch application
- **90-94%**: High confidence - good for interactive review
- **85-89%**: Medium confidence - requires careful review
- **<85%**: Low confidence - not suggested

### **Understanding Similarity Scores**
- **≥95%**: Extremely similar - likely same university
- **90-94%**: Very similar - probable duplicates
- **85-89%**: Similar - possible duplicates
- **<85%**: Not similar enough for automatic suggestion

### **Source Coverage Analysis**
- **Different sources**: Higher confidence (likely duplicates)
- **Same sources**: Lower confidence (might be legitimate variations)
- **More sources**: Preferred as canonical name

### **Key Metrics to Monitor**
- **University Count**: Should remain stable (1753 ± 2)
- **Duplicate Count**: ≤8 high-confidence duplicates (all verified)
- **Manual Mapping Count**: 162 (increases with new edge cases)
- **Data Integrity Score**: ≥98%

---

## 🎯 **Best Practices**

### **Manual Mapping Guidelines**

#### **✅ DO:**
- Use the most internationally recognized name
- Prefer official institutional names
- Include disambiguating information when necessary
- Test mappings after adding them
- Document reasoning for complex mappings

#### **❌ DON'T:**
- Create mappings for names that automation handles
- Use source-specific formatting
- Map universities from different countries to same name
- Add mappings without testing impact

### **Mapping Naming Standards**

#### **Preferred Formats:**
```json
// University names
"University of [Location]"

// Institute of Technology
"[Location] Institute of Technology" 

// Medical schools
"[Location] Medical University"

// With disambiguators
"University of [Location] ([Specialty/Campus])"
```

#### **Avoid:**
```json
// Source-specific formatting
"University (QS)", "University - THE"

// Inconsistent abbreviations
"MIT", "M.I.T.", "Mass. Inst. of Tech."

// Location ambiguity
"University of London" (too many institutions)
```

### **Quality Assurance Process**

1. **Before Changes**: Run data quality monitor
2. **Add Mappings**: Use appropriate method (manual or automated)
3. **Test Changes**: Run aggregation pipeline
4. **Validate Results**: Check university count and duplicates
5. **Document**: Update this guide if needed

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **University Count Increases**
**Symptom**: Count goes from 1753 to higher number
**Cause**: Mapping created duplicates instead of merging
**Solution**:
```bash
# Identify problematic mapping
node scripts/data-quality-monitor.js

# Remove or fix mapping in manual-university-mapping.json
# Re-run aggregation to verify fix
node scripts/scrape-rankings.js
```

#### **Expected Mappings Not Working**
**Symptom**: Universities still appearing as separate entries
**Cause**: Mapping not applied or incorrect format
**Solution**:
```bash
# Verify mapping exists in file
grep -i "university name" frontend/public/data/manual-university-mapping.json

# Check for exact name match (case-sensitive)
# Verify JSON syntax is valid
```

#### **Mapping Conflicts**
**Symptom**: Different mappings for same original name
**Cause**: Multiple entries or conflicting automation patterns
**Solution**:
```bash
# Find duplicate mappings
node scripts/apply-suggested-mappings.js --check-conflicts

# Remove duplicates manually
# Prioritize: Manual > Auto-suggested > Fuzzy
```

#### **Quality Score Degradation**
**Symptom**: Data integrity score drops below 95%
**Cause**: Accumulation of mapping issues
**Solution**:
```bash
# Run comprehensive analysis
node scripts/data-quality-monitor.js --verbose

# Focus on highest-impact issues first
# Consider regenerating fuzzy mappings if severe
```

### **Emergency Procedures**

#### **Rollback Bad Mappings**
```bash
# Restore from backup
git checkout HEAD~1 -- frontend/public/data/manual-university-mapping.json

# Re-run aggregation
node scripts/scrape-rankings.js

# Verify restoration
node scripts/data-integrity-check.js
```

#### **System Recovery**
```bash
# Reset to clean state
git checkout main
git pull origin main

# Verify all data files
ls -la frontend/public/data/

# Run full pipeline
node scripts/scrape-rankings.js

# Confirm health
node scripts/automation-helpers/baseline-monitor.js health
```

---

## 📚 **Integration with Other Systems**

### **Related Components**
- **[Enhanced Matching System](ENHANCED_MATCHING.md)**: Pattern-based automation (Tier 1)
- **[Data Integrity Guide](DATA_INTEGRITY_GUIDE.md)**: Quality assurance processes
- **[Automation Workflow Guide](AUTOMATION_WORKFLOW_GUIDE.md)**: Pattern development
- **[Data Scrapers Guide](DATA_SCRAPERS_GUIDE.md)**: Source data management

### **File Dependencies**
- **Input**: Raw university names from scrapers
- **Configuration**: `manual-university-mapping.json`
- **Fallback**: `suggested-university-mapping.json`
- **Output**: Standardized names in `aggregated-rankings.json`

---

## 🎯 **Success Criteria**

A well-maintained mapping system demonstrates:

- ✅ **Stable University Count**: 1753 ± 2 universities
- ✅ **Low Duplicate Rate**: ≤8 high-confidence duplicates (verified)
- ✅ **High Data Integrity**: ≥98% quality score
- ✅ **Effective Automation**: Most name variations handled by patterns
- ✅ **Minimal Manual Overhead**: ~162 manual mappings for edge cases
- ✅ **Cross-Source Consistency**: Names standardized across all 4 sources

**Remember**: The goal is data quality, not mapping quantity. Focus on high-impact mappings that resolve actual duplicates or improve name consistency.

---

<div align="center">

**🎯 Accurate university mapping ensures reliable ranking aggregation!**

[🏠 Home](../README.md) · [📊 Enhanced Matching](ENHANCED_MATCHING.md) · [🛠️ Automation Workflow](AUTOMATION_WORKFLOW_GUIDE.md) · [📈 Data Integrity](DATA_INTEGRITY_GUIDE.md)

</div> 
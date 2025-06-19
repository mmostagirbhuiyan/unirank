# Automation Helper Scripts 🛠️

**Collection of tools to accelerate automation pattern development and testing**

---

## 📋 Available Scripts

### 🔍 `pattern-discovery.js`
**Identifies automation opportunities in manual mappings**

```bash
# Analyze current manual mappings for patterns
node scripts/automation-helpers/pattern-discovery.js

# Generate test scripts for discovered patterns
node scripts/automation-helpers/pattern-discovery.js --generate-tests

# Verbose output with detailed analysis
node scripts/automation-helpers/pattern-discovery.js --verbose
```

**Features:**
- ✅ Risk assessment (Very Low → High)
- ✅ Frequency analysis with implementation priorities  
- ✅ Ready-to-use pattern code snippets
- ✅ Auto-generation of test scripts
- ✅ Automation potential calculations

**Output Example:**
```
🟢🟢 UC System Campus Names (VERY_LOW RISK)
   Count: 9 mappings
   Implementation: cleaned = cleaned.replace(/^University of California - (.+)$/, "University of California $1");
   Examples:
   1. "University of California - Berkeley" → "University of California Berkeley"
```

---

### 🧪 `pattern-tester.js`
**Safely tests automation patterns before implementation**

```bash
# Test a pattern with full safety checks
node scripts/automation-helpers/pattern-tester.js "UC Campuses" "cleaned.replace(/^University of California - (.+)$/, \"University of California \$1\")"

# Dry run - test logic only, don't modify files
node scripts/automation-helpers/pattern-tester.js "Medical University" "cleaned.replace(/^Medical University of (.+)$/, \"Medical University \$1\")" --dry-run

# Verbose output with detailed test results
node scripts/automation-helpers/pattern-tester.js "Pattern Name" "pattern.code()" --verbose --no-backup
```

**Safety Features:**
- ✅ Automatic baseline establishment
- ✅ University count change validation (±2 max)
- ✅ Automatic rollback on failures
- ✅ Backup creation and restoration
- ✅ Pattern logic validation

**Test Sequence:**
1. Establish baseline university count
2. Create backup of modified files
3. Implement pattern in canonicalizeName()
4. Run full aggregation pipeline
5. Validate results and revert if needed

---

### 📊 `baseline-monitor.js`
**Monitors system health and university counts**

```bash
# Check current system status
node scripts/automation-helpers/baseline-monitor.js status

# Run comprehensive health check
node scripts/automation-helpers/baseline-monitor.js health

# Find duplicate universities
node scripts/automation-helpers/baseline-monitor.js duplicates

# Compare with saved baseline
node scripts/automation-helpers/baseline-monitor.js compare baseline.json
```

**Monitoring Features:**
- ✅ University count tracking
- ✅ Manual mappings monitoring
- ✅ Duplicate detection
- ✅ Automation pattern counting
- ✅ Data freshness checking
- ✅ File integrity validation

**Health Check Output:**
```
🏥 COMPREHENSIVE HEALTH CHECK
1. Testing aggregation pipeline... ✅
2. Validating university count... ✅ 1711 universities
3. Checking for duplicates... ✅ No duplicates
4. Checking file integrity... ✅ All files valid
5. Validating automation patterns... ✅ 6 patterns active
```

---

## 🚀 Typical Workflow

### 1. **Pattern Discovery**
```bash
# Find automation opportunities
node scripts/automation-helpers/pattern-discovery.js
```

### 2. **Pattern Testing**
```bash
# Test the most promising pattern (dry run first)
node scripts/automation-helpers/pattern-tester.js "Pattern Name" "pattern.code()" --dry-run

# If dry run passes, test with real implementation
node scripts/automation-helpers/pattern-tester.js "Pattern Name" "pattern.code()"
```

### 3. **Health Monitoring**
```bash
# Check system health before and after changes
node scripts/automation-helpers/baseline-monitor.js health
```

### 4. **Implementation** 
If tests pass, follow the main [Automation Workflow Guide](../../docs/AUTOMATION_WORKFLOW_GUIDE.md)

---

## 💡 Usage Examples

### **Example 1: Complete Pattern Development**

```bash
# 1. Discover patterns
node scripts/automation-helpers/pattern-discovery.js
# Output: Found "UC System Campus Names" pattern with 9 occurrences

# 2. Test pattern logic (safe)
node scripts/automation-helpers/pattern-tester.js "UC Campuses" "cleaned.replace(/^University of California - (.+)$/, \"University of California \$1\")" --dry-run
# Output: ✅ Pattern matches 9/9 test cases

# 3. Test implementation (with automatic rollback)
node scripts/automation-helpers/pattern-tester.js "UC Campuses" "cleaned.replace(/^University of California - (.+)$/, \"University of California \$1\")"
# Output: ✅ University count stable: 1711 → 1711

# 4. If successful, implement manually following workflow guide
```

### **Example 2: System Health Check**

```bash
# Check current status
node scripts/automation-helpers/baseline-monitor.js status
# Universities: 1711, Manual mappings: 106, Patterns: 6

# Run full health check
node scripts/automation-helpers/baseline-monitor.js health
# All checks passed! System is healthy.

# Check for duplicates
node scripts/automation-helpers/baseline-monitor.js duplicates
# ✅ No duplicate universities found
```

### **Example 3: Before/After Comparison**

```bash
# Save baseline before making changes
node scripts/automation-helpers/baseline-monitor.js status > before.txt

# After implementing changes
node scripts/automation-helpers/baseline-monitor.js compare
# Universities: +0, Manual mappings: -9 ✅ Automation working
```

---

## ⚠️ Safety Features

### **Automatic Rollback Triggers**
- University count change > ±2
- Aggregation script errors
- Duplicate universities detected
- File corruption or missing files

### **Backup & Recovery**
- Automatic git-based rollback
- Temporary file backups
- Baseline state preservation
- Error state restoration

### **Validation Checks**
- Pattern logic verification
- University count monitoring
- Duplicate detection
- File integrity checks

---

## 🔧 Configuration

### **Environment Variables**
```bash
# Optional: Set custom thresholds
export MAX_COUNT_CHANGE=2          # Maximum university count change
export PATTERN_MIN_FREQUENCY=3     # Minimum pattern frequency
export BACKUP_ENABLED=true         # Enable automatic backups
```

### **Configuration Files**
Scripts automatically detect and use:
- `baseline.json` - Saved baseline metrics
- `/tmp/automation_baseline.json` - Temporary baseline
- Git history for rollback points

---

## 📚 Integration with Main Workflow

These helper scripts are designed to work with the main [Automation Workflow Guide](../../docs/AUTOMATION_WORKFLOW_GUIDE.md):

1. **Discovery Phase**: Use `pattern-discovery.js` to identify opportunities
2. **Testing Phase**: Use `pattern-tester.js` for safe validation
3. **Implementation Phase**: Follow main workflow guide
4. **Monitoring Phase**: Use `baseline-monitor.js` for ongoing health checks

---

## 🐛 Troubleshooting

### **Script Errors**
```bash
# Check if you're in the right directory
pwd  # Should be in university-ranking-aggregator root

# Ensure dependencies are installed
npm install

# Check file permissions
chmod +x scripts/automation-helpers/*.js
```

### **Pattern Testing Failures**
```bash
# Check pattern syntax
node -e "console.log('cleaned'.replace(/pattern/, 'replacement'))"

# Verify baseline state
node scripts/automation-helpers/baseline-monitor.js health

# Manual rollback if needed
git checkout HEAD -- scripts/scrape-rankings.js
```

### **University Count Issues**
```bash
# Find duplicates
node scripts/automation-helpers/baseline-monitor.js duplicates

# Compare with known good state
node scripts/automation-helpers/baseline-monitor.js compare

# Check automation patterns
grep -n "automation" scripts/scrape-rankings.js
```

---

## 🤝 Contributing

To add new helper scripts:

1. **Follow naming convention**: `action-purpose.js`
2. **Include help/usage**: `--help` flag support
3. **Add safety features**: Automatic rollback, validation
4. **Update this README**: Document usage and examples
5. **Test thoroughly**: Validate on sample data first

---

**💡 Pro Tip**: Always run `baseline-monitor.js health` before and after making changes to ensure system stability!
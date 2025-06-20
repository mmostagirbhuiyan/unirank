# V2 Developer Onboarding Guide

## Welcome to the University Rankings Aggregator V2 Pipeline

This guide provides comprehensive onboarding for developers working on the V2 pipeline overhaul. The V2 architecture represents a strategic evolution from ad-hoc processing to a unified, configuration-driven system.

## 📚 Required Reading (Essential Foundation)

Before writing any code, **ALL developers must read these foundational documents**:

### 1. **Core Philosophy Documents**
- [`docs/AUTOMATION_WORKFLOW_GUIDE.MD`](./AUTOMATION_WORKFLOW_GUIDE.md) - Understanding automation principles
- [`docs/ENHANCED_MATCHING.MD`](./ENHANCED_MATCHING.md) - Advanced matching concepts
- [`docs/OVERHAUL_PIPELINE_V2_PROPOSAL.md`](./OVERHAUL_PIPELINE_V2_PROPOSAL.md) - Strategic context and architecture

**Key Takeaways:**
- The project solves complex data reconciliation from inconsistent sources
- V2 treats **every data source as potentially inconsistent**
- Configuration-driven approach replaces hardcoded solutions
- Focus on maintainability, scalability, and debugging

### 2. **Technical Implementation Plan**
- [`docs/V2_IMPLEMENTATION_PLAN.md`](./V2_IMPLEMENTATION_PLAN.md) - Complete task breakdown and dependencies

## 🏗️ V2 Architecture Overview

### The Problem V2 Solves
**Before V2**: Brittle two-path system
- "Simple Path": Clean data from third-party (QS, THE, ARWU) 
- "Hard Path": Custom solutions for raw data (US News, QS 2026)

**After V2**: Unified architecture
- Every source processed through same pipeline
- Configuration-driven transformations
- Consistent matching and validation
- Robust error handling and recovery

### Core Components

```
Raw Data → Normalization Engine → Multi-Tier Matching → Manual Review → Final Output
    ↓              ↓                    ↓                ↓             ↓
staging/raw/   staging/config/    canonical-list.json  staging/results/  aggregated.json
```

## 🛠️ Development Environment Setup

### Directory Structure
```
project-root/
├── staging/
│   ├── raw/           # Untouched source files
│   ├── normalized/    # Processed CSV files  
│   ├── config/        # Source-specific rules
│   └── results/       # Matching results & logs
├── v2-pipeline/       # All V2 scripts
├── schemas/           # JSON schemas
└── tests/
    ├── unit/
    ├── integration/
    └── performance/
```

### Key Files
- `canonical-universities.json` - Master university list (source of truth)
- `staging/config/{source}-rules.json` - Transformation rules per source
- `v2-pipeline/run-pipeline.js` - Main orchestrator

## 📖 Battle-Tested Knowledge: Rule Mining

### Essential Script Analysis

**Before writing new code**, analyze these existing implementations for proven logic:

#### 1. **`scripts/standardize-usnews.js`** - US News Processing
**Key Patterns to Extract:**
- Cross-reference matching with other sources
- String similarity thresholds (0.85-0.9)
- Country standardization rules
- Name cleaning and validation

#### 2. **`scripts/convert-qs-2026-to-csv.js`** - QS Processing  
**Key Patterns to Extract:**
- Country mappings (e.g., "United States of America" → "USA")
- University name standardizations
- Acronym handling patterns
- CSV processing configuration

#### 3. **`scripts/enhanced_name_matcher.js`** - Advanced Matching
**Key Patterns to Extract:**
- 7 transformation rules with frequency analysis
- Risk assessment (VERY_LOW, LOW, MEDIUM)
- Pattern-based name normalization
- Automated rule discovery logic

### Transformation Rules Library

#### University Name Transformations
```javascript
// From existing codebase analysis
const battleTestedRules = {
  basicCleaning: {
    diacriticsRemoval: /[\u0300-\u036f]/g,
    thePrefixRemoval: /^the\s+/i,
    parentheticalRemoval: /\s*\([^)]*\)\s*/g,
    institutionTypes: [/ university/g, / college/g, / institute/g]
  },
  
  enhancedPatterns: [
    { name: 'hyphenSpaces', pattern: / - /g, replacement: ' ', frequency: 22 },
    { name: 'atPreposition', pattern: / at ([A-Z])/g, replacement: ' $1', frequency: 12 },
    { name: 'apostrophes', pattern: /'/g, replacement: '', frequency: 5 }
  ]
};
```

#### Country Standardization
```javascript
// Proven mappings from existing scripts
const countryMappings = {
  'United States of America': 'USA',
  'United Kingdom': 'UK', 
  'China (Mainland)': 'China',
  'Hong Kong SAR, China': 'Hong Kong',
  'Korea, South': 'South Korea'
  // ... complete list in analysis document
};
```

## 🔧 Automation Helper Integration

### Essential Tools (Use Daily)

#### 1. **`scripts/automation-helpers/pattern-discovery.js`**
**Purpose**: Bootstrap new source rule creation
**Usage**: Run FIRST when encountering new data source
```bash
node scripts/automation-helpers/pattern-discovery.js --source=new-source
```

#### 2. **`scripts/automation-helpers/pattern-tester.js`**
**Purpose**: Validate rule configurations locally
**Usage**: Test before committing rule changes
```bash
node scripts/automation-helpers/pattern-tester.js --config=qs-2026-rules.json
```

#### 3. **`scripts/automation-helpers/baseline-monitor.js`**
**Purpose**: Prevent data regressions
**Usage**: Integrate into CI/CD pipeline
```bash
node scripts/automation-helpers/baseline-monitor.js --compare-with=baseline
```

## 📋 Development Workflow

### For Each New Data Source

1. **Discovery Phase**
   ```bash
   # Use pattern discovery to analyze raw data
   node scripts/automation-helpers/pattern-discovery.js --source=new-source
   ```

2. **Rule Creation**
   - Create `staging/config/new-source-rules.json`
   - Extract patterns from existing scripts
   - Configure transformations based on discovery results

3. **Validation**
   ```bash
   # Test rules locally
   node scripts/automation-helpers/pattern-tester.js --config=new-source-rules.json
   
   # Run through normalization engine
   node v2-pipeline/normalize.js --source=new-source
   ```

4. **Integration Testing**
   ```bash
   # Full pipeline test
   node v2-pipeline/run-pipeline.js --source=new-source --test-mode
   ```

### For Rule Modifications

1. **Backup Current State**
   ```bash
   cp staging/config/source-rules.json staging/config/source-rules.json.backup
   ```

2. **Test Changes**
   ```bash
   node scripts/automation-helpers/pattern-tester.js --config=source-rules.json
   ```

3. **Validate Against Baseline**
   ```bash
   node scripts/automation-helpers/baseline-monitor.js --source=modified-source
   ```

## 🧪 Testing Standards

### Required Test Types

#### 1. **Unit Tests** (`tests/unit/`)
- Test each transformation function
- Validate configuration parsing
- Test matching algorithms

#### 2. **Integration Tests** (`tests/integration/`)
- End-to-end pipeline testing
- Cross-component compatibility
- Error handling scenarios

#### 3. **Performance Tests** (`tests/performance/`)
- Processing speed benchmarks
- Memory usage optimization
- Large dataset handling

### Test Data Requirements
- Use representative samples from each source
- Include edge cases and malformed data
- Maintain test fixtures in `tests/fixtures/`

## 🔍 Code Quality Standards

### Configuration-First Approach
```javascript
// ❌ Bad: Hardcoded logic
if (source === 'qs') {
  name = name.replace('Massachusetts Institute of Technology (MIT)', 'MIT');
}

// ✅ Good: Configuration-driven
const mapping = config.nameTransformations.exactMappings[name];
if (mapping) name = mapping;
```

### Error Handling
```javascript
// ❌ Bad: Silent failures
try {
  processData(data);
} catch (e) {}

// ✅ Good: Comprehensive logging
try {
  processData(data);
} catch (error) {
  logger.error(`Processing failed for ${source}:`, error);
  throw new ProcessingError(`Failed to process ${source}`, error);
}
```

### Documentation Standards
- Document rule rationale in config files
- Include frequency analysis for transformations
- Maintain change logs for rule modifications

## 🚀 Common Tasks Quick Reference

### Add New Data Source
1. Analyze with pattern-discovery
2. Create rule configuration
3. Test with pattern-tester
4. Add to pipeline orchestrator
5. Create unit tests

### Update Existing Rules
1. Backup current configuration
2. Modify rule file
3. Validate with pattern-tester
4. Check against baseline
5. Update tests

### Debug Processing Issues
1. Check logs in `staging/results/`
2. Run individual pipeline components
3. Use automation helpers for validation
4. Compare with known good baseline

### Add New University to Canonical List
1. Update `canonical-universities.json`
2. Add to appropriate aliases
3. Run matching validation
4. Update manual mapping if needed

## 📊 Performance Expectations

### Processing Benchmarks
- **Normalization**: <30 seconds per source
- **Matching**: <1 second per university
- **Full Pipeline**: <5 minutes total
- **Memory Usage**: <2GB peak

### Quality Metrics
- **Matching Accuracy**: >90% automated
- **Manual Review**: <10% of universities
- **Data Integrity**: 100% preservation
- **Rule Coverage**: >95% pattern automation

## 🆘 Troubleshooting Guide

### Common Issues

#### Configuration Validation Errors
**Problem**: Rule file doesn't validate against schema
**Solution**: 
```bash
node v2-pipeline/validate-config.js --config=problematic-rules.json
```

#### Matching Performance Issues
**Problem**: Fuzzy matching too slow
**Solution**: 
- Check country-based filtering is working
- Verify similarity thresholds are appropriate
- Review canonical list for duplicates

#### Memory Usage Problems
**Problem**: Pipeline consumes too much memory
**Solution**:
- Process sources sequentially instead of parallel
- Clear intermediate results between phases
- Check for memory leaks in transformation functions

## 📈 Success Metrics

### Individual Developer
- [ ] Completed required reading
- [ ] Successfully analyzed existing scripts for rules
- [ ] Created first rule configuration file
- [ ] Integrated automation helpers into workflow
- [ ] Contributed to canonical university list

### Team Collaboration
- [ ] Regular updates to implementation plan
- [ ] Shared rule discoveries and optimizations
- [ ] Cross-validation of rule configurations  
- [ ] Documentation of new patterns found

## 🎯 Next Steps

After completing this onboarding:

1. **Choose a Track**: Pick from Phase 0 tasks based on team coordination
2. **Set Up Environment**: Create your development branch
3. **Pick First Task**: Start with foundation tasks (0.1-0.5)
4. **Regular Updates**: Update implementation plan with progress
5. **Collaborate**: Share findings and patterns with team

## 📞 Support & Resources

### Documentation
- All docs in `docs/` directory
- Implementation plan tracks all tasks
- README files in each major directory

### Code Examples
- Existing scripts demonstrate patterns
- Test files show expected formats
- Automation helpers provide utilities

### Validation Tools
- Schema validation for configurations
- Pattern testing for rule validation
- Baseline monitoring for regression prevention

---

**Remember**: The V2 pipeline is about evolution, not revolution. We're building on proven concepts and battle-tested logic while creating a more maintainable and scalable architecture.
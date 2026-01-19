# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UniRank.AI** - A unified intelligence platform that aggregates global university rankings from 4 major sources (QS, THE, ARWU, US News), applies intelligent name standardization, and produces aggregated rankings using Borda Count with Penalized Absence methodology. The system maintains 1753 unique universities with comprehensive data integrity verification and a 5-tier name standardization hierarchy.

**Live Site**: <https://unirank.mmostagirbhuiyan.com/>

## Core Architecture

### Data Flow Pipeline
1. **Data Ingestion**: CSV files loaded from `frontend/public/data/` (QS, THE, ARWU from universityrankings.ch, US News from Selenium scraper)
2. **Name Standardization**: 5-tier hierarchy with pattern-based transformations, manual mappings, and fuzzy matching fallbacks
3. **Aggregation**: Borda Count algorithm with source weights and absence penalties
4. **Output**: JSON files served to React frontend

### Key Components
- **`scripts/scrape-rankings.js`**: Main orchestration script - data ingestion, name standardization, aggregation
- **`scripts/enhanced_name_matcher.js`**: Pattern-based transformation engine (legacy, superseded by canonicalizeName)
- **`canonicalizeName()` function**: Primary name standardization with 8 active automation patterns
- **`scripts/aggregation.js`**: Borda Count implementation with weighted scoring
- **Source scrapers**: Individual modules for each ranking source (`*-scraper.js`)
- **Frontend**: React app with Tailwind CSS, real-time search, and Chart.js visualizations

### Name Standardization Hierarchy (5-tier Priority System)
1. **Manual Mappings** (167 curated entries) - Highest priority exceptions
2. **Enhanced Pattern Matching** (0.93 threshold) - Smart fuzzy matching with transformations  
3. **Auto-generated Mappings** (7,938 entries) - **Quality insurance fallback layer**
4. **Canonicalization** (8+ patterns) - Built-in name normalization
5. **Original Name** - Safety net

**Key Insight:** Layer 3 acts as comprehensive quality insurance - strips all formatting "fat" from names, runs 0.85 fuzzy matching, and generates thousands of edge case mappings that catch 99.9% of university name permutations across ranking sources.

## Essential Commands

### Data Pipeline
```bash
# Main aggregation (standard operation)
node scripts/scrape-rankings.js

# Update US News data (Selenium scraper)
python scripts/usnews_direct_extractor_selenium.py -o frontend/public/data/usnews_rankings.csv

# Regenerate bulk fuzzy mappings (rarely needed)
node scripts/match-universities.js
```

### Quality Monitoring & Development
```bash
# Monitor data quality and find issues
node scripts/data-quality-monitor.js

# Discover automation patterns (≥3 occurrences)
node scripts/automation-helpers/pattern-discovery.js

# Test automation patterns safely
node scripts/automation-helpers/pattern-tester.js "Pattern Name" "code()" --dry-run
node scripts/automation-helpers/pattern-tester.js "Pattern Name" "code()"

# System health check
node scripts/automation-helpers/baseline-monitor.js health

# Find potential new manual mappings
node scripts/suggest-new-mappings.js

# Apply high-confidence mapping suggestions
node scripts/apply-suggested-mappings.js

# Data integrity verification (checks for duplicates)
node scripts/data-integrity-check.js
```

### Frontend Development
```bash
# Frontend development
cd frontend
npm install
npm start          # Development server at localhost:3000
npm run build      # Production build
npm test           # Run tests

# Root package commands
npm install        # Install root dependencies
npm test           # Jest tests (if configured)
```

## Critical File Locations

### Key Files
- **Data**: `frontend/public/data/` - Source CSVs, mapping files, aggregated output
- **Main Pipeline**: `scripts/scrape-rankings.js` - Orchestrates entire aggregation process
- **Quality Fallback Generator**: `scripts/match-universities.js` - Creates comprehensive edge case mappings (deprecated but essential)

## Automation Patterns (8 Active)

Located in `canonicalizeName()` function in `scripts/scrape-rankings.js`:

1. **Diacritics Normalization** (line 60): Remove accents (ü→u, é→e)
2. **Character Cleanup** (lines 62-64): Remove ?, replacement chars
3. **At Location Removal** (line 80): "at Austin" → "Austin"
4. **And/Ampersand** (line 82): "and" → "&"
5. **Hyphen to Space** (line 84): "-" → " "
6. **"The" Prefix Removal** (line 86): "The University" → "University"
7. **Medical Sciences** (line 88): "Sciences" → "Science"
8. **Medical University "of"** (line 90): "Medical University of X" → "Medical University X"

Additional complex patterns: UC system campus names, "of" preposition normalization, encoding fixes.

## Development Guidelines

### Data Integrity Requirements
- **Critical**: University count must NEVER increase (only decrease or stay the same)
- **Current target**: Maintain 1753 universities ± 2 (acceptable variance)
- **Duplicate threshold**: ≤8 high-confidence duplicates (representing legitimate different institutions)
- Always run health check after changes: `node scripts/automation-helpers/baseline-monitor.js health`
- Test automation patterns with pattern-tester before implementing

### Adding Manual Mappings
Edit `frontend/public/data/manual-university-mapping.json`:
```json
{
  "originalName": "Source University Name",
  "suggestedStandardizedName": "Target Standardized Name"
}
```

### Source Weights & Configuration
Modify in `scripts/scrape-rankings.js`:
- **Source weights**: All set to 0.25 (equal weighting)
- **Max ranks**: QS(1000), THE(999), ARWU(1000), US News(980)
- **Similarity threshold**: 0.93 for high-confidence fuzzy matching

### Testing New Automation Patterns
1. Use `pattern-discovery.js` to find opportunities (≥3 occurrences)
2. Test with `pattern-tester.js --dry-run` 
3. Verify university count stability with full test
4. Add to `canonicalizeName()` function with descriptive comment
5. Run baseline monitor to confirm health

## System Health Status (June 2025)

**Data Integrity:** ✅ 1,756 universities with 15 legitimate duplicates  
**Architecture:** ✅ 5-tier hierarchy provides comprehensive quality insurance  
**Performance:** ⚠️ Carries 88.5% unused mappings but essential for edge case coverage

## Recent Major Improvements (2024)

### Major Bug Fixes (2024-2025)
- **Cross-country mapping errors**: Fixed incorrect university country assignments
- **US News bypass bug**: Ensured all data flows through mapping hierarchy
- **Pohang University consolidation**: Unified 3 variants to single entry
- **Data integrity baseline**: Stabilized at 1,756 ± 2 universities with 15 legitimate duplicates

## Dependencies
- **Node.js**: string-similarity, csv-parser, cheerio, puppeteer, xlsx
- **Python**: selenium, beautifulsoup4, pandas (for US News scraper)
- **Frontend**: React 18, Tailwind CSS, Chart.js, Fuse.js for search
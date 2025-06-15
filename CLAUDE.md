# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a University Rankings Aggregator that collects data from multiple ranking sources (QS, THE, ARWU, US News) and aggregates them using a Borda Count with Penalized Absence method. The project consists of:

- **Backend Scripts**: Node.js scrapers and aggregation logic in `/scripts/`
- **Frontend**: React application in `/frontend/` that displays aggregated rankings
- **Data Pipeline**: CSV processing, university name matching, and aggregation

## Key Commands

### Development Setup
```bash
# Install root dependencies (scrapers, aggregation)
npm install

# Install frontend dependencies
cd frontend && npm install

# Install Python dependencies for US News scraper
pip install -r requirements.txt
```

### Data Pipeline

```bash
# Extract US News rankings data (RECOMMENDED: Use optimized version)
python scripts/usnews_optimized_extractor.py -o frontend/public/data/usnews_rankings.csv -n 1000

# Alternative: Original extractor (slower for 500+ universities)
python scripts/usnews_direct_extractor.py -o frontend/public/data/usnews_rankings.csv

# Test extractor performance
python scripts/test_extractors_performance.py --test-sizes 100 500 1000

# Generate university name mapping (uses enhanced matching algorithm)
node scripts/match-universities.js

# Run complete scraping and aggregation pipeline
node scripts/scrape-rankings.js
```

### Testing
```bash
# Run Node.js tests (aggregation logic)
npm test

# Run React tests
cd frontend && npm test
```

### Frontend Development
```bash
cd frontend
npm start    # Development server at http://localhost:3000
npm run build # Production build
npm run deploy # Deploy to GitHub Pages
```

## Architecture

### Data Flow
1. **Raw Data**: CSV files in `frontend/public/data/` from external ranking sources
2. **Name Standardization**: `match-universities.js` creates university name mappings
3. **Aggregation**: `scrape-rankings.js` applies Borda Count algorithm
4. **Frontend**: React app reads `aggregated-rankings.json` for display

### Core Components

**Scripts Directory (`/scripts/`)**:

- `scrape-rankings.js`: Main orchestrator script
- `aggregation.js`: Core Borda Count algorithm implementation
- Individual scrapers: `qs-scraper.js`, `the-scraper.js`, `arwu-scraper.js`
- `usnews_optimized_extractor.py`: High-performance Python scraper for US News data (RECOMMENDED)
- `usnews_direct_extractor.py`: Original Python scraper (slower for large datasets)
- `match-universities.js`: Enhanced multi-stage fuzzy matching for university name standardization
- `test_extractors_performance.py`: Performance testing script

**Aggregation Algorithm** (`scripts/aggregation.js`):

- Implements Borda Count with Penalized Absence
- Source weights: QS (25%), THE (25%), ARWU (25%), US News (25%)
- Missing universities penalized at 10% of source's max rank
- Confidence multiplier based on number of sources a university appears in

**Frontend** (`/frontend/src/`):

- `App.js`: Main React component with search, filtering, and ranking display
- Uses TailwindCSS for styling, Chart.js for visualizations
- Implements fuzzy search with Fuse.js
- Shows detailed metrics: consistency, best/worst rankings, average rank

### Data Structure

- Input: Individual CSV files per ranking source
- Intermediate: `suggested-university-mapping.json` (generated automatically with enhanced matching)
- Output: `aggregated-rankings.json` with final aggregated rankings

## Development Workflow

1. **Data Updates**: Run US News extractor → Generate mappings (automated with enhanced matching) → Run aggregation
2. **Algorithm Changes**: Modify `aggregation.js` → Run tests → Update frontend if needed
3. **Frontend Changes**: Work in `/frontend/` → Test with `npm test` → Build for production

## US News Extractor Performance

**Issue**: The original US News extractor slows significantly after ~450 universities due to quadratic time complexity and memory bloat.

**Solution**: Use `usnews_optimized_extractor.py` which implements:

- Batch processing to avoid O(n²) complexity
- Memory management and cleanup
- Efficient DOM queries and caching
- Optimized browser settings

**Performance**: The optimized extractor can reliably extract 1000+ universities in under 5 minutes compared to the original which may timeout or take 10+ minutes.

**Important**: US News site blocks Chrome automation. Use Firefox browser with `-b firefox` flag.

## Enhanced University Matching System

**Problem Solved**: False non-matches between university name variations across ranking sources, particularly affecting universities like Queen's University Canada where US News uses "Queens University - Canada" while other sources use "Queen's University".

**Solution**: Multi-stage enhanced matching algorithm implemented in `match-universities.js`:

### Enhanced Matching Features

1. **Multi-Stage Matching Strategy**:
   - Stage 1: Basic string similarity (original method)
   - Stage 2: Enhanced cleaning with apostrophe/country suffix handling
   - Stage 3: Exact match after aggressive normalization
   - Stage 4: Longest common subsequence for partial matches

2. **Enhanced Cleaning Function**:
   - Removes apostrophes: "Queen's" → "Queens"
   - Removes country suffixes: "- Canada", "- Australia", etc.
   - Handles "University of X" → "X" patterns
   - Normalizes punctuation and spacing

3. **Automated Integration**:
   - No manual review required for `suggested-university-mapping.json`
   - Pipeline automatically handles common name variations
   - Logs enhanced matches for verification

### Test Coverage

Comprehensive test suite in `tests/` validates:
- Queen's University Canada matching across all sources
- Apostrophe handling variations
- Country suffix removal
- Queen Mary University format differences
- Queen's University Belfast apostrophe issues

### Pipeline Impact

- **Before**: Queen's University appeared as separate entries, reducing ranking accuracy
- **After**: All variants properly grouped into single university entry with correct aggregated ranking
- **Success Example**: "Queen's University" (ARWU/THE/QS) + "Queens University - Canada" (US News) = Single unified ranking

## Special Notes

- University name mapping is now automated with enhanced matching algorithm
- The project uses both Node.js and Python environments
- Ranking data is stored in `frontend/public/data/` for direct access by React app
- Cursor rules specify an interactive feedback loop using `userinput.py`
- Always use the optimized extractor for datasets larger than 500 universities
- Enhanced matching resolves recurring false non-match issues without manual intervention

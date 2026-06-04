# UniRank: Global University Rankings Aggregated

A production-grade platform that aggregates and visualizes global university rankings from four authoritative sources (QS, THE, ARWU, US News) using pattern-based matching, intelligent name standardization, and Borda Count scoring.

**Live:** [unirank.mmostagirbhuiyan.com](https://unirank.mmostagirbhuiyan.com/)

[![Universities](https://img.shields.io/badge/Universities-1687-blue)](https://github.com/mmostagirbhuiyan/unirank)
[![Data Sources](https://img.shields.io/badge/Data%20Sources-4-green)](https://github.com/mmostagirbhuiyan/unirank)
[![Data Integrity](https://img.shields.io/badge/Data%20Integrity-Verified-green)](https://github.com/mmostagirbhuiyan/unirank)

---

## Quick Start

### Prerequisites

```bash
# Node.js (v14+) and Python (3.8+)
npm install
pip install -r requirements.txt
```

### 30-Second Setup

```bash
# 1. Update university rankings data
node scripts/scrape-rankings.js

# 2. Start the frontend
cd frontend && npm install && npm start
```

The system will automatically load rankings from all 4 sources, apply intelligent pattern-based matching, generate aggregated rankings using Borda Count with Penalized Absence, and launch the React frontend at `http://localhost:3000`.

---

## System Overview

### Data Sources and Coverage

| Source | Universities | Focus | Update Frequency |
|--------|-------------|-------|------------------|
| **QS World Rankings** | 1,000 | Global comprehensive | Annual |
| **THE (Times Higher Education)** | 999 | Research excellence | Annual |
| **ARWU (Shanghai Rankings)** | 1,000 | Academic performance | Annual |
| **US News Global** | 980 | International reach | Annual |

### Aggregation Method

**Borda Count with Penalized Absence**: Universities receive points based on their ranking position (MaxRank - Rank + 1), with systematic confidence penalties for missing rankings to ensure fairness across different coverage patterns.

### Current Performance

- **1,687 unique universities** with verified data integrity
- **8 active automation patterns** for name standardization
- **167 curated manual mappings** for cross-source edge cases
- **<30 seconds** complete data processing

---

## Enhanced Matching System

The advanced pattern-based matching system automatically handles systematic naming variations.

### Active Automation Patterns (8 Total)

| Pattern | Examples | Implementation |
|---------|----------|---------------|
| **Diacritics Normalization** | "Munchen" -> "Munich" | NFD normalize + strip combining marks |
| **Character Cleanup** | Remove question marks, replacement chars | Regex replacement |
| **At Location Removal** | "University of Texas at Austin" -> "University of Texas Austin" | Regex |
| **And/Ampersand** | "Science and Technology" -> "Science & Technology" | Regex |
| **Hyphen to Space** | "University of Wisconsin-Madison" -> "University of Wisconsin Madison" | Regex |
| **"The" Prefix Removal** | "The University of Tokyo" -> "University of Tokyo" | Regex |
| **Medical Sciences** | "University of Medical Sciences" -> "University of Medical Science" | Regex |
| **Medical University "of"** | "Medical University of Graz" -> "Medical University Graz" | Regex |

### Matching Confidence Levels

- **High (>=0.95)**: Automatic matching applied
- **Medium (0.85-0.94)**: Reviewed and added to manual mappings
- **Low (<0.85)**: Requires manual review

---

## Data Pipeline

### Standard Operation (3 steps)

```bash
# Step 1: Update US News data (Playwright scraper)
python scripts/usnews_direct_extractor.py -o frontend/public/data/usnews_rankings.csv

# Step 2: Process and aggregate all rankings
node scripts/scrape-rankings.js

# Step 3: Launch frontend
cd frontend && npm start
```

### Full Regeneration (4 steps, rarely needed)

```bash
# Step 1: Update US News data
python scripts/usnews_direct_extractor.py -o frontend/public/data/usnews_rankings.csv

# Step 2: Regenerate fuzzy matching mappings
node scripts/match-universities.js

# Step 3: Process and aggregate all rankings
node scripts/scrape-rankings.js

# Step 4: Launch frontend
cd frontend && npm start
```

### Pipeline Flow

```
Raw Rankings Data
  -> Enhanced Name Matcher (pattern transformations)
  -> Fuzzy Matching (>=93%)
  -> Manual Mapping Lookup (167 curated entries)
  -> Standardized Names
  -> Borda Count Aggregation
  -> Final Rankings JSON
  -> React Frontend
```

### Data Flow Architecture

1. **Data Ingestion**: QS, THE, ARWU from CSV files via universityrankings.ch. US News via automated Playwright scraping.
2. **Enhanced Name Matching** (5-tier system): Pattern-based transformations, high-confidence fuzzy matching (>=93%), manual mapping lookup (167 entries), auto-generated mappings (~7.9k entries), original name preserved as fallback.
3. **Ranking Aggregation**: Borda Count with Penalized Absence. Weighted scoring with source-specific penalties.
4. **Frontend Visualization**: React-based responsive interface with real-time search and filtering.

---

## Manual Mapping System

### Architecture

Source-agnostic approach where one mapping applies to all sources:

```json
{
  "originalName": "Queen's University",
  "suggestedStandardizedName": "Queens University - Canada"
}
```

### File Structure

- **`manual-university-mapping.json`**: 167 curated mappings for edge cases (highest priority)
- **`suggested-university-mapping.json`**: Auto-generated bulk mappings (~7.9k entries, fallback)
- **`enhanced_name_matcher.js`**: Pattern-based transformation engine
- **`match-universities.js`**: Fuzzy matching script that generates suggested mappings

### Mapping Hierarchy (5-tier Priority System)

1. Manual Mappings (167 curated entries, highest priority)
2. Enhanced Pattern Matching (0.93 threshold)
3. Auto-generated Mappings (~7.9k entries, quality insurance fallback)
4. Canonicalization (8+ built-in patterns)
5. Original Name (safety net)

---

## Frontend Application

### Features

- Advanced real-time search with fuzzy matching and abbreviation support
- Multi-source comparison views (QS, THE, ARWU, US News)
- Aggregated Borda Count rankings with calculation breakdown
- Responsive design across desktop, tablet, and mobile
- Dark/light mode with system preference detection
- University comparison panel (up to 3 side-by-side)
- URL-persisted filters and deep-linkable university profiles

### Development

```bash
cd frontend
npm install
npm start      # Development server
npm run build  # Production build
```

### Technology Stack

- React 18 with hooks and React Router
- Tailwind CSS for styling
- Recharts for data visualization
- Fuse.js for fuzzy search
- Framer Motion for animations

---

## Development and Extension

### Adding New Transformation Rules

Extend `canonicalizeName()` in `scripts/scrape-rankings.js`:

```javascript
{
  name: 'newPattern',
  pattern: /your-regex-here/g,
  replacement: 'replacement-string',
  description: 'What this rule does'
}
```

### Monitoring Data Quality

```bash
# Check current system performance
node scripts/data-quality-monitor.js

# Regenerate auto-mappings (when needed)
node scripts/match-universities.js

# System health check
node scripts/automation-helpers/baseline-monitor.js health
```

---

## Automated Workflows

This project uses two GitHub Actions to keep ranking data up to date.

### `fetch-usnews.yml`

Triggers manually or when the US News scraper script changes. Installs Python dependencies, runs the scraper, and commits updated CSV back to the triggering branch.

### `aggregate-rankings.yml`

Runs for pull requests that modify files in `scripts/` or `frontend/public/data/` and on pushes to `main`. Installs dependencies, runs matching and aggregation scripts, validates JSON output, and pushes updated data back.

---

## Documentation

- [Enhanced Matching System](docs/ENHANCED_MATCHING.md): Technical documentation of the pattern-based matching engine
- [Data Integrity Guide](docs/DATA_INTEGRITY_GUIDE.md): Verification tools and duplicate detection
- [Data Scrapers Guide](docs/DATA_SCRAPERS_GUIDE.md): Guide to source scraper scripts
- [Aggregation Guide](docs/AGGREGATION_GUIDE.md): Borda Count methodology details
- [Automation Workflow Guide](docs/AUTOMATION_WORKFLOW_GUIDE.md): CI/CD pipeline documentation
- [University Mapping Guide](docs/UNIVERSITY_MAPPING_GUIDE.md): Manual and auto-generated mapping system

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Test your changes (`npm test` and manual verification)
4. Commit with conventional commits (`git commit -m 'feat: add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Setup

```bash
git clone https://github.com/mmostagirbhuiyan/unirank.git
cd unirank
npm install
pip install -r requirements.txt
```

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Data Sources**: QS, THE, ARWU, US News for providing comprehensive university rankings
- **[universityrankings.ch](https://www.universityrankings.ch)** for standardized CSV exports

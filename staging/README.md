# Staging Directory Structure

This directory contains all intermediate files for the V2 pipeline processing.

## Directory Structure

### `/raw/`
Contains untouched source files as downloaded/scraped from ranking providers.
- Files are named by source and year: `{source}_{year}_official.{ext}`
- Examples: `qs_2026_official.xlsx`, `usnews_2024_official.json`
- These files are never modified after download

### `/normalized/`
Contains processed CSV files after normalization engine processing.
- Files follow standard naming: `{source}_{year}_normalized.csv`
- All files have consistent column structure: `rank,name,country,score`
- Examples: `qs_2026_normalized.csv`, `usnews_2024_normalized.csv`

### `/config/`
Contains source-specific rule configuration files.
- Files follow naming: `{source}-rules.json`
- Each file defines transformation rules for that specific data source
- Examples: `qs-2026-rules.json`, `usnews-rules.json`

### `/results/`
Contains matching results, logs, and processing reports.
- `matching-results_{timestamp}.json` - University matching results
- `needs-manual-review_{timestamp}.json` - Universities requiring manual review
- `processing-logs_{timestamp}.log` - Detailed processing logs
- `pipeline-report_{timestamp}.json` - Summary statistics and metrics

## File Lifecycle

1. **Raw Data**: Downloaded → `staging/raw/`
2. **Configuration**: Rules defined → `staging/config/`
3. **Normalization**: Raw + Rules → `staging/normalized/`
4. **Matching**: Normalized + Canonical List → `staging/results/`
5. **Review**: Manual fixes → Updated canonical list
# Normalized Data Directory

This directory contains processed CSV files after normalization engine processing.

## File Format
All normalized files follow the standard format:
- **Filename**: `{source}_{year}_normalized.csv`
- **Columns**: `rank,name,country,score` (consistent across all sources)
- **Encoding**: UTF-8
- **Format**: CSV with headers

## Examples
- `qs_2026_normalized.csv`
- `usnews_2024_normalized.csv`
- `the_2024_normalized.csv`
- `arwu_2024_normalized.csv`

## Data Standards
- **rank**: Numeric rank (1, 2, 3, etc.) or range (e.g., "101-150")
- **name**: University name after initial transformation rules
- **country**: Standardized country name (e.g., "USA", "United Kingdom")
- **score**: Numeric score if available, empty if not provided

## Processing
Files are created by the normalization engine (`v2-pipeline/normalize.js`) using source-specific rules from `staging/config/`.
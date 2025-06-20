# Raw Data Directory

This directory stores untouched source files as downloaded from ranking providers.

## File Naming Convention
Files should be named: `{source}_{year}_official.{extension}`

Examples:
- `qs_2026_official.xlsx`
- `usnews_2024_official.json`
- `the_2024_official.csv`
- `arwu_2024_official.csv`

## Important Notes
- Files in this directory are NEVER modified after download
- These serve as the authoritative source for reprocessing
- All files are gitignored to avoid repository bloat
- Keep original file formats (XLSX, JSON, CSV) as provided by sources
# V2 Pipeline User Guide

This guide explains how to run the new configuration-driven pipeline.

## Running the Pipeline
1. Place your source data under the `staging/raw/` directory.
2. Ensure a corresponding configuration file exists in `staging/config/`.
3. Execute the orchestrator:
```bash
node v2-pipeline/orchestrator.js --config=staging/config/qs-2026-rules.json --input=staging/raw/qs-2026.csv
```
4. Results will be written to `staging/runs/<run-id>/`.

## Directory Overview
- **staging/config/** – Source configuration files
- **staging/raw/** – Raw downloaded datasets
- **staging/runs/** – Output from each pipeline execution
- **canonical-universities.json** – Master list used for matching

## Troubleshooting
If the pipeline fails, check `pipeline-report.json` and `error-report.json` inside the run directory. Validation and normalization reports contain detailed diagnostics.

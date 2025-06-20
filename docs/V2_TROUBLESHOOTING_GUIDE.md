# V2 Pipeline Troubleshooting Guide

This document lists common issues and their solutions when working with the V2 pipeline.

## Common Problems

### Configuration Validation Errors
- **Symptom:** The pipeline stops during the validation phase.
- **Solution:** Check `validation-report.json` in the run directory for detailed errors. Verify that all required sections are present in your configuration file.

### Missing Output Files
- **Symptom:** Expected CSV or JSON files are not created.
- **Solution:** Ensure the orchestrator completed all phases. Review the console output or `pipeline-report.json` for failure messages.

### Manual Review Required
- **Symptom:** The pipeline prompts for manual review.
- **Solution:** Open the JSON file listed in the message (under `manual-review/pending/`) and follow the instructions to approve or modify the suggested matches. Rerun the orchestrator with the `--apply-review` option after making decisions.

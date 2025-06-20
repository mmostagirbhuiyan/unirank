# V2 Pipeline Scripts

This directory contains all V2 pipeline processing scripts.

## Core Scripts

### Primary Pipeline Scripts
- `normalize.js` - Main normalization engine
- `reconcile.js` - Multi-tiered matching engine  
- `run-pipeline.js` - Main pipeline orchestrator

### Supporting Scripts
- `validate-config.js` - Configuration validation
- `generate-review-list.js` - Manual review list generator
- `apply-manual-matches.js` - Manual match applicator
- `seed-canonical-list.js` - Initial canonical list creator

### Utility Scripts
- `lib/matching-algorithms.js` - Matching algorithm implementations
- `lib/transformation-utils.js` - Data transformation utilities
- `lib/validation-utils.js` - Validation helper functions

## Configuration Files
- `../staging/config/` - Source-specific rule configurations
- `../canonical-universities.json` - Master university list
- `../schemas/` - JSON schemas for validation

## Usage

Run the complete pipeline:
```bash
node v2-pipeline/run-pipeline.js
```

Run individual components:
```bash
node v2-pipeline/normalize.js --source=qs --year=2026
node v2-pipeline/reconcile.js --input=staging/normalized/
```
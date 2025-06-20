# Results Directory

This directory contains matching results, logs, and processing reports.

## File Types

### Matching Results
- `matching-results_{timestamp}.json` - Complete university matching results
- `needs-manual-review_{timestamp}.json` - Universities requiring manual review

### Processing Logs
- `processing-logs_{timestamp}.log` - Detailed processing logs with debug information
- `error-logs_{timestamp}.log` - Error logs and exceptions

### Reports
- `pipeline-report_{timestamp}.json` - Summary statistics and metrics
- `matching-statistics_{timestamp}.json` - Matching accuracy and coverage stats

## File Formats

### matching-results_{timestamp}.json
```json
{
  "source": "qs_2026",
  "processed_date": "2024-01-01T00:00:00Z",
  "matches": [
    {
      "source_name": "Massachusetts Institute of Technology",
      "canonical_id": "canonical-0001",
      "canonical_name": "Massachusetts Institute of Technology",
      "match_tier": 1,
      "confidence": 1.0
    }
  ]
}
```

### needs-manual-review_{timestamp}.json
```json
{
  "unmatched_universities": [
    {
      "source_name": "Some Unknown University",
      "country": "USA",
      "source": "qs_2026",
      "attempted_matches": ["University of Unknown", "Unknown University"]
    }
  ]
}
```
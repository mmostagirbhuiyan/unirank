# Normalization Engine Specification

## Overview

The Normalization Engine is the core component of the V2 pipeline that transforms raw ranking data from various sources into a standardized CSV format. It provides a configuration-driven approach that eliminates hardcoded transformations and enables consistent processing across all ranking sources.

**Key Capabilities:**
- Multi-format input support (CSV, XLSX, JSON)
- Configuration-driven transformations 
- Battle-tested transformation rules from existing codebase
- Comprehensive error handling and logging
- Processing reports and statistics
- Schema validation and data integrity checks

---

## Architecture

### Processing Pipeline

```
Raw Data Input → File Loading → Column Mapping → Transformations → Validation → Normalized CSV Output
                      ↓              ↓               ↓              ↓                ↓
                 Format-specific   Standard       Rule-based    Data Quality    Staging Directory
                    Parsing        Columns       Processing     Assurance        Storage
```

### Core Components

1. **File Loader**: Handles CSV, XLSX, and JSON input formats
2. **Column Mapper**: Maps source-specific columns to standard format
3. **Transformation Engine**: Applies configuration-driven rules
4. **Validation Layer**: Ensures data quality and integrity
5. **Output Writer**: Generates standardized CSV files
6. **Report Generator**: Creates processing statistics and logs

---

## Configuration Schema

### Top-Level Structure

```json
{
  "metadata": {
    "source": "qs",
    "year": 2026,
    "format": "xlsx",
    "encoding": "utf-8",
    "description": "QS World University Rankings 2026"
  },
  "fileProcessing": { /* File handling options */ },
  "columnMappings": { /* Source to standard column mappings */ },
  "transformationRules": { /* Data transformation rules */ },
  "validation": { /* Data validation rules */ },
  "outputFormat": { /* Output formatting options */ }
}
```

### File Processing Configuration

```json
{
  "fileProcessing": {
    "skipLines": 5,
    "delimiter": ",",
    "quoteChar": "\"",
    "xlsxSheetName": "Rankings",
    "headerProcessing": {
      "trimWhitespace": true,
      "removeEmptyColumns": true
    },
    "errorHandling": {
      "skipMalformedRows": true,
      "maximumErrors": 10,
      "stopOnCriticalError": true
    }
  }
}
```

### Column Mappings

```json
{
  "columnMappings": {
    "rank": {
      "primaryHeaders": ["# World Rank", "#    World Rank"],
      "alternativeHeaders": ["Rank"],
      "processing": "handleRangeRanks",
      "required": true
    },
    "name": {
      "primaryHeaders": [" Institution", "Institution"],
      "processing": "normalizeUniversityName",
      "required": true
    },
    "country": {
      "primaryHeaders": [" Country", "Country"],
      "processing": "standardizeCountry",
      "required": true
    },
    "score": {
      "primaryHeaders": ["Overall Score", "Score"],
      "processing": "parseNumeric",
      "required": false
    }
  }
}
```

### Transformation Rules

```json
{
  "transformationRules": {
    "universityNames": {
      "basic": [
        "stringValidation",
        "diacriticsRemoval", 
        "thePrefixRemoval",
        "parentheticalRemoval",
        "whitespaceNormalization"
      ],
      "enhanced": [
        {
          "name": "hyphenSpaces",
          "type": "regex_replace",
          "pattern": " - ",
          "replacement": " ",
          "flags": "g",
          "riskLevel": "LOW",
          "enabled": true
        }
      ],
      "sourceSpecific": {
        "exactMappings": {
          "Massachusetts Institute of Technology (MIT)": "Massachusetts Institute of Technology - MIT"
        }
      }
    },
    "countries": {
      "mappings": {
        "United States of America": "USA",
        "United Kingdom": "UK"
      }
    },
    "ranks": {
      "handleRanges": true,
      "rangeStrategy": "lowerBound",
      "maximumRank": 1500
    }
  }
}
```

---

## Usage

### Command Line Interface

```bash
# Basic usage with source and year
node v2-pipeline/normalize.js --input=staging/raw/qs_2026_official.xlsx --source=qs --year=2026

# Using specific configuration file
node v2-pipeline/normalize.js --input=staging/raw/data.csv --config=staging/config/custom-rules.json

# Specify custom output path
node v2-pipeline/normalize.js --input=input.xlsx --config=rules.json --output=staging/normalized/custom_output.csv

# Show help
node v2-pipeline/normalize.js --help
```

### Programmatic Usage

```javascript
const NormalizationEngine = require('./v2-pipeline/normalize');

const engine = new NormalizationEngine();

const result = await engine.normalize({
  input: 'staging/raw/qs_2026_official.xlsx',
  source: 'qs',
  year: 2026,
  output: 'staging/normalized/qs_2026_normalized.csv'
});

if (result.success) {
  console.log(`Processed ${result.stats.validRows} universities`);
  console.log(`Output: ${result.outputPath}`);
} else {
  console.error('Processing failed:', result.error);
}
```

---

## Input Format Support

### CSV Files

**Supported Features:**
- Custom delimiters and quote characters
- Various encodings (UTF-8, Latin1, ASCII)
- Header line skipping
- Malformed row handling

**Configuration Example:**
```json
{
  "metadata": { "format": "csv", "encoding": "utf-8" },
  "fileProcessing": {
    "delimiter": ",",
    "quoteChar": "\"",
    "skipLines": 1
  }
}
```

### XLSX Files

**Supported Features:**
- Multiple sheet support (by name or index)
- Automatic header detection
- Empty cell handling
- Large file processing

**Configuration Example:**
```json
{
  "metadata": { "format": "xlsx" },
  "fileProcessing": {
    "xlsxSheetName": "World Rankings",
    "skipLines": 5
  }
}
```

### JSON Files

**Supported Structures:**
- Array of objects: `[{rank: 1, name: "MIT"}, ...]`
- Nested data object: `{data: [{rank: 1, name: "MIT"}]}`
- Named rankings: `{rankings: [{rank: 1, name: "MIT"}]}`

**Configuration Example:**
```json
{
  "metadata": { "format": "json", "encoding": "utf-8" },
  "fileProcessing": {
    "skipLines": 0
  }
}
```

---

## Transformation Rules

### Basic Transformations

Applied in sequence to university names:

1. **stringValidation**: Ensure valid string input
2. **caseNormalization**: Convert to lowercase
3. **diacriticsRemoval**: Remove accent marks
4. **thePrefixRemoval**: Remove "The" prefix
5. **parentheticalRemoval**: Remove text in parentheses
6. **locationIndicators**: Remove location suffixes
7. **institutionTypeRemoval**: Remove institution type words
8. **whitespaceNormalization**: Normalize spaces and punctuation

### Enhanced Transformations

Pattern-based transformations with risk assessment:

```json
{
  "name": "atPreposition",
  "type": "regex_replace",
  "pattern": " at ([A-Z])",
  "replacement": " $1",
  "flags": "g",
  "riskLevel": "LOW",
  "frequency": 12,
  "description": "Remove 'at' preposition from university names"
}
```

**Risk Levels:**
- **VERY_LOW**: Safe patterns with high confidence (>95%)
- **LOW**: Generally safe patterns (>85% confidence)  
- **MEDIUM**: Patterns requiring review (>70% confidence)
- **HIGH**: Risky patterns requiring manual validation

### Source-Specific Transformations

Custom rules for individual ranking sources:

**Exact Mappings:**
```json
{
  "exactMappings": {
    "Massachusetts Institute of Technology (MIT)": "Massachusetts Institute of Technology - MIT",
    "ETH Zurich (Swiss Federal Institute of Technology)": "Swiss Federal Institute of Technology Zurich - ETHZ"
  }
}
```

**Pattern Mappings:**
```json
{
  "patternMappings": [
    {
      "name": "qsAcronymRemoval",
      "type": "regex_replace", 
      "pattern": " \\([A-Z]{2,}\\)$",
      "replacement": "",
      "riskLevel": "LOW"
    }
  ]
}
```

---

## Output Format

### Standard CSV Structure

All normalized files follow this consistent format:

```csv
rank,name,country,score
1,Massachusetts Institute of Technology,USA,100.0
2,Stanford University,USA,99.8
3,University of Cambridge,UK,99.2
```

**Column Specifications:**
- **rank**: Numeric rank (1, 2, 3) or range lower bound (101 for "101-150")
- **name**: Normalized university name after transformations
- **country**: Standardized country name
- **score**: Numeric score (optional, null if not available)

### Output Configuration

```json
{
  "outputFormat": {
    "columns": ["rank", "name", "country", "score"],
    "encoding": "utf-8",
    "includeHeaders": true
  }
}
```

---

## Error Handling

### Error Categories

1. **Configuration Errors**: Invalid or missing configuration
2. **File Errors**: File not found, permission issues, corruption
3. **Parsing Errors**: Malformed data, encoding issues
4. **Validation Errors**: Missing required fields, invalid data types
5. **Processing Errors**: Transformation failures, rule conflicts

### Error Handling Strategies

**Skip and Continue:**
```json
{
  "errorHandling": {
    "skipMalformedRows": true,
    "logMalformedRows": true,
    "maximumErrors": 10
  }
}
```

**Stop on Critical Error:**
```json
{
  "errorHandling": {
    "stopOnCriticalError": true,
    "skipMalformedRows": false
  }
}
```

### Error Reporting

Errors are logged to:
- Console output during processing
- Processing statistics object
- Detailed report files in `staging/results/`

---

## Processing Reports

### Report Structure

```json
{
  "metadata": {
    "source": "qs",
    "year": 2026,
    "processedAt": "2024-06-20T12:00:00Z",
    "processingTimeMs": 1250
  },
  "statistics": {
    "totalRows": 1000,
    "validRows": 995,
    "invalidRows": 5,
    "transformedRows": 995,
    "successRate": "99.50%"
  },
  "errors": [
    "Error processing row 150: Invalid rank format",
    "Error processing row 789: Missing university name"
  ],
  "warnings": [
    "Rank 1501 exceeds maximum 1500",
    "Country 'Unknown' not standardized"
  ]
}
```

### Report Files

Reports are automatically generated in `staging/results/`:
- `normalization-report_{source}_{year}_{timestamp}.json`

---

## Performance Characteristics

### Processing Speed

**Typical Performance:**
- CSV files: ~10,000 rows/second
- XLSX files: ~5,000 rows/second  
- JSON files: ~15,000 rows/second

**Memory Usage:**
- ~50MB baseline
- ~1MB per 1,000 rows processed
- Peak usage during XLSX processing

### Scalability

**File Size Limits:**
- Maximum file size: 100MB
- Maximum rows: 50,000 (configurable)
- Memory usage scales linearly

**Optimization Features:**
- Streaming CSV processing
- Lazy XLSX loading
- Garbage collection friendly

---

## Validation and Quality Assurance

### Data Validation

**Row-Level Validation:**
- Required field presence
- Data type validation
- Value range checks
- Format consistency

**File-Level Validation:**
- Minimum row count
- Column consistency
- Expected data patterns

### Quality Metrics

**Automatically Calculated:**
- Success rate (valid/total rows)
- Transformation effectiveness
- Error distribution
- Processing performance

**Quality Thresholds:**
- Minimum success rate: 95%
- Maximum error rate: 5%
- Processing time limits

---

## Integration Points

### V2 Pipeline Integration

**Input Sources:**
- `staging/raw/` directory containing source files
- Configuration files in `staging/config/`

**Output Destinations:**
- `staging/normalized/` directory for processed CSV files
- `staging/results/` directory for reports and logs

**Dependencies:**
- Canonical university list for name matching
- Source-specific configuration files
- Transformation utility libraries

### Development Workflow

**Configuration Development:**
1. Create/modify rule configuration file
2. Validate configuration syntax
3. Test with sample data
4. Deploy to staging directory

**Processing Workflow:**
1. Place raw data in `staging/raw/`
2. Run normalization engine
3. Validate output in `staging/normalized/`
4. Review processing report
5. Fix any issues and reprocess

---

## Best Practices

### Configuration Management

1. **Version Control**: Track all configuration changes
2. **Testing**: Validate configurations with sample data
3. **Documentation**: Document rule rationale and risk assessment
4. **Backup**: Maintain backup configurations for rollback

### Data Processing

1. **Validation**: Always validate input files before processing
2. **Monitoring**: Review processing reports for issues
3. **Incremental**: Process sources incrementally during development
4. **Backup**: Maintain raw data backups for reprocessing

### Error Handling

1. **Graceful Degradation**: Allow processing to continue with warnings
2. **Detailed Logging**: Log sufficient detail for debugging
3. **Alert Thresholds**: Set appropriate error rate thresholds  
4. **Recovery Procedures**: Define clear recovery steps

---

## Troubleshooting

### Common Issues

**Configuration Validation Failures:**
- Check JSON syntax and required fields
- Validate regex patterns and transformations
- Ensure column mappings match actual data

**File Loading Issues:**
- Verify file permissions and encoding
- Check file format matches configuration
- Ensure sufficient disk space and memory

**Transformation Errors:**
- Review transformation rules for conflicts
- Check university name formats for edge cases
- Validate country mappings are complete

**Output Quality Issues:**
- Review processing reports for patterns
- Check validation rules are appropriate
- Verify transformation effectiveness

### Debugging Steps

1. **Enable Verbose Logging**: Add detailed logging to identify issues
2. **Process Sample Data**: Test with small data samples first
3. **Validate Configurations**: Use validation utilities
4. **Check Dependencies**: Ensure all required files exist
5. **Review Reports**: Analyze processing reports for patterns

---

## Future Enhancements

### Planned Features

1. **Schema Evolution**: Support for schema versioning and migration
2. **Parallel Processing**: Multi-threaded processing for large files
3. **Advanced Validation**: ML-based data quality assessment
4. **Real-time Processing**: Streaming data processing capabilities

### Extension Points

1. **Custom Transformations**: Plugin system for custom rules
2. **Format Support**: Additional input/output formats
3. **Integration APIs**: REST API for external integration
4. **Monitoring**: Enhanced monitoring and alerting

---

This normalization engine provides the foundation for the V2 pipeline's configuration-driven architecture, enabling consistent and reliable processing of university ranking data from all sources.
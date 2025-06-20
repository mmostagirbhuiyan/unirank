#!/usr/bin/env node

/**
 * V2 Pipeline Normalization Engine
 * 
 * Configurable normalization engine that processes raw data files using
 * source-specific configurations and transforms them into standardized CSV format.
 * 
 * Features:
 * - Multi-format input support (CSV, XLSX, JSON)
 * - Configuration-driven transformations
 * - Comprehensive error handling and logging
 * - Processing reports and statistics
 * - Schema validation
 * 
 * Usage:
 *   node v2-pipeline/normalize.js --source=qs --year=2026 --input=staging/raw/qs_2026_official.xlsx
 *   node v2-pipeline/normalize.js --config=staging/config/qs-2026-rules.json --input=staging/raw/qs_2026_official.xlsx
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const XLSX = require('xlsx');

// Import transformation utilities
const TransformationUtils = require('./lib/transformation-utils');
const ValidationUtils = require('./lib/validation-utils');

class NormalizationEngine {
  constructor() {
    this.logger = console; // Simple logger, can be enhanced
    this.stats = {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      transformedRows: 0,
      errors: [],
      warnings: [],
      startTime: null,
      endTime: null
    };
  }

  /**
   * Main normalization function
   */
  async normalize(options) {
    this.stats.startTime = new Date();
    
    try {
      // Validate inputs
      this.validateInputs(options);
      
      // Load configuration
      const config = await this.loadConfiguration(options);
      
      // Load and parse input data
      const rawData = await this.loadInputData(options.input, config);
      
      // Process data through transformation pipeline
      const normalizedData = await this.processData(rawData, config);
      
      // Validate output
      this.validateOutput(normalizedData, config);
      
      // Write output file
      await this.writeOutput(normalizedData, options.output || this.generateOutputPath(options), config);
      
      this.stats.endTime = new Date();
      
      // Generate processing report
      const report = this.generateReport(config);
      
      this.logger.log(`Normalization completed successfully in ${this.stats.endTime - this.stats.startTime}ms`);
      this.logger.log(`Processed ${this.stats.totalRows} total rows, ${this.stats.validRows} valid, ${this.stats.invalidRows} invalid`);
      
      return {
        success: true,
        stats: this.stats,
        report: report,
        outputPath: options.output || this.generateOutputPath(options)
      };
      
    } catch (error) {
      this.stats.endTime = new Date();
      this.stats.errors.push(error.message);
      
      this.logger.error('Normalization failed:', error);
      
      return {
        success: false,
        error: error.message,
        stats: this.stats
      };
    }
  }

  /**
   * Validate input parameters
   */
  validateInputs(options) {
    if (!options.input) {
      throw new Error('Input file path is required');
    }
    
    if (!fs.existsSync(options.input)) {
      throw new Error(`Input file not found: ${options.input}`);
    }
    
    if (!options.config && (!options.source || !options.year)) {
      throw new Error('Either config file or source+year must be specified');
    }
  }

  /**
   * Load and validate configuration
   */
  async loadConfiguration(options) {
    let configPath;
    
    if (options.config) {
      configPath = options.config;
    } else {
      configPath = `staging/config/${options.source}-${options.year}-rules.json`;
    }
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Validate against schema
      const isValid = ValidationUtils.validateConfiguration(config);
      if (!isValid) {
        throw new Error('Configuration validation failed');
      }
      
      this.logger.log(`Loaded configuration: ${configPath}`);
      return config;
      
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Load input data based on file format
   */
  async loadInputData(inputPath, config) {
    const fileExtension = path.extname(inputPath).toLowerCase();
    const encoding = config.metadata.encoding || 'utf-8';
    
    this.logger.log(`Loading input data from: ${inputPath} (${fileExtension}, ${encoding})`);
    
    switch (fileExtension) {
      case '.csv':
        return this.loadCsvData(inputPath, config);
      case '.xlsx':
      case '.xls':
        return this.loadXlsxData(inputPath, config);
      case '.json':
        return this.loadJsonData(inputPath, config);
      default:
        throw new Error(`Unsupported file format: ${fileExtension}`);
    }
  }

  /**
   * Load CSV data
   */
  async loadCsvData(filePath, config) {
    return new Promise((resolve, reject) => {
      const data = [];
      const fileProcessing = config.fileProcessing || {};
      
      const csvOptions = {
        separator: fileProcessing.delimiter || ',',
        quote: fileProcessing.quoteChar || '"',
        escape: fileProcessing.escapeChar || '"',
        skipLinesWithError: fileProcessing.errorHandling?.skipMalformedRows || true
      };
      
      let lineNumber = 0;
      let skipLines = fileProcessing.skipLines || 0;
      
      fs.createReadStream(filePath, { encoding: config.metadata.encoding || 'utf-8' })
        .pipe(csv(csvOptions))
        .on('data', (row) => {
          lineNumber++;
          
          if (lineNumber <= skipLines) {
            return; // Skip header lines
          }
          
          this.stats.totalRows++;
          data.push(row);
        })
        .on('error', (error) => {
          this.stats.errors.push(`CSV parsing error at line ${lineNumber}: ${error.message}`);
          if (fileProcessing.errorHandling?.stopOnCriticalError !== false) {
            reject(error);
          }
        })
        .on('end', () => {
          this.logger.log(`Loaded ${data.length} rows from CSV`);
          resolve(data);
        });
    });
  }

  /**
   * Load XLSX data
   */
  async loadXlsxData(filePath, config) {
    try {
      const workbook = XLSX.readFile(filePath);
      const fileProcessing = config.fileProcessing || {};
      
      // Determine which sheet to read
      let sheetName;
      if (fileProcessing.xlsxSheetName) {
        sheetName = fileProcessing.xlsxSheetName;
      } else if (fileProcessing.xlsxSheetIndex !== undefined) {
        sheetName = workbook.SheetNames[fileProcessing.xlsxSheetIndex];
      } else {
        sheetName = workbook.SheetNames[0]; // Default to first sheet
      }
      
      if (!workbook.Sheets[sheetName]) {
        throw new Error(`Sheet not found: ${sheetName}`);
      }
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1, // Return array of arrays
        raw: false, // Return formatted strings
        defval: '' // Default value for empty cells
      });
      
      // Skip lines if configured
      const skipLines = fileProcessing.skipLines || 0;
      const dataRows = jsonData.slice(skipLines);
      
      // Convert to object format using first row as headers
      if (dataRows.length === 0) {
        throw new Error('No data rows found in XLSX file');
      }
      
      const headers = dataRows[0];
      const data = dataRows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
      
      this.stats.totalRows = data.length;
      this.logger.log(`Loaded ${data.length} rows from XLSX sheet: ${sheetName}`);
      
      return data;
      
    } catch (error) {
      throw new Error(`Failed to load XLSX file: ${error.message}`);
    }
  }

  /**
   * Load JSON data
   */
  async loadJsonData(filePath, config) {
    try {
      const jsonData = JSON.parse(fs.readFileSync(filePath, config.metadata.encoding || 'utf-8'));
      
      // Handle different JSON structures
      let data;
      if (Array.isArray(jsonData)) {
        data = jsonData;
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        data = jsonData.data;
      } else if (jsonData.rankings && Array.isArray(jsonData.rankings)) {
        data = jsonData.rankings;
      } else {
        throw new Error('Unsupported JSON structure');
      }
      
      this.stats.totalRows = data.length;
      this.logger.log(`Loaded ${data.length} rows from JSON`);
      
      return data;
      
    } catch (error) {
      throw new Error(`Failed to load JSON file: ${error.message}`);
    }
  }

  /**
   * Process data through transformation pipeline
   */
  async processData(rawData, config) {
    const normalizedData = [];
    const columnMappings = config.columnMappings;
    const transformationRules = config.transformationRules || {};
    const validation = config.validation || {};
    
    this.logger.log('Starting data transformation...');
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      try {
        // Extract and map columns
        const mappedRow = this.mapColumns(row, columnMappings);
        
        // Apply transformations
        const transformedRow = this.applyTransformations(mappedRow, transformationRules);
        
        // Validate row
        if (this.validateRow(transformedRow, validation)) {
          normalizedData.push(transformedRow);
          this.stats.validRows++;
          this.stats.transformedRows++;
        } else {
          this.stats.invalidRows++;
          if (!validation.skipInvalidRows) {
            throw new Error(`Row validation failed at index ${i}`);
          }
        }
        
      } catch (error) {
        this.stats.invalidRows++;
        this.stats.errors.push(`Error processing row ${i}: ${error.message}`);
        
        if (config.fileProcessing?.errorHandling?.stopOnCriticalError) {
          throw error;
        }
      }
    }
    
    this.logger.log(`Transformation completed: ${this.stats.validRows} valid rows, ${this.stats.invalidRows} invalid rows`);
    
    return normalizedData;
  }

  /**
   * Map raw columns to standard format
   */
  mapColumns(row, columnMappings) {
    const mapped = {};
    
    Object.keys(columnMappings).forEach(standardColumn => {
      const mapping = columnMappings[standardColumn];
      const { primaryHeaders, alternativeHeaders, processing, required, defaultValue } = mapping;
      
      // Find the column value
      let value = null;
      let foundHeader = null;
      
      // Try primary headers first
      for (const header of primaryHeaders) {
        if (row.hasOwnProperty(header) && row[header] !== undefined && row[header] !== '') {
          value = row[header];
          foundHeader = header;
          break;
        }
      }
      
      // Try alternative headers if primary not found
      if (value === null && alternativeHeaders) {
        for (const header of alternativeHeaders) {
          if (row.hasOwnProperty(header) && row[header] !== undefined && row[header] !== '') {
            value = row[header];
            foundHeader = header;
            break;
          }
        }
      }
      
      // Use default value if still not found
      if (value === null) {
        if (defaultValue !== undefined) {
          value = defaultValue;
        } else if (required) {
          throw new Error(`Required column '${standardColumn}' not found`);
        }
      }
      
      // Apply processing
      if (value !== null && processing) {
        value = this.processColumnValue(value, processing);
      }
      
      mapped[standardColumn] = value;
    });
    
    return mapped;
  }

  /**
   * Process individual column value
   */
  processColumnValue(value, processing) {
    switch (processing) {
      case 'trimWhitespace':
        return typeof value === 'string' ? value.trim() : value;
      
      case 'parseNumeric':
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      
      case 'parseInteger':
        const int = parseInt(value, 10);
        return isNaN(int) ? null : int;
      
      case 'handleRangeRanks':
        return TransformationUtils.handleRangeRank(value);
      
      case 'standardizeCountry':
        return TransformationUtils.standardizeCountry(value);
      
      case 'normalizeUniversityName':
        return TransformationUtils.normalizeUniversityName(value);
      
      case 'none':
      default:
        return value;
    }
  }

  /**
   * Apply transformation rules to a row
   */
  applyTransformations(row, transformationRules) {
    const transformed = { ...row };
    
    // Apply university name transformations
    if (transformationRules.universityNames && transformed.name) {
      transformed.name = this.applyUniversityNameTransformations(
        transformed.name, 
        transformationRules.universityNames
      );
    }
    
    // Apply country transformations
    if (transformationRules.countries && transformed.country) {
      transformed.country = this.applyCountryTransformations(
        transformed.country,
        transformationRules.countries
      );
    }
    
    // Apply rank transformations
    if (transformationRules.ranks && transformed.rank) {
      transformed.rank = this.applyRankTransformations(
        transformed.rank,
        transformationRules.ranks
      );
    }
    
    // Apply score transformations
    if (transformationRules.scores && transformed.score) {
      transformed.score = this.applyScoreTransformations(
        transformed.score,
        transformationRules.scores
      );
    }
    
    return transformed;
  }

  /**
   * Apply university name transformations
   */
  applyUniversityNameTransformations(name, rules) {
    let transformed = name;
    
    // Apply basic transformations
    if (rules.basic) {
      transformed = TransformationUtils.applyBasicTransformations(transformed, rules.basic);
    }
    
    // Apply enhanced transformations
    if (rules.enhanced) {
      transformed = TransformationUtils.applyEnhancedTransformations(transformed, rules.enhanced);
    }
    
    // Apply source-specific transformations
    if (rules.sourceSpecific) {
      // Exact mappings
      if (rules.sourceSpecific.exactMappings && rules.sourceSpecific.exactMappings[transformed]) {
        transformed = rules.sourceSpecific.exactMappings[transformed];
      }
      
      // Pattern mappings
      if (rules.sourceSpecific.patternMappings) {
        transformed = TransformationUtils.applyPatternTransformations(
          transformed, 
          rules.sourceSpecific.patternMappings
        );
      }
    }
    
    return transformed;
  }

  /**
   * Apply country transformations
   */
  applyCountryTransformations(country, rules) {
    let transformed = country;
    
    // Direct mappings
    if (rules.mappings && rules.mappings[transformed]) {
      transformed = rules.mappings[transformed];
    }
    
    // City mappings for inference
    if (rules.cityMappings && rules.cityMappings[transformed.toLowerCase()]) {
      transformed = rules.cityMappings[transformed.toLowerCase()];
    }
    
    // Pattern-based transformations
    if (rules.patterns) {
      transformed = TransformationUtils.applyPatternTransformations(transformed, rules.patterns);
    }
    
    return transformed;
  }

  /**
   * Apply rank transformations
   */
  applyRankTransformations(rank, rules) {
    if (rules.handleRanges && typeof rank === 'string' && rank.includes('-')) {
      const strategy = rules.rangeStrategy || 'lowerBound';
      return TransformationUtils.handleRangeRank(rank, strategy);
    }
    
    const numericRank = parseInt(rank, 10);
    
    if (isNaN(numericRank)) {
      const handling = rules.invalidRankHandling || 'skip';
      if (handling === 'error') {
        throw new Error(`Invalid rank: ${rank}`);
      }
      return null;
    }
    
    if (rules.maximumRank && numericRank > rules.maximumRank) {
      this.stats.warnings.push(`Rank ${numericRank} exceeds maximum ${rules.maximumRank}`);
      return null;
    }
    
    return numericRank;
  }

  /**
   * Apply score transformations
   */
  applyScoreTransformations(score, rules) {
    let numericScore = parseFloat(score);
    
    if (isNaN(numericScore)) {
      const handling = rules.invalidScoreHandling || 'null';
      switch (handling) {
        case 'skip':
          throw new Error(`Invalid score: ${score}`);
        case 'zero':
          return 0;
        case 'null':
        default:
          return null;
      }
    }
    
    if (rules.normalize) {
      // Normalize to 0-100 range (implementation depends on source)
      numericScore = Math.min(100, Math.max(0, numericScore));
    }
    
    if (rules.decimalPlaces !== undefined) {
      numericScore = parseFloat(numericScore.toFixed(rules.decimalPlaces));
    }
    
    return numericScore;
  }

  /**
   * Validate a processed row
   */
  validateRow(row, validation) {
    const requiredFields = validation.requiredFields || ['rank', 'name', 'country'];
    
    for (const field of requiredFields) {
      if (!row[field] || row[field] === '' || row[field] === null) {
        return false;
      }
    }
    
    // Additional validation can be added here
    return true;
  }

  /**
   * Validate final output
   */
  validateOutput(data, config) {
    const validation = config.validation || {};
    
    if (validation.minimumDataRows && data.length < validation.minimumDataRows) {
      throw new Error(`Output has only ${data.length} rows, minimum ${validation.minimumDataRows} required`);
    }
    
    if (validation.maximumDataRows && data.length > validation.maximumDataRows) {
      this.stats.warnings.push(`Output has ${data.length} rows, maximum ${validation.maximumDataRows} expected`);
    }
    
    this.logger.log(`Output validation passed: ${data.length} rows`);
  }

  /**
   * Write normalized data to output file
   */
  async writeOutput(data, outputPath, config) {
    const outputFormat = config.outputFormat || {};
    const columns = outputFormat.columns || ['rank', 'name', 'country', 'score'];
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Prepare CSV writer
    const csvWriter = createCsvWriter({
      path: outputPath,
      header: columns.map(col => ({ id: col, title: col })),
      encoding: outputFormat.encoding || 'utf-8'
    });
    
    // Filter data to include only specified columns
    const filteredData = data.map(row => {
      const filtered = {};
      columns.forEach(col => {
        filtered[col] = row[col] || '';
      });
      return filtered;
    });
    
    await csvWriter.writeRecords(filteredData);
    
    this.logger.log(`Output written to: ${outputPath} (${filteredData.length} rows)`);
  }

  /**
   * Generate output file path
   */
  generateOutputPath(options) {
    const source = options.source || 'unknown';
    const year = options.year || new Date().getFullYear();
    return `staging/normalized/${source}_${year}_normalized.csv`;
  }

  /**
   * Generate processing report
   */
  generateReport(config) {
    const processingTime = this.stats.endTime - this.stats.startTime;
    
    const report = {
      metadata: {
        source: config.metadata.source,
        year: config.metadata.year,
        format: config.metadata.format,
        processedAt: this.stats.endTime.toISOString(),
        processingTimeMs: processingTime
      },
      statistics: {
        totalRows: this.stats.totalRows,
        validRows: this.stats.validRows,
        invalidRows: this.stats.invalidRows,
        transformedRows: this.stats.transformedRows,
        successRate: ((this.stats.validRows / this.stats.totalRows) * 100).toFixed(2) + '%'
      },
      errors: this.stats.errors,
      warnings: this.stats.warnings
    };
    
    // Write report to results directory
    const reportPath = `staging/results/normalization-report_${config.metadata.source}_${config.metadata.year}_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.logger.log(`Processing report written to: ${reportPath}`);
    
    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  args.forEach(arg => {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) {
      options[key.substring(2)] = value;
    }
  });
  
  // Validate required arguments
  if (!options.input && !options.help) {
    console.error('Usage: node normalize.js --input=<file> [--config=<config>] [--source=<source>] [--year=<year>] [--output=<output>]');
    console.error('       node normalize.js --help');
    process.exit(1);
  }
  
  if (options.help) {
    console.log(`
V2 Pipeline Normalization Engine

Usage:
  node normalize.js --input=<file> --config=<config> [--output=<output>]
  node normalize.js --input=<file> --source=<source> --year=<year> [--output=<output>]

Options:
  --input     Input file path (required)
  --config    Configuration file path
  --source    Ranking source (qs, the, arwu, usnews)
  --year      Ranking year
  --output    Output file path (optional)
  --help      Show this help message

Examples:
  node normalize.js --input=staging/raw/qs_2026_official.xlsx --source=qs --year=2026
  node normalize.js --input=staging/raw/data.csv --config=staging/config/custom-rules.json
    `);
    process.exit(0);
  }
  
  // Run normalization
  const engine = new NormalizationEngine();
  const result = await engine.normalize(options);
  
  if (result.success) {
    console.log('Normalization completed successfully!');
    console.log(`Output: ${result.outputPath}`);
    console.log(`Valid rows: ${result.stats.validRows}/${result.stats.totalRows}`);
  } else {
    console.error('Normalization failed:', result.error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = NormalizationEngine;
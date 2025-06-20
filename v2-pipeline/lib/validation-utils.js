/**
 * Validation Utilities for V2 Pipeline
 * 
 * This module provides validation functions for configuration files,
 * data integrity, and processing results.
 */

const fs = require('fs');
const path = require('path');

class ValidationUtils {
  
  /**
   * Validate configuration file against schema
   * Basic validation - full JSON Schema validation would require additional libraries
   */
  static validateConfiguration(config) {
    const errors = [];
    
    // Validate required top-level fields
    const requiredFields = ['metadata', 'fileProcessing', 'columnMappings', 'transformationRules'];
    requiredFields.forEach(field => {
      if (!config[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate metadata
    if (config.metadata) {
      const metadata = config.metadata;
      
      if (!metadata.source || !['qs', 'the', 'arwu', 'usnews', 'test'].includes(metadata.source)) {
        errors.push('Invalid or missing metadata.source');
      }
      
      if (!metadata.year || metadata.year < 2000 || metadata.year > 2100) {
        errors.push('Invalid or missing metadata.year');
      }
      
      if (!metadata.format || !['csv', 'xlsx', 'json', 'xml'].includes(metadata.format)) {
        errors.push('Invalid or missing metadata.format');
      }
      
      if (!metadata.description || metadata.description.length === 0) {
        errors.push('Missing metadata.description');
      }
    }
    
    // Validate column mappings
    if (config.columnMappings) {
      const requiredColumns = ['rank', 'name', 'country'];
      requiredColumns.forEach(column => {
        if (!config.columnMappings[column]) {
          errors.push(`Missing required column mapping: ${column}`);
        } else {
          const mapping = config.columnMappings[column];
          if (!mapping.primaryHeaders || !Array.isArray(mapping.primaryHeaders) || mapping.primaryHeaders.length === 0) {
            errors.push(`Invalid primaryHeaders for column: ${column}`);
          }
        }
      });
    }
    
    // Validate transformation rules structure
    if (config.transformationRules) {
      const rules = config.transformationRules;
      
      // Validate university name transformations
      if (rules.universityNames) {
        if (rules.universityNames.enhanced && Array.isArray(rules.universityNames.enhanced)) {
          rules.universityNames.enhanced.forEach((rule, index) => {
            const ruleErrors = this.validateTransformationRule(rule);
            ruleErrors.forEach(error => {
              errors.push(`Enhanced transformation rule ${index}: ${error}`);
            });
          });
        }
      }
    }
    
    if (errors.length > 0) {
      console.error('Configuration validation errors:');
      errors.forEach(error => console.error(`  - ${error}`));
      return false;
    }
    
    return true;
  }

  /**
   * Validate individual transformation rule
   */
  static validateTransformationRule(rule) {
    const errors = [];
    
    if (!rule.name || typeof rule.name !== 'string') {
      errors.push('Missing or invalid rule name');
    }
    
    if (!rule.type || !['regex_replace', 'exact_replace', 'function', 'conditional'].includes(rule.type)) {
      errors.push('Missing or invalid rule type');
    }
    
    if (rule.type === 'regex_replace') {
      if (!rule.pattern) {
        errors.push('Missing pattern for regex_replace rule');
      } else {
        try {
          new RegExp(rule.pattern, rule.flags || '');
        } catch (e) {
          errors.push(`Invalid regex pattern: ${e.message}`);
        }
      }
    }
    
    if (rule.riskLevel && !['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH'].includes(rule.riskLevel)) {
      errors.push('Invalid riskLevel');
    }
    
    return errors;
  }

  /**
   * Validate input file exists and is readable
   */
  static validateInputFile(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return { valid: false, error: 'Invalid file path' };
    }
    
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: `File not found: ${filePath}` };
    }
    
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      return { valid: false, error: `File not readable: ${filePath}` };
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return { valid: false, error: `File is empty: ${filePath}` };
    }
    
    if (stats.size > 100 * 1024 * 1024) { // 100MB limit
      return { valid: false, error: `File too large: ${filePath} (${Math.round(stats.size / 1024 / 1024)}MB)` };
    }
    
    return { valid: true };
  }

  /**
   * Validate output directory is writable
   */
  static validateOutputPath(outputPath) {
    if (!outputPath || typeof outputPath !== 'string') {
      return { valid: false, error: 'Invalid output path' };
    }
    
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      try {
        fs.mkdirSync(outputDir, { recursive: true });
      } catch (error) {
        return { valid: false, error: `Cannot create output directory: ${error.message}` };
      }
    }
    
    try {
      fs.accessSync(outputDir, fs.constants.W_OK);
    } catch (error) {
      return { valid: false, error: `Output directory not writable: ${outputDir}` };
    }
    
    return { valid: true };
  }

  /**
   * Validate data row integrity
   */
  static validateDataRow(row, requiredFields = ['rank', 'name', 'country']) {
    const errors = [];
    
    if (!row || typeof row !== 'object') {
      return { valid: false, errors: ['Invalid row object'] };
    }
    
    // Check required fields
    requiredFields.forEach(field => {
      if (row[field] === undefined || row[field] === null || row[field] === '') {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate specific field types
    if (row.rank !== undefined) {
      const rank = parseInt(row.rank, 10);
      if (isNaN(rank) && typeof row.rank === 'string' && !row.rank.includes('-')) {
        errors.push('Invalid rank format');
      }
    }
    
    if (row.name !== undefined && typeof row.name !== 'string') {
      errors.push('Name must be a string');
    }
    
    if (row.country !== undefined && typeof row.country !== 'string') {
      errors.push('Country must be a string');
    }
    
    if (row.score !== undefined && row.score !== null) {
      const score = parseFloat(row.score);
      if (isNaN(score)) {
        errors.push('Invalid score format');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate processing statistics
   */
  static validateProcessingStats(stats) {
    const errors = [];
    
    if (!stats || typeof stats !== 'object') {
      return { valid: false, errors: ['Invalid stats object'] };
    }
    
    const requiredFields = ['totalRows', 'validRows', 'invalidRows'];
    requiredFields.forEach(field => {
      if (typeof stats[field] !== 'number' || stats[field] < 0) {
        errors.push(`Invalid ${field}: must be a non-negative number`);
      }
    });
    
    if (stats.totalRows !== stats.validRows + stats.invalidRows) {
      errors.push('Row counts do not add up correctly');
    }
    
    if (stats.validRows === 0 && stats.totalRows > 0) {
      errors.push('No valid rows processed - likely configuration issue');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate file format based on extension
   */
  static validateFileFormat(filePath, expectedFormat) {
    const extension = path.extname(filePath).toLowerCase();
    const formatExtensions = {
      'csv': ['.csv'],
      'xlsx': ['.xlsx', '.xls'],
      'json': ['.json'],
      'xml': ['.xml']
    };
    
    if (!formatExtensions[expectedFormat]) {
      return { valid: false, error: `Unsupported format: ${expectedFormat}` };
    }
    
    if (!formatExtensions[expectedFormat].includes(extension)) {
      return { 
        valid: false, 
        error: `File extension ${extension} does not match expected format ${expectedFormat}` 
      };
    }
    
    return { valid: true };
  }

  /**
   * Validate canonical university list
   */
  static validateCanonicalList(canonicalList) {
    const errors = [];
    const warnings = [];
    
    if (!Array.isArray(canonicalList)) {
      return { valid: false, errors: ['Canonical list must be an array'] };
    }
    
    const seenIds = new Set();
    const seenNames = new Set();
    
    canonicalList.forEach((university, index) => {
      // Validate required fields
      if (!university.canonical_id) {
        errors.push(`Entry ${index}: Missing canonical_id`);
      } else {
        if (seenIds.has(university.canonical_id)) {
          errors.push(`Entry ${index}: Duplicate canonical_id: ${university.canonical_id}`);
        }
        seenIds.add(university.canonical_id);
        
        if (!university.canonical_id.match(/^canonical-[0-9]{4}$/)) {
          errors.push(`Entry ${index}: Invalid canonical_id format: ${university.canonical_id}`);
        }
      }
      
      if (!university.canonical_name) {
        errors.push(`Entry ${index}: Missing canonical_name`);
      } else {
        if (seenNames.has(university.canonical_name.toLowerCase())) {
          warnings.push(`Entry ${index}: Potential duplicate name: ${university.canonical_name}`);
        }
        seenNames.add(university.canonical_name.toLowerCase());
      }
      
      if (!university.country) {
        errors.push(`Entry ${index}: Missing country`);
      }
      
      if (!Array.isArray(university.aliases) || university.aliases.length === 0) {
        errors.push(`Entry ${index}: Missing or empty aliases array`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      stats: {
        totalEntries: canonicalList.length,
        uniqueIds: seenIds.size,
        uniqueNames: seenNames.size
      }
    };
  }

  /**
   * Validate normalization result against expected format
   */
  static validateNormalizationResult(data, expectedColumns = ['rank', 'name', 'country']) {
    const errors = [];
    
    if (!Array.isArray(data)) {
      return { valid: false, errors: ['Result must be an array'] };
    }
    
    if (data.length === 0) {
      return { valid: false, errors: ['Result is empty'] };
    }
    
    // Check first few rows for structure
    const sampleSize = Math.min(10, data.length);
    for (let i = 0; i < sampleSize; i++) {
      const row = data[i];
      
      expectedColumns.forEach(column => {
        if (row[column] === undefined) {
          errors.push(`Row ${i}: Missing expected column: ${column}`);
        }
      });
    }
    
    // Check for data consistency
    const columnCounts = {};
    data.forEach(row => {
      Object.keys(row).forEach(column => {
        columnCounts[column] = (columnCounts[column] || 0) + 1;
      });
    });
    
    // Ensure all rows have the same columns
    const expectedCount = data.length;
    Object.keys(columnCounts).forEach(column => {
      if (columnCounts[column] !== expectedCount) {
        errors.push(`Inconsistent column presence: ${column} appears in ${columnCounts[column]}/${expectedCount} rows`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors: errors,
      stats: {
        totalRows: data.length,
        columns: Object.keys(columnCounts),
        columnCounts: columnCounts
      }
    };
  }

  /**
   * Generate validation report
   */
  static generateValidationReport(validations) {
    const report = {
      timestamp: new Date().toISOString(),
      validations: validations,
      summary: {
        total: validations.length,
        passed: validations.filter(v => v.passed).length,
        failed: validations.filter(v => !v.passed).length
      }
    };
    
    report.summary.successRate = report.summary.total > 0 
      ? ((report.summary.passed / report.summary.total) * 100).toFixed(2) + '%'
      : '0%';
    
    return report;
  }
}

module.exports = ValidationUtils;
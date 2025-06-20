#!/usr/bin/env node

/**
 * Configuration Validation System for V2 Pipeline
 * 
 * Comprehensive validation system for normalization rule configurations that ensures:
 * - Syntactic correctness (JSON schema validation)
 * - Semantic validity (logical rule consistency)
 * - Data compatibility (works with actual data files)
 * - Performance characteristics (efficiency and resource usage)
 * - Quality assurance (meets effectiveness thresholds)
 * 
 * Usage:
 *   node v2-pipeline/validate-config.js --config=staging/config/qs-2026-rules.json
 *   node v2-pipeline/validate-config.js --config=rules.json --data=staging/raw/sample.csv
 *   node v2-pipeline/validate-config.js --config=rules.json --dry-run --detailed
 */

const fs = require('fs');
const path = require('path');
const ValidationUtils = require('./lib/validation-utils');
const TransformationUtils = require('./lib/transformation-utils');

class ConfigurationValidator {
  constructor(options = {}) {
    this.options = {
      verbosity: options.verbosity || 'standard',
      includeWarnings: options.includeWarnings !== false,
      includeSuggestions: options.includeSuggestions !== false,
      dryRun: options.dryRun || false,
      ...options
    };
    
    this.results = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      statistics: {},
      performance: {},
      compatibility: {},
      startTime: null,
      endTime: null
    };
    
    this.logger = console;
  }

  /**
   * Main validation function
   */
  async validate(configPath, dataPath = null) {
    this.results.startTime = new Date();
    
    try {
      this.logger.log(`Starting configuration validation: ${configPath}`);
      
      // Load and parse configuration
      const config = await this.loadConfiguration(configPath);
      
      // Phase 1: Schema Validation
      await this.validateSchema(config);
      
      // Phase 2: Logical Validation
      await this.validateLogic(config);
      
      // Phase 3: Data Compatibility (if data file provided)
      if (dataPath) {
        await this.validateDataCompatibility(config, dataPath);
      }
      
      // Phase 4: Performance Analysis
      if (!this.options.dryRun) {
        await this.analyzePerformance(config, dataPath, configPath);
      }
      
      // Phase 5: Quality Assessment
      await this.assessQuality(config);
      
      // Generate final report
      this.results.endTime = new Date();
      const report = this.generateReport(config, configPath);
      
      this.logger.log(`Validation completed in ${this.results.endTime - this.results.startTime}ms`);
      this.logger.log(`Result: ${this.results.valid ? 'VALID' : 'INVALID'} (${this.results.errors.length} errors, ${this.results.warnings.length} warnings)`);
      
      return {
        valid: this.results.valid,
        report: report,
        errors: this.results.errors,
        warnings: this.results.warnings,
        suggestions: this.results.suggestions
      };
      
    } catch (error) {
      this.results.valid = false;
      this.results.endTime = new Date();
      this.results.errors.push(`Validation failed: ${error.message}`);
      
      this.logger.error('Configuration validation failed:', error);
      
      return {
        valid: false,
        error: error.message,
        errors: this.results.errors
      };
    }
  }

  /**
   * Load and parse configuration file
   */
  async loadConfiguration(configPath) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      this.logger.log(`Configuration loaded: ${Object.keys(config).length} top-level sections`);
      return config;
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON syntax in configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Phase 1: Schema Validation
   */
  async validateSchema(config) {
    this.logger.log('Phase 1: Schema validation...');
    
    // Basic schema validation using existing ValidationUtils
    const schemaValid = ValidationUtils.validateConfiguration(config);
    
    if (!schemaValid) {
      this.results.valid = false;
      this.results.errors.push('Configuration does not match required schema');
    }
    
    // Additional schema validations
    this.validateMetadata(config.metadata);
    this.validateFileProcessing(config.fileProcessing);
    this.validateColumnMappings(config.columnMappings);
    this.validateTransformationRules(config.transformationRules);
    
    this.logger.log(`Schema validation: ${schemaValid ? 'PASSED' : 'FAILED'}`);
  }

  /**
   * Validate metadata section
   */
  validateMetadata(metadata) {
    if (!metadata) {
      this.results.errors.push('Missing metadata section');
      return;
    }
    
    // Validate source consistency
    const validSources = ['qs', 'the', 'arwu', 'usnews', 'test'];
    if (!validSources.includes(metadata.source)) {
      this.results.errors.push(`Invalid source: ${metadata.source}`);
    }
    
    // Validate year reasonableness
    const currentYear = new Date().getFullYear();
    if (metadata.year > currentYear + 5) {
      this.results.warnings.push(`Future year detected: ${metadata.year}`);
    }
    
    // Check version format
    if (metadata.version && !metadata.version.match(/^\d+\.\d+\.\d+$/)) {
      this.results.warnings.push(`Invalid version format: ${metadata.version}`);
    }
    
    // Validate description presence and quality
    if (!metadata.description || metadata.description.length < 10) {
      this.results.warnings.push('Description too short or missing');
    }
  }

  /**
   * Validate file processing configuration
   */
  validateFileProcessing(fileProcessing) {
    if (!fileProcessing) {
      this.results.warnings.push('Missing file processing configuration');
      return;
    }
    
    // Validate numeric fields
    if (fileProcessing.skipLines && fileProcessing.skipLines < 0) {
      this.results.errors.push('skipLines cannot be negative');
    }
    
    if (fileProcessing.xlsxSheetIndex && fileProcessing.xlsxSheetIndex < 0) {
      this.results.errors.push('xlsxSheetIndex cannot be negative');
    }
    
    // Validate error handling
    if (fileProcessing.errorHandling) {
      const eh = fileProcessing.errorHandling;
      if (eh.maximumErrors && eh.maximumErrors < 1) {
        this.results.errors.push('maximumErrors must be at least 1');
      }
    }
  }

  /**
   * Validate column mappings
   */
  validateColumnMappings(columnMappings) {
    if (!columnMappings) {
      this.results.errors.push('Missing column mappings');
      return;
    }
    
    const requiredColumns = ['rank', 'name', 'country'];
    requiredColumns.forEach(column => {
      if (!columnMappings[column]) {
        this.results.errors.push(`Missing required column mapping: ${column}`);
      } else {
        this.validateColumnMapping(column, columnMappings[column]);
      }
    });
  }

  /**
   * Validate individual column mapping
   */
  validateColumnMapping(columnName, mapping) {
    if (!mapping.primaryHeaders || !Array.isArray(mapping.primaryHeaders) || mapping.primaryHeaders.length === 0) {
      this.results.errors.push(`Column ${columnName}: Missing or empty primaryHeaders`);
    }
    
    // Check for duplicate headers
    const allHeaders = [...(mapping.primaryHeaders || []), ...(mapping.alternativeHeaders || [])];
    const uniqueHeaders = new Set(allHeaders);
    if (uniqueHeaders.size !== allHeaders.length) {
      this.results.warnings.push(`Column ${columnName}: Duplicate headers detected`);
    }
    
    // Validate processing function
    const validProcessingFunctions = [
      'none', 'trimWhitespace', 'parseNumeric', 'parseInteger',
      'standardizeCountry', 'handleRangeRanks', 'normalizeUniversityName'
    ];
    
    if (mapping.processing && !validProcessingFunctions.includes(mapping.processing)) {
      this.results.errors.push(`Column ${columnName}: Invalid processing function: ${mapping.processing}`);
    }
  }

  /**
   * Validate transformation rules
   */
  validateTransformationRules(transformationRules) {
    if (!transformationRules) {
      this.results.warnings.push('No transformation rules defined');
      return;
    }
    
    // Validate university name transformations
    if (transformationRules.universityNames) {
      this.validateUniversityNameRules(transformationRules.universityNames);
    }
    
    // Validate country transformations
    if (transformationRules.countries) {
      this.validateCountryRules(transformationRules.countries);
    }
    
    // Validate rank transformations
    if (transformationRules.ranks) {
      this.validateRankRules(transformationRules.ranks);
    }
  }

  /**
   * Validate university name transformation rules
   */
  validateUniversityNameRules(nameRules) {
    // Validate basic rules
    if (nameRules.basic) {
      const validBasicRules = [
        'stringValidation', 'caseNormalization', 'diacriticsRemoval',
        'thePrefixRemoval', 'parentheticalRemoval', 'whitespaceNormalization',
        'institutionTypeRemoval', 'locationIndicators'
      ];
      
      nameRules.basic.forEach(rule => {
        if (!validBasicRules.includes(rule)) {
          this.results.errors.push(`Invalid basic transformation rule: ${rule}`);
        }
      });
    }
    
    // Validate enhanced rules
    if (nameRules.enhanced && Array.isArray(nameRules.enhanced)) {
      nameRules.enhanced.forEach((rule, index) => {
        this.validateTransformationRule(rule, `enhanced[${index}]`);
      });
    }
    
    // Validate source-specific rules
    if (nameRules.sourceSpecific) {
      if (nameRules.sourceSpecific.exactMappings) {
        this.validateExactMappings(nameRules.sourceSpecific.exactMappings);
      }
      
      if (nameRules.sourceSpecific.patternMappings) {
        nameRules.sourceSpecific.patternMappings.forEach((rule, index) => {
          this.validateTransformationRule(rule, `sourceSpecific.patternMappings[${index}]`);
        });
      }
    }
  }

  /**
   * Validate individual transformation rule
   */
  validateTransformationRule(rule, context = '') {
    const prefix = context ? `${context}: ` : '';
    
    if (!rule.name) {
      this.results.errors.push(`${prefix}Missing rule name`);
    }
    
    if (!rule.type) {
      this.results.errors.push(`${prefix}Missing rule type`);
    }
    
    const validTypes = ['regex_replace', 'exact_replace', 'function', 'conditional'];
    if (rule.type && !validTypes.includes(rule.type)) {
      this.results.errors.push(`${prefix}Invalid rule type: ${rule.type}`);
    }
    
    // Validate regex patterns
    if (rule.type === 'regex_replace') {
      if (!rule.pattern) {
        this.results.errors.push(`${prefix}Missing pattern for regex_replace rule`);
      } else {
        try {
          new RegExp(rule.pattern, rule.flags || '');
        } catch (error) {
          this.results.errors.push(`${prefix}Invalid regex pattern: ${error.message}`);
        }
      }
    }
    
    // Validate risk level
    const validRiskLevels = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH'];
    if (rule.riskLevel && !validRiskLevels.includes(rule.riskLevel)) {
      this.results.warnings.push(`${prefix}Invalid risk level: ${rule.riskLevel}`);
    }
    
    // Check for frequency data
    if (rule.frequency !== undefined && (typeof rule.frequency !== 'number' || rule.frequency < 0)) {
      this.results.warnings.push(`${prefix}Invalid frequency value`);
    }
  }

  /**
   * Validate exact mappings
   */
  validateExactMappings(exactMappings) {
    if (typeof exactMappings !== 'object') {
      this.results.errors.push('exactMappings must be an object');
      return;
    }
    
    Object.entries(exactMappings).forEach(([from, to]) => {
      if (typeof from !== 'string' || typeof to !== 'string') {
        this.results.errors.push('exactMappings keys and values must be strings');
      }
      
      if (from === to) {
        this.results.warnings.push(`Redundant exact mapping: "${from}" → "${to}"`);
      }
    });
  }

  /**
   * Validate country transformation rules
   */
  validateCountryRules(countryRules) {
    if (countryRules.mappings) {
      this.validateExactMappings(countryRules.mappings);
    }
    
    if (countryRules.cityMappings) {
      this.validateExactMappings(countryRules.cityMappings);
    }
  }

  /**
   * Validate rank transformation rules
   */
  validateRankRules(rankRules) {
    if (rankRules.rangeStrategy) {
      const validStrategies = ['lowerBound', 'upperBound', 'midpoint'];
      if (!validStrategies.includes(rankRules.rangeStrategy)) {
        this.results.errors.push(`Invalid range strategy: ${rankRules.rangeStrategy}`);
      }
    }
    
    if (rankRules.maximumRank !== undefined) {
      if (typeof rankRules.maximumRank !== 'number' || rankRules.maximumRank < 1) {
        this.results.errors.push('maximumRank must be a positive number');
      }
    }
  }

  /**
   * Phase 2: Logical Validation
   */
  async validateLogic(config) {
    this.logger.log('Phase 2: Logical validation...');
    
    // Check for rule conflicts
    this.checkRuleConflicts(config);
    
    // Validate rule dependencies
    this.validateRuleDependencies(config);
    
    // Check for circular references
    this.checkCircularReferences(config);
    
    this.logger.log('Logical validation completed');
  }

  /**
   * Check for conflicting transformation rules
   */
  checkRuleConflicts(config) {
    if (!config.transformationRules || !config.transformationRules.universityNames) {
      return;
    }
    
    const nameRules = config.transformationRules.universityNames;
    
    // Check for conflicting exact mappings
    if (nameRules.sourceSpecific && nameRules.sourceSpecific.exactMappings) {
      const mappings = nameRules.sourceSpecific.exactMappings;
      const values = Object.values(mappings);
      const uniqueValues = new Set(values);
      
      if (values.length !== uniqueValues.size) {
        this.results.warnings.push('Multiple source names map to the same target name');
      }
    }
    
    // Check for overlapping patterns
    if (nameRules.enhanced) {
      this.checkOverlappingPatterns(nameRules.enhanced);
    }
  }

  /**
   * Check for overlapping regex patterns
   */
  checkOverlappingPatterns(rules) {
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];
        
        if (rule1.type === 'regex_replace' && rule2.type === 'regex_replace') {
          // Simple overlap detection - could be enhanced
          if (rule1.pattern === rule2.pattern) {
            this.results.warnings.push(`Duplicate patterns detected: ${rule1.name} and ${rule2.name}`);
          }
        }
      }
    }
  }

  /**
   * Validate rule dependencies and order
   */
  validateRuleDependencies(config) {
    // Check that basic rules are applied before enhanced rules
    const nameRules = config.transformationRules?.universityNames;
    if (nameRules && nameRules.basic && nameRules.enhanced) {
      // Basic rules should include string validation first
      if (nameRules.basic[0] !== 'stringValidation') {
        this.results.suggestions.push('Consider applying stringValidation as the first basic rule');
      }
      
      // Whitespace normalization should be last
      const lastBasic = nameRules.basic[nameRules.basic.length - 1];
      if (lastBasic !== 'whitespaceNormalization') {
        this.results.suggestions.push('Consider applying whitespaceNormalization as the last basic rule');
      }
    }
  }

  /**
   * Check for circular references in rules
   */
  checkCircularReferences(config) {
    // For now, check exact mappings for circular references
    const exactMappings = config.transformationRules?.universityNames?.sourceSpecific?.exactMappings;
    
    if (exactMappings) {
      Object.entries(exactMappings).forEach(([from, to]) => {
        if (exactMappings[to] === from) {
          this.results.warnings.push(`Circular mapping detected: "${from}" ↔ "${to}"`);
        }
      });
    }
  }

  /**
   * Phase 3: Data Compatibility Validation
   */
  async validateDataCompatibility(config, dataPath) {
    this.logger.log('Phase 3: Data compatibility validation...');
    
    if (!fs.existsSync(dataPath)) {
      this.results.warnings.push(`Data file not found: ${dataPath}`);
      return;
    }
    
    try {
      // Load sample data to test compatibility
      const sampleData = await this.loadSampleData(dataPath, config);
      
      // Test column mappings
      this.testColumnMappings(config.columnMappings, sampleData);
      
      // Test transformations
      this.testTransformations(config.transformationRules, sampleData);
      
      this.logger.log('Data compatibility validation completed');
      
    } catch (error) {
      this.results.warnings.push(`Data compatibility check failed: ${error.message}`);
    }
  }

  /**
   * Load sample data for testing
   */
  async loadSampleData(dataPath, config) {
    const NormalizationEngine = require('./normalize');
    const engine = new NormalizationEngine();
    
    // Load limited sample for testing
    const fullData = await engine.loadInputData(dataPath, config);
    return fullData.slice(0, Math.min(100, fullData.length)); // Sample first 100 rows
  }

  /**
   * Test column mappings against actual data
   */
  testColumnMappings(columnMappings, sampleData) {
    if (sampleData.length === 0) {
      this.results.warnings.push('No sample data available for column mapping test');
      return;
    }
    
    const firstRow = sampleData[0];
    const availableColumns = Object.keys(firstRow);
    
    Object.entries(columnMappings).forEach(([standardColumn, mapping]) => {
      const { primaryHeaders, alternativeHeaders } = mapping;
      
      // Check if any primary headers exist
      const foundPrimary = primaryHeaders.some(header => availableColumns.includes(header));
      
      if (!foundPrimary) {
        // Check alternative headers
        const foundAlternative = alternativeHeaders && alternativeHeaders.some(header => availableColumns.includes(header));
        
        if (!foundAlternative) {
          this.results.errors.push(`Column mapping for '${standardColumn}': No matching headers found in data`);
        } else {
          this.results.warnings.push(`Column mapping for '${standardColumn}': Using alternative headers`);
        }
      }
    });
    
    this.results.compatibility.columnMappings = {
      availableColumns: availableColumns,
      mappedColumns: Object.keys(columnMappings),
      unmappedColumns: availableColumns.filter(col => 
        !Object.values(columnMappings).some(mapping => 
          [...(mapping.primaryHeaders || []), ...(mapping.alternativeHeaders || [])].includes(col)
        )
      )
    };
  }

  /**
   * Test transformations against sample data
   */
  testTransformations(transformationRules, sampleData) {
    if (!transformationRules || sampleData.length === 0) {
      return;
    }
    
    let transformationStats = {
      totalTransformations: 0,
      effectiveTransformations: 0,
      ineffectiveRules: []
    };
    
    // Test university name transformations
    if (transformationRules.universityNames) {
      const nameStats = this.testNameTransformations(transformationRules.universityNames, sampleData);
      transformationStats.totalTransformations += nameStats.total;
      transformationStats.effectiveTransformations += nameStats.effective;
      transformationStats.ineffectiveRules.push(...nameStats.ineffective);
    }
    
    this.results.compatibility.transformations = transformationStats;
    
    // Warn about ineffective rules
    transformationStats.ineffectiveRules.forEach(rule => {
      this.results.warnings.push(`Transformation rule '${rule}' appears to be ineffective on sample data`);
    });
  }

  /**
   * Test name transformations specifically
   */
  testNameTransformations(nameRules, sampleData) {
    const stats = { total: 0, effective: 0, ineffective: [] };
    
    // Get name values from sample data
    const nameValues = sampleData.map(row => row.name || row.Name || row.Institution || '').filter(name => name);
    
    if (nameValues.length === 0) {
      return stats;
    }
    
    // Test enhanced rules
    if (nameRules.enhanced && Array.isArray(nameRules.enhanced)) {
      nameRules.enhanced.forEach(rule => {
        stats.total++;
        
        if (rule.type === 'regex_replace' && rule.pattern) {
          try {
            const regex = new RegExp(rule.pattern, rule.flags || '');
            const affected = nameValues.filter(name => regex.test(name));
            
            if (affected.length > 0) {
              stats.effective++;
            } else {
              stats.ineffective.push(rule.name || 'unnamed rule');
            }
          } catch (error) {
            // Regex error already caught in schema validation
          }
        }
      });
    }
    
    return stats;
  }

  /**
   * Phase 4: Performance Analysis
   */
  async analyzePerformance(config, dataPath, configPath) {
    if (!dataPath) {
      this.logger.log('Phase 4: Skipping performance analysis (no data file)');
      return;
    }
    
    this.logger.log('Phase 4: Performance analysis...');
    
    try {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();
      
      // Run actual normalization to measure performance
      const NormalizationEngine = require('./normalize');
      const engine = new NormalizationEngine();
      
      const tempOutput = path.join('staging/results', `validation-test-${Date.now()}.csv`);
      
      const result = await engine.normalize({
        input: dataPath,
        config: configPath,
        output: tempOutput
      });
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      
      this.results.performance = {
        processingTimeMs: endTime - startTime,
        memoryUsage: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          rss: endMemory.rss - startMemory.rss
        },
        throughput: {
          rowsPerSecond: result.stats ? (result.stats.totalRows / ((endTime - startTime) / 1000)) : 0
        },
        success: result.success,
        stats: result.stats
      };
      
      // Clean up temporary file
      if (fs.existsSync(tempOutput)) {
        fs.unlinkSync(tempOutput);
      }
      
      // Check performance thresholds
      if (this.results.performance.processingTimeMs > 30000) {
        this.results.warnings.push(`Processing time (${this.results.performance.processingTimeMs}ms) exceeds recommended threshold`);
      }
      
      if (this.results.performance.memoryUsage.heapUsed > 512 * 1024 * 1024) {
        this.results.warnings.push(`Memory usage (${Math.round(this.results.performance.memoryUsage.heapUsed / 1024 / 1024)}MB) exceeds recommended threshold`);
      }
      
      this.logger.log(`Performance analysis completed: ${this.results.performance.processingTimeMs}ms`);
      
    } catch (error) {
      this.results.warnings.push(`Performance analysis failed: ${error.message}`);
    }
  }

  /**
   * Phase 5: Quality Assessment
   */
  async assessQuality(config) {
    this.logger.log('Phase 5: Quality assessment...');
    
    const quality = {
      score: 0,
      factors: {},
      recommendations: []
    };
    
    // Schema completeness (0-25 points)
    quality.factors.schemaCompleteness = this.assessSchemaCompleteness(config);
    
    // Rule quality (0-25 points)
    quality.factors.ruleQuality = this.assessRuleQuality(config);
    
    // Configuration maintainability (0-25 points)
    quality.factors.maintainability = this.assessMaintainability(config);
    
    // Documentation quality (0-25 points)
    quality.factors.documentation = this.assessDocumentation(config);
    
    // Calculate overall score
    quality.score = Object.values(quality.factors).reduce((sum, score) => sum + score, 0);
    
    this.results.statistics.quality = quality;
    
    // Generate recommendations based on quality assessment
    this.generateQualityRecommendations(quality);
    
    this.logger.log(`Quality assessment: ${quality.score}/100`);
  }

  /**
   * Assess schema completeness
   */
  assessSchemaCompleteness(config) {
    let score = 0;
    
    if (config.metadata) score += 5;
    if (config.fileProcessing) score += 5;
    if (config.columnMappings) score += 5;
    if (config.transformationRules) score += 5;
    if (config.validation) score += 3;
    if (config.outputFormat) score += 2;
    
    return score;
  }

  /**
   * Assess rule quality
   */
  assessRuleQuality(config) {
    let score = 0;
    
    const nameRules = config.transformationRules?.universityNames;
    if (nameRules) {
      if (nameRules.basic && nameRules.basic.length > 0) score += 8;
      if (nameRules.enhanced && nameRules.enhanced.length > 0) score += 8;
      if (nameRules.sourceSpecific) score += 5;
    }
    
    if (config.transformationRules?.countries) score += 4;
    
    return score;
  }

  /**
   * Assess maintainability
   */
  assessMaintainability(config) {
    let score = 0;
    
    // Check for good naming and documentation
    if (config.metadata?.description) score += 5;
    if (config.metadata?.version) score += 3;
    if (config.metadata?.author) score += 2;
    
    // Check for rule documentation
    const nameRules = config.transformationRules?.universityNames?.enhanced || [];
    const documentedRules = nameRules.filter(rule => rule.description);
    if (documentedRules.length === nameRules.length && nameRules.length > 0) score += 10;
    else if (documentedRules.length > 0) score += 5;
    
    // Check for risk assessment
    const riskAssessedRules = nameRules.filter(rule => rule.riskLevel);
    if (riskAssessedRules.length === nameRules.length && nameRules.length > 0) score += 5;
    
    return score;
  }

  /**
   * Assess documentation quality
   */
  assessDocumentation(config) {
    let score = 0;
    
    if (config.metadata?.description && config.metadata.description.length > 20) score += 10;
    if (config.metadata?.version) score += 5;
    if (config.metadata?.created_date) score += 3;
    if (config.metadata?.author) score += 2;
    
    // Check for rule descriptions
    const enhancedRules = config.transformationRules?.universityNames?.enhanced || [];
    const describedRules = enhancedRules.filter(rule => rule.description && rule.description.length > 10);
    if (describedRules.length > 0) score += 5;
    
    return score;
  }

  /**
   * Generate quality recommendations
   */
  generateQualityRecommendations(quality) {
    if (quality.factors.schemaCompleteness < 20) {
      this.results.suggestions.push('Consider adding validation and outputFormat sections for completeness');
    }
    
    if (quality.factors.ruleQuality < 15) {
      this.results.suggestions.push('Add more transformation rules to improve data processing effectiveness');
    }
    
    if (quality.factors.maintainability < 15) {
      this.results.suggestions.push('Improve maintainability by adding rule descriptions and risk assessments');
    }
    
    if (quality.factors.documentation < 15) {
      this.results.suggestions.push('Enhance documentation with detailed descriptions and metadata');
    }
    
    if (quality.score < 60) {
      this.results.suggestions.push('Configuration quality is below recommended threshold - consider comprehensive review');
    }
  }

  /**
   * Generate comprehensive validation report
   */
  generateReport(config, configPath) {
    const report = {
      validation: {
        configPath: configPath,
        timestamp: this.results.endTime.toISOString(),
        processingTime: this.results.endTime - this.results.startTime,
        valid: this.results.valid,
        summary: {
          errors: this.results.errors.length,
          warnings: this.results.warnings.length,
          suggestions: this.results.suggestions.length
        }
      },
      details: {
        errors: this.results.errors,
        warnings: this.results.warnings,
        suggestions: this.results.suggestions
      },
      compatibility: this.results.compatibility,
      performance: this.results.performance,
      quality: this.results.statistics.quality
    };
    
    // Write report to file
    const reportPath = `staging/results/config-validation-report_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.logger.log(`Validation report written to: ${reportPath}`);
    
    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.split('=');
      const optionKey = key.substring(2);
      options[optionKey] = value || true;
    }
  });
  
  if (options.help || !options.config) {
    console.log(`
V2 Pipeline Configuration Validation System

Usage:
  node validate-config.js --config=<config-file> [options]

Options:
  --config        Configuration file to validate (required)
  --data          Data file for compatibility testing (optional)
  --dry-run       Skip performance analysis
  --detailed      Include detailed analysis in output
  --verbosity     Verbosity level: minimal, standard, detailed, debug
  --help          Show this help message

Examples:
  node validate-config.js --config=staging/config/qs-2026-rules.json
  node validate-config.js --config=rules.json --data=staging/raw/sample.csv
  node validate-config.js --config=rules.json --dry-run --detailed
    `);
    process.exit(0);
  }
  
  // Run validation
  const validator = new ConfigurationValidator({
    verbosity: options.verbosity || 'standard',
    dryRun: options['dry-run'] || false,
    includeWarnings: true,
    includeSuggestions: true
  });
  
  const result = await validator.validate(options.config, options.data);
  
  if (result.valid) {
    console.log('✅ Configuration validation PASSED');
    if (result.warnings.length > 0) {
      console.log(`⚠️  ${result.warnings.length} warnings found`);
    }
    if (result.suggestions.length > 0) {
      console.log(`💡 ${result.suggestions.length} suggestions available`);
    }
  } else {
    console.error('❌ Configuration validation FAILED');
    console.error(`Errors: ${result.errors.length}`);
    result.errors.forEach(error => console.error(`  - ${error}`));
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

module.exports = ConfigurationValidator;
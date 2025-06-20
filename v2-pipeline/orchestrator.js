#!/usr/bin/env node

/**
 * V2 Pipeline Orchestrator
 * 
 * Main orchestration system that coordinates all V2 pipeline phases:
 * 1. Configuration validation and setup
 * 2. Data normalization and processing  
 * 3. University matching and reconciliation
 * 4. Manual review workflow (when needed)
 * 5. Results compilation and reporting
 * 
 * This orchestrator provides the unified interface for running the complete
 * V2 pipeline with proper dependency management, error handling, and reporting.
 * 
 * Usage:
 *   node v2-pipeline/orchestrator.js --source=qs --year=2026 --config=qs-2026-rules.json
 *   node v2-pipeline/orchestrator.js --pipeline-config=pipeline.json --dry-run
 *   node v2-pipeline/orchestrator.js --status --run-id=abc123
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Import V2 pipeline components
const ConfigurationValidator = require('./validate-config');
const NormalizationEngine = require('./normalize');
const UniversityMatcher = require('./match-universities');
const ManualReviewSystem = require('./manual-review');

class PipelineOrchestrator {
  constructor(options = {}) {
    this.options = {
      workingDirectory: options.workingDirectory || process.cwd(),
      stagingDirectory: options.stagingDirectory || 'staging',
      enableLogging: options.enableLogging !== false,
      enableMetrics: options.enableMetrics !== false,
      autoCleanup: options.autoCleanup !== false,
      dryRun: options.dryRun || false,
      ...options
    };
    
    // Initialize run tracking
    this.runId = null;
    this.runStartTime = null;
    this.runDirectory = null;
    
    // Pipeline state
    this.currentPhase = null;
    this.pipelineState = {
      phases: {
        validation: { status: 'pending', startTime: null, endTime: null, results: null },
        normalization: { status: 'pending', startTime: null, endTime: null, results: null },
        matching: { status: 'pending', startTime: null, endTime: null, results: null },
        review: { status: 'pending', startTime: null, endTime: null, results: null },
        compilation: { status: 'pending', startTime: null, endTime: null, results: null }
      },
      overall: { status: 'pending', progress: 0 }
    };
    
    // Component instances
    this.validator = null;
    this.normalizer = null;
    this.matcher = null;
    this.reviewSystem = null;
    
    this.logger = options.logger || console;
  }

  /**
   * Initialize the orchestrator and all components
   */
  async initialize(pipelineConfig = {}) {
    try {
      this.runId = this.generateRunId();
      this.runStartTime = new Date();
      this.runDirectory = path.join(this.options.stagingDirectory, 'runs', this.runId);
      
      // Create run directory
      if (!this.options.dryRun) {
        fs.mkdirSync(this.runDirectory, { recursive: true });
      }
      
      this.logger.log(`🚀 Initializing V2 Pipeline Orchestrator`);
      this.logger.log(`Run ID: ${this.runId}`);
      this.logger.log(`Run Directory: ${this.runDirectory}`);
      
      // Initialize components
      this.validator = new ConfigurationValidator({
        verbosity: 'standard',
        dryRun: this.options.dryRun
      });
      
      this.normalizer = new NormalizationEngine({
        enableLogging: false // Let orchestrator handle logging
      });
      
      this.matcher = new UniversityMatcher({
        fuzzyThreshold: pipelineConfig.matchingThreshold || 0.8,
        enableLogging: false
      });
      
      this.reviewSystem = new ManualReviewSystem({
        reviewDirectory: path.join(this.runDirectory, 'manual-review'),
        enableLogging: false
      });
      
      // Initialize matcher (others initialize on demand)
      await this.matcher.initialize();
      
      this.logger.log('✅ Pipeline orchestrator initialized successfully\n');
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize pipeline orchestrator:', error);
      throw error;
    }
  }

  /**
   * Execute the complete pipeline
   */
  async executePipeline(config) {
    this.logger.log('🔄 Starting V2 Pipeline Execution');
    this.logger.log('='.repeat(50));
    
    this.pipelineState.overall.status = 'running';
    
    try {
      // Phase 1: Configuration Validation
      await this.executePhase('validation', async () => {
        return await this.validateConfiguration(config);
      });
      
      // Phase 2: Data Normalization
      await this.executePhase('normalization', async () => {
        return await this.normalizeData(config);
      });
      
      // Phase 3: University Matching
      await this.executePhase('matching', async () => {
        return await this.matchUniversities(config);
      });
      
      // Phase 4: Manual Review (if needed)
      if (this.requiresManualReview()) {
        await this.executePhase('review', async () => {
          return await this.handleManualReview(config);
        });
      } else {
        this.markPhaseSkipped('review', 'No unmatched universities requiring manual review');
      }
      
      // Phase 5: Results Compilation
      await this.executePhase('compilation', async () => {
        return await this.compileResults(config);
      });
      
      // Complete pipeline
      this.pipelineState.overall.status = 'completed';
      this.pipelineState.overall.progress = 100;
      
      const pipelineResults = await this.generatePipelineReport();
      
      this.logger.log('\n🎉 Pipeline execution completed successfully!');
      this.logger.log(`📊 Final Results: ${pipelineResults.summary.totalProcessed} universities processed`);
      this.logger.log(`📁 Results saved to: ${this.runDirectory}`);
      
      return pipelineResults;
      
    } catch (error) {
      this.pipelineState.overall.status = 'failed';
      this.logger.error('❌ Pipeline execution failed:', error);
      
      // Generate failure report
      await this.generateErrorReport(error);
      throw error;
    }
  }

  /**
   * Execute a single pipeline phase
   */
  async executePhase(phaseName, phaseFunction) {
    const phase = this.pipelineState.phases[phaseName];
    
    this.logger.log(`\n📋 Phase ${this.getPhaseNumber(phaseName)}: ${this.getPhaseDisplayName(phaseName)}`);
    this.logger.log('-'.repeat(40));
    
    phase.status = 'running';
    phase.startTime = new Date();
    this.currentPhase = phaseName;
    
    try {
      const results = await phaseFunction();
      
      phase.status = 'completed';
      phase.endTime = new Date();
      phase.results = results;
      
      const duration = phase.endTime - phase.startTime;
      this.logger.log(`✅ ${this.getPhaseDisplayName(phaseName)} completed in ${duration}ms`);
      
      // Update overall progress
      const completedPhases = Object.values(this.pipelineState.phases)
        .filter(p => p.status === 'completed' || p.status === 'skipped').length;
      this.pipelineState.overall.progress = Math.round((completedPhases / 5) * 100);
      
      return results;
      
    } catch (error) {
      phase.status = 'failed';
      phase.endTime = new Date();
      phase.error = error.message;
      
      this.logger.error(`❌ ${this.getPhaseDisplayName(phaseName)} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Phase 1: Configuration Validation
   */
  async validateConfiguration(config) {
    this.logger.log('Validating pipeline configuration...');
    
    const configPath = config.configPath || config.config;
    const dataPath = config.inputPath || config.input;
    
    if (!configPath) {
      throw new Error('Configuration file path is required');
    }
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    
    // Validate configuration
    const validationResult = await this.validator.validate(configPath, dataPath);
    
    if (!validationResult.valid) {
      throw new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`);
    }
    
    this.logger.log(`Configuration validated successfully (Quality Score: ${validationResult.report.quality.score}/100)`);
    
    // Save validation report
    if (!this.options.dryRun) {
      const reportPath = path.join(this.runDirectory, 'validation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(validationResult.report, null, 2));
    }
    
    return {
      configPath,
      dataPath,
      validationReport: validationResult.report,
      qualityScore: validationResult.report.quality.score
    };
  }

  /**
   * Phase 2: Data Normalization
   */
  async normalizeData(config) {
    this.logger.log('Normalizing input data...');
    
    const validationResults = this.pipelineState.phases.validation.results;
    const configPath = validationResults.configPath;
    const inputPath = validationResults.dataPath;
    
    // Handle dry-run mode
    if (this.options.dryRun && !inputPath) {
      this.logger.log('Dry-run mode: Using sample data for normalization testing');
      
      return {
        inputPath: 'sample-data',
        outputPath: null,
        statistics: {
          totalRows: 3,
          validRows: 3,
          invalidRows: 0,
          transformedRows: 3,
          successRate: '100.00%'
        },
        processingTime: 1
      };
    }
    
    if (!inputPath) {
      throw new Error('Input data file path is required for normalization');
    }
    
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input data file not found: ${inputPath}`);
    }
    
    // Prepare output path
    const outputPath = path.join(this.runDirectory, 'normalized-data.csv');
    
    // Run normalization
    const normalizationResult = await this.normalizer.normalize({
      input: inputPath,
      config: configPath,
      output: this.options.dryRun ? null : outputPath
    });
    
    if (!normalizationResult.success) {
      throw new Error('Data normalization failed');
    }
    
    const stats = normalizationResult.stats;
    this.logger.log(`Normalized ${stats.totalRows} rows (${stats.validRows} valid, ${stats.invalidRows} invalid)`);
    
    // Save normalization report
    if (!this.options.dryRun) {
      const reportPath = path.join(this.runDirectory, 'normalization-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(normalizationResult, null, 2));
    }
    
    return {
      inputPath,
      outputPath: this.options.dryRun ? null : outputPath,
      statistics: stats,
      processingTime: normalizationResult.processingTimeMs
    };
  }

  /**
   * Phase 3: University Matching
   */
  async matchUniversities(config) {
    this.logger.log('Matching universities against canonical list...');
    
    const normalizationResults = this.pipelineState.phases.normalization.results;
    const normalizedDataPath = normalizationResults.outputPath;
    
    if (!normalizedDataPath && !this.options.dryRun) {
      throw new Error('Normalized data not available for matching');
    }
    
    // Load normalized data for matching
    let normalizedData = [];
    if (!this.options.dryRun) {
      // For actual runs, load the normalized CSV
      const csvContent = fs.readFileSync(normalizedDataPath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      
      normalizedData = lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, index) => {
          row[header.replace(/"/g, '')] = values[index]?.replace(/"/g, '') || '';
        });
        return row;
      });
    } else {
      // For dry runs, use sample data
      normalizedData = [
        { name: 'Harvard University', country: 'USA', rank: '1' },
        { name: 'Stanford University', country: 'USA', rank: '2' },
        { name: 'Unknown University XYZ', country: 'Unknown', rank: '999' }
      ];
    }
    
    this.logger.log(`Processing ${normalizedData.length} universities for matching...`);
    
    // Extract university names for batch matching
    const universityNames = normalizedData.map(row => row.name || row.university_name || '');
    
    // Run batch matching
    const matchingResult = await this.matcher.batchMatch(universityNames);
    
    const matchingSummary = matchingResult.summary;
    this.logger.log(`Matching completed: ${matchingSummary.matchRate} match rate`);
    this.logger.log(`  Exact: ${matchingSummary.breakdown.exact}`);
    this.logger.log(`  Normalized: ${matchingSummary.breakdown.normalized}`);
    this.logger.log(`  Fuzzy: ${matchingSummary.breakdown.fuzzy}`);
    this.logger.log(`  Unmatched: ${matchingSummary.breakdown.unmatched}`);
    
    // Combine original data with matching results
    const combinedResults = normalizedData.map((row, index) => ({
      originalData: row,
      matchResult: matchingResult.results[index]
    }));
    
    // Separate matched and unmatched
    const matched = combinedResults.filter(item => item.matchResult.match);
    const unmatched = combinedResults.filter(item => !item.matchResult.match);
    
    // Save matching results
    if (!this.options.dryRun) {
      const matchedPath = path.join(this.runDirectory, 'matched-universities.json');
      const unmatchedPath = path.join(this.runDirectory, 'unmatched-universities.json');
      
      fs.writeFileSync(matchedPath, JSON.stringify(matched, null, 2));
      fs.writeFileSync(unmatchedPath, JSON.stringify(unmatched, null, 2));
    }
    
    return {
      totalProcessed: normalizedData.length,
      matched: matched.length,
      unmatched: unmatched.length,
      matchingSummary,
      matchedData: matched,
      unmatchedData: unmatched,
      processingTime: matchingResult.processingTimeMs
    };
  }

  /**
   * Phase 4: Manual Review Workflow
   */
  async handleManualReview(config) {
    this.logger.log('Initiating manual review workflow...');
    
    const matchingResults = this.pipelineState.phases.matching.results;
    const unmatchedData = matchingResults.unmatchedData;
    
    if (!unmatchedData || unmatchedData.length === 0) {
      this.logger.log('No unmatched universities found - skipping manual review');
      return { reviewRequired: false, unmatchedCount: 0 };
    }
    
    // Initialize manual review system
    await this.reviewSystem.initialize();
    
    // Generate review list
    const reviewResult = await this.reviewSystem.generateReviewList(
      unmatchedData.map(item => item.originalData),
      {
        source: config.source || 'pipeline',
        createdBy: 'orchestrator'
      }
    );
    
    this.logger.log(`Manual review list generated: ${reviewResult.itemCount} items`);
    this.logger.log(`Review ID: ${reviewResult.reviewId}`);
    this.logger.log(`Review file: ${reviewResult.reviewPath}`);
    
    // Provide instructions for manual review
    this.logger.log('\n📝 Manual Review Required:');
    this.logger.log(`Please review the unmatched universities in: ${reviewResult.reviewPath}`);
    this.logger.log('Follow the instructions in the review file to make decisions.');
    this.logger.log('Use the manual-review.js tool to apply decisions when ready.');
    
    return {
      reviewRequired: true,
      unmatchedCount: unmatchedData.length,
      reviewId: reviewResult.reviewId,
      reviewPath: reviewResult.reviewPath,
      statistics: reviewResult.statistics
    };
  }

  /**
   * Phase 5: Results Compilation
   */
  async compileResults(config) {
    this.logger.log('Compiling final results...');
    
    const matchingResults = this.pipelineState.phases.matching.results;
    const reviewResults = this.pipelineState.phases.review.results;
    
    // Compile matched universities with their canonical information
    const finalResults = matchingResults.matchedData.map(item => ({
      original: item.originalData,
      canonical: item.matchResult.match,
      matchType: item.matchResult.matchType,
      confidence: item.matchResult.confidence,
      processingTime: item.matchResult.processingTimeMs
    }));
    
    // Generate final output in multiple formats
    const outputFiles = {};
    
    if (!this.options.dryRun) {
      // JSON format
      const jsonPath = path.join(this.runDirectory, 'final-results.json');
      fs.writeFileSync(jsonPath, JSON.stringify(finalResults, null, 2));
      outputFiles.json = jsonPath;
      
      // CSV format
      const csvPath = path.join(this.runDirectory, 'final-results.csv');
      const csvContent = this.convertToCSV(finalResults);
      fs.writeFileSync(csvPath, csvContent);
      outputFiles.csv = csvPath;
    }
    
    const compilationSummary = {
      totalInput: matchingResults.totalProcessed,
      matched: finalResults.length,
      unmatched: matchingResults.unmatched,
      manualReviewRequired: reviewResults?.reviewRequired || false,
      matchRate: ((finalResults.length / matchingResults.totalProcessed) * 100).toFixed(2) + '%'
    };
    
    this.logger.log(`Compilation completed:`);
    this.logger.log(`  Total input: ${compilationSummary.totalInput}`);
    this.logger.log(`  Successfully matched: ${compilationSummary.matched}`);
    this.logger.log(`  Unmatched: ${compilationSummary.unmatched}`);
    this.logger.log(`  Match rate: ${compilationSummary.matchRate}`);
    
    return {
      summary: compilationSummary,
      results: finalResults,
      outputFiles
    };
  }

  /**
   * Generate comprehensive pipeline report
   */
  async generatePipelineReport() {
    const endTime = new Date();
    const totalDuration = endTime - this.runStartTime;
    
    const report = {
      metadata: {
        runId: this.runId,
        startTime: this.runStartTime.toISOString(),
        endTime: endTime.toISOString(),
        totalDuration: totalDuration,
        status: this.pipelineState.overall.status
      },
      phases: {},
      summary: {},
      performance: {},
      outputs: {}
    };
    
    // Phase details
    Object.entries(this.pipelineState.phases).forEach(([phaseName, phase]) => {
      report.phases[phaseName] = {
        status: phase.status,
        startTime: phase.startTime?.toISOString(),
        endTime: phase.endTime?.toISOString(),
        duration: phase.endTime && phase.startTime ? phase.endTime - phase.startTime : null,
        error: phase.error
      };
    });
    
    // Summary statistics
    const validationResults = this.pipelineState.phases.validation.results;
    const normalizationResults = this.pipelineState.phases.normalization.results;
    const matchingResults = this.pipelineState.phases.matching.results;
    const compilationResults = this.pipelineState.phases.compilation.results;
    
    if (compilationResults) {
      report.summary = compilationResults.summary;
    }
    
    // Performance metrics
    report.performance = {
      totalDuration,
      averageProcessingTime: matchingResults?.processingTime 
        ? (matchingResults.processingTime / matchingResults.totalProcessed).toFixed(2) + 'ms'
        : 'N/A',
      normalizationTime: normalizationResults?.processingTime || 0,
      matchingTime: matchingResults?.processingTime || 0
    };
    
    // Output files
    if (compilationResults?.outputFiles) {
      report.outputs = compilationResults.outputFiles;
    }
    
    // Save report
    if (!this.options.dryRun) {
      const reportPath = path.join(this.runDirectory, 'pipeline-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      report.reportPath = reportPath;
    }
    
    return report;
  }

  /**
   * Generate error report for failed pipelines
   */
  async generateErrorReport(error) {
    const errorReport = {
      metadata: {
        runId: this.runId,
        startTime: this.runStartTime?.toISOString(),
        failureTime: new Date().toISOString(),
        currentPhase: this.currentPhase
      },
      error: {
        message: error.message,
        stack: error.stack
      },
      phases: this.pipelineState.phases
    };
    
    if (!this.options.dryRun) {
      const errorReportPath = path.join(this.runDirectory, 'error-report.json');
      fs.writeFileSync(errorReportPath, JSON.stringify(errorReport, null, 2));
    }
    
    return errorReport;
  }

  /**
   * Check if manual review is required
   */
  requiresManualReview() {
    const matchingResults = this.pipelineState.phases.matching.results;
    return matchingResults && matchingResults.unmatched > 0;
  }

  /**
   * Mark a phase as skipped
   */
  markPhaseSkipped(phaseName, reason) {
    const phase = this.pipelineState.phases[phaseName];
    phase.status = 'skipped';
    phase.startTime = new Date();
    phase.endTime = new Date();
    phase.results = { skipped: true, reason };
    
    this.logger.log(`⏭️  ${this.getPhaseDisplayName(phaseName)} skipped: ${reason}`);
  }

  /**
   * Utility methods
   */
  generateRunId() {
    return crypto.randomBytes(8).toString('hex');
  }

  getPhaseNumber(phaseName) {
    const phaseOrder = ['validation', 'normalization', 'matching', 'review', 'compilation'];
    return phaseOrder.indexOf(phaseName) + 1;
  }

  getPhaseDisplayName(phaseName) {
    const displayNames = {
      validation: 'Configuration Validation',
      normalization: 'Data Normalization',
      matching: 'University Matching',
      review: 'Manual Review',
      compilation: 'Results Compilation'
    };
    return displayNames[phaseName] || phaseName;
  }

  convertToCSV(results) {
    const headers = [
      'original_name',
      'canonical_name',
      'canonical_id',
      'country',
      'match_type',
      'confidence',
      'processing_time_ms'
    ];
    
    const rows = results.map(result => [
      `"${result.original.name || ''}"`,
      `"${result.canonical.name || ''}"`,
      `"${result.canonical.id || ''}"`,
      `"${result.canonical.country || ''}"`,
      result.matchType || '',
      result.confidence || '',
      result.processingTime || ''
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Get pipeline status
   */
  getStatus() {
    return {
      runId: this.runId,
      currentPhase: this.currentPhase,
      state: this.pipelineState,
      runDirectory: this.runDirectory
    };
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
  
  if (options.help) {
    console.log(`
V2 Pipeline Orchestrator

Usage:
  node orchestrator.js [options]

Options:
  --config=<file>         Configuration file for pipeline rules
  --input=<file>          Input data file to process
  --source=<name>         Source name (e.g., qs, the, arwu, usnews)
  --year=<year>           Data year
  --dry-run               Run pipeline validation without processing data
  --pipeline-config=<file> Pipeline configuration file
  --status                Show status of current/recent runs
  --run-id=<id>           Show status of specific run
  --help                  Show this help message

Examples:
  node orchestrator.js --config=qs-2026-rules.json --input=qs-2026.csv --source=qs --year=2026
  node orchestrator.js --dry-run --config=test-rules.json
  node orchestrator.js --status
  node orchestrator.js --status --run-id=abc123def456
    `);
    process.exit(0);
  }
  
  // Status mode
  if (options.status) {
    // TODO: Implement status checking for existing runs
    console.log('Status checking not yet implemented');
    process.exit(0);
  }
  
  // Validate required options
  if (!options.config) {
    console.error('❌ --config option is required');
    process.exit(1);
  }
  
  if (!options.input && !options['dry-run']) {
    console.error('❌ --input option is required (unless using --dry-run)');
    process.exit(1);
  }
  
  // Initialize and run pipeline
  try {
    const orchestrator = new PipelineOrchestrator({
      dryRun: options['dry-run'] || false,
      enableLogging: true
    });
    
    // Load pipeline configuration if provided
    let pipelineConfig = {};
    if (options['pipeline-config']) {
      if (fs.existsSync(options['pipeline-config'])) {
        pipelineConfig = JSON.parse(fs.readFileSync(options['pipeline-config'], 'utf8'));
      } else {
        console.error(`❌ Pipeline config file not found: ${options['pipeline-config']}`);
        process.exit(1);
      }
    }
    
    await orchestrator.initialize(pipelineConfig);
    
    const runConfig = {
      configPath: options.config,
      inputPath: options.input,
      source: options.source || 'unknown',
      year: options.year || new Date().getFullYear()
    };
    
    const results = await orchestrator.executePipeline(runConfig);
    
    console.log('\n🎉 Pipeline completed successfully!');
    if (results.reportPath) {
      console.log(`📄 Full report: ${results.reportPath}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Pipeline execution failed:', error.message);
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

module.exports = PipelineOrchestrator;
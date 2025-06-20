#!/usr/bin/env node

/**
 * Comprehensive Test Suite for V2 Pipeline Orchestrator
 * 
 * Tests the complete pipeline orchestration including all phases,
 * error handling, and integration between components.
 */

const PipelineOrchestrator = require('./orchestrator');
const fs = require('fs');
const path = require('path');

class OrchestratorTestSuite {
  constructor() {
    this.testResults = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
    
    this.testDirectory = 'staging/test-orchestrator';
    this.orchestrator = null;
  }

  async runAllTests() {
    console.log('🧪 Starting V2 Pipeline Orchestrator Test Suite\n');
    
    try {
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Run test suites
      await this.testOrchestratorInitialization();
      await this.testDryRunExecution();
      await this.testFullPipelineExecution();
      await this.testErrorHandling();
      await this.testPhaseSkipping();
      await this.testReportGeneration();
      
      // Cleanup
      await this.cleanupTestEnvironment();
      
      // Show summary
      this.showTestSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    // Create isolated test directory
    if (fs.existsSync(this.testDirectory)) {
      fs.rmSync(this.testDirectory, { recursive: true });
    }
    
    // Create test data files
    const testDataPath = path.join(this.testDirectory, 'test-data.csv');
    fs.mkdirSync(this.testDirectory, { recursive: true });
    
    const testData = `rank,name,country,score
1,Harvard University,USA,100
2,Stanford University,USA,99
3,Massachusetts Institute of Technology,USA,98
4,Cambridge University,UK,97
5,Oxford University,UK,96
6,Unknown Test University,TestLand,50`;
    
    fs.writeFileSync(testDataPath, testData);
    
    this.recordPass('Test environment setup completed');
  }

  async testOrchestratorInitialization() {
    console.log('📋 Testing Orchestrator Initialization');
    
    try {
      this.orchestrator = new PipelineOrchestrator({
        enableLogging: false,
        dryRun: false
      });
      
      await this.orchestrator.initialize();
      
      this.recordPass('Orchestrator initialized successfully');
      
      // Test that all components are initialized
      if (this.orchestrator.validator) {
        this.recordPass('Configuration validator initialized');
      } else {
        this.recordFail('Configuration validator not initialized');
      }
      
      if (this.orchestrator.normalizer) {
        this.recordPass('Normalization engine initialized');
      } else {
        this.recordFail('Normalization engine not initialized');
      }
      
      if (this.orchestrator.matcher) {
        this.recordPass('University matcher initialized');
      } else {
        this.recordFail('University matcher not initialized');
      }
      
      if (this.orchestrator.reviewSystem) {
        this.recordPass('Manual review system initialized');
      } else {
        this.recordFail('Manual review system not initialized');
      }
      
    } catch (error) {
      this.recordFail(`Orchestrator initialization failed: ${error.message}`);
    }
    
    console.log();
  }

  async testDryRunExecution() {
    console.log('📋 Testing Dry Run Execution');
    
    try {
      const dryRunOrchestrator = new PipelineOrchestrator({
        enableLogging: false,
        dryRun: true
      });
      
      await dryRunOrchestrator.initialize();
      
      const config = {
        configPath: 'staging/config/test-rules.json',
        source: 'test'
      };
      
      const results = await dryRunOrchestrator.executePipeline(config);
      
      if (results.metadata.status === 'completed') {
        this.recordPass('Dry run completed successfully');
      } else {
        this.recordFail(`Dry run failed with status: ${results.metadata.status}`);
      }
      
      // Verify phases were executed
      const phases = results.phases;
      const expectedPhases = ['validation', 'normalization', 'matching', 'review', 'compilation'];
      
      for (const phaseName of expectedPhases) {
        if (phases[phaseName] && (phases[phaseName].status === 'completed' || phases[phaseName].status === 'skipped')) {
          this.recordPass(`Phase ${phaseName} executed successfully`);
        } else {
          this.recordFail(`Phase ${phaseName} not executed properly`);
        }
      }
      
    } catch (error) {
      this.recordFail(`Dry run execution failed: ${error.message}`);
    }
    
    console.log();
  }

  async testFullPipelineExecution() {
    console.log('📋 Testing Full Pipeline Execution');
    
    try {
      const fullOrchestrator = new PipelineOrchestrator({
        enableLogging: false,
        dryRun: false
      });
      
      await fullOrchestrator.initialize();
      
      const config = {
        configPath: 'staging/config/test-rules.json',
        inputPath: path.join(this.testDirectory, 'test-data.csv'),
        source: 'test'
      };
      
      const results = await fullOrchestrator.executePipeline(config);
      
      if (results.metadata.status === 'completed') {
        this.recordPass('Full pipeline completed successfully');
      } else {
        this.recordFail(`Full pipeline failed with status: ${results.metadata.status}`);
      }
      
      // Verify summary data
      if (results.summary && results.summary.totalInput > 0) {
        this.recordPass(`Processed ${results.summary.totalInput} universities`);
      } else {
        this.recordFail('No universities processed in summary');
      }
      
      if (results.summary && results.summary.matched > 0) {
        this.recordPass(`Successfully matched ${results.summary.matched} universities`);
      } else {
        this.recordFail('No universities matched');
      }
      
      // Verify performance metrics
      if (results.performance && results.performance.totalDuration > 0) {
        this.recordPass(`Pipeline duration: ${results.performance.totalDuration}ms`);
      } else {
        this.recordFail('No performance metrics recorded');
      }
      
      // Verify output files were created
      if (results.outputs && results.outputs.json) {
        if (fs.existsSync(results.outputs.json)) {
          this.recordPass('JSON output file created');
        } else {
          this.recordFail('JSON output file not found');
        }
      }
      
      if (results.outputs && results.outputs.csv) {
        if (fs.existsSync(results.outputs.csv)) {
          this.recordPass('CSV output file created');
        } else {
          this.recordFail('CSV output file not found');
        }
      }
      
      this.lastRunDirectory = fullOrchestrator.runDirectory;
      
    } catch (error) {
      this.recordFail(`Full pipeline execution failed: ${error.message}`);
    }
    
    console.log();
  }

  async testErrorHandling() {
    console.log('📋 Testing Error Handling');
    
    try {
      // Test with invalid configuration file
      const errorOrchestrator = new PipelineOrchestrator({
        enableLogging: false,
        dryRun: false
      });
      
      await errorOrchestrator.initialize();
      
      const invalidConfig = {
        configPath: 'nonexistent-config.json',
        inputPath: path.join(this.testDirectory, 'test-data.csv'),
        source: 'test'
      };
      
      try {
        await errorOrchestrator.executePipeline(invalidConfig);
        this.recordFail('Should have thrown error for invalid config');
      } catch (error) {
        this.recordPass('Correctly handled invalid configuration file');
      }
      
      // Test with invalid input file
      const invalidInputConfig = {
        configPath: 'staging/config/test-rules.json',
        inputPath: 'nonexistent-input.csv',
        source: 'test'
      };
      
      try {
        await errorOrchestrator.executePipeline(invalidInputConfig);
        this.recordFail('Should have thrown error for invalid input');
      } catch (error) {
        this.recordPass('Correctly handled invalid input file');
      }
      
    } catch (error) {
      this.recordFail(`Error handling test failed: ${error.message}`);
    }
    
    console.log();
  }

  async testPhaseSkipping() {
    console.log('📋 Testing Phase Skipping Logic');
    
    try {
      // Create test data with all matches (no manual review needed)
      const allMatchedData = `rank,name,country,score
1,Harvard University,USA,100
2,Stanford University,USA,99
3,Massachusetts Institute of Technology,USA,98`;
      
      const allMatchedPath = path.join(this.testDirectory, 'all-matched.csv');
      fs.writeFileSync(allMatchedPath, allMatchedData);
      
      const skipTestOrchestrator = new PipelineOrchestrator({
        enableLogging: false,
        dryRun: false
      });
      
      await skipTestOrchestrator.initialize();
      
      const config = {
        configPath: 'staging/config/test-rules.json',
        inputPath: allMatchedPath,
        source: 'test'
      };
      
      const results = await skipTestOrchestrator.executePipeline(config);
      
      // Check if manual review was skipped
      if (results.phases.review && results.phases.review.status === 'skipped') {
        this.recordPass('Manual review phase correctly skipped when not needed');
      } else {
        this.recordFail('Manual review phase should have been skipped');
      }
      
    } catch (error) {
      this.recordFail(`Phase skipping test failed: ${error.message}`);
    }
    
    console.log();
  }

  async testReportGeneration() {
    console.log('📋 Testing Report Generation');
    
    if (!this.lastRunDirectory) {
      this.recordFail('No run directory available for report testing');
      console.log();
      return;
    }
    
    try {
      // Check for pipeline report
      const pipelineReportPath = path.join(this.lastRunDirectory, 'pipeline-report.json');
      if (fs.existsSync(pipelineReportPath)) {
        this.recordPass('Pipeline report generated');
        
        const reportData = JSON.parse(fs.readFileSync(pipelineReportPath, 'utf8'));
        
        // Validate report structure
        if (reportData.metadata && reportData.phases && reportData.summary) {
          this.recordPass('Pipeline report has valid structure');
        } else {
          this.recordFail('Pipeline report missing required sections');
        }
        
        // Check metadata
        if (reportData.metadata.runId && reportData.metadata.status) {
          this.recordPass('Pipeline report metadata complete');
        } else {
          this.recordFail('Pipeline report metadata incomplete');
        }
        
      } else {
        this.recordFail('Pipeline report not generated');
      }
      
      // Check for validation report
      const validationReportPath = path.join(this.lastRunDirectory, 'validation-report.json');
      if (fs.existsSync(validationReportPath)) {
        this.recordPass('Validation report generated');
      } else {
        this.recordFail('Validation report not generated');
      }
      
      // Check for normalization report
      const normalizationFiles = fs.readdirSync('staging/results').filter(f => 
        f.startsWith('normalization-report_') && f.includes(this.lastRunDirectory.split('/').pop())
      );
      
      if (normalizationFiles.length > 0) {
        this.recordPass('Normalization report generated');
      } else {
        this.recordFail('Normalization report not generated');
      }
      
      // Check for manual review files (if generated)
      const reviewDir = path.join(this.lastRunDirectory, 'manual-review');
      if (fs.existsSync(reviewDir)) {
        const pendingDir = path.join(reviewDir, 'pending');
        if (fs.existsSync(pendingDir)) {
          const reviewFiles = fs.readdirSync(pendingDir);
          if (reviewFiles.length > 0) {
            this.recordPass('Manual review files generated');
          } else {
            this.recordPass('No manual review files (no unmatched universities)');
          }
        }
      }
      
    } catch (error) {
      this.recordFail(`Report generation test failed: ${error.message}`);
    }
    
    console.log();
  }

  async cleanupTestEnvironment() {
    // Remove test directory
    if (fs.existsSync(this.testDirectory)) {
      fs.rmSync(this.testDirectory, { recursive: true });
    }
    
    // Clean up any generated run directories from tests
    const runsDir = 'staging/runs';
    if (fs.existsSync(runsDir)) {
      const runDirs = fs.readdirSync(runsDir);
      for (const runDir of runDirs) {
        const runPath = path.join(runsDir, runDir);
        if (fs.statSync(runPath).isDirectory()) {
          fs.rmSync(runPath, { recursive: true });
        }
      }
    }
    
    this.recordPass('Test environment cleaned up');
  }

  recordPass(message) {
    this.testResults.totalTests++;
    this.testResults.passed++;
    console.log(`  ✅ ${message}`);
  }

  recordFail(message) {
    this.testResults.totalTests++;
    this.testResults.failed++;
    this.testResults.errors.push(message);
    console.log(`  ❌ ${message}`);
  }

  showTestSummary() {
    console.log('📊 Test Suite Summary');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.testResults.totalTests}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    console.log(`Success Rate: ${((this.testResults.passed / this.testResults.totalTests) * 100).toFixed(1)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    console.log();
    
    // Exit with appropriate code
    if (this.testResults.failed > 0) {
      console.log('❌ Some tests failed. Please review the implementation.');
      process.exit(1);
    } else {
      console.log('✅ All tests passed! V2 Pipeline Orchestrator is working correctly.');
      process.exit(0);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new OrchestratorTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
}

module.exports = OrchestratorTestSuite;
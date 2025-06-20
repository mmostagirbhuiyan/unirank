#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Manual Review Workflow System
 * 
 * Tests the complete workflow from generating review lists to applying decisions
 * and maintaining audit trails.
 */

const ManualReviewSystem = require('./manual-review');
const fs = require('fs');
const path = require('path');

class ManualReviewTestSuite {
  constructor() {
    this.testResults = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
    
    this.testDirectory = 'staging/test-manual-review';
    this.reviewSystem = null;
  }

  async runAllTests() {
    console.log('🧪 Starting Manual Review Workflow System Test Suite\n');
    
    try {
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Run test suites
      await this.testSystemInitialization();
      await this.testReviewListGeneration();
      await this.testDecisionApplication();
      await this.testReviewStatusTracking();
      await this.testErrorHandling();
      await this.testDataIntegrity();
      
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
    
    // Initialize review system with test directory
    this.reviewSystem = new ManualReviewSystem({
      reviewDirectory: this.testDirectory,
      enableLogging: false,
      autoBackup: true
    });
    
    await this.reviewSystem.initialize();
    
    this.recordPass('Test environment setup completed');
  }

  async testSystemInitialization() {
    console.log('📋 Testing System Initialization');
    
    // Test directory structure creation
    const expectedDirs = [
      this.testDirectory,
      path.join(this.testDirectory, 'pending'),
      path.join(this.testDirectory, 'completed'),
      path.join(this.testDirectory, 'decisions'),
      path.join(this.testDirectory, 'backups')
    ];
    
    for (const dir of expectedDirs) {
      if (fs.existsSync(dir)) {
        this.recordPass(`Directory created: ${path.basename(dir)}`);
      } else {
        this.recordFail(`Directory missing: ${path.basename(dir)}`);
      }
    }
    
    // Test matcher initialization
    if (this.reviewSystem.matcher) {
      this.recordPass('University matcher initialized');
    } else {
      this.recordFail('University matcher not initialized');
    }
    
    console.log();
  }

  async testReviewListGeneration() {
    console.log('📋 Testing Review List Generation');
    
    // Create test unmatched data
    const testUnmatched = [
      {
        name: 'Test Technical University Berlin',
        country: 'Germany',
        rank: 100,
        score: 70.0,
        source: 'test'
      },
      {
        name: 'Harvard Med School',
        country: 'USA', 
        rank: 5,
        score: 95.0,
        source: 'test'
      },
      {
        name: 'Invalid Entry',
        rank: 999,
        source: 'test'
      },
      {
        name: 'École Polytechnique de Paris',
        country: 'France',
        rank: 25,
        score: 85.0,
        source: 'test'
      }
    ];
    
    try {
      const result = await this.reviewSystem.generateReviewList(testUnmatched, {
        source: 'test-suite'
      });
      
      if (result.reviewId && result.reviewPath && result.itemCount === 4) {
        this.recordPass(`Review list generated: ${result.itemCount} items`);
      } else {
        this.recordFail(`Invalid review list result: ${JSON.stringify(result)}`);
      }
      
      // Verify file exists and has correct structure
      if (fs.existsSync(result.reviewPath)) {
        const reviewData = JSON.parse(fs.readFileSync(result.reviewPath, 'utf8'));
        
        if (reviewData.metadata && reviewData.items && reviewData.statistics) {
          this.recordPass('Review list file structure valid');
        } else {
          this.recordFail('Review list file structure invalid');
        }
        
        // Test that suggestions were generated
        const itemsWithSuggestions = reviewData.items.filter(item => 
          item.suggestions && item.suggestions.length > 0
        );
        
        if (itemsWithSuggestions.length > 0) {
          this.recordPass(`Suggestions generated for ${itemsWithSuggestions.length} items`);
        } else {
          this.recordFail('No suggestions generated');
        }
        
        // Test flag generation
        const itemsWithFlags = reviewData.items.filter(item => 
          item.flags && item.flags.length > 0
        );
        
        if (itemsWithFlags.length > 0) {
          this.recordPass(`Flags generated for ${itemsWithFlags.length} items`);
        } else {
          this.recordFail('No flags generated');
        }
        
        // Store review ID for later tests
        this.testReviewId = result.reviewId;
        
      } else {
        this.recordFail('Review list file not created');
      }
      
    } catch (error) {
      this.recordFail(`Review list generation failed: ${error.message}`);
    }
    
    console.log();
  }

  async testDecisionApplication() {
    console.log('📋 Testing Decision Application');
    
    if (!this.testReviewId) {
      this.recordFail('No test review ID available');
      console.log();
      return;
    }
    
    // Create test decisions
    const testDecisions = {
      reviewId: this.testReviewId,
      reviewedBy: 'test-suite',
      reviewedAt: new Date().toISOString(),
      decisions: [
        {
          id: `${this.testReviewId}-0000`,
          action: 'NEW',
          originalData: {
            name: 'Test Technical University Berlin',
            country: 'Germany',
            rank: 100,
            score: 70.0,
            source: 'test'
          },
          newUniversityData: {
            canonicalName: 'Test Technical University Berlin',
            country: 'Germany',
            aliases: ['Test Technical University Berlin', 'TTU Berlin'],
            institutionType: 'university',
            specializations: ['technology', 'engineering']
          },
          notes: 'Test university for manual review system',
          reviewedBy: 'test-suite',
          reviewedAt: new Date().toISOString(),
          confidence: 0.95
        },
        {
          id: `${this.testReviewId}-0002`,
          action: 'IGNORE',
          originalData: {
            name: 'Invalid Entry',
            rank: 999,
            source: 'test'
          },
          notes: 'Invalid test entry',
          reviewedBy: 'test-suite',
          reviewedAt: new Date().toISOString(),
          confidence: 1.0
        }
      ]
    };
    
    try {
      // Count universities before application
      const canonicalPath = path.join(process.cwd(), 'canonical-universities.json');
      const beforeData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
      const beforeCount = beforeData.length;
      
      const results = await this.reviewSystem.applyDecisions(testDecisions);
      
      if (results.applied === 2 && results.errors.length === 0) {
        this.recordPass(`Applied ${results.applied} decisions without errors`);
      } else {
        this.recordFail(`Decision application issues: applied=${results.applied}, errors=${results.errors.length}`);
      }
      
      if (results.newUniversities.length === 1) {
        this.recordPass('Correct number of new universities added');
      } else {
        this.recordFail(`Expected 1 new university, got ${results.newUniversities.length}`);
      }
      
      // Verify canonical list was updated
      const afterData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
      const afterCount = afterData.length;
      
      if (afterCount === beforeCount + 1) {
        this.recordPass('Canonical list updated correctly');
      } else {
        this.recordFail(`Canonical list count mismatch: before=${beforeCount}, after=${afterCount}`);
      }
      
      // Verify the new university was added correctly
      const newUniversity = afterData[afterData.length - 1];
      if (newUniversity.canonical_name === 'Test Technical University Berlin') {
        this.recordPass('New university data correctly formatted');
      } else {
        this.recordFail('New university data incorrect');
      }
      
    } catch (error) {
      this.recordFail(`Decision application failed: ${error.message}`);
    }
    
    console.log();
  }

  async testReviewStatusTracking() {
    console.log('📋 Testing Review Status Tracking');
    
    try {
      // Test overall status
      const overallStatus = await this.reviewSystem.getReviewStatus();
      
      if (overallStatus.totalReviews > 0) {
        this.recordPass(`Review history tracked: ${overallStatus.totalReviews} reviews`);
      } else {
        this.recordFail('No reviews in history');
      }
      
      if (overallStatus.completedReviews > 0) {
        this.recordPass(`Completed reviews tracked: ${overallStatus.completedReviews}`);
      } else {
        this.recordFail('No completed reviews tracked');
      }
      
      // Test specific review status
      if (this.testReviewId) {
        const specificStatus = await this.reviewSystem.getReviewStatus(this.testReviewId);
        
        if (specificStatus.reviewId === this.testReviewId) {
          this.recordPass('Specific review status retrieved');
        } else {
          this.recordFail('Specific review status mismatch');
        }
        
        if (specificStatus.status === 'completed') {
          this.recordPass('Review status correctly updated to completed');
        } else {
          this.recordFail(`Expected completed status, got ${specificStatus.status}`);
        }
      }
      
    } catch (error) {
      this.recordFail(`Status tracking failed: ${error.message}`);
    }
    
    console.log();
  }

  async testErrorHandling() {
    console.log('📋 Testing Error Handling');
    
    try {
      // Test invalid decisions format
      try {
        await this.reviewSystem.applyDecisions({ invalid: 'format' });
        this.recordFail('Should have thrown error for invalid decisions format');
      } catch (error) {
        this.recordPass('Correctly rejected invalid decisions format');
      }
      
      // Test missing review ID
      try {
        await this.reviewSystem.getReviewStatus('nonexistent-id');
        this.recordFail('Should have thrown error for nonexistent review ID');
      } catch (error) {
        this.recordPass('Correctly rejected nonexistent review ID');
      }
      
      // Test invalid action in decision
      const invalidDecisions = {
        reviewId: 'test',
        decisions: [{
          id: 'test-0001',
          action: 'INVALID_ACTION',
          originalData: { name: 'Test' }
        }]
      };
      
      try {
        await this.reviewSystem.applyDecisions(invalidDecisions);
        this.recordFail('Should have thrown error for invalid action');
      } catch (error) {
        this.recordPass('Correctly rejected invalid action');
      }
      
    } catch (error) {
      this.recordFail(`Error handling test failed: ${error.message}`);
    }
    
    console.log();
  }

  async testDataIntegrity() {
    console.log('📋 Testing Data Integrity');
    
    try {
      // Verify backup was created
      const backupDir = path.join(this.testDirectory, 'backups');
      const backupFiles = fs.readdirSync(backupDir);
      
      if (backupFiles.length > 0) {
        this.recordPass(`Backup files created: ${backupFiles.length}`);
      } else {
        this.recordFail('No backup files created');
      }
      
      // Verify decisions record was saved
      const decisionsDir = path.join(this.testDirectory, 'decisions');
      const decisionFiles = fs.readdirSync(decisionsDir);
      
      if (decisionFiles.length > 0) {
        this.recordPass(`Decision records saved: ${decisionFiles.length}`);
      } else {
        this.recordFail('No decision records saved');
      }
      
      // Verify review moved from pending to completed
      const pendingDir = path.join(this.testDirectory, 'pending');
      const completedDir = path.join(this.testDirectory, 'completed');
      
      const pendingFiles = fs.readdirSync(pendingDir);
      const completedFiles = fs.readdirSync(completedDir);
      
      if (pendingFiles.length === 0 && completedFiles.length > 0) {
        this.recordPass('Review correctly moved from pending to completed');
      } else {
        this.recordFail(`File movement incorrect: pending=${pendingFiles.length}, completed=${completedFiles.length}`);
      }
      
      // Verify review history file
      const historyPath = path.join(this.testDirectory, 'review-history.json');
      if (fs.existsSync(historyPath)) {
        const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        if (Array.isArray(history) && history.length > 0) {
          this.recordPass('Review history file correctly maintained');
        } else {
          this.recordFail('Review history file invalid');
        }
      } else {
        this.recordFail('Review history file not created');
      }
      
    } catch (error) {
      this.recordFail(`Data integrity test failed: ${error.message}`);
    }
    
    console.log();
  }

  async cleanupTestEnvironment() {
    // Remove test university from canonical list
    const canonicalPath = path.join(process.cwd(), 'canonical-universities.json');
    const canonicalData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
    
    const filteredData = canonicalData.filter(u => 
      u.canonical_name !== 'Test Technical University Berlin'
    );
    
    fs.writeFileSync(canonicalPath, JSON.stringify(filteredData, null, 2));
    
    // Remove test directory
    if (fs.existsSync(this.testDirectory)) {
      fs.rmSync(this.testDirectory, { recursive: true });
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
      console.log('✅ All tests passed! Manual Review Workflow System is working correctly.');
      process.exit(0);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new ManualReviewTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
}

module.exports = ManualReviewTestSuite;
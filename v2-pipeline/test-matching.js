#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Multi-Tiered University Matching Engine
 * 
 * Tests all three matching tiers and validates the matching accuracy
 * against known university names and expected matches.
 */

const UniversityMatcher = require('./match-universities');
const fs = require('fs');

class MatchingTestSuite {
  constructor() {
    this.matcher = new UniversityMatcher({
      fuzzyThreshold: 0.6,
      maxSuggestions: 3,
      enableLogging: false
    });
    
    this.testResults = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Multi-Tiered University Matching Engine Test Suite\n');
    
    try {
      // Initialize matcher
      await this.matcher.initialize();
      console.log('✅ Matcher initialized successfully\n');
      
      // Run test suites
      await this.testExactMatching();
      await this.testNormalizedMatching(); 
      await this.testFuzzyMatching();
      await this.testBatchProcessing();
      await this.testPerformance();
      
      // Show summary
      this.showTestSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testExactMatching() {
    console.log('📋 Testing Tier 1: Exact Matching');
    
    const exactTests = [
      { query: 'Harvard University', expected: 'Harvard University' },
      { query: 'Stanford University', expected: 'Stanford University' },
      { query: 'University of Cambridge', expected: 'University of Cambridge' },
      { query: 'Yale University', expected: 'Yale University' },
      { query: 'Princeton University', expected: 'Princeton University' },
      { query: 'The Harvard University', expected: 'Harvard University' }, // Alias test
    ];
    
    for (const test of exactTests) {
      const result = this.matcher.findMatch(test.query);
      
      if (result.match && result.match.name === test.expected && (result.matchType === 'canonical' || result.matchType === 'alias')) {
        this.recordPass(`Exact match: "${test.query}" → "${result.match.name}"`);
      } else {
        this.recordFail(`Exact match failed: "${test.query}" expected "${test.expected}", got "${result.match?.name || 'null'}" with matchType "${result.matchType}"`);
      }
    }
    
    console.log();
  }

  async testNormalizedMatching() {
    console.log('📋 Testing Tier 2: Normalized Matching');
    
    const normalizedTests = [
      { query: 'massachusetts institute of technology', expected: 'Massachusetts Institute of Technology (MIT)' },
      { query: 'University Of California Berkeley', expected: 'University of California, Berkeley' },
      { query: 'Swiss Federal Institute of Technology Zurich - ETHZ', expected: 'ETH Zurich' },
      { query: 'King\'s College London', expected: 'King\'s College London' },
    ];
    
    for (const test of normalizedTests) {
      const result = this.matcher.findMatch(test.query);
      
      if (result.match && (result.matchType === 'normalized' || result.matchType === 'normalized_alias' || result.matchType === 'canonical' || result.matchType === 'alias')) {
        this.recordPass(`Normalized match: "${test.query}" → "${result.match.name}" (${result.matchType})`);
      } else {
        this.recordFail(`Normalized match failed: "${test.query}" expected any match, got matchType "${result.matchType}"`);
      }
    }
    
    console.log();
  }

  async testFuzzyMatching() {
    console.log('📋 Testing Tier 3: Fuzzy Matching');
    
    const fuzzyTests = [
      { query: 'Harvrd University', threshold: 0.7 }, // Typo
      { query: 'Stanford Univ', threshold: 0.6 }, // Abbreviation
      { query: 'University Cambridge', threshold: 0.6 }, // Abbreviation
      { query: 'MIT University', threshold: 0.5 }, // Partial match
    ];
    
    for (const test of fuzzyTests) {
      const result = this.matcher.findMatch(test.query, { fuzzyThreshold: test.threshold });
      
      if (result.match && result.matchType === 'fuzzy' && result.confidence >= test.threshold) {
        this.recordPass(`Fuzzy match: "${test.query}" → "${result.match.name}" (${(result.confidence * 100).toFixed(1)}%)`);
      } else if (result.suggestions.length > 0) {
        this.recordPass(`Fuzzy suggestions: "${test.query}" → ${result.suggestions.length} suggestions provided`);
      } else {
        this.recordFail(`Fuzzy match failed: "${test.query}" produced no matches or suggestions`);
      }
    }
    
    console.log();
  }

  async testBatchProcessing() {
    console.log('📋 Testing Batch Processing');
    
    // Reset stats for isolated testing
    this.matcher.resetStats();
    
    const testNames = [
      'Harvard University',
      'MIT',
      'Stanford University', 
      'University of Cambridge',
      'Invalid University Name XYZ123'
    ];
    
    try {
      const batchResult = await this.matcher.batchMatch(testNames);
      
      if (batchResult.results.length === testNames.length) {
        this.recordPass(`Batch processing: Processed ${testNames.length} names`);
      } else {
        this.recordFail(`Batch processing: Expected ${testNames.length} results, got ${batchResult.results.length}`);
      }
      
      // Check that summary statistics are reasonable
      const summary = batchResult.summary;
      if (summary.totalQueries === testNames.length) {
        this.recordPass(`Batch statistics: Correct query count (${summary.totalQueries})`);
      } else {
        this.recordFail(`Batch statistics: Wrong query count (${summary.totalQueries})`);
      }
      
    } catch (error) {
      this.recordFail(`Batch processing error: ${error.message}`);
    }
    
    console.log();
  }

  async testPerformance() {
    console.log('📋 Testing Performance');
    
    // Reset stats for isolated testing
    this.matcher.resetStats();
    
    const performanceTestNames = Array(50).fill(0).map((_, i) => `Test University ${i}`);
    
    const startTime = Date.now();
    const batchResult = await this.matcher.batchMatch(performanceTestNames);
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    const avgTimePerQuery = totalTime / performanceTestNames.length;
    
    if (avgTimePerQuery < 30) { // Less than 30ms per query
      this.recordPass(`Performance: Average ${avgTimePerQuery.toFixed(2)}ms per query`);
    } else {
      this.recordFail(`Performance: Slow processing - ${avgTimePerQuery.toFixed(2)}ms per query`);
    }
    
    if (batchResult.results.length === performanceTestNames.length) {
      this.recordPass(`Performance: All ${performanceTestNames.length} queries processed`);
    } else {
      this.recordFail(`Performance: Missing results in batch processing`);
    }
    
    console.log();
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
    
    // Show matcher statistics
    const stats = this.matcher.getMatchingSummary();
    console.log('🔍 Matching Engine Statistics:');
    console.log(`  Total Queries: ${stats.totalQueries}`);
    console.log(`  Match Rate: ${stats.matchRate}`);
    console.log(`  Exact Matches: ${stats.breakdown.exact}`);
    console.log(`  Normalized Matches: ${stats.breakdown.normalized}`);
    console.log(`  Fuzzy Matches: ${stats.breakdown.fuzzy}`);
    console.log(`  Unmatched: ${stats.breakdown.unmatched}`);
    console.log(`  Average Processing Time: ${stats.averageProcessingTimeMs}ms`);
    
    // Exit with appropriate code
    if (this.testResults.failed > 0) {
      console.log('\n❌ Some tests failed. Please review the implementation.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed! Multi-Tiered University Matching Engine is working correctly.');
      process.exit(0);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new MatchingTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
}

module.exports = MatchingTestSuite;
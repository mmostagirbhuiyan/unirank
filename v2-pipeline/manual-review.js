#!/usr/bin/env node

/**
 * Manual Review Workflow System for V2 Pipeline
 * 
 * This system handles universities that couldn't be automatically matched
 * and provides tools for manual review, decision making, and applying
 * those decisions back to the canonical master list.
 * 
 * Key Features:
 * - Generate review lists from unmatched universities
 * - Provide intelligent suggestions for manual reviewers
 * - Apply manual decisions and update canonical data
 * - Track review history and maintain audit trail
 * - Support batch review operations
 * 
 * Usage:
 *   node v2-pipeline/manual-review.js --generate --input=unmatched.json
 *   node v2-pipeline/manual-review.js --apply --decisions=decisions.json
 *   node v2-pipeline/manual-review.js --status --review-id=12345
 */

const fs = require('fs');
const path = require('path');
const UniversityMatcher = require('./match-universities');
const crypto = require('crypto');

class ManualReviewSystem {
  constructor(options = {}) {
    this.options = {
      reviewDirectory: options.reviewDirectory || 'staging/manual-review',
      suggestionsCount: options.suggestionsCount || 5,
      confidenceThreshold: options.confidenceThreshold || 0.5,
      enableLogging: options.enableLogging !== false,
      autoBackup: options.autoBackup !== false,
      ...options
    };
    
    this.matcher = null;
    this.reviewHistory = [];
    this.logger = options.logger || console;
    
    // Ensure review directory exists
    this.ensureDirectoryStructure();
  }

  /**
   * Initialize the manual review system
   */
  async initialize() {
    try {
      // Initialize the university matcher for suggestions
      this.matcher = new UniversityMatcher({
        fuzzyThreshold: 0.3, // Lower threshold for suggestions
        maxSuggestions: this.options.suggestionsCount,
        enableLogging: false
      });
      
      await this.matcher.initialize();
      
      // Load existing review history
      await this.loadReviewHistory();
      
      this.logger.log('Manual Review System initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize manual review system:', error);
      throw error;
    }
  }

  /**
   * Ensure required directory structure exists
   */
  ensureDirectoryStructure() {
    const directories = [
      this.options.reviewDirectory,
      path.join(this.options.reviewDirectory, 'pending'),
      path.join(this.options.reviewDirectory, 'completed'),
      path.join(this.options.reviewDirectory, 'decisions'),
      path.join(this.options.reviewDirectory, 'backups')
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * Generate a manual review list from unmatched universities
   */
  async generateReviewList(unmatchedData, options = {}) {
    if (!this.matcher) {
      throw new Error('Manual review system not initialized');
    }
    
    const reviewId = this.generateReviewId();
    const timestamp = new Date().toISOString();
    
    this.logger.log(`Generating review list for ${unmatchedData.length} unmatched universities...`);
    
    const reviewItems = [];
    
    for (let i = 0; i < unmatchedData.length; i++) {
      const university = unmatchedData[i];
      const item = await this.createReviewItem(university, i, reviewId);
      reviewItems.push(item);
      
      // Progress reporting
      if (unmatchedData.length > 50 && (i + 1) % 20 === 0) {
        this.logger.log(`Processed ${i + 1}/${unmatchedData.length} universities...`);
      }
    }
    
    const reviewList = {
      metadata: {
        reviewId,
        timestamp,
        source: options.source || 'unknown',
        totalItems: reviewItems.length,
        status: 'pending',
        createdBy: options.createdBy || 'system',
        priority: options.priority || 'normal'
      },
      instructions: {
        overview: 'This review list contains universities that could not be automatically matched to the canonical master list.',
        actions: [
          'MATCH: Select the correct match from suggestions',
          'NEW: Add as a new university to the canonical list',
          'IGNORE: Skip this university (will not be included)',
          'DEFER: Skip for now (will be included in future reviews)'
        ],
        notes: 'Please review each university carefully and make the appropriate decision.'
      },
      items: reviewItems,
      statistics: this.generateReviewStatistics(reviewItems)
    };
    
    // Save review list
    const reviewPath = path.join(this.options.reviewDirectory, 'pending', `review-${reviewId}.json`);
    fs.writeFileSync(reviewPath, JSON.stringify(reviewList, null, 2));
    
    // Update review history
    this.reviewHistory.push({
      reviewId,
      timestamp,
      status: 'pending',
      itemCount: reviewItems.length,
      source: options.source,
      filePath: reviewPath
    });
    
    await this.saveReviewHistory();
    
    this.logger.log(`Review list generated: ${reviewPath}`);
    this.logger.log(`Review ID: ${reviewId}`);
    
    return {
      reviewId,
      reviewPath,
      itemCount: reviewItems.length,
      statistics: reviewList.statistics
    };
  }

  /**
   * Create a review item for a single university
   */
  async createReviewItem(university, index, reviewId) {
    const queryName = university.name || university.university_name || university.institution || '';
    
    // Get suggestions from the matching engine
    const matchResult = this.matcher.findMatch(queryName);
    
    // Generate additional context
    const context = this.generateUniversityContext(university);
    
    const reviewItem = {
      id: `${reviewId}-${index.toString().padStart(4, '0')}`,
      originalData: university,
      queryName,
      context,
      suggestions: matchResult.suggestions || [],
      bestMatch: matchResult.match ? {
        university: matchResult.match,
        confidence: matchResult.confidence,
        matchType: matchResult.matchType
      } : null,
      decision: {
        action: null, // MATCH, NEW, IGNORE, DEFER
        selectedMatch: null,
        newUniversityData: null,
        notes: '',
        reviewedBy: null,
        reviewedAt: null,
        confidence: null
      },
      flags: this.generateReviewFlags(university, matchResult),
      priority: this.calculateReviewPriority(university, matchResult)
    };
    
    return reviewItem;
  }

  /**
   * Generate context information for a university
   */
  generateUniversityContext(university) {
    const context = {};
    
    // Extract available information
    if (university.country) context.country = university.country;
    if (university.region) context.region = university.region;
    if (university.city) context.city = university.city;
    if (university.rank || university.ranking) context.rank = university.rank || university.ranking;
    if (university.score) context.score = university.score;
    if (university.website) context.website = university.website;
    
    // Try to infer additional information
    const name = university.name || university.university_name || '';
    
    // Detect potential country from name
    const countryIndicators = [
      { pattern: /\b(australia|australian)\b/i, country: 'Australia' },
      { pattern: /\b(canada|canadian)\b/i, country: 'Canada' },
      { pattern: /\b(uk|united kingdom|british)\b/i, country: 'UK' },
      { pattern: /\b(usa|united states|american)\b/i, country: 'USA' },
      { pattern: /\b(germany|german|deutsche)\b/i, country: 'Germany' },
      { pattern: /\b(france|french|université)\b/i, country: 'France' },
      { pattern: /\b(china|chinese|beijing|shanghai)\b/i, country: 'China' },
      { pattern: /\b(japan|japanese|tokyo|kyoto)\b/i, country: 'Japan' }
    ];
    
    if (!context.country) {
      for (const indicator of countryIndicators) {
        if (indicator.pattern.test(name)) {
          context.inferredCountry = indicator.country;
          break;
        }
      }
    }
    
    // Detect institution type
    const typeIndicators = [
      { pattern: /\btechnical\b|\btech\b|\binstitute of technology\b/i, type: 'technical' },
      { pattern: /\bmedical\b|\bmedicine\b|\bhealth\b/i, type: 'medical' },
      { pattern: /\bbusiness\b|\bmanagement\b|\bmba\b/i, type: 'business' },
      { pattern: /\barts\b|\bfine arts\b|\bdesign\b/i, type: 'arts' },
      { pattern: /\bcollege\b/i, type: 'college' },
      { pattern: /\buniversity\b/i, type: 'university' }
    ];
    
    for (const indicator of typeIndicators) {
      if (indicator.pattern.test(name)) {
        context.inferredType = indicator.type;
        break;
      }
    }
    
    return context;
  }

  /**
   * Generate review flags for special attention
   */
  generateReviewFlags(university, matchResult) {
    const flags = [];
    
    // Flag high-confidence matches that might need verification
    if (matchResult.match && matchResult.confidence > 0.7) {
      flags.push({
        type: 'high_confidence_match',
        message: 'High confidence automatic match found - verify correctness',
        severity: 'info'
      });
    }
    
    // Flag potentially duplicate entries
    if (matchResult.suggestions && matchResult.suggestions.length > 3) {
      flags.push({
        type: 'multiple_suggestions',
        message: 'Multiple similar universities found - check for duplicates',
        severity: 'warning'
      });
    }
    
    // Flag missing essential information
    const name = university.name || university.university_name || '';
    if (!name || name.length < 5) {
      flags.push({
        type: 'poor_name_quality',
        message: 'University name is too short or missing',
        severity: 'error'
      });
    }
    
    if (!university.country) {
      flags.push({
        type: 'missing_country',
        message: 'Country information missing',
        severity: 'warning'
      });
    }
    
    // Flag unusual characters or formatting
    if (/[^\w\s\-\(\)\,\.\']/.test(name)) {
      flags.push({
        type: 'special_characters',
        message: 'Name contains unusual characters',
        severity: 'info'
      });
    }
    
    return flags;
  }

  /**
   * Calculate review priority
   */
  calculateReviewPriority(university, matchResult) {
    let priority = 'normal';
    
    // High priority for universities with good match suggestions
    if (matchResult.suggestions && matchResult.suggestions.length > 0) {
      const bestSuggestion = matchResult.suggestions[0];
      if (bestSuggestion.confidence > 0.6) {
        priority = 'high';
      }
    }
    
    // Low priority for very poor quality entries
    const name = university.name || university.university_name || '';
    if (!name || name.length < 5 || !university.country) {
      priority = 'low';
    }
    
    return priority;
  }

  /**
   * Generate statistics for the review list
   */
  generateReviewStatistics(reviewItems) {
    const stats = {
      totalItems: reviewItems.length,
      withSuggestions: 0,
      withoutSuggestions: 0,
      highPriority: 0,
      normalPriority: 0,
      lowPriority: 0,
      flaggedItems: 0,
      byCountry: {},
      byInferredType: {}
    };
    
    reviewItems.forEach(item => {
      // Count suggestions
      if (item.suggestions && item.suggestions.length > 0) {
        stats.withSuggestions++;
      } else {
        stats.withoutSuggestions++;
      }
      
      // Count priorities
      stats[item.priority + 'Priority']++;
      
      // Count flagged items
      if (item.flags && item.flags.length > 0) {
        stats.flaggedItems++;
      }
      
      // Count by country
      const country = item.context.country || item.context.inferredCountry || 'Unknown';
      stats.byCountry[country] = (stats.byCountry[country] || 0) + 1;
      
      // Count by inferred type
      if (item.context.inferredType) {
        stats.byInferredType[item.context.inferredType] = 
          (stats.byInferredType[item.context.inferredType] || 0) + 1;
      }
    });
    
    return stats;
  }

  /**
   * Apply manual review decisions
   */
  async applyDecisions(decisionsData, options = {}) {
    this.logger.log(`Applying ${decisionsData.decisions?.length || 0} manual review decisions...`);
    
    if (!decisionsData.decisions || !Array.isArray(decisionsData.decisions)) {
      throw new Error('Invalid decisions data format');
    }
    
    const results = {
      applied: 0,
      errors: [],
      newUniversities: [],
      matchedUniversities: [],
      ignored: 0,
      deferred: 0
    };
    
    // Backup canonical list if enabled
    if (this.options.autoBackup) {
      await this.backupCanonicalList();
    }
    
    // Load current canonical list
    const canonicalPath = path.join(process.cwd(), 'canonical-universities.json');
    const canonicalData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
    
    for (const decision of decisionsData.decisions) {
      try {
        await this.applyDecision(decision, canonicalData, results);
        results.applied++;
      } catch (error) {
        this.logger.error(`Error applying decision ${decision.id}:`, error);
        results.errors.push({
          decisionId: decision.id,
          error: error.message
        });
        
        // Re-throw critical errors
        if (error.message.includes('Unknown action')) {
          throw error;
        }
      }
    }
    
    // Save updated canonical list
    if (results.newUniversities.length > 0) {
      canonicalData.push(...results.newUniversities);
      fs.writeFileSync(canonicalPath, JSON.stringify(canonicalData, null, 2));
      this.logger.log(`Updated canonical list with ${results.newUniversities.length} new universities`);
    }
    
    // Move review from pending to completed
    if (decisionsData.reviewId) {
      await this.markReviewCompleted(decisionsData.reviewId, results);
    }
    
    // Save decisions record
    const decisionsPath = path.join(
      this.options.reviewDirectory, 
      'decisions', 
      `decisions-${decisionsData.reviewId || Date.now()}.json`
    );
    
    const decisionsRecord = {
      ...decisionsData,
      appliedAt: new Date().toISOString(),
      appliedBy: options.appliedBy || 'system',
      results
    };
    
    fs.writeFileSync(decisionsPath, JSON.stringify(decisionsRecord, null, 2));
    
    this.logger.log(`Applied ${results.applied} decisions, ${results.errors.length} errors`);
    this.logger.log(`Added ${results.newUniversities.length} new universities`);
    
    return results;
  }

  /**
   * Apply a single decision
   */
  async applyDecision(decision, canonicalData, results) {
    switch (decision.action) {
      case 'MATCH':
        if (!decision.selectedMatch) {
          throw new Error('MATCH action requires selectedMatch');
        }
        results.matchedUniversities.push({
          originalName: decision.originalData?.name,
          matchedTo: decision.selectedMatch.name,
          confidence: decision.confidence
        });
        break;
        
      case 'NEW':
        if (!decision.newUniversityData) {
          throw new Error('NEW action requires newUniversityData');
        }
        
        const newUniversity = this.createNewUniversityEntry(decision);
        results.newUniversities.push(newUniversity);
        break;
        
      case 'IGNORE':
        results.ignored++;
        break;
        
      case 'DEFER':
        results.deferred++;
        break;
        
      default:
        throw new Error(`Unknown action: ${decision.action}`);
    }
  }

  /**
   * Create a new university entry for the canonical list
   */
  createNewUniversityEntry(decision) {
    const originalData = decision.originalData;
    const newData = decision.newUniversityData;
    
    // Generate new canonical ID
    const newId = this.generateCanonicalId();
    
    return {
      canonical_id: newId,
      canonical_name: newData.canonicalName || originalData.name,
      country: newData.country || originalData.country || 'Unknown',
      aliases: [
        newData.canonicalName || originalData.name,
        ...(newData.aliases || [])
      ],
      metadata: {
        institution_type: newData.institutionType || 'university',
        specializations: newData.specializations || ['comprehensive'],
        added_via: 'manual_review',
        added_at: new Date().toISOString(),
        added_by: decision.reviewedBy || 'manual_review_system'
      },
      sources: {
        manual_review: {
          included: true,
          source_name: originalData.name,
          review_notes: decision.notes
        }
      }
    };
  }

  /**
   * Get review status
   */
  async getReviewStatus(reviewId = null) {
    if (reviewId) {
      const review = this.reviewHistory.find(r => r.reviewId === reviewId);
      if (!review) {
        throw new Error(`Review ${reviewId} not found`);
      }
      
      // Load detailed review data
      const reviewPath = review.filePath;
      if (fs.existsSync(reviewPath)) {
        const reviewData = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
        return {
          ...review,
          detailedData: reviewData
        };
      }
      
      return review;
    }
    
    // Return all reviews summary
    return {
      totalReviews: this.reviewHistory.length,
      pendingReviews: this.reviewHistory.filter(r => r.status === 'pending').length,
      completedReviews: this.reviewHistory.filter(r => r.status === 'completed').length,
      reviews: this.reviewHistory
    };
  }

  /**
   * Utility methods
   */
  generateReviewId() {
    return crypto.randomBytes(8).toString('hex');
  }

  generateCanonicalId() {
    // Find highest existing ID and increment
    const canonicalPath = path.join(process.cwd(), 'canonical-universities.json');
    const canonicalData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
    
    const maxId = Math.max(...canonicalData.map(u => {
      const match = u.canonical_id.match(/canonical-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }));
    
    return `canonical-${(maxId + 1).toString().padStart(4, '0')}`;
  }

  async loadReviewHistory() {
    const historyPath = path.join(this.options.reviewDirectory, 'review-history.json');
    if (fs.existsSync(historyPath)) {
      this.reviewHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  }

  async saveReviewHistory() {
    const historyPath = path.join(this.options.reviewDirectory, 'review-history.json');
    fs.writeFileSync(historyPath, JSON.stringify(this.reviewHistory, null, 2));
  }

  async markReviewCompleted(reviewId, results) {
    const review = this.reviewHistory.find(r => r.reviewId === reviewId);
    if (review) {
      review.status = 'completed';
      review.completedAt = new Date().toISOString();
      review.results = results;
      
      // Move file from pending to completed
      const oldPath = review.filePath;
      const newPath = oldPath.replace('/pending/', '/completed/');
      
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        review.filePath = newPath;
      }
      
      await this.saveReviewHistory();
    }
  }

  async backupCanonicalList() {
    const canonicalPath = path.join(process.cwd(), 'canonical-universities.json');
    const backupPath = path.join(
      this.options.reviewDirectory, 
      'backups', 
      `canonical-backup-${Date.now()}.json`
    );
    
    if (fs.existsSync(canonicalPath)) {
      fs.copyFileSync(canonicalPath, backupPath);
      this.logger.log(`Canonical list backed up to: ${backupPath}`);
    }
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
Manual Review Workflow System

Usage:
  node manual-review.js [command] [options]

Commands:
  --generate              Generate review list from unmatched data
  --apply                 Apply manual review decisions
  --status                Show review status
  --help                  Show this help message

Options:
  --input=<file>          Input file with unmatched universities (for --generate)
  --decisions=<file>      Decisions file (for --apply)
  --review-id=<id>        Specific review ID (for --status)
  --source=<name>         Source name for review list
  --output=<file>         Output file path
  --backup                Create backup before applying decisions

Examples:
  node manual-review.js --generate --input=unmatched.json --source=qs-2026
  node manual-review.js --apply --decisions=decisions.json --backup
  node manual-review.js --status --review-id=a1b2c3d4
  node manual-review.js --status
    `);
    process.exit(0);
  }
  
  // Initialize system
  const reviewSystem = new ManualReviewSystem({
    enableLogging: true,
    autoBackup: options.backup || false
  });
  
  await reviewSystem.initialize();
  
  // Execute commands
  if (options.generate) {
    if (!options.input) {
      console.error('--generate requires --input option');
      process.exit(1);
    }
    
    if (!fs.existsSync(options.input)) {
      console.error(`Input file not found: ${options.input}`);
      process.exit(1);
    }
    
    const unmatchedData = JSON.parse(fs.readFileSync(options.input, 'utf8'));
    const result = await reviewSystem.generateReviewList(unmatchedData, {
      source: options.source || 'unknown'
    });
    
    console.log('\n=== Review List Generated ===');
    console.log(`Review ID: ${result.reviewId}`);
    console.log(`File Path: ${result.reviewPath}`);
    console.log(`Total Items: ${result.itemCount}`);
    console.log('\nStatistics:');
    console.log(`  With Suggestions: ${result.statistics.withSuggestions}`);
    console.log(`  Without Suggestions: ${result.statistics.withoutSuggestions}`);
    console.log(`  High Priority: ${result.statistics.highPriority}`);
    console.log(`  Flagged Items: ${result.statistics.flaggedItems}`);
  }
  
  if (options.apply) {
    if (!options.decisions) {
      console.error('--apply requires --decisions option');
      process.exit(1);
    }
    
    if (!fs.existsSync(options.decisions)) {
      console.error(`Decisions file not found: ${options.decisions}`);
      process.exit(1);
    }
    
    const decisionsData = JSON.parse(fs.readFileSync(options.decisions, 'utf8'));
    const results = await reviewSystem.applyDecisions(decisionsData);
    
    console.log('\n=== Decisions Applied ===');
    console.log(`Applied: ${results.applied}`);
    console.log(`Errors: ${results.errors.length}`);
    console.log(`New Universities: ${results.newUniversities.length}`);
    console.log(`Matched: ${results.matchedUniversities.length}`);
    console.log(`Ignored: ${results.ignored}`);
    console.log(`Deferred: ${results.deferred}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(error => {
        console.log(`  - ${error.decisionId}: ${error.error}`);
      });
    }
  }
  
  if (options.status) {
    const status = await reviewSystem.getReviewStatus(options['review-id']);
    
    if (options['review-id']) {
      console.log('\n=== Review Details ===');
      console.log(`Review ID: ${status.reviewId}`);
      console.log(`Status: ${status.status}`);
      console.log(`Created: ${status.timestamp}`);
      console.log(`Items: ${status.itemCount}`);
      console.log(`Source: ${status.source}`);
      
      if (status.detailedData) {
        console.log('\nStatistics:');
        const stats = status.detailedData.statistics;
        console.log(`  With Suggestions: ${stats.withSuggestions}`);
        console.log(`  High Priority: ${stats.highPriority}`);
        console.log(`  Flagged Items: ${stats.flaggedItems}`);
      }
    } else {
      console.log('\n=== All Reviews ===');
      console.log(`Total Reviews: ${status.totalReviews}`);
      console.log(`Pending: ${status.pendingReviews}`);
      console.log(`Completed: ${status.completedReviews}`);
      
      if (status.reviews.length > 0) {
        console.log('\nRecent Reviews:');
        status.reviews.slice(-5).forEach(review => {
          console.log(`  ${review.reviewId}: ${review.status} (${review.itemCount} items)`);
        });
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ManualReviewSystem;
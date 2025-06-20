#!/usr/bin/env node

/**
 * Multi-Tiered University Matching Engine for V2 Pipeline
 * 
 * Implements a three-tier matching strategy for reconciling university names:
 * 1. Exact Match: Direct string comparison against canonical names and aliases
 * 2. Normalized Match: Comparison after standardization transformations
 * 3. Fuzzy Match: Similarity-based matching with configurable thresholds
 * 
 * This engine ensures maximum accuracy while handling the inherent inconsistencies
 * in university naming across different ranking sources.
 * 
 * Usage:
 *   node v2-pipeline/match-universities.js --input=data.csv --output=matched.csv
 *   node v2-pipeline/match-universities.js --name="University of California, Berkeley"
 *   node v2-pipeline/match-universities.js --batch --threshold=0.85
 */

const fs = require('fs');
const path = require('path');
const TransformationUtils = require('./lib/transformation-utils');

class UniversityMatcher {
  constructor(options = {}) {
    this.options = {
      fuzzyThreshold: options.fuzzyThreshold || 0.8,
      maxSuggestions: options.maxSuggestions || 5,
      enableLogging: options.enableLogging !== false,
      strictMode: options.strictMode || false,
      ...options
    };
    
    this.canonicalList = null;
    this.nameIndex = new Map();
    this.aliasIndex = new Map();
    this.normalizedIndex = new Map();
    this.stats = {
      exactMatches: 0,
      normalizedMatches: 0,
      fuzzyMatches: 0,
      noMatches: 0,
      totalQueries: 0,
      processingTimeMs: 0
    };
    
    this.logger = options.logger || console;
  }

  /**
   * Initialize the matcher with canonical university data
   */
  async initialize() {
    const startTime = Date.now();
    
    try {
      // Load canonical university list
      const canonicalPath = path.join(process.cwd(), 'canonical-universities.json');
      
      if (!fs.existsSync(canonicalPath)) {
        throw new Error(`Canonical university list not found: ${canonicalPath}`);
      }
      
      const canonicalData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
      // Handle both array format and object with universities property
      this.canonicalList = Array.isArray(canonicalData) ? canonicalData : canonicalData.universities;
      
      // Build search indices
      this.buildIndices();
      
      const initTime = Date.now() - startTime;
      this.logger.log(`University matcher initialized in ${initTime}ms`);
      this.logger.log(`Loaded ${this.canonicalList.length} universities with ${this.aliasIndex.size} total aliases`);
      
    } catch (error) {
      this.logger.error('Failed to initialize university matcher:', error);
      throw error;
    }
  }

  /**
   * Build search indices for efficient matching
   */
  buildIndices() {
    this.nameIndex.clear();
    this.aliasIndex.clear();
    this.normalizedIndex.clear();
    
    this.canonicalList.forEach((university, index) => {
      // Adapt to canonical university format
      const universityData = {
        name: university.canonical_name,
        country: university.country,
        id: university.canonical_id,
        aliases: university.aliases || [],
        metadata: university.metadata
      };
      
      // Index canonical name
      this.nameIndex.set(universityData.name.toLowerCase(), {
        university: universityData,
        index,
        matchType: 'canonical'
      });
      
      // Index all aliases
      universityData.aliases.forEach(alias => {
        const aliasKey = alias.toLowerCase();
        this.aliasIndex.set(aliasKey, {
          university: universityData,
          index,
          alias,
          matchType: 'alias'
        });
      });
      
      // Index normalized versions
      const normalizedName = this.normalizeForMatching(universityData.name);
      this.normalizedIndex.set(normalizedName, {
        university: universityData,
        index,
        matchType: 'normalized'
      });
      
      // Index normalized aliases
      universityData.aliases.forEach(alias => {
        const normalizedAlias = this.normalizeForMatching(alias);
        if (!this.normalizedIndex.has(normalizedAlias)) {
          this.normalizedIndex.set(normalizedAlias, {
            university: universityData,
            index,
            alias,
            matchType: 'normalized_alias'
          });
        }
      });
    });
    
    this.logger.log(`Built indices: ${this.nameIndex.size} names, ${this.aliasIndex.size} aliases, ${this.normalizedIndex.size} normalized entries`);
  }

  /**
   * Find the best match for a university name using multi-tier strategy
   */
  findMatch(queryName, options = {}) {
    if (!this.canonicalList) {
      throw new Error('Matcher not initialized. Call initialize() first.');
    }
    
    this.stats.totalQueries++;
    const startTime = Date.now();
    
    const result = {
      query: queryName,
      match: null,
      confidence: 0,
      matchType: null,
      suggestions: [],
      processingTimeMs: 0
    };
    
    try {
      // Tier 1: Exact Match
      const exactMatch = this.findExactMatch(queryName);
      if (exactMatch) {
        result.match = exactMatch.university;
        result.confidence = 1.0;
        result.matchType = exactMatch.matchType;
        this.stats.exactMatches++;
        
        result.processingTimeMs = Date.now() - startTime;
        this.stats.processingTimeMs += result.processingTimeMs;
        return result;
      }
      
      // Tier 2: Normalized Match
      const normalizedMatch = this.findNormalizedMatch(queryName);
      if (normalizedMatch) {
        result.match = normalizedMatch.university;
        result.confidence = 0.95;
        result.matchType = normalizedMatch.matchType;
        this.stats.normalizedMatches++;
        
        result.processingTimeMs = Date.now() - startTime;
        this.stats.processingTimeMs += result.processingTimeMs;
        return result;
      }
      
      // Tier 3: Fuzzy Match
      const fuzzyMatch = this.findFuzzyMatch(queryName, options);
      if (fuzzyMatch) {
        result.match = fuzzyMatch.university;
        result.confidence = fuzzyMatch.similarity;
        result.matchType = 'fuzzy';
        result.suggestions = fuzzyMatch.suggestions || [];
        this.stats.fuzzyMatches++;
        
        result.processingTimeMs = Date.now() - startTime;
        this.stats.processingTimeMs += result.processingTimeMs;
        return result;
      }
      
      // No match found
      this.stats.noMatches++;
      result.suggestions = this.generateSuggestions(queryName);
      
    } catch (error) {
      this.logger.error(`Error matching "${queryName}":`, error);
    }
    
    result.processingTimeMs = Date.now() - startTime;
    this.stats.processingTimeMs += result.processingTimeMs;
    return result;
  }

  /**
   * Tier 1: Find exact match using canonical names and aliases
   */
  findExactMatch(queryName) {
    const queryLower = queryName.toLowerCase().trim();
    
    // Check canonical names
    if (this.nameIndex.has(queryLower)) {
      return this.nameIndex.get(queryLower);
    }
    
    // Check aliases
    if (this.aliasIndex.has(queryLower)) {
      return this.aliasIndex.get(queryLower);
    }
    
    return null;
  }

  /**
   * Tier 2: Find normalized match after standardization
   */
  findNormalizedMatch(queryName) {
    const normalizedQuery = this.normalizeForMatching(queryName);
    
    if (this.normalizedIndex.has(normalizedQuery)) {
      return this.normalizedIndex.get(normalizedQuery);
    }
    
    return null;
  }

  /**
   * Tier 3: Find fuzzy match using similarity algorithms
   */
  findFuzzyMatch(queryName, options = {}) {
    const threshold = options.fuzzyThreshold || this.options.fuzzyThreshold;
    const normalizedQuery = this.normalizeForMatching(queryName);
    
    let bestMatch = null;
    let bestSimilarity = 0;
    const candidates = [];
    
    // Early exit for very short queries
    if (normalizedQuery.length < 3) {
      return null;
    }
    
    // Quick pre-filter using length and first character
    const queryLength = normalizedQuery.length;
    const firstChar = normalizedQuery[0];
    
    // Check against all normalized names with pre-filtering
    for (const [normalizedName, entry] of this.normalizedIndex) {
      // Skip if length difference is too large
      const lengthDiff = Math.abs(normalizedName.length - queryLength);
      if (lengthDiff > Math.max(queryLength * 0.5, 10)) {
        continue;
      }
      
      // Quick character-based pre-filter
      if (normalizedName[0] !== firstChar && !normalizedName.includes(firstChar)) {
        continue;
      }
      
      const similarity = this.calculateSimilarity(normalizedQuery, normalizedName);
      
      if (similarity >= threshold) {
        candidates.push({
          university: entry.university,
          similarity,
          matchType: 'fuzzy',
          normalizedTarget: normalizedName
        });
        
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = {
            university: entry.university,
            similarity,
            suggestions: []
          };
        }
      }
    }
    
    // Generate suggestions from top candidates
    if (bestMatch) {
      const topCandidates = candidates
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, this.options.maxSuggestions)
        .map(candidate => ({
          university: candidate.university,
          confidence: candidate.similarity,
          reason: `Fuzzy match (${Math.round(candidate.similarity * 100)}% similar)`
        }));
      
      bestMatch.suggestions = topCandidates;
    }
    
    return bestMatch;
  }

  /**
   * Normalize university name for matching
   */
  normalizeForMatching(name) {
    if (!name || typeof name !== 'string') {
      return '';
    }
    
    // Apply basic normalization transformations using the available methods
    const basicRules = [
      'caseNormalization',
      'diacriticsRemoval', 
      'thePrefixRemoval',
      'parentheticalRemoval',
      'institutionTypeRemoval',
      'whitespaceNormalization'
    ];
    
    return TransformationUtils.applyBasicTransformations(name, basicRules);
  }

  /**
   * Calculate similarity between two strings using multiple algorithms
   */
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    // Use combination of different similarity metrics
    const jaccardSim = this.jaccardSimilarity(str1, str2);
    const levenshteinSim = this.levenshteinSimilarity(str1, str2);
    const tokenSim = this.tokenSimilarity(str1, str2);
    
    // Weighted combination
    return (jaccardSim * 0.3) + (levenshteinSim * 0.4) + (tokenSim * 0.3);
  }

  /**
   * Jaccard similarity based on character n-grams
   */
  jaccardSimilarity(str1, str2, n = 2) {
    const ngrams1 = this.getNgrams(str1, n);
    const ngrams2 = this.getNgrams(str2, n);
    
    const intersection = ngrams1.filter(gram => ngrams2.includes(gram));
    const union = [...new Set([...ngrams1, ...ngrams2])];
    
    return union.length === 0 ? 0 : intersection.length / union.length;
  }

  /**
   * Levenshtein-based similarity
   */
  levenshteinSimilarity(str1, str2) {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * Token-based similarity
   */
  tokenSimilarity(str1, str2) {
    const tokens1 = str1.split(/\s+/).filter(t => t.length > 0);
    const tokens2 = str2.split(/\s+/).filter(t => t.length > 0);
    
    if (tokens1.length === 0 && tokens2.length === 0) return 1;
    if (tokens1.length === 0 || tokens2.length === 0) return 0;
    
    const commonTokens = tokens1.filter(token => tokens2.includes(token));
    const totalTokens = new Set([...tokens1, ...tokens2]).size;
    
    return commonTokens.length / totalTokens;
  }

  /**
   * Generate character n-grams
   */
  getNgrams(str, n) {
    const ngrams = [];
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.push(str.substring(i, i + n));
    }
    return ngrams;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Generate suggestions for unmatched queries
   */
  generateSuggestions(queryName) {
    const normalizedQuery = this.normalizeForMatching(queryName);
    const suggestions = [];
    
    // Find partial matches and similar names
    for (const [normalizedName, entry] of this.normalizedIndex) {
      const similarity = this.calculateSimilarity(normalizedQuery, normalizedName);
      
      if (similarity >= 0.5) { // Lower threshold for suggestions
        suggestions.push({
          university: entry.university,
          confidence: similarity,
          reason: `Partial match (${Math.round(similarity * 100)}% similar)`
        });
      }
    }
    
    // Sort by confidence and limit results
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.options.maxSuggestions);
  }

  /**
   * Batch process multiple university names
   */
  async batchMatch(names, options = {}) {
    if (!Array.isArray(names)) {
      throw new Error('Names must be an array');
    }
    
    const startTime = Date.now();
    const results = [];
    
    this.logger.log(`Starting batch matching for ${names.length} names...`);
    
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const result = this.findMatch(name, options);
      
      results.push({
        index: i,
        ...result
      });
      
      // Progress reporting for large batches
      if (names.length > 100 && (i + 1) % 100 === 0) {
        this.logger.log(`Processed ${i + 1}/${names.length} names...`);
      }
    }
    
    const totalTime = Date.now() - startTime;
    this.logger.log(`Batch matching completed in ${totalTime}ms`);
    
    return {
      results,
      summary: this.getMatchingSummary(),
      processingTimeMs: totalTime
    };
  }

  /**
   * Get matching statistics summary
   */
  getMatchingSummary() {
    const total = this.stats.totalQueries;
    
    return {
      totalQueries: total,
      exactMatches: this.stats.exactMatches,
      normalizedMatches: this.stats.normalizedMatches,
      fuzzyMatches: this.stats.fuzzyMatches,
      noMatches: this.stats.noMatches,
      matchRate: total > 0 ? ((total - this.stats.noMatches) / total * 100).toFixed(2) + '%' : '0%',
      averageProcessingTimeMs: total > 0 ? (this.stats.processingTimeMs / total).toFixed(2) : 0,
      breakdown: {
        exact: total > 0 ? (this.stats.exactMatches / total * 100).toFixed(1) + '%' : '0%',
        normalized: total > 0 ? (this.stats.normalizedMatches / total * 100).toFixed(1) + '%' : '0%',
        fuzzy: total > 0 ? (this.stats.fuzzyMatches / total * 100).toFixed(1) + '%' : '0%',
        unmatched: total > 0 ? (this.stats.noMatches / total * 100).toFixed(1) + '%' : '0%'
      }
    };
  }

  /**
   * Reset matching statistics
   */
  resetStats() {
    this.stats = {
      exactMatches: 0,
      normalizedMatches: 0,
      fuzzyMatches: 0,
      noMatches: 0,
      totalQueries: 0,
      processingTimeMs: 0
    };
  }

  /**
   * Export matching results to various formats
   */
  exportResults(results, outputPath, format = 'json') {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalResults: results.length,
        summary: this.getMatchingSummary()
      },
      results: results
    };
    
    switch (format.toLowerCase()) {
      case 'json':
        fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
        break;
        
      case 'csv':
        const csvContent = this.convertToCSV(results);
        fs.writeFileSync(outputPath, csvContent);
        break;
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    this.logger.log(`Results exported to: ${outputPath}`);
  }

  /**
   * Convert results to CSV format
   */
  convertToCSV(results) {
    const headers = [
      'query',
      'matched_name',
      'matched_country',
      'confidence',
      'match_type',
      'processing_time_ms'
    ];
    
    const rows = results.map(result => [
      `"${result.query}"`,
      `"${result.match ? result.match.name : ''}"`,
      `"${result.match ? result.match.country : ''}"`,
      result.confidence,
      result.matchType || 'none',
      result.processingTimeMs
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
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
Multi-Tiered University Matching Engine

Usage:
  node match-universities.js [options]

Options:
  --name=<name>           Match a single university name
  --input=<file>          Input file with university names
  --output=<file>         Output file for results
  --format=<format>       Output format: json, csv (default: json)
  --threshold=<number>    Fuzzy matching threshold (0.0-1.0, default: 0.8)
  --suggestions=<number>  Maximum suggestions per query (default: 5)
  --batch                 Enable batch processing mode
  --stats                 Show detailed statistics
  --help                  Show this help message

Examples:
  node match-universities.js --name="Harvard University"
  node match-universities.js --input=names.txt --output=results.json
  node match-universities.js --batch --threshold=0.85 --stats
    `);
    process.exit(0);
  }
  
  // Initialize matcher
  const matcher = new UniversityMatcher({
    fuzzyThreshold: parseFloat(options.threshold) || 0.8,
    maxSuggestions: parseInt(options.suggestions) || 5,
    enableLogging: true
  });
  
  await matcher.initialize();
  
  // Single name matching
  if (options.name) {
    const result = matcher.findMatch(options.name);
    
    console.log('\n=== Match Result ===');
    console.log(`Query: ${result.query}`);
    
    if (result.match) {
      console.log(`✅ Match Found: ${result.match.name}`);
      console.log(`   Country: ${result.match.country}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Match Type: ${result.matchType}`);
    } else {
      console.log('❌ No match found');
    }
    
    if (result.suggestions.length > 0) {
      console.log('\n=== Suggestions ===');
      result.suggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion.university.name} (${(suggestion.confidence * 100).toFixed(1)}%)`);
      });
    }
    
    console.log(`\nProcessing time: ${result.processingTimeMs}ms`);
  }
  
  // File-based processing
  if (options.input) {
    if (!fs.existsSync(options.input)) {
      console.error(`Input file not found: ${options.input}`);
      process.exit(1);
    }
    
    // Read input names
    const inputContent = fs.readFileSync(options.input, 'utf8');
    const names = inputContent.split('\n').filter(name => name.trim());
    
    console.log(`Processing ${names.length} names from ${options.input}...`);
    
    // Batch process
    const batchResult = await matcher.batchMatch(names, {
      fuzzyThreshold: parseFloat(options.threshold) || 0.8
    });
    
    // Export results
    const outputPath = options.output || `matching-results-${Date.now()}.json`;
    const format = options.format || 'json';
    
    matcher.exportResults(batchResult.results, outputPath, format);
    
    // Show summary
    console.log('\n=== Processing Summary ===');
    const summary = batchResult.summary;
    console.log(`Total queries: ${summary.totalQueries}`);
    console.log(`Match rate: ${summary.matchRate}`);
    console.log(`Exact matches: ${summary.exactMatches} (${summary.breakdown.exact})`);
    console.log(`Normalized matches: ${summary.normalizedMatches} (${summary.breakdown.normalized})`);
    console.log(`Fuzzy matches: ${summary.fuzzyMatches} (${summary.breakdown.fuzzy})`);
    console.log(`No matches: ${summary.noMatches} (${summary.breakdown.unmatched})`);
    console.log(`Average processing time: ${summary.averageProcessingTimeMs}ms`);
    console.log(`Total processing time: ${batchResult.processingTimeMs}ms`);
  }
  
  // Statistics mode
  if (options.stats) {
    const summary = matcher.getMatchingSummary();
    console.log('\n=== Detailed Statistics ===');
    console.log(JSON.stringify(summary, null, 2));
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = UniversityMatcher;
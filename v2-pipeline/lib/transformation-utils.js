/**
 * Transformation Utilities for V2 Pipeline
 * 
 * This module contains battle-tested transformation functions extracted from
 * the existing codebase and enhanced for the V2 configuration-driven architecture.
 */

class TransformationUtils {
  
  /**
   * Apply basic transformations to university names
   * Based on battle-tested basicCleanName function
   */
  static applyBasicTransformations(name, rules) {
    if (!name || typeof name !== 'string') return '';
    
    let cleaned = name;
    
    rules.forEach(rule => {
      switch (rule) {
        case 'stringValidation':
          if (typeof cleaned !== 'string' || cleaned.trim() === '') return '';
          break;
          
        case 'caseNormalization':
          cleaned = cleaned.toLowerCase();
          break;
          
        case 'diacriticsRemoval':
          cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          break;
          
        case 'thePrefixRemoval':
          cleaned = cleaned.replace(/^the\s+/i, '');
          break;
          
        case 'parentheticalRemoval':
          cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, '');
          break;
          
        case 'locationIndicators':
          cleaned = cleaned.replace(/\s*-\s*australia/gi, '');
          cleaned = cleaned.replace(/\s*-\s*uk/gi, '');
          cleaned = cleaned.replace(/\s*-\s*newcastle-upon-tyne/gi, '');
          break;
          
        case 'institutionTypeRemoval':
          cleaned = cleaned.replace(/ university/gi, '');
          cleaned = cleaned.replace(/ college/gi, '');
          cleaned = cleaned.replace(/ institute/gi, '');
          cleaned = cleaned.replace(/ of technology/gi, '');
          cleaned = cleaned.replace(/ and/gi, '');
          break;
          
        case 'whitespaceNormalization':
          cleaned = cleaned.replace(/\s+/g, ' ');
          cleaned = cleaned.replace(/[.,\-]/g, '');
          cleaned = cleaned.trim();
          break;
      }
    });
    
    return cleaned;
  }

  /**
   * Apply enhanced pattern-based transformations
   * Based on enhanced_name_matcher.js patterns
   */
  static applyEnhancedTransformations(name, transformations) {
    if (!name || typeof name !== 'string') return name;
    
    let transformed = name;
    
    transformations.forEach(rule => {
      if (!rule.enabled || rule.enabled === false) return;
      
      switch (rule.type) {
        case 'regex_replace':
          if (rule.pattern && rule.replacement !== undefined) {
            const flags = rule.flags || '';
            const regex = new RegExp(rule.pattern, flags);
            transformed = transformed.replace(regex, rule.replacement);
          }
          break;
          
        case 'exact_replace':
          if (rule.pattern && rule.replacement !== undefined) {
            if (transformed === rule.pattern) {
              transformed = rule.replacement;
            }
          }
          break;
          
        case 'function':
          // Custom function transformations can be added here
          break;
          
        case 'conditional':
          // Conditional transformations can be added here
          break;
      }
    });
    
    return transformed;
  }

  /**
   * Apply pattern transformations
   */
  static applyPatternTransformations(text, patterns) {
    if (!text || typeof text !== 'string') return text;
    
    let transformed = text;
    
    patterns.forEach(pattern => {
      if (!pattern.enabled || pattern.enabled === false) return;
      
      if (pattern.type === 'regex_replace' && pattern.pattern) {
        const flags = pattern.flags || '';
        const regex = new RegExp(pattern.pattern, flags);
        transformed = transformed.replace(regex, pattern.replacement || '');
      }
    });
    
    return transformed;
  }

  /**
   * Handle range ranks (e.g., "701-710" -> 701)
   * Based on existing rank processing logic
   */
  static handleRangeRank(rank, strategy = 'lowerBound') {
    if (!rank) return null;
    
    const rankStr = String(rank).trim();
    
    // Check if it's a range
    if (rankStr.includes('-')) {
      const parts = rankStr.split('-').map(part => parseInt(part.trim(), 10));
      
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        switch (strategy) {
          case 'lowerBound':
            return parts[0];
          case 'upperBound':
            return parts[1];
          case 'midpoint':
            return Math.round((parts[0] + parts[1]) / 2);
          default:
            return parts[0]; // Default to lower bound
        }
      }
    }
    
    // Single rank
    const numericRank = parseInt(rankStr, 10);
    return isNaN(numericRank) ? null : numericRank;
  }

  /**
   * Standardize country names
   * Based on battle-tested country mappings
   */
  static standardizeCountry(country) {
    if (!country || typeof country !== 'string') return country;
    
    const countryMappings = {
      // From QS mappings
      'United States of America': 'USA',
      'United Kingdom': 'UK',
      'China (Mainland)': 'China',
      'Hong Kong SAR, China': 'Hong Kong',
      'Macao SAR, China': 'Macao',
      'Korea, South': 'South Korea',
      'Russian Federation': 'Russia',
      'Iran, Islamic Republic of': 'Iran',
      'Taiwan, Province of China': 'Taiwan',
      'Venezuela, Bolivarian Republic of': 'Venezuela',
      'United Arab Emirates': 'UAE',
      'Czech Republic': 'Czechia',
      'Syrian Arab Republic': 'Syria',
      'Viet Nam': 'Vietnam',
      'Lao People\'s Democratic Republic': 'Laos',
      'Moldova, Republic of': 'Moldova',
      'Macedonia, the former Yugoslav Republic of': 'North Macedonia',
      
      // From US News city mappings
      'cambridge (u.s.)': 'USA',
      'cambridge': 'USA',
      'oxford': 'UK',
      'cambridge (u.k.)': 'UK',
      'london': 'UK',
      'toronto': 'Canada',
      'vancouver': 'Canada',
      'montreal': 'Canada',
      'sydney': 'Australia',
      'melbourne': 'Australia',
      'zurich': 'Switzerland',
      'beijing': 'China',
      'shanghai': 'China',
      'hong kong': 'Hong Kong',
      'singapore': 'Singapore',
      'tokyo': 'Japan',
      'munich': 'Germany',
      'berlin': 'Germany',
      'paris': 'France',
      'stockholm': 'Sweden'
    };
    
    // Direct mapping
    if (countryMappings[country]) {
      return countryMappings[country];
    }
    
    // Case-insensitive mapping
    const lowerCountry = country.toLowerCase();
    if (countryMappings[lowerCountry]) {
      return countryMappings[lowerCountry];
    }
    
    return country;
  }

  /**
   * Normalize university name using basic cleaning
   */
  static normalizeUniversityName(name) {
    if (!name || typeof name !== 'string') return '';
    
    // Apply basic cleaning similar to existing logic
    const basicRules = [
      'stringValidation',
      'diacriticsRemoval',
      'thePrefixRemoval',
      'parentheticalRemoval',
      'whitespaceNormalization'
    ];
    
    return this.applyBasicTransformations(name, basicRules);
  }

  /**
   * Clean text for matching purposes
   * Based on existing basicCleanName function
   */
  static cleanForMatching(text) {
    if (!text || typeof text !== 'string') return '';
    
    let cleaned = text.toLowerCase();
    
    // Remove diacritics
    cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Remove "The" prefix
    cleaned = cleaned.replace(/^the\s+/, '');
    
    // Remove parenthetical content
    cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, '');
    
    // Remove location indicators
    cleaned = cleaned.replace(/\s*-\s*australia/g, '');
    cleaned = cleaned.replace(/\s*-\s*uk/g, '');
    
    // Remove institution types
    cleaned = cleaned.replace(/ university/g, '');
    cleaned = cleaned.replace(/ college/g, '');
    cleaned = cleaned.replace(/ institute/g, '');
    cleaned = cleaned.replace(/ of technology/g, '');
    cleaned = cleaned.replace(/ and/g, '');
    
    // Normalize whitespace and punctuation
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/[.,\-]/g, '');
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Generate transformation statistics
   */
  static generateTransformationStats(original, transformed, rules) {
    return {
      original: original,
      transformed: transformed,
      changed: original !== transformed,
      rulesApplied: rules ? rules.length : 0,
      length: {
        original: original ? original.length : 0,
        transformed: transformed ? transformed.length : 0
      }
    };
  }

  /**
   * Validate transformation result
   */
  static validateTransformation(result, minLength = 2, maxLength = 200) {
    if (!result || typeof result !== 'string') {
      return { valid: false, reason: 'Invalid result type' };
    }
    
    if (result.length < minLength) {
      return { valid: false, reason: `Result too short (${result.length} < ${minLength})` };
    }
    
    if (result.length > maxLength) {
      return { valid: false, reason: `Result too long (${result.length} > ${maxLength})` };
    }
    
    return { valid: true };
  }

  /**
   * Get battle-tested transformation patterns
   * These are the patterns identified from the existing analysis
   */
  static getBattleTestedPatterns() {
    return [
      {
        name: 'hyphenSpaces',
        type: 'regex_replace',
        pattern: ' - ',
        replacement: ' ',
        flags: 'g',
        frequency: 22,
        riskLevel: 'LOW',
        description: 'Replace hyphen with space in compound names'
      },
      {
        name: 'atPreposition',
        type: 'regex_replace',
        pattern: ' at ([A-Z])',
        replacement: ' $1',
        flags: 'g',
        frequency: 12,
        riskLevel: 'LOW',
        description: 'Remove "at" preposition from university names'
      },
      {
        name: 'medicalSciences',
        type: 'regex_replace',
        pattern: ' of Medical Sciences?',
        replacement: ' Medical Sciences',
        flags: 'g',
        frequency: 4,
        riskLevel: 'VERY_LOW',
        description: 'Standardize medical sciences naming'
      },
      {
        name: 'apostrophes',
        type: 'regex_replace',
        pattern: '\'',
        replacement: '',
        flags: 'g',
        frequency: 5,
        riskLevel: 'LOW',
        description: 'Remove apostrophes from university names'
      },
      {
        name: 'ampersand',
        type: 'regex_replace',
        pattern: ' and ',
        replacement: ' & ',
        flags: 'g',
        frequency: 8,
        riskLevel: 'LOW',
        description: 'Standardize "and" to ampersand'
      }
    ];
  }

  /**
   * Apply QS-specific transformations
   * Based on convert-qs-2026-to-csv.js analysis
   */
  static applyQSSpecificTransformations(name) {
    if (!name || typeof name !== 'string') return name;
    
    // QS exact mappings from analysis
    const qsExactMappings = {
      'Massachusetts Institute of Technology (MIT)': 'Massachusetts Institute of Technology - MIT',
      'ETH Zurich (Swiss Federal Institute of Technology)': 'Swiss Federal Institute of Technology Zurich - ETHZ',
      'UCL (University College London)': 'University College London',
      'California Institute of Technology (Caltech)': 'California Institute of Technology - Caltech',
      'École Polytechnique Fédérale de Lausanne (EPFL)': 'Swiss Federal Institute of Technology Lausanne - EPFL'
    };
    
    // Check exact mappings first
    if (qsExactMappings[name]) {
      return qsExactMappings[name];
    }
    
    let transformed = name;
    
    // Remove "The" prefix for specific universities
    const theRemovalList = [
      'The University of Hong Kong',
      'The University of Melbourne',
      'The University of Sydney',
      'The University of Edinburgh'
    ];
    
    if (theRemovalList.includes(name)) {
      transformed = name.replace(/^The /, '');
    }
    
    // Remove acronyms in parentheses at end
    transformed = transformed.replace(/ \([A-Z]{2,}\)$/, '');
    
    // Replace commas with hyphens
    transformed = transformed.replace(/,/g, ' -');
    
    return transformed;
  }
}

module.exports = TransformationUtils;
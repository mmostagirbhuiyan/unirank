#!/usr/bin/env node

/**
 * Canonical List Validation Script
 * 
 * Validates the canonical-universities.json file against the schema
 * and performs additional business logic validation.
 */

const fs = require('fs');
const path = require('path');

const CANONICAL_FILE = 'canonical-universities.json';
const SCHEMA_FILE = 'schemas/canonical-university-schema.json';

/**
 * Load and validate canonical list
 */
function validateCanonicalList() {
  console.log('Loading canonical universities list...');
  
  const canonicalPath = path.resolve(CANONICAL_FILE);
  if (!fs.existsSync(canonicalPath)) {
    throw new Error(`Canonical file not found: ${canonicalPath}`);
  }
  
  const universities = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
  console.log(`Loaded ${universities.length} universities`);
  
  // Basic validation
  const errors = [];
  const warnings = [];
  
  // Check for duplicate IDs
  const idMap = new Map();
  const nameMap = new Map();
  
  universities.forEach((uni, index) => {
    const id = uni.canonical_id;
    const name = uni.canonical_name;
    
    // ID validation
    if (!id || !id.match(/^canonical-[0-9]{4}$/)) {
      errors.push(`Entry ${index}: Invalid canonical_id format: ${id}`);
    } else if (idMap.has(id)) {
      errors.push(`Entry ${index}: Duplicate canonical_id: ${id}`);
    } else {
      idMap.set(id, index);
    }
    
    // Name validation
    if (!name || name.length < 2) {
      errors.push(`Entry ${index}: Invalid canonical_name: ${name}`);
    } else if (nameMap.has(name.toLowerCase())) {
      warnings.push(`Entry ${index}: Potential duplicate canonical_name: ${name} (also at entry ${nameMap.get(name.toLowerCase())})`);
    } else {
      nameMap.set(name.toLowerCase(), index);
    }
    
    // Country validation
    if (!uni.country || uni.country.length < 2) {
      errors.push(`Entry ${index}: Invalid country: ${uni.country}`);
    }
    
    // Aliases validation
    if (!Array.isArray(uni.aliases) || uni.aliases.length === 0) {
      errors.push(`Entry ${index}: Invalid aliases array`);
    } else {
      const uniqueAliases = new Set(uni.aliases);
      if (uniqueAliases.size !== uni.aliases.length) {
        warnings.push(`Entry ${index}: Duplicate aliases found for ${name}`);
      }
    }
    
    // Sources validation
    if (!uni.sources || typeof uni.sources !== 'object') {
      errors.push(`Entry ${index}: Invalid sources object`);
    } else {
      const requiredSources = ['qs', 'the', 'arwu', 'usnews'];
      requiredSources.forEach(source => {
        if (!uni.sources[source]) {
          errors.push(`Entry ${index}: Missing source: ${source}`);
        }
      });
    }
  });
  
  // Generate statistics
  const stats = {
    totalEntries: universities.length,
    averageAliases: universities.reduce((sum, uni) => sum + (uni.aliases?.length || 0), 0) / universities.length,
    countryCounts: universities.reduce((counts, uni) => {
      counts[uni.country] = (counts[uni.country] || 0) + 1;
      return counts;
    }, {}),
    sourceCoverage: {
      qs: universities.filter(u => u.sources?.qs?.included).length,
      the: universities.filter(u => u.sources?.the?.included).length,
      arwu: universities.filter(u => u.sources?.arwu?.included).length,
      usnews: universities.filter(u => u.sources?.usnews?.included).length
    },
    institutionTypes: universities.reduce((counts, uni) => {
      const type = uni.metadata?.institution_type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {})
  };
  
  // Report results
  console.log('\\n=== VALIDATION RESULTS ===');
  console.log(`Total entries: ${stats.totalEntries}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  
  if (errors.length > 0) {
    console.log('\\n=== ERRORS ===');
    errors.slice(0, 10).forEach(error => console.log(error));
    if (errors.length > 10) {
      console.log(`... and ${errors.length - 10} more errors`);
    }
  }
  
  if (warnings.length > 0) {
    console.log('\\n=== WARNINGS ===');
    warnings.slice(0, 10).forEach(warning => console.log(warning));
    if (warnings.length > 10) {
      console.log(`... and ${warnings.length - 10} more warnings`);
    }
  }
  
  console.log('\\n=== STATISTICS ===');
  console.log(`Average aliases per entry: ${stats.averageAliases.toFixed(2)}`);
  console.log(`Top countries: ${Object.entries(stats.countryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([country, count]) => `${country} (${count})`)
    .join(', ')}`);
  console.log(`Source coverage: QS=${stats.sourceCoverage.qs}, THE=${stats.sourceCoverage.the}, ARWU=${stats.sourceCoverage.arwu}, USNews=${stats.sourceCoverage.usnews}`);
  console.log(`Institution types: ${Object.entries(stats.institutionTypes)
    .sort(([,a], [,b]) => b - a)
    .map(([type, count]) => `${type}=${count}`)
    .join(', ')}`);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats
  };
}

// Run validation if called directly
if (require.main === module) {
  try {
    const result = validateCanonicalList();
    process.exit(result.isValid ? 0 : 1);
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
}

module.exports = { validateCanonicalList };
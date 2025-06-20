#!/usr/bin/env node

/**
 * Canonical Master List Seed Creation Script
 * 
 * This script creates the initial canonical university master list by transforming
 * existing manual mapping data and aggregated rankings data into the V2 canonical format.
 * 
 * Input Sources:
 * - frontend/public/data/manual-university-mapping.json
 * - frontend/public/data/aggregated-rankings.json 
 * 
 * Output:
 * - canonical-universities.json (in project root)
 * 
 * Usage: node v2-pipeline/seed-canonical-list.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  inputFiles: {
    manualMappings: 'frontend/public/data/manual-university-mapping.json',
    aggregatedRankings: 'frontend/public/data/aggregated-rankings.json'
  },
  outputFile: 'canonical-universities.json',
  schemaFile: 'schemas/canonical-university-schema.json'
};

// Country standardization mapping (from existing analysis)
const COUNTRY_STANDARDIZATION = {
  'United States': 'USA',
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
  'Macedonia, the former Yugoslav Republic of': 'North Macedonia'
};

/**
 * Standardize country name using mapping
 */
function standardizeCountry(country) {
  if (!country) return 'Unknown';
  return COUNTRY_STANDARDIZATION[country] || country;
}

/**
 * Generate canonical ID in format canonical-NNNN
 */
function generateCanonicalId(index) {
  return `canonical-${String(index).padStart(4, '0')}`;
}

/**
 * Clean and normalize university name
 */
function cleanUniversityName(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .trim()
    .replace(/\\s+/g, ' ') // Normalize whitespace
    .replace(/^The\\s+/i, '') // Remove "The" prefix for consistency
    .replace(/\\s*\\([^)]*\\)\\s*/g, '') // Remove parenthetical content for canonical name
    .trim();
}

/**
 * Generate aliases from university name and mapping data
 */
function generateAliases(canonicalName, originalName, suggestedName) {
  const aliases = new Set();
  
  // Always include the canonical name itself
  aliases.add(canonicalName);
  
  // Add original name if different
  if (originalName && originalName !== canonicalName) {
    aliases.add(originalName);
  }
  
  // Add suggested standardized name if different
  if (suggestedName && suggestedName !== canonicalName) {
    aliases.add(suggestedName);
  }
  
  // Add common variations
  const withoutThe = canonicalName.replace(/^The\\s+/i, '');
  const withThe = `The ${withoutThe}`;
  
  if (withoutThe !== canonicalName) aliases.add(withoutThe);
  if (withThe !== canonicalName && !canonicalName.startsWith('The ')) aliases.add(withThe);
  
  // Add variations with punctuation
  aliases.add(canonicalName.replace(/&/g, 'and'));
  aliases.add(canonicalName.replace(/\\band\\b/g, '&'));
  
  // Convert to array and filter out empty strings
  return Array.from(aliases).filter(alias => alias && alias.trim().length > 0);
}

/**
 * Infer country from university name patterns
 */
function inferCountryFromName(name) {
  if (!name) return 'Unknown';
  
  const nameUpper = name.toUpperCase();
  
  // Common patterns for country inference
  if (nameUpper.includes('MASSACHUSETTS') || nameUpper.includes('MIT') || 
      nameUpper.includes('HARVARD') || nameUpper.includes('STANFORD')) {
    return 'USA';
  }
  
  if (nameUpper.includes('CAMBRIDGE') || nameUpper.includes('OXFORD') || 
      nameUpper.includes('LONDON')) {
    return 'UK';
  }
  
  if (nameUpper.includes('BEIJING') || nameUpper.includes('SHANGHAI') || 
      nameUpper.includes('TSINGHUA')) {
    return 'China';
  }
  
  if (nameUpper.includes('TOKYO') || nameUpper.includes('KYOTO') || 
      nameUpper.includes('OSAKA')) {
    return 'Japan';
  }
  
  return 'Unknown';
}

/**
 * Determine institution type from name
 */
function inferInstitutionType(name) {
  if (!name) return 'university';
  
  const nameUpper = name.toUpperCase();
  
  if (nameUpper.includes('INSTITUTE') || nameUpper.includes('TECHNOLOGY')) {
    return 'institute';
  }
  
  if (nameUpper.includes('COLLEGE')) {
    return 'college';
  }
  
  if (nameUpper.includes('SCHOOL')) {
    return 'school';
  }
  
  if (nameUpper.includes('ACADEMY')) {
    return 'academy';
  }
  
  return 'university';
}

/**
 * Determine specializations from name
 */
function inferSpecializations(name) {
  if (!name) return ['comprehensive'];
  
  const nameUpper = name.toUpperCase();
  const specializations = [];
  
  if (nameUpper.includes('TECHNOLOGY') || nameUpper.includes('TECHNICAL') || 
      nameUpper.includes('INSTITUTE') || nameUpper.includes('MIT')) {
    specializations.push('technology', 'engineering');
  }
  
  if (nameUpper.includes('MEDICAL') || nameUpper.includes('MEDICINE')) {
    specializations.push('medicine');
  }
  
  if (nameUpper.includes('BUSINESS') || nameUpper.includes('ECONOMICS')) {
    specializations.push('business');
  }
  
  if (nameUpper.includes('ARTS') || nameUpper.includes('MUSIC')) {
    specializations.push('arts');
  }
  
  if (nameUpper.includes('SCIENCE') || nameUpper.includes('RESEARCH')) {
    specializations.push('sciences');
  }
  
  if (nameUpper.includes('LAW')) {
    specializations.push('law');
  }
  
  if (nameUpper.includes('EDUCATION')) {
    specializations.push('education');
  }
  
  if (nameUpper.includes('AGRICULTURE') || nameUpper.includes('AGRICULTURAL')) {
    specializations.push('agriculture');
  }
  
  return specializations.length > 0 ? specializations : ['comprehensive'];
}

/**
 * Load and validate input files
 */
function loadInputFiles() {
  console.log('Loading input files...');
  
  const manualMappingsPath = path.resolve(CONFIG.inputFiles.manualMappings);
  const aggregatedRankingsPath = path.resolve(CONFIG.inputFiles.aggregatedRankings);
  
  if (!fs.existsSync(manualMappingsPath)) {
    throw new Error(`Manual mappings file not found: ${manualMappingsPath}`);
  }
  
  if (!fs.existsSync(aggregatedRankingsPath)) {
    throw new Error(`Aggregated rankings file not found: ${aggregatedRankingsPath}`);
  }
  
  const manualMappings = JSON.parse(fs.readFileSync(manualMappingsPath, 'utf8'));
  const aggregatedRankings = JSON.parse(fs.readFileSync(aggregatedRankingsPath, 'utf8'));
  
  console.log(`Loaded ${manualMappings.length} manual mappings`);
  console.log(`Loaded ${aggregatedRankings.length} aggregated rankings`);
  
  return { manualMappings, aggregatedRankings };
}

/**
 * Create canonical entry from data
 */
function createCanonicalEntry(index, name, country, aliases, metadata = {}) {
  const now = new Date().toISOString();
  
  return {
    canonical_id: generateCanonicalId(index),
    canonical_name: name,
    country: standardizeCountry(country),
    aliases: aliases,
    metadata: {
      institution_type: metadata.institution_type || inferInstitutionType(name),
      specializations: metadata.specializations || inferSpecializations(name),
      ...metadata
    },
    sources: {
      qs: { included: false },
      the: { included: false },
      arwu: { included: false },
      usnews: { included: false }
    },
    created_date: now,
    updated_date: now,
    version: '1.0.0',
    confidence_score: 1.0
  };
}

/**
 * Update source information based on aggregated rankings
 */
function updateSourceInformation(canonicalEntries, aggregatedRankings) {
  console.log('Updating source information from aggregated rankings...');
  
  // Create lookup map for canonical entries by name variations
  const nameLookup = new Map();
  
  canonicalEntries.forEach((entry, index) => {
    entry.aliases.forEach(alias => {
      const normalizedAlias = alias.toLowerCase().trim();
      if (!nameLookup.has(normalizedAlias)) {
        nameLookup.set(normalizedAlias, []);
      }
      nameLookup.get(normalizedAlias).push(index);
    });
  });
  
  // Update source information
  let matchedCount = 0;
  let unmatchedCount = 0;
  
  aggregatedRankings.forEach(ranking => {
    const normalizedName = ranking.name.toLowerCase().trim();
    const matches = nameLookup.get(normalizedName);
    
    if (matches && matches.length > 0) {
      const entryIndex = matches[0]; // Use first match
      const entry = canonicalEntries[entryIndex];
      
      // Update source information
      Object.keys(ranking.originalRankings || {}).forEach(source => {
        if (entry.sources[source]) {
          entry.sources[source].included = true;
          
          const rank = ranking.originalRankings[source].rank;
          if (rank && (!entry.sources[source].best_rank || rank < entry.sources[source].best_rank)) {
            entry.sources[source].best_rank = rank;
          }
          
          // Add current year to years_included
          if (!entry.sources[source].years_included) {
            entry.sources[source].years_included = [];
          }
          const currentYear = new Date().getFullYear();
          if (!entry.sources[source].years_included.includes(currentYear)) {
            entry.sources[source].years_included.push(currentYear);
          }
        }
      });
      
      matchedCount++;
    } else {
      unmatchedCount++;
      console.log(`Warning: No canonical match found for: ${ranking.name}`);
    }
  });
  
  console.log(`Updated source information: ${matchedCount} matched, ${unmatchedCount} unmatched`);
  return canonicalEntries;
}

/**
 * Validate canonical entry against schema
 */
function validateEntry(entry) {
  // Basic validation (full JSON schema validation would require additional libraries)
  const errors = [];
  
  if (!entry.canonical_id || !entry.canonical_id.match(/^canonical-[0-9]{4}$/)) {
    errors.push('Invalid canonical_id format');
  }
  
  if (!entry.canonical_name || entry.canonical_name.length < 2) {
    errors.push('Invalid canonical_name');
  }
  
  if (!entry.country || entry.country.length < 2) {
    errors.push('Invalid country');
  }
  
  if (!Array.isArray(entry.aliases) || entry.aliases.length === 0) {
    errors.push('Invalid aliases array');
  }
  
  return errors;
}

/**
 * Main transformation function
 */
function createCanonicalMasterList() {
  try {
    console.log('Starting canonical master list creation...');
    
    // Load input data
    const { manualMappings, aggregatedRankings } = loadInputFiles();
    
    // Create university map to avoid duplicates
    const universityMap = new Map();
    let canonicalEntries = [];
    let index = 1;
    
    console.log('Processing manual mappings...');
    
    // Process manual mappings first
    manualMappings.forEach(mapping => {
      const canonicalName = cleanUniversityName(mapping.suggestedStandardizedName);
      const originalName = mapping.originalName;
      
      if (!canonicalName) {
        console.warn(`Skipping mapping with empty canonical name: ${originalName}`);
        return;
      }
      
      // Use canonical name as key to detect duplicates
      const key = canonicalName.toLowerCase().trim();
      
      if (universityMap.has(key)) {
        // Add original name as alias to existing entry
        const existingEntry = universityMap.get(key);
        if (originalName && !existingEntry.aliases.includes(originalName)) {
          existingEntry.aliases.push(originalName);
        }
        console.log(`Merged duplicate: ${originalName} -> ${canonicalName}`);
      } else {
        // Create new canonical entry
        const aliases = generateAliases(canonicalName, originalName, mapping.suggestedStandardizedName);
        const country = inferCountryFromName(canonicalName);
        
        const entry = createCanonicalEntry(index++, canonicalName, country, aliases);
        
        canonicalEntries.push(entry);
        universityMap.set(key, entry);
      }
    });
    
    console.log('Processing aggregated rankings for additional universities...');
    
    // Process aggregated rankings to find universities not in manual mappings
    aggregatedRankings.forEach(ranking => {
      const canonicalName = cleanUniversityName(ranking.name);
      const key = canonicalName.toLowerCase().trim();
      
      if (!universityMap.has(key) && canonicalName) {
        // New university not in manual mappings
        const aliases = generateAliases(canonicalName, ranking.name);
        const country = standardizeCountry(ranking.country) || inferCountryFromName(canonicalName);
        
        const entry = createCanonicalEntry(index++, canonicalName, country, aliases);
        
        canonicalEntries.push(entry);
        universityMap.set(key, entry);
        
        console.log(`Added from aggregated data: ${canonicalName}`);
      }
    });
    
    // Update source information
    canonicalEntries = updateSourceInformation(canonicalEntries, aggregatedRankings);
    
    // Sort by canonical_id for consistency
    canonicalEntries.sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
    
    console.log(`Created ${canonicalEntries.length} canonical university entries`);
    
    // Validate entries
    console.log('Validating entries...');
    let validationErrors = 0;
    canonicalEntries.forEach(entry => {
      const errors = validateEntry(entry);
      if (errors.length > 0) {
        console.error(`Validation errors for ${entry.canonical_id}: ${errors.join(', ')}`);
        validationErrors++;
      }
    });
    
    if (validationErrors > 0) {
      console.warn(`Found ${validationErrors} validation errors`);
    } else {
      console.log('All entries passed validation');
    }
    
    // Write output file
    const outputPath = path.resolve(CONFIG.outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(canonicalEntries, null, 2), 'utf8');
    
    console.log(`Successfully created canonical master list: ${outputPath}`);
    
    // Generate statistics
    const stats = {
      totalEntries: canonicalEntries.length,
      averageAliases: canonicalEntries.reduce((sum, entry) => sum + entry.aliases.length, 0) / canonicalEntries.length,
      countryCounts: canonicalEntries.reduce((counts, entry) => {
        counts[entry.country] = (counts[entry.country] || 0) + 1;
        return counts;
      }, {}),
      sourceCoverage: {
        qs: canonicalEntries.filter(e => e.sources.qs.included).length,
        the: canonicalEntries.filter(e => e.sources.the.included).length,
        arwu: canonicalEntries.filter(e => e.sources.arwu.included).length,
        usnews: canonicalEntries.filter(e => e.sources.usnews.included).length
      }
    };
    
    console.log('\\nStatistics:');
    console.log(`Total entries: ${stats.totalEntries}`);
    console.log(`Average aliases per entry: ${stats.averageAliases.toFixed(2)}`);
    console.log(`Top countries: ${Object.entries(stats.countryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([country, count]) => `${country} (${count})`)
      .join(', ')}`);
    console.log(`Source coverage: QS=${stats.sourceCoverage.qs}, THE=${stats.sourceCoverage.the}, ARWU=${stats.sourceCoverage.arwu}, USNews=${stats.sourceCoverage.usnews}`);
    
    return canonicalEntries;
    
  } catch (error) {
    console.error('Error creating canonical master list:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  createCanonicalMasterList();
}

module.exports = { createCanonicalMasterList };
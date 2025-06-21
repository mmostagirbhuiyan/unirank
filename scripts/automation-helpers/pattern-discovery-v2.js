#!/usr/bin/env node

/**
 * Pattern Discovery Helper v2
 * 
 * Analyzes manual university mappings against FINAL AGGREGATED DATA (like suggest script)
 * to identify genuine automation opportunities that aren't already handled.
 * Works on final aggregated data to see what actually needs manual intervention.
 */

const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity');

// Configuration
const CONFIG = {
    minFrequency: 3,           // Minimum occurrences to consider
    riskThresholds: {
        veryLow: 0.95,        // Very specific patterns
        low: 0.85,            // Common patterns
        medium: 0.70          // Context-dependent patterns
    }
};

console.log('🔍 UNIVERSITY NAME PATTERN DISCOVERY TOOL v2 (Final Data Analysis)');
console.log('=' .repeat(75));

async function analyzeFullPipeline() {
    console.log('📊 Loading final aggregated data (like suggest script)...\n');
    
    // Load manual mappings
    const mappingsPath = path.resolve(__dirname, '../../frontend/public/data/manual-university-mapping.json');
    const manualMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    
    // Load aggregated data to see what the current system produces
    const aggregatedPath = path.resolve(__dirname, '../../frontend/public/data/aggregated-rankings.json');
    const aggregatedData = JSON.parse(fs.readFileSync(aggregatedPath, 'utf8'));
    
    console.log(`📋 Analyzing ${manualMappings.length} manual mappings against ${aggregatedData.length} final universities...\n`);
    
    return { manualMappings, aggregatedData };
}

function analyzeManualMappingsAgainstFinalData(manualMappings, aggregatedData) {
    console.log('🧪 Testing if manual mappings are actually needed in final data...\n');
    
    // Create a map of university names in the final aggregated data
    const finalUniversities = new Map();
    aggregatedData.forEach(uni => {
        finalUniversities.set(uni.name.toLowerCase(), uni);
    });
    
    const results = {
        stillNeeded: [],
        potentiallyRedundant: [],
        duplicatesFound: []
    };
    
    for (const mapping of manualMappings) {
        const originalLower = mapping.originalName.toLowerCase();
        const suggestedLower = mapping.suggestedStandardizedName.toLowerCase();
        
        // Check if both names appear in final data (indicating mapping might not be working)
        const originalExists = finalUniversities.has(originalLower);
        const suggestedExists = finalUniversities.has(suggestedLower);
        
        if (originalExists && suggestedExists) {
            // Both exist - this suggests the mapping isn't working properly
            // This is a potential duplicate in final data that needs the manual mapping
            results.duplicatesFound.push({
                ...mapping,
                reason: 'Both original and suggested names exist in final data - potential duplicate',
                status: 'duplicate_detected',
                similarity: stringSimilarity.compareTwoStrings(originalLower, suggestedLower) * 100
            });
        } else if (!originalExists && suggestedExists) {
            // Original doesn't exist, suggested does - mapping is working
            results.potentiallyRedundant.push({
                ...mapping,
                reason: 'Mapping appears to be working (original name not in final data)',
                status: 'working'
            });
        } else if (originalExists && !suggestedExists) {
            // Original exists, suggested doesn't - mapping not applied
            results.stillNeeded.push({
                ...mapping,
                reason: 'Original name exists but suggested name doesn\'t - mapping not applied',
                status: 'needed'
            });
        } else {
            // Neither exists - unclear status, might be handled by intermediate processing
            results.potentiallyRedundant.push({
                ...mapping,
                reason: 'Neither name found in final data - possibly handled by pipeline',
                status: 'unclear'
            });
        }
    }
    
    return results;
}

function findAutomationPatterns(duplicatesFound) {
    console.log('🔍 Analyzing patterns in cases where duplicates were found...\n');
    
    // Pattern detection functions
    const patterns = {
        hyphenToSpace: {
            name: 'Hyphen to Space Normalization',
            risk: 'LOW',
            test: (orig, sugg) => {
                const normalized = orig.replace(/-/g, ' ').replace(/\\s+/g, ' ').trim();
                return normalized.toLowerCase() === sugg.toLowerCase().trim();
            },
            implementation: 'cleaned = cleaned.replace(/-/g, " ").replace(/\\s+/g, " ").trim();',
            description: 'Replace hyphens with spaces'
        },
        
        andAmpersand: {
            name: 'And/Ampersand Standardization', 
            risk: 'LOW',
            test: (orig, sugg) => {
                const withAmpersand = orig.replace(/ and /g, ' & ');
                const withAnd = orig.replace(/ & /g, ' and ');
                return sugg.toLowerCase() === withAmpersand.toLowerCase() || 
                       sugg.toLowerCase() === withAnd.toLowerCase();
            },
            implementation: 'cleaned = cleaned.replace(/ and /g, " & ");',
            description: 'Standardize "and" to "&" or vice versa'
        },
        
        ofPrepositionRemoval: {
            name: 'Of Preposition Removal',
            risk: 'MEDIUM',
            test: (orig, sugg) => {
                // Check if removing " of " from original gives suggested
                const withoutOf = orig.replace(/\\s+of\\s+/gi, ' ').replace(/\\s+/g, ' ').trim();
                return withoutOf.toLowerCase() === sugg.toLowerCase();
            },
            implementation: '// Requires careful analysis - context dependent',
            description: 'Remove "of" preposition from university names'
        },
        
        thePrefix: {
            name: 'The Prefix Removal',
            risk: 'LOW',
            test: (orig, sugg) => {
                return orig.toLowerCase().startsWith('the ') && 
                       sugg.toLowerCase() === orig.substring(4).toLowerCase();
            },
            implementation: 'cleaned = cleaned.replace(/^The /, "");',
            description: 'Remove "The" prefix from university names'
        },
        
        diacriticsRemoval: {
            name: 'Diacritics Normalization',
            risk: 'VERY_LOW',
            test: (orig, sugg) => {
                const normalized = orig.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
                return normalized.toLowerCase() === sugg.toLowerCase();
            },
            implementation: 'cleaned = cleaned.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");',
            description: 'Remove diacritics and accents'
        },
        
        locationSuffixRemoval: {
            name: 'Location Suffix Removal',
            risk: 'MEDIUM',
            test: (orig, sugg) => {
                // Check for patterns like "University - Country" or "University Country"
                const countries = ['China', 'USA', 'UK', 'Canada', 'Australia', 'Germany', 'Taiwan', 'Qatar'];
                for (const country of countries) {
                    const pattern1 = new RegExp(`\\\\s*-\\\\s*${country}$`, 'i');
                    const pattern2 = new RegExp(`\\\\s+${country}$`, 'i');
                    if ((pattern1.test(orig) || pattern2.test(orig)) && 
                        sugg.toLowerCase() === orig.replace(pattern1, '').replace(pattern2, '').trim().toLowerCase()) {
                        return true;
                    }
                }
                return false;
            },
            implementation: '// Manual review required - geographic context sensitive',
            description: 'Remove country/location suffixes'
        },
        
        universityPositionNormalization: {
            name: 'University Position Normalization',
            risk: 'HIGH',
            test: (orig, sugg) => {
                // Check if this involves moving "University" to different position
                const origWords = orig.toLowerCase().split(/\\s+/);
                const suggWords = sugg.toLowerCase().split(/\\s+/);
                const hasUniversity = origWords.includes('university') && suggWords.includes('university');
                return hasUniversity && origWords.sort().join(' ') === suggWords.sort().join(' ');
            },
            implementation: '// Very high risk - requires extensive testing',
            description: 'Normalize position of "University" in names'
        }
    };
    
    const patternResults = {};
    
    // Initialize pattern counters
    Object.keys(patterns).forEach(key => {
        patternResults[key] = {
            ...patterns[key],
            matches: [],
            count: 0
        };
    });
    
    // Test each duplicate against all patterns
    duplicatesFound.forEach(duplicate => {
        Object.keys(patterns).forEach(patternKey => {
            const pattern = patterns[patternKey];
            if (pattern.test(duplicate.originalName, duplicate.suggestedStandardizedName)) {
                patternResults[patternKey].matches.push(duplicate);
                patternResults[patternKey].count++;
            }
        });
    });
    
    return patternResults;
}

function generateReport(manualMappings, analysisResults, patternResults) {
    console.log('📊 PATTERN DISCOVERY ANALYSIS RESULTS');
    console.log('=' .repeat(50));
    
    console.log('\\n🔍 MANUAL MAPPING STATUS:');
    console.log(`Total manual mappings: ${manualMappings.length}`);
    console.log(`Duplicates found in final data: ${analysisResults.duplicatesFound.length}`);
    console.log(`Potentially redundant: ${analysisResults.potentiallyRedundant.length}`);
    console.log(`Still needed: ${analysisResults.stillNeeded.length}`);
    
    if (analysisResults.duplicatesFound.length === 0) {
        console.log('\\n✅ EXCELLENT! No duplicates found in final data.');
        console.log('This means all manual mappings are working correctly.');
        console.log('No new automation patterns needed at this time.');
        return;
    }
    
    console.log(`\\n🚨 ATTENTION: ${analysisResults.duplicatesFound.length} cases found where both original and suggested names exist in final data.`);
    console.log('This indicates potential duplicates that manual mappings should be handling.\\n');
    
    // Show actionable patterns
    console.log('🎯 ACTIONABLE PATTERNS (≥3 occurrences):');
    console.log('=' .repeat(50));
    
    const actionablePatterns = Object.entries(patternResults)
        .filter(([_, pattern]) => pattern.count >= CONFIG.minFrequency)
        .sort((a, b) => b[1].count - a[1].count);
    
    if (actionablePatterns.length === 0) {
        console.log('❌ No patterns with ≥3 occurrences found.');
        console.log('Consider manual review of the duplicates found.');
    } else {
        actionablePatterns.forEach(([key, pattern]) => {
            const riskColor = pattern.risk === 'LOW' ? '🟢' : 
                             pattern.risk === 'MEDIUM' ? '🟡' : 
                             pattern.risk === 'HIGH' ? '🔴' : '🟢';
            
            console.log(`\\n${riskColor} ${pattern.name} (${pattern.risk} RISK)`);
            console.log(`   Count: ${pattern.count} mappings`);
            console.log(`   Description: ${pattern.description}`);
            console.log(`   Implementation: ${pattern.implementation}`);
            console.log(`   Examples:`);
            
            pattern.matches.slice(0, 5).forEach((match, i) => {
                console.log(`   ${i + 1}. "${match.originalName}" → "${match.suggestedStandardizedName}"`);
            });
            
            if (pattern.matches.length > 5) {
                console.log(`   ... and ${pattern.matches.length - 5} more`);
            }
        });
    }
    
    // Show top duplicates that need attention
    console.log('\\n🔍 TOP DUPLICATES NEEDING ATTENTION:');
    console.log('=' .repeat(40));
    
    analysisResults.duplicatesFound
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)
        .forEach((duplicate, i) => {
            console.log(`\\n${i + 1}. Similarity: ${duplicate.similarity.toFixed(1)}%`);
            console.log(`   Original: "${duplicate.originalName}"`);
            console.log(`   Suggested: "${duplicate.suggestedStandardizedName}"`);
            console.log(`   Status: ${duplicate.reason}`);
        });
    
    if (analysisResults.duplicatesFound.length > 10) {
        console.log(`\\n... and ${analysisResults.duplicatesFound.length - 10} more duplicates`);
    }
    
    console.log('\\n🚀 NEXT STEPS:');
    console.log('1. Review the actionable patterns above');
    console.log('2. Start with LOW RISK patterns first');
    console.log('3. Use pattern-tester.js to validate before implementing');
    console.log('4. Consider manual review for cases without clear patterns');
}

async function main() {
    try {
        const { manualMappings, aggregatedData } = await analyzeFullPipeline();
        
        const analysisResults = analyzeManualMappingsAgainstFinalData(manualMappings, aggregatedData);
        
        const patternResults = findAutomationPatterns(analysisResults.duplicatesFound);
        
        generateReport(manualMappings, analysisResults, patternResults);
        
    } catch (error) {
        console.error('❌ Error during pattern discovery:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the analysis
if (require.main === module) {
    main();
}

module.exports = { main };
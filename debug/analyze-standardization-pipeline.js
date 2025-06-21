#!/usr/bin/env node

/**
 * Comprehensive analysis of the standardization pipeline
 * 
 * This script will:
 * 1. Trace the exact flow through standardizeUniversityName()
 * 2. Test manual mapping loading and application
 * 3. Verify the interaction between canonicalization and manual mappings
 * 4. Test real examples to understand where issues occur
 * 5. Provide detailed analysis for achieving 100% data integrity
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const stringSimilarity = require('string-similarity');

// Copy the exact canonicalizeName function from scrape-rankings.js
function canonicalizeName(name) {
    if (!name) return '';
    let cleaned = name.trim();
    // Normalize to NFD and strip diacritics to avoid mismatched accents
    cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Remove unknown replacement characters that often appear from bad encoding
    cleaned = cleaned.replace(/\uFFFD/g, '');
    // Drop stray question marks or unrecognized punctuation
    cleaned = cleaned.replace(/[?]/g, '');
    // Standardize various dash characters to a simple hyphen
    cleaned = cleaned.replace(/[–—−]/g, '-');
    // Remove parenthetical notes
    cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, '');
    // Remove trailing short tokens like "- MIT" while keeping campus names
    cleaned = cleaned.replace(/\s*-\s*[A-Za-z.&]{1,5}$/, '');
    // Remove campus designations at the end
    cleaned = cleaned.replace(/\s*-?\s*(?:main|city|west|east|north|south)?\s*\w*\s*campus$/i, '');
    cleaned = cleaned.replace(/\s*-\s*/g, ' ');
    cleaned = cleaned.replace(/[.,]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    // Fix common encoding issues where 'ü' becomes 'u' is dropped entirely
    cleaned = cleaned.replace(/Mnchen/g, 'Munchen');
    cleaned = cleaned.trim();
        // At location removal automation (e.g., "University of Colorado at Boulder" -> "University of Colorado Boulder")
    cleaned = cleaned.replace(/^(.+) at (.+)$/, '$1 $2');
        // And to ampersand automation (e.g., "University of Science and Technology" -> "University of Science & Technology")
    cleaned = cleaned.replace(/ and /g, ' & ');
        // Hyphen to space automation (e.g., "University of Wisconsin-Madison" -> "University of Wisconsin Madison")
    cleaned = cleaned.replace(/-/g, ' ');
        // The prefix removal automation (e.g., "The University of Tokyo" -> "University of Tokyo")
    cleaned = cleaned.replace(/^The /, '');
        // Medical Sciences automation (e.g., "University of Medical Sciences" -> "University of Medical Science")
    cleaned = cleaned.replace(/Medical Sciences/g, 'Medical Science');
        // Medical University "of" removal automation (e.g., "Medical University of Graz" -> "Medical University Graz")
    cleaned = cleaned.replace(/^Medical University of (.+)$/i, 'Medical University $1');
        // UC system campus name automation (e.g., "University of California - Berkeley" -> "University of California Berkeley")
    cleaned = cleaned.replace(/^University of California - (.+)$/, 'University of California $1');
        // Of preposition normalization automation
    cleaned = cleaned.replace(/^(.*\bUniversity)\s([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)?)$/, '$1 of $2');
    cleaned = cleaned.replace(/University of Medical Science(s?)/, 'University Medical Science$1');
    cleaned = cleaned.replace(/(University .*?)University of ([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)?)$/, '$1University $2');
    return cleaned;
}

class StandardizationAnalyzer {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'frontend', 'public', 'data');
        this.manualMappings = new Map();
        this.usnewsNameMap = new Map();
        this.usnewsCleanList = [];
        this.universityStandardizationMap = new Map();
        
        // Test cases that we know have issues
        this.testCases = [
            { name: "University of Seville", source: "the" },
            { name: "Universidad de Sevilla", source: "qs" },
            { name: "Al Jouf University", source: "qs" },
            { name: "Jouf University", source: "the" },
            { name: "University of Hawaii Manoa", source: "usnews" },
            { name: "Bar-Ilan University", source: "qs" },
            { name: "Sun Yat-Sen University", source: "qs" }
        ];
    }
    
    async loadManualMappings() {
        console.log('📋 Loading manual mappings...');
        
        const manualMappingPath = path.join(this.dataDir, 'manual-university-mapping.json');
        const manualArray = JSON.parse(fs.readFileSync(manualMappingPath, 'utf8'));
        
        console.log(`   Loaded ${manualArray.length} manual mappings`);
        
        // Load mappings without source restriction (applies to any source)
        manualArray.forEach(item => {
            // Source-agnostic mappings (new format)
            this.manualMappings.set(item.originalName, item.suggestedStandardizedName);
            
            // Also add canonicalized version
            const canonicalized = canonicalizeName(item.originalName);
            if (canonicalized !== item.originalName) {
                this.manualMappings.set(canonicalized, item.suggestedStandardizedName);
            }
        });
        
        console.log(`   Total mapping entries (including canonicalized): ${this.manualMappings.size}`);
        
        // Debug: Show some mappings
        console.log('   Sample mappings:');
        let count = 0;
        for (const [key, value] of this.manualMappings) {
            if (count++ < 5) {
                console.log(`     "${key}" → "${value}"`);
            }
        }
    }
    
    async loadUSNewsNames() {
        console.log('📋 Loading US News names...');
        
        const filePath = path.join(this.dataDir, 'usnews_rankings.csv');
        return new Promise((resolve, reject) => {
            const map = new Map();
            const cleaned = [];
            createReadStream(filePath)
                .pipe(csv())
                .on('data', row => {
                    if (row.University) {
                        const orig = row.University.trim();
                        const clean = canonicalizeName(orig);
                        if (!map.has(clean)) {
                            map.set(clean, orig);
                            cleaned.push(clean);
                        }
                    }
                })
                .on('end', () => {
                    this.usnewsNameMap = map;
                    this.usnewsCleanList = cleaned;
                    console.log(`   Loaded ${map.size} canonical US News names.`);
                    resolve();
                })
                .on('error', reject);
        });
    }
    
    async loadAutoGeneratedMappings() {
        console.log('📋 Loading auto-generated mappings...');
        
        const mappingFilePath = path.join(this.dataDir, 'suggested-university-mapping.json');
        try {
            const data = fs.readFileSync(mappingFilePath, 'utf8');
            const mappingArray = JSON.parse(data);
            this.universityStandardizationMap = new Map(
                mappingArray.map(item => [`${item.originalName}@${item.source}`, item.suggestedStandardizedName])
            );
            console.log(`   Loaded ${this.universityStandardizationMap.size} auto-generated mapping entries.`);
        } catch (error) {
            console.log('   No auto-generated mappings found.');
        }
    }
    
    // Replicate the exact standardizeUniversityName function logic
    standardizeUniversityName(originalName, source) {
        const cleaned = canonicalizeName(originalName);
        
        console.log(`\n🔍 TRACING: "${originalName}" (${source})`);
        console.log(`   1. Canonicalized: "${cleaned}"`);
        
        // 1. US News names are already canonical - just clean them
        if (source === 'usnews') {
            const result = this.usnewsNameMap.get(cleaned) || originalName.trim();
            console.log(`   → US News path: "${result}"`);
            return result;
        }
        
        // 2. For non-US News sources, try source-agnostic manual mapping first
        if (this.manualMappings.has(originalName)) {
            const result = this.manualMappings.get(originalName);
            console.log(`   → Manual mapping (original): "${result}"`);
            return result;
        }
        
        if (this.manualMappings.has(cleaned)) {
            const result = this.manualMappings.get(cleaned);
            console.log(`   → Manual mapping (cleaned): "${result}"`);
            return result;
        }
        
        // 3. ENHANCED: Apply pattern-based transformations and fuzzy match
        if (this.usnewsCleanList.length > 0) {
            // Convert usnewsCleanList back to original names for matching
            const usnewsOriginalNames = Array.from(this.usnewsNameMap.values());
            // Simple similarity check (simplified for debugging)
            for (const targetName of usnewsOriginalNames) {
                const similarity = stringSimilarity.compareTwoStrings(
                    originalName.toLowerCase(), 
                    targetName.toLowerCase()
                );
                if (similarity >= 0.93) {
                    console.log(`   → Enhanced fuzzy match (${(similarity*100).toFixed(1)}%): "${targetName}"`);
                    return targetName;
                }
            }
        }
        
        // 4. Auto-generated mapping (legacy support)
        let key = `${originalName}@${source}`;
        if (this.universityStandardizationMap.has(key)) {
            const mapped = this.universityStandardizationMap.get(key);
            if (mapped && mapped !== originalName) {
                console.log(`   → Auto-generated mapping (original@source): "${mapped}"`);
                return mapped;
            }
        }
        
        key = `${cleaned}@${source}`;
        if (this.universityStandardizationMap.has(key)) {
            const mapped = this.universityStandardizationMap.get(key);
            if (mapped && mapped !== cleaned) {
                console.log(`   → Auto-generated mapping (cleaned@source): "${mapped}"`);
                return mapped;
            }
        }
        
        // 5. Fallback: return original name
        console.log(`   → Fallback (no mapping found): "${originalName.trim()}"`);
        return originalName.trim();
    }
    
    async testStandardization() {
        console.log('\n🧪 TESTING STANDARDIZATION WITH REAL EXAMPLES');
        console.log('=' .repeat(60));
        
        for (const testCase of this.testCases) {
            const result = this.standardizeUniversityName(testCase.name, testCase.source);
            console.log(`✅ Final result: "${result}"\n`);
        }
    }
    
    analyzeSourceVariations() {
        console.log('\n📊 ANALYZING SOURCE VARIATIONS FOR PROBLEM CASES');
        console.log('=' .repeat(60));
        
        // Check what variations exist in source data for our problem cases
        const problemCases = [
            'seville', 'sevilla', 
            'jouf', 'al jouf',
            'hawaii manoa',
            'bar-ilan', 'bar ilan'
        ];
        
        const sourceFiles = [
            { name: 'QS', file: 'qs_rankings.csv' },
            { name: 'THE', file: 'the_rankings.csv' },
            { name: 'ARWU', file: 'arwu_rankings.csv' },
            { name: 'US News', file: 'usnews_rankings.csv' }
        ];
        
        problemCases.forEach(searchTerm => {
            console.log(`\n🔍 Searching for "${searchTerm}":`);
            sourceFiles.forEach(({ name, file }) => {
                const filePath = path.join(this.dataDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const regex = new RegExp(`[^\\n]*${searchTerm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}[^\\n]*`, 'gi');
                    const matches = content.match(regex) || [];
                    
                    if (matches.length > 0) {
                        console.log(`   ${name}: ${matches.length} matches`);
                        matches.forEach(match => {
                            // Extract university name (assuming CSV format)
                            const parts = match.split(',');
                            if (parts.length >= 2) {
                                console.log(`     "${parts[1].trim()}"`);
                            }
                        });
                    } else {
                        console.log(`   ${name}: No matches`);
                    }
                } catch (error) {
                    console.log(`   ${name}: Could not read file`);
                }
            });
        });
    }
    
    analyzeFinalDataDuplicates() {
        console.log('\n📈 ANALYZING FINAL DATA FOR ACTUAL DUPLICATES');
        console.log('=' .repeat(60));
        
        const aggregatedPath = path.join(this.dataDir, 'aggregated-rankings.json');
        const aggregatedData = JSON.parse(fs.readFileSync(aggregatedPath, 'utf8'));
        
        console.log(`Total universities in final data: ${aggregatedData.length}`);
        
        // Find potential duplicates using similarity
        const potentialDuplicates = [];
        
        for (let i = 0; i < aggregatedData.length; i++) {
            for (let j = i + 1; j < aggregatedData.length; j++) {
                const uni1 = aggregatedData[i];
                const uni2 = aggregatedData[j];
                
                const similarity = stringSimilarity.compareTwoStrings(
                    uni1.name.toLowerCase(),
                    uni2.name.toLowerCase()
                );
                
                if (similarity >= 0.85) {
                    potentialDuplicates.push({
                        uni1: uni1.name,
                        uni2: uni2.name,
                        similarity: (similarity * 100).toFixed(1),
                        sources1: Object.keys(uni1.rankings || {}),
                        sources2: Object.keys(uni2.rankings || {})
                    });
                }
            }
        }
        
        console.log(`\nFound ${potentialDuplicates.length} potential duplicates (≥85% similarity):`);
        
        potentialDuplicates
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 20)
            .forEach((dup, i) => {
                console.log(`\n${i + 1}. Similarity: ${dup.similarity}%`);
                console.log(`   "${dup.uni1}" [${dup.sources1.join(', ')}]`);
                console.log(`   "${dup.uni2}" [${dup.sources2.join(', ')}]`);
                
                // Check if there's a manual mapping for this
                const hasMapping1 = this.manualMappings.has(dup.uni1);
                const hasMapping2 = this.manualMappings.has(dup.uni2);
                
                if (hasMapping1) {
                    console.log(`   📋 Manual mapping exists: "${dup.uni1}" → "${this.manualMappings.get(dup.uni1)}"`);
                }
                if (hasMapping2) {
                    console.log(`   📋 Manual mapping exists: "${dup.uni2}" → "${this.manualMappings.get(dup.uni2)}"`);
                }
                
                if (!hasMapping1 && !hasMapping2) {
                    console.log(`   ⚠️  No manual mapping found for either university`);
                }
            });
        
        return potentialDuplicates;
    }
    
    generateRecommendations(potentialDuplicates) {
        console.log('\n🎯 RECOMMENDATIONS FOR 100% DATA INTEGRITY');
        console.log('=' .repeat(60));
        
        console.log('\n1. 🔧 IMMEDIATE FIXES NEEDED:');
        
        // Find cases where manual mappings exist but duplicates still appear
        const mappingIssues = potentialDuplicates.filter(dup => {
            const hasMapping1 = this.manualMappings.has(dup.uni1);
            const hasMapping2 = this.manualMappings.has(dup.uni2);
            return hasMapping1 || hasMapping2;
        });
        
        if (mappingIssues.length > 0) {
            console.log(`   📋 ${mappingIssues.length} cases where manual mappings exist but duplicates persist`);
            console.log('   → ISSUE: Manual mappings may not be applied correctly');
            console.log('   → ACTION: Debug the standardization pipeline application');
        }
        
        // Find cases where no manual mapping exists
        const missingMappings = potentialDuplicates.filter(dup => {
            const hasMapping1 = this.manualMappings.has(dup.uni1);
            const hasMapping2 = this.manualMappings.has(dup.uni2);
            return !hasMapping1 && !hasMapping2;
        });
        
        if (missingMappings.length > 0) {
            console.log(`   📝 ${missingMappings.length} cases need new manual mappings`);
            console.log('   → ACTION: Create manual mappings for these duplicates');
        }
        
        console.log('\n2. 🎛️ PIPELINE IMPROVEMENTS:');
        console.log('   → Verify manual mapping loading order and priority');
        console.log('   → Test canonicalizeName vs manual mapping interaction');
        console.log('   → Consider source-specific vs source-agnostic mapping strategy');
        console.log('   → Add validation step to detect final data duplicates');
        
        console.log('\n3. 🧪 TESTING FRAMEWORK:');
        console.log('   → Create regression tests for each manual mapping');
        console.log('   → Add duplicate detection in the aggregation script');
        console.log('   → Implement similarity-based validation');
        
        console.log('\n4. 📊 MONITORING:');
        console.log('   → Track university count stability');
        console.log('   → Alert on new duplicates detected');
        console.log('   → Monitor manual mapping effectiveness');
    }
    
    async run() {
        console.log('🔍 COMPREHENSIVE STANDARDIZATION PIPELINE ANALYSIS');
        console.log('=' .repeat(70));
        
        try {
            await this.loadManualMappings();
            await this.loadUSNewsNames();
            await this.loadAutoGeneratedMappings();
            
            await this.testStandardization();
            
            this.analyzeSourceVariations();
            
            const potentialDuplicates = this.analyzeFinalDataDuplicates();
            
            this.generateRecommendations(potentialDuplicates);
            
        } catch (error) {
            console.error('❌ Error during analysis:', error);
            console.error(error.stack);
        }
    }
}

// Run the analysis
if (require.main === module) {
    const analyzer = new StandardizationAnalyzer();
    analyzer.run();
}

module.exports = StandardizationAnalyzer;
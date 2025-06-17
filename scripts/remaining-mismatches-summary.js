#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to normalize university names for comparison
function normalizeForComparison(name) {
    return name
        .toLowerCase()
        .replace(/[^\w\s&-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function generateRemainingMismatchesSummary() {
    console.log('=== REMAINING UNIVERSITY NAME MISMATCHES ANALYSIS ===\n');
    
    try {
        const dataPath = '/Users/mmostagirbhuiyan/Documents/university-ranking-aggregator/frontend/public/data';
        
        // Read all data files
        const aggregated = JSON.parse(fs.readFileSync(path.join(dataPath, 'aggregated-rankings.json'), 'utf8'));
        const manualMappings = JSON.parse(fs.readFileSync(path.join(dataPath, 'manual-university-mapping.json'), 'utf8'));
        
        // Get mapped names
        const mappedNames = new Set();
        manualMappings.forEach(mapping => {
            mappedNames.add(mapping.originalName.toLowerCase());
        });
        
        // Identify universities with incomplete coverage that could benefit from mapping
        const incompleteCoverage = aggregated.filter(uni => uni.appearances < 4);
        
        console.log(`Universities with incomplete coverage (appearing in <4 sources): ${incompleteCoverage.length}\n`);
        
        // Categorize potential mismatches by pattern
        const mismatchCategories = {
            stateUniversityVariations: [],
            medicalHealthCenters: [],
            internationalVariations: [],
            andVsAmpersand: [],
            thePrefix: [],
            locationVariations: [],
            instituteVsUniversity: [],
            apostropheVariations: [],
            spacingHyphens: [],
            otherPatterns: []
        };
        
        // Also collect universities that appear in only one source (highest priority)
        const singleSourceUniversities = aggregated.filter(uni => uni.appearances === 1);
        
        console.log('=== HIGH PRIORITY: SINGLE-SOURCE UNIVERSITIES ===');
        console.log(`Universities appearing in only one source: ${singleSourceUniversities.length}`);
        console.log('(These are most likely to have name mismatches across sources)\n');
        
        // Sample of single-source universities by source
        const singleSourceBySources = {
            usnews: singleSourceUniversities.filter(u => u.originalRankings.usnews).length,
            qs: singleSourceUniversities.filter(u => u.originalRankings.qs).length,
            the: singleSourceUniversities.filter(u => u.originalRankings.the).length,
            arwu: singleSourceUniversities.filter(u => u.originalRankings.arwu).length
        };
        
        console.log('Single-source universities by ranking source:');
        Object.entries(singleSourceBySources).forEach(([source, count]) => {
            console.log(`- ${source.toUpperCase()}: ${count} universities`);
        });
        console.log();
        
        // Analyze naming patterns in incomplete coverage universities
        incompleteCoverage.forEach(uni => {
            const name = uni.name;
            const lower = name.toLowerCase();
            
            if (mappedNames.has(lower)) return; // Skip already mapped
            
            // Categorize by potential mismatch patterns
            if (lower.includes('state university') || (lower.includes('university of') && lower.includes('state'))) {
                mismatchCategories.stateUniversityVariations.push(uni);
            } else if (lower.includes('medical') || lower.includes('health')) {
                mismatchCategories.medicalHealthCenters.push(uni);
            } else if (/[àáâäåæçèéêëìíîïñòóôöøùúûüý]/i.test(name)) {
                mismatchCategories.internationalVariations.push(uni);
            } else if (lower.includes(' and ') || lower.includes(' & ')) {
                mismatchCategories.andVsAmpersand.push(uni);
            } else if (name.startsWith('The ')) {
                mismatchCategories.thePrefix.push(uni);
            } else if (lower.includes(' at ') || lower.includes(' in ') || lower.includes(' - ')) {
                mismatchCategories.locationVariations.push(uni);
            } else if (lower.includes('institute') && !lower.includes('university')) {
                mismatchCategories.instituteVsUniversity.push(uni);
            } else if (name.includes("'")) {
                mismatchCategories.apostropheVariations.push(uni);
            } else if (name.includes('  ') || name.includes(' -') || name.includes('- ')) {
                mismatchCategories.spacingHyphens.push(uni);
            } else {
                mismatchCategories.otherPatterns.push(uni);
            }
        });
        
        console.log('=== POTENTIAL MISMATCH CATEGORIES ===\n');
        
        Object.entries(mismatchCategories).forEach(([category, universities]) => {
            if (universities.length > 0) {
                console.log(`${category.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}: ${universities.length} universities`);
                
                // Show top examples (limited to 10 for readability)
                const examples = universities.slice(0, 10);
                examples.forEach(uni => {
                    const sources = Object.keys(uni.originalRankings).join(', ').toUpperCase();
                    console.log(`  - ${uni.name} (${uni.country}) [Sources: ${sources}]`);
                });
                
                if (universities.length > 10) {
                    console.log(`  ... and ${universities.length - 10} more`);
                }
                console.log();
            }
        });
        
        // Specific recommendations for improvement
        console.log('=== SPECIFIC RECOMMENDATIONS FOR IMPROVING ACCURACY ===\n');
        
        console.log('1. **State University Variations** (High Priority)');
        if (mismatchCategories.stateUniversityVariations.length > 0) {
            console.log(`   - ${mismatchCategories.stateUniversityVariations.length} universities need review`);
            console.log('   - Look for "X State University" vs "University of X" variations');
            console.log('   - Check campus-specific variations (e.g., "Main Campus", "System")');
        }
        console.log();
        
        console.log('2. **Medical and Health Centers** (High Priority)');
        if (mismatchCategories.medicalHealthCenters.length > 0) {
            console.log(`   - ${mismatchCategories.medicalHealthCenters.length} medical institutions need review`);
            console.log('   - Common variations: "Medical University of X" vs "X Medical University"');
            console.log('   - Health Science Centers vs Health Sciences variations');
            console.log('   - Medical School vs Medical University distinctions');
        }
        console.log();
        
        console.log('3. **International Name Variations** (Medium Priority)');
        if (mismatchCategories.internationalVariations.length > 0) {
            console.log(`   - ${mismatchCategories.internationalVariations.length} international universities with diacritics`);
            console.log('   - Check for accent mark differences');
            console.log('   - Verify transliteration variations');
        }
        console.log();
        
        console.log('4. **Location and Preposition Variations** (Medium Priority)');
        if (mismatchCategories.locationVariations.length > 0) {
            console.log(`   - ${mismatchCategories.locationVariations.length} universities with location variations`);
            console.log('   - "University of X at Y" vs "University of X - Y"');
            console.log('   - "University in X" vs "X University" patterns');
        }
        console.log();
        
        console.log('5. **Institute vs University Distinctions** (Medium Priority)');
        if (mismatchCategories.instituteVsUniversity.length > 0) {
            console.log(`   - ${mismatchCategories.instituteVsUniversity.length} institutes that might have university equivalents`);
            console.log('   - Technology institutes often have variations');
        }
        console.log();
        
        // Priority ranking for manual review
        const priorityList = [
            { category: 'Single-source universities', count: singleSourceUniversities.length, priority: 'CRITICAL' },
            { category: 'State university variations', count: mismatchCategories.stateUniversityVariations.length, priority: 'HIGH' },
            { category: 'Medical/health centers', count: mismatchCategories.medicalHealthCenters.length, priority: 'HIGH' },
            { category: 'Location variations', count: mismatchCategories.locationVariations.length, priority: 'MEDIUM' },
            { category: 'International variations', count: mismatchCategories.internationalVariations.length, priority: 'MEDIUM' },
            { category: 'And/ampersand variations', count: mismatchCategories.andVsAmpersand.length, priority: 'LOW' },
            { category: 'Institute vs university', count: mismatchCategories.instituteVsUniversity.length, priority: 'LOW' }
        ];
        
        console.log('=== PRIORITY RANKING FOR MANUAL REVIEW ===\n');
        priorityList.forEach((item, index) => {
            if (item.count > 0) {
                console.log(`${index + 1}. ${item.category}: ${item.count} cases [${item.priority} priority]`);
            }
        });
        console.log();
        
        // Calculate potential improvement
        const totalPotentialImprovements = Object.values(mismatchCategories).reduce((sum, arr) => sum + arr.length, 0);
        const currentMultiSource = aggregated.filter(u => u.appearances > 1).length;
        const potentialImprovement = (totalPotentialImprovements / aggregated.length * 100).toFixed(1);
        
        console.log('=== POTENTIAL IMPACT ASSESSMENT ===');
        console.log(`Current multi-source coverage: ${(currentMultiSource / aggregated.length * 100).toFixed(1)}%`);
        console.log(`Universities needing manual review: ${totalPotentialImprovements}`);
        console.log(`Potential coverage improvement: +${potentialImprovement}% if all mismatches resolved`);
        console.log(`Target coverage with additional mappings: ${((currentMultiSource + totalPotentialImprovements/2) / aggregated.length * 100).toFixed(1)}%`);
        
    } catch (error) {
        console.error('Error in analysis:', error);
    }
}

generateRemainingMismatchesSummary();
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function analyzeMapping() {
    console.log('=== FINAL MAPPING ANALYSIS ===\n');
    
    try {
        const dataPath = '/Users/mmostagirbhuiyan/Documents/university-ranking-aggregator/frontend/public/data';
        
        // Read aggregated results
        const aggregatedData = JSON.parse(fs.readFileSync(path.join(dataPath, 'aggregated-rankings.json'), 'utf8'));
        
        // Read manual mappings
        const manualMappings = JSON.parse(fs.readFileSync(path.join(dataPath, 'manual-university-mapping.json'), 'utf8'));
        
        console.log('=== SUMMARY STATISTICS ===');
        console.log(`Total universities in aggregated results: ${aggregatedData.length}`);
        console.log(`Total manual mappings: ${manualMappings.length}\n`);
        
        // Analyze coverage by number of sources
        const coverageStats = {
            fourSources: 0,
            threeSources: 0,
            twoSources: 0,
            oneSource: 0
        };
        
        aggregatedData.forEach(uni => {
            switch (uni.appearances) {
                case 4:
                    coverageStats.fourSources++;
                    break;
                case 3:
                    coverageStats.threeSources++;
                    break;
                case 2:
                    coverageStats.twoSources++;
                    break;
                case 1:
                    coverageStats.oneSource++;
                    break;
            }
        });
        
        console.log('=== MULTI-SOURCE COVERAGE ===');
        console.log(`Universities in all 4 sources: ${coverageStats.fourSources} (${(coverageStats.fourSources/aggregatedData.length*100).toFixed(1)}%)`);
        console.log(`Universities in 3 sources: ${coverageStats.threeSources} (${(coverageStats.threeSources/aggregatedData.length*100).toFixed(1)}%)`);
        console.log(`Universities in 2 sources: ${coverageStats.twoSources} (${(coverageStats.twoSources/aggregatedData.length*100).toFixed(1)}%)`);
        console.log(`Universities in 1 source only: ${coverageStats.oneSource} (${(coverageStats.oneSource/aggregatedData.length*100).toFixed(1)}%)\n`);
        
        const multiSourceCoverage = coverageStats.fourSources + coverageStats.threeSources + coverageStats.twoSources;
        console.log(`Total multi-source coverage: ${multiSourceCoverage} universities (${(multiSourceCoverage/aggregatedData.length*100).toFixed(1)}%)\n`);
        
        // Analyze mapping patterns
        const mappingPatterns = {};
        manualMappings.forEach(mapping => {
            const original = mapping.originalName;
            const standardized = mapping.suggestedStandardizedName;
            
            let pattern = 'other';
            
            if (original.includes(' at ') && !standardized.includes(' at ')) {
                pattern = 'at_removal';
            } else if (!original.includes(' at ') && standardized.includes(' at ')) {
                pattern = 'at_addition';
            } else if (original.includes(' - ') && !standardized.includes(' - ')) {
                pattern = 'hyphen_removal';
            } else if (original.includes(' & ') && standardized.includes(' and ')) {
                pattern = 'ampersand_to_and';
            } else if (original.includes(' and ') && standardized.includes(' & ')) {
                pattern = 'and_to_ampersand';
            } else if (original.startsWith('The ') && !standardized.startsWith('The ')) {
                pattern = 'the_prefix_removal';
            } else if (!original.startsWith('The ') && standardized.startsWith('The ')) {
                pattern = 'the_prefix_addition';
            } else if (original.includes("'") !== standardized.includes("'")) {
                pattern = 'apostrophe_normalization';
            } else if (original.includes('Medical University of') && standardized.includes('Medical University ')) {
                pattern = 'medical_university_normalization';
            } else if (/[àáâäåæçèéêëìíîïñòóôöøùúûüý]/i.test(original) && !/[àáâäåæçèéêëìíîïñòóôöøùúûüý]/i.test(standardized)) {
                pattern = 'diacritic_removal';
            } else if (original !== standardized) {
                // Check for common university name variations
                if (original.includes('University') !== standardized.includes('University')) {
                    pattern = 'university_name_variation';
                } else if (original.toLowerCase().replace(/\s+/g, '') === standardized.toLowerCase().replace(/\s+/g, '')) {
                    pattern = 'spacing_normalization';
                } else {
                    pattern = 'complex_variation';
                }
            }
            
            mappingPatterns[pattern] = (mappingPatterns[pattern] || 0) + 1;
        });
        
        console.log('=== MAPPING PATTERNS ANALYSIS ===');
        const sortedPatterns = Object.entries(mappingPatterns).sort((a, b) => b[1] - a[1]);
        sortedPatterns.forEach(([pattern, count]) => {
            const percentage = (count / manualMappings.length * 100).toFixed(1);
            console.log(`${pattern.replace(/_/g, ' ')}: ${count} mappings (${percentage}%)`);
        });
        console.log();
        
        // Analyze top universities coverage
        console.log('=== TOP UNIVERSITIES COVERAGE ANALYSIS ===');
        const topUniversities = aggregatedData.slice(0, 50);
        const top50Coverage = {
            fourSources: topUniversities.filter(u => u.appearances === 4).length,
            threeSources: topUniversities.filter(u => u.appearances === 3).length,
            twoSources: topUniversities.filter(u => u.appearances === 2).length,
            oneSource: topUniversities.filter(u => u.appearances === 1).length
        };
        
        console.log('Coverage in top 50 universities:');
        console.log(`- All 4 sources: ${top50Coverage.fourSources} universities (${(top50Coverage.fourSources/50*100).toFixed(1)}%)`);
        console.log(`- 3 sources: ${top50Coverage.threeSources} universities (${(top50Coverage.threeSources/50*100).toFixed(1)}%)`);
        console.log(`- 2 sources: ${top50Coverage.twoSources} universities (${(top50Coverage.twoSources/50*100).toFixed(1)}%)`);
        console.log(`- 1 source: ${top50Coverage.oneSource} universities (${(top50Coverage.oneSource/50*100).toFixed(1)}%)\n`);
        
        // Show examples of successful multi-source mappings
        console.log('=== SUCCESSFUL MULTI-SOURCE MAPPINGS (Examples) ===');
        const fourSourceExamples = aggregatedData.filter(u => u.appearances === 4).slice(0, 10);
        fourSourceExamples.forEach((uni, index) => {
            console.log(`${index + 1}. ${uni.name} (${uni.country})`);
            console.log(`   Sources: QS #${uni.originalRankings.qs?.rank || 'N/A'}, THE #${uni.originalRankings.the?.rank || 'N/A'}, ARWU #${uni.originalRankings.arwu?.rank || 'N/A'}, USNews #${uni.originalRankings.usnews?.rank || 'N/A'}`);
        });
        console.log();
        
        // Calculate improvement estimate
        const estimatedImprovementFromMappings = manualMappings.length;
        const estimatedOriginalMultiSource = multiSourceCoverage - estimatedImprovementFromMappings;
        const improvementPercentage = estimatedOriginalMultiSource > 0 ? 
            (estimatedImprovementFromMappings / estimatedOriginalMultiSource * 100).toFixed(1) : 0;
        
        console.log('=== MAPPING IMPACT ASSESSMENT ===');
        console.log(`Estimated universities added to multi-source through mappings: ~${estimatedImprovementFromMappings}`);
        console.log(`Estimated improvement in multi-source coverage: ~${improvementPercentage}%`);
        console.log(`Current multi-source coverage rate: ${(multiSourceCoverage/aggregatedData.length*100).toFixed(1)}%\n`);
        
        // Quality assessment
        let qualityScore = 0;
        
        // Multi-source coverage (40 points max)
        const multiSourceRate = multiSourceCoverage / aggregatedData.length;
        qualityScore += Math.min(40, multiSourceRate * 40);
        
        // Top university coverage (30 points max)
        const top50MultiSourceRate = (top50Coverage.fourSources + top50Coverage.threeSources) / 50;
        qualityScore += Math.min(30, top50MultiSourceRate * 30);
        
        // Mapping comprehensiveness (30 points max)
        const mappingRate = manualMappings.length / 500; // Assume 500 is good target
        qualityScore += Math.min(30, mappingRate * 30);
        
        console.log('=== OVERALL QUALITY ASSESSMENT ===');
        console.log(`Multi-source coverage score: ${(multiSourceRate * 40).toFixed(1)}/40`);
        console.log(`Top university coverage score: ${(top50MultiSourceRate * 30).toFixed(1)}/30`);
        console.log(`Mapping comprehensiveness score: ${(mappingRate * 30).toFixed(1)}/30`);
        console.log(`Overall quality score: ${qualityScore.toFixed(1)}/100\n`);
        
        if (qualityScore >= 80) {
            console.log('🟢 EXCELLENT - Mapping accuracy is very high');
        } else if (qualityScore >= 60) {
            console.log('🟡 GOOD - Mapping accuracy is solid with room for improvement');
        } else if (qualityScore >= 40) {
            console.log('🟠 FAIR - Mapping accuracy is acceptable but needs improvement');
        } else {
            console.log('🔴 NEEDS WORK - Mapping accuracy requires significant improvement');
        }
        
    } catch (error) {
        console.error('Error in analysis:', error);
    }
}

analyzeMapping();
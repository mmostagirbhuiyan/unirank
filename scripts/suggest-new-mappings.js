// Script to suggest new manual mappings by finding potential duplicates
const fs = require('fs').promises;
const path = require('path');
const stringSimilarity = require('string-similarity');
const EnhancedNameMatcher = require('./enhanced_name_matcher');

class NewMappingSuggester {
    constructor(ignorePreviouslyIgnored = false) {
        this.enhancedMatcher = new EnhancedNameMatcher();
        this.dataDir = path.join(__dirname, '..', 'frontend', 'public', 'data');
        this.duplicateThreshold = 0.90; // High similarity threshold for potential duplicates
        this.lowConfidenceThreshold = 0.85; // Lower threshold for low-confidence potential duplicates (similarity)
        this.lowConfidenceMinConfidence = 0.90; // Minimum confidence threshold for low-confidence duplicates
        this.suggestionThreshold = 0.85; // Threshold for suggesting new mappings
        this.ignoredMappingsPath = path.join(this.dataDir, 'ignored-suggestions.json'); // Path for ignored suggestions
        this.ignorePreviouslyIgnored = ignorePreviouslyIgnored;
    }

    async loadData() {
        console.log('📊 Loading data files...');
        
        // Load aggregated rankings to see current state
        const aggregatedPath = path.join(this.dataDir, 'aggregated-rankings.json');
        const aggregatedData = JSON.parse(await fs.readFile(aggregatedPath, 'utf8'));
        
        // Load existing manual mappings
        const manualPath = path.join(this.dataDir, 'manual-university-mapping.json');
        let existingMappings = [];
        try {
            existingMappings = JSON.parse(await fs.readFile(manualPath, 'utf8'));
        } catch (error) {
            console.warn('No existing manual mappings found');
        }

        // Load ignored suggestions
        let ignoredMappings = [];
        try {
            ignoredMappings = JSON.parse(await fs.readFile(this.ignoredMappingsPath, 'utf8'));
        } catch (error) {
            console.warn('No ignored suggestions found, starting fresh with ignored list.');
        }

        return { aggregatedData, existingMappings, ignoredMappings };
    }

    // Find potential duplicates that could be merged with manual mappings
    findPotentialDuplicates(universities) {
        console.log('🔍 Analyzing potential duplicates...');
        const duplicates = [];
        const lowConfidenceDuplicates = [];
        
        for (let i = 0; i < universities.length; i++) {
            for (let j = i + 1; j < universities.length; j++) {
                const uni1 = universities[i];
                const uni2 = universities[j];
                
                const similarity = stringSimilarity.compareTwoStrings(
                    uni1.name.toLowerCase(),
                    uni2.name.toLowerCase()
                );

                if (similarity >= this.duplicateThreshold) {
                    // Check if they have different source coverage
                    const sources1 = Object.keys(uni1.rankings || {});
                    const sources2 = Object.keys(uni2.rankings || {});
                    const hasCommonSources = sources1.some(s => sources2.includes(s));
                    
                    // NEW: Check ranking variance for common sources (false merge prevention)
                    const rankingVarianceCheck = this.checkRankingVariance(uni1, uni2, hasCommonSources);
                    
                    // Skip if ranking variance indicates different institutions
                    if (rankingVarianceCheck.shouldSkip) {
                        console.log(`⚠️ Skipping potential false merge: "${uni1.name}" vs "${uni2.name}"`);
                        console.log(`   Reason: ${rankingVarianceCheck.reason}`);
                        continue;
                    }
                    
                    duplicates.push({
                        university1: uni1.name,
                        university2: uni2.name,
                        similarity: (similarity * 100).toFixed(1),
                        sources1,
                        sources2,
                        hasCommonSources,
                        confidence: this.calculateConfidence(similarity, sources1, sources2),
                        suggestedMapping: this.suggestBestName(uni1, uni2),
                        rankingVariance: rankingVarianceCheck
                    });
                } else if (similarity >= this.lowConfidenceThreshold) {
                    // Check if they have different source coverage
                    const sources1 = Object.keys(uni1.rankings || {});
                    const sources2 = Object.keys(uni2.rankings || {});
                    const hasCommonSources = sources1.some(s => sources2.includes(s));
                    
                    // NEW: Check ranking variance for low confidence as well
                    const rankingVarianceCheck = this.checkRankingVariance(uni1, uni2, hasCommonSources);
                    
                    const confidence = this.calculateConfidence(similarity, sources1, sources2);
                    
                    // Skip if ranking variance indicates different institutions or confidence too low
                    if (rankingVarianceCheck.shouldSkip || confidence < this.lowConfidenceMinConfidence) {
                        if (rankingVarianceCheck.shouldSkip) {
                            console.log(`⚠️ Skipping low-confidence false merge: "${uni1.name}" vs "${uni2.name}"`);
                            console.log(`   Reason: ${rankingVarianceCheck.reason}`);
                        }
                        continue;
                    }
                    
                    lowConfidenceDuplicates.push({
                        university1: uni1.name,
                        university2: uni2.name,
                        similarity: (similarity * 100).toFixed(1),
                        sources1,
                        sources2,
                        hasCommonSources,
                        confidence: confidence,
                        suggestedMapping: this.suggestBestName(uni1, uni2),
                        rankingVariance: rankingVarianceCheck
                    });
                }
            }
        }

        return {
            duplicates: duplicates.sort((a, b) => b.confidence - a.confidence),
            lowConfidenceDuplicates: lowConfidenceDuplicates.sort((a, b) => b.confidence - a.confidence)
        };
    }

    // Calculate confidence score for a potential mapping
    calculateConfidence(similarity, sources1, sources2) {
        let confidence = similarity * 100;
        
        // Boost confidence if they appear in different sources (likely duplicates)
        const hasCommonSources = sources1.some(s => sources2.includes(s));
        if (!hasCommonSources) {
            confidence += 5;
        }
        
        // Boost confidence if one has more comprehensive source coverage
        const sourceDiff = Math.abs(sources1.length - sources2.length);
        if (sourceDiff > 0) {
            confidence += sourceDiff * 2;
        }
        
        return Math.min(confidence, 100);
    }

    // Suggest which name should be the canonical one
    suggestBestName(uni1, uni2) {
        const sources1 = Object.keys(uni1.rankings || {});
        const sources2 = Object.keys(uni2.rankings || {});
        
        // Prefer the university with more ranking sources
        if (sources1.length !== sources2.length) {
            return sources1.length > sources2.length ? uni1.name : uni2.name;
        }
        
        // Prefer shorter, cleaner names
        if (uni1.name.length !== uni2.name.length) {
            return uni1.name.length < uni2.name.length ? uni1.name : uni2.name;
        }
        
        // Default to alphabetical order
        return uni1.name < uni2.name ? uni1.name : uni2.name;
    }

    // Check if a potential mapping already exists
    mappingExists(originalName, suggestedName, existingMappings) {
        return existingMappings.some(mapping => 
            mapping.originalName === originalName || 
            mapping.suggestedStandardizedName === suggestedName ||
            (mapping.originalName === suggestedName && mapping.suggestedStandardizedName === originalName)
        );
    }

    // Check if a potential mapping has been ignored
    isIgnored(originalName, suggestedName, ignoredMappings) {
        return ignoredMappings.some(mapping => 
            (mapping.originalName === originalName && mapping.suggestedStandardizedName === suggestedName) ||
            (mapping.originalName === suggestedName && mapping.suggestedStandardizedName === originalName)
        );
    }

    // Generate new mapping suggestions
    generateSuggestions(duplicates, existingMappings, ignoredMappings, ignorePreviouslyIgnored = false) {
        console.log('💡 Generating mapping suggestions...');
        
        const suggestions = duplicates
            .filter(dup => dup.confidence >= 85) // Only high-confidence suggestions
            .filter(dup => !this.mappingExists(dup.university1, dup.suggestedMapping, existingMappings))
            .filter(dup => !this.mappingExists(dup.university2, dup.suggestedMapping, existingMappings))
            .filter(dup => ignorePreviouslyIgnored || !this.isIgnored(dup.university1, dup.suggestedMapping, ignoredMappings))
            .map(dup => {
                const originalName = dup.university1 === dup.suggestedMapping ? dup.university2 : dup.university1;
                return {
                    originalName,
                    suggestedStandardizedName: dup.suggestedMapping,
                    confidence: dup.confidence,
                    similarity: dup.similarity,
                    reason: `High similarity (${dup.similarity}%) suggests these are the same university`,
                    sources: {
                        original: dup.university1 === originalName ? dup.sources1 : dup.sources2,
                        suggested: dup.university1 === dup.suggestedMapping ? dup.sources1 : dup.sources2
                    }
                };
            });

        return suggestions;
    }

    // Save suggestions to a file for review
    async saveSuggestions(suggestions, duplicates, lowConfidenceDuplicates, existingMappings) {
        // Filter out potential duplicates that already have manual mappings
        const filteredDuplicates = duplicates.filter(dup => {
            // Check if either university in the duplicate pair already has a mapping
            const uni1HasMapping = this.mappingExists(dup.university1, dup.suggestedMapping, existingMappings) ||
                                 existingMappings.some(m => m.originalName === dup.university1 || m.suggestedStandardizedName === dup.university1);
            const uni2HasMapping = this.mappingExists(dup.university2, dup.suggestedMapping, existingMappings) ||
                                 existingMappings.some(m => m.originalName === dup.university2 || m.suggestedStandardizedName === dup.university2);
            
            // Only include if neither university already has a mapping
            return !uni1HasMapping && !uni2HasMapping;
        });

        // Filter low-confidence duplicates similarly
        const filteredLowConfidenceDuplicates = lowConfidenceDuplicates.filter(dup => {
            const uni1HasMapping = this.mappingExists(dup.university1, dup.suggestedMapping, existingMappings) ||
                                 existingMappings.some(m => m.originalName === dup.university1 || m.suggestedStandardizedName === dup.university1);
            const uni2HasMapping = this.mappingExists(dup.university2, dup.suggestedMapping, existingMappings) ||
                                 existingMappings.some(m => m.originalName === dup.university2 || m.suggestedStandardizedName === dup.university2);
            
            return !uni1HasMapping && !uni2HasMapping;
        });

        const outputPath = path.join(this.dataDir, 'suggested-new-mappings.json');
        const outputData = {
            generatedAt: new Date().toISOString(),
            totalSuggestions: suggestions.length,
            totalPotentialDuplicates: filteredDuplicates.length,
            totalLowConfidenceDuplicates: filteredLowConfidenceDuplicates.length,
            totalRawDuplicatesFound: duplicates.length,
            totalRawLowConfidenceDuplicatesFound: lowConfidenceDuplicates.length,
            suggestions: suggestions.map(s => ({
                originalName: s.originalName,
                suggestedStandardizedName: s.suggestedStandardizedName,
                confidence: s.confidence,
                similarity: s.similarity,
                reason: s.reason
            })),
            potentialDuplicates: filteredDuplicates.map(d => ({
                university1: d.university1,
                university2: d.university2,
                similarity: d.similarity,
                confidence: d.confidence,
                suggestedMapping: d.suggestedMapping,
                sources1: d.sources1,
                sources2: d.sources2,
                hasCommonSources: d.hasCommonSources
            })),
            lowConfidencePotentialDuplicates: filteredLowConfidenceDuplicates.map(d => ({
                university1: d.university1,
                university2: d.university2,
                similarity: d.similarity,
                confidence: d.confidence,
                suggestedMapping: d.suggestedMapping,
                sources1: d.sources1,
                sources2: d.sources2,
                hasCommonSources: d.hasCommonSources
            }))
        };
        
        await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));
        console.log(`💾 Suggestions saved to ${outputPath}`);
        return outputPath;
    }

    // Generate a report
    generateReport(duplicates, suggestions, universities, filteredDuplicates, filteredLowConfidenceDuplicates, lowConfidenceDuplicates) {
        console.log('\n🎯 NEW MAPPING SUGGESTIONS REPORT');
        console.log('=' .repeat(50));
        
        console.log('\n📊 ANALYSIS SUMMARY:');
        console.log(`Total Universities Analyzed: ${universities.length}`);
        console.log(`Raw Potential Duplicates Found (90%+ similarity): ${duplicates.length}`);
        console.log(`Raw Low-Confidence Duplicates Found (85-90% similarity, ≥90% confidence): ${lowConfidenceDuplicates.length}`);
        console.log(`Potential Duplicates (excluding existing mappings): ${filteredDuplicates.length}`);
        console.log(`Low-Confidence Duplicates (excluding existing mappings): ${filteredLowConfidenceDuplicates.length}`);
        console.log(`High-Confidence Suggestions: ${suggestions.length}`);
        
        if (suggestions.length === 0) {
            console.log('\n✅ No new mapping suggestions found.');
            console.log('This indicates the current manual mappings are comprehensive.');
            
            if (filteredDuplicates.length > 0) {
                console.log(`\n🔍 However, ${filteredDuplicates.length} potential duplicates were found.`);
                console.log('These are included in the output file for manual review.');
                console.log('\n💡 TOP POTENTIAL DUPLICATES (excluding existing mappings):');
                filteredDuplicates.slice(0, 5).forEach((duplicate, i) => {
                    console.log(`\n${i + 1}. CONFIDENCE: ${duplicate.confidence.toFixed(1)}%`);
                    console.log(`   "${duplicate.university1}"`);
                    console.log(`   "${duplicate.university2}"`);
                    console.log(`   Similarity: ${duplicate.similarity}%`);
                    console.log(`   Sources: [${duplicate.sources1.join(', ')}] vs [${duplicate.sources2.join(', ')}]`);
                });
                
                if (filteredDuplicates.length > 5) {
                    console.log(`\n... and ${filteredDuplicates.length - 5} more potential duplicates in the output file`);
                }
            } else if (duplicates.length > 0) {
                console.log(`\n✅ All ${duplicates.length} potential duplicates already have manual mappings.`);
                console.log('Your manual mapping coverage is excellent!');
            }

            if (filteredLowConfidenceDuplicates.length > 0) {
                console.log(`\n🔍 LOW-CONFIDENCE ANALYSIS: ${filteredLowConfidenceDuplicates.length} potential duplicates found.`);
                console.log('These require more careful manual review due to lower similarity scores (but ≥90% confidence).');
                console.log('\n💭 TOP LOW-CONFIDENCE DUPLICATES (excluding existing mappings):');
                filteredLowConfidenceDuplicates.slice(0, 3).forEach((duplicate, i) => {
                    console.log(`\n${i + 1}. CONFIDENCE: ${duplicate.confidence.toFixed(1)}%`);
                    console.log(`   "${duplicate.university1}"`);
                    console.log(`   "${duplicate.university2}"`);
                    console.log(`   Similarity: ${duplicate.similarity}%`);
                    console.log(`   Sources: [${duplicate.sources1.join(', ')}] vs [${duplicate.sources2.join(', ')}]`);
                });
                
                if (filteredLowConfidenceDuplicates.length > 3) {
                    console.log(`\n... and ${filteredLowConfidenceDuplicates.length - 3} more low-confidence duplicates in the output file`);
                }
            } else if (lowConfidenceDuplicates.length > 0) {
                console.log(`\n✅ All ${lowConfidenceDuplicates.length} low-confidence duplicates already have manual mappings.`);
            }
            
            return;
        }

        console.log('\n💡 TOP MAPPING SUGGESTIONS:');
        suggestions.slice(0, 10).forEach((suggestion, i) => {
            console.log(`\n${i + 1}. CONFIDENCE: ${suggestion.confidence.toFixed(1)}%`);
            console.log(`   Original: "${suggestion.originalName}"`);
            console.log(`   Suggested: "${suggestion.suggestedStandardizedName}"`);
            console.log(`   Similarity: ${suggestion.similarity}%`);
            console.log(`   Sources: [${suggestion.sources.original.join(', ')}] → [${suggestion.sources.suggested.join(', ')}]`);
        });

        if (suggestions.length > 10) {
            console.log(`\n... and ${suggestions.length - 10} more suggestions`);
        }

        console.log('\n📋 NEXT STEPS:');
        console.log('1. Review the suggestions in suggested-new-mappings.json');
        console.log('2. Add approved mappings to manual-university-mapping.json');
        console.log('3. Run aggregation to see the impact');
        console.log('4. Use scripts/apply-suggested-mappings.js for batch application');
    }

    // NEW: Check ranking variance to prevent false merges
    checkRankingVariance(uni1, uni2, hasCommonSources) {
        const rankings1 = uni1.rankings || {};
        const rankings2 = uni2.rankings || {};
        
        // If no common sources, can't check variance (rely on other signals)
        if (!hasCommonSources) {
            return { shouldSkip: false, reason: 'No common sources to compare rankings' };
        }
        
        const varianceAnalysis = [];
        let maxVariance = 0;
        let commonSourceCount = 0;
        
        // Check variance for each common source
        ['qs', 'the', 'arwu', 'usnews'].forEach(source => {
            if (rankings1[source] && rankings2[source]) {
                const rank1 = rankings1[source].rank;
                const rank2 = rankings2[source].rank;
                
                // Parse ranks (handle ranges like "201-250")
                const numRank1 = this.parseRank(rank1);
                const numRank2 = this.parseRank(rank2);
                
                if (numRank1 && numRank2) {
                    const variance = Math.abs(numRank1 - numRank2);
                    const percentageVariance = (variance / Math.max(numRank1, numRank2)) * 100;
                    
                    varianceAnalysis.push({
                        source,
                        rank1: numRank1,
                        rank2: numRank2,
                        variance,
                        percentageVariance
                    });
                    
                    maxVariance = Math.max(maxVariance, percentageVariance);
                    commonSourceCount++;
                }
            }
        });
        
        // Determine if we should skip based on ranking variance
        let shouldSkip = false;
        let reason = '';
        
        if (commonSourceCount === 0) {
            return { shouldSkip: false, reason: 'No parseable ranking data for comparison' };
        }
        
        // High variance threshold: if rankings differ by >50% in any source, likely different schools
        if (maxVariance > 50) {
            shouldSkip = true;
            reason = `High ranking variance detected (max: ${maxVariance.toFixed(1)}%) suggests different institutions`;
        }
        
        // Medium variance threshold: if multiple sources show >30% variance, be cautious
        const highVarianceSources = varianceAnalysis.filter(v => v.percentageVariance > 30);
        if (highVarianceSources.length >= 2) {
            shouldSkip = true;
            reason = `Multiple sources show significant ranking variance (${highVarianceSources.length} sources >30%)`;
        }
        
        return {
            shouldSkip,
            reason,
            varianceAnalysis,
            maxVariance: maxVariance.toFixed(1),
            commonSourceCount
        };
    }
    
    // Helper function to parse rank strings (handles ranges like "201-250")
    parseRank(rank) {
        if (typeof rank === 'number') return rank;
        if (typeof rank !== 'string') return null;
        
        // Handle ranges like "201-250" - use the middle value
        if (rank.includes('-')) {
            const parts = rank.split('-');
            if (parts.length === 2) {
                const start = parseInt(parts[0]);
                const end = parseInt(parts[1]);
                if (!isNaN(start) && !isNaN(end)) {
                    return Math.floor((start + end) / 2);
                }
            }
        }
        
        // Handle single numbers with potential suffixes like "100+"
        const numMatch = rank.match(/^(\d+)/);
        if (numMatch) {
            return parseInt(numMatch[1]);
        }
        
        return null;
    }

    async run() {
        try {
            console.log('🚀 Starting new mapping suggestion analysis...\n');
            
            const { aggregatedData, existingMappings, ignoredMappings } = await this.loadData();
            
            const duplicateResults = this.findPotentialDuplicates(aggregatedData);
            const duplicates = duplicateResults.duplicates;
            const lowConfidenceDuplicates = duplicateResults.lowConfidenceDuplicates;
            
            const suggestions = this.generateSuggestions(duplicates, existingMappings, ignoredMappings, this.ignorePreviouslyIgnored);
            
            // Filter duplicates to exclude those with existing mappings
            const filteredDuplicates = duplicates.filter(dup => {
                const uni1HasMapping = this.mappingExists(dup.university1, dup.suggestedMapping, existingMappings) ||
                                     existingMappings.some(m => m.originalName === dup.university1 || m.suggestedStandardizedName === dup.university1);
                const uni2HasMapping = this.mappingExists(dup.university2, dup.suggestedMapping, existingMappings) ||
                                     existingMappings.some(m => m.originalName === dup.university2 || m.suggestedStandardizedName === dup.university2);
                
                return !uni1HasMapping && !uni2HasMapping;
            });

            // Filter low-confidence duplicates similarly
            const filteredLowConfidenceDuplicates = lowConfidenceDuplicates.filter(dup => {
                const uni1HasMapping = this.mappingExists(dup.university1, dup.suggestedMapping, existingMappings) ||
                                     existingMappings.some(m => m.originalName === dup.university1 || m.suggestedStandardizedName === dup.university1);
                const uni2HasMapping = this.mappingExists(dup.university2, dup.suggestedMapping, existingMappings) ||
                                     existingMappings.some(m => m.originalName === dup.university2 || m.suggestedStandardizedName === dup.university2);
                
                return !uni1HasMapping && !uni2HasMapping;
            });
            
            await this.saveSuggestions(suggestions, duplicates, lowConfidenceDuplicates, existingMappings);
            this.generateReport(duplicates, suggestions, aggregatedData, filteredDuplicates, filteredLowConfidenceDuplicates, lowConfidenceDuplicates);
            
            return suggestions;
            
        } catch (error) {
            console.error('❌ Error during suggestion analysis:', error.message);
            process.exit(1);
        }
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const ignorePreviouslyIgnored = args.includes('--fresh') || args.includes('--ignore-ignored');
    const suggester = new NewMappingSuggester(ignorePreviouslyIgnored);
    suggester.run();
}

module.exports = NewMappingSuggester; 
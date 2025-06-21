// Script to suggest new manual mappings by finding potential duplicates
const fs = require('fs').promises;
const path = require('path');
const stringSimilarity = require('string-similarity');
const EnhancedNameMatcher = require('./enhanced_name_matcher');

class NewMappingSuggester {
    constructor() {
        this.enhancedMatcher = new EnhancedNameMatcher();
        this.dataDir = path.join(__dirname, '..', 'frontend', 'public', 'data');
        this.duplicateThreshold = 0.90; // High similarity threshold for potential duplicates
        this.lowConfidenceThreshold = 0.85; // Lower threshold for low-confidence potential duplicates (similarity)
        this.lowConfidenceMinConfidence = 0.90; // Minimum confidence threshold for low-confidence duplicates
        this.suggestionThreshold = 0.85; // Threshold for suggesting new mappings
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

        return { aggregatedData, existingMappings };
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
                    
                    duplicates.push({
                        university1: uni1.name,
                        university2: uni2.name,
                        similarity: (similarity * 100).toFixed(1),
                        sources1,
                        sources2,
                        hasCommonSources,
                        confidence: this.calculateConfidence(similarity, sources1, sources2),
                        suggestedMapping: this.suggestBestName(uni1, uni2)
                    });
                } else if (similarity >= this.lowConfidenceThreshold) {
                    // Check if they have different source coverage
                    const sources1 = Object.keys(uni1.rankings || {});
                    const sources2 = Object.keys(uni2.rankings || {});
                    const hasCommonSources = sources1.some(s => sources2.includes(s));
                    
                    const confidence = this.calculateConfidence(similarity, sources1, sources2);
                    
                    // Only include if confidence meets minimum threshold
                    if (confidence >= this.lowConfidenceMinConfidence) {
                        lowConfidenceDuplicates.push({
                            university1: uni1.name,
                            university2: uni2.name,
                            similarity: (similarity * 100).toFixed(1),
                            sources1,
                            sources2,
                            hasCommonSources,
                            confidence: confidence,
                            suggestedMapping: this.suggestBestName(uni1, uni2)
                        });
                    }
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

    // Generate new mapping suggestions
    generateSuggestions(duplicates, existingMappings) {
        console.log('💡 Generating mapping suggestions...');
        
        const suggestions = duplicates
            .filter(dup => dup.confidence >= 85) // Only high-confidence suggestions
            .filter(dup => !this.mappingExists(dup.university1, dup.suggestedMapping, existingMappings))
            .filter(dup => !this.mappingExists(dup.university2, dup.suggestedMapping, existingMappings))
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

    async run() {
        try {
            console.log('🚀 Starting new mapping suggestion analysis...\n');
            
            const { aggregatedData, existingMappings } = await this.loadData();
            
            const duplicateResults = this.findPotentialDuplicates(aggregatedData);
            const duplicates = duplicateResults.duplicates;
            const lowConfidenceDuplicates = duplicateResults.lowConfidenceDuplicates;
            
            const suggestions = this.generateSuggestions(duplicates, existingMappings);
            
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
    const suggester = new NewMappingSuggester();
    suggester.run();
}

module.exports = NewMappingSuggester; 
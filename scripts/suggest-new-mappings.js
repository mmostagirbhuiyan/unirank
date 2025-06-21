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
                }
            }
        }

        return duplicates.sort((a, b) => b.confidence - a.confidence);
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
    async saveSuggestions(suggestions) {
        const outputPath = path.join(this.dataDir, 'suggested-new-mappings.json');
        const outputData = {
            generatedAt: new Date().toISOString(),
            totalSuggestions: suggestions.length,
            suggestions: suggestions.map(s => ({
                originalName: s.originalName,
                suggestedStandardizedName: s.suggestedStandardizedName,
                confidence: s.confidence,
                similarity: s.similarity,
                reason: s.reason
            }))
        };
        
        await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));
        console.log(`💾 Suggestions saved to ${outputPath}`);
        return outputPath;
    }

    // Generate a report
    generateReport(duplicates, suggestions, universities) {
        console.log('\n🎯 NEW MAPPING SUGGESTIONS REPORT');
        console.log('=' .repeat(50));
        
        console.log('\n📊 ANALYSIS SUMMARY:');
        console.log(`Total Universities Analyzed: ${universities.length}`);
        console.log(`Potential Duplicates Found: ${duplicates.length}`);
        console.log(`High-Confidence Suggestions: ${suggestions.length}`);
        
        if (suggestions.length === 0) {
            console.log('\n✅ No new mapping suggestions found.');
            console.log('This indicates the current manual mappings are comprehensive.');
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
            
            const duplicates = this.findPotentialDuplicates(aggregatedData);
            const suggestions = this.generateSuggestions(duplicates, existingMappings);
            
            await this.saveSuggestions(suggestions);
            this.generateReport(duplicates, suggestions, aggregatedData);
            
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
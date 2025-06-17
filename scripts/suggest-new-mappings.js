const fs = require('fs').promises;
const path = require('path');

async function suggestNewMappings() {
    try {
        console.log('=== UNIVERSITY MAPPING SUGGESTION SYSTEM ===\n');
        
        // Read the existing mismatch analysis
        const mismatchPath = path.join(__dirname, '..', 'debug', 'mismatch_analysis.json');
        const mismatchData = JSON.parse(await fs.readFile(mismatchPath, 'utf8'));
        
        // Read existing manual mappings
        const manualMappingPath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'manual-university-mapping.json');
        const existingMappings = JSON.parse(await fs.readFile(manualMappingPath, 'utf8'));
        
        console.log(`Analyzing ${mismatchData.potentialMatches.length} potential matches...`);
        console.log(`Current manual mappings: ${existingMappings.length}\n`);
        
        // Create set of existing mappings to avoid duplicates
        const existingKeys = new Set(existingMappings.map(m => `${m.originalName}@${m.source}`));
        
        // Filter high-confidence matches that don't already exist
        const highConfidenceMatches = mismatchData.potentialMatches
            .filter(match => parseFloat(match.similarity) > 0.96)
            .filter(match => {
                const otherSource = match.source;
                const otherName = match[otherSource];
                return !existingKeys.has(`${otherName}@${otherSource}`);
            })
            .slice(0, 30); // Top 30 suggestions
        
        console.log(`=== HIGH-CONFIDENCE SUGGESTIONS (>96% similarity) ===`);
        console.log(`Found ${highConfidenceMatches.length} new high-confidence suggestions:\n`);
        
        // Categorize suggestions by pattern
        const suggestions = {
            medicalSciences: [],
            atVariations: [],
            prefixVariations: [],
            ampersandVariations: [],
            institutionalVariations: [],
            diacriticVariations: [],
            other: []
        };
        
        const readyToApply = [];
        
        highConfidenceMatches.forEach((match, index) => {
            const usnewsName = match.usnews;
            const otherSource = match.source;
            const otherName = match[otherSource];
            const similarity = parseFloat(match.similarity);
            
            console.log(`${index + 1}. "${otherName}" (${otherSource}) -> "${usnewsName}"`);
            console.log(`   Similarity: ${(similarity * 100).toFixed(1)}%`);
            
            // Categorize by pattern
            let category = 'other';
            let confidence = 0.8;
            
            if (otherName.toLowerCase().includes('medical sciences') && usnewsName.toLowerCase().includes('medical science')) {
                category = 'medicalSciences';
                confidence = 0.95;
            } else if (otherName.includes(' at ') && !usnewsName.includes(' at ')) {
                category = 'atVariations';
                confidence = 0.90;
            } else if ((otherName.startsWith('The ') || otherName.startsWith('I.M. ')) && !usnewsName.startsWith('The ') && !usnewsName.startsWith('I.M. ')) {
                category = 'prefixVariations';
                confidence = 0.88;
            } else if (otherName.includes(' and ') && usnewsName.includes(' & ')) {
                category = 'ampersandVariations';
                confidence = 0.87;
            } else if ((otherName.includes('Institute') && usnewsName.includes('Institutet')) || 
                       (otherName.includes('Institutet') && usnewsName.includes('Institute'))) {
                category = 'institutionalVariations';
                confidence = 0.92;
            } else if (otherName.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 
                       usnewsName.normalize('NFD').replace(/[\u0300-\u036f]/g, '') && otherName !== usnewsName) {
                category = 'diacriticVariations';
                confidence = 0.93;
            }
            
            console.log(`   Pattern: ${category} (confidence: ${(confidence * 100).toFixed(0)}%)\n`);
            
            const suggestion = {
                originalName: otherName,
                source: otherSource,
                suggestedStandardizedName: usnewsName,
                similarity: similarity,
                pattern: category,
                confidence: confidence
            };
            
            suggestions[category].push(suggestion);
            
            // Add to ready-to-apply if high confidence and similarity
            if (similarity > 0.97 && confidence > 0.90) {
                readyToApply.push(suggestion);
            }
        });
        
        // Display pattern summary
        console.log('=== PATTERN BREAKDOWN ===');
        Object.entries(suggestions).forEach(([pattern, matches]) => {
            if (matches.length > 0) {
                console.log(`${pattern}: ${matches.length} suggestions`);
            }
        });
        
        console.log(`\n=== READY TO APPLY IMMEDIATELY ===`);
        console.log(`${readyToApply.length} mappings with >97% similarity and >90% pattern confidence:\n`);
        
        readyToApply.forEach((mapping, index) => {
            console.log(`${index + 1}. "${mapping.originalName}" (${mapping.source}) -> "${mapping.suggestedStandardizedName}"`);
        });
        
        // Save suggestions
        const output = {
            timestamp: new Date().toISOString(),
            summary: {
                totalAnalyzed: mismatchData.potentialMatches.length,
                highConfidenceSuggestions: highConfidenceMatches.length,
                readyToApply: readyToApply.length,
                existingMappings: existingMappings.length
            },
            patternBreakdown: Object.fromEntries(
                Object.entries(suggestions).map(([key, value]) => [key, value.length])
            ),
            highConfidenceSuggestions: highConfidenceMatches,
            readyToApplyMappings: readyToApply,
            allSuggestionsByPattern: suggestions
        };
        
        // Save to files
        const suggestionsPath = path.join(__dirname, '..', 'debug', 'new_mapping_suggestions.json');
        await fs.writeFile(suggestionsPath, JSON.stringify(output, null, 2));
        
        const readyPath = path.join(__dirname, '..', 'debug', 'ready_mappings.json');
        await fs.writeFile(readyPath, JSON.stringify(readyToApply, null, 2));
        
        console.log(`\n=== FILES SAVED ===`);
        console.log(`All suggestions: debug/new_mapping_suggestions.json`);
        console.log(`Ready to apply: debug/ready_mappings.json`);
        
        console.log(`\n=== NEXT STEPS ===`);
        if (readyToApply.length > 0) {
            console.log(`1. Review the ${readyToApply.length} ready-to-apply mappings`);
            console.log(`2. Add them to manual-university-mapping.json if they look correct`);
            console.log(`3. Run the aggregation script to see the impact`);
            console.log(`4. Expected reduction: ~${Math.floor(readyToApply.length * 0.7)} universities`);
        } else {
            console.log('No new high-confidence mappings found. Your manual mapping system is very comprehensive!');
        }
        
        return output;
        
    } catch (error) {
        console.error('Error generating mapping suggestions:', error);
    }
}

// Run if called directly
if (require.main === module) {
    suggestNewMappings();
}

module.exports = { suggestNewMappings }; 
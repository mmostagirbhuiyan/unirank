// Script to apply suggested mappings with interactive review
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class MappingApplicator {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'frontend', 'public', 'data');
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async loadData() {
        console.log('📊 Loading mapping data...');
        
        // Load suggested mappings
        const suggestedPath = path.join(this.dataDir, 'suggested-new-mappings.json');
        let suggestedData = null;
        try {
            suggestedData = JSON.parse(await fs.readFile(suggestedPath, 'utf8'));
        } catch (error) {
            throw new Error('No suggested mappings found. Run suggest-new-mappings.js first.');
        }

        // Load existing manual mappings
        const manualPath = path.join(this.dataDir, 'manual-university-mapping.json');
        let manualMappings = [];
        try {
            manualMappings = JSON.parse(await fs.readFile(manualPath, 'utf8'));
        } catch (error) {
            console.warn('No existing manual mappings found, will create new file');
        }

        // Load ignored suggestions
        const ignoredPath = path.join(this.dataDir, 'ignored-suggestions.json');
        let ignoredMappings = [];
        try {
            ignoredMappings = JSON.parse(await fs.readFile(ignoredPath, 'utf8'));
        } catch (error) {
            console.warn('No ignored suggestions found.');
        }

        return { suggestedData, manualMappings, ignoredMappings };
    }

    // Convert potential duplicates to mapping format
    convertDuplicatesToMappings(duplicates) {
        return duplicates.map(dup => ({
            originalName: dup.university1 === dup.suggestedMapping ? dup.university2 : dup.university1,
            suggestedStandardizedName: dup.suggestedMapping,
            confidence: dup.confidence,
            similarity: dup.similarity,
            reason: `Potential duplicate (${dup.similarity}% similarity)`
        }));
    }

    // Create backup of current manual mappings
    async createBackup(manualMappings) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.dataDir, `manual-university-mapping.backup.${timestamp}.json`);
        await fs.writeFile(backupPath, JSON.stringify(manualMappings, null, 2));
        console.log(`📋 Backup created: ${backupPath}`);
        return backupPath;
    }

    // Check if mapping already exists
    mappingExists(originalName, suggestedName, existingMappings) {
        return existingMappings.some(mapping => 
            mapping.originalName === originalName || 
            mapping.suggestedStandardizedName === suggestedName ||
            (mapping.originalName === suggestedName && mapping.suggestedStandardizedName === originalName)
        );
    }

    // Interactive review of suggestions
    async reviewSuggestions(suggestions, existingMappings, ignoredMappings) {
        console.log('\n🔍 INTERACTIVE MAPPING REVIEW');
        console.log('=' .repeat(50));
        console.log('Commands: (y)es, (n)o, (s)kip, (q)uit, (a)ll remaining, (i)gnore, (h)elp\n');

        const approved = [];
        const rejected = [];
        const ignored = [];
        let autoApprove = false;

        for (let i = 0; i < suggestions.length; i++) {
            const suggestion = suggestions[i];
            
            // Skip if mapping already exists in manual mappings or ignored mappings
            if (this.mappingExists(suggestion.originalName, suggestion.suggestedStandardizedName, existingMappings) ||
                this.isIgnored(suggestion.originalName, suggestion.suggestedStandardizedName, ignoredMappings)) {
                console.log(`⏭️  Skipping ${i + 1}/${suggestions.length}: Mapping already exists or is ignored`);
                continue;
            }

            if (!autoApprove) {
                console.log(`\n📋 Suggestion ${i + 1}/${suggestions.length}:`);
                console.log(`   Original: "${suggestion.originalName}"`);
                console.log(`   Suggested: "${suggestion.suggestedStandardizedName}"`);
                console.log(`   Confidence: ${suggestion.confidence.toFixed(1)}%`);
                console.log(`   Similarity: ${suggestion.similarity}%`);
                
                const answer = await this.askQuestion('Apply this mapping? (y/n/s/q/a/i/h): ');
                
                switch (answer.toLowerCase()) {
                    case 'y':
                    case 'yes':
                        approved.push(suggestion);
                        console.log('✅ Approved');
                        break;
                    case 'n':
                    case 'no':
                        rejected.push(suggestion);
                        console.log('❌ Rejected');
                        break;
                    case 's':
                    case 'skip':
                        console.log('⏭️  Skipped');
                        break;
                    case 'q':
                    case 'quit':
                        console.log('🛑 Quitting review process');
                        return { approved, rejected, ignored };
                    case 'a':
                    case 'all':
                        autoApprove = true;
                        approved.push(suggestion);
                        console.log('✅ Approved (auto-approving remaining)');
                        break;
                    case 'i':
                    case 'ignore':
                        ignored.push(suggestion);
                        console.log('🙈 Ignored');
                        break;
                    case 'h':
                    case 'help':
                        this.showHelp();
                        i--; // Repeat this suggestion
                        break;
                    default:
                        console.log('❓ Invalid input. Use y/n/s/q/a/i/h');
                        i--; // Repeat this suggestion
                }
            } else {
                // Auto-approve mode
                approved.push(suggestion);
                console.log(`✅ Auto-approved ${i + 1}/${suggestions.length}: "${suggestion.originalName}" → "${suggestion.suggestedStandardizedName}"`);
            }
        }

        return { approved, rejected, ignored };
    }

    // Batch apply high-confidence suggestions
    async batchApply(suggestions, confidenceThreshold = 95) {
        console.log(`\n⚡ BATCH APPLY (confidence ≥ ${confidenceThreshold}%)`);
        
        const highConfidence = suggestions.filter(s => s.confidence >= confidenceThreshold);
        
        if (highConfidence.length === 0) {
            console.log(`No suggestions with confidence ≥ ${confidenceThreshold}%`);
            return [];
        }

        console.log(`Found ${highConfidence.length} high-confidence suggestions:`);
        highConfidence.forEach((s, i) => {
            console.log(`${i + 1}. "${s.originalName}" → "${s.suggestedStandardizedName}" (${s.confidence.toFixed(1)}%)`);
        });

        const confirm = await this.askQuestion(`Apply all ${highConfidence.length} high-confidence mappings? (y/n): `);
        
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            console.log('✅ Batch applying high-confidence mappings');
            return highConfidence;
        }
        
        return [];
    }

    // Apply approved mappings to manual mappings file
    async applyMappings(approved, manualMappings) {
        if (approved.length === 0) {
            console.log('No mappings to apply');
            return manualMappings;
        }

        console.log(`\n💾 Applying ${approved.length} new mappings...`);
        
        // Add new mappings
        const newMappings = approved.map(suggestion => ({
            originalName: suggestion.originalName,
            suggestedStandardizedName: suggestion.suggestedStandardizedName
        }));

        const updatedMappings = [...manualMappings, ...newMappings];
        
        // Sort alphabetically by original name
        updatedMappings.sort((a, b) => a.originalName.localeCompare(b.originalName));

        // Save updated mappings
        const manualPath = path.join(this.dataDir, 'manual-university-mapping.json');
        await fs.writeFile(manualPath, JSON.stringify(updatedMappings, null, 2));
        
        console.log(`✅ Updated manual mappings file with ${approved.length} new mappings`);
        console.log(`📊 Total manual mappings: ${updatedMappings.length}`);
        
        return updatedMappings;
    }

    // Save ignored mappings to a file
    async saveIgnoredMappings(ignored, existingIgnored) {
        if (ignored.length === 0) {
            console.log('No new mappings to ignore');
            return existingIgnored;
        }

        console.log(`\n💾 Saving ${ignored.length} ignored mappings...`);

        const newIgnored = ignored.map(suggestion => ({
            originalName: suggestion.originalName,
            suggestedStandardizedName: suggestion.suggestedStandardizedName
        }));

        const updatedIgnored = [...existingIgnored, ...newIgnored];

        // Remove duplicates and sort
        const uniqueIgnored = Array.from(new Map(updatedIgnored.map(item => [
            JSON.stringify([item.originalName, item.suggestedStandardizedName].sort()), item
        ])).values());

        uniqueIgnored.sort((a, b) => a.originalName.localeCompare(b.originalName));

        const ignoredPath = path.join(this.dataDir, 'ignored-suggestions.json');
        await fs.writeFile(ignoredPath, JSON.stringify(uniqueIgnored, null, 2));

        console.log(`✅ Updated ignored suggestions file with ${ignored.length} new entries`);
        console.log(`📊 Total ignored mappings: ${uniqueIgnored.length}`);

        return uniqueIgnored;
    }

    // Check if a potential mapping has been ignored
    isIgnored(originalName, suggestedName, ignoredMappings) {
        return ignoredMappings.some(mapping => 
            (mapping.originalName === originalName && mapping.suggestedStandardizedName === suggestedName) ||
            (mapping.originalName === suggestedName && mapping.suggestedStandardizedName === originalName)
        );
    }

    // Helper methods
    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    // Choose which type of suggestions to process
    async chooseSuggestionType(suggestedData) {
        const suggestions = suggestedData.suggestions || [];
        const potentialDuplicates = suggestedData.potentialDuplicates || [];
        const lowConfidenceDuplicates = suggestedData.lowConfidencePotentialDuplicates || [];

        console.log('\n📋 AVAILABLE SUGGESTION TYPES:');
        console.log('=' .repeat(50));
        console.log(`1. High-Confidence Suggestions: ${suggestions.length} items`);
        console.log(`2. Potential Duplicates (90%+ similarity): ${potentialDuplicates.length} items`);
        console.log(`3. Low-Confidence Duplicates (85-90% similarity, ≥90% confidence): ${lowConfidenceDuplicates.length} items`);
        console.log(`4. All Types Combined: ${suggestions.length + potentialDuplicates.length + lowConfidenceDuplicates.length} items`);

        if (suggestions.length + potentialDuplicates.length + lowConfidenceDuplicates.length === 0) {
            console.log('\n❌ No suggestions available to process');
            return null;
        }

        const choice = await this.askQuestion('\nWhich type would you like to process? (1/2/3/4): ');

        switch (choice) {
            case '1':
                if (suggestions.length === 0) {
                    console.log('❌ No high-confidence suggestions available');
                    return null;
                }
                console.log(`\n🎯 Processing ${suggestions.length} high-confidence suggestions...`);
                return { type: 'suggestions', data: suggestions };
            
            case '2':
                if (potentialDuplicates.length === 0) {
                    console.log('❌ No potential duplicates available');
                    return null;
                }
                console.log(`\n🔍 Processing ${potentialDuplicates.length} potential duplicates...`);
                return { type: 'duplicates', data: this.convertDuplicatesToMappings(potentialDuplicates) };
            
            case '3':
                if (lowConfidenceDuplicates.length === 0) {
                    console.log('❌ No low-confidence duplicates available');
                    return null;
                }
                console.log(`\n💭 Processing ${lowConfidenceDuplicates.length} low-confidence duplicates (≥90% confidence)...`);
                return { type: 'lowConfidence', data: this.convertDuplicatesToMappings(lowConfidenceDuplicates) };
            
            case '4':
                const allSuggestions = [
                    ...suggestions,
                    ...this.convertDuplicatesToMappings(potentialDuplicates),
                    ...this.convertDuplicatesToMappings(lowConfidenceDuplicates)
                ].sort((a, b) => b.confidence - a.confidence); // Sort by confidence descending
                
                console.log(`\n🌟 Processing all ${allSuggestions.length} suggestions (sorted by confidence)...`);
                return { type: 'all', data: allSuggestions };
            
            default:
                console.log('❌ Invalid choice. Please select 1, 2, 3, or 4');
                return await this.chooseSuggestionType(suggestedData);
        }
    }

    showHelp() {
        console.log('\n📖 HELP:');
        console.log('  y/yes  - Approve this mapping');
        console.log('  n/no   - Reject this mapping');
        console.log('  s/skip - Skip this mapping (neutral)');
        console.log('  q/quit - Stop review process');
        console.log('  a/all  - Approve this and all remaining mappings');
        console.log('  i/ignore - Ignore this mapping');
        console.log('  h/help - Show this help message');
    }

    // Generate summary report
    generateReport(approved, rejected, totalSuggestions) {
        console.log('\n🎯 MAPPING APPLICATION REPORT');
        console.log('=' .repeat(50));
        console.log(`Total Suggestions Reviewed: ${totalSuggestions}`);
        console.log(`Mappings Applied: ${approved.length}`);
        console.log(`Mappings Rejected: ${rejected.length}`);
        console.log(`Mappings Skipped: ${totalSuggestions - approved.length - rejected.length}`);
        
        if (approved.length > 0) {
            console.log('\n✅ APPLIED MAPPINGS:');
            approved.forEach((mapping, i) => {
                console.log(`${i + 1}. "${mapping.originalName}" → "${mapping.suggestedStandardizedName}"`);
            });
            
            console.log('\n📋 NEXT STEPS:');
            console.log('1. Run the aggregation script to see the impact:');
            console.log('   node scripts/scrape-rankings.js');
            console.log('2. Check university count changes');
            console.log('3. Verify the results look correct');
        }
    }

    async run(mode = 'interactive') {
        try {
            console.log('🚀 Starting mapping application process...\n');
            
            const { suggestedData, manualMappings, ignoredMappings } = await this.loadData();
            
            // Show summary of available data
            console.log('📊 MAPPING DATA SUMMARY:');
            console.log(`   High-Confidence Suggestions: ${(suggestedData.suggestions || []).length}`);
            console.log(`   Potential Duplicates: ${(suggestedData.potentialDuplicates || []).length}`);
            console.log(`   Low-Confidence Duplicates: ${(suggestedData.lowConfidencePotentialDuplicates || []).length}`);
            console.log(`   Current Manual Mappings: ${manualMappings.length}`);
            
            let selectedSuggestions;
            
            if (mode === 'interactive') {
                // Interactive mode - let user choose suggestion type
                const selection = await this.chooseSuggestionType(suggestedData);
                if (!selection) {
                    console.log('❌ No suggestions selected or available');
                    return;
                }
                selectedSuggestions = selection.data;
            } else {
                // For batch/auto modes, default to high-confidence suggestions
                selectedSuggestions = suggestedData.suggestions || [];
                if (selectedSuggestions.length === 0) {
                    console.log('❌ No high-confidence suggestions found for batch/auto mode');
                    return;
                }
            }
            
            console.log(`\n📋 Processing ${selectedSuggestions.length} suggestions...`);
            
            // Create backup
            await this.createBackup(manualMappings);
            
            let approved = [];
            let rejected = [];
            let ignored = [];
            
            if (mode === 'batch') {
                // Batch mode - apply high confidence only
                approved = await this.batchApply(selectedSuggestions);
            } else if (mode === 'auto') {
                // Auto mode - apply all selected suggestions
                console.log('\n⚡ AUTO MODE: Applying all selected suggestions');
                approved = selectedSuggestions;
            } else {
                // Interactive mode
                const result = await this.reviewSuggestions(selectedSuggestions, manualMappings, ignoredMappings);
                approved = result.approved;
                rejected = result.rejected;
                ignored = result.ignored;
            }
            
            // Apply approved mappings
            const finalManualMappings = await this.applyMappings(approved, manualMappings);
            
            // Save ignored mappings
            await this.saveIgnoredMappings(ignored, ignoredMappings);
            
            // Generate report
            this.generateReport(approved, rejected, selectedSuggestions.length);
            
            return finalManualMappings;
            
        } catch (error) {
            console.error('❌ Error during mapping application:', error.message);
            process.exit(1);
        } finally {
            this.rl.close();
        }
    }
}

// CLI execution
if (require.main === module) {
    const mode = process.argv[2] || 'interactive'; // interactive, batch, auto
    
    if (!['interactive', 'batch', 'auto'].includes(mode)) {
        console.error('Usage: node apply-suggested-mappings.js [interactive|batch|auto]');
        console.error('  interactive - Review each suggestion manually (default)');
        console.error('  batch      - Auto-apply only high-confidence suggestions');
        console.error('  auto       - Auto-apply all suggestions');
        process.exit(1);
    }
    
    const applicator = new MappingApplicator();
    applicator.run(mode);
}

module.exports = MappingApplicator; 
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

        return { suggestedData, manualMappings };
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
    async reviewSuggestions(suggestions, existingMappings) {
        console.log('\n🔍 INTERACTIVE MAPPING REVIEW');
        console.log('=' .repeat(50));
        console.log('Commands: (y)es, (n)o, (s)kip, (q)uit, (a)ll remaining, (h)elp\n');

        const approved = [];
        const rejected = [];
        let autoApprove = false;

        for (let i = 0; i < suggestions.length; i++) {
            const suggestion = suggestions[i];
            
            // Skip if mapping already exists
            if (this.mappingExists(suggestion.originalName, suggestion.suggestedStandardizedName, existingMappings)) {
                console.log(`⏭️  Skipping ${i + 1}/${suggestions.length}: Mapping already exists`);
                continue;
            }

            if (!autoApprove) {
                console.log(`\n📋 Suggestion ${i + 1}/${suggestions.length}:`);
                console.log(`   Original: "${suggestion.originalName}"`);
                console.log(`   Suggested: "${suggestion.suggestedStandardizedName}"`);
                console.log(`   Confidence: ${suggestion.confidence.toFixed(1)}%`);
                console.log(`   Similarity: ${suggestion.similarity}%`);
                
                const answer = await this.askQuestion('Apply this mapping? (y/n/s/q/a/h): ');
                
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
                        return { approved, rejected };
                    case 'a':
                    case 'all':
                        autoApprove = true;
                        approved.push(suggestion);
                        console.log('✅ Approved (auto-approving remaining)');
                        break;
                    case 'h':
                    case 'help':
                        this.showHelp();
                        i--; // Repeat this suggestion
                        break;
                    default:
                        console.log('❓ Invalid input. Use y/n/s/q/a/h');
                        i--; // Repeat this suggestion
                }
            } else {
                // Auto-approve mode
                approved.push(suggestion);
                console.log(`✅ Auto-approved ${i + 1}/${suggestions.length}: "${suggestion.originalName}" → "${suggestion.suggestedStandardizedName}"`);
            }
        }

        return { approved, rejected };
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

    // Helper methods
    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    showHelp() {
        console.log('\n📖 HELP:');
        console.log('  y/yes  - Approve this mapping');
        console.log('  n/no   - Reject this mapping');
        console.log('  s/skip - Skip this mapping (neutral)');
        console.log('  q/quit - Stop review process');
        console.log('  a/all  - Approve this and all remaining mappings');
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
            
            const { suggestedData, manualMappings } = await this.loadData();
            const suggestions = suggestedData.suggestions || [];
            
            if (suggestions.length === 0) {
                console.log('No mapping suggestions found to apply');
                return;
            }

            console.log(`📊 Found ${suggestions.length} mapping suggestions`);
            console.log(`📋 Current manual mappings: ${manualMappings.length}`);
            
            // Create backup
            await this.createBackup(manualMappings);
            
            let approved = [];
            let rejected = [];
            
            if (mode === 'batch') {
                // Batch mode - apply high confidence only
                approved = await this.batchApply(suggestions);
            } else if (mode === 'auto') {
                // Auto mode - apply all suggestions
                console.log('\n⚡ AUTO MODE: Applying all suggestions');
                approved = suggestions;
            } else {
                // Interactive mode
                const result = await this.reviewSuggestions(suggestions, manualMappings);
                approved = result.approved;
                rejected = result.rejected;
            }
            
            // Apply approved mappings
            await this.applyMappings(approved, manualMappings);
            
            // Generate report
            this.generateReport(approved, rejected, suggestions.length);
            
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
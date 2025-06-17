const fs = require('fs').promises;
const path = require('path');

async function applySuggestedMappings() {
    try {
        console.log('=== APPLYING SUGGESTED MAPPINGS ===\n');
        
        // Read current manual mappings
        const manualMappingPath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'manual-university-mapping.json');
        const currentMappings = JSON.parse(await fs.readFile(manualMappingPath, 'utf8'));
        
        console.log(`Current manual mappings: ${currentMappings.length}`);
        
        // Add the Örebro University mappings (diacritic variations)
        const newMappings = [
            {
                originalName: "Örebro University",
                source: "the",
                suggestedStandardizedName: "Orebro University"
            },
            {
                originalName: "Örebro University", 
                source: "arwu",
                suggestedStandardizedName: "Orebro University"
            }
        ];
        
        // Check for existing mappings to avoid duplicates
        const existingKeys = new Set(currentMappings.map(m => `${m.originalName}@${m.source}`));
        const filteredNewMappings = newMappings.filter(m => !existingKeys.has(`${m.originalName}@${m.source}`));
        
        if (filteredNewMappings.length === 0) {
            console.log('All suggested mappings already exist!');
            return currentMappings.length;
        }
        
        console.log(`Adding ${filteredNewMappings.length} new mappings:\n`);
        filteredNewMappings.forEach((mapping, index) => {
            console.log(`${index + 1}. "${mapping.originalName}" (${mapping.source}) -> "${mapping.suggestedStandardizedName}"`);
        });
        
        // Merge with existing mappings
        const allMappings = [...currentMappings, ...filteredNewMappings];
        
        // Save updated manual mappings
        await fs.writeFile(
            manualMappingPath,
            JSON.stringify(allMappings, null, 2)
        );
        
        console.log(`\n=== SUMMARY ===`);
        console.log(`Previous mappings: ${currentMappings.length}`);
        console.log(`New mappings added: ${filteredNewMappings.length}`);
        console.log(`Total mappings: ${allMappings.length}`);
        
        return allMappings.length;
        
    } catch (error) {
        console.error('Error applying suggested mappings:', error);
    }
}

async function monitorImpact() {
    try {
        console.log('\n=== MONITORING IMPACT ===\n');
        
        // Get current university count
        const aggregatedPath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'aggregated-rankings.json');
        const currentData = JSON.parse(await fs.readFile(aggregatedPath, 'utf8'));
        const beforeCount = currentData.length;
        
        console.log(`University count before new mappings: ${beforeCount}`);
        
        // Run aggregation
        console.log('Running aggregation script...');
        const { spawn } = require('child_process');
        
        return new Promise((resolve, reject) => {
            const aggregationProcess = spawn('node', ['scripts/scrape-rankings.js'], {
                cwd: path.join(__dirname, '..'),
                stdio: 'pipe'
            });
            
            let output = '';
            aggregationProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            aggregationProcess.stderr.on('data', (data) => {
                console.error('Aggregation error:', data.toString());
            });
            
            aggregationProcess.on('close', async (code) => {
                if (code === 0) {
                    try {
                        // Check new count
                        const newData = JSON.parse(await fs.readFile(aggregatedPath, 'utf8'));
                        const afterCount = newData.length;
                        
                        console.log(`University count after new mappings: ${afterCount}`);
                        console.log(`Change: ${afterCount - beforeCount} universities`);
                        
                        if (afterCount < beforeCount) {
                            console.log(`✅ Success! Reduced by ${beforeCount - afterCount} universities`);
                        } else if (afterCount === beforeCount) {
                            console.log(`⚠️  No change in university count`);
                        } else {
                            console.log(`❌ Unexpected increase of ${afterCount - beforeCount} universities`);
                        }
                        
                        resolve({
                            before: beforeCount,
                            after: afterCount,
                            change: afterCount - beforeCount
                        });
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error(`Aggregation process failed with code ${code}`));
                }
            });
        });
        
    } catch (error) {
        console.error('Error monitoring impact:', error);
    }
}

async function runFullProcess() {
    try {
        // Apply suggested mappings
        const totalMappings = await applySuggestedMappings();
        
        if (totalMappings) {
            // Monitor the impact
            const impact = await monitorImpact();
            
            console.log('\n=== FINAL RESULTS ===');
            console.log(`Total manual mappings: ${totalMappings}`);
            console.log(`University count change: ${impact.change}`);
            console.log(`Final university count: ${impact.after}`);
            
            // Save impact report
            const report = {
                timestamp: new Date().toISOString(),
                totalMappings: totalMappings,
                impact: impact,
                success: impact.change <= 0
            };
            
            const reportPath = path.join(__dirname, '..', 'debug', 'mapping_impact_report.json');
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            console.log(`\nImpact report saved to: debug/mapping_impact_report.json`);
        }
        
    } catch (error) {
        console.error('Error in full process:', error);
    }
}

// Run if called directly
if (require.main === module) {
    runFullProcess();
}

module.exports = { applySuggestedMappings, monitorImpact, runFullProcess }; 
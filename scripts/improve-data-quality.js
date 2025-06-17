const fs = require('fs').promises;
const path = require('path');
const { suggestNewMappings } = require('./suggest-new-mappings');
const { DataQualityMonitor } = require('./data-quality-monitor');

/**
 * Comprehensive Data Quality Improvement System
 * Automates the process of finding, evaluating, and applying university name mappings
 */

class DataQualityImprovement {
    constructor() {
        this.dataPath = path.join(__dirname, '..', 'frontend', 'public', 'data');
        this.debugPath = path.join(__dirname, '..', 'debug');
        this.initialCount = 0;
        this.finalCount = 0;
        this.improvementLog = [];
    }

    async runFullImprovementCycle() {
        try {
            console.log('=== COMPREHENSIVE DATA QUALITY IMPROVEMENT ===\n');
            
            // Step 1: Initial assessment
            await this.initialAssessment();
            
            // Step 2: Find and evaluate new mapping opportunities
            await this.findMappingOpportunities();
            
            // Step 3: Apply high-confidence mappings
            await this.applyHighConfidenceMappings();
            
            // Step 4: Run aggregation and measure impact
            await this.measureImpact();
            
            // Step 5: Final quality assessment
            await this.finalAssessment();
            
            // Step 6: Generate improvement report
            await this.generateImprovementReport();
            
            console.log('\n=== DATA QUALITY IMPROVEMENT COMPLETE ===');
            this.displayFinalSummary();
            
        } catch (error) {
            console.error('Error in data quality improvement:', error);
        }
    }

    async initialAssessment() {
        console.log('Step 1: Initial Assessment...\n');
        
        // Get current university count
        const aggregatedPath = path.join(this.dataPath, 'aggregated-rankings.json');
        const currentData = JSON.parse(await fs.readFile(aggregatedPath, 'utf8'));
        this.initialCount = currentData.length;
        
        // Run quality monitor
        const monitor = new DataQualityMonitor();
        const initialReport = await monitor.generateQualityReport();
        
        this.improvementLog.push({
            step: 'Initial Assessment',
            universityCount: this.initialCount,
            qualityScore: initialReport.qualityMetrics.qualityScore,
            multiSourceCoverage: (initialReport.qualityMetrics.dataCompleteness.multiSource / this.initialCount * 100).toFixed(1)
        });
        
        console.log(`✓ Initial university count: ${this.initialCount}`);
        console.log(`✓ Initial quality score: ${initialReport.qualityMetrics.qualityScore}/100\n`);
    }

    async findMappingOpportunities() {
        console.log('Step 2: Finding Mapping Opportunities...\n');
        
        // Run mismatch analysis first
        console.log('Running mismatch analysis...');
        const { spawn } = require('child_process');
        
        await new Promise((resolve, reject) => {
            const analysisProcess = spawn('node', ['debug/analyze_mismatches.js'], {
                cwd: path.join(__dirname, '..'),
                stdio: 'pipe'
            });
            
            analysisProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✓ Mismatch analysis complete');
                    resolve();
                } else {
                    reject(new Error(`Mismatch analysis failed with code ${code}`));
                }
            });
        });
        
        // Generate mapping suggestions
        console.log('Generating mapping suggestions...');
        const suggestions = await suggestNewMappings();
        
        this.improvementLog.push({
            step: 'Mapping Opportunities',
            newSuggestionsFound: suggestions?.summary?.highConfidenceSuggestions || 0,
            readyToApply: suggestions?.summary?.readyToApply || 0
        });
        
        console.log(`✓ Found ${suggestions?.summary?.highConfidenceSuggestions || 0} high-confidence suggestions\n`);
    }

    async applyHighConfidenceMappings() {
        console.log('Step 3: Applying High-Confidence Mappings...\n');
        
        // Check if there are ready-to-apply mappings
        const readyMappingsPath = path.join(this.debugPath, 'ready_mappings.json');
        
        try {
            const readyMappings = JSON.parse(await fs.readFile(readyMappingsPath, 'utf8'));
            
            if (readyMappings.length > 0) {
                console.log(`Applying ${readyMappings.length} ready mappings...`);
                
                // Load current manual mappings
                const manualMappingPath = path.join(this.dataPath, 'manual-university-mapping.json');
                const currentMappings = JSON.parse(await fs.readFile(manualMappingPath, 'utf8'));
                
                // Check for duplicates
                const existingKeys = new Set(currentMappings.map(m => `${m.originalName}@${m.source}`));
                const newMappings = readyMappings.filter(m => !existingKeys.has(`${m.originalName}@${m.source}`));
                
                if (newMappings.length > 0) {
                    // Add new mappings
                    const allMappings = [...currentMappings, ...newMappings];
                    await fs.writeFile(manualMappingPath, JSON.stringify(allMappings, null, 2));
                    
                    console.log(`✓ Applied ${newMappings.length} new mappings`);
                    this.improvementLog.push({
                        step: 'Applied Mappings',
                        newMappingsApplied: newMappings.length,
                        totalMappings: allMappings.length
                    });
                } else {
                    console.log('✓ All suggested mappings already exist');
                    this.improvementLog.push({
                        step: 'Applied Mappings',
                        newMappingsApplied: 0,
                        note: 'All suggestions already existed'
                    });
                }
            } else {
                console.log('✓ No ready-to-apply mappings found');
                this.improvementLog.push({
                    step: 'Applied Mappings',
                    newMappingsApplied: 0,
                    note: 'No ready mappings available'
                });
            }
        } catch (error) {
            console.log('✓ No ready mappings file found');
            this.improvementLog.push({
                step: 'Applied Mappings',
                newMappingsApplied: 0,
                note: 'No ready mappings file found'
            });
        }
        
        console.log();
    }

    async measureImpact() {
        console.log('Step 4: Measuring Impact...\n');
        
        // Run aggregation
        console.log('Running aggregation script...');
        const { spawn } = require('child_process');
        
        await new Promise((resolve, reject) => {
            const aggregationProcess = spawn('node', ['scripts/scrape-rankings.js'], {
                cwd: path.join(__dirname, '..'),
                stdio: 'pipe'
            });
            
            aggregationProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✓ Aggregation complete');
                    resolve();
                } else {
                    reject(new Error(`Aggregation failed with code ${code}`));
                }
            });
        });
        
        // Get new count
        const aggregatedPath = path.join(this.dataPath, 'aggregated-rankings.json');
        const newData = JSON.parse(await fs.readFile(aggregatedPath, 'utf8'));
        this.finalCount = newData.length;
        
        const change = this.finalCount - this.initialCount;
        console.log(`✓ University count: ${this.initialCount} → ${this.finalCount} (${change >= 0 ? '+' : ''}${change})`);
        
        this.improvementLog.push({
            step: 'Impact Measurement',
            initialCount: this.initialCount,
            finalCount: this.finalCount,
            change: change,
            improvement: change <= 0
        });
        
        console.log();
    }

    async finalAssessment() {
        console.log('Step 5: Final Quality Assessment...\n');
        
        // Run quality monitor again
        const monitor = new DataQualityMonitor();
        const finalReport = await monitor.generateQualityReport();
        
        this.improvementLog.push({
            step: 'Final Assessment',
            finalQualityScore: finalReport.qualityMetrics.qualityScore,
            finalMultiSourceCoverage: (finalReport.qualityMetrics.dataCompleteness.multiSource / this.finalCount * 100).toFixed(1),
            totalMappings: finalReport.mappingEffectiveness.totalMappings
        });
        
        console.log(`✓ Final quality score: ${finalReport.qualityMetrics.qualityScore}/100`);
        console.log(`✓ Final multi-source coverage: ${(finalReport.qualityMetrics.dataCompleteness.multiSource / this.finalCount * 100).toFixed(1)}%\n`);
    }

    async generateImprovementReport() {
        console.log('Step 6: Generating Improvement Report...\n');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                initialCount: this.initialCount,
                finalCount: this.finalCount,
                change: this.finalCount - this.initialCount,
                improvementAchieved: this.finalCount <= this.initialCount,
                initialQualityScore: this.improvementLog.find(log => log.step === 'Initial Assessment')?.qualityScore,
                finalQualityScore: this.improvementLog.find(log => log.step === 'Final Assessment')?.finalQualityScore
            },
            detailedLog: this.improvementLog,
            recommendations: this.generateNextSteps()
        };
        
        // Save report
        const reportPath = path.join(this.debugPath, 'improvement_cycle_report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        // Save markdown summary
        const summaryPath = path.join(this.debugPath, 'improvement_cycle_summary.md');
        const markdownSummary = this.generateMarkdownSummary(report);
        await fs.writeFile(summaryPath, markdownSummary);
        
        console.log('✓ Improvement report saved to debug/improvement_cycle_report.json');
        console.log('✓ Summary saved to debug/improvement_cycle_summary.md\n');
    }

    generateNextSteps() {
        const recommendations = [];
        
        if (this.finalCount > this.initialCount) {
            recommendations.push({
                priority: 'High',
                action: 'Investigate why university count increased',
                description: 'Review the new mappings to ensure no incorrect merges occurred'
            });
        }
        
        if (this.finalCount === this.initialCount) {
            recommendations.push({
                priority: 'Medium',
                action: 'Continue regular monitoring',
                description: 'Run this improvement cycle monthly to catch new mapping opportunities'
            });
        }
        
        recommendations.push({
            priority: 'Low',
            action: 'Expand data sources',
            description: 'Consider adding more ranking sources to improve multi-source coverage'
        });
        
        return recommendations;
    }

    generateMarkdownSummary(report) {
        return `# Data Quality Improvement Cycle Report

Generated: ${new Date(report.timestamp).toLocaleString()}

## Summary
- **Initial University Count**: ${report.summary.initialCount}
- **Final University Count**: ${report.summary.finalCount}
- **Change**: ${report.summary.change >= 0 ? '+' : ''}${report.summary.change}
- **Improvement Achieved**: ${report.summary.improvementAchieved ? '✅ Yes' : '❌ No'}

## Quality Score Progress
- **Initial**: ${report.summary.initialQualityScore}/100
- **Final**: ${report.summary.finalQualityScore}/100
- **Change**: ${report.summary.finalQualityScore - report.summary.initialQualityScore >= 0 ? '+' : ''}${report.summary.finalQualityScore - report.summary.initialQualityScore}

## Process Log
${report.detailedLog.map((log, i) => `${i+1}. **${log.step}**: ${JSON.stringify(log, null, 2)}`).join('\n')}

## Next Steps
${report.recommendations.map((rec, i) => `${i+1}. **${rec.priority} Priority**: ${rec.action} - ${rec.description}`).join('\n')}
`;
    }

    displayFinalSummary() {
        console.log('=== FINAL SUMMARY ===');
        console.log(`University Count: ${this.initialCount} → ${this.finalCount} (${this.finalCount - this.initialCount >= 0 ? '+' : ''}${this.finalCount - this.initialCount})`);
        
        const initialQuality = this.improvementLog.find(log => log.step === 'Initial Assessment')?.qualityScore;
        const finalQuality = this.improvementLog.find(log => log.step === 'Final Assessment')?.finalQualityScore;
        console.log(`Quality Score: ${initialQuality} → ${finalQuality} (${finalQuality - initialQuality >= 0 ? '+' : ''}${finalQuality - initialQuality})`);
        
        const mappingsApplied = this.improvementLog.find(log => log.step === 'Applied Mappings')?.newMappingsApplied || 0;
        console.log(`New Mappings Applied: ${mappingsApplied}`);
        
        if (this.finalCount < this.initialCount) {
            console.log('\n🎉 SUCCESS: Reduced duplicate universities!');
        } else if (this.finalCount === this.initialCount && mappingsApplied > 0) {
            console.log('\n✅ MAINTAINED: Added mappings without increasing count');
        } else {
            console.log('\n📊 MONITORED: System status assessed and documented');
        }
        
        console.log('\nRecommendation: Run this improvement cycle monthly to maintain data quality.');
    }
}

async function runDataQualityImprovement() {
    const improvement = new DataQualityImprovement();
    await improvement.runFullImprovementCycle();
}

// Run if called directly
if (require.main === module) {
    runDataQualityImprovement();
}

module.exports = { DataQualityImprovement, runDataQualityImprovement }; 
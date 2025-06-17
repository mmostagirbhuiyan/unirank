const fs = require('fs').promises;
const path = require('path');

class DataQualityMonitor {
    constructor() {
        this.dataPath = path.join(__dirname, '..', 'frontend', 'public', 'data');
        this.debugPath = path.join(__dirname, '..', 'debug');
    }

    async generateQualityReport() {
        try {
            console.log('=== DATA QUALITY MONITORING SYSTEM ===\n');
            
            const report = {
                timestamp: new Date().toISOString(),
                summary: {},
                dataSourceAnalysis: {},
                mappingEffectiveness: {},
                qualityMetrics: {},
                recommendations: []
            };

            // Analyze data sources
            await this.analyzeDataSources(report);
            
            // Analyze mapping effectiveness
            await this.analyzeMappingEffectiveness(report);
            
            // Calculate quality metrics
            await this.calculateQualityMetrics(report);
            
            // Generate recommendations
            await this.generateRecommendations(report);
            
            // Save report
            await this.saveReport(report);
            
            // Display summary
            this.displaySummary(report);
            
            return report;
            
        } catch (error) {
            console.error('Error generating quality report:', error);
        }
    }

    async analyzeDataSources(report) {
        console.log('Analyzing data sources...');
        
        // Load aggregated data
        const aggregatedPath = path.join(this.dataPath, 'aggregated-rankings.json');
        const aggregatedData = JSON.parse(await fs.readFile(aggregatedPath, 'utf8'));
        
        // Analyze source coverage
        const sourceCoverage = {
            total: aggregatedData.length,
            bySource: {
                'US News only': 0,
                'QS only': 0,
                'THE only': 0,
                'ARWU only': 0,
                'Multi-source': 0
            },
            multiSourceBreakdown: {
                '2 sources': 0,
                '3 sources': 0,
                '4 sources': 0
            }
        };
        
        aggregatedData.forEach(uni => {
            const sourceCount = uni.appearances;
            const hasUSNews = uni.originalRankings.usnews !== undefined;
            const hasQS = uni.originalRankings.qs !== undefined;
            const hasTHE = uni.originalRankings.the !== undefined;
            const hasARWU = uni.originalRankings.arwu !== undefined;
            
            if (sourceCount === 1) {
                if (hasUSNews) sourceCoverage.bySource['US News only']++;
                else if (hasQS) sourceCoverage.bySource['QS only']++;
                else if (hasTHE) sourceCoverage.bySource['THE only']++;
                else if (hasARWU) sourceCoverage.bySource['ARWU only']++;
            } else {
                sourceCoverage.bySource['Multi-source']++;
                if (sourceCount === 2) sourceCoverage.multiSourceBreakdown['2 sources']++;
                else if (sourceCount === 3) sourceCoverage.multiSourceBreakdown['3 sources']++;
                else if (sourceCount === 4) sourceCoverage.multiSourceBreakdown['4 sources']++;
            }
        });
        
        report.dataSourceAnalysis = sourceCoverage;
        console.log(`✓ Analyzed ${sourceCoverage.total} universities`);
    }

    async analyzeMappingEffectiveness(report) {
        console.log('Analyzing mapping effectiveness...');
        
        // Load manual mappings
        const manualMappingsPath = path.join(this.dataPath, 'manual-university-mapping.json');
        const manualMappings = JSON.parse(await fs.readFile(manualMappingsPath, 'utf8'));
        
        // Analyze mapping patterns
        const patternAnalysis = {
            totalMappings: manualMappings.length,
            byPattern: {
                hyphenToSpace: 0,
                atRemoval: 0,
                prefixRemoval: 0,
                diacriticNormalization: 0,
                ampersandToAnd: 0,
                medicalSciencesVariation: 0,
                institutionalVariation: 0,
                other: 0
            },
            bySource: {
                qs: 0,
                the: 0,
                arwu: 0,
                usnews: 0
            }
        };
        
        manualMappings.forEach(mapping => {
            // Count by source
            patternAnalysis.bySource[mapping.source]++;
            
            // Analyze pattern type
            const original = mapping.originalName.toLowerCase();
            const suggested = mapping.suggestedStandardizedName.toLowerCase();
            
            if (original.includes(' - ') && !suggested.includes(' - ')) {
                patternAnalysis.byPattern.hyphenToSpace++;
            } else if (original.includes(' at ') && !suggested.includes(' at ')) {
                patternAnalysis.byPattern.atRemoval++;
            } else if ((original.startsWith('the ') || original.startsWith('i.m. ')) && 
                       !suggested.startsWith('the ') && !suggested.startsWith('i.m. ')) {
                patternAnalysis.byPattern.prefixRemoval++;
            } else if (original.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 
                       suggested.normalize('NFD').replace(/[\u0300-\u036f]/g, '') && original !== suggested) {
                patternAnalysis.byPattern.diacriticNormalization++;
            } else if (original.includes(' and ') && suggested.includes(' & ')) {
                patternAnalysis.byPattern.ampersandToAnd++;
            } else if (original.includes('medical sciences') && suggested.includes('medical science')) {
                patternAnalysis.byPattern.medicalSciencesVariation++;
            } else if ((original.includes('institute') && suggested.includes('institutet')) ||
                       (original.includes('institutet') && suggested.includes('institute'))) {
                patternAnalysis.byPattern.institutionalVariation++;
            } else {
                patternAnalysis.byPattern.other++;
            }
        });
        
        report.mappingEffectiveness = patternAnalysis;
        console.log(`✓ Analyzed ${patternAnalysis.totalMappings} manual mappings`);
    }

    async calculateQualityMetrics(report) {
        console.log('Calculating quality metrics...');
        
        const aggregatedPath = path.join(this.dataPath, 'aggregated-rankings.json');
        const aggregatedData = JSON.parse(await fs.readFile(aggregatedPath, 'utf8'));
        
        // Calculate metrics
        const metrics = {
            totalUniversities: aggregatedData.length,
            dataCompleteness: {
                singleSource: 0,
                multiSource: 0,
                completeData: 0
            },
            rankingConsistency: {
                lowVariance: 0,
                mediumVariance: 0,
                highVariance: 0
            },
            geographicCoverage: {},
            qualityScore: 0
        };
        
        // Analyze data completeness and consistency
        let totalVariance = 0;
        let varianceCount = 0;
        
        aggregatedData.forEach(uni => {
            if (uni.appearances === 1) {
                metrics.dataCompleteness.singleSource++;
            } else {
                metrics.dataCompleteness.multiSource++;
                
                if (uni.appearances >= 3) {
                    metrics.dataCompleteness.completeData++;
                }
                
                // Calculate ranking variance if multiple rankings exist
                const rankings = [];
                if (uni.originalRankings.usnews) rankings.push(uni.originalRankings.usnews.rank);
                if (uni.originalRankings.qs) rankings.push(uni.originalRankings.qs.rank);
                if (uni.originalRankings.the) rankings.push(uni.originalRankings.the.rank);
                if (uni.originalRankings.arwu) rankings.push(uni.originalRankings.arwu.rank);
                
                if (rankings.length > 1) {
                    const numRankings = rankings.map(r => typeof r === 'string' ? parseInt(r.split('-')[0]) : r);
                    const validRankings = numRankings.filter(r => !isNaN(r));
                    
                    if (validRankings.length > 1) {
                        const mean = validRankings.reduce((a, b) => a + b) / validRankings.length;
                        const variance = validRankings.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / validRankings.length;
                        
                        totalVariance += variance;
                        varianceCount++;
                        
                        if (variance < 100) metrics.rankingConsistency.lowVariance++;
                        else if (variance < 500) metrics.rankingConsistency.mediumVariance++;
                        else metrics.rankingConsistency.highVariance++;
                    }
                }
            }
            
            // Geographic coverage
            const country = uni.country || 'Unknown';
            metrics.geographicCoverage[country] = (metrics.geographicCoverage[country] || 0) + 1;
        });
        
        // Calculate overall quality score (0-100)
        const multiSourceRatio = metrics.dataCompleteness.multiSource / metrics.totalUniversities;
        const completeDataRatio = metrics.dataCompleteness.completeData / metrics.totalUniversities;
        const lowVarianceRatio = varianceCount > 0 ? metrics.rankingConsistency.lowVariance / varianceCount : 1;
        
        metrics.qualityScore = Math.round(
            (multiSourceRatio * 40) + 
            (completeDataRatio * 35) + 
            (lowVarianceRatio * 25)
        );
        
        report.qualityMetrics = metrics;
        console.log(`✓ Calculated quality score: ${metrics.qualityScore}/100`);
    }

    async generateRecommendations(report) {
        console.log('Generating recommendations...');
        
        const recommendations = [];
        
        // Based on source coverage
        const singleSourceCount = report.qualityMetrics.dataCompleteness.singleSource;
        const totalCount = report.qualityMetrics.totalUniversities;
        const singleSourceRatio = singleSourceCount / totalCount;
        
        if (singleSourceRatio > 0.3) {
            recommendations.push({
                priority: 'High',
                category: 'Data Coverage',
                issue: `${singleSourceCount} universities (${(singleSourceRatio * 100).toFixed(1)}%) appear in only one ranking source`,
                recommendation: 'Consider expanding data collection or improving name matching to increase multi-source coverage',
                impact: 'High - would significantly improve data reliability'
            });
        }
        
        // Based on mapping effectiveness
        const mappingCount = report.mappingEffectiveness.totalMappings;
        if (mappingCount < 100) {
            recommendations.push({
                priority: 'Medium',
                category: 'Mapping System',
                issue: `Only ${mappingCount} manual mappings exist`,
                recommendation: 'Run the automated suggestion system regularly to identify new mapping opportunities',
                impact: 'Medium - could reduce duplicate universities'
            });
        }
        
        // Based on quality score
        const qualityScore = report.qualityMetrics.qualityScore;
        if (qualityScore < 70) {
            recommendations.push({
                priority: 'High',
                category: 'Overall Quality',
                issue: `Quality score is ${qualityScore}/100, below target of 70+`,
                recommendation: 'Focus on improving multi-source coverage and ranking consistency',
                impact: 'High - would improve overall system reliability'
            });
        }
        
        // Pattern-specific recommendations
        const patterns = report.mappingEffectiveness.byPattern;
        if (patterns.other > patterns.hyphenToSpace + patterns.atRemoval + patterns.prefixRemoval) {
            recommendations.push({
                priority: 'Low',
                category: 'Pattern Recognition',
                issue: `${patterns.other} mappings don't follow recognized patterns`,
                recommendation: 'Analyze these mappings to identify new patterns for automation',
                impact: 'Low - would improve automation efficiency'
            });
        }
        
        report.recommendations = recommendations;
        console.log(`✓ Generated ${recommendations.length} recommendations`);
    }

    async saveReport(report) {
        const reportPath = path.join(this.debugPath, 'data_quality_report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        // Also save a human-readable summary
        const summaryPath = path.join(this.debugPath, 'data_quality_summary.md');
        const summary = this.generateMarkdownSummary(report);
        await fs.writeFile(summaryPath, summary);
        
        console.log(`\n✓ Reports saved:`);
        console.log(`  - Detailed: debug/data_quality_report.json`);
        console.log(`  - Summary: debug/data_quality_summary.md`);
    }

    generateMarkdownSummary(report) {
        const metrics = report.qualityMetrics;
        const mapping = report.mappingEffectiveness;
        
        return `# Data Quality Report

Generated: ${new Date(report.timestamp).toLocaleString()}

## Summary
- **Total Universities**: ${metrics.totalUniversities}
- **Quality Score**: ${metrics.qualityScore}/100
- **Manual Mappings**: ${mapping.totalMappings}

## Data Coverage
- **Multi-source universities**: ${metrics.dataCompleteness.multiSource} (${(metrics.dataCompleteness.multiSource/metrics.totalUniversities*100).toFixed(1)}%)
- **Complete data (3+ sources)**: ${metrics.dataCompleteness.completeData} (${(metrics.dataCompleteness.completeData/metrics.totalUniversities*100).toFixed(1)}%)
- **Single source only**: ${metrics.dataCompleteness.singleSource} (${(metrics.dataCompleteness.singleSource/metrics.totalUniversities*100).toFixed(1)}%)

## Mapping Effectiveness
- **Total manual mappings**: ${mapping.totalMappings}
- **Most common pattern**: ${Object.entries(mapping.byPattern).sort((a,b) => b[1] - a[1])[0][0]} (${Object.entries(mapping.byPattern).sort((a,b) => b[1] - a[1])[0][1]} mappings)

## Recommendations
${report.recommendations.map((rec, i) => `${i+1}. **${rec.priority} Priority - ${rec.category}**: ${rec.recommendation}`).join('\n')}

## Geographic Coverage
Top 10 countries by university count:
${Object.entries(metrics.geographicCoverage).sort((a,b) => b[1] - a[1]).slice(0,10).map(([country, count]) => `- ${country}: ${count}`).join('\n')}
`;
    }

    displaySummary(report) {
        console.log('\n=== DATA QUALITY SUMMARY ===');
        console.log(`Quality Score: ${report.qualityMetrics.qualityScore}/100`);
        console.log(`Total Universities: ${report.qualityMetrics.totalUniversities}`);
        console.log(`Manual Mappings: ${report.mappingEffectiveness.totalMappings}`);
        console.log(`Multi-source Coverage: ${(report.qualityMetrics.dataCompleteness.multiSource/report.qualityMetrics.totalUniversities*100).toFixed(1)}%`);
        
        if (report.recommendations.length > 0) {
            console.log('\n=== TOP RECOMMENDATIONS ===');
            report.recommendations.slice(0, 3).forEach((rec, i) => {
                console.log(`${i+1}. [${rec.priority}] ${rec.category}: ${rec.recommendation}`);
            });
        }
        
        console.log('\n=== SYSTEM STATUS ===');
        if (report.qualityMetrics.qualityScore >= 80) {
            console.log('🟢 Excellent - System is performing very well');
        } else if (report.qualityMetrics.qualityScore >= 70) {
            console.log('🟡 Good - System is performing well with room for improvement');
        } else {
            console.log('🔴 Needs Attention - System could benefit from improvements');
        }
    }
}

async function runDataQualityMonitor() {
    const monitor = new DataQualityMonitor();
    await monitor.generateQualityReport();
}

// Run if called directly
if (require.main === module) {
    runDataQualityMonitor();
}

module.exports = { DataQualityMonitor, runDataQualityMonitor }; 
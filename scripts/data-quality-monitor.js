// Data Quality Monitor - Monitors system performance and identifies potential issues
const fs = require('fs').promises;
const path = require('path');
const stringSimilarity = require('string-similarity');

// Import the enhanced matcher
const EnhancedNameMatcher = require('./enhanced_name_matcher');

class DataQualityMonitor {
    constructor() {
        this.enhancedMatcher = new EnhancedNameMatcher();
        this.dataDir = path.join(__dirname, '..', 'frontend', 'public', 'data');
    }

    async loadData() {
        console.log('📊 Loading data files...');
        
        // Load aggregated rankings
        const aggregatedPath = path.join(this.dataDir, 'aggregated-rankings.json');
        const aggregatedData = JSON.parse(await fs.readFile(aggregatedPath, 'utf8'));
        
        // Load manual mappings
        const manualPath = path.join(this.dataDir, 'manual-university-mapping.json');
        let manualMappings = [];
        try {
            manualMappings = JSON.parse(await fs.readFile(manualPath, 'utf8'));
        } catch (error) {
            console.warn('No manual mappings file found');
        }

        return { aggregatedData, manualMappings };
    }

    async checkDuplicates(universities) {
        console.log('🔍 Checking for potential duplicates...');
        const duplicates = [];
        const threshold = 0.90; // High similarity threshold for duplicate detection

        for (let i = 0; i < universities.length; i++) {
            for (let j = i + 1; j < universities.length; j++) {
                const name1 = universities[i].name;
                const name2 = universities[j].name;
                
                const similarity = stringSimilarity.compareTwoStrings(
                    name1.toLowerCase(),
                    name2.toLowerCase()
                );

                if (similarity >= threshold) {
                    duplicates.push({
                        name1,
                        name2,
                        similarity: (similarity * 100).toFixed(1),
                        sources1: Object.keys(universities[i].rankings || {}),
                        sources2: Object.keys(universities[j].rankings || {})
                    });
                }
            }
        }

        return duplicates;
    }

    analyzeNameVariations(universities) {
        console.log('📝 Analyzing name variations...');
        const variations = {};
        
        universities.forEach(uni => {
            // Apply enhanced matching to see normalized form
            const normalized = this.enhancedMatcher.normalizeUniversityName(uni.name);
            const normalizedName = normalized.normalized;
            
            if (!variations[normalizedName]) {
                variations[normalizedName] = [];
            }
            variations[normalizedName].push({
                originalName: uni.name,
                transformations: normalized.transformations
            });
        });

        // Find variations with multiple original names
        const multipleVariations = Object.entries(variations)
            .filter(([normalized, originals]) => originals.length > 1)
            .map(([normalized, originals]) => ({
                normalizedName: normalized,
                variations: originals,
                count: originals.length
            }))
            .sort((a, b) => b.count - a.count);

        return multipleVariations;
    }

    checkManualMappingEffectiveness(manualMappings) {
        console.log('🎯 Checking manual mapping effectiveness...');
        const results = {
            totalMappings: manualMappings.length,
            effectiveMappings: 0,
            redundantMappings: [],
            problematicMappings: []
        };

        manualMappings.forEach((mapping, index) => {
            try {
                // Test if enhanced matching would produce the same result
                const enhanced = this.enhancedMatcher.normalizeUniversityName(mapping.originalName);
                
                if (enhanced.normalized === mapping.suggestedStandardizedName) {
                    results.redundantMappings.push({
                        index: index + 1,
                        mapping,
                        reason: 'Enhanced matching produces same result'
                    });
                } else {
                    results.effectiveMappings++;
                }
            } catch (error) {
                results.problematicMappings.push({
                    index: index + 1,
                    mapping,
                    error: error.message
                });
            }
        });

        return results;
    }

    generateReport(duplicates, variations, mappingAnalysis, universities) {
        console.log('\n🎯 DATA QUALITY REPORT');
        console.log('=' .repeat(50));
        
        // Overall statistics
        console.log('\n📊 OVERALL STATISTICS:');
        console.log(`Total Universities: ${universities.length}`);
        console.log(`Manual Mappings: ${mappingAnalysis.totalMappings}`);
        console.log(`Effective Mappings: ${mappingAnalysis.effectiveMappings}`);
        
        // Duplicate detection
        console.log('\n🔍 DUPLICATE DETECTION:');
        if (duplicates.length === 0) {
            console.log('✅ No potential duplicates found');
        } else {
            console.log(`⚠️  Found ${duplicates.length} potential duplicates:`);
            duplicates.slice(0, 10).forEach((dup, i) => {
                console.log(`${i + 1}. "${dup.name1}" ≈ "${dup.name2}" (${dup.similarity}% similar)`);
                console.log(`   Sources: [${dup.sources1.join(', ')}] vs [${dup.sources2.join(', ')}]`);
            });
            if (duplicates.length > 10) {
                console.log(`   ... and ${duplicates.length - 10} more`);
            }
        }

        // Name variations
        console.log('\n📝 NAME VARIATIONS:');
        if (variations.length === 0) {
            console.log('✅ No significant name variations found');
        } else {
            console.log(`Found ${variations.length} names with multiple variations:`);
            variations.slice(0, 5).forEach((variation, i) => {
                console.log(`${i + 1}. "${variation.normalizedName}" (${variation.count} variations):`);
                variation.variations.forEach(v => {
                    console.log(`   - "${v.originalName}"`);
                });
            });
            if (variations.length > 5) {
                console.log(`   ... and ${variations.length - 5} more variation groups`);
            }
        }

        // Manual mapping effectiveness
        console.log('\n🎯 MANUAL MAPPING ANALYSIS:');
        console.log(`Total Mappings: ${mappingAnalysis.totalMappings}`);
        console.log(`Effective Mappings: ${mappingAnalysis.effectiveMappings}`);
        console.log(`Redundant Mappings: ${mappingAnalysis.redundantMappings.length}`);
        
        if (mappingAnalysis.redundantMappings.length > 0) {
            console.log('\n⚠️  REDUNDANT MAPPINGS (could be removed):');
            mappingAnalysis.redundantMappings.forEach(item => {
                console.log(`${item.index}. "${item.mapping.originalName}" → "${item.mapping.suggestedStandardizedName}"`);
                console.log(`   Reason: ${item.reason}`);
            });
        }

        if (mappingAnalysis.problematicMappings.length > 0) {
            console.log('\n❌ PROBLEMATIC MAPPINGS:');
            mappingAnalysis.problematicMappings.forEach(item => {
                console.log(`${item.index}. Error: ${item.error}`);
            });
        }

        // Quality score
        const qualityScore = this.calculateQualityScore(duplicates, variations, mappingAnalysis, universities);
        console.log('\n🏆 QUALITY SCORE:');
        console.log(`Overall Quality: ${qualityScore.overall}%`);
        console.log(`Duplicate Detection: ${qualityScore.duplicates}%`);
        console.log(`Mapping Efficiency: ${qualityScore.mappings}%`);
        
        return {
            duplicates,
            variations,
            mappingAnalysis,
            qualityScore,
            recommendations: this.generateRecommendations(duplicates, variations, mappingAnalysis)
        };
    }

    calculateQualityScore(duplicates, variations, mappingAnalysis, universities) {
        // Calculate quality metrics
        const duplicateScore = Math.max(0, 100 - (duplicates.length * 5)); // Penalize duplicates
        const mappingEfficiency = (mappingAnalysis.effectiveMappings / Math.max(1, mappingAnalysis.totalMappings)) * 100;
        const variationScore = Math.max(0, 100 - (variations.length * 2)); // Penalize excessive variations
        
        const overall = Math.round((duplicateScore + mappingEfficiency + variationScore) / 3);
        
        return {
            overall,
            duplicates: Math.round(duplicateScore),
            mappings: Math.round(mappingEfficiency),
            variations: Math.round(variationScore)
        };
    }

    generateRecommendations(duplicates, variations, mappingAnalysis) {
        const recommendations = [];

        if (duplicates.length > 0) {
            recommendations.push({
                type: 'duplicates',
                priority: 'high',
                message: `Review ${duplicates.length} potential duplicates for manual mapping`,
                action: 'Add manual mappings to merge similar universities'
            });
        }

        if (mappingAnalysis.redundantMappings.length > 0) {
            recommendations.push({
                type: 'cleanup',
                priority: 'medium',
                message: `Remove ${mappingAnalysis.redundantMappings.length} redundant manual mappings`,
                action: 'Clean up manual-university-mapping.json'
            });
        }

        if (variations.length > 10) {
            recommendations.push({
                type: 'automation',
                priority: 'low',
                message: `Consider automation patterns for ${variations.length} name variation groups`,
                action: 'Run pattern discovery to identify automation opportunities'
            });
        }

        return recommendations;
    }

    async run() {
        try {
            console.log('🔍 DATA QUALITY MONITOR');
            console.log('=' .repeat(50));
            
            const { aggregatedData, manualMappings } = await this.loadData();
            
            const duplicates = await this.checkDuplicates(aggregatedData);
            const variations = this.analyzeNameVariations(aggregatedData);
            const mappingAnalysis = this.checkManualMappingEffectiveness(manualMappings);
            
            const report = this.generateReport(duplicates, variations, mappingAnalysis, aggregatedData);
            
            // Save detailed report
            const reportPath = path.join(this.dataDir, 'quality-report.json');
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            console.log(`\n📄 Detailed report saved to: ${reportPath}`);
            
            return report;
            
        } catch (error) {
            console.error('❌ Error running data quality monitor:', error);
            throw error;
        }
    }
}

// CLI execution
if (require.main === module) {
    const monitor = new DataQualityMonitor();
    monitor.run().catch(console.error);
}

module.exports = DataQualityMonitor;
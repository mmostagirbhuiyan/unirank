/**
 * Generates enhanced insights data for the UniRank.AI frontend.
 *
 * This script pre-computes:
 * - Disagreement scores (how much ranking sources disagree)
 * - Calculation breakdowns (step-by-step Borda Count for each university)
 * - Consensus indicators (percentiles, categories)
 * - Name variation lookups (for data quality badge)
 *
 * Output: enhanced-aggregated-rankings.json with insights embedded
 */

const fs = require('fs');
const path = require('path');
const {
    calculateBordaScore,
    calculatePenaltyScore,
    calculateAggregatedScore
} = require('./aggregation');

// Paths
const DATA_DIR = path.join(__dirname, '../frontend/public/data');
const AGGREGATED_PATH = path.join(DATA_DIR, 'aggregated-rankings.json');
const MANUAL_MAPPINGS_PATH = path.join(DATA_DIR, 'manual-university-mapping.json');
const SUGGESTED_MAPPINGS_PATH = path.join(DATA_DIR, 'suggested-university-mapping.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'enhanced-aggregated-rankings.json');
const GLOBAL_STATS_PATH = path.join(DATA_DIR, 'global-stats.json');

// Source configuration (must match scrape-rankings.js)
const SOURCE_CONFIG = {
    qs: { weight: 0.25, maxRank: 1000, fullName: 'QS World University Rankings' },
    the: { weight: 0.25, maxRank: 999, fullName: 'Times Higher Education' },
    arwu: { weight: 0.25, maxRank: 1000, fullName: 'Academic Ranking of World Universities' },
    usnews: { weight: 0.25, maxRank: 980, fullName: 'US News Best Global Universities' }
};
const TOTAL_SOURCES = 4;

/**
 * Generate detailed calculation breakdown for a university.
 * Uses calculateBordaScore, calculatePenaltyScore, and calculateAggregatedScore
 * imported from aggregation.js to keep the formula in one place (DRY).
 */
function generateCalculationBreakdown(university) {
    const rawRanks = {};
    const bordaScores = {};
    const weightedScores = {};
    let weightedSum = 0;
    let appearances = 0;

    for (const [source, config] of Object.entries(SOURCE_CONFIG)) {
        const ranking = university.originalRankings[source];
        const rank = ranking ? ranking.rank : null;

        rawRanks[source] = rank;

        if (rank !== null) {
            const borda = calculateBordaScore(rank, config.maxRank);
            bordaScores[source] = borda;
            weightedScores[source] = borda * config.weight;
            weightedSum += weightedScores[source];
            appearances++;
        } else {
            const penalty = calculatePenaltyScore(config.maxRank);
            bordaScores[source] = -penalty;
            weightedScores[source] = -penalty * config.weight;
            weightedSum += weightedScores[source];
        }
    }

    const confidenceMultiplier = 0.5 + 0.5 * (appearances / TOTAL_SOURCES);

    // Build the universityData shape expected by calculateAggregatedScore
    const sourceWeights = {};
    const sourceMaxRanks = {};
    for (const [source, config] of Object.entries(SOURCE_CONFIG)) {
        sourceWeights[source] = config.weight;
        sourceMaxRanks[source] = config.maxRank;
    }
    const universityDataForAgg = {
        rankings: {}
    };
    for (const [source] of Object.entries(SOURCE_CONFIG)) {
        const ranking = university.originalRankings[source];
        universityDataForAgg.rankings[source] = ranking ? { rank: ranking.rank } : null;
    }
    const finalScore = calculateAggregatedScore(universityDataForAgg, sourceWeights, sourceMaxRanks, TOTAL_SOURCES);

    return {
        rawRanks,
        bordaScores,
        weightedScores,
        weightedSum: Math.round(weightedSum * 100) / 100,
        appearances,
        confidenceMultiplier: Math.round(confidenceMultiplier * 1000) / 1000,
        calculatedScore: Math.round(finalScore * 100) / 100
    };
}

/**
 * Calculate disagreement metrics for a university
 */
function calculateDisagreement(university) {
    const ranks = [];

    for (const source of Object.keys(SOURCE_CONFIG)) {
        const ranking = university.originalRankings[source];
        if (ranking && ranking.rank !== null) {
            ranks.push(ranking.rank);
        }
    }

    if (ranks.length < 2) {
        return {
            spread: null,
            variance: null,
            stdDev: null,
            category: 'insufficient-data',
            sourcesAvailable: ranks.length
        };
    }

    const minRank = Math.min(...ranks);
    const maxRank = Math.max(...ranks);
    const spread = maxRank - minRank;

    // Calculate variance
    const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    const variance = ranks.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ranks.length;
    const stdDev = Math.sqrt(variance);

    // Categorize
    let category;
    if (spread <= 10) {
        category = 'high-consensus';
    } else if (spread <= 50) {
        category = 'moderate-consensus';
    } else if (spread <= 200) {
        category = 'moderate-disagreement';
    } else {
        category = 'high-disagreement';
    }

    return {
        spread,
        variance: Math.round(variance * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        category,
        sourcesAvailable: ranks.length,
        minRank,
        maxRank
    };
}

/**
 * Find similar universities (by disagreement category and score proximity)
 */
function findSimilarUniversities(university, allUniversities) {
    const targetScore = university.aggregatedScore;
    const targetCategory = university.insights?.disagreement?.category;

    const similar = allUniversities
        .filter(u => u.name !== university.name)
        .filter(u => {
            const scoreDiff = Math.abs(u.aggregatedScore - targetScore);
            const sameCategory = u.insights?.disagreement?.category === targetCategory;
            return scoreDiff < 10 || sameCategory;
        })
        .sort((a, b) => {
            const aDiff = Math.abs(a.aggregatedScore - targetScore);
            const bDiff = Math.abs(b.aggregatedScore - targetScore);
            return aDiff - bDiff;
        })
        .slice(0, 3)
        .map(u => u.name);

    return similar;
}

/**
 * Build name variations lookup from mappings
 */
function buildNameVariationsLookup(manualMappings, suggestedMappings) {
    const lookup = {};

    // Process manual mappings (higher quality)
    for (const mapping of manualMappings) {
        const standardized = mapping.suggestedStandardizedName;
        if (!lookup[standardized]) {
            lookup[standardized] = { manual: [], auto: [] };
        }
        if (mapping.originalName !== standardized) {
            lookup[standardized].manual.push(mapping.originalName);
        }
    }

    // Process suggested/auto mappings
    for (const mapping of suggestedMappings) {
        const standardized = mapping.suggestedStandardizedName;
        if (!lookup[standardized]) {
            lookup[standardized] = { manual: [], auto: [] };
        }
        if (mapping.originalName !== standardized) {
            lookup[standardized].auto.push(mapping.originalName);
        }
    }

    return lookup;
}

/**
 * Calculate percentiles for all universities
 */
function calculatePercentiles(universities) {
    // Filter universities with valid spread values
    const withSpread = universities
        .filter(u => u.insights?.disagreement?.spread !== null)
        .sort((a, b) => a.insights.disagreement.spread - b.insights.disagreement.spread);

    const total = withSpread.length;

    withSpread.forEach((u, index) => {
        // Lower spread = more consistent = higher percentile
        u.insights.disagreement.consistencyPercentile = Math.round((1 - index / total) * 100);
    });

    return universities;
}

/**
 * Main function
 */
async function generateInsights() {
    console.log('Loading data files...');

    // Load data
    const aggregatedData = JSON.parse(fs.readFileSync(AGGREGATED_PATH, 'utf8'));
    const manualMappings = JSON.parse(fs.readFileSync(MANUAL_MAPPINGS_PATH, 'utf8'));

    let suggestedMappings = [];
    try {
        suggestedMappings = JSON.parse(fs.readFileSync(SUGGESTED_MAPPINGS_PATH, 'utf8'));
    } catch (e) {
        console.log('Note: suggested-university-mapping.json not found, continuing without it');
    }

    console.log(`Processing ${aggregatedData.length} universities...`);

    // Build name variations lookup
    const nameVariationsLookup = buildNameVariationsLookup(manualMappings, suggestedMappings);

    // Process each university
    const enhancedData = aggregatedData.map(university => {
        const calculation = generateCalculationBreakdown(university);
        const disagreement = calculateDisagreement(university);

        // Get name variations for this university
        const variations = nameVariationsLookup[university.name] || { manual: [], auto: [] };
        const hasVariations = variations.manual.length > 0 || variations.auto.length > 0;

        return {
            ...university,
            insights: {
                calculation,
                disagreement,
                dataQuality: {
                    sourcesTracked: university.appearances,
                    totalSources: TOTAL_SOURCES,
                    hasNameVariations: hasVariations,
                    manualMappingsCount: variations.manual.length,
                    autoMappingsCount: variations.auto.length,
                    sampleVariations: [...variations.manual.slice(0, 2), ...variations.auto.slice(0, 1)]
                }
            }
        };
    });

    // Calculate percentiles after all disagreement scores are computed
    console.log('Calculating percentiles...');
    calculatePercentiles(enhancedData);

    // Find similar universities (second pass after all data is computed)
    console.log('Finding similar universities...');
    enhancedData.forEach(university => {
        university.insights.similarUniversities = findSimilarUniversities(university, enhancedData);
    });

    // Generate global statistics
    const globalStats = {
        totalUniversities: enhancedData.length,
        totalCountries: new Set(enhancedData.map(u => u.country)).size,
        totalSources: TOTAL_SOURCES,
        sourceConfig: SOURCE_CONFIG,
        manualMappingsCount: manualMappings.length,
        autoMappingsCount: suggestedMappings.length,
        lastUpdated: new Date().toISOString().split('T')[0],
        disagreementDistribution: {
            'high-consensus': enhancedData.filter(u => u.insights.disagreement.category === 'high-consensus').length,
            'moderate-consensus': enhancedData.filter(u => u.insights.disagreement.category === 'moderate-consensus').length,
            'moderate-disagreement': enhancedData.filter(u => u.insights.disagreement.category === 'moderate-disagreement').length,
            'high-disagreement': enhancedData.filter(u => u.insights.disagreement.category === 'high-disagreement').length,
            'insufficient-data': enhancedData.filter(u => u.insights.disagreement.category === 'insufficient-data').length
        },
        appearancesDistribution: {
            1: enhancedData.filter(u => u.appearances === 1).length,
            2: enhancedData.filter(u => u.appearances === 2).length,
            3: enhancedData.filter(u => u.appearances === 3).length,
            4: enhancedData.filter(u => u.appearances === 4).length
        },
        topConsensus: enhancedData
            .filter(u => u.insights.disagreement.spread !== null)
            .sort((a, b) => a.insights.disagreement.spread - b.insights.disagreement.spread)
            .slice(0, 10)
            .map(u => ({ name: u.name, spread: u.insights.disagreement.spread })),
        topControversial: enhancedData
            .filter(u => u.insights.disagreement.spread !== null)
            .sort((a, b) => b.insights.disagreement.spread - a.insights.disagreement.spread)
            .slice(0, 10)
            .map(u => ({ name: u.name, spread: u.insights.disagreement.spread }))
    };

    // Write output files
    console.log('Writing enhanced data...');
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enhancedData, null, 2));
    fs.writeFileSync(GLOBAL_STATS_PATH, JSON.stringify(globalStats, null, 2));

    console.log(`\nGenerated insights for ${enhancedData.length} universities`);
    console.log(`Output: ${OUTPUT_PATH}`);
    console.log(`Global stats: ${GLOBAL_STATS_PATH}`);

    // Print summary
    console.log('\n--- Summary ---');
    console.log(`High consensus (spread ≤10): ${globalStats.disagreementDistribution['high-consensus']}`);
    console.log(`Moderate consensus (spread 11-50): ${globalStats.disagreementDistribution['moderate-consensus']}`);
    console.log(`Moderate disagreement (spread 51-200): ${globalStats.disagreementDistribution['moderate-disagreement']}`);
    console.log(`High disagreement (spread >200): ${globalStats.disagreementDistribution['high-disagreement']}`);
    console.log(`Insufficient data (<2 sources): ${globalStats.disagreementDistribution['insufficient-data']}`);

    console.log('\nTop 5 Most Agreed Upon:');
    globalStats.topConsensus.slice(0, 5).forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.name} (spread: ${u.spread})`);
    });

    console.log('\nTop 5 Most Controversial:');
    globalStats.topControversial.slice(0, 5).forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.name} (spread: ${u.spread})`);
    });
}

// Run
generateInsights().catch(console.error);

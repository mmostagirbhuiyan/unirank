#!/usr/bin/env node

/**
 * Data Integrity Check Script
 * 
 * Comprehensive verification of university ranking data integrity
 * - Checks university count against target (1753 ± 2)
 * - Detects high-confidence duplicates (target: ≤8)
 * - Validates source distribution
 * - Reports overall data health
 */

const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity');

// Target metrics for data integrity (updated after cross-country mapping bug fix)
const TARGET_UNIVERSITIES = 1756;
const TARGET_VARIANCE = 2;
const MAX_DUPLICATES = 8;
const SIMILARITY_THRESHOLD = 0.91;

function loadAggregatedData() {
    const filePath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'aggregated-rankings.json');
    
    if (!fs.existsSync(filePath)) {
        throw new Error('Aggregated rankings file not found. Run: node scripts/scrape-rankings.js');
    }
    
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function checkUniversityCount(data) {
    const count = data.length;
    const minTarget = TARGET_UNIVERSITIES - TARGET_VARIANCE;
    const maxTarget = TARGET_UNIVERSITIES + TARGET_VARIANCE;
    
    console.log('📊 UNIVERSITY COUNT VERIFICATION');
    console.log('='.repeat(35));
    console.log(`Current count: ${count}`);
    console.log(`Target range: ${minTarget} - ${maxTarget}`);
    
    if (count >= minTarget && count <= maxTarget) {
        console.log('✅ University count: HEALTHY');
        return { status: 'healthy', count };
    } else if (count < minTarget) {
        console.log('⚠️  University count: BELOW TARGET (possible over-merging)');
        return { status: 'warning', count };
    } else {
        console.log('🚨 University count: ABOVE TARGET (CRITICAL - data integrity violation)');
        return { status: 'critical', count };
    }
}

function detectDuplicates(data) {
    console.log('\n🔍 DUPLICATE DETECTION');
    console.log('='.repeat(25));
    
    const duplicates = [];
    
    for (let i = 0; i < data.length; i++) {
        for (let j = i + 1; j < data.length; j++) {
            const uni1 = data[i];
            const uni2 = data[j];
            
            const similarity = stringSimilarity.compareTwoStrings(
                uni1.name.toLowerCase(),
                uni2.name.toLowerCase()
            );
            
            if (similarity >= SIMILARITY_THRESHOLD) {
                const sources1 = Object.keys(uni1.originalRankings || {});
                const sources2 = Object.keys(uni2.originalRankings || {});
                const hasOverlap = sources1.some(s => sources2.includes(s));
                const sameCountry = uni1.country === uni2.country;
                
                duplicates.push({
                    uni1: uni1.name,
                    uni2: uni2.name,
                    similarity: (similarity * 100).toFixed(1),
                    country1: uni1.country,
                    country2: uni2.country,
                    sources1,
                    sources2,
                    hasOverlap,
                    sameCountry,
                    legitimacy: determineLegitimacy(sameCountry, hasOverlap, sources1, sources2)
                });
            }
        }
    }
    
    // Sort by similarity descending
    duplicates.sort((a, b) => b.similarity - a.similarity);
    
    console.log(`High-confidence duplicates (≥${SIMILARITY_THRESHOLD * 100}%): ${duplicates.length}`);
    console.log(`Target: ≤${MAX_DUPLICATES}`);
    
    if (duplicates.length <= MAX_DUPLICATES) {
        console.log('✅ Duplicate count: HEALTHY');
    } else {
        console.log('⚠️  Duplicate count: ABOVE TARGET (investigation needed)');
    }
    
    // Show details for each duplicate
    if (duplicates.length > 0) {
        console.log('\nDuplicate Details:');
        duplicates.forEach((dup, i) => {
            console.log(`\n${i + 1}. Similarity: ${dup.similarity}%`);
            console.log(`   "${dup.uni1}" (${dup.country1})`);
            console.log(`   "${dup.uni2}" (${dup.country2})`);
            console.log(`   Sources: [${dup.sources1.join(', ')}] vs [${dup.sources2.join(', ')}]`);
            console.log(`   Assessment: ${dup.legitimacy}`);
        });
    }
    
    const problematicDuplicates = duplicates.filter(d => d.legitimacy.includes('MERGE'));
    
    return { 
        total: duplicates.length, 
        problematic: problematicDuplicates.length,
        status: duplicates.length <= MAX_DUPLICATES ? 'healthy' : 'warning',
        details: duplicates
    };
}

function determineLegitimacy(sameCountry, hasOverlap, sources1, sources2) {
    if (sameCountry && !hasOverlap && sources1.length > 0 && sources2.length > 0) {
        return '🟡 POTENTIAL MERGE (same country, no source overlap)';
    } else if (!sameCountry) {
        return '🟢 LEGITIMATE SEPARATE (different countries)';
    } else if (hasOverlap) {
        return '🟢 LEGITIMATE SEPARATE (source overlap indicates different institutions)';
    } else {
        return '🔍 INVESTIGATE (unusual case)';
    }
}

function validateSourceDistribution(data) {
    console.log('\n📈 SOURCE DISTRIBUTION');
    console.log('='.repeat(25));
    
    const sourceCounts = { qs: 0, the: 0, arwu: 0, usnews: 0 };
    const sourceOnlyCount = { qs: 0, the: 0, arwu: 0, usnews: 0 };
    
    data.forEach(uni => {
        const sources = Object.keys(uni.originalRankings || {});
        sources.forEach(source => {
            if (sourceCounts[source] !== undefined) {
                sourceCounts[source]++;
            }
        });
        
        if (sources.length === 1) {
            const source = sources[0];
            if (sourceOnlyCount[source] !== undefined) {
                sourceOnlyCount[source]++;
            }
        }
    });
    
    const expectedRanges = {
        qs: [950, 1000],
        the: [950, 999], 
        arwu: [950, 1000],
        usnews: [900, 980]
    };
    
    let allSourcesHealthy = true;
    
    Object.entries(sourceCounts).forEach(([source, count]) => {
        const [min, max] = expectedRanges[source];
        const isHealthy = count >= min && count <= max;
        const onlyCount = sourceOnlyCount[source];
        
        console.log(`${source.toUpperCase()}: ${count} universities (${onlyCount} unique) ${isHealthy ? '✅' : '⚠️'}`);
        
        if (!isHealthy) {
            allSourcesHealthy = false;
        }
    });
    
    return { status: allSourcesHealthy ? 'healthy' : 'warning', sourceCounts };
}

function generateHealthReport(universityCheck, duplicateCheck, sourceCheck) {
    console.log('\n🏥 OVERALL DATA HEALTH');
    console.log('='.repeat(25));
    
    const issues = [];
    
    if (universityCheck.status === 'critical') {
        issues.push('🚨 CRITICAL: University count violation');
    } else if (universityCheck.status === 'warning') {
        issues.push('⚠️  WARNING: University count outside target range');
    }
    
    if (duplicateCheck.problematic > 0) {
        issues.push(`🚨 CRITICAL: ${duplicateCheck.problematic} problematic duplicates requiring merge`);
    } else if (duplicateCheck.status === 'warning') {
        issues.push('⚠️  WARNING: Duplicate count above target');
    }
    
    if (sourceCheck.status === 'warning') {
        issues.push('⚠️  WARNING: Source distribution outside expected ranges');
    }
    
    if (issues.length === 0) {
        console.log('🎉 DATA INTEGRITY: EXCELLENT');
        console.log('✅ All metrics within healthy ranges');
        console.log('✅ No problematic duplicates detected');
        console.log('✅ Source distribution normal');
        return 'excellent';
    } else {
        console.log('📋 ISSUES DETECTED:');
        issues.forEach(issue => console.log(`   ${issue}`));
        
        const hasCritical = issues.some(issue => issue.includes('CRITICAL'));
        return hasCritical ? 'critical' : 'warning';
    }
}

function main() {
    console.log('🔍 UNIVERSITY RANKINGS DATA INTEGRITY CHECK');
    console.log('='.repeat(50));
    console.log(`Target: ${TARGET_UNIVERSITIES} ± ${TARGET_VARIANCE} universities, ≤${MAX_DUPLICATES} duplicates`);
    console.log('');
    
    try {
        const data = loadAggregatedData();
        
        const universityCheck = checkUniversityCount(data);
        const duplicateCheck = detectDuplicates(data);
        const sourceCheck = validateSourceDistribution(data);
        
        const overallHealth = generateHealthReport(universityCheck, duplicateCheck, sourceCheck);
        
        // Exit with appropriate code for CI/CD integration
        if (overallHealth === 'critical') {
            console.log('\n❌ Data integrity check FAILED');
            process.exit(1);
        } else if (overallHealth === 'warning') {
            console.log('\n⚠️  Data integrity check completed with WARNINGS');
            process.exit(0);
        } else {
            console.log('\n✅ Data integrity check PASSED');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('💥 Error during data integrity check:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { checkUniversityCount, detectDuplicates, validateSourceDistribution };
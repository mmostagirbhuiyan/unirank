#!/usr/bin/env node

/**
 * Baseline Monitor
 * 
 * Monitors university count and system health
 * Provides quick validation and troubleshooting tools
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📊 UNIVERSITY RANKINGS BASELINE MONITOR');
console.log('=' .repeat(60));

const args = process.argv.slice(2);
const useV2 = args.includes('--v2');
const command = args[0] && args[0] !== '--v2' ? args[0] : (args[1] && args[1] !== '--v2' ? args[1] : 'status');

if (useV2) {
    console.log('Running in V2 mode');
}

switch (command) {
    case 'status':
    case 'check':
        checkSystemStatus();
        break;
    case 'compare':
        compareWithBaseline(args[1]);
        break;
    case 'health':
        runHealthCheck();
        break;
    case 'duplicates':
        findDuplicates();
        break;
    case 'help':
        showHelp();
        break;
    default:
        console.log(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
}

function showHelp() {
    console.log('Usage: node baseline-monitor.js <command>');
    console.log('');
    console.log('Commands:');
    console.log('  status      Show current system status (default)');
    console.log('  compare     Compare current state with baseline');
    console.log('  health      Run comprehensive health check');
    console.log('  duplicates  Find duplicate universities in data');
    console.log('  help        Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node baseline-monitor.js                    # Show status');
    console.log('  node baseline-monitor.js health             # Full health check');
    console.log('  node baseline-monitor.js duplicates         # Find duplicates');
}

function checkSystemStatus() {
    console.log('🔍 SYSTEM STATUS CHECK');
    console.log('-' .repeat(40));
    
    try {
        // Check university count
        const count = getCurrentUniversityCount();
        console.log(`🏛️  Universities: ${count}`);
        
        // Check manual mappings
        const mappingsPath = useV2
            ? path.resolve(__dirname, '../../canonical-universities.json')
            : path.resolve(__dirname, '../../frontend/public/data/manual-university-mapping.json');
        const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
        console.log(`📋 Manual mappings: ${mappings.length}`);
        
        // Check automation patterns
        const patterns = countAutomationPatterns();
        console.log(`🤖 Automation patterns: ${patterns}`);
        
        // Check data freshness
        const aggregatedPath = path.resolve(__dirname, '../../frontend/public/data/aggregated-rankings.json');
        const stats = fs.statSync(aggregatedPath);
        const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        console.log(`⏰ Data age: ${ageHours.toFixed(1)} hours`);
        
        // Quick validation
        if (count < 1700 || count > 1800) {
            console.log(`⚠️  Warning: University count outside expected range (1700-1800)`);
        }
        
        if (mappings.length > 150) {
            console.log(`⚠️  Warning: High number of manual mappings (${mappings.length})`);
        }
        
        console.log('\n✅ System status check complete');
        
    } catch (error) {
        console.log(`❌ Error checking system status: ${error.message}`);
        process.exit(1);
    }
}

function compareWithBaseline(baselineFile) {
    console.log('🔄 BASELINE COMPARISON');
    console.log('-' .repeat(40));
    
    const currentCount = getCurrentUniversityCount();
    const mappingsPath = useV2
        ? path.resolve(__dirname, '../../canonical-universities.json')
        : path.resolve(__dirname, '../../frontend/public/data/manual-university-mapping.json');
    const currentMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8')).length;
    
    // Try to load baseline from various sources
    let baseline = null;
    
    if (baselineFile && fs.existsSync(baselineFile)) {
        baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    } else {
        // Try common baseline locations
        const baselinePaths = [
            '/tmp/automation_baseline.json',
            path.resolve(__dirname, '../../baseline.json'),
            path.resolve(__dirname, '../../debug/baseline.json')
        ];
        
        for (const bPath of baselinePaths) {
            if (fs.existsSync(bPath)) {
                baseline = JSON.parse(fs.readFileSync(bPath, 'utf8'));
                console.log(`📁 Using baseline from: ${bPath}`);
                break;
            }
        }
    }
    
    if (!baseline) {
        console.log('⚠️  No baseline found. Creating current state as baseline...');
        baseline = {
            count: currentCount,
            manualMappings: currentMappings,
            timestamp: new Date().toISOString()
        };
        
        const baselinePath = path.resolve(__dirname, '../../baseline.json');
        fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
        console.log(`✅ Baseline saved to: ${baselinePath}`);
        return;
    }
    
    console.log(`📊 Baseline (${new Date(baseline.timestamp).toLocaleDateString()}):`);
    console.log(`   Universities: ${baseline.count}`);
    console.log(`   Manual mappings: ${baseline.manualMappings}`);
    
    console.log(`📊 Current:`);
    console.log(`   Universities: ${currentCount}`);
    console.log(`   Manual mappings: ${currentMappings}`);
    
    const countDiff = currentCount - baseline.count;
    const mappingsDiff = currentMappings - baseline.manualMappings;
    
    console.log(`📈 Changes:`);
    console.log(`   Universities: ${countDiff >= 0 ? '+' : ''}${countDiff}`);
    console.log(`   Manual mappings: ${mappingsDiff >= 0 ? '+' : ''}${mappingsDiff}`);
    
    // Analysis
    if (Math.abs(countDiff) <= 2) {
        console.log(`✅ University count change acceptable (≤2)`);
    } else {
        console.log(`⚠️  University count change significant (>${Math.abs(countDiff)})`);
    }
    
    if (mappingsDiff < 0) {
        console.log(`✅ Manual mappings reduced (automation working)`);
    } else if (mappingsDiff > 0) {
        console.log(`⚠️  Manual mappings increased`);
    }
}

function runHealthCheck() {
    console.log('🏥 COMPREHENSIVE HEALTH CHECK');
    console.log('-' .repeat(40));
    
    const issues = [];
    
    try {
        // 1. Check aggregation runs successfully
        console.log('1. Testing aggregation pipeline...');
        const output = execSync('node scripts/scrape-rankings.js 2>&1', { encoding: 'utf8', timeout: 60000 });
        
        if (output.includes('Error') || output.includes('error')) {
            issues.push('Aggregation contains errors or warnings');
        } else {
            console.log('   ✅ Aggregation runs successfully');
        }
        
        // 2. Check university count
        console.log('2. Validating university count...');
        const count = getCurrentUniversityCount();
        if (count < 1700 || count > 1800) {
            issues.push(`University count outside expected range: ${count}`);
        } else {
            console.log(`   ✅ University count normal: ${count}`);
        }
        
        // 3. Check for duplicates
        console.log('3. Checking for duplicates...');
        const duplicates = findDuplicatesInternal();
        if (duplicates.length > 0) {
            issues.push(`Found ${duplicates.length} duplicate universities`);
        } else {
            console.log('   ✅ No duplicates found');
        }
        
        // 4. Check file integrity
        console.log('4. Checking file integrity...');
        const requiredFiles = useV2
            ? [
                '../../canonical-universities.json',
                '../..//v2-pipeline/orchestrator.js'
            ]
            : [
                '../../frontend/public/data/aggregated-rankings.json',
                '../../frontend/public/data/manual-university-mapping.json',
                '../scrape-rankings.js'
            ];
        
        for (const file of requiredFiles) {
            const fullPath = path.resolve(__dirname, file);
            if (!fs.existsSync(fullPath)) {
                issues.push(`Missing required file: ${file}`);
            } else {
                try {
                    if (file.endsWith('.json')) {
                        JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                    }
                } catch (e) {
                    issues.push(`Corrupted file: ${file}`);
                }
            }
        }
        
        if (issues.length === 0) {
            console.log('   ✅ All required files present and valid');
        }
        
        // 5. Check automation patterns
        console.log('5. Validating automation patterns...');
        const patterns = countAutomationPatterns();
        if (patterns < 5) {
            issues.push(`Low number of automation patterns: ${patterns}`);
        } else {
            console.log(`   ✅ Automation patterns active: ${patterns}`);
        }
        
        // Summary
        console.log('\n📋 HEALTH CHECK SUMMARY');
        console.log('-' .repeat(40));
        
        if (issues.length === 0) {
            console.log('🎉 All checks passed! System is healthy.');
        } else {
            console.log(`⚠️  Found ${issues.length} issue${issues.length === 1 ? '' : 's'}:`);
            issues.forEach((issue, i) => {
                console.log(`   ${i + 1}. ${issue}`);
            });
        }
        
    } catch (error) {
        console.log(`❌ Health check failed: ${error.message}`);
        process.exit(1);
    }
}

function findDuplicates() {
    console.log('🔍 DUPLICATE DETECTION');
    console.log('-' .repeat(40));
    
    const duplicates = findDuplicatesInternal();
    
    if (duplicates.length === 0) {
        console.log('✅ No duplicate universities found');
    } else {
        console.log(`❌ Found ${duplicates.length} duplicate universities:`);
        duplicates.forEach((name, i) => {
            console.log(`   ${i + 1}. "${name}"`);
        });
        
        console.log('\nThis indicates a problem with automation patterns or manual mappings.');
        console.log('Check for conflicting transformations in canonicalizeName() function.');
    }
}

function getCurrentUniversityCount() {
    try {
        const output = execSync('node scripts/scrape-rankings.js 2>&1', { encoding: 'utf8' });
        const countMatch = output.match(/Consolidated data for (\d+) unique universities/);
        return countMatch ? parseInt(countMatch[1]) : null;
    } catch (error) {
        throw new Error(`Failed to get university count: ${error.message}`);
    }
}

function countAutomationPatterns() {
    try {
        const scriptPath = path.resolve(__dirname, '../scrape-rankings.js');
        const content = fs.readFileSync(scriptPath, 'utf8');
        
        // Count automation comments
        const automationLines = content.split('\n').filter(line => 
            line.includes('automation') && line.includes('//')
        );
        
        return automationLines.length;
    } catch (error) {
        return 0;
    }
}

function findDuplicatesInternal() {
    try {
        const aggregatedPath = path.resolve(__dirname, '../../frontend/public/data/aggregated-rankings.json');
        const rankings = JSON.parse(fs.readFileSync(aggregatedPath, 'utf8'));
        
        const nameCount = {};
        rankings.forEach(uni => {
            nameCount[uni.name] = (nameCount[uni.name] || 0) + 1;
        });
        
        return Object.entries(nameCount)
            .filter(([name, count]) => count > 1)
            .map(([name, count]) => name);
            
    } catch (error) {
        throw new Error(`Failed to check for duplicates: ${error.message}`);
    }
}

// Export for use in other scripts
module.exports = {
    getCurrentUniversityCount,
    findDuplicatesInternal,
    countAutomationPatterns
};
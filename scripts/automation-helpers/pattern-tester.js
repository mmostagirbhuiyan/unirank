#!/usr/bin/env node

/**
 * Pattern Testing Helper
 * 
 * Tests automation patterns safely before implementation
 * Validates pattern logic, measures impact, and checks for conflicts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    maxCountChange: 2,        // Maximum acceptable university count change
    testIterations: 3,        // Number of test runs for stability
    backupEnabled: true       // Create backups before testing
};

console.log('🧪 AUTOMATION PATTERN TESTER');
console.log('=' .repeat(60));

// Parse command line arguments
const args = process.argv.slice(2);
const useV2 = args.includes('--v2');
const patternName = args[0] && args[0] !== '--v2' ? args[0] : args[1];
const patternCode = args[1] && args[0] !== '--v2' ? args[1] : args[2];

if (!patternName || !patternCode) {
    console.log('Usage: node pattern-tester.js <pattern-name> <pattern-code>');
    console.log('');
    console.log('Examples:');
    console.log('  node pattern-tester.js "UC Campuses" "cleaned.replace(/^University of California - (.+)$/, \\"University of California $1\\")"');
    console.log('  node pattern-tester.js "Medical University" "cleaned.replace(/^Medical University of (.+)$/, \\"Medical University $1\\")"');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run     Test pattern logic without modifying files');
    console.log('  --no-backup   Skip backup creation');
    console.log('  --verbose     Show detailed output');
    process.exit(1);
}

const isDryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const noBackup = args.includes('--no-backup');

console.log(`📋 Testing Pattern: ${patternName}`);
console.log(`💻 Pattern Code: ${patternCode}`);
console.log(`🔧 Mode: ${isDryRun ? 'DRY RUN' : 'LIVE TEST'}`);
console.log('');

// Step 1: Establish baseline
console.log('📊 STEP 1: ESTABLISHING BASELINE');
console.log('-' .repeat(40));

const baseline = establishBaseline();
console.log(`✅ Baseline: ${baseline.count} universities`);
console.log(`✅ Manual mappings: ${baseline.manualMappings}`);

if (isDryRun) {
    console.log('\n🔍 DRY RUN: Testing pattern logic only...');
    testPatternLogic(patternCode);
    process.exit(0);
}

// Step 2: Create backup (if enabled)
if (!noBackup && CONFIG.backupEnabled) {
    console.log('\n💾 STEP 2: CREATING BACKUP');
    console.log('-' .repeat(40));
    createBackup();
    console.log('✅ Backup created');
}

// Step 3: Test pattern implementation
console.log('\n🧪 STEP 3: TESTING PATTERN IMPLEMENTATION');
console.log('-' .repeat(40));

try {
    // Implement pattern
    implementPattern(patternCode, patternName);
    console.log('✅ Pattern implemented');
    
    // Test aggregation
    const testResults = testAggregation(baseline);
    
    if (testResults.success) {
        console.log('\n🎉 PATTERN TEST SUCCESSFUL!');
        console.log(`✅ University count: ${baseline.count} → ${testResults.count} (${testResults.change >= 0 ? '+' : ''}${testResults.change})`);
        console.log(`✅ Count change within acceptable range: ${Math.abs(testResults.change)} ≤ ${CONFIG.maxCountChange}`);
        
        // Ask user if they want to keep the changes
        console.log('\n🤔 Keep these changes? (y/N): ');
        // In a real implementation, you'd use readline here
        // For now, we'll auto-revert for safety
        console.log('Auto-reverting for safety...');
        revertChanges();
        
    } else {
        console.log('\n❌ PATTERN TEST FAILED!');
        console.log(`❌ University count: ${baseline.count} → ${testResults.count} (${testResults.change >= 0 ? '+' : ''}${testResults.change})`);
        console.log(`❌ Count change exceeds limit: ${Math.abs(testResults.change)} > ${CONFIG.maxCountChange}`);
        
        revertChanges();
    }
    
} catch (error) {
    console.log('\n💥 ERROR DURING TESTING:');
    console.log(error.message);
    revertChanges();
    process.exit(1);
}

function establishBaseline() {
    try {
        // Get current university count
        const baselineCmd = useV2 ? 'node v2-pipeline/orchestrator.js --dry-run' : 'node scripts/scrape-rankings.js';
        const output = execSync(`${baselineCmd} 2>&1`, { encoding: 'utf8' });
        const countMatch = output.match(/Consolidated data for (\d+) unique universities/);
        const count = countMatch ? parseInt(countMatch[1]) : null;
        
        if (!count) {
            throw new Error('Could not extract university count from aggregation output');
        }
        
        // Get manual mappings count
        const mappingsPath = useV2
            ? path.resolve(__dirname, '../../canonical-universities.json')
            : path.resolve(__dirname, '../../frontend/public/data/manual-university-mapping.json');
        const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
        
        // Store baseline for later comparison
        fs.writeFileSync('/tmp/automation_baseline.json', JSON.stringify({
            count,
            manualMappings: mappings.length,
            timestamp: new Date().toISOString()
        }));
        
        return { count, manualMappings: mappings.length };
        
    } catch (error) {
        throw new Error(`Failed to establish baseline: ${error.message}`);
    }
}

function testPatternLogic(patternCode) {
    console.log('\n🔍 TESTING PATTERN LOGIC');
    console.log('-' .repeat(40));
    
    // Load manual mappings to find test cases
    const mappingsPath = useV2
        ? path.resolve(__dirname, '../../canonical-universities.json')
        : path.resolve(__dirname, '../../frontend/public/data/manual-university-mapping.json');
    const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    
    // Create test function
    const testFunction = new Function('cleaned', `return (${patternCode});`);
    
    console.log('Testing pattern against manual mappings...');
    
    let matches = 0;
    let tests = 0;
    
    mappings.slice(0, 20).forEach((mapping, i) => {  // Test first 20 mappings
        try {
            const result = testFunction(mapping.originalName);
            const expected = mapping.suggestedStandardizedName;
            const success = result === expected;
            
            if (verbose || success) {
                console.log(`${success ? '✅' : '❌'} "${mapping.originalName}" → "${result}"`);
                if (!success && verbose) {
                    console.log(`   Expected: "${expected}"`);
                }
            }
            
            if (success) matches++;
            tests++;
            
        } catch (error) {
            console.log(`💥 Error testing "${mapping.originalName}": ${error.message}`);
        }
    });
    
    console.log(`\n📊 Pattern Logic Test Results:`);
    console.log(`✅ Matches: ${matches}/${tests} (${((matches/tests)*100).toFixed(1)}%)`);
    
    if (matches === 0) {
        console.log('⚠️  Warning: Pattern matched 0 test cases - check implementation');
    }
}

function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `/tmp/automation_backup_${timestamp}`;
    
    execSync(`mkdir -p ${backupDir}`);
    if (useV2) {
        execSync(`cp v2-pipeline/orchestrator.js ${backupDir}/`);
        execSync(`cp canonical-universities.json ${backupDir}/`);
    } else {
        execSync(`cp scripts/scrape-rankings.js ${backupDir}/`);
        execSync(`cp frontend/public/data/manual-university-mapping.json ${backupDir}/`);
    }
    
    // Store backup location
    fs.writeFileSync('/tmp/automation_backup_location.txt', backupDir);
}

function implementPattern(patternCode, patternName) {
    const scriptPath = useV2
        ? path.resolve(__dirname, '../../v2-pipeline/orchestrator.js')
        : path.resolve(__dirname, '../scrape-rankings.js');
    let content = fs.readFileSync(scriptPath, 'utf8');
    
    // Find the insertion point (before return statement in canonicalizeName)
    const insertPoint = 'return cleaned;';
    const newPattern = `        // ${patternName} automation (auto-generated test)\n    ${patternCode};\n    `;
    
    if (!content.includes(insertPoint)) {
        throw new Error('Could not find insertion point in canonicalizeName function');
    }
    
    if (content.includes(patternName + ' automation')) {
        throw new Error('Pattern already exists in canonicalizeName function');
    }
    
    content = content.replace(insertPoint, newPattern + insertPoint);
    fs.writeFileSync(scriptPath, content);
}

function testAggregation(baseline) {
    try {
        console.log('Running aggregation with new pattern...');
        
        const cmd = useV2 ? 'node v2-pipeline/orchestrator.js --dry-run' : 'node scripts/scrape-rankings.js';
        const output = execSync(`${cmd} 2>&1`, {
            encoding: 'utf8',
            timeout: 60000  // 60 second timeout
        });
        
        const countMatch = output.match(/Consolidated data for (\d+) unique universities/);
        const count = countMatch ? parseInt(countMatch[1]) : null;
        
        if (!count) {
            throw new Error('Could not extract university count from test aggregation');
        }
        
        const change = count - baseline.count;
        const success = Math.abs(change) <= CONFIG.maxCountChange;
        
        // Check for errors in output
        if (output.includes('Error') || output.includes('error')) {
            console.log('⚠️  Warnings/errors in aggregation output:');
            const lines = output.split('\n').filter(line => 
                line.toLowerCase().includes('error') || line.toLowerCase().includes('warning')
            );
            lines.forEach(line => console.log(`   ${line}`));
        }
        
        return { count, change, success, output };
        
    } catch (error) {
        throw new Error(`Aggregation test failed: ${error.message}`);
    }
}

function revertChanges() {
    console.log('\n🔄 REVERTING CHANGES');
    console.log('-' .repeat(40));
    
    try {
        // Restore from git
        if (useV2) {
            execSync('git checkout HEAD -- v2-pipeline/orchestrator.js');
            execSync('git checkout HEAD -- canonical-universities.json');
        } else {
            execSync('git checkout HEAD -- scripts/scrape-rankings.js');
            execSync('git checkout HEAD -- frontend/public/data/manual-university-mapping.json');
        }
        
        console.log('✅ Files restored from git');
        
        // Verify restoration
        const restoredBaseline = establishBaseline();
        console.log(`✅ Restored state: ${restoredBaseline.count} universities`);
        
        // Clean up temp files
        try {
            fs.unlinkSync('/tmp/automation_baseline.json');
            fs.unlinkSync('/tmp/automation_backup_location.txt');
        } catch (e) {
            // Ignore cleanup errors
        }
        
    } catch (error) {
        console.log(`❌ Error during revert: ${error.message}`);
        console.log('Manual restoration may be required');
    }
}

// Additional helper functions
function analyzePatternImpact(patternCode) {
    // Could analyze which mappings would be affected by the pattern
    // Useful for understanding impact before implementation
}

function validatePatternSafety(patternCode) {
    // Could check for dangerous regex patterns or code
    // Security validation for user-provided patterns
}

// Export functions for use in other scripts
module.exports = {
    establishBaseline,
    testPatternLogic,
    implementPattern,
    testAggregation,
    revertChanges
};
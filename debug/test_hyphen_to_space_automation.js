const fs = require('fs');
const { execSync } = require('child_process');

// Step 1: Count current state before automation
function getCurrentState() {
    console.log('=== STEP 1: BASELINE ANALYSIS ===');
    
    // Run aggregation to get current counts
    const aggregatedData = JSON.parse(fs.readFileSync('frontend/public/data/aggregated-rankings.json', 'utf8'));
    const totalSchools = aggregatedData.length;
    console.log(`Current total schools in aggregated data: ${totalSchools}`);
    
    // Get current manual mapping
    const manualMapping = JSON.parse(fs.readFileSync('frontend/public/data/manual-university-mapping.json', 'utf8'));
    
    // Find hyphen_to_space mappings
    const hyphenToSpaceMappings = manualMapping.filter(mapping => {
        const original = mapping.originalName;
        const suggested = mapping.suggestedStandardizedName;
        return original.includes('-') && suggested === original.replace(/-/g, ' ');
    });
    
    console.log(`\nFound ${hyphenToSpaceMappings.length} "hyphen to space" mappings to automate:`);
    hyphenToSpaceMappings.forEach(mapping => {
        console.log(`  "${mapping.originalName}" -> "${mapping.suggestedStandardizedName}"`);
    });
    
    return {
        totalSchools,
        hyphenToSpaceMappings,
        originalManualMapping: manualMapping
    };
}

// Step 2: Add automation rule to canonicalizeName function
function addHyphenToSpaceRule() {
    console.log('\n=== STEP 2: ADDING AUTOMATION RULE ===');
    
    const scrapeRankingsPath = 'scripts/scrape-rankings.js';
    let content = fs.readFileSync(scrapeRankingsPath, 'utf8');
    
    // Check if rule already exists
    if (content.includes('hyphen to space automation')) {
        console.log('Hyphen to space automation rule already exists!');
        return false;
    }
    
    // Find the canonicalizeName function and locate where to add our rule
    const functionStart = content.indexOf('function canonicalizeName(name)');
    if (functionStart === -1) {
        console.error('Could not find canonicalizeName function');
        return false;
    }
    
    // Find the return statement in canonicalizeName
    const functionEnd = content.indexOf('return cleaned;', functionStart);
    if (functionEnd === -1) {
        console.error('Could not find return statement in canonicalizeName');
        return false;
    }
    
    // Add our rule just before the return statement
    const newRule = `    // Hyphen to space automation (e.g., "University of Wisconsin-Madison" -> "University of Wisconsin Madison")
    cleaned = cleaned.replace(/-/g, ' ');
    `;
    
    const updatedContent = content.slice(0, functionEnd) + 
                          newRule + 
                          content.slice(functionEnd);
    
    fs.writeFileSync(scrapeRankingsPath, updatedContent);
    console.log('Added hyphen to space automation rule to canonicalizeName function');
    return true;
}

// Step 3: Comment out affected mappings
function commentOutMappings(hyphenToSpaceMappings) {
    console.log('\n=== STEP 3: TEMPORARILY COMMENTING OUT MAPPINGS ===');
    
    const manualMapping = JSON.parse(fs.readFileSync('frontend/public/data/manual-university-mapping.json', 'utf8'));
    const indicesToComment = hyphenToSpaceMappings.map(mapping => 
        manualMapping.findIndex(m => m.originalName === mapping.originalName)
    );
    
    // Create backup
    fs.writeFileSync('frontend/public/data/manual-university-mapping.json.backup', 
                    JSON.stringify(manualMapping, null, 2));
    
    // Remove the hyphen_to_space mappings temporarily
    const filteredMapping = manualMapping.filter((mapping, index) => 
        !indicesToComment.includes(index)
    );
    
    fs.writeFileSync('frontend/public/data/manual-university-mapping.json', 
                    JSON.stringify(filteredMapping, null, 2));
    
    console.log(`Commented out ${indicesToComment.length} mappings`);
    return indicesToComment;
}

// Step 4: Test aggregation
function testAggregation() {
    console.log('\n=== STEP 4: TESTING AGGREGATION ===');
    
    try {
        // Run the aggregation
        execSync('node scripts/aggregation.js', { encoding: 'utf8' });
        
        // Check results
        const newAggregatedData = JSON.parse(fs.readFileSync('frontend/public/data/aggregated-rankings.json', 'utf8'));
        const newTotalSchools = newAggregatedData.length;
        
        console.log(`New total schools: ${newTotalSchools}`);
        return { success: true, newTotalSchools };
    } catch (error) {
        console.error('Aggregation failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Step 5: Restore or commit changes
function finalizeChanges(success, originalTotalSchools, newTotalSchools, commentedIndices) {
    console.log('\n=== STEP 5: FINALIZING CHANGES ===');
    
    if (success && Math.abs(originalTotalSchools - newTotalSchools) <= 1) {
        console.log('✅ Test successful! School count is stable.');
        console.log('Permanently removing automated mappings from manual file...');
        
        // Keep the filtered mapping (already saved in step 3)
        fs.unlinkSync('frontend/public/data/manual-university-mapping.json.backup');
        console.log('✅ Changes committed successfully!');
        return true;
    } else {
        console.log('❌ Test failed or significant school count change detected.');
        console.log('Restoring original manual mapping...');
        
        // Restore backup
        const backup = fs.readFileSync('frontend/public/data/manual-university-mapping.json.backup', 'utf8');
        fs.writeFileSync('frontend/public/data/manual-university-mapping.json', backup);
        fs.unlinkSync('frontend/public/data/manual-university-mapping.json.backup');
        
        // Remove the automation rule
        const scrapeRankingsPath = 'scripts/scrape-rankings.js';
        let content = fs.readFileSync(scrapeRankingsPath, 'utf8');
        content = content.replace(/\s*\/\/ Hyphen to space automation.*\n.*cleaned = cleaned\.replace.*\n/, '');
        fs.writeFileSync(scrapeRankingsPath, content);
        
        console.log('❌ Changes rolled back.');
        return false;
    }
}

// Main test function
function runFullTest() {
    console.log('🧪 COMPREHENSIVE HYPHEN TO SPACE AUTOMATION TEST\n');
    
    const baseline = getCurrentState();
    const ruleAdded = addHyphenToSpaceRule();
    
    if (!ruleAdded) {
        console.log('❌ Could not add automation rule. Exiting.');
        return;
    }
    
    const commentedIndices = commentOutMappings(baseline.hyphenToSpaceMappings);
    const testResult = testAggregation();
    
    const success = finalizeChanges(
        testResult.success, 
        baseline.totalSchools, 
        testResult.newTotalSchools || 0, 
        commentedIndices
    );
    
    console.log('\n=== FINAL RESULT ===');
    if (success) {
        console.log('🎉 Hyphen to space automation successfully implemented!');
        console.log(`✅ ${baseline.hyphenToSpaceMappings.length} mappings automated`);
        console.log(`✅ Total schools: ${baseline.totalSchools} -> ${testResult.newTotalSchools}`);
    } else {
        console.log('💥 Automation test failed and was rolled back.');
    }
}

runFullTest(); 
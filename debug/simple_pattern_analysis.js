const fs = require('fs');

function analyzeSimplePatterns() {
    const manualMapping = JSON.parse(fs.readFileSync('frontend/public/data/manual-university-mapping.json', 'utf8'));
    
    const patterns = {
        'and_to_ampersand': [],
        'at_location_removal': [],
        'hyphen_to_space': [],
        'the_prefix_removal': [],
        'medical_sciences_singular': []
    };
    
    manualMapping.forEach((mapping, index) => {
        const original = mapping.originalName;
        const suggested = mapping.suggestedStandardizedName;
        
        // Pattern 1: "and" to "&" - very simple and safe
        if (original.includes(' and ') && suggested === original.replace(/ and /g, ' & ')) {
            patterns.and_to_ampersand.push({original, suggested, index});
        }
        
        // Pattern 2: Remove " at [location]" - safe for US universities
        const atPattern = /^(.+) at (.+)$/;
        const match = original.match(atPattern);
        if (match && suggested === `${match[1]} ${match[2]}`) {
            patterns.at_location_removal.push({original, suggested, index});
        }
        
        // Pattern 3: Replace all hyphens with spaces - simple
        if (original.includes('-') && suggested === original.replace(/-/g, ' ')) {
            patterns.hyphen_to_space.push({original, suggested, index});
        }
        
        // Pattern 4: Remove "The " prefix
        if (original.startsWith('The ') && suggested === original.slice(4)) {
            patterns.the_prefix_removal.push({original, suggested, index});
        }
        
        // Pattern 5: Medical Sciences -> Medical Science
        if (original.includes('Medical Sciences') && suggested === original.replace('Medical Sciences', 'Medical Science')) {
            patterns.medical_sciences_singular.push({original, suggested, index});
        }
    });
    
    // Report findings
    console.log('\n=== SIMPLE PATTERN ANALYSIS ===');
    Object.entries(patterns).forEach(([pattern, matches]) => {
        if (matches.length > 0) {
            console.log(`\n${pattern}: ${matches.length} occurrences`);
            matches.forEach(({original, suggested}) => {
                console.log(`  "${original}" -> "${suggested}"`);
            });
        }
    });
    
    // Find best candidate
    const candidates = Object.entries(patterns)
        .filter(([pattern, matches]) => matches.length >= 2)
        .sort(([,a], [,b]) => b.length - a.length);
    
    if (candidates.length > 0) {
        const [bestPattern, bestMatches] = candidates[0];
        console.log(`\n=== BEST AUTOMATION CANDIDATE ===`);
        console.log(`Pattern: ${bestPattern} (${bestMatches.length} occurrences)`);
        
        return {
            pattern: bestPattern,
            count: bestMatches.length,
            examples: bestMatches
        };
    }
    
    return null;
}

const result = analyzeSimplePatterns();
if (result) {
    fs.writeFileSync('debug/simple_pattern_result.json', JSON.stringify(result, null, 2));
    console.log('\nResult saved to debug/simple_pattern_result.json');
} 
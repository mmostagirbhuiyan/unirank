const fs = require('fs');

function analyzePatterns() {
    const manualMapping = JSON.parse(fs.readFileSync('frontend/public/data/manual-university-mapping.json', 'utf8'));
    
    const patterns = {
        'hyphen_to_space': [],
        'at_location_removal': [],
        'dash_separator_removal': [],
        'medical_sciences_standardization': [],
        'university_location_flip': [],
        'accent_removal': [],
        'the_prefix_removal': [],
        'state_university_patterns': [],
        'foreign_language_standardization': [],
        'and_to_ampersand': []
    };
    
    const ruleCounters = {};
    
    manualMapping.forEach((mapping, index) => {
        const original = mapping.originalName;
        const suggested = mapping.suggestedStandardizedName;
        
        // Track hyphen to space conversions
        if (original.includes('-') && suggested === original.replace(/-/g, ' ')) {
            patterns.hyphen_to_space.push({original, suggested, index});
            ruleCounters['hyphen_to_space'] = (ruleCounters['hyphen_to_space'] || 0) + 1;
        }
        
        // Track "at [location]" removal
        if (original.includes(' at ') && suggested === original.replace(/ at [^,]+/g, '')) {
            patterns.at_location_removal.push({original, suggested, index});
            ruleCounters['at_location_removal'] = (ruleCounters['at_location_removal'] || 0) + 1;
        }
        
        // Track dash separator removal (e.g., " - ")
        if (original.includes(' - ') && suggested === original.replace(/ - .+$/, '')) {
            patterns.dash_separator_removal.push({original, suggested, index});
            ruleCounters['dash_separator_removal'] = (ruleCounters['dash_separator_removal'] || 0) + 1;
        }
        
        // Track Medical Sciences -> Medical Science
        if (original.includes('Medical Sciences') && suggested === original.replace('Medical Sciences', 'Medical Science')) {
            patterns.medical_sciences_standardization.push({original, suggested, index});
            ruleCounters['medical_sciences_standardization'] = (ruleCounters['medical_sciences_standardization'] || 0) + 1;
        }
        
        // Track University of [Location] -> [Location] University flips
        const uniOfPattern = /^University of (.+)$/;
        const originalMatch = original.match(uniOfPattern);
        if (originalMatch && suggested === `${originalMatch[1]} University`) {
            patterns.university_location_flip.push({original, suggested, index});
            ruleCounters['university_location_flip'] = (ruleCounters['university_location_flip'] || 0) + 1;
        }
        
        // Track accent removal
        const withoutAccents = original.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (original !== withoutAccents && suggested === withoutAccents) {
            patterns.accent_removal.push({original, suggested, index});
            ruleCounters['accent_removal'] = (ruleCounters['accent_removal'] || 0) + 1;
        }
        
        // Track "The " prefix removal
        if (original.startsWith('The ') && suggested === original.slice(4)) {
            patterns.the_prefix_removal.push({original, suggested, index});
            ruleCounters['the_prefix_removal'] = (ruleCounters['the_prefix_removal'] || 0) + 1;
        }
        
        // Track State University patterns
        if (original.includes('State University of New York at ') && 
            suggested.includes('University') && !suggested.includes('State University of New York')) {
            patterns.state_university_patterns.push({original, suggested, index});
            ruleCounters['state_university_patterns'] = (ruleCounters['state_university_patterns'] || 0) + 1;
        }
        
        // Track "and" to "&" conversions
        if (original.includes(' and ') && suggested === original.replace(/ and /g, ' & ')) {
            patterns.and_to_ampersand.push({original, suggested, index});
            ruleCounters['and_to_ampersand'] = (ruleCounters['and_to_ampersand'] || 0) + 1;
        }
        
        // Track foreign language standardizations (broad pattern)
        const foreignPatterns = [
            {from: 'University', to: 'Universite'},
            {from: 'University', to: 'Universidad'},
            {from: 'University', to: 'Universidade'},
            {from: 'University', to: 'Universiti'},
            {from: 'München', to: 'Munich'},
            {from: 'Göttingen', to: 'Gottingen'}
        ];
        
        foreignPatterns.forEach(pattern => {
            if (original.includes(pattern.from) && suggested.includes(pattern.to)) {
                patterns.foreign_language_standardization.push({original, suggested, index, pattern});
                ruleCounters['foreign_language_standardization'] = (ruleCounters['foreign_language_standardization'] || 0) + 1;
            }
        });
    });
    
    // Sort by frequency
    const sortedRules = Object.entries(ruleCounters)
        .sort(([,a], [,b]) => b - a)
        .map(([rule, count]) => ({rule, count}));
    
    console.log('\n=== PATTERN FREQUENCY ANALYSIS ===');
    sortedRules.forEach(({rule, count}) => {
        console.log(`${rule}: ${count} occurrences`);
    });
    
    console.log('\n=== TOP AUTOMATION CANDIDATES ===');
    
    // Find the most frequent pattern that's not already automated
    const topCandidate = sortedRules[0];
    if (topCandidate && topCandidate.count >= 3) {
        console.log(`\nTOP CANDIDATE: ${topCandidate.rule} (${topCandidate.count} occurrences)`);
        console.log('Examples:');
        patterns[topCandidate.rule].slice(0, 5).forEach(({original, suggested}) => {
            console.log(`  "${original}" -> "${suggested}"`);
        });
        
        return {
            topPattern: topCandidate.rule,
            count: topCandidate.count,
            examples: patterns[topCandidate.rule]
        };
    }
    
    return null;
}

// Run analysis
const result = analyzePatterns();
if (result) {
    fs.writeFileSync('debug/pattern_analysis_result.json', JSON.stringify(result, null, 2));
    console.log('\nPattern analysis saved to debug/pattern_analysis_result.json');
} else {
    console.log('\nNo clear automation candidate found');
} 
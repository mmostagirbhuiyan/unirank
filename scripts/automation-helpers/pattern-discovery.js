#!/usr/bin/env node

/**
 * Pattern Discovery Helper
 * 
 * Analyzes manual university mappings to identify automation opportunities
 * Provides frequency analysis, risk assessment, and implementation suggestions
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    minFrequency: 3,           // Minimum occurrences to consider
    riskThresholds: {
        veryLow: 0.95,        // Very specific patterns
        low: 0.85,            // Common patterns
        medium: 0.70          // Context-dependent patterns
    }
};

console.log('🔍 UNIVERSITY NAME PATTERN DISCOVERY TOOL');
console.log('=' .repeat(60));

// Load manual mappings
const mappingsPath = path.resolve(__dirname, '../../frontend/public/data/manual-university-mapping.json');
const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));

console.log(`📋 Analyzing ${mappings.length} manual mappings...\n`);

// Pattern detection functions
const patterns = {
    // Very Low Risk Patterns (≥95% specificity)
    ucSystemCampuses: {
        name: 'UC System Campus Names',
        risk: 'VERY_LOW',
        test: (orig, sugg) => {
            const ucPattern = /^University of California - (.+)$/;
            const match = orig.match(ucPattern);
            return match && sugg === `University of California ${match[1]}`;
        },
        implementation: 'cleaned = cleaned.replace(/^University of California - (.+)$/, "University of California $1");',
        description: 'University of California - [Campus] → University of California [Campus]'
    },

    medicalUniversityOf: {
        name: 'Medical University Of Pattern',
        risk: 'LOW',
        test: (orig, sugg) => {
            const pattern = /^Medical University of (.+)$/;
            const match = orig.match(pattern);
            return match && sugg === `Medical University ${match[1]}`;
        },
        implementation: 'cleaned = cleaned.replace(/^Medical University of (.+)$/, "Medical University $1");',
        description: 'Medical University of [City] → Medical University [City]'
    },

    // Low Risk Patterns (≥85% specificity)
    hyphenToSpace: {
        name: 'Hyphen to Space Normalization',
        risk: 'LOW',
        test: (orig, sugg) => {
            const normalized = orig.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
            return normalized === sugg.replace(/\s+/g, ' ').trim();
        },
        implementation: 'cleaned = cleaned.replace(/-/g, " ").replace(/\\s+/g, " ").trim();',
        description: 'Replace hyphens with spaces'
    },

    thePrefix: {
        name: 'The Prefix Removal',
        risk: 'LOW',
        test: (orig, sugg) => {
            return orig.startsWith('The ') && sugg === orig.substring(4);
        },
        implementation: 'cleaned = cleaned.replace(/^The /, "");',
        description: 'Remove "The" prefix from university names'
    },

    andAmpersand: {
        name: 'And/Ampersand Standardization',
        risk: 'LOW',
        test: (orig, sugg) => {
            const withAmpersand = orig.replace(/ and /g, ' & ');
            const withAnd = orig.replace(/ & /g, ' and ');
            return sugg === withAmpersand || sugg === withAnd;
        },
        implementation: 'cleaned = cleaned.replace(/ and /g, " & ");',
        description: 'Standardize "and" to "&" or vice versa'
    },

    medicalSciencesPlural: {
        name: 'Medical Sciences Normalization',
        risk: 'VERY_LOW',
        test: (orig, sugg) => {
            return (orig.includes('Medical Sciences') && sugg === orig.replace(/Medical Sciences/g, 'Medical Science')) ||
                   (orig.includes('Medical Science') && sugg === orig.replace(/Medical Science/g, 'Medical Sciences'));
        },
        implementation: 'cleaned = cleaned.replace(/Medical Sciences/g, "Medical Science");',
        description: 'Standardize Medical Sciences/Science'
    },

    atLocationRemoval: {
        name: 'At Location Preposition',
        risk: 'LOW',
        test: (orig, sugg) => {
            const pattern = /^(.+) at (.+)$/;
            const match = orig.match(pattern);
            return match && sugg === `${match[1]} ${match[2]}`;
        },
        implementation: 'cleaned = cleaned.replace(/^(.+) at (.+)$/, "$1 $2");',
        description: 'Remove "at" preposition: "University at Location" → "University Location"'
    },

    // Medium Risk Patterns (≥70% specificity)
    ofPrepositionHandling: {
        name: 'Of Preposition Addition/Removal',
        risk: 'MEDIUM',
        test: (orig, sugg) => {
            const withoutOf = orig.replace(/\bof\b/g, '').replace(/\s+/g, ' ').trim();
            const suggWithoutOf = sugg.replace(/\bof\b/g, '').replace(/\s+/g, ' ').trim();
            return withoutOf === suggWithoutOf && orig !== sugg;
        },
        implementation: '// Manual review required - context dependent',
        description: 'Add or remove "of" preposition (requires careful analysis)'
    },

    universityVariations: {
        name: 'University Language Variations',
        risk: 'MEDIUM',
        test: (orig, sugg) => {
            const normalize = (str) => str.toLowerCase()
                .replace(/universit[éèêë]/g, 'university')
                .replace(/université/g, 'university')
                .replace(/universita/g, 'university')
                .replace(/universiti/g, 'university')
                .replace(/universidad/g, 'university')
                .replace(/universidade/g, 'university');
            return normalize(orig) === normalize(sugg);
        },
        implementation: '// Complex - multiple language mappings needed',
        description: 'Standardize university variations across languages'
    },

    // Diacritics and character normalization
    diacriticsNormalization: {
        name: 'Diacritics Removal',
        risk: 'LOW',
        test: (orig, sugg) => {
            const removeDiacritics = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return removeDiacritics(orig.toLowerCase()) === removeDiacritics(sugg.toLowerCase()) && orig !== sugg;
        },
        implementation: 'cleaned = cleaned.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");',
        description: 'Remove diacritical marks from characters'
    }
};

// Analyze each pattern
console.log('🔍 PATTERN ANALYSIS RESULTS');
console.log('=' .repeat(60));

const results = {};
Object.entries(patterns).forEach(([key, pattern]) => {
    results[key] = {
        name: pattern.name,
        risk: pattern.risk,
        description: pattern.description,
        implementation: pattern.implementation,
        matches: [],
        count: 0
    };
});

// Test each mapping against all patterns
mappings.forEach((mapping, index) => {
    const { originalName, suggestedStandardizedName } = mapping;
    
    Object.entries(patterns).forEach(([key, pattern]) => {
        if (pattern.test(originalName, suggestedStandardizedName)) {
            results[key].matches.push({
                index: index + 1,
                original: originalName,
                suggested: suggestedStandardizedName
            });
            results[key].count++;
        }
    });
});

// Sort by count and filter for actionable patterns
const actionablePatterns = Object.entries(results)
    .filter(([, pattern]) => pattern.count >= CONFIG.minFrequency)
    .sort(([, a], [, b]) => b.count - a.count);

const lowValuePatterns = Object.entries(results)
    .filter(([, pattern]) => pattern.count > 0 && pattern.count < CONFIG.minFrequency)
    .sort(([, a], [, b]) => b.count - a.count);

// Display actionable patterns
if (actionablePatterns.length > 0) {
    console.log(`\n🎯 ACTIONABLE PATTERNS (≥${CONFIG.minFrequency} occurrences):`);
    console.log('=' .repeat(60));

    actionablePatterns.forEach(([key, pattern]) => {
        const riskColor = pattern.risk === 'VERY_LOW' ? '🟢🟢' : 
                         pattern.risk === 'LOW' ? '🟢' : 
                         pattern.risk === 'MEDIUM' ? '🟡' : '🔴';
        
        console.log(`\n${riskColor} ${pattern.name} (${pattern.risk} RISK)`);
        console.log(`   Count: ${pattern.count} mappings`);
        console.log(`   Description: ${pattern.description}`);
        console.log(`   Implementation: ${pattern.implementation}`);
        
        if (pattern.count <= 10) {
            console.log('   Examples:');
            pattern.matches.slice(0, 5).forEach((match, i) => {
                console.log(`   ${i + 1}. "${match.original}" → "${match.suggested}"`);
            });
        } else {
            console.log('   Sample Examples:');
            pattern.matches.slice(0, 3).forEach((match, i) => {
                console.log(`   ${i + 1}. "${match.original}" → "${match.suggested}"`);
            });
            console.log(`   ... and ${pattern.count - 3} more`);
        }
    });
}

// Display low-value patterns for reference
if (lowValuePatterns.length > 0) {
    console.log(`\n🔍 LOW-FREQUENCY PATTERNS (<${CONFIG.minFrequency} occurrences):`);
    console.log('=' .repeat(60));

    lowValuePatterns.forEach(([key, pattern]) => {
        console.log(`\n• ${pattern.name}: ${pattern.count} occurrence${pattern.count === 1 ? '' : 's'}`);
        if (pattern.count <= 3) {
            pattern.matches.forEach((match, i) => {
                console.log(`  ${i + 1}. "${match.original}" → "${match.suggested}"`);
            });
        }
    });
}

// Implementation recommendations
console.log(`\n\n🚀 IMPLEMENTATION RECOMMENDATIONS`);
console.log('=' .repeat(60));

const veryLowRisk = actionablePatterns.filter(([, p]) => p.risk === 'VERY_LOW');
const lowRisk = actionablePatterns.filter(([, p]) => p.risk === 'LOW');
const mediumRisk = actionablePatterns.filter(([, p]) => p.risk === 'MEDIUM');

if (veryLowRisk.length > 0) {
    console.log('\n🟢🟢 IMMEDIATE IMPLEMENTATION (Very Low Risk):');
    veryLowRisk.forEach(([key, pattern]) => {
        console.log(`✅ ${pattern.name} (${pattern.count} mappings)`);
        console.log(`   Code: ${pattern.implementation}`);
    });
}

if (lowRisk.length > 0) {
    console.log('\n🟢 RECOMMENDED IMPLEMENTATION (Low Risk):');
    lowRisk.forEach(([key, pattern]) => {
        console.log(`⚡ ${pattern.name} (${pattern.count} mappings)`);
        console.log(`   Code: ${pattern.implementation}`);
    });
}

if (mediumRisk.length > 0) {
    console.log('\n🟡 CAREFUL IMPLEMENTATION (Medium Risk):');
    mediumRisk.forEach(([key, pattern]) => {
        console.log(`⚠️  ${pattern.name} (${pattern.count} mappings)`);
        console.log(`   Requires extensive testing and manual review`);
    });
}

// Summary statistics
const totalAutomatable = actionablePatterns.reduce((sum, [, p]) => sum + p.count, 0);
const veryLowRiskCount = veryLowRisk.reduce((sum, [, p]) => sum + p.count, 0);

console.log(`\n\n📊 AUTOMATION POTENTIAL SUMMARY`);
console.log('=' .repeat(60));
console.log(`Total manual mappings: ${mappings.length}`);
console.log(`Actionable patterns: ${actionablePatterns.length}`);
console.log(`Total automatable mappings: ${totalAutomatable} (${((totalAutomatable / mappings.length) * 100).toFixed(1)}%)`);
console.log(`Very low risk mappings: ${veryLowRiskCount} (${((veryLowRiskCount / mappings.length) * 100).toFixed(1)}%)`);

if (actionablePatterns.length > 0) {
    console.log(`\n🎯 NEXT STEPS:`);
    console.log('1. Start with very low risk patterns');
    console.log('2. Use scripts/automation-helpers/pattern-tester.js to validate');
    console.log('3. Follow the implementation workflow in docs/AUTOMATION_WORKFLOW_GUIDE.md');
    console.log('4. Test one pattern at a time');
} else {
    console.log(`\n💡 No high-frequency patterns found.`);
    console.log('Current automation may already be near optimal.');
}

// Generate pattern-specific test scripts
if (process.argv.includes('--generate-tests')) {
    console.log(`\n🧪 GENERATING PATTERN TEST SCRIPTS...`);
    
    actionablePatterns.forEach(([key, pattern]) => {
        const testScript = generateTestScript(key, pattern);
        const testPath = path.resolve(__dirname, `../debug/test_${key}_pattern.js`);
        fs.writeFileSync(testPath, testScript);
        console.log(`✅ Created: ${testPath}`);
    });
}

function generateTestScript(patternKey, pattern) {
    return `#!/usr/bin/env node
/**
 * Auto-generated test for ${pattern.name}
 * Generated by pattern-discovery.js
 */

console.log('🧪 TESTING ${pattern.name.toUpperCase()}');
console.log('=' .repeat(60));

const testCases = [
${pattern.matches.slice(0, 5).map(match => 
    `    { input: '${match.original}', expected: '${match.suggested}' }`
).join(',\n')}
];

// Test pattern logic
testCases.forEach((test, i) => {
    // TODO: Implement pattern logic here
    const result = applyPattern(test.input);
    const success = result === test.expected;
    console.log(\`\${i + 1}. \${success ? '✅' : '❌'} "\${test.input}" → "\${result}"\`);
    if (!success) {
        console.log(\`   Expected: "\${test.expected}"\`);
    }
});

function applyPattern(input) {
    // TODO: Implement pattern transformation
    // ${pattern.implementation}
    return input;
}
`;
}
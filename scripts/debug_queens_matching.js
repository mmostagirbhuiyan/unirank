const EnhancedNameMatcher = require('./enhanced_name_matcher');
const stringSimilarity = require('string-similarity');

const matcher = new EnhancedNameMatcher();

function testNormalization(name) {
    const result = matcher.normalizeUniversityName(name);
    console.log(`Original: "${name}"`);
    console.log(`Normalized: "${result.normalized}"`);
    console.log(`Transformations: ${JSON.stringify(result.transformations, null, 2)}\n`);
    return result.normalized;
}

function testSimilarity(name1, name2) {
    const normalized1 = matcher.normalizeUniversityName(name1).normalized;
    const normalized2 = matcher.normalizeUniversityName(name2).normalized;
    const similarity = stringSimilarity.compareTwoStrings(
        normalized1.toLowerCase(),
        normalized2.toLowerCase()
    );
    console.log(`Comparing: "${name1}" and "${name2}"`);
    console.log(`Normalized 1: "${normalized1}"`);
    console.log(`Normalized 2: "${normalized2}"`);
    console.log(`Similarity: ${(similarity * 100).toFixed(2)}%\n`);
}

async function runTests() {
    console.log('--- Normalization Tests ---');
    const queens1 = testNormalization("Queen's University");
    const queens2 = testNormalization("Queens University - Canada");
    const queens3 = testNormalization("queen's");
    const queens4 = testNormalization("Queens University Belfast");

    console.log('--- Similarity Tests ---');
    testSimilarity("Queen's University", "Queens University - Canada");
    testSimilarity("Queen's University", "queen's");
    testSimilarity("Queen's University", "Queens University Belfast");
    testSimilarity("Queens University - Canada", "Queens University Belfast");
}

runTests(); 
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read and parse CSV files
function parseCSV(filePath, isCommented = false) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (isCommented) {
        // Skip comment lines that start with #
        const dataLines = lines.filter(line => !line.trim().startsWith('#') && line.trim());
        return dataLines.map(line => {
            // Parse CSV with comma separation
            const parts = line.split(',').map(part => part.trim());
            if (parts.length >= 3) {
                return {
                    rank: parts[0],
                    name: parts[1],
                    country: parts[2]
                };
            }
            return null;
        }).filter(item => item && item.name);
    } else {
        // Regular CSV parsing
        const headers = lines[0].split(',');
        return lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((header, index) => {
                obj[header.trim()] = values[index] ? values[index].trim() : '';
            });
            return obj;
        }).filter(item => item.University || item.name);
    }
}

// Normalize university names for comparison
function normalizeUniversityName(name) {
    if (!name) return '';
    
    return name
        .toLowerCase()
        .replace(/[^\w\s&-]/g, '') // Remove special chars except &, -, space
        .replace(/\s+/g, ' ')
        .replace(/\b(the|university|of|at|in)\b/g, '') // Remove common words
        .replace(/\s+/g, ' ')
        .trim();
}

// Find potential matches between sources
function findPotentialMatches(source1, source2, source1Name, source2Name) {
    const matches = [];
    const unmatchedSource1 = [];
    const unmatchedSource2 = [];
    
    const source2Map = new Map();
    source2.forEach(item => {
        const normalized = normalizeUniversityName(item.name || item.Institution);
        if (!source2Map.has(normalized)) {
            source2Map.set(normalized, []);
        }
        source2Map.get(normalized).push(item);
    });
    
    source1.forEach(item1 => {
        const name1 = item1.University || item1.name || item1.Institution;
        const normalized1 = normalizeUniversityName(name1);
        
        let found = false;
        
        // Check for exact normalized match
        if (source2Map.has(normalized1)) {
            found = true;
            matches.push({
                source1: source1Name,
                source2: source2Name,
                name1: name1,
                name2: source2Map.get(normalized1)[0].name || source2Map.get(normalized1)[0].Institution,
                matchType: 'exact'
            });
        } else {
            // Check for partial matches
            for (let [normalized2, items] of source2Map.entries()) {
                const similarity = calculateSimilarity(normalized1, normalized2);
                if (similarity > 0.8 && similarity < 1.0) {
                    found = true;
                    matches.push({
                        source1: source1Name,
                        source2: source2Name,
                        name1: name1,
                        name2: items[0].name || items[0].Institution,
                        matchType: 'partial',
                        similarity: similarity
                    });
                    break;
                }
            }
        }
        
        if (!found) {
            unmatchedSource1.push(name1);
        }
    });
    
    return { matches, unmatchedSource1, unmatchedSource2 };
}

// Calculate similarity between two strings
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Check for specific naming patterns
function identifyNamingPatterns(names) {
    const patterns = {
        stateUniversityVariations: [],
        medicalCenterVariations: [],
        instituteTechnologyVariations: [],
        andVsAmpersand: [],
        internationalNames: [],
        thePrefix: [],
        locationVariations: []
    };
    
    names.forEach(name => {
        const lower = name.toLowerCase();
        
        // State University vs University of State
        if (lower.includes('state university') || lower.includes('university of')) {
            patterns.stateUniversityVariations.push(name);
        }
        
        // Medical centers and health sciences
        if (lower.includes('medical') || lower.includes('health')) {
            patterns.medicalCenterVariations.push(name);
        }
        
        // Institute vs Technology variations
        if (lower.includes('institute') && lower.includes('technology')) {
            patterns.instituteTechnologyVariations.push(name);
        }
        
        // "and" vs "&"
        if (lower.includes(' and ') || lower.includes(' & ')) {
            patterns.andVsAmpersand.push(name);
        }
        
        // International/non-English names
        if (/[àáâäåæçèéêëìíîïñòóôöøùúûüý]/i.test(name)) {
            patterns.internationalNames.push(name);
        }
        
        // "The" prefix
        if (lower.startsWith('the ')) {
            patterns.thePrefix.push(name);
        }
        
        // Location variations (at, in, of)
        if (lower.includes(' at ') || lower.includes(' in ') || lower.includes(' - ')) {
            patterns.locationVariations.push(name);
        }
    });
    
    return patterns;
}

// Main analysis function
async function analyzeRemainingMismatches() {
    console.log('=== REMAINING MISMATCH ANALYSIS ===\n');
    
    try {
        // Read all ranking sources
        const dataPath = '/Users/mmostagirbhuiyan/Documents/university-ranking-aggregator/frontend/public/data';
        
        const usnews = parseCSV(path.join(dataPath, 'usnews_rankings.csv'));
        const qs = parseCSV(path.join(dataPath, 'qs_rankings.csv'), true);
        const the = parseCSV(path.join(dataPath, 'the_rankings.csv'), true);
        const arwu = parseCSV(path.join(dataPath, 'arwu_rankings.csv'), true);
        
        console.log('Data loaded:');
        console.log(`- US News: ${usnews.length} universities`);
        console.log(`- QS: ${qs.length} universities`);
        console.log(`- THE: ${the.length} universities`);
        console.log(`- ARWU: ${arwu.length} universities\n`);
        
        // Read existing manual mappings
        const manualMappings = JSON.parse(fs.readFileSync(path.join(dataPath, 'manual-university-mapping.json'), 'utf8'));
        const mappedNames = new Set();
        manualMappings.forEach(mapping => {
            mappedNames.add(mapping.originalName.toLowerCase());
        });
        
        console.log(`Existing manual mappings: ${manualMappings.length}\n`);
        
        // Collect all unique university names
        const allNames = new Set();
        
        usnews.forEach(u => allNames.add(u.University));
        qs.forEach(u => allNames.add(u.name));
        the.forEach(u => allNames.add(u.name));
        arwu.forEach(u => allNames.add(u.name));
        
        const allNamesArray = Array.from(allNames).filter(name => name && name.trim());
        
        console.log(`Total unique university names across all sources: ${allNamesArray.length}\n`);
        
        // Identify naming patterns
        console.log('=== IDENTIFYING NAMING PATTERNS ===\n');
        const patterns = identifyNamingPatterns(allNamesArray);
        
        Object.entries(patterns).forEach(([patternName, names]) => {
            if (names.length > 0) {
                console.log(`${patternName}: ${names.length} universities`);
                if (names.length <= 10) {
                    names.forEach(name => console.log(`  - ${name}`));
                } else {
                    names.slice(0, 10).forEach(name => console.log(`  - ${name}`));
                    console.log(`  ... and ${names.length - 10} more`);
                }
                console.log();
            }
        });
        
        // Find specific mismatches that need manual mapping
        console.log('=== POTENTIAL MISMATCHES NEEDING MANUAL MAPPING ===\n');
        
        // Look for universities that appear in multiple sources with different names
        const nameVariations = new Map();
        
        // Group similar names
        allNamesArray.forEach(name => {
            const normalized = normalizeUniversityName(name);
            if (!nameVariations.has(normalized)) {
                nameVariations.set(normalized, []);
            }
            nameVariations.get(normalized).push(name);
        });
        
        // Find cases where the same university has multiple name variations
        const suspiciousCases = [];
        nameVariations.forEach((names, normalized) => {
            if (names.length > 1 && names.some(name => !mappedNames.has(name.toLowerCase()))) {
                // Check if these names appear in different sources
                const sources = [];
                names.forEach(name => {
                    if (usnews.some(u => u.University === name)) sources.push('USNews');
                    if (qs.some(u => u.name === name)) sources.push('QS');
                    if (the.some(u => u.name === name)) sources.push('THE');
                    if (arwu.some(u => u.name === name)) sources.push('ARWU');
                });
                
                if (sources.length > 1) {
                    suspiciousCases.push({
                        normalized,
                        names,
                        sources: [...new Set(sources)],
                        needsMapping: names.some(name => !mappedNames.has(name.toLowerCase()))
                    });
                }
            }
        });
        
        // Sort by number of sources (more sources = higher priority)
        suspiciousCases.sort((a, b) => b.sources.length - a.sources.length);
        
        console.log(`Found ${suspiciousCases.length} potential mismatch cases:\n`);
        
        suspiciousCases.slice(0, 30).forEach((case_, index) => {
            if (case_.needsMapping) {
                console.log(`${index + 1}. Sources: [${case_.sources.join(', ')}]`);
                case_.names.forEach(name => {
                    const mapped = mappedNames.has(name.toLowerCase()) ? ' (MAPPED)' : ' (NEEDS MAPPING)';
                    console.log(`   - "${name}"${mapped}`);
                });
                console.log();
            }
        });
        
        // Specific pattern analysis
        console.log('=== SPECIFIC PATTERNS TO INVESTIGATE ===\n');
        
        // 1. Medical Schools and Health Centers
        const medicalVariations = allNamesArray.filter(name => {
            const lower = name.toLowerCase();
            return (lower.includes('medical') || lower.includes('health')) && 
                   !mappedNames.has(name.toLowerCase());
        });
        
        if (medicalVariations.length > 0) {
            console.log('Medical/Health institutions needing review:');
            medicalVariations.slice(0, 15).forEach(name => console.log(`  - ${name}`));
            if (medicalVariations.length > 15) {
                console.log(`  ... and ${medicalVariations.length - 15} more`);
            }
            console.log();
        }
        
        // 2. State Universities
        const stateUniversities = allNamesArray.filter(name => {
            const lower = name.toLowerCase();
            return (lower.includes('state university') || 
                   (lower.includes('university of') && lower.includes('state'))) && 
                   !mappedNames.has(name.toLowerCase());
        });
        
        if (stateUniversities.length > 0) {
            console.log('State universities needing review:');
            stateUniversities.slice(0, 15).forEach(name => console.log(`  - ${name}`));
            if (stateUniversities.length > 15) {
                console.log(`  ... and ${stateUniversities.length - 15} more`);
            }
            console.log();
        }
        
        // 3. International variations with diacritics
        const internationalVariations = allNamesArray.filter(name => {
            return /[àáâäåæçèéêëìíîïñòóôöøùúûüý]/i.test(name) && 
                   !mappedNames.has(name.toLowerCase());
        });
        
        if (internationalVariations.length > 0) {
            console.log('International names with diacritics needing review:');
            internationalVariations.slice(0, 15).forEach(name => console.log(`  - ${name}`));
            if (internationalVariations.length > 15) {
                console.log(`  ... and ${internationalVariations.length - 15} more`);
            }
            console.log();
        }
        
        console.log('=== ANALYSIS COMPLETE ===');
        
    } catch (error) {
        console.error('Error during analysis:', error);
    }
}

// Run the analysis
analyzeRemainingMismatches();
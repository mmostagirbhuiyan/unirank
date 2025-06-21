const stringSimilarity = require('string-similarity');

class EnhancedNameMatcher {
    constructor() {
        this.transformationRules = [
            // 1. Hyphen with spaces removal (22 cases)
            {
                name: 'hyphenSpaces',
                pattern: / - /g,
                replacement: ' ',
                description: 'Remove spaces around hyphens'
            },
            
            // 2. "at" preposition removal (12 cases)
            {
                name: 'atPreposition', 
                pattern: / at ([A-Z])/g,
                replacement: ' $1',
                description: 'Remove "at" preposition before locations'
            },
            
            // 3. Diacritics removal (5 cases)
            {
                name: 'diacritics',
                pattern: /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽž]/g,
                replacement: (char) => this.removeDiacritics(char),
                description: 'Remove diacritics and accents'
            },
            
            // 4. Medical Science/Sciences normalization (4 cases)
            {
                name: 'medicalSciences',
                pattern: / of Medical Sciences?/g,
                replacement: ' Medical Sciences',
                description: 'Normalize Medical Science/Sciences'
            },
            
            // 5. "The" prefix removal (3 cases)
            {
                name: 'thePrefix',
                pattern: /^The /,
                replacement: '',
                description: 'Remove "The" prefix'
            },
            
            // 6. Apostrophe normalization (5 cases)
            {
                name: 'apostrophes',
                pattern: /'/g,
                replacement: '',
                description: 'Remove apostrophes'
            },
            
            // 7. And/ampersand normalization (8 cases)
            {
                name: 'ampersand',
                pattern: / and /g,
                replacement: ' & ',
                description: 'Normalize "and" to "&"'
            },
            
            // 8. Trailing Geographical Indicator Removal (new rule)
            {
                name: 'trailingGeo',
                pattern: /\s-\s(?:Canada|USA|UK|Australia|China|Germany|Japan|Korea|France|India|Singapore|Brazil|Mexico|Spain|Italy|Russia)$/i,
                replacement: '',
                description: 'Remove common trailing geographical indicators (e.g., - Canada)'
            }
        ];
    }
    
    // Apply all transformation rules to normalize a name
    normalizeUniversityName(name) {
        if (!name || typeof name !== 'string') return '';
        
        let normalized = name.trim();
        const transformLog = [];
        
        // Apply each transformation rule
        this.transformationRules.forEach(rule => {
            const before = normalized;
            
            if (typeof rule.replacement === 'function') {
                normalized = normalized.replace(rule.pattern, rule.replacement);
            } else {
                normalized = normalized.replace(rule.pattern, rule.replacement);
            }
            
            if (before !== normalized) {
                transformLog.push({
                    rule: rule.name,
                    description: rule.description,
                    before,
                    after: normalized
                });
            }
        });
        
        // Additional basic cleaning
        normalized = this.basicClean(normalized);
        
        return {
            normalized,
            original: name,
            transformations: transformLog
        };
    }
    
    // Enhanced basic cleaning 
    basicClean(name) {
        let cleaned = name.trim();
        
        // Remove multiple spaces
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        // Remove trailing punctuation
        cleaned = cleaned.replace(/[.,;:!?]+$/, '');
        
        // Normalize case (title case for comparison)
        cleaned = this.toTitleCase(cleaned);
        
        return cleaned;
    }
    
    // Remove diacritics helper
    removeDiacritics(char) {
        const diacriticsMap = {
            'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae',
            'ç': 'c', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ì': 'i', 'í': 'i',
            'î': 'i', 'ï': 'i', 'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o',
            'ö': 'o', 'ø': 'o', 'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ý': 'y',
            'ÿ': 'y', 'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
            'Æ': 'AE', 'Ç': 'C', 'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E', 'Ì': 'I',
            'Í': 'I', 'Î': 'I', 'Ï': 'I', 'Ñ': 'N', 'Ò': 'O', 'Ó': 'O', 'Ô': 'O',
            'Õ': 'O', 'Ö': 'O', 'Ø': 'O', 'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
            'Ý': 'Y'
        };
        return diacriticsMap[char] || char;
    }
    
    // Title case helper
    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }
    
    // Find best matches for a university name against a list of target names
    findBestMatches(sourceName, targetNames, threshold = 0.85) {
        if (!sourceName || !targetNames || targetNames.length === 0) {
            return [];
        }
        
        // Normalize the source name
        const sourceResult = this.normalizeUniversityName(sourceName);
        const sourceNormalized = sourceResult.normalized;
        
        // Find matches
        const matches = targetNames.map(targetName => {
            const targetResult = this.normalizeUniversityName(targetName);
            const targetNormalized = targetResult.normalized;
            
            // Calculate similarity score
            const similarity = stringSimilarity.compareTwoStrings(
                sourceNormalized.toLowerCase(), 
                targetNormalized.toLowerCase()
            );
            
            return {
                target: targetName,
                similarity,
                sourceTransforms: sourceResult.transformations,
                targetTransforms: targetResult.transformations,
                sourceNormalized,
                targetNormalized
            };
        }).filter(match => match.similarity >= threshold)
          .sort((a, b) => b.similarity - a.similarity);
        
        return matches;
    }
}

module.exports = EnhancedNameMatcher; 
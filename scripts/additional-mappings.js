#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Additional critical mappings identified from the analysis
const additionalMappings = [
    // High-priority multi-source mismatches
    {
        originalName: "Leiden University",
        source: "usnews",
        suggestedStandardizedName: "University of Leiden"
    },
    {
        originalName: "University of Texas Austin",
        source: "usnews", 
        suggestedStandardizedName: "University of Texas at Austin"
    },
    {
        originalName: "University of Maryland College Park",
        source: "usnews",
        suggestedStandardizedName: "University of Maryland at College Park"
    },
    {
        originalName: "University of Tokyo",
        source: "usnews", 
        suggestedStandardizedName: "The University of Tokyo"
    },
    {
        originalName: "University of Colorado Boulder",
        source: "usnews",
        suggestedStandardizedName: "University of Colorado at Boulder"
    },
    {
        originalName: "University of Illinois Urbana-Champaign",
        source: "usnews",
        suggestedStandardizedName: "University of Illinois at Urbana-Champaign"
    },
    {
        originalName: "University of Illinois Chicago",
        source: "usnews",
        suggestedStandardizedName: "University of Illinois at Chicago"
    },
    {
        originalName: "University of Colorado Denver",
        source: "usnews",
        suggestedStandardizedName: "University of Colorado at Denver"
    },
    {
        originalName: "Durham University",
        source: "usnews",
        suggestedStandardizedName: "University of Durham"
    },
    {
        originalName: "Pompeu Fabra University",
        source: "usnews",
        suggestedStandardizedName: "University Pompeu Fabra"
    },
    
    // State University vs University of [State] variations
    {
        originalName: "Radboud University Nijmegen",
        source: "usnews",
        suggestedStandardizedName: "Radboud University of Nijmegen"
    },
    {
        originalName: "Radboud University Nijmegen",
        source: "qs",
        suggestedStandardizedName: "Radboud University of Nijmegen"
    },
    {
        originalName: "Radboud University Nijmegen", 
        source: "the",
        suggestedStandardizedName: "Radboud University of Nijmegen"
    },
    {
        originalName: "Radboud University Nijmegen",
        source: "arwu",
        suggestedStandardizedName: "Radboud University of Nijmegen"
    },
    {
        originalName: "Indiana University Bloomington",
        source: "usnews",
        suggestedStandardizedName: "Indiana University at Bloomington"
    },
    {
        originalName: "Indiana University Bloomington",
        source: "qs",
        suggestedStandardizedName: "Indiana University at Bloomington"
    },
    {
        originalName: "Indiana University Bloomington",
        source: "the",
        suggestedStandardizedName: "Indiana University at Bloomington"
    },
    {
        originalName: "Indiana University Bloomington",
        source: "arwu",
        suggestedStandardizedName: "Indiana University at Bloomington"
    },
    {
        originalName: "Maastricht University",
        source: "usnews",
        suggestedStandardizedName: "University of Maastricht"
    },
    {
        originalName: "Maastricht University",
        source: "qs",
        suggestedStandardizedName: "University of Maastricht"
    },
    {
        originalName: "Maastricht University",
        source: "the",
        suggestedStandardizedName: "University of Maastricht"
    },
    {
        originalName: "Maastricht University",
        source: "arwu",
        suggestedStandardizedName: "University of Maastricht"
    },
    
    // Medical schools and health centers with different naming
    {
        originalName: "Oregon Health & Science University",
        source: "usnews",
        suggestedStandardizedName: "Oregon Health and Science University"
    },
    {
        originalName: "Oregon Health & Science University",
        source: "qs",
        suggestedStandardizedName: "Oregon Health and Science University"
    },
    {
        originalName: "Oregon Health & Science University",
        source: "the",
        suggestedStandardizedName: "Oregon Health and Science University"
    },
    {
        originalName: "Oregon Health & Science University",
        source: "arwu",
        suggestedStandardizedName: "Oregon Health and Science University"
    },
    {
        originalName: "China Medical University Taiwan",
        source: "usnews",
        suggestedStandardizedName: "China Medical University (Taiwan)"
    },
    {
        originalName: "China Medical University Taiwan",
        source: "qs",
        suggestedStandardizedName: "China Medical University (Taiwan)"
    },
    {
        originalName: "China Medical University Taiwan",
        source: "the",
        suggestedStandardizedName: "China Medical University (Taiwan)"
    },
    {
        originalName: "China Medical University Taiwan",
        source: "arwu",
        suggestedStandardizedName: "China Medical University (Taiwan)"
    },
    {
        originalName: "Medical University of Vienna",
        source: "usnews",
        suggestedStandardizedName: "Medical University Vienna"
    },
    {
        originalName: "Medical University of Vienna",
        source: "qs",
        suggestedStandardizedName: "Medical University Vienna"
    },
    {
        originalName: "Medical University of Vienna",
        source: "the",
        suggestedStandardizedName: "Medical University Vienna"
    },
    {
        originalName: "Medical University of Vienna",
        source: "arwu",
        suggestedStandardizedName: "Medical University Vienna"
    },
    
    // International universities with slight naming differences
    {
        originalName: "Queens University Belfast",
        source: "usnews",
        suggestedStandardizedName: "Queen's University Belfast"
    },
    {
        originalName: "Queens University Belfast",
        source: "qs",
        suggestedStandardizedName: "Queen's University Belfast"
    },
    {
        originalName: "Queens University Belfast",
        source: "the",
        suggestedStandardizedName: "Queen's University Belfast"
    },
    {
        originalName: "Queens University Belfast",
        source: "arwu",
        suggestedStandardizedName: "Queen's University Belfast"
    },
    {
        originalName: "Western Sydney University",
        source: "usnews",
        suggestedStandardizedName: "University of Western Sydney"
    },
    {
        originalName: "Western Sydney University",
        source: "qs",
        suggestedStandardizedName: "University of Western Sydney"
    },
    {
        originalName: "Western Sydney University",
        source: "the",
        suggestedStandardizedName: "University of Western Sydney"
    },
    {
        originalName: "Western Sydney University",
        source: "arwu",
        suggestedStandardizedName: "University of Western Sydney"
    },
    {
        originalName: "Qatar University",
        source: "usnews",
        suggestedStandardizedName: "University of Qatar"
    },
    {
        originalName: "Qatar University",
        source: "qs",
        suggestedStandardizedName: "University of Qatar"
    },
    {
        originalName: "Qatar University",
        source: "the",
        suggestedStandardizedName: "University of Qatar"
    },
    {
        originalName: "Qatar University",
        source: "arwu",
        suggestedStandardizedName: "University of Qatar"
    },
    
    // Asian universities with different transliterations
    {
        originalName: "The University of Osaka",
        source: "usnews",
        suggestedStandardizedName: "Osaka University"
    },
    {
        originalName: "The University of Osaka",
        source: "qs",
        suggestedStandardizedName: "Osaka University"
    },
    {
        originalName: "The University of Osaka",
        source: "the",
        suggestedStandardizedName: "Osaka University"
    },
    {
        originalName: "The University of Osaka",
        source: "arwu",
        suggestedStandardizedName: "Osaka University"
    },
    {
        originalName: "University of Tsukuba",
        source: "usnews",
        suggestedStandardizedName: "Tsukuba University"
    },
    {
        originalName: "University of Tsukuba",
        source: "qs",
        suggestedStandardizedName: "Tsukuba University"
    },
    {
        originalName: "University of Tsukuba",
        source: "the",
        suggestedStandardizedName: "Tsukuba University"
    },
    {
        originalName: "University of Tsukuba",
        source: "arwu",
        suggestedStandardizedName: "Tsukuba University"
    },
    
    // UK universities with different name conventions
    {
        originalName: "Stellenbosch University",
        source: "usnews",
        suggestedStandardizedName: "University of Stellenbosch"
    },
    {
        originalName: "Stellenbosch University",
        source: "qs",
        suggestedStandardizedName: "University of Stellenbosch"
    },
    {
        originalName: "Stellenbosch University",
        source: "the",
        suggestedStandardizedName: "University of Stellenbosch"
    },
    {
        originalName: "Stellenbosch University",
        source: "arwu",
        suggestedStandardizedName: "University of Stellenbosch"
    },
    {
        originalName: "University of St Andrews",
        source: "usnews",
        suggestedStandardizedName: "University of St. Andrews"
    },
    {
        originalName: "University of St Andrews",
        source: "qs",
        suggestedStandardizedName: "University of St. Andrews"
    },
    {
        originalName: "University of St Andrews",
        source: "the",
        suggestedStandardizedName: "University of St. Andrews"
    },
    {
        originalName: "University of St Andrews",
        source: "arwu",
        suggestedStandardizedName: "University of St. Andrews"
    },
    
    // German and other European variations
    {
        originalName: "Ulm University",
        source: "usnews",
        suggestedStandardizedName: "University of Ulm"
    },
    {
        originalName: "Ulm University",
        source: "qs",
        suggestedStandardizedName: "University of Ulm"
    },
    {
        originalName: "Ulm University",
        source: "the",
        suggestedStandardizedName: "University of Ulm"
    },
    {
        originalName: "Ulm University",
        source: "arwu",
        suggestedStandardizedName: "University of Ulm"
    },
    
    // Canadian and New Zealand variations
    {
        originalName: "University of Victoria",
        source: "usnews",
        suggestedStandardizedName: "Victoria University"
    },
    {
        originalName: "University of Victoria",
        source: "qs",
        suggestedStandardizedName: "Victoria University"
    },
    {
        originalName: "University of Victoria",
        source: "the",
        suggestedStandardizedName: "Victoria University"
    },
    {
        originalName: "University of Victoria",
        source: "arwu",
        suggestedStandardizedName: "Victoria University"
    },
    {
        originalName: "Victoria University Wellington",
        source: "usnews",
        suggestedStandardizedName: "Victoria University of Wellington"
    },
    {
        originalName: "Victoria University Wellington",
        source: "qs",
        suggestedStandardizedName: "Victoria University of Wellington"
    },
    {
        originalName: "Victoria University Wellington",
        source: "the",
        suggestedStandardizedName: "Victoria University of Wellington"
    },
    {
        originalName: "Victoria University Wellington",
        source: "arwu",
        suggestedStandardizedName: "Victoria University of Wellington"
    },
    {
        originalName: "Memorial University Newfoundland",
        source: "usnews",
        suggestedStandardizedName: "Memorial University of Newfoundland"
    },
    {
        originalName: "Memorial University Newfoundland",
        source: "qs",
        suggestedStandardizedName: "Memorial University of Newfoundland"
    },
    {
        originalName: "Memorial University Newfoundland",
        source: "the",
        suggestedStandardizedName: "Memorial University of Newfoundland"
    },
    {
        originalName: "Memorial University Newfoundland",
        source: "arwu",
        suggestedStandardizedName: "Memorial University of Newfoundland"
    },
    
    // Finnish and other Nordic variations
    {
        originalName: "Tampere University",
        source: "usnews",
        suggestedStandardizedName: "University of Tampere"
    },
    {
        originalName: "Tampere University",
        source: "qs",
        suggestedStandardizedName: "University of Tampere"
    },
    {
        originalName: "Tampere University",
        source: "the",
        suggestedStandardizedName: "University of Tampere"
    },
    {
        originalName: "Tampere University",
        source: "arwu",
        suggestedStandardizedName: "University of Tampere"
    },
    
    // US universities with location variations
    {
        originalName: "University of Hawaii Manoa",
        source: "usnews",
        suggestedStandardizedName: "University of Hawaii at Manoa"
    },
    {
        originalName: "University of Hawaii Manoa",
        source: "qs",
        suggestedStandardizedName: "University of Hawaii at Manoa"
    },
    {
        originalName: "University of Hawaii Manoa",
        source: "the",
        suggestedStandardizedName: "University of Hawaii at Manoa"
    },
    {
        originalName: "University of Hawaii Manoa",
        source: "arwu",
        suggestedStandardizedName: "University of Hawaii at Manoa"
    },
    
    // Spanish universities
    {
        originalName: "University of Basque Country",
        source: "usnews",
        suggestedStandardizedName: "University of the Basque Country"
    },
    {
        originalName: "University of Basque Country",
        source: "qs",
        suggestedStandardizedName: "University of the Basque Country"
    },
    {
        originalName: "University of Basque Country",
        source: "the",
        suggestedStandardizedName: "University of the Basque Country"
    },
    {
        originalName: "University of Basque Country",
        source: "arwu",
        suggestedStandardizedName: "University of the Basque Country"
    },
    
    // Additional medical/health variations
    {
        originalName: "Medical University of Graz",
        source: "usnews",
        suggestedStandardizedName: "Medical University Graz"
    },
    {
        originalName: "Medical University of Graz",
        source: "qs",
        suggestedStandardizedName: "Medical University Graz"
    },
    {
        originalName: "Medical University of Graz",
        source: "the",
        suggestedStandardizedName: "Medical University Graz"
    },
    {
        originalName: "Medical University of Graz",
        source: "arwu",
        suggestedStandardizedName: "Medical University Graz"
    },
    {
        originalName: "Medical University of Innsbruck",
        source: "usnews",
        suggestedStandardizedName: "Medical University Innsbruck"
    },
    {
        originalName: "Medical University of Innsbruck",
        source: "qs",
        suggestedStandardizedName: "Medical University Innsbruck"
    },
    {
        originalName: "Medical University of Innsbruck",
        source: "the",
        suggestedStandardizedName: "Medical University Innsbruck"
    },
    {
        originalName: "Medical University of Innsbruck",
        source: "arwu",
        suggestedStandardizedName: "Medical University Innsbruck"
    },
    {
        originalName: "Hannover Medical School",
        source: "usnews",
        suggestedStandardizedName: "Hanover Medical School"
    },
    {
        originalName: "Hannover Medical School",
        source: "qs",
        suggestedStandardizedName: "Hanover Medical School"
    },
    {
        originalName: "Hannover Medical School",
        source: "the",
        suggestedStandardizedName: "Hanover Medical School"
    },
    {
        originalName: "Hannover Medical School",
        source: "arwu",
        suggestedStandardizedName: "Hanover Medical School"
    }
];

async function addAdditionalMappings() {
    try {
        const dataPath = '/Users/mmostagirbhuiyan/Documents/university-ranking-aggregator/frontend/public/data';
        const mappingFile = path.join(dataPath, 'manual-university-mapping.json');
        
        // Read existing mappings
        const existingMappings = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
        
        console.log(`Current mappings: ${existingMappings.length}`);
        console.log(`Additional mappings to add: ${additionalMappings.length}`);
        
        // Combine mappings
        const combinedMappings = [...existingMappings, ...additionalMappings];
        
        // Remove duplicates based on originalName + source combination
        const seenMappings = new Set();
        const uniqueMappings = combinedMappings.filter(mapping => {
            const key = `${mapping.originalName}|${mapping.source}`;
            if (seenMappings.has(key)) {
                return false;
            }
            seenMappings.add(key);
            return true;
        });
        
        // Sort mappings for better organization
        uniqueMappings.sort((a, b) => {
            if (a.originalName !== b.originalName) {
                return a.originalName.localeCompare(b.originalName);
            }
            return a.source.localeCompare(b.source);
        });
        
        // Write updated mappings
        fs.writeFileSync(mappingFile, JSON.stringify(uniqueMappings, null, 2));
        
        console.log(`✓ Updated mappings file with ${uniqueMappings.length} total mappings`);
        console.log(`✓ Added ${uniqueMappings.length - existingMappings.length} new mappings`);
        
        // Show mapping summary by pattern
        const patternCounts = {};
        additionalMappings.forEach(mapping => {
            const original = mapping.originalName;
            const standardized = mapping.suggestedStandardizedName;
            
            if (original.includes(' at ') && !standardized.includes(' at ')) {
                patternCounts['at removal'] = (patternCounts['at removal'] || 0) + 1;
            } else if (!original.includes(' at ') && standardized.includes(' at ')) {
                patternCounts['at addition'] = (patternCounts['at addition'] || 0) + 1;
            } else if (original.includes('Medical University of') && standardized.includes('Medical University ')) {
                patternCounts['medical university normalization'] = (patternCounts['medical university normalization'] || 0) + 1;
            } else if (original.includes(' & ') && standardized.includes(' and ')) {
                patternCounts['ampersand to and'] = (patternCounts['ampersand to and'] || 0) + 1;
            } else if (original.startsWith('The ') && !standardized.startsWith('The ')) {
                patternCounts['The prefix removal'] = (patternCounts['The prefix removal'] || 0) + 1;
            } else if (!original.startsWith('The ') && standardized.startsWith('The ')) {
                patternCounts['The prefix addition'] = (patternCounts['The prefix addition'] || 0) + 1;
            } else if (original.includes("'") !== standardized.includes("'")) {
                patternCounts['apostrophe normalization'] = (patternCounts['apostrophe normalization'] || 0) + 1;
            } else {
                patternCounts['other variations'] = (patternCounts['other variations'] || 0) + 1;
            }
        });
        
        console.log('\n=== MAPPING PATTERNS ADDED ===');
        Object.entries(patternCounts).forEach(([pattern, count]) => {
            console.log(`${pattern}: ${count} mappings`);
        });
        
    } catch (error) {
        console.error('Error adding additional mappings:', error);
    }
}

// Run the script
addAdditionalMappings();
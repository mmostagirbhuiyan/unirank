const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Country name mappings to match the 2025 format exactly
const countryMappings = {
    'United States of America': 'USA',
    'United Kingdom': 'UK',
    'China (Mainland)': 'China',
    'Hong Kong SAR, China': 'Hong Kong',
    'Macao SAR, China': 'Macao',
    'Korea, South': 'South Korea',
    'Russian Federation': 'Russia',
    'Iran, Islamic Republic of': 'Iran',
    'Taiwan, Province of China': 'Taiwan'
};

// University name standardizations to match existing system expectations
const nameStandardizations = {
    // Remove "The" prefix (common pattern)
    removeThePrefix: [
        'The University of Hong Kong',
        'The University of Melbourne', 
        'The University of New South Wales',
        'The University of Sydney',
        'The Chinese University of Hong Kong',
        'The University of Manchester',
        'The University of Queensland',
        'The Hong Kong University of Science and Technology',
        'The University of Amsterdam',
        'The Hong Kong Polytechnic University',
        'The University of Auckland',
        'The University of Warwick',
        'The University of Western Australia',
        'The University of Sheffield',
        'The University of Nottingham',
        'The American University in Cairo'
    ],
    
    // Specific name mappings for consistency with 2025 format
    exactMappings: {
        'Massachusetts Institute of Technology (MIT)': 'Massachusetts Institute of Technology - MIT',
        'ETH Zurich (Swiss Federal Institute of Technology)': 'Swiss Federal Institute of Technology Zurich - ETHZ',
        'National University of Singapore (NUS)': 'National University of Singapore',
        'UCL (University College London)': 'University College London',
        'California Institute of Technology (Caltech)': 'California Institute of Technology - Caltech',
        'Nanyang Technological University, Singapore (NTU Singapore)': 'Nanyang Technological University',
        'University of California, Berkeley (UCB)': 'University of California - Berkeley',
        'University of California, Los Angeles (UCLA)': 'University of California - Los Angeles',
        'University of California, San Diego (UCSD)': 'University of California - San Diego',
        'University of California, Davis (UCD)': 'University of California - Davis',
        'University of California, Santa Barbara (UCSB)': 'University of California - Santa Barbara',
        'University of California, Irvine (UCI)': 'University of California - Irvine',
        'École Polytechnique Fédérale de Lausanne': 'Swiss Federal Institute of Technology Lausanne - EPFL',
        'Technical University of Munich': 'Technical University of Munich',
        'Ludwig-Maximilians-Universität München': 'University of Munich',
        'PSL University': 'PSL Research University Paris',
        'King\'s College London (KCL)': 'King\'s College London',
        'University of Michigan-Ann Arbor': 'University of Michigan - Ann Arbor',
        'Trinity College Dublin, The University of Dublin': 'Trinity College Dublin',
        'Queen\'s University, Ontario': 'Queen\'s University',
        'University of Maryland, College Park': 'University of Maryland - College Park',
        'University of Massachusetts, Amherst': 'University of Massachusetts - Amherst',
        'University of North Carolina, Chapel Hill': 'University of North Carolina at Chapel Hill',
        'Institut Polytechnique de Paris': 'Institut Polytechnique de Paris'
        // Add more mappings as needed based on actual data
    }
};

function standardizeUniversityName(name) {
    // First check exact mappings
    if (nameStandardizations.exactMappings[name]) {
        return nameStandardizations.exactMappings[name];
    }
    
    // Remove "The" prefix if it's in our list
    if (nameStandardizations.removeThePrefix.includes(name)) {
        return name.replace(/^The /, '');
    }
    
    // Handle parenthetical acronyms - remove them
    let cleaned = name.replace(/ \([A-Z]{2,}\)$/, '');
    
    // Handle specific patterns
    cleaned = cleaned.replace(/^The /, ''); // Remove "The" prefix from any remaining
    
    // Replace commas with hyphens to match the expected CSV format
    cleaned = cleaned.replace(/,/g, ' -');
    
    return cleaned;
}

function standardizeCountryName(country) {
    return countryMappings[country] || country;
}

function convertQS2026ToCSV() {
    console.log('🔄 Starting QS 2026 Excel to CSV conversion...');
    
    const excelPath = path.join(__dirname, '../frontend/public/data/qs_rankings_2026.xlsx');
    const csvPath = path.join(__dirname, '../frontend/public/data/qs_rankings.csv');
    
    try {
        // Read Excel file
        console.log('📖 Reading Excel file...');
        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with proper header row (row 2 is the header)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            range: 2 // Start from row 2 (0-indexed), which is row 3 in Excel
        });
        
        console.log(`📊 Found ${jsonData.length} universities in Excel file`);
        
        // Create CSV header matching the exact format from 2025
        const csvLines = [
            '# University Ranking Results - www.universityrankings.ch',
            '# Ranking: QS',
            '# Year: 2026',
            '#',
            '   #    World Rank   ,  Institution   ,  Country   ,   '
        ];
        
        // Process each university
        let processedCount = 0;
        for (let i = 0; i < jsonData.length && processedCount < 1000; i++) { // Limit to 1000 like original
            const row = jsonData[i];
            
            // Skip empty rows or header rows
            if (!row || !row[1] || !row[3] || row[1] === 'Rank') continue;
            
            const rank = row[1]; // Rank column
            const originalName = row[3]; // Name column  
            const originalCountry = row[4]; // Country/Territory column
            
            // Skip if essential data is missing or if it's a header row
            if (!rank || !originalName || !originalCountry || rank === 'Rank') continue;
            
            // Handle range ranks like "701-710" by taking the first number
            let numericRank;
            if (typeof rank === 'string' && rank.includes('-')) {
                numericRank = parseInt(rank.split('-')[0], 10);
            } else {
                numericRank = parseInt(rank, 10);
            }
            
            // Skip if we can't parse the rank
            if (isNaN(numericRank)) continue;
            
            // Standardize names
            const standardizedName = standardizeUniversityName(originalName);
            const standardizedCountry = standardizeCountryName(originalCountry);
            
            // Format the line exactly like the 2025 format (use original rank format)
            const formattedLine = `    ${rank}  ,   ${standardizedName}   ,${standardizedCountry}   `;
            csvLines.push(formattedLine);
            
            processedCount++;
        }
        
        console.log(`✅ Processed ${processedCount} universities`);
        
        // Write CSV file with UTF-8 encoding
        const csvContent = csvLines.join('\n');
        fs.writeFileSync(csvPath, csvContent, 'utf8');
        
        console.log(`💾 Successfully created ${csvPath}`);
        console.log(`📈 Total lines in CSV: ${csvLines.length}`);
        
        // Verify the file by reading a few lines
        console.log('\n🔍 Verification - First 10 data lines:');
        const verificationLines = csvLines.slice(5, 15); // Skip header, show first 10 data lines
        verificationLines.forEach(line => console.log(line));
        
        // Check for München encoding
        const munichLines = csvLines.filter(line => line.includes('München') || line.includes('Munich'));
        if (munichLines.length > 0) {
            console.log('\n🇩🇪 Munich universities found:');
            munichLines.forEach(line => console.log(line));
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error during conversion:', error);
        return false;
    }
}

// Run the conversion
if (require.main === module) {
    const success = convertQS2026ToCSV();
    process.exit(success ? 0 : 1);
}

module.exports = { convertQS2026ToCSV }; 
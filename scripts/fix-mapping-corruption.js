const fs = require('fs').promises;
const path = require('path');

async function fixMappingCorruption() {
    console.log('🚨 FIXING CRITICAL MAPPING CORRUPTION');
    console.log('=====================================');
    
    const mappingFilePath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'suggested-university-mapping.json');
    
    // Load the corrupted mapping file
    console.log('Loading corrupted mapping file...');
    const data = await fs.readFile(mappingFilePath, 'utf8');
    const mappings = JSON.parse(data);
    
    console.log(`Original mappings: ${mappings.length}`);
    
    // Identify corruption patterns
    const corruptionPatterns = [
        // False merges where different universities are mapped to Nanjing University
        {
            pattern: /Pohang University/i,
            incorrectTarget: 'Nanjing University of Science and Technology',
            description: 'Pohang University (South Korea) incorrectly mapped to Nanjing University (China)'
        },
        {
            pattern: /Tianjin University of Science and Technology/i,
            incorrectTarget: 'Nanjing University of Science and Technology', 
            description: 'Tianjin University incorrectly mapped to Nanjing University'
        },
        // False merges where different universities are mapped to Jordan University
        {
            pattern: /Ajman University of Science and Technology/i,
            incorrectTarget: 'Jordan University of Science and Technology',
            description: 'Ajman University (UAE) incorrectly mapped to Jordan University (Jordan)'
        },
        {
            pattern: /Iran University of Science and Technology/i,
            incorrectTarget: 'Jordan University of Science and Technology',
            description: 'Iran University incorrectly mapped to Jordan University'
        },
        // Chinese universities incorrectly mapped to Jordan University
        {
            pattern: /Henan University of Science and Technology/i,
            incorrectTarget: 'Jordan University of Science and Technology',
            description: 'Henan University (China) incorrectly mapped to Jordan University'
        },
        {
            pattern: /Xi'an University of Science and Technology/i,
            incorrectTarget: 'Jordan University of Science and Technology',
            description: 'Xi\'an University (China) incorrectly mapped to Jordan University'
        },
        {
            pattern: /Wuhan University of Science and Technology/i,
            incorrectTarget: 'Jordan University of Science and Technology',
            description: 'Wuhan University (China) incorrectly mapped to Jordan University'
        }
    ];
    
    // Find and log corrupted mappings
    let corruptedCount = 0;
    let removedMappings = [];
    
    console.log('\n🔍 IDENTIFYING CORRUPTED MAPPINGS:');
    
    corruptionPatterns.forEach(({ pattern, incorrectTarget, description }) => {
        const corrupted = mappings.filter(mapping => 
            pattern.test(mapping.originalName) && 
            mapping.suggestedStandardizedName === incorrectTarget
        );
        
        if (corrupted.length > 0) {
            console.log(`\n❌ ${description}:`);
            corrupted.forEach(mapping => {
                console.log(`   - "${mapping.originalName}" (${mapping.source}) -> "${mapping.suggestedStandardizedName}"`);
                removedMappings.push({
                    originalName: mapping.originalName,
                    source: mapping.source,
                    incorrectTarget: mapping.suggestedStandardizedName,
                    reason: description
                });
            });
            corruptedCount += corrupted.length;
        }
    });
    
    // Remove corrupted mappings
    console.log(`\n🧹 REMOVING ${corruptedCount} CORRUPTED MAPPINGS...`);
    
    const cleanedMappings = mappings.filter(mapping => {
        // Remove any mapping where a university with "Pohang" gets mapped to Nanjing
        if (mapping.originalName.toLowerCase().includes('pohang') && 
            mapping.suggestedStandardizedName === 'Nanjing University of Science and Technology') {
            return false;
        }
        
        // Remove any mapping where Tianjin gets mapped to Nanjing
        if (mapping.originalName.toLowerCase().includes('tianjin university of science and technology') && 
            mapping.suggestedStandardizedName === 'Nanjing University of Science and Technology') {
            return false;
        }
        
        // Remove any mapping where Ajman University gets mapped to Jordan University
        if (mapping.originalName.toLowerCase().includes('ajman university of science and technology') && 
            mapping.suggestedStandardizedName === 'Jordan University of Science and Technology') {
            return false;
        }
        
        // Remove any mapping where Iran University gets mapped to Jordan University
        if (mapping.originalName.toLowerCase().includes('iran university of science and technology') && 
            mapping.suggestedStandardizedName === 'Jordan University of Science and Technology') {
            return false;
        }
        
        // Remove any mapping where Chinese universities get mapped to Jordan University
        if (mapping.originalName.toLowerCase().includes('henan university of science and technology') && 
            mapping.suggestedStandardizedName === 'Jordan University of Science and Technology') {
            return false;
        }
        
        if (mapping.originalName.toLowerCase().includes('xi\'an university of science and technology') && 
            mapping.suggestedStandardizedName === 'Jordan University of Science and Technology') {
            return false;
        }
        
        if (mapping.originalName.toLowerCase().includes('wuhan university of science and technology') && 
            mapping.suggestedStandardizedName === 'Jordan University of Science and Technology') {
            return false;
        }
        
        return true;
    });
    
    console.log(`Cleaned mappings: ${cleanedMappings.length}`);
    console.log(`Removed: ${mappings.length - cleanedMappings.length} corrupted mappings`);
    
    // Save the cleaned mapping file
    console.log('\n💾 SAVING CLEANED MAPPINGS...');
    await fs.writeFile(mappingFilePath, JSON.stringify(cleanedMappings, null, 2));
    
    // Generate corruption report
    const reportPath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'corruption-fix-report.json');
    const report = {
        timestamp: new Date().toISOString(),
        totalOriginalMappings: mappings.length,
        totalCleanedMappings: cleanedMappings.length,
        removedCount: mappings.length - cleanedMappings.length,
        removedMappings: removedMappings,
        corruptionPatterns: corruptionPatterns.map(p => ({
            description: p.description,
            pattern: p.pattern.toString(),
            incorrectTarget: p.incorrectTarget
        }))
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n✅ CORRUPTION FIX COMPLETE!');
    console.log('============================');
    console.log(`📊 Removed ${mappings.length - cleanedMappings.length} corrupted mappings`);
    console.log(`📋 Clean mappings: ${cleanedMappings.length}`);
    console.log(`📄 Report saved: ${reportPath}`);
    console.log('\n🚀 Ready to regenerate aggregated rankings with clean data!');
}

// Run the fix
fixMappingCorruption().catch(console.error); 
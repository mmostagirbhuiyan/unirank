// scripts/the-scraper.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // Import the csv-parser library
const { createReadStream } = require('fs'); // Import createReadStream
const { downloadRankingCsv } = require('./csv-download');

// URL to download the latest THE CSV directly from universityrankings.ch
// Update the year in the URL when a new ranking becomes available
// The vendor now gates CSV downloads behind a captcha, so the file is fetched
// by hand and this URL is only used for a validated refresh attempt.
const THE_CSV_DOWNLOAD_URL =
  'https://www.universityrankings.ch/results/Times/2025?mode=csv';

// Define the path for the local CSV file
const THE_CSV_FILE = 'the_rankings.csv';
const THE_FILE_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', THE_CSV_FILE);

/**
 * Reads the Times Higher Education World University Rankings from a local CSV file using csv-parser.
 * @returns {Promise<Object[]>} A promise that resolves with an array of university objects.
 */
async function scrapeTHERankings() {
    const results = [];

    try {
        // Always attempt to refresh the latest data before parsing; a failed
        // or non-ranking download keeps the existing file.
        if (!process.argv.includes('--offline')) await downloadRankingCsv({
            url: THE_CSV_DOWNLOAD_URL, filePath: THE_FILE_PATH, label: 'THE CSV'
        });
        console.log(`Reading THE rankings from local CSV file ${THE_FILE_PATH}...`);

        await new Promise((resolve, reject) => {
            createReadStream(THE_FILE_PATH, { encoding: 'latin1' })
                .pipe(csv({
                    // Explicitly define headers as found in the CSV file
                    headers: ['#    World Rank', 'Institution', 'Country', ''], 
                    skipLines: 5, // Skip the initial comment and header lines
                    mapValues: ({ header, index, value }) => value.trim() // Trim whitespace from values
                }))
                .on('data', (row) => {
                    const rankString = row['#    World Rank']; // Get the raw rank string
                    let rank;

                    // Handle range ranks (e.g., '201-250') by taking the lower bound
                    if (typeof rankString === 'string' && rankString.includes('-')) {
                        rank = parseInt(rankString.split('-')[0].trim(), 10);
                    } else if (typeof rankString === 'string') {
                        // If it's a single rank string, parse it
                        rank = parseInt(rankString.trim(), 10);
                    } else {
                        // If not a string, treat as invalid (will be filtered by isNaN)
                        rank = NaN;
                    }

                    const name = row['Institution'] ? row['Institution'].trim() : '';
                    const country = row['Country'] ? row['Country'].trim() : '';

                    if (name && !isNaN(rank)) {
                        results.push({
                            name: name,        // Use 'name' property as expected by scrape-rankings.js
                            rank: rank,        // Include the parsed rank
                            country: country,
                            source: 'the'
                        });
                    }
                })
                .on('end', () => {
                    console.log(`Successfully parsed ${results.length} universities from ${THE_FILE_PATH}.`);
                    resolve();
                })
                .on('error', (error) => {
                    console.error(`Error reading or parsing THE CSV: ${error.message}`);
                    reject(error); // Reject the promise on error
                });
        });

    } catch (error) {
        console.error(`Error processing THE CSV: ${error.message}`);
        // Re-throw the error so the main script can catch it
        throw error;
    }

    return results;
}

// Export function for use in other scripts
module.exports = {
    scrapeTHERankings
};
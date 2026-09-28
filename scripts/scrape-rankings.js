// Regenerate rankings from the source CSV snapshots without changing scoring.
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const { scrapeQSRankings } = require('./qs-scraper');
const { scrapeTHERankings } = require('./the-scraper');
const { scrapeARWURankings } = require('./arwu-scraper');
const { aggregateRankings } = require('./aggregation');
const { resolveUniversities } = require('./university-identity');

const sourceWeights = {
    qs: 0.25,
    the: 0.25,
    arwu: 0.25,
    usnews: 0.25,
};

// Define estimated maximum ranks for each source based on the number of universities typically included in their latest rankings
const sourceMaxRanks = {
    qs: 1000,     // Based on QS World University Rankings 2025
    the: 999,    // Based on Times Higher Education World University Rankings 2025
    arwu: 1000,   // Based on ARWU, which publishes the top 1000
    usnews: 980  // Based on US News Best Global Universities Ranking 2024-2025
};

const totalSources = Object.keys(sourceWeights).length;


const dataDir = path.join(__dirname, '..', 'frontend', 'public', 'data');

async function readSourceRecords() {
    const records = [];
    for (const [source, read] of Object.entries({
        qs: scrapeQSRankings, the: scrapeTHERankings, arwu: scrapeARWURankings
    })) {
        records.push(...(await read()).map(row => ({ ...row, source })));
    }
    await new Promise((resolve, reject) => {
        createReadStream(path.join(dataDir, 'usnews_rankings.csv'))
            .on('error', reject)
            .pipe(csv())
            .on('data', row => {
                if (row.University && row.Rank) records.push({
                    name: row.University.trim(), rank: parseInt(row.Rank, 10),
                    country: row.Country.trim(), source: 'usnews'
                });
            })
            .on('end', resolve).on('error', reject);
    });
    return records;
}

async function buildRankings() {
    const records = await readSourceRecords();
    const aliases = JSON.parse(await fs.readFile(path.join(dataDir, 'manual-university-mapping.json'), 'utf8'));
    const { universities, rejected, conflicts } = resolveUniversities(records, aliases);
    const rankings = aggregateRankings(universities, sourceWeights, sourceMaxRanks, totalSources);
    return { rankings, universities, rejected, conflicts, records };
}

async function main() {
    const { rankings, universities, rejected, conflicts } = await buildRankings();
    if (conflicts.length) throw new Error('Unresolved source identities prevent publication.');
    await fs.writeFile(path.join(dataDir, 'aggregated-rankings.json'), JSON.stringify(rankings, null, 2));
    await fs.writeFile(path.join(dataDir, 'identity-audit.json'), JSON.stringify({
        sourceAssignments: universities.map(({ name, country, members }) => ({ name, country, members })),
        rejectedAliases: rejected,
        unresolvedSourceConflicts: conflicts
    }, null, 2));
    const readme = path.join(__dirname, '..', 'README.md');
    const text = await fs.readFile(readme, 'utf8');
    await fs.writeFile(readme, text
        .replace(/Universities-\d+-blue/, 'Universities-' + rankings.length + '-blue')
        .replace(/[\d,]+ unique universities/, rankings.length.toLocaleString('en-US') + ' unique universities'));
    console.log('Published ' + rankings.length + ' universities.');
}

if (require.main === module) main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});

module.exports = { buildRankings, readSourceRecords };

// THE's public ranking page contains the complete table used by its UI.
const fs = require('fs').promises;
const path = require('path');
const { Readable } = require('stream');
const csv = require('csv-parser');

const RANKING_YEAR = '2027';
const RANKING_URL = `https://www.timeshighereducation.com/world-university-rankings/${RANKING_YEAR}/world-ranking`;
const THE_FILE_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'the_rankings.csv');

function parseRank(value) {
    if (value === 'Reporter') return null;
    const match = typeof value === 'string' && value.match(/^=?([1-9]\d*)(?:[–-]([1-9]\d*)|(\+))?$/);
    if (!match) throw new Error(`Unexpected THE rank: ${value}`);
    const lower = Number(match[1]);
    const upper = match[3] ? Infinity : Number(match[2] || match[1]);
    if (upper < lower) throw new Error(`Unexpected THE rank: ${value}`);
    return { lower, upper };
}

function parseRankingPage(html) {
    const script = html.match(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
    if (!script) throw new Error('THE page has no published ranking table.');
    const page = JSON.parse(script[1]).props?.pageProps?.page;
    const config = page?.rankingsTableConfig;
    const items = config?.rankingsData?.data;
    if (page?.title !== `World University Rankings ${RANKING_YEAR}` ||
        config?.year !== RANKING_YEAR || config?.type !== 'world_university_rankings' ||
        !Array.isArray(items) || !items.length) {
        throw new Error('Unexpected THE ranking year, type or table.');
    }
    // Check completeness against the publisher's own announced institution
    // count, including ranks outside UniRank's scope, before replacing data.
    const announced = page.body?.match(/includes\s+([\d,]+)\s+institutions/);
    if (!announced) throw new Error('THE page has no published institution count.');
    const expectedCount = Number(announced[1].replace(/,/g, ''));
    const ids = new Set();
    const identities = new Set();
    const rows = [];
    let rankedCount = 0;
    for (const item of items) {
        const rank = parseRank(item.rank);
        if (!rank) continue;
        const name = typeof item.name === 'string' ? item.name.trim() : '';
        const country = typeof item.location === 'string' ? item.location.trim() : '';
        const identity = country + '\0' + name;
        if (!name || !country || !Number.isInteger(item.nid) ||
            ids.has(item.nid) || identities.has(identity)) {
            throw new Error('THE table has an incomplete or duplicate institution.');
        }
        ids.add(item.nid);
        identities.add(identity);
        rankedCount++;
        if (rank.upper <= 1000) rows.push({ name, country, rank: rank.lower, source: 'the', rankLabel: item.rank });
    }
    if (rankedCount !== expectedCount || !rows.length ||
        !rows.some(row => parseRank(row.rankLabel).lower === 1) ||
        !rows.some(row => parseRank(row.rankLabel).upper === 1000)) {
        throw new Error('THE table is incomplete for the published ranking or top 1,000 scope.');
    }
    return rows;
}

function csvCell(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
}

function toCsv(rows) {
    const header = '# Times Higher Education World University Rankings\n' +
        `# Source: ${RANKING_URL}\n# Year: ${RANKING_YEAR}\n# Encoding: UTF-8\n` +
        '# World Rank,Institution,Country\n';
    return header + rows.map(row => [row.rankLabel, row.name, row.country].map(csvCell).join(',')).join('\n') + '\n';
}

async function refreshTHERankings(filePath = THE_FILE_PATH) {
    const response = await fetch(RANKING_URL, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`THE download failed: HTTP ${response.status}`);
    const rows = parseRankingPage(await response.text());
    const temporaryPath = filePath + '.tmp';
    try {
        await fs.writeFile(temporaryPath, toCsv(rows), 'utf8');
        await fs.rename(temporaryPath, filePath);
    } finally {
        await fs.rm(temporaryPath, { force: true });
    }
    console.log(`Saved THE ${RANKING_YEAR}: ${rows.length} institutions within rank 1,000.`);
}

async function scrapeTHERankings(filePath = THE_FILE_PATH) {
    if (!process.argv.includes('--offline')) {
        try {
            await refreshTHERankings(filePath);
        } catch (error) {
            console.warn(`THE refresh failed (${error.message}); reading the existing snapshot.`);
        }
    }
    const content = await fs.readFile(filePath);
    // Preserve offline compatibility with the previous Latin-1 vendor snapshot.
    const encoding = content.subarray(0, 512).toString('ascii').includes('# Encoding: UTF-8') ? 'utf8' : 'latin1';
    const results = [];
    await new Promise((resolve, reject) => {
        Readable.from([content.toString(encoding)])
            .pipe(csv({ headers: ['rank', 'name', 'country'], skipLines: 5,
                mapValues: ({ value }) => value.trim() }))
            .on('data', row => {
                try {
                    const rank = parseRank(row.rank);
                    if (rank && (!row.name || !row.country)) throw new Error('THE snapshot has an incomplete institution.');
                    if (rank && rank.upper <= 1000) {
                        results.push({ name: row.name, country: row.country, rank: rank.lower, source: 'the' });
                    }
                } catch (error) { reject(error); }
            })
            .on('end', resolve).on('error', reject);
    });
    if (!results.length) throw new Error('THE snapshot contains no ranked institutions.');
    console.log(`Read ${results.length} THE institutions from ${filePath}.`);
    return results;
}

if (require.main === module) scrapeTHERankings().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});

module.exports = { scrapeTHERankings, refreshTHERankings, parseRankingPage, parseRank, toCsv };

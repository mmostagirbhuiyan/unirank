#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const API_URL = 'https://www.usnews.com/education/best-global-universities/api/search';
const RANKING_URL = 'https://www.usnews.com/education/best-global-universities/rankings';
const DEFAULT_OUTPUT = path.join(__dirname, '..', 'frontend', 'public', 'data', 'usnews_rankings.csv');
const DEFAULT_LIMIT = 980;
const REQUEST_DELAY_MS = 100;
const MAX_ATTEMPTS = 3;

const requestHeaders = {
    Accept: 'application/json',
    Referer: RANKING_URL,
    'User-Agent': 'Mozilla/5.0 (compatible; UniRankDataRefresh/1.0)'
};

function parseArgs(argv) {
    const options = { output: DEFAULT_OUTPUT, limit: DEFAULT_LIMIT };

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--output' || argument === '-o') {
            options.output = argv[++index];
        } else if (argument === '--limit' || argument === '-l') {
            options.limit = Number.parseInt(argv[++index], 10);
        } else if (argument === '--help' || argument === '-h') {
            options.help = true;
        } else {
            throw new Error(`Unknown argument: ${argument}`);
        }
    }

    if (!options.help && (!options.output || !Number.isInteger(options.limit) || options.limit <= 0)) {
        throw new Error('Output must be set and limit must be a positive integer.');
    }

    return options;
}

function parseRank(item) {
    const ranking = (item.ranks || []).find(entry => entry.label === 'Best Global Universities');
    if (!ranking || ranking.is_ranked === false) return null;

    const rank = Number.parseInt(String(ranking.value).replace(/,/g, ''), 10);
    return Number.isInteger(rank) && rank > 0 ? rank : null;
}

function statValue(item, label) {
    const stat = (item.stats || []).find(entry => entry.label === label);
    return stat && stat.value != null ? String(stat.value).trim() : 'N/A';
}

function normalizeItem(item) {
    const rank = parseRank(item);
    const university = typeof item.name === 'string' ? item.name.trim() : '';
    if (rank === null || !university) return null;

    return {
        Rank: rank,
        University: university,
        Country: typeof item.country_name === 'string' && item.country_name.trim()
            ? item.country_name.trim()
            : 'N/A',
        Score: statValue(item, 'Global Score'),
        Enrollment: statValue(item, 'Enrollment')
    };
}

function csvCell(value) {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
    const columns = ['Rank', 'University', 'Country', 'Score', 'Enrollment'];
    const lines = rows.map(row => columns.map(column => csvCell(row[column])).join(','));
    return `${columns.join(',')}\n${lines.join('\n')}\n`;
}

function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function fetchPage(page) {
    const url = new URL(API_URL);
    url.searchParams.set('format', 'json');
    url.searchParams.set('page', String(page));

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
            const response = await fetch(url, { headers: requestHeaders });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            if (attempt === MAX_ATTEMPTS) {
                throw new Error(`Failed to fetch US News page ${page}: ${error.message}`);
            }
            await delay(500 * attempt);
        }
    }

    throw new Error(`Failed to fetch US News page ${page}.`);
}

async function fetchRankings(limit) {
    const rows = [];
    const seenUniversities = new Set();
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && rows.length < limit) {
        const payload = await fetchPage(page);
        if (!Array.isArray(payload.items) || !Number.isInteger(payload.total_pages)) {
            throw new Error(`Unexpected US News API response on page ${page}.`);
        }

        totalPages = payload.total_pages;
        for (const item of payload.items) {
            const row = normalizeItem(item);
            if (!row || seenUniversities.has(row.University)) continue;
            seenUniversities.add(row.University);
            rows.push(row);
            if (rows.length === limit) break;
        }

        process.stdout.write(`\rFetched ${rows.length}/${limit} ranked universities (page ${page}/${totalPages})`);
        page += 1;
        if (page <= totalPages && rows.length < limit) await delay(REQUEST_DELAY_MS);
    }
    process.stdout.write('\n');

    if (rows.length !== limit) {
        throw new Error(`Expected ${limit} ranked universities but received ${rows.length}.`);
    }

    return rows;
}

async function writeAtomically(outputPath, content) {
    const resolvedOutput = path.resolve(outputPath);
    const temporaryPath = `${resolvedOutput}.tmp`;
    await fs.mkdir(path.dirname(resolvedOutput), { recursive: true });
    await fs.writeFile(temporaryPath, content, 'utf8');
    await fs.rename(temporaryPath, resolvedOutput);
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        console.log('Usage: node scripts/usnews-api-scraper.js [--limit 980] [--output FILE]');
        return;
    }

    const rows = await fetchRankings(options.limit);
    await writeAtomically(options.output, toCsv(rows));
    console.log(`Saved ${rows.length} US News Best Global Universities to ${path.resolve(options.output)}.`);
}

if (require.main === module) {
    main().catch(error => {
        console.error(error.message);
        process.exit(1);
    });
}

module.exports = { normalizeItem, parseArgs, parseRank, toCsv };

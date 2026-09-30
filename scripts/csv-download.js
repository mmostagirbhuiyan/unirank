// Shared, validated downloader for the universityrankings.ch ranking CSVs.
//
// The vendor now answers automated CSV downloads with a captcha or login page
// instead of the file, so a download is only written over an existing source
// file after it has been checked to actually look like a ranking. A failed,
// empty or non-ranking download leaves the existing file in place and the run
// reports why.
const fs = require('fs');
const { exec } = require('child_process');

const STALENESS_MS = 30 * 24 * 60 * 60 * 1000;
const FORCE_REFRESH = process.argv.includes('--force-refresh');

function isFresh(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return false;
    return Date.now() - stat.mtimeMs < STALENESS_MS;
}

// A ranking file from universityrankings.ch opens with the vendor header and
// carries data rows that begin with a numeric or ranged rank. Captcha, login
// and error pages do not.
function looksLikeRanking(filePath) {
    let content;
    try {
        content = fs.readFileSync(filePath, 'latin1');
    } catch (error) {
        return false;
    }
    if (!content || !content.trim()) return false;
    const lines = content.split('\n');
    if (lines.length < 6 || !lines.some(line => line.includes('University Ranking Results'))) return false;
    let dataRows = 0;
    for (const line of lines) {
        if (/^\s*[0-9]+(?:-[0-9]+)?\s*,/.test(line)) dataRows++;
        if (dataRows >= 3) return true;
    }
    return false;
}

function keepOrThrow({ filePath, label, reason }) {
    if (fs.existsSync(filePath)) {
        console.log(`${label}: ${reason}; keeping the existing file at ${filePath}`);
        return 'kept';
    }
    throw new Error(`${label}: ${reason} and no existing file exists.`);
}

// Download url to filePath when the local copy is missing, stale, or force
// refreshed. A download that is empty, that curl rejects, or that does not
// parse as a ranking is discarded and the existing file is kept. Only a
// validated ranking replaces the file. Returns 'fresh', 'downloaded' or
// 'kept'. Throws when the download is unusable and there is no existing file.
async function downloadRankingCsv({ url, filePath, label }) {
    if (!FORCE_REFRESH && isFresh(filePath)) {
        console.log(`Using existing ${label} at ${filePath} (still fresh)`);
        return 'fresh';
    }
    if (FORCE_REFRESH) console.log(`--force-refresh: re-downloading ${label}...`);
    else if (fs.existsSync(filePath)) console.log(`${label} is stale (>30 days). Re-downloading...`);

    const tmpPath = filePath + '.tmp';
    try {
        await new Promise((resolve, reject) => {
            exec(`curl --fail -L -o '${tmpPath}' '${url}'`, error => (error ? reject(error) : resolve()));
        });
    } catch (error) {
        fs.rmSync(tmpPath, { force: true });
        return keepOrThrow({ filePath, label, reason: `download failed (${error.message})` });
    }

    if (!fs.existsSync(tmpPath) || fs.statSync(tmpPath).size === 0) {
        fs.rmSync(tmpPath, { force: true });
        return keepOrThrow({ filePath, label, reason: 'download was empty' });
    }
    if (!looksLikeRanking(tmpPath)) {
        fs.rmSync(tmpPath, { force: true });
        return keepOrThrow({ filePath, label, reason: 'download is not a ranking file (captcha, login or error page)' });
    }
    fs.renameSync(tmpPath, filePath);
    console.log(`Saved ${label} to ${filePath}`);
    return 'downloaded';
}

module.exports = { downloadRankingCsv, isFresh, looksLikeRanking };
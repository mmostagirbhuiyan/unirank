const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { downloadRankingCsv, looksLikeRanking } = require('../scripts/csv-download');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-download-test-'));
const old = new Date('2020-01-01T00:00:00Z');

function serve(body) {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(body);
        });
        server.listen(0, '127.0.0.1', () => resolve(server));
    });
}

const vendorHeader = '# University Ranking Results - www.universityrankings.ch\n';
const validCsv =
    vendorHeader +
    '# Ranking: Shanghai\n# Year: 2026\n#\n' +
    '   #    World Rank   ,  Institution   ,  Country   ,   \n' +
    '    1  ,   Harvard University   ,USA   \n' +
    '    2  ,   Stanford University   ,USA   \n' +
    '    3  ,   Massachusetts Institute of Technology - MIT   ,USA   \n';

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('a valid vendor ranking file is recognized', () => {
    const f = path.join(tmp, 'valid.csv');
    fs.writeFileSync(f, validCsv);
    expect(looksLikeRanking(f)).toBe(true);
});

test('captcha, login, empty and error pages are not rankings', () => {
    const cases = {
        captcha: '<html><body>Please verify you are human</body></html>',
        error: '<html><head><title>403 Forbidden</title></head></html>',
        empty: '',
        garbage: 'not a csv at all\njust some text\n'
    };
    for (const [name, body] of Object.entries(cases)) {
        const f = path.join(tmp, name);
        fs.writeFileSync(f, body);
        expect(looksLikeRanking(f)).toBe(false);
    }
});

test('a non-ranking download keeps the existing file', async () => {
    const server = await serve('<html>captcha</html>');
    const target = path.join(tmp, 'kept.csv');
    fs.writeFileSync(target, validCsv);
    fs.utimesSync(target, old, old);
    const url = `http://127.0.0.1:${server.address().port}/file.csv`;
    const result = await downloadRankingCsv({ url, filePath: target, label: 'TEST CSV' });
    server.close();
    expect(result).toBe('kept');
    expect(fs.readFileSync(target, 'latin1')).toContain('Harvard University');
});

test('a valid ranking download replaces the existing file', async () => {
    const server = await serve(validCsv);
    const target = path.join(tmp, 'replace.csv');
    fs.writeFileSync(target, 'OLD CONTENT');
    fs.utimesSync(target, old, old);
    const url = `http://127.0.0.1:${server.address().port}/file.csv`;
    const result = await downloadRankingCsv({ url, filePath: target, label: 'TEST CSV' });
    server.close();
    expect(result).toBe('downloaded');
    expect(fs.readFileSync(target, 'latin1')).toContain('Harvard University');
});
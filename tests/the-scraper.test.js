const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { scrapeTHERankings, refreshTHERankings, parseRankingPage, parseRank } = require('../scripts/the-scraper');

const rankingUrl = 'https://www.timeshighereducation.com/world-university-rankings/2027/world-ranking';
// Rank syntax and inclusion expectations come from THE's 2027 published table.
const institutions = [
    { nid: 1, name: 'University of Oxford', location: 'United Kingdom', rank: '1' },
    { nid: 2, name: 'Princeton University', location: 'United States', rank: '=3' },
    { nid: 3, name: 'Stanford University', location: 'United States', rank: '=3' },
    { nid: 4, name: 'Éxample, "North" University', location: 'France', rank: '801–1000' },
    { nid: 5, name: 'Beyond Scope University', location: 'France', rank: '1001–1200' },
    { nid: 6, name: 'Last Band University', location: 'France', rank: '2001+' },
    { nid: 7, name: 'Unranked University', location: 'France', rank: 'Reporter' }
];
// Independent input snapshot for byte-preservation and encoding expectations.
const goodSnapshot = '# Times Higher Education World University Rankings\n' +
    `# Source: ${rankingUrl}\n# Year: 2027\n# Encoding: UTF-8\n` +
    '# World Rank,Institution,Country\n' +
    '"1","University of Oxford","United Kingdom"\n' +
    '"=3","Princeton University","United States"\n' +
    '"=3","Stanford University","United States"\n' +
    '"801–1000","Éxample, ""North"" University","France"\n';
const page = () => ({ title: 'World University Rankings 2027', body: 'includes 6 institutions',
    rankingsTableConfig: { year: '2027', type: 'world_university_rankings', rankingsData: { data: structuredClone(institutions) } } });
const html = p => `<script type="application/json" id="__NEXT_DATA__">${JSON.stringify({ props: { pageProps: { page: p } } })}</script>`;
const originalFetch = global.fetch;
const originalArgv = [...process.argv];
let dir;
beforeEach(() => {
    process.argv = originalArgv.filter(arg => arg !== '--offline');
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'the-source-test-'));
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => html(page()) }));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
    global.fetch = originalFetch;
    process.argv = [...originalArgv];
    jest.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
});

test.each([
    ['1', { lower: 1, upper: 1 }], ['=3', { lower: 3, upper: 3 }],
    ['301–325', { lower: 301, upper: 325 }], ['801–1000', { lower: 801, upper: 1000 }],
    ['801-1000', { lower: 801, upper: 1000 }], ['1000', { lower: 1000, upper: 1000 }],
    ['1001–1200', { lower: 1001, upper: 1200 }], ['2001+', { lower: 2001, upper: Infinity }],
    ['Reporter', null]
])('interprets publisher rank %s', (input, expected) => expect(parseRank(input)).toEqual(expected));

test.each(['', '0', '=0', '-1', 'one', '1000–801', '801–', '801x', null, 1])('rejects invalid rank %s', input => {
    expect(() => parseRank(input)).toThrow();
});

test('includes tied ranks and the entire 801–1000 band, excludes later ranks and reporters', () => {
    expect(parseRankingPage(html(page())).map(row => [row.name, row.rank])).toEqual([
        ['University of Oxford', 1], ['Princeton University', 3], ['Stanford University', 3],
        ['Éxample, "North" University', 801]
    ]);
    const p = page();
    p.rankingsTableConfig.rankingsData.data[3].rank = '1000';
    expect(parseRankingPage(html(p))[3].rank).toBe(1000);
});

const invalidPages = [
    ['empty body', () => ''],
    ['captcha', () => '<html>Please verify you are human</html>'],
    ['login', () => '<html>Sign in</html>'],
    ['malformed JSON', () => '<script id="__NEXT_DATA__">{</script>'],
    ['absent page', () => html(undefined)],
    ['wrong title', p => { p.title = 'World University Rankings 2026'; return html(p); }],
    ['wrong year', p => { p.rankingsTableConfig.year = '2026'; return html(p); }],
    ['future year', p => { p.rankingsTableConfig.year = '2028'; return html(p); }],
    ['wrong table', p => { p.rankingsTableConfig.type = 'asia'; return html(p); }],
    ['absent table', p => { delete p.rankingsTableConfig.rankingsData; return html(p); }],
    ['empty table', p => { p.rankingsTableConfig.rankingsData.data = []; return html(p); }],
    ['truncated table', p => { p.rankingsTableConfig.rankingsData.data.pop(); p.rankingsTableConfig.rankingsData.data.pop(); return html(p); }],
    ['absent count', p => { p.body = ''; return html(p); }],
    ['wrong count', p => { p.body = 'includes 7 institutions'; return html(p); }],
    ['invalid rank', p => { p.rankingsTableConfig.rankingsData.data[1].rank = '3x'; return html(p); }],
    ['absent name', p => { delete p.rankingsTableConfig.rankingsData.data[1].name; return html(p); }],
    ['empty country', p => { p.rankingsTableConfig.rankingsData.data[1].location = ''; return html(p); }],
    ['absent id', p => { delete p.rankingsTableConfig.rankingsData.data[1].nid; return html(p); }],
    ['duplicate id', p => { p.rankingsTableConfig.rankingsData.data[1].nid = 1; return html(p); }],
    ['duplicate institution', p => { p.rankingsTableConfig.rankingsData.data[1] = { ...institutions[0], nid: 8 }; return html(p); }],
    ['missing top', p => { p.rankingsTableConfig.rankingsData.data[0].rank = '2'; return html(p); }],
    ['missing scope boundary', p => { p.rankingsTableConfig.rankingsData.data[3].rank = '701–800'; return html(p); }]
];
test.each(invalidPages)('%s download preserves the good snapshot', async (_, makeHtml) => {
    const file = path.join(dir, 'the.csv');
    const good = goodSnapshot;
    fs.writeFileSync(file, good);
    global.fetch.mockResolvedValue({ ok: true, text: async () => makeHtml(page()) });
    await expect(refreshTHERankings(file)).rejects.toThrow();
    expect(fs.readFileSync(file, 'utf8')).toBe(good);
    expect(fs.existsSync(file + '.tmp')).toBe(false);
    expect(await scrapeTHERankings(file)).toHaveLength(4);
});

test.each(['fresh', 'stale', 'empty', 'absent'])('refreshes a %s snapshot directly from THE', async state => {
    const file = path.join(dir, 'the.csv');
    if (state !== 'absent') fs.writeFileSync(file, state === 'empty' ? '' : 'OLD CONTENT');
    if (state === 'stale') fs.utimesSync(file, new Date('2020-01-01'), new Date('2020-01-01'));
    const rows = await scrapeTHERankings(file);
    expect(rows).toHaveLength(4);
    expect(rows[3]).toEqual({ name: 'Éxample, "North" University', country: 'France', rank: 801, source: 'the' });
    expect(fs.readFileSync(file, 'utf8')).toBe(goodSnapshot);
    expect(fs.existsSync(file + '.tmp')).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe(rankingUrl);
});

test.each(['HTTP 403', 'HTTP 500', 'network', 'body read', 'write', 'rename'])('%s failure preserves the good snapshot', async failure => {
    const file = path.join(dir, 'the.csv');
    const good = goodSnapshot;
    fs.writeFileSync(file, good);
    if (failure.startsWith('HTTP')) global.fetch.mockResolvedValue({ ok: false, status: Number(failure.slice(5)) });
    if (failure === 'network') global.fetch.mockRejectedValue(new Error('connection reset'));
    if (failure === 'body read') global.fetch.mockResolvedValue({ ok: true, text: async () => { throw new Error('truncated transfer'); } });
    if (failure === 'write' || failure === 'rename') jest.spyOn(fs.promises, failure === 'write' ? 'writeFile' : 'rename').mockRejectedValue(new Error('disk failure'));
    expect(await scrapeTHERankings(file)).toHaveLength(4);
    expect(fs.readFileSync(file, 'utf8')).toBe(good);
    expect(fs.existsSync(file + '.tmp')).toBe(false);
});

test.each(['empty', 'absent'])('a failed download with an %s snapshot stops', async state => {
    const file = path.join(dir, 'the.csv');
    if (state === 'empty') fs.writeFileSync(file, '');
    global.fetch.mockRejectedValue(new Error('connection reset'));
    await expect(scrapeTHERankings(file)).rejects.toThrow();
    expect(fs.existsSync(file)).toBe(state === 'empty');
    if (state === 'empty') expect(fs.statSync(file).size).toBe(0);
});

test('offline reads both the old Latin-1 snapshot and the publisher UTF-8 snapshot without a request', async () => {
    process.argv.push('--offline');
    const file = path.join(dir, 'the.csv');
    fs.writeFileSync(file, '# University Ranking Results\n# Ranking: THE\n# Year: 2026\n#\n# World Rank,Institution,Country\n1,Université Éxample,France\n801-1000,Example University,UK\n', 'latin1');
    expect(await scrapeTHERankings(file)).toEqual([
        { name: 'Université Éxample', country: 'France', rank: 1, source: 'the' },
        { name: 'Example University', country: 'UK', rank: 801, source: 'the' }
    ]);
    fs.writeFileSync(file, goodSnapshot);
    expect((await scrapeTHERankings(file))[3].name).toBe('Éxample, "North" University');
    expect(global.fetch).not.toHaveBeenCalled();
});

test('failed refresh reads the previous Latin-1 snapshot and preserves its bytes', async () => {
    const file = path.join(dir, 'the.csv');
    const legacy = Buffer.from('# University Ranking Results\n# Ranking: THE\n# Year: 2026\n#\n# World Rank,Institution,Country\n1,Université Éxample,France\n', 'latin1');
    fs.writeFileSync(file, legacy);
    global.fetch.mockRejectedValue(new Error('connection reset'));
    expect(await scrapeTHERankings(file)).toEqual([
        { name: 'Université Éxample', country: 'France', rank: 1, source: 'the' }
    ]);
    expect(fs.readFileSync(file)).toEqual(legacy);
});

test('repeated refreshes request the publisher each time and do not duplicate rows', async () => {
    const file = path.join(dir, 'the.csv');
    expect(await scrapeTHERankings(file)).toEqual(await scrapeTHERankings(file));
    expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('the request deadline aborts a stalled HTTP transfer and preserves the snapshot', async () => {
    const server = http.createServer(() => {});
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const timeout = AbortSignal.timeout;
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout').mockImplementation(() => timeout(25));
    global.fetch.mockImplementation((url, options) => originalFetch(`http://127.0.0.1:${server.address().port}`, options));
    const file = path.join(dir, 'the.csv');
    fs.writeFileSync(file, goodSnapshot);
    try {
        await expect(refreshTHERankings(file)).rejects.toThrow();
        expect(timeoutSpy).toHaveBeenCalledWith(30000);
        expect(fs.readFileSync(file, 'utf8')).toBe(goodSnapshot);
        expect(fs.existsSync(file + '.tmp')).toBe(false);
    } finally {
        await new Promise(resolve => {
            server.close(resolve);
            server.closeAllConnections();
        });
    }
});

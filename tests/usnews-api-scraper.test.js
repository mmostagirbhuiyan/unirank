const {
    normalizeItem,
    parseArgs,
    parseRank,
    toCsv
} = require('../scripts/usnews-api-scraper');

describe('US News API scraper', () => {
    test('parses ranked values and rejects unranked profiles', () => {
        expect(parseRank({
            ranks: [{ label: 'Best Global Universities', value: '1,183', is_ranked: true }]
        })).toBe(1183);
        expect(parseRank({
            ranks: [{ label: 'Best Global Universities', value: 'Unranked', is_ranked: false }]
        })).toBeNull();
    });

    test('normalizes a current API item', () => {
        expect(normalizeItem({
            name: ' Example University ',
            country_name: 'Example Country',
            ranks: [{ label: 'Best Global Universities', value: '42', is_ranked: true }],
            stats: [
                { label: 'Global Score', value: '81.2' },
                { label: 'Enrollment', value: '12,345' }
            ]
        })).toEqual({
            Rank: 42,
            University: 'Example University',
            Country: 'Example Country',
            Score: '81.2',
            Enrollment: '12,345'
        });
    });

    test('writes RFC 4180-compatible CSV cells', () => {
        const csv = toCsv([{
            Rank: 1,
            University: 'University, Example',
            Country: 'Example',
            Score: '100.0',
            Enrollment: '10,000'
        }]);

        expect(csv).toBe(
            'Rank,University,Country,Score,Enrollment\n' +
            '1,"University, Example",Example,100.0,"10,000"\n'
        );
    });

    test('uses the project scope by default and accepts CLI overrides', () => {
        expect(parseArgs([]).limit).toBe(980);
        expect(parseArgs(['--limit', '25', '--output', '/tmp/usnews.csv'])).toMatchObject({
            limit: 25,
            output: '/tmp/usnews.csv'
        });
    });
});

const { nameKey, resolveUniversities } = require('../scripts/university-identity');
const row = (name, source, rank = 1, country = 'USA') => ({ name, source, rank, country });
const alias = (originalName, suggestedStandardizedName) => ({ originalName, suggestedStandardizedName });

test('formatting, accents, conjunctions, word order and acronyms are equivalent', () => {
    expect(nameKey('The University of Éxample--Harbor')).toBe(nameKey('Example University - Harbor'));
    expect(nameKey('Institute of Science & Technology')).toBe(nameKey('Institute of Science and Technology'));
    expect(nameKey('Federal Institute of Research (FIR)')).toBe(nameKey('Federal Institute of Research'));
});

test('campus qualifiers and institutional words are not discarded', () => {
    expect(nameKey('University of Example (North)')).not.toBe(nameKey('University of Example (South)'));
    expect(nameKey('Example University')).not.toBe(nameKey('Example University of Technology'));
    expect(nameKey('Example University')).not.toBe(nameKey('Example State University'));
});

test('exact current names precede stale aliases and retain every source', () => {
    const result = resolveUniversities([
        row('Example University - Harbor', 'qs', 51),
        row('Example University--Harbor', 'usnews', 21),
        row('Example University - Harbor', 'arwu', 30)
    ], [alias('Example University - Harbor', 'Example University')]);
    expect(result.universities).toHaveLength(1);
    expect(result.universities[0].rankings).toEqual({
        qs: { rank: 51 }, usnews: { rank: 21 }, arwu: { rank: 30 }
    });
});

test('similar names and conflicting manual components never overwrite ranks', () => {
    const records = [
        row('Example University', 'qs', 90), row('Example University', 'arwu', 82),
        row('Example Technical University', 'arwu', 701),
        row('Example Technical University', 'the', 600)
    ];
    const aliases = [alias('Example Technical University', 'Example University')];
    for (const input of [records, [...records].reverse()]) {
        const result = resolveUniversities(input, aliases);
        expect(result.universities).toHaveLength(2);
        expect(result.universities.find(u => u.name === 'Example University').rankings.arwu.rank).toBe(82);
        expect(result.rejected).toHaveLength(1);
    }
});

test('aliases are bidirectional, transitive and independent of edge order', () => {
    const records = [row('Alpha University', 'qs'), row('Université Alpha Historic', 'the')];
    const aliases = [alias('Alpha University', 'Old College'), alias('Université Alpha Historic', 'Old College')];
    for (const edges of [aliases, [...aliases].reverse()]) {
        expect(resolveUniversities(records, edges).universities).toHaveLength(1);
    }
});

test('same names and aliases cannot merge across countries', () => {
    const records = [row('Example University', 'qs', 1, 'USA'), row('Example University', 'the', 2, 'UK')];
    expect(resolveUniversities(records).universities).toHaveLength(2);
});

test('country names within university names are retained', () => {
    const records = [row('University of Jordan', 'qs', 1, 'Jordan'), row('Jordan University', 'the', 2, 'Jordan')];
    expect(resolveUniversities(records).universities).toHaveLength(1);
});

test('conflicting raw source identities are reported, never picked by input order', () => {
    const records = [row('Example University', 'qs', 5), row('Example University', 'qs', 500),
        row('Example University', 'the', 10)];
    const result = resolveUniversities(records);
    expect(result.conflicts[0].records).toHaveLength(2);
    expect(result.universities[0].rankings).toEqual({ the: { rank: 10 } });
});

test('whole conflicting alias components are rejected rather than partially merged', () => {
    const records = [row('A University', 'qs'), row('B University', 'the'), row('C University', 'qs')];
    const aliases = [alias('A University', 'B University'), alias('B University', 'C University')];
    expect(resolveUniversities(records, aliases).universities).toHaveLength(3);
    expect(resolveUniversities(records, [...aliases].reverse()).universities).toHaveLength(3);
});

test('published examples contain every owning rank and no foreign rank', async () => {
    process.argv.push('--offline');
    const { buildRankings } = require('../scripts/scrape-rankings');
    const { rankings, universities, records, conflicts } = await buildRankings();
    const michigan = rankings.filter(u => /University of Michigan/.test(u.name));
    expect(michigan).toHaveLength(1);
    expect(michigan[0].originalRankings).toEqual({
        qs: { rank: 51 }, the: { rank: 23 }, arwu: { rank: 35 }, usnews: { rank: 21 }
    });
    expect(rankings.find(u => u.name === 'Nanjing University').originalRankings.arwu.rank).toBe(70);
    expect(rankings.find(u => u.name === 'Xinjiang University').originalRankings.arwu.rank).toBe(601);
    expect(conflicts).toEqual([]);
    const accounted = universities.flatMap(u => u.members);
    const signature = r => JSON.stringify([r.source, r.name, r.rank]);
    expect(accounted.map(signature).sort()).toEqual(records.map(signature).sort());
    for (const university of universities) {
        expect(new Set(university.members.map(r => r.source)).size).toBe(university.members.length);
        expect(new Set(university.members.map(r => r.country)).size).toBe(1);
    }
    const fs = require('fs');
    const path = require('path');
    const published = JSON.parse(fs.readFileSync(path.join(__dirname,
        '../frontend/public/data/aggregated-rankings.json'), 'utf8'));
    expect(published).toEqual(rankings);
});

test('Latin-1 source names are decoded without replacement characters', async () => {
    process.argv.push('--offline');
    const records = await require('../scripts/scrape-rankings').readSourceRecords();
    expect(records.filter(r => r.source === 'qs').some(r => r.name.includes('München'))).toBe(true);
    expect(records.some(r => r.name.includes('\uFFFD'))).toBe(false);
});

test('known cross-source aliases beyond the ticket examples resolve to one institution', async () => {
    if (!process.argv.includes('--offline')) process.argv.push('--offline');
    const { universities } = await require('../scripts/scrape-rankings').buildRankings();
    const owner = (source, name) => universities.find(university =>
        university.members.some(member => member.source === source && member.name === name));

    const expectSameOwner = (leftSource, leftName, rightSource, rightName, rankings) => {
        const left = owner(leftSource, leftName);
        const right = owner(rightSource, rightName);
        expect(left).toBeDefined();
        expect(right).toBe(left);
        expect(left.rankings).toMatchObject(rankings);
    };

    expectSameOwner(
        'qs', 'North Carolina State University',
        'usnews', 'North Carolina State University--Raleigh',
        {
            qs: { rank: 320 },
            the: { rank: 301 },
            arwu: { rank: 201 },
            usnews: { rank: 268 }
        }
    );

    expectSameOwner(
        'qs', 'Chonbuk National University',
        'usnews', 'Jeonbuk National University',
        {
            qs: { rank: 677 },
            the: { rank: 801 },
            arwu: { rank: 701 },
            usnews: { rank: 944 }
        }
    );

    expectSameOwner(
        'qs', 'National Tsinghua University',
        'usnews', 'National Tsing Hua University',
        {
            qs: { rank: 142 },
            the: { rank: 401 },
            arwu: { rank: 401 },
            usnews: { rank: 520 }
        }
    );
});

test('Rutgers campus ranks are assigned instead of excluded', async () => {
    if (!process.argv.includes('--offline')) process.argv.push('--offline');
    const { universities, conflicts } =
        await require('../scripts/scrape-rankings').buildRankings();

    const newBrunswick = universities.find(university =>
        university.members.some(member =>
            member.source === 'usnews' &&
            member.name === 'Rutgers, The State University of New Jersey--New Brunswick'));

    const newark = universities.find(university =>
        university.members.some(member =>
            member.source === 'usnews' &&
            member.name === 'Rutgers, The State University of New Jersey--Newark'));

    expect(newBrunswick.rankings.qs).toEqual({ rank: 314 });
    expect(newark.rankings.qs).toEqual({ rank: 801 });
    expect(conflicts.filter(conflict =>
        conflict.source === 'qs' &&
        conflict.records.some(record => /Rutgers/.test(record.name))
    )).toHaveLength(0);
});

test('publishing leaves no source identity unresolved', async () => {
    if (!process.argv.includes('--offline')) process.argv.push('--offline');
    const { conflicts } = await require('../scripts/scrape-rankings').buildRankings();
    expect(conflicts).toEqual([]);
});

test('word segmentation equivalence preserves letters and source uniqueness', () => {
    expect(resolveUniversities([row('Northbridge University', 'qs'),
        row('North Bridge University', 'the')]).universities).toHaveLength(1);
    expect(resolveUniversities([row('Northbridge University', 'qs'),
        row('North Bridge University', 'qs')]).universities).toHaveLength(2);
    expect(resolveUniversities([row('Northbridge University', 'qs'),
        row('South Bridge University', 'the')]).universities).toHaveLength(2);
});

test('evidenced aliases are scoped to their country', () => {
    const records = [row('Old University', 'qs', 1, 'UK'), row('New University', 'the', 2, 'UK'),
        row('Old University', 'qs', 1, 'USA'), row('New University', 'the', 2, 'USA')];
    const aliases = [{ ...alias('Old University', 'New University'), country: 'United States' }];
    expect(resolveUniversities(records, aliases).universities).toHaveLength(3);
});

test('all researched aliases join their source records without crossing countries', async () => {
    if (!process.argv.includes('--offline')) process.argv.push('--offline');
    const { countryKey } = require('../scripts/university-identity');
    const { universities } = await require('../scripts/scrape-rankings').buildRankings();
    const aliases = require('../frontend/public/data/manual-university-mapping.json');
    for (const mapping of aliases.filter(mapping => mapping.evidence)) {
        const owner = name => universities.find(university =>
            university.country === countryKey(mapping.country) &&
            university.members.some(member => nameKey(member.name) === nameKey(name)));
        const original = owner(mapping.originalName);
        expect(original).toBeDefined();
        expect(owner(mapping.suggestedStandardizedName)).toBe(original);
    }
});

test('repaired source labels publish their unchanged ranks on the corrected institutions', async () => {
    if (!process.argv.includes('--offline')) process.argv.push('--offline');
    const { universities } = await require('../scripts/scrape-rankings').buildRankings();
    const repairs = require('../docs/RR-UNIRANK-DATA-MATCH-source-repairs.json');
    for (const repair of repairs) {
        const source = repair.file.split('_')[0];
        const owners = universities.filter(university => university.members.some(member =>
            member.source === source && member.name === repair.correctedName));
        expect(owners).toHaveLength(1);
        expect(owners[0].rankings[source]).toEqual({ rank: repair.rank });
    }
});

test('additional cross-source identities are not published as split universities', async () => {
    if (!process.argv.includes('--offline')) process.argv.push('--offline');
    const { universities } = await require('../scripts/scrape-rankings').buildRankings();

    const owner = (source, name) => universities.find(university =>
        university.members.some(member =>
            member.source === source && member.name === name));

    const expectSameOwner = (leftSource, leftName, rightSource, rightName, rankings) => {
        const left = owner(leftSource, leftName);
        const right = owner(rightSource, rightName);
        expect(left).toBeDefined();
        expect(right).toBe(left);
        expect(left.rankings).toMatchObject(rankings);
    };

    expectSameOwner(
        'qs', 'Higher School of Economics',
        'usnews', 'National Research University - Higher School of Economics',
        {
            qs: { rank: 423 }, the: { rank: 501 },
            arwu: { rank: 801 }, usnews: { rank: 573 }
        }
    );

    expectSameOwner(
        'qs', 'Virginia Polytechnic Institute and State University',
        'usnews', 'Virginia Tech',
        {
            qs: { rank: 366 }, the: { rank: 251 },
            arwu: { rank: 201 }, usnews: { rank: 285 }
        }
    );

    expectSameOwner(
        'qs', 'Polytechnic University of Bari',
        'usnews', 'Politecnico di Bari',
        {
            qs: { rank: 951 }, the: { rank: 501 },
            arwu: { rank: 701 }, usnews: { rank: 809 }
        }
    );

    expectSameOwner(
        'the', "Sant'Anna School of Advanced Studies",
        'usnews', "Scuola Superiore Sant'Anna",
        { the: { rank: 201 }, usnews: { rank: 897 } }
    );

    expectSameOwner(
        'arwu', 'City University of New York - City College',
        'usnews', 'CUNY--City College',
        { arwu: { rank: 501 }, usnews: { rank: 897 } }
    );

    expectSameOwner(
        'qs', 'National Research Nuclear University',
        'usnews', 'National Research Nuclear University MEPhI (Moscow Engineering Physics Institute)',
        {
            qs: { rank: 626 }, the: { rank: 601 },
            usnews: { rank: 770 }
        }
    );
});

test('phrase expansions retain all campus words, apply beyond known pairs, and respect countries', () => {
    const records = [
        row('CUNY--North Campus', 'qs'),
        row('City University of New York - North Campus', 'the'),
        row('City University of New York - South Campus', 'arwu'),
        row('City University of New York', 'usnews'),
        row('CUNY--North Campus', 'qs', 1, 'UK'),
        row('City University of New York - North Campus', 'the', 1, 'UK')
    ];
    const result = resolveUniversities(records);
    expect(result.universities).toHaveLength(5);
    expect(result.universities.find(u => u.members.length === 2).rankings)
        .toEqual({ qs: { rank: 1 }, the: { rank: 1 } });
    expect(resolveUniversities([
        row('Politecnico di Example', 'qs', 1, 'Italy'),
        row('Polytechnic University of Example', 'the', 2, 'Italy'),
        row('Polytechnic University of Another City', 'arwu', 3, 'Italy')
    ]).universities).toHaveLength(2);
});

test('phrase collisions reject the entire component without rank loss', () => {
    const result = resolveUniversities([
        row('CUNY--Example', 'qs', 1),
        row('City University of New York - Example', 'qs', 2),
        row('City University of New York - Example', 'the', 3)
    ]);
    expect(result.universities).toHaveLength(2);
    expect(result.universities.flatMap(u => u.members)).toHaveLength(3);
    expect(result.rejected).toHaveLength(1);
});

test('Macao spelling variants resolve without merging different universities', () => {
    const result = resolveUniversities([
        row('Example University', 'qs', 1, 'Macao'),
        row('Example University', 'the', 2, 'Macau'),
        row('Another University', 'arwu', 3, 'Macau')
    ]);
    expect(result.universities).toHaveLength(2);
});

test('actual campuses, systems, and separate medical institutions stay separate', async () => {
    if (!process.argv.includes('--offline')) process.argv.push('--offline');
    const { universities } = await require('../scripts/scrape-rankings').buildRankings();
    const pairs = [
        ['CUNY--City College', 'The Graduate Center - CUNY'],
        ['CUNY--City College', 'City University of New York'],
        ['University of Massachusetts (System)', 'University of Massachusetts--Amherst'],
        ['University of Massachusetts--Amherst', 'University of Massachusetts--Boston'],
        ['Arizona State University--Tempe', 'Arizona State University--Downtown Phoenix'],
        ['Shahid Beheshti University', 'Shahid Beheshti University Medical Sciences']
    ];
    for (const [a, b] of pairs) {
        const owner = name => universities.find(u => u.members.some(m => m.name === name));
        expect(owner(a)).toBeDefined();
        expect(owner(b)).toBeDefined();
        expect(owner(a)).not.toBe(owner(b));
    }
});

test('publisher geography overrides are record scoped and preserve the original label', async () => {
    if (!process.argv.includes('--offline')) process.argv.push('--offline');
    const { universities } = await require('../scripts/scrape-rankings').buildRankings();
    for (const rule of require('../frontend/public/data/identity-country-overrides.json')) {
        const owners = universities.filter(u => u.members.some(m => m.name === rule.name));
        expect(owners).toHaveLength(1);
        expect(owners[0].country).toBe(rule.country);
        expect(owners[0].members.find(m => m.source === rule.source).sourceCountry).toBe('Türkiye');
    }
    expect(resolveUniversities([
        row('Unrelated University', 'qs', 1, 'Turkey'),
        row('Unrelated University', 'the', 2, 'Cyprus')
    ]).universities).toHaveLength(2);
});

test('all round-three resolved split pairs retain every audited source rank', async () => {
    if (!process.argv.includes('--offline')) process.argv.push('--offline');
    const { universities } = await require('../scripts/scrape-rankings').buildRankings();
    const identities = require('../docs/RR-UNIRANK-DATA-MATCH-round3-identities.json');
    expect(identities).toHaveLength(25);
    for (const identity of identities) {
        const owners = identity.members.map(member => universities.find(u =>
            u.members.some(m => m.source === member.source && m.name === member.name)));
        expect(owners[0]).toBeDefined();
        for (const owner of owners) expect(owner).toBe(owners[0]);
        expect(owners[0].rankings).toEqual(Object.fromEntries(
            identity.members.map(m => [m.source, { rank: m.rank }])));
    }
});

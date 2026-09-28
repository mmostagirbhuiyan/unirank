#!/usr/bin/env node
// Check source conservation and regenerated output, not a guessed university count.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { buildRankings } = require('./scrape-rankings');

async function main() {
    process.argv.push('--offline');
    const { rankings, universities, records, conflicts } = await buildRankings();
    const dir = path.join(__dirname, '../frontend/public/data');
    const read = file => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const published = read('aggregated-rankings.json');
    const enhanced = read('enhanced-aggregated-rankings.json');
    const stats = read('global-stats.json');
    const audit = read('identity-audit.json');

    assert.deepEqual(published, rankings, 'Published rankings differ from the pipeline');
    assert.deepEqual(enhanced.map(({ insights, ...row }) => row), published,
        'Enhanced and base rankings differ');
    assert.equal(stats.totalUniversities, published.length, 'Displayed count is stale');
    assert.deepEqual(audit.sourceAssignments, universities.map(({ name, country, members }) =>
        ({ name, country, members })), 'Source assignments are stale');
    assert.deepEqual(audit.unresolvedSourceConflicts, conflicts, 'Conflict audit is stale');

    assert.deepEqual(conflicts, [], 'Unresolved identities are not published ranks');
    const signature = row => JSON.stringify([row.source, row.name, row.rank]);
    assert.deepEqual(universities.flatMap(u => u.members).map(signature).sort(),
        records.map(signature).sort(), 'Every input rank must have exactly one published owner');

    for (const source of ['qs', 'the', 'arwu', 'usnews']) {
        const input = records.filter(row => row.source === source).length;
        const assigned = universities.filter(row => row.rankings[source]).length;
        const unresolved = conflicts.filter(row => row.source === source)
            .reduce((sum, conflict) => sum + conflict.records.length, 0);
        assert.equal(assigned, input, source + ': records lost or counted twice');
        console.log(source + ': ' + assigned + ' assigned, ' + unresolved + ' unresolved, ' + input + ' input');
    }
    console.log(published.length + ' universities. Published files and counts agree.');
    if (conflicts.length) {
        throw new Error(conflicts.length + ' unresolved source identities. See identity-audit.json. Do not treat this data as fully verified.');
    }
    console.log('Data integrity check passed.');
}

if (require.main === module) main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});

module.exports = { main };

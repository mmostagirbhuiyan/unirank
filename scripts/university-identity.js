// Formatting equivalence preserves institutional and campus words.
function nameKey(name, sortWords = true) {
    // Strip a trailing acronym only when it expands to words in this name.
    const acronym = name.match(/(?:\s*[-,(]\s*|\s+)([A-Z]{2,})\)?$/);
    if (acronym) {
        const base = name.slice(0, acronym.index);
        const initials = base.replace(/\b(of|the|and|at|in)\b/gi, ' ')
            .match(/\b[A-Za-z]/g)?.join('').toUpperCase();
        if (initials === acronym[1]) name = base;
    }
    const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\bIII\b/g, '3').replace(/\bII\b/g, '2').replace(/\bI\b/g, '1')
        .toLowerCase().replace(/[ø]/g, 'o').replace(/[ł]/g, 'l')
        .replace(/['’]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\b(the|of|at|in|de|and)\b/g, ' ')
        .replace(/\b(universite|universitat|universidad|universidade|universiti|universitas)\b/g, 'university')
        .replace(/\bsciences\b/g, 'science')
        .replace(/\bdefence\b/g, 'defense')
        .replace(/\s+/g, ' ').trim();
    return sortWords ? normalized.split(' ').sort().join(' ') : normalized;
}

function countryKey(country) {
    const aliases = {
        USA: 'United States', UK: 'United Kingdom', 'S. Korea': 'South Korea',
        'Republic of Korea': 'South Korea', 'Iran (Islamic Republic of)': 'Iran',
        'Venezuela (Bolivarian Republic of)': 'Venezuela', 'Northern Cyprus': 'Cyprus',
        Czechia: 'Czech Republic', 'Brunei Darussalam': 'Brunei',
        'Viet Nam': 'Vietnam', 'Türkiye': 'Turkey', Macau: 'Macao'
    };
    return aliases[country.trim()] || country.trim();
}

function recordKey(record) {
    let name = record.name.trim();
    const country = countryKey(record.country);
    const labels = [record.country, country];
    for (const label of labels) {
        const suffix = new RegExp('(?:\\s*[-,(]\\s*|\\s+)' +
            label.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&') + '\\)?$', 'i');
        const shorter = name.replace(suffix, '');
        if (nameKey(shorter).split(' ').length >= 2) name = shorter;
    }
    return nameKey(name);
}

// Resolve all records together, not one incoming name at a time. Exact identities
// are established before aliases, so a suggestion cannot steal an occupied rank.
function resolveUniversities(records, aliases = [], phrases = require('../frontend/public/data/identity-phrases.json'),
    countryOverrides = require('../frontend/public/data/identity-country-overrides.json')) {
    const groups = new Map();
    const rejected = [];
    const conflicts = [];
    for (const record of records) {
        const override = countryOverrides.find(rule => rule.source === record.source &&
            rule.name === record.name && countryKey(rule.originalCountry) === countryKey(record.country));
        const country = countryKey(override ? override.country : record.country);
        const key = country + '\0' + recordKey(record);
        if (!groups.has(key)) groups.set(key, { country, members: [], keys: new Set([nameKey(record.name), recordKey(record)]) });
        const group = groups.get(key);
        group.keys.add(nameKey(record.name));
        // Joining romanized words is formatting equivalence, not fuzzy spelling.
        // Keep this key separate from sorted-word keys and retain every letter.
        group.keys.add('compact:' + nameKey(record.name, false).replace(/ /g, ''));
        // Expand evidenced phrases without deleting the remaining words. In
        // particular, CUNY City College cannot become CUNY Graduate Center.
        let expanded = ' ' + nameKey(record.name, false) + ' ';
        for (const phrase of phrases) {
            if (countryKey(phrase.country) !== country) continue;
            expanded = expanded.split(' ' + nameKey(phrase.from, false) + ' ')
                .join(' ' + nameKey(phrase.to, false) + ' ');
        }
        group.keys.add(nameKey(expanded));
        group.members.push({ ...record, country,
            ...(override ? { sourceCountry: record.country } : {}) });
    }

    for (const [key, group] of groups) {
        const sources = new Set(group.members.map(member => member.source));
        for (const source of sources) {
            const matching = group.members.filter(member => member.source === source);
            if (matching.length > 1) {
                conflicts.push({ country: group.country, source, records: matching });
                group.members = group.members.filter(member => member.source !== source);
            }
        }
        if (!group.members.length) groups.delete(key);
    }

    // Evaluate whole alias components before merging. A conflicting component
    // is rejected as a unit, rather than letting mapping order pick a winner.
    const countries = new Set([...groups.values()].map(group => group.country));
    for (const country of countries) {
        const local = [...groups.values()].filter(group => group.country === country);
        const graph = new Map();
        const connect = (a, b) => {
            if (!graph.has(a)) graph.set(a, new Set());
            if (!graph.has(b)) graph.set(b, new Set());
            graph.get(a).add(b);
            graph.get(b).add(a);
        };
        for (const group of local) {
            const keys = [...group.keys];
            keys.forEach(key => connect(keys[0], key));
        }
        for (const alias of aliases) {
            if (alias.country && countryKey(alias.country) !== country) continue;
            const from = nameKey(alias.originalName);
            const to = nameKey(alias.suggestedStandardizedName);
            if (alias.source && !local.some(group => group.keys.has(from) &&
                group.members.some(member => member.source === alias.source))) continue;
            // A system is not interchangeable with one of its campuses.
            if (/\bsystem\b/.test(from) !== /\bsystem\b/.test(to)) continue;
            connect(from, to);
        }
        const visited = new Set();
        for (const key of graph.keys()) {
            if (visited.has(key)) continue;
            const component = new Set();
            const pending = [key];
            while (pending.length) {
                const next = pending.pop();
                if (component.has(next)) continue;
                component.add(next);
                visited.add(next);
                pending.push(...graph.get(next));
            }
            const matching = local.filter(group => [...group.keys].some(k => component.has(k)));
            if (matching.length < 2) continue;
            const members = matching.flatMap(group => group.members);
            if (new Set(members.map(member => member.source)).size !== members.length) {
                rejected.push({ country, names: matching.map(group => group.members[0].name),
                    reason: 'Alias component contains distinct records from the same source' });
                continue;
            }
            const first = matching[0];
            first.members = members;
            matching.slice(1).forEach(group => {
                for (const [id, value] of groups) if (value === group) groups.delete(id);
            });
        }
    }
    const universities = [...groups.values()].map(group => {
        // Prefer a current source name over a stale alias target.
        const members = group.members.sort((a, b) =>
            (a.source === 'usnews' ? -1 : 0) - (b.source === 'usnews' ? -1 : 0) ||
            a.source.localeCompare(b.source) || a.name.localeCompare(b.name));
        return {
            name: members[0].name,
            country: group.country,
            rankings: Object.fromEntries(members.map(member => [member.source, { rank: member.rank }])),
            members
        };
    });
    return { universities, rejected, conflicts };
}

module.exports = { nameKey, countryKey, resolveUniversities };

# RR-UNIRANK-DATA-MATCH, round 3 of 3

## Verdict and finding

REAL, confirmed. The six reported splits are fixed and every supplied assertion is retained verbatim in `tests/university-identity.test.js`. The broader finding is only partially fixed, not disproven. This round resolves 25 previously split pairs, including 19 beyond the six reviewer examples. I cannot certify the requested whole-dataset identity coverage. One ambiguous publisher identity remains open, so the recommendation remains **do not ship**.

The unresolved US News “Free University of Brussels” record could denote VUB or ULB. Both institutions have that English translation, as explained by [VUB's institutional history](https://www.vub.be/en/about-vub/history-and-philosophy-vub/how-it-started). A separate ULB source record makes VUB plausible, but that is an inference, not sufficient identity evidence. The record remains separate, with the open decision recorded in [the review ledger](RR-UNIRANK-DATA-MATCH-open-review.json). Record conservation passing does not prove that all institutional identities are correct.

## Changes and evidence

The audit considered incomplete source groups across countries, not only the reviewer names. Name similarity was used for investigation, never to assign ranks. The resolver now supports country-scoped, evidenced phrase expansion in `identity-phrases.json`. CUNY expansion preserves every campus word. ENS expansion preserves the city. The Italian Politecnico translation preserves the institution's location. Synthetic, previously unseen names test these rules independently of the dataset's exact pairs. Conflicting source components still reject the entire merge.

Semantic equivalences that cannot safely be inferred from spelling use 18 additional country-scoped, evidenced aliases. These include legal and common names, translations, renamings and documented flagship qualifiers. Broadly dropping “National”, “State”, “Technology”, medical qualifiers or campus names would merge different institutions, so no such rule was added. The alias evidence is in `manual-university-mapping.json`, marked `round: 3`.

The six examples are grounded in [HSE's history](https://www.hse.ru/en/info/history), [Virginia Tech's naming guidance](https://brand.vt.edu/university-style-guide.html), [Politecnico di Bari's bilingual site](https://www.poliba.it/it/homepage), [Sant'Anna's institutional page](https://phdinlaw.santannapisa.it/scuola/), [City College's site](https://www.ccny.cuny.edu/) and [MEPhI's official site](https://eng.mephi.ru/). Evidence was consulted on 2026-09-28, including indexed official excerpts where available. No claim is made that every linked PDF was fully downloaded.

Macau and Macao now share a geographic key, resolving two further splits. Two institution-specific, source-specific geography overrides reconcile the US News Turkey grouping of Near East and Eastern Mediterranean universities with the existing Cyprus grouping in other sources. These do not equate Turkey with Cyprus generally. The original publisher label is retained as `sourceCountry`. Evidence and reasoning are in `identity-country-overrides.json`.

No CSV names or ranks were changed in round 3. The earlier source repairs remain intact. Scoring, weights, dependencies and frontend design are unchanged. No commit or deployment was performed.

## Universities whose identities changed

The 25 merged identities are Khalifa University of Science and Technology, Texas A&M University--College Station, Tecnologico de Monterrey, ENS De Lyon, University of Macau, Virginia Tech, Ajman University, Macau University of Science and Technology, National and Kapodistrian University of Athens, National Research University - Higher School of Economics, Università della Svizzera italiana, UNESP - Universidade Estadual Paulista, Friedrich Schiller University of Jena, National Research Nuclear University MEPhI (Moscow Engineering Physics Institute), University of Tromsø, Eastern Mediterranean University, Northwest A&F University - China, AGH University of Krakow, Near East University, University of Franche-Comté, Politecnico di Bari, University at Albany--SUNY, Scuola Superiore Sant'Anna, CUNY--City College and University of Bodenkultur Wien.

[The round-3 identity ledger](RR-UNIRANK-DATA-MATCH-round3-identities.json) lists both previous rows and every resulting source member and rank for each merge. The count is measured from original source-record ownership, not the number of mapping entries. Each of these 25 merges combines exactly two previous rows.

[The exhaustive row-change ledger](RR-UNIRANK-DATA-MATCH-changes.json) is updated against HEAD and includes the starting round-3 working-tree comparison in `round3`. Round 3 changes source ranks on 25 retained rows, removes 25 split rows, and changes only ranking metadata on 1,451 other rows. The previous `round2` comparison remains historical. Against HEAD, the final output has 148 retained identities with changed source ranks, 85 added rows, 179 removed rows and 1,328 rows with metadata-only changes. Added and removed rows can represent renames or merges.

## Verification

Ran `node scripts/scrape-rankings.js --offline` and `node scripts/generate-frontend-insights.js`. Both published ranking files, the identity audit, global statistics and README count now agree on 1,562 universities, down from the round-3 starting count of 1,587.

Ran `npm test`: 33 tests passed across three suites, including the pre-existing worktree suite discovered by Jest. This retains all previous assertions, the six new reviewer assertions, every evidence-bearing alias assertion and a regression for every one of the 25 audited merges. Additional tests verify unseen phrase variants, country scope, phrase collisions, source-country provenance, and separation of CUNY campuses, Massachusetts campuses and system, Arizona State campuses, and Shahid Beheshti's separate medical institution.

Ran `node scripts/data-integrity-check.js`: passed. All 3,972 input records have exactly one published owner, comprising QS 1,000, THE 992, ARWU 1,000 and US News 980. There are zero unresolved same-source conflicts. Generated base, enhanced, assignment and count files agree. This is a conservation and reproducibility check, not proof of semantic completeness.

Ran `git diff --check`: passed. No dependency manifests, lockfiles or aggregation scoring code were changed. No frontend production build was rerun in this round because no frontend application code changed.

## TODO not completed

Resolve the ambiguous Belgian publisher record using publisher profile metadata or another authoritative source tying that exact record to VUB or ULB. Complete independent identity certification of the remaining dataset before declaring the broad finding fully fixed. The present source snapshots contain names and countries, not stable cross-publisher institution identifiers, and exact-name conservation cannot establish semantic coverage.

No commit, deployment, dependency upgrade or unrelated toolchain migration was performed.

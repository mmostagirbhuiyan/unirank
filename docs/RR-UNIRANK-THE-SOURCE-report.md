# RR-UNIRANK-THE-SOURCE writer report

Base commit: `1cef93335420779f66c07b37e46143d7a914f908`. Research and execution date: October 1, 2026, America/New_York. The generated statistics use UTC and show `2026-10-02`.

The normal refresh now retrieves THE World University Rankings 2027 directly from [THE's public ranking page](https://www.timeshighereducation.com/world-university-rankings/2027/world-ranking). Its embedded published table contains the complete dataset. No browser, login, manual download, third-party ranking provider, or added dependency is used for THE. Validation happens before writing a temporary CSV; rename replaces the snapshot only after validation and writing succeed. A failed refresh reads the existing snapshot. Offline mode makes no THE request.

The committed scraper requested the vendor's 2025 URL, retained a fresh local file for 30 days, and consequently continued publishing the 2026 vendor snapshot. An uncommitted publisher scraper and 2027 CSV were already present at the start of this writer pass. They were preserved, verified, and completed with identity corrections, failure tests, regenerated outputs, and this report. The pre-existing untracked `AGENTS.md` was left alone. On resume, `git status`, the diff against `1cef933`, and all untracked ticket artifacts were inspected before further work. HEAD is `1ad6248`; its sole intervening committed change is `frontend/src/styles.css`. That pre-existing CSS change was preserved, and this writer made no frontend design edit. All baseline executions and comparison hashes in this report now use the requested `1cef933` archive.

THE publishes 2,297 ranked institutions and 849 reporters. Its complete rank bands through 1,000 contain **1,001 institutions**, including **199 in 801–1,000**. The ticket's scope is the published rank boundary, so ties are retained. The CSV preserves the publisher's original rank labels. Aggregation continues using the lower bound of a band, consistent with the existing pipeline.

The matcher received 84 country- and THE-source-scoped, researched name aliases through its existing mapping data, plus general Russian Federation/Russia and Turkish dotless-i formatting equivalence. [The identity evidence ledger](RR-UNIRANK-THE-SOURCE-identities.json) lists every new alias, publisher identifier, original 2027 rank label, evidence URL, consultation date, and expected counterparts from the base commit. Alias matching still rejects source conflicts and retains campus qualifiers. Two stale Massachusetts-to-Amherst aliases were removed: [THE identifies its Massachusetts entry as the five-campus system](https://www.timeshighereducation.com/world-university-rankings/university-massachusetts).

One matcher geography override joins Central European University to its existing QS row. [QS's current publisher profile](https://www.topuniversities.com/universities/central-european-university) locates the same rank-239 institution in Vienna, Austria. Its unchanged source CSV still says Hungary. The matcher retains that label as `sourceCountry: Hungary`, assigns the current country Austria, and joins THE rank 269. Neither its source rank nor the QS source file or downloader was changed.

Final output: **1,579 universities**, 1,001 THE assignments, zero unresolved source conflicts, and zero repeated display names. QS has 1,000 assignments, ARWU 1,000, and US News 980. Every previously joined group of QS/ARWU/US News records remains joined, with its original source ranks. Massachusetts, its individual campuses, the Toulouse association and its member universities, and distinct medical institutions remain separate.

## Executed verification by expected output

Expected values below come from the ticket, THE's separately fetched [public 2027 JSON table](https://www.timeshighereducation.com/json/ranking_tables/world_university_rankings/2027), publisher institution profiles, and the base commit's existing source records. The JSON oracle was parsed independently in Python, without importing the scraper or matcher. It was compared with every CSV row and every THE assignment. Implementation output was never used to establish the expected ranks. Failure tests start with an independently written literal CSV input; expected preservation means those exact input bytes remain unchanged.

| Expected output | Input dimensions and executed cases | Expected and observed result |
| --- | --- | --- |
| 1. Normal pipeline loads publisher THE 2027 automatically | Provider: THE's official page, including its redirect to the official latest page. Invocation: `node scripts/scrape-rankings.js`, standalone scraper, offline. Snapshot state: fresh, stale (2020 mtime), empty, absent. Request count: one complete-table fetch per refresh; two consecutive refreshes; zero offline requests. | Normal live pipeline and standalone scraper fetch 2027 and save 1,001 scoped records. All four snapshot-state unit cases replace with validated data. Consecutive refreshes each request THE and return identical records without duplicates. Offline reads the snapshot without fetching. Before: base pipeline retains 992 THE 2026 records. |
| 2. Correct scope and shared university owners | Rank formats: `1`, `=3`, `301–325`, `801–1000`, legacy `801-1000`, exact boundary `1000`, later `1001–1200`, open `2001+`, `Reporter`. Identity: ordinary names, abbreviations, translated/historical names, main-campus names, country synonyms, dotless-i spelling, relocated CEU, distinct systems/campuses/medical institutions. Cross-source providers: QS, THE, ARWU, US News. | Nine rank-format unit cases execute with explicit expectations. Real oracle comparison verifies all 1,001 names, countries and rank labels, including all 199 final-band entries. All 1,001 have exactly one THE owner and the correct numeric rank. All 84 evidence-ledger counterpart cases share their expected other-source records and ranks. Specific independent examples: UCL 17, Minnesota 88, Penn State 101, Galway 326, Burgundy 801, CEU 269; Massachusetts system 143 remains separate from Amherst. Integrity and duplicate checks pass. |
| 3. Failed/unexpected download preserves good THE data | Download exits: HTTP 403, HTTP 500, network rejection, body-read rejection, real stalled HTTP request aborted by the deadline, temporary write failure, rename failure. Payloads: empty body, captcha, login, malformed JSON, absent page, wrong title, year 2026, year 2028, wrong ranking type, absent table, empty table, truncated table, absent/wrong institution count, invalid rank, absent name, empty country, absent ID, duplicate ID, duplicate institution, missing rank 1, missing scope boundary. Existing snapshot: good UTF-8, good Latin-1, empty, absent. | Each listed exit and payload is a separately executed test. Good-file bytes are unchanged and temporary files are absent. Good UTF-8 and Latin-1 files remain readable after failure. Failure with an empty or absent snapshot rejects and preserves its original empty/absent state. The timeout test uses real local HTTP and a shortened real AbortSignal deadline, and asserts the production deadline argument is 30,000 ms. |
| 4. Current stable APIs and documented versions | Version changes: none. New framework/library/tool dependencies: none. Runtime: already-installed Node 22.23.3. Native APIs: fetch with AbortSignal.timeout, fs promise read/write/rename/rm, Readable.from. | Current official documentation was searched and read; links and dates follow. All used native APIs are stable in the current documentation and execute on the installed runtime. Existing csv-parser 3.2.0, Jest 29.7.0, Node, npm, curl and Python versions are unchanged and outside the requested version-change scope. Package manifests and lockfile are byte-identical to the base commit. |

Additional malformed-rank cases executed: empty string, zero, tied zero, negative rank, word, reversed band, incomplete band, trailing garbage, null, and a numeric value instead of THE's string label. All reject. CSV round-trip cases retain UTF-8 accents, embedded commas and quotes. The normal refresh and a subsequent offline regeneration reproduce all six output files byte for byte. Latin-1 compatibility retains accents in the old snapshot.

Commands executed on a `git archive` copy of the base commit and on the final tree:

```sh
npm test
node scripts/scrape-rankings.js
node scripts/the-scraper.js
node scripts/scrape-rankings.js --offline
node scripts/generate-frontend-insights.js
node scripts/data-integrity-check.js
node scripts/automation-helpers/baseline-monitor.js health
```

Base: 33 tests pass; integrity passes with 1,583 universities and 992 THE assignments. Final: 98 tests pass under `npm test`, including four tests in a pre-existing ignored worktree. Excluding that worktree, the repository's four suites contain 94 passing tests. Final integrity passes with all four source counts conserved. The legacy health monitor reports no duplicate names. Its two unrelated diagnostics (`count: null` and zero legacy automation patterns) reproduce on the base commit; its old textual probes are unchanged. `git diff --check` passes.

The final offline regeneration reproduces the live refresh outputs. Direct byte comparisons prove that QS, ARWU and US News CSVs, their scraper implementations, package.json and package-lock.json are byte-identical to `1cef933`. Frontend source/design is byte-identical to the resumed HEAD; the already committed CSS difference from `1cef933` is the pre-existing change described above.

## Outputs compared before and after

[The changes ledger](RR-UNIRANK-THE-SOURCE-changes.json) contains base-commit, base-regeneration and final SHA-256 hashes, plus every changed university row and field. All six existing outputs touched by this ticket were executed against the base before comparison:

| Output | Base regeneration vs base commit | Final vs base commit |
| --- | --- | --- |
| `frontend/public/data/the_rankings.csv` | Identical | THE 2026 vendor snapshot becomes THE 2027 publisher snapshot; 992 to 1,001 records; UTF-8 and original rank labels |
| `frontend/public/data/aggregated-rankings.json` | Identical | Updated THE ranks, membership, scores and aggregate positions; 1,583 to 1,579 universities |
| `frontend/public/data/identity-audit.json` | Identical | Updated THE assignments/names/countries; zero unresolved conflicts; CEU country correction preserves original source label |
| `frontend/public/data/enhanced-aggregated-rankings.json` | Identical | Regenerated ranking rows, calculation breakdowns and insights |
| `frontend/public/data/global-stats.json` | Only UTC generation date changes | Updated counts/distributions and UTC generation date |
| `README.md` | Identical | Derived university count, THE input count and THE source description |

The union of before/after university names contains 1,640 changed entries: 1,484 changed rows, 76 added names, and 80 removed names. These include naming/identity changes and aggregate reordering. Each before/after value is retained in the changes ledger. The university total decreases by four.

## Research and current documentation

All pages below were consulted on **2026-10-01**. Research began with two searches for THE's 2027 publisher table/data, followed by searches for Node's stable fetch, timeout, filesystem APIs and current releases before implementation work. The resumed pass repeated three searches for publisher/Node documentation and three for the existing parser and test APIs, then read the official current pages below.

| Item | Official documentation consulted | Date/version shown by the page |
| --- | --- | --- |
| THE data and schema used by the public table | [World University Rankings 2027](https://www.timeshighereducation.com/world-university-rankings/2027/world-ranking), its embedded `rankingsTableConfig` and publisher-linked [2027 JSON table](https://www.timeshighereducation.com/json/ranking_tables/world_university_rankings/2027) | Ranking edition 2027, published September 30, 2026. These are publisher data surfaces; no Next.js framework or SDK is installed or selected. |
| Native fetch and deadline | [Node globals](https://nodejs.org/api/globals.html#fetch), [AbortSignal.timeout](https://nodejs.org/api/globals.html#static-method-abortsignaltimeoutdelay) | Current stable documentation identifies Node 26.10.0; fetch is stable since 21.0.0. APIs work on installed 22.23.3. |
| Native snapshot I/O and replacement | [Node filesystem promises](https://nodejs.org/api/fs.html#promises-api) for readFile, writeFile, rename and rm | Current stable documentation identifies Node 26.10.0; stable promise APIs used without experimental flags. |
| Native CSV input stream | [Readable.from](https://nodejs.org/api/stream.html#streamreadablefromiterable-options) | Node 26.10.0 current documentation; existing stable API. |
| Current runtime releases | [Release policy/status](https://nodejs.org/en/about/previous-releases), [26.10.0 release](https://nodejs.org/en/blog/release/v26.10.0), [22.23.3 LTS release](https://nodejs.org/en/blog/release/v22.23.3) | Latest Current 26.10.0, September 22, 2026; installed maintained 22.23.3 LTS, September 23, 2026. Runtime version unchanged. |
| Native test APIs | [Node HTTP](https://nodejs.org/api/http.html) for createServer, listen, close and closeAllConnections; [structuredClone](https://nodejs.org/api/globals.html#structuredclonevalue-options); [filesystem APIs](https://nodejs.org/api/fs.html) for literal snapshot I/O, temporary directories and mtime fixtures | Current Node 26.10.0 stable module documentation; test runtime remains installed 22.23.3. |
| Existing CSV parser API | [Publisher README/API](https://github.com/mafintosh/csv-parser) for headers, skipLines and mapValues | Existing installed 3.2.0 and parser options retained. No parser release selected or changed. |
| Existing test runner API | [Jest object](https://jestjs.io/docs/jest-object), [mock functions](https://jestjs.io/docs/mock-function-api), [globals/test.each](https://jestjs.io/docs/api) | Current stable documentation (30.5) confirms the mocking and parameterized-test APIs. Installed Jest 29.7.0 remains unchanged and is outside the version-change scope. |
| University identities | Each publisher/institution URL and consultation date in [the identity ledger](RR-UNIRANK-THE-SOURCE-identities.json), plus QS/CEU and THE/Massachusetts links above | Current live institution profiles. |

## Files changed and handoff

Production code: `scripts/the-scraper.js`, `scripts/university-identity.js`.

Identity data: `frontend/public/data/manual-university-mapping.json`, `frontend/public/data/identity-country-overrides.json`.

Source/generated outputs: `frontend/public/data/the_rankings.csv`, `aggregated-rankings.json`, `identity-audit.json`, `enhanced-aggregated-rankings.json`, `global-stats.json`.

Tests: `tests/the-scraper.test.js`, `tests/university-identity.test.js`. Historical THE 2026 name/rank expectations were updated or retired where the input provider/edition was replaced; the other-source identity assertions remain. The new complete alias-ledger regression independently retains base counterpart records and real 2027 THE ranks.

Documentation: `README.md`, `docs/DATA_INTEGRITY_GUIDE.md`, this report, `docs/RR-UNIRANK-THE-SOURCE-identities.json`, `docs/RR-UNIRANK-THE-SOURCE-changes.json`.

Conflict status: no contradiction with the four expected outputs was found in the executed cases.

No unfinished ticket TODO. No commit, push, deploy, or frontend design edit was performed. The arbiter owns review and publication of these prepared artifacts.

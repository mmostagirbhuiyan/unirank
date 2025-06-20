### **The Unified University Name Reconciliation Pipeline: A Consolidated Strategic & Architectural Plan**

This document outlines a complete, high-level architectural solution for the university-ranking-aggregator project. It is intended to serve as a strategic guide for developers, explaining not only the technical roadmap but also the business and historical context driving these changes.

### **1. Introduction: The Strategic Need for a V2 Architecture**

The core purpose of this project has always been to solve the complex problem of data reconciliation from multiple, inconsistent sources. This document outlines the evolution to a more robust, "V2" architecture, and it's important to understand the journey that has led to this strategic shift.

#### **The "Old" Workflow: A Tale of Two Systems**

Previously, the data ingestion pipeline was effectively split into two methodologies:

1.  **The "Simple" Path:** The data for QS, THE, and ARWU rankings were all sourced from a single, convenient third-party provider (`universityrankings.ch`). This provider delivered pre-cleaned and consistently formatted CSV files. As a result, the scrapers for these sources (`qs-scraper.js`, `the-scraper.js`, `arwu-scraper.js`) were straightforward and required minimal post-processing.
2.  **The "Hard" Path:** The US News rankings were sourced directly, presenting raw and inconsistent data. This required a dedicated, custom-built solution involving special parsing scripts (`standardize-usnews.js`, `usnews_direct_extractor_legacy.py`, `usnews_direct_extractor_selenium.py`) and more complex matching logic (`enhanced_name_matcher.js`) to bring its data in line with the others.

This created a brittle system that relied on the third-party provider never changing.

#### **The Tipping Point: The Return of Inconsistent QS Data**

The catalyst for this architectural overhaul is the change in the QS data source for the 2026 rankings. The data is no longer available from the clean third-party source and must now be ingested from an official, raw XLSX file. This immediately reintroduced the same inconsistency problems (e.g., different naming conventions, country names, and formatting) that were previously solved only for US News.

The creation of the `convert-qs-2026-to-csv.js` script was a necessary but reactive "patch." It highlights a fundamental weakness in the old architecture: for every source that deviates from the "simple" path, a new, custom-coded solution is required.

#### **The Strategic Choice: A Unified Architecture vs. Incremental Patches**

We are now at a strategic crossroads. We could continue to apply ad-hoc patches, treating the new QS source as another "special case." However, this path leads to a pipeline that is difficult to maintain, scale, and debug.

The more resilient, long-term solution is to **evolve to a unified architecture**. This new pipeline treats **every data source as potentially inconsistent from the start**. It standardizes the entire workflow, making it robust, repeatable, and adaptable to future changes from *any* provider, not just QS. This document outlines that forward-looking plan.

---

### **2. The Architectural Plan**

#### **Phase 0: Developer's Guide: Onboarding and Leveraging Existing Assets**

Before writing any new code, developers should familiarize themselves with the project's history, goals, and existing tools. This initial study is critical for understanding the *spirit* of the new architecture, which is an evolution of past successes.

1.  **Study the Project's Philosophical Foundation:**
    * **Primary Reading:** `docs/AUTOMATION_WORKFLOW_GUIDE.MD` and `docs/ENHANCED_MATCHING.MD`.
    * **Objective:** These documents are the key to understanding the "why" behind this project. They explain the core challenges of data reconciliation and outline the concepts that have been developed to solve them. Developers should treat this as required reading to understand the goals of the new, unified pipeline.

2.  **Deconstruct Previous Implementations for "Rule Mining":**
    * **Primary Analysis:** `scripts/standardize-usnews.js` and the new `scripts/convert-qs-2026-to-csv.js`.
    * **Objective:** These files should be treated as a valuable "mine" of pre-existing rules. The developer's task is not to copy the code, but to **extract the logic** and translate it into the new configuration-based format (e.g., a `usnews_rules.json` file). This process preserves all the "battle-tested" knowledge from previous efforts.

3.  **Integrate the Automation Helper Scripts into the Workflow:**
    * **Primary Tools:** The scripts within the `scripts/automation-helpers/` directory.
    * **Objective:** These scripts should become part of the daily development and deployment workflow.
        * **`pattern-discovery.js`**: Use this as the **first step** when encountering a new data source to bootstrap the creation of its rule file.
        * **`pattern-tester.js`**: Use this as a **local validation tool** before committing changes to a rule file.
        * **`baseline-monitor.js`**: Integrate this into the CI/CD pipeline as an automated check to prevent data regressions.

4.  **Seed the New "Canonical Master List":**
    * **Primary Source:** `frontend/public/data/manual-university-mapping.json`.
    * **Objective:** This file is the ideal seed for the new **Canonical Master List**. The first technical task should be to write a simple, one-time script to transform its data into the new `canonical-universities.json` format.

#### **Phase 1: Raw Data Ingestion & Staging**

This phase focuses on acquiring the raw data without altering it.

* **Action:** The existing scraper scripts will continue to fetch the latest ranking data.
* **Architecture Rule:** All raw, untouched files must be saved to a dedicated `staging/raw/` directory, clearly named by source and year (e.g., `staging/raw/qs_2026_official.xlsx`). This preserves the original source material for reference and reprocessing.

#### **Phase 2: Source-Specific Pre-Processing (The "Normalization Engine")**

This is the most critical phase for solving inconsistency problems. It replaces one-off scripts with a configurable, universal processor.

* **Action:** Create a single, powerful script (e.g., `normalize.js`) to take any raw file from the staging directory and convert it into a standardized CSV.
* **Architecture Rule:** The `normalize.js` script will be driven by a **source-specific configuration file** (e.g., `qs_2026_rules.json`). This file will define all processing steps for that source, including:
    * **Column Mapping:** Defining which columns contain the rank, name, and location.
    * **Country Standardization:** A list of mappings to normalize country names (e.g., "United States of America" to "USA").
    * **Initial Text Transformations:** Rules to apply to university names before matching, such as removing prefixes, standardizing terms (e.g., "Universität" to "University"), and replacing special characters.
* **Output**: A set of consistently structured files in a new directory, `staging/normalized/`.

#### **Phase 3: Building and Maintaining a Canonical Master List**

The heart of the system is a "master list" of universities that acts as the ultimate source of truth.

* **Action:** Create a definitive `canonical-universities.json` file.
* **Architecture Rule:** Each entry in this file will represent one unique university and have a consistent structure:
    * `canonical_id`: A unique, internal ID (e.g., `canonical-0001`).
    * `canonical_name`: The official, preferred name.
    * `country`: The standardized country name.
    * `aliases`: An array of all known variations of the name.
* This file will be the central target for all subsequent matching attempts.

#### **Phase 4: The Multi-Tiered Matching Cascade**

This phase formalizes the matching logic into an ordered strategy, executed by a new central script (e.g., `reconcile.js`). The script processes each normalized file and attempts to match every university against the Canonical Master List in sequential tiers.

* **Tier 1: Exact Alias Matching:** Check if the normalized name from the source file exists directly in the `aliases` array of any university in the master list.
* **Tier 2: Aggressive Normalization Matching:** If no exact alias is found, apply a more aggressive, temporary normalization (e.g., lowercase, remove all spaces and punctuation) to both the source name and all canonical names/aliases and attempt to match again.
* **Tier 3: Location-Aware Fuzzy Matching:** If still unmatched, use a fuzzy string matching algorithm (like Levenshtein distance), but **only compare the source university to canonical universities in the same country.** This drastically reduces the risk of false positives.

#### **Phase 5: The Manual Review & Feedback Loop**

This phase formalizes how to handle misses and uses them to improve the system over time.

* **Action:** Any university that fails all three tiers of automated matching is written to a `needs-manual-review.json` file.
* **Architecture Rule:**
    1.  A developer periodically reviews this file and finds the correct match in the `canonical-universities.json` list.
    2.  The developer then updates the system in two places:
        * Adds a one-time rule to `manual-university-mapping.json` for immediate correction.
        * **Crucially, adds the failed name as a new entry to the `aliases` array** for that university in the `canonical-universities.json` file.
* This feedback loop ensures that the system becomes progressively more accurate and robust with each iteration.
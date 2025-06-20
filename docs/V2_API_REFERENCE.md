# V2 Pipeline API Reference

This reference describes the public interfaces of the primary V2 pipeline modules.

## `PipelineOrchestrator`
- **initialize(options)** – Prepares the orchestrator and its components.
- **executePipeline(config)** – Runs the full pipeline using the given configuration and input paths.
- **generatePipelineReport()** – Generates a summary report of the last execution.

## `NormalizationEngine`
- **normalize(options)** – Normalizes raw data according to a configuration file.

## `UniversityMatcher`
- **initialize()** – Loads the canonical list and builds matching indices.
- **batchMatch(names)** – Matches an array of university names and returns match details.

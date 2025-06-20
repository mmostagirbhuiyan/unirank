const fs = require('fs');
const path = require('path');
const PipelineOrchestrator = require('../../v2-pipeline/orchestrator');

jest.setTimeout(30000);

describe('Full Pipeline Integration Test', () => {
  const sampleData = path.join(__dirname, '../../staging/test-data/integration-test-qs.csv');
  const configPath = path.join(__dirname, '../../staging/config/test-rules.json');
  let orchestrator;

  beforeAll(async () => {
    orchestrator = new PipelineOrchestrator({
      stagingDirectory: 'staging',
      enableLogging: false
    });
    await orchestrator.initialize();
  });

  afterAll(() => {
    if (orchestrator && orchestrator.runDirectory && fs.existsSync(orchestrator.runDirectory)) {
      fs.rmSync(orchestrator.runDirectory, { recursive: true });
    }
  });

  test('pipeline executes end-to-end successfully', async () => {
    const results = await orchestrator.executePipeline({
      configPath,
      inputPath: sampleData,
      source: 'integration-test'
    });

    expect(results.metadata.status).toBe('completed');
    expect(results.summary.totalInput).toBeGreaterThan(0);
    expect(results.summary.matched + results.summary.unmatched).toBe(results.summary.totalInput);
  });
});

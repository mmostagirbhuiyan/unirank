#!/usr/bin/env node

/**
 * Comprehensive V2 Test Suite
 *
 * Runs the orchestrator, matching engine and manual review test suites
 * in sequence. Each suite is executed in a separate process so their
 * internal process.exit calls do not interrupt execution.
 */
const { spawn } = require('child_process');
const path = require('path');

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [scriptPath], { stdio: 'inherit' });
    proc.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptPath} exited with code ${code}`));
      }
    });
  });
}

async function runAll() {
  const root = __dirname;
  try {
    await runScript(path.join(root, 'test-orchestrator.js'));
    await runScript(path.join(root, 'test-matching.js'));
    await runScript(path.join(root, 'test-manual-review.js'));
    console.log('\n✅ Comprehensive V2 test suite completed successfully');
  } catch (err) {
    console.error(`\n❌ Comprehensive test suite failed: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  runAll();
}

module.exports = runAll;

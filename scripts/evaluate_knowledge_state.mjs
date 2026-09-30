import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { reduceKnowledgeState } from '../src/services/knowledgeStateReducer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runEvaluation() {
  console.log('========================================================');
  console.log('BREAKPOINT PHASE 16E: PERSONAL KNOWLEDGE STATE BENCHMARK');
  console.log('========================================================\n');

  const benchmarkPath = path.resolve(__dirname, '../data/knowledge_state_benchmark.json');
  const scenarios = JSON.parse(fs.readFileSync(benchmarkPath, 'utf-8'));

  let totalScenarios = scenarios.length;
  let passedScenarios = 0;
  let overpromotions = 0;
  let underpromotions = 0;
  let explicitOverrideTests = 0;
  let explicitOverridePassed = 0;

  for (const sc of scenarios) {
    let state = sc.initialState ? { ...sc.initialState } : null;

    for (const signal of sc.signals) {
      state = reduceKnowledgeState(state, signal);
    }

    const stateMatches = state.state === sc.expectedState;
    const confidenceMatches = state.confidence >= sc.expectedConfidenceMin;
    const explicitMatches = (sc.expectedExplicit === null && !state.explicitUserState) ||
      state.explicitUserState === sc.expectedExplicit;

    const testPassed = stateMatches && confidenceMatches && explicitMatches;

    if (sc.expectedExplicit !== null) {
      explicitOverrideTests++;
      if (explicitMatches) explicitOverridePassed++;
    }

    // Check for overpromotion (e.g. promoting to understood or familiar prematurely)
    const stateRanks = { unseen: 0, exposed: 1, familiar: 2, understood: 3 };
    const expectedRank = stateRanks[sc.expectedState];
    const actualRank = stateRanks[state.state];

    if (actualRank > expectedRank) {
      overpromotions++;
      console.error(`  [OVERPROMOTION ERROR] ${sc.id}: Expected ${sc.expectedState}, got ${state.state}`);
    } else if (actualRank < expectedRank) {
      underpromotions++;
      console.error(`  [UNDERPROMOTION ERROR] ${sc.id}: Expected ${sc.expectedState}, got ${state.state}`);
    }

    if (testPassed) {
      passedScenarios++;
    } else {
      console.error(`  [FAIL] ${sc.id} - ${sc.description}`);
      console.error(`         Expected: state=${sc.expectedState}, conf>=${sc.expectedConfidenceMin}, explicit=${sc.expectedExplicit}`);
      console.error(`         Actual:   state=${state.state}, conf=${state.confidence}, explicit=${state.explicitUserState}`);
    }
  }

  const accuracy = (passedScenarios / totalScenarios) * 100;
  const overpromotionRate = (overpromotions / totalScenarios) * 100;
  const underpromotionRate = (underpromotions / totalScenarios) * 100;
  const overrideAccuracy = (explicitOverridePassed / Math.max(1, explicitOverrideTests)) * 100;

  console.log(`- Total Scenarios Evaluated:    ${totalScenarios}`);
  console.log(`- Passed Scenarios:             ${passedScenarios}`);
  console.log(`- State Transition Accuracy:    ${accuracy.toFixed(1)}%`);
  console.log(`- Overpromotion Rate:           ${overpromotionRate.toFixed(1)}% (CRITICAL)`);
  console.log(`- Underpromotion Rate:          ${underpromotionRate.toFixed(1)}%`);
  console.log(`- Explicit Override Accuracy:   ${overrideAccuracy.toFixed(1)}%`);

  console.log('\n========================================================');
  if (overpromotionRate === 0 && accuracy === 100) {
    console.log('✅ ALL PHASE 16E STATE TRANSITION BENCHMARKS PASSED.');
    console.log('========================================================\n');
    process.exit(0);
  } else {
    console.error('❌ BENCHMARK FAILED: Assertions not met.');
    console.log('========================================================\n');
    process.exit(1);
  }
}

runEvaluation().catch((err) => {
  console.error('Evaluation uncaught error:', err);
  process.exit(1);
});

import { resolveNextUnresolvedIndex } from '../src/services/dailyBriefRanking.ts';

console.log('===============================================================');
console.log('TEST: CONCURRENT PROGRESS RESOLUTION & HANDLED ITEM SEMANTICS');
console.log('===============================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

// Setup 5 mock items in a Daily Brief
const items = [
  { id: 'item_1', title: 'Top Story 1' },
  { id: 'item_2', title: 'Top Story 2' },
  { id: 'item_3', title: 'Top Story 3' },
  { id: 'item_4', title: 'Top Story 4' },
  { id: 'item_5', title: 'Top Story 5' },
];

let completedIds = new Set();
let skippedIds = new Set();

// Initial state: 0 handled, active index = 0
let nextIdx = resolveNextUnresolvedIndex(items, completedIds, skippedIds);
assert(nextIdx === 0, `Initial active index is 0 (item_1)`);
assert(completedIds.size + skippedIds.size === 0, `0 items handled`);

// Step 1: Desktop completes item 1
completedIds.add('item_1');
nextIdx = resolveNextUnresolvedIndex(items, completedIds, skippedIds);
assert(nextIdx === 1, `After Desktop completes item_1, next unresolved is index 1 (item_2)`);

// Step 2: Mobile completes item 3 out of order
completedIds.add('item_3');
nextIdx = resolveNextUnresolvedIndex(items, completedIds, skippedIds);
assert(nextIdx === 1, `After Mobile completes item_3 out of order, next unresolved is still index 1 (item_2)`);

// Step 3: Desktop skips item 2
skippedIds.add('item_2');
nextIdx = resolveNextUnresolvedIndex(items, completedIds, skippedIds);
assert(nextIdx === 3, `After Desktop skips item_2, handled is {1, 2, 3}, next unresolved is index 3 (item_4)`);
const handledCount = completedIds.size + skippedIds.size;
assert(handledCount === 3, `Handled count is 3/5`);

// Step 4: Mobile skips item 4
skippedIds.add('item_4');
nextIdx = resolveNextUnresolvedIndex(items, completedIds, skippedIds);
assert(nextIdx === 4, `After Mobile skips item_4, next unresolved is index 4 (item_5)`);

// Step 5: Desktop completes item 5
completedIds.add('item_5');
const totalHandled = completedIds.size + skippedIds.size;
const isCaughtUp = totalHandled >= items.length;
assert(totalHandled === 5, `All 5 items handled (completed: {1, 3, 5}, skipped: {2, 4})`);
assert(isCaughtUp === true, `isCaughtUp is true`);

console.log('\n---------------------------------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('---------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('>>> CONCURRENT PROGRESS TEST PASSED <<<');
  process.exit(0);
}

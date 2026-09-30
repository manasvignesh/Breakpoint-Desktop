import { isMaterialUserFacingChange } from '../src/services/dailyBriefRanking.ts';

console.log('===============================================================');
console.log('TEST: STORY UPDATES SCHEMA FLATTENING & STRICT FILTERING');
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

// 1. Test canonical allowed types with userFacing === true
const allowedTypes = [
  'value_changed',
  'new_fact',
  'status_changed',
  'location_added',
  'location_removed',
  'date_changed',
  'participant_added',
  'correction',
];

for (const type of allowedTypes) {
  const change = {
    type,
    userFacing: true,
    subject: 'Test Subject',
    description: 'Test description',
  };
  assert(isMaterialUserFacingChange(change) === true, `Allowed type "${type}" with userFacing: true passes`);
}

// 2. Test allowed types with userFacing === false or undefined (strictness check)
for (const type of allowedTypes) {
  const changeFalse = {
    type,
    userFacing: false,
    subject: 'Test Subject',
    description: 'Test description',
  };
  assert(isMaterialUserFacingChange(changeFalse) === false, `Allowed type "${type}" with userFacing: false is rejected`);

  const changeMissing = {
    type,
    subject: 'Test Subject',
    description: 'Test description',
  };
  assert(isMaterialUserFacingChange(changeMissing) === false, `Allowed type "${type}" with userFacing: undefined is rejected`);
}

// 3. Test non-material types (additional_detail, no_change, other)
const nonMaterialTypes = ['additional_detail', 'no_change', 'other', 'unknown_type', ''];
for (const type of nonMaterialTypes) {
  const change = {
    type,
    userFacing: true,
    subject: 'Test Subject',
    description: 'Test description',
  };
  assert(isMaterialUserFacingChange(change) === false, `Non-material type "${type}" even with userFacing: true is rejected`);
}

// 4. Test flattening of composite update document with multiple changes
const sampleUpdateDoc = {
  id: 'upd_sample_01',
  storyId: 'st_sample',
  articleId: 'post_01',
  publishedAt: '2026-09-30T07:00:00.000Z',
  changes: [
    {
      type: 'value_changed',
      userFacing: true,
      subject: 'Target Orbit Altitude',
      description: 'Increased from 400km to 550km',
      previousValue: '400km',
      newValue: '550km',
    },
    {
      type: 'additional_detail',
      userFacing: false,
      subject: 'Internal telemetry protocol',
      description: 'Switched to CAN bus rev 4',
    },
    {
      type: 'status_changed',
      userFacing: true,
      subject: 'Mission Readiness',
      description: 'Moved from Testing to Final Integration',
      previousValue: 'Testing',
      newValue: 'Final Integration',
    },
    {
      type: 'no_change',
      userFacing: false,
      subject: 'Launch window',
      description: 'Remains Q4 2026',
    },
  ],
};

const flattenedChanges = sampleUpdateDoc.changes.filter(isMaterialUserFacingChange);
assert(flattenedChanges.length === 2, `Flattening sample update document correctly extracts exactly 2 user-facing material changes`);
assert(flattenedChanges[0].type === 'value_changed', `First extracted change is value_changed`);
assert(flattenedChanges[1].type === 'status_changed', `Second extracted change is status_changed`);

console.log('\n---------------------------------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('---------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('>>> STORY UPDATES SCHEMA VALIDATION PASSED <<<');
  process.exit(0);
}

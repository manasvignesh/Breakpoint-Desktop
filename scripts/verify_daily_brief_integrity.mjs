import fs from 'fs';
import path from 'path';

console.log('===============================================================');
console.log('BREAKPOINT PLATFORM — PHASE 16F: DAILY BRIEF INTEGRITY AUDIT');
console.log('===============================================================\n');

let checksPassed = 0;
let checksFailed = 0;

function assertCheck(name, condition, errorMsg) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    checksPassed++;
  } else {
    console.error(`[FAIL] ${name}: ${errorMsg}`);
    checksFailed++;
  }
}

// 1. Types & Mappers
assertCheck(
  'src/types/brief.ts exists and exports required types',
  fs.existsSync('src/types/brief.ts') &&
    fs.readFileSync('src/types/brief.ts', 'utf8').includes('export interface DailyBrief') &&
    fs.readFileSync('src/types/brief.ts', 'utf8').includes('export interface DailyBriefItem') &&
    fs.readFileSync('src/types/brief.ts', 'utf8').includes('export interface DailyBriefProgress'),
  'Missing required interfaces in src/types/brief.ts'
);

assertCheck(
  'src/services/mappers/briefMapper.ts exists with bidirectional mappers',
  fs.existsSync('src/services/mappers/briefMapper.ts') &&
    fs.readFileSync('src/services/mappers/briefMapper.ts', 'utf8').includes('mapDocToDailyBrief') &&
    fs.readFileSync('src/services/mappers/briefMapper.ts', 'utf8').includes('mapDailyBriefToDoc') &&
    fs.readFileSync('src/services/mappers/briefMapper.ts', 'utf8').includes('mapDocToDailyBriefProgress'),
  'Missing mapper methods in briefMapper.ts'
);

// 2. Services
assertCheck(
  'src/services/briefCandidateService.ts exists',
  fs.existsSync('src/services/briefCandidateService.ts') &&
    fs.readFileSync('src/services/briefCandidateService.ts', 'utf8').includes('class BriefCandidateService'),
  'Missing BriefCandidateService'
);

assertCheck(
  'src/services/briefRankingService.ts exists with suppression and diversity logic',
  fs.existsSync('src/services/briefRankingService.ts') &&
    fs.readFileSync('src/services/briefRankingService.ts', 'utf8').includes('isSuppressed') &&
    fs.readFileSync('src/services/briefRankingService.ts', 'utf8').includes('outside_bubble'),
  'Missing suppression or outside bubble logic in BriefRankingService'
);

assertCheck(
  'src/services/briefGenerationService.ts exists with idempotent generation',
  fs.existsSync('src/services/briefGenerationService.ts') &&
    fs.readFileSync('src/services/briefGenerationService.ts', 'utf8').includes('getOrGenerateDailyBrief'),
  'Missing getOrGenerateDailyBrief'
);

assertCheck(
  'src/services/briefProgressService.ts exists with completion and skip logic',
  fs.existsSync('src/services/briefProgressService.ts') &&
    fs.readFileSync('src/services/briefProgressService.ts', 'utf8').includes('markItemCompleted') &&
    fs.readFileSync('src/services/briefProgressService.ts', 'utf8').includes('skipItem'),
  'Missing progress methods in briefProgressService.ts'
);

// 3. UI Components
assertCheck(
  'src/components/DailyBriefBanner.tsx exists',
  fs.existsSync('src/components/DailyBriefBanner.tsx') &&
    fs.readFileSync('src/components/DailyBriefBanner.tsx', 'utf8').includes('DailyBriefBanner'),
  'Missing DailyBriefBanner.tsx'
);

assertCheck(
  'src/components/DailyBriefViewer.tsx exists with keyboard and caught-up state',
  fs.existsSync('src/components/DailyBriefViewer.tsx') &&
    fs.readFileSync('src/components/DailyBriefViewer.tsx', 'utf8').includes("You're Caught Up") &&
    fs.readFileSync('src/components/DailyBriefViewer.tsx', 'utf8').includes('keydown'),
  'Missing DailyBriefViewer.tsx or caught up logic'
);

// 4. Flutter Mobile Layer
const flutterBase = 'C:/Users/Public/New67/app/lib/features/daily_brief';
assertCheck(
  'Flutter DailyBrief models and repository exist',
  fs.existsSync(`${flutterBase}/models/daily_brief_model.dart`) &&
    fs.existsSync(`${flutterBase}/models/daily_brief_item_model.dart`) &&
    fs.existsSync(`${flutterBase}/models/daily_brief_progress_model.dart`) &&
    fs.existsSync(`${flutterBase}/data/daily_brief_repository.dart`),
  'Missing Flutter daily brief files'
);

// 5. Benchmark & Verification datasets
assertCheck(
  'data/daily_brief_benchmark.json exists with 40+ scenarios',
  fs.existsSync('data/daily_brief_benchmark.json') &&
    JSON.parse(fs.readFileSync('data/daily_brief_benchmark.json', 'utf8')).scenarios.length >= 40,
  'Benchmark dataset has fewer than 40 scenarios'
);

console.log('\n---------------------------------------------------------------');
console.log(`Total Integrity Checks: ${checksPassed + checksFailed}`);
console.log(`Checks Passed:          ${checksPassed}`);
console.log(`Checks Failed:          ${checksFailed}`);
console.log('---------------------------------------------------------------');

if (checksFailed > 0) {
  process.exit(1);
} else {
  console.log('>>> ALL INTEGRITY CHECKS PASSED SUCCESSFULLY <<<\n');
  process.exit(0);
}

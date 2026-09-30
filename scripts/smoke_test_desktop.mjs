import fs from 'fs';
import path from 'path';

console.log('===============================================================');
console.log('BREAKPOINT DESKTOP — PHASE 16F SMOKE TEST SUITE');
console.log('===============================================================\n');

let passed = 0;
let failed = 0;

function check(name, condition, errorMsg) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}: ${errorMsg}`);
    failed++;
  }
}

// 1. Frontend dist artifacts
check(
  'Vite production dist/ exists',
  fs.existsSync('dist/index.html'),
  'dist/index.html is missing'
);

// 2. Tauri Configuration & Release binary paths
const exePath = 'src-tauri/target/release/Breakpoint.exe';
const nsisPath = 'src-tauri/target/release/bundle/nsis/Breakpoint_0.1.0_x64-setup.exe';

check(
  'Tauri executable Breakpoint.exe exists',
  fs.existsSync(exePath),
  `Standalone exe not found at ${exePath}`
);

if (fs.existsSync(exePath)) {
  const stat = fs.statSync(exePath);
  console.log(`       Binary Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MiB`);
}

check(
  'Tauri NSIS installer exists',
  fs.existsSync(nsisPath),
  `NSIS installer not found at ${nsisPath}`
);

if (fs.existsSync(nsisPath)) {
  const stat = fs.statSync(nsisPath);
  console.log(`       Installer Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MiB`);
}

// 3. User install location check
const localAppExe = `C:/Users/${process.env.USERNAME || 'Manas'}/AppData/Local/Breakpoint/Breakpoint.exe`;
check(
  'Installed local Breakpoint.exe exists',
  fs.existsSync(localAppExe),
  `Installed executable not found at ${localAppExe}`
);

console.log('\n---------------------------------------------------------------');
console.log(`Total Smoke Tests: ${passed + failed}`);
console.log(`Passed:             ${passed}`);
console.log(`Failed:             ${failed}`);
console.log('---------------------------------------------------------------');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('>>> ALL DESKTOP SMOKE TESTS PASSED <<<\n');
  process.exit(0);
}

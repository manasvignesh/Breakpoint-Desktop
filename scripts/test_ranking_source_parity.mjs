import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

console.log('===============================================================');
console.log('TEST: RANKING SOURCE PARITY & CANONICAL MODULE IDENTITY');
console.log('===============================================================\n');

const authoritativePath = 'C:/Users/Public/New67/supabase/functions/_shared/dailyBriefRanking.ts';
const desktopPath = 'C:/Users/Public/Desktop app news/src/services/dailyBriefRanking.ts';

if (!fs.existsSync(authoritativePath)) {
  console.error(`✗ Authoritative ranking module not found at: ${authoritativePath}`);
  process.exit(1);
}

if (!fs.existsSync(desktopPath)) {
  console.error(`✗ Desktop ranking module not found at: ${desktopPath}`);
  process.exit(1);
}

const authContent = fs.readFileSync(authoritativePath, 'utf8').replace(/\r\n/g, '\n');
const deskContent = fs.readFileSync(desktopPath, 'utf8').replace(/\r\n/g, '\n');

const authHash = crypto.createHash('sha256').update(authContent).digest('hex');
const deskHash = crypto.createHash('sha256').update(deskContent).digest('hex');

console.log(`Authoritative Source:  ${authoritativePath}`);
console.log(`Authoritative SHA-256: ${authHash}`);
console.log(`Desktop Mirror:        ${desktopPath}`);
console.log(`Desktop SHA-256:       ${deskHash}`);

if (authHash !== deskHash) {
  console.error('\n✗ PARITY MISMATCH: The desktop ranking module differs from the authoritative Supabase shared engine.');
  process.exit(1);
} else {
  console.log('\n✓ 100% BYTE-FOR-BYTE PARITY VERIFIED (Exact SHA-256 Match)');
  console.log('>>> RANKING MODULE PARITY TEST PASSED <<<');
  process.exit(0);
}

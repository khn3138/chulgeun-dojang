// PR에서 앱 코드가 바뀌었는데 package.json 버전을 올리지 않았으면 실패시킨다.
// 사용: node scripts/check-version.mjs <기준 브랜치 ref, 예: origin/main>
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'origin/main';
const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const changed = sh(`git diff --name-only ${base}...HEAD`).split('\n').filter(Boolean);
const appChanged = changed.some((f) => /^(src\/|public\/|apps-script\/|index\.html$|vite\.config\.ts$)/.test(f) && !f.startsWith('src/__tests__/'));
if (!appChanged) {
  console.log('앱 코드 변경 없음 — 버전 확인 생략');
  process.exit(0);
}

const parse = (v) => v.split('.').map(Number);
const newer = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};
const baseVersion = JSON.parse(sh(`git show ${base}:package.json`)).version;
const headVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
if (!newer(headVersion, baseVersion)) {
  console.error(`앱 코드가 바뀌었는데 버전이 그대로예요: ${baseVersion} → ${headVersion}. package.json 버전을 올리고 CHANGELOG.md에 적어 주세요.`);
  process.exit(1);
}
if (!readFileSync('CHANGELOG.md', 'utf8').includes(`## ${headVersion}`)) {
  console.error(`CHANGELOG.md에 ${headVersion} 항목이 없어요.`);
  process.exit(1);
}
console.log(`버전 확인 OK: ${baseVersion} → ${headVersion}`);

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function filesUnder(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) return [];
  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = join(relativePath, entry.name);
    return entry.isDirectory() ? filesUnder(child) : [child];
  });
}

const sourceFiles = filesUnder('src').filter((path) => /\.(js|vue|html)$/.test(path));
const source = sourceFiles.map((path) => read(path)).join('\n');

if (existsSync(join(root, 'src/pages/DiagnosticPage.vue'))) failures.push('DiagnosticPage.vue still exists.');
if (source.includes("path: '/diagnostic'")) failures.push('The public diagnostic route still exists.');
if (source.includes('admin@semanur.com') && source.includes("password: 'password'")) {
  failures.push('Embedded diagnostic credentials remain in source.');
}
if (/\bv-html\b/.test(source)) failures.push('A v-html sink remains in application source.');

const headers = read('public/.htaccess');
for (const header of [
  'Content-Security-Policy',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
]) {
  if (!headers.includes(header)) failures.push(`Missing ${header} hosting configuration.`);
}

const testEnvironment = new URL(read('.env.test').match(/^VITE_API_BASE_URL=(.+)$/m)?.[1] || '');
if (!['127.0.0.1', 'localhost', '::1'].includes(testEnvironment.hostname)) {
  failures.push('The test API target is not loopback-only.');
}

if (existsSync(join(root, 'dist/dist.zip'))) failures.push('dist/dist.zip must not be deployed.');
if (existsSync(join(root, 'dist')) && !existsSync(join(root, 'dist/.htaccess'))) {
  failures.push('The built dist directory is missing .htaccess.');
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Web security invariants verified.');
}

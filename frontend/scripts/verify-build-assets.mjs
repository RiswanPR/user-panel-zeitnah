import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

console.log('====================================================');
console.log('🔍 ZEITNAH PRODUCTION BUILD ASSET INTEGRITY AUDIT');
console.log(`📁 Target directory: ${DIST_DIR}`);
console.log('====================================================\n');

if (!fs.existsSync(DIST_DIR)) {
  console.error(`❌ FAILED: Distribution directory "${DIST_DIR}" does not exist. Run "npm run build" first.`);
  process.exit(1);
}

const indexHtmlPath = path.join(DIST_DIR, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.error(`❌ FAILED: index.html not found in "${DIST_DIR}".`);
  process.exit(1);
}

const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
const missingAssets = [];
const checkedAssets = new Set();

function checkAssetExists(assetRelPath, source) {
  // Strip query/hash and leading slash
  let cleanPath = assetRelPath.split('?')[0].split('#')[0];
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.slice(1);
  }
  if (!cleanPath || cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return;
  }

  const fullPath = path.join(DIST_DIR, cleanPath);
  checkedAssets.add(cleanPath);

  if (!fs.existsSync(fullPath)) {
    missingAssets.push({ path: cleanPath, source });
  } else {
    const stat = fs.statSync(fullPath);
    if (stat.size === 0) {
      missingAssets.push({ path: cleanPath, source, reason: 'Zero-byte empty file' });
    }
  }
}

// 1. Audit index.html references
console.log('📄 1. Inspecting index.html asset references...');
const scriptSrcRegex = /<script[^>]+src=["']([^"']+)["']/gi;
let match;
while ((match = scriptSrcRegex.exec(indexHtmlContent)) !== null) {
  checkAssetExists(match[1], 'index.html <script>');
}

const linkHrefRegex = /<link[^>]+href=["']([^"']+)["']/gi;
while ((match = linkHrefRegex.exec(indexHtmlContent)) !== null) {
  checkAssetExists(match[1], 'index.html <link>');
}

// 2. Audit sw.js precache manifest
const swPath = path.join(DIST_DIR, 'sw.js');
if (fs.existsSync(swPath)) {
  console.log('🛠️  2. Inspecting PWA Service Worker (sw.js) precache manifest...');
  const swContent = fs.readFileSync(swPath, 'utf8');
  // Match URLs in precache array: url:"assets/..." or url:"..."
  const precacheRegex = /url:["']([^"']+)["']/gi;
  while ((match = precacheRegex.exec(swContent)) !== null) {
    checkAssetExists(match[1], 'sw.js precache');
  }
} else {
  console.warn('⚠️  Notice: dist/sw.js not found (PWA might be disabled or in dev mode).');
}

// 3. Audit all generated chunks in dist/assets/js/
console.log('📦 3. Auditing generated lazy chunks in dist/assets/js/...');
const jsDir = path.join(DIST_DIR, 'assets/js');
if (!fs.existsSync(jsDir)) {
  console.error('❌ FAILED: dist/assets/js directory is missing.');
  process.exit(1);
}

const jsFiles = fs.readdirSync(jsDir);
console.log(`   Found ${jsFiles.length} chunk and module files in dist/assets/js/`);

// 4. Verify critical route chunks specifically
const criticalChunks = [
  'NetworkPage',
  'NetworkProfilePage',
  'LearningSpaceDetailPage',
  'DiscussionDetailPage',
  'Dashboard',
  'Courses',
  'ClassView',
  'Profile',
  'PortfolioPage',
  'VerificationCenterPage',
  'MessagesPage',
  'JobsPage',
  'OpportunityInboxPage',
  'CareerIntelligencePage',
  'ActiveSessions',
  'AuditLogs',
];

console.log('\n🎯 4. Verifying critical route chunks exist:');
const missingChunks = [];
for (const chunkName of criticalChunks) {
  const matchingFile = jsFiles.find((f) => f.startsWith(`${chunkName}-`) && f.endsWith('.js'));
  if (matchingFile) {
    const stat = fs.statSync(path.join(jsDir, matchingFile));
    console.log(`   ✅ ${chunkName.padEnd(28)} -> ${matchingFile} (${(stat.size / 1024).toFixed(2)} KB)`);
  } else {
    console.error(`   ❌ MISSING CHUNK: ${chunkName}`);
    missingChunks.push(chunkName);
  }
}

// 5. Final validation report
console.log('\n====================================================');
console.log(`📊 Total unique assets audited: ${checkedAssets.size}`);

if (missingAssets.length > 0 || missingChunks.length > 0) {
  console.error('\n❌ BUILD ASSET INTEGRITY FAILED!');
  if (missingAssets.length > 0) {
    console.error(`   Missing referenced files (${missingAssets.length}):`);
    missingAssets.forEach((m) => console.error(`   - ${m.path} (referenced by ${m.source})`));
  }
  if (missingChunks.length > 0) {
    console.error(`   Missing critical chunks (${missingChunks.length}):`);
    missingChunks.forEach((c) => console.error(`   - ${c}`));
  }
  process.exit(1);
}

console.log('✅ ALL REFERENCED ASSETS AND CRITICAL CHUNKS ARE PRESENT AND VALID.');
console.log('   NetworkPage chunk is verified on disk.');
console.log('====================================================\n');
process.exit(0);

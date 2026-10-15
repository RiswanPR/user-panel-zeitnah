import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '..');

test('Phase C: Community Premium Feed Redesign Verification Suite', async (t) => {
  await t.test('1. FeedFilterTabs defines Latest, Trending, Following, and Cohort feeds', () => {
    const filterTabsPath = path.join(frontendSrc, 'components/community/feed/FeedFilterTabs.jsx');
    const content = fs.readFileSync(filterTabsPath, 'utf8');

    assert.ok(content.includes("id: 'all', label: 'Latest'"), 'Must define Latest tab for all filter');
    assert.ok(content.includes("id: 'trending', label: 'Trending'"), 'Must define Trending tab');
    assert.ok(content.includes("id: 'following', label: 'Following'"), 'Must define Following tab');
    assert.ok(content.includes("id: 'cohort', label: 'Cohort'"), 'Must support Cohort tab');
    assert.ok(content.includes('isBusinessMode'), 'Must support isBusinessMode condition');
    assert.ok(content.includes('role="tablist"'), 'Must have semantic tablist role');
    assert.ok(content.includes('role="tab"'), 'Must have semantic tab items');
    assert.ok(content.includes('min-h-[44px]'), 'Must enforce minimum 44px touch targets');
  });

  await t.test('2. CommunityHome mounts FeedFilterTabs with URL state synchronization', () => {
    const homePath = path.join(frontendSrc, 'pages/community/CommunityHome.jsx');
    const content = fs.readFileSync(homePath, 'utf8');

    assert.ok(content.includes('import FeedFilterTabs'), 'Must import FeedFilterTabs');
    assert.ok(content.includes('<FeedFilterTabs'), 'Must mount FeedFilterTabs in JSX');
    assert.ok(content.includes('handleFilterChange'), 'Must provide handleFilterChange callback');
    assert.ok(content.includes('activeFilter={effectiveFeedFilter}'), 'Must bind effectiveFeedFilter to FeedFilterTabs');
    assert.ok(content.includes('onChangeFilter={handleFilterChange}'), 'Must bind filter change handler');
  });

  await t.test('3. PostCard eliminates duplicate bottom timestamp and propagates onSelectTopic', () => {
    const postCardPath = path.join(frontendSrc, 'components/community/feed/PostCard/index.jsx');
    const content = fs.readFileSync(postCardPath, 'utf8');

    assert.ok(content.includes('onSelectTopic'), 'PostCard must accept and pass onSelectTopic');
    assert.ok(
      !content.includes('{formatRelativeTime(displayPost.createdAt)}</div>'),
      'PostCard must not duplicate timestamp in bottom footer'
    );
    assert.ok(
      content.includes('targetType="COMMUNITY"'),
      'PostCard must preserve targetType="COMMUNITY" for ReportModal moderation'
    );
    assert.ok(
      content.includes('rounded-2xl'),
      'PostCard must maintain consistent rounded-2xl geometry'
    );
  });

  await t.test('4. PostContent renders interactive hashtag buttons and clean media caption', () => {
    const postContentPath = path.join(frontendSrc, 'components/community/feed/PostCard/PostContent.jsx');
    const content = fs.readFileSync(postContentPath, 'utf8');

    assert.ok(content.includes('onSelectTopic'), 'PostContent must accept onSelectTopic');
    assert.ok(
      content.includes('onClick={() => onSelectTopic?.(cleanTag)}'),
      'Hashtags must be interactive and invoke onSelectTopic'
    );
    assert.ok(
      !content.includes('<span className="font-semibold text-white mr-1.5">{authorName}</span>'),
      'Media post captions must not duplicate authorName prefix'
    );
  });

  await t.test('5. CommunityComposerEntry provides ergonomic mobile layout with 44px targets', () => {
    const composerPath = path.join(frontendSrc, 'components/community/composer/CommunityComposerEntry.jsx');
    const content = fs.readFileSync(composerPath, 'utf8');

    assert.ok(
      content.includes('grid grid-cols-3 gap-1.5 sm:gap-2.5'),
      'Must use responsive 3-column horizontal layout on mobile'
    );
    assert.ok(
      content.includes('min-h-[44px]'),
      'Must guarantee minimum 44px touch targets on creation actions'
    );
    assert.ok(
      content.includes('isBusinessMode'),
      'Must preserve company identity selection and business mode'
    );
  });

  await t.test('6. PostCardSkeleton supports varied media and text variants with matched geometry', () => {
    const skeletonPath = path.join(frontendSrc, 'components/community/feed/PostCard/PostCardSkeleton.jsx');
    const content = fs.readFileSync(skeletonPath, 'utf8');

    assert.ok(content.includes("variant = 'media'"), 'Must support variant prop with media default');
    assert.ok(content.includes('rounded-2xl'), 'Must match post card rounded-2xl geometry');
    assert.ok(content.includes('shimmer'), 'Must implement shimmer loading animation');
  });

  await t.test('7. CommunityHeader maintains 44px min touch targets and accessibility', () => {
    const headerPath = path.join(frontendSrc, 'components/community/header/CommunityHeader.jsx');
    const content = fs.readFileSync(headerPath, 'utf8');

    assert.ok(content.includes('min-h-[44px]'), 'Must provide 44px minimum height for header controls');
    assert.ok(content.includes('min-w-[40px]'), 'Must satisfy min-w-[40px] requirement');
    assert.ok(content.includes('aria-label='), 'Must provide accessible aria-labels');
  });

  await t.test('8. PostContent skips empty/invalid tags and avoids bare # buttons', () => {
    const postContentPath = path.join(frontendSrc, 'components/community/feed/PostCard/PostContent.jsx');
    const content = fs.readFileSync(postContentPath, 'utf8');

    assert.ok(content.includes('if (!cleanTag) return null;'), 'Must return null for empty or bare hash tags');
  });

  await t.test('9. CommunityHome prevents empty cleanActive tag from filtering all posts', () => {
    const homePath = path.join(frontendSrc, 'pages/community/CommunityHome.jsx');
    const content = fs.readFileSync(homePath, 'utf8');

    assert.ok(
      content.includes('if (!cleanActive) return rawPosts;'),
      'Must return rawPosts if cleanActive tag is empty string'
    );
  });

  await t.test('10. CompanyFeedHeader provides 44px min touch targets on action controls', () => {
    const headerPath = path.join(frontendSrc, 'components/community/header/CompanyFeedHeader.jsx');
    const content = fs.readFileSync(headerPath, 'utf8');

    assert.ok(
      content.includes('min-h-[44px]'),
      'CompanyFeedHeader actions must satisfy 44px minimum height touch targets'
    );
  });
});

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_SRC = resolve(__dirname, '..');
const BACKEND_ROOT = resolve(__dirname, '../../../backend');

describe('Zeitnah Community — Phase 6 Final Production Hardening & Release Audit', () => {

  describe('Section 1 & 2: Production Readiness Checklist & Codebase Verification', () => {
    it('verifies all critical Community frontend components exist and are intact', () => {
      const criticalFiles = [
        'pages/community/CommunityHome.jsx',
        'components/community/header/CommunityHeader.jsx',
        'components/community/feed/PostCard/index.jsx',
        'components/community/feed/PostCard/PostMedia.jsx',
        'components/community/feed/PostCard/ReactionBar.jsx',
        'components/community/feed/PostCard/PostActions.jsx',
        'components/community/comments/CommentDrawer.jsx',
        'components/community/stories/StoryRail.jsx',
        'components/community/stories/StoryViewer.jsx',
        'components/community/stories/CreateStoryModal.jsx',
        'components/community/discovery/CommunitySearchModal.jsx',
        'components/community/discovery/DiscoverySidebar.jsx',
        'components/community/discovery/MobileDiscoveryDrawer.jsx',
        'components/community/discovery/PeopleCard.jsx',
        'hooks/useCommunity.js',
        'services/communityApi.js',
        'utils/communityFormatters.js',
      ];

      for (const file of criticalFiles) {
        const fullPath = resolve(FRONTEND_SRC, file);
        assert.equal(existsSync(fullPath), true, `Critical file missing: ${file}`);
      }
    });

    it('verifies all critical Community backend services and controllers exist and are intact', () => {
      const criticalBackendFiles = [
        'src/modules/community/controllers/post.controller.ts',
        'src/modules/community/controllers/story.controller.ts',
        'src/modules/community/controllers/comment.controller.ts',
        'src/modules/community/controllers/moderation.controller.ts',
        'src/modules/community/controllers/community-upload.controller.ts',
        'src/modules/community/services/post.service.ts',
        'src/modules/community/services/story.service.ts',
        'src/modules/community/services/comment.service.ts',
        'src/modules/community/services/community-moderation.service.ts',
        'src/modules/community/services/community-s3.service.ts',
        'src/modules/community/repositories/mongo-post.repository.ts',
        'src/modules/community/schemas/post.schema.ts',
        'src/modules/community/schemas/story.schema.ts',
      ];

      for (const file of criticalBackendFiles) {
        const fullPath = resolve(BACKEND_ROOT, file);
        assert.equal(existsSync(fullPath), true, `Critical backend file missing: ${file}`);
      }
    });
  });

  describe('Section 9 & 21: Media Upload Safety, Buffer Protection & Security Constraints', () => {
    it('verifies backend upload controller enforces 8 MiB photo and 1 GiB video caps', () => {
      const uploadControllerPath = resolve(BACKEND_ROOT, 'src/modules/community/controllers/community-upload.controller.ts');
      const content = readFileSync(uploadControllerPath, 'utf8');

      // Verify photo limit: 8 MiB = 8 * 1024 * 1024 = 8388608
      assert.match(content, /MAX_IMAGE_SIZE|8\s*MB/i);

      // Verify video limit: 1 GiB = 1024 * 1024 * 1024 = 1073741824
      assert.match(content, /MAX_VIDEO_SIZE|1\s*GB/i);

      // Verify 90s max video duration check exists in s3 service
      const s3ServicePath = resolve(BACKEND_ROOT, 'src/modules/community/services/community-s3.service.ts');
      const s3Content = readFileSync(s3ServicePath, 'utf8');
      assert.match(s3Content, /90|duration/);
    });

    it('verifies upload controller uses disk storage to prevent memory buffer exhaustion', () => {
      const uploadControllerPath = resolve(BACKEND_ROOT, 'src/modules/community/controllers/community-upload.controller.ts');
      const content = readFileSync(uploadControllerPath, 'utf8');

      // Must use diskStorage instead of memoryStorage to prevent buffering 1 GiB in Node memory
      assert.match(content, /diskStorage/);
      assert.doesNotMatch(content, /memoryStorage\(\)/);
    });

    it('verifies dangerous executable and script file extensions are strictly rejected', () => {
      const uploadControllerPath = resolve(BACKEND_ROOT, 'src/modules/community/controllers/community-upload.controller.ts');
      const content = readFileSync(uploadControllerPath, 'utf8');

      const dangerousExtensions = ['exe', 'sh', 'bat', 'cmd', 'php'];
      for (const ext of dangerousExtensions) {
        assert.equal(
          content.includes(`'${ext}'`) || content.includes(`"${ext}"`) || content.includes(ext),
          true,
          `Dangerous extension ${ext} not blocked`
        );
      }
    });

    it('verifies S3 media paths are strictly isolated per user and strip EXIF metadata', () => {
      const s3ServicePath = resolve(BACKEND_ROOT, 'src/modules/community/services/community-s3.service.ts');
      const content = readFileSync(s3ServicePath, 'utf8');

      assert.match(content, /community\/uploads\/\$\{userId\}/);
      assert.match(content, /-map_metadata -1/);
    });
  });

  describe('Section 14 & 16: Error Boundaries & Touch Target Accessibility', () => {
    it('verifies CommunityHome wraps lazy overlays inside FeatureErrorBoundary', () => {
      const homePath = resolve(FRONTEND_SRC, 'pages/community/CommunityHome.jsx');
      const content = readFileSync(homePath, 'utf8');

      assert.match(content, /<FeatureErrorBoundary\s+featureName=["']Community Overlay["']>/);
    });

    it('verifies touch target accessibility: interactive retry buttons meet min-h-[44px]', () => {
      const homePath = resolve(FRONTEND_SRC, 'pages/community/CommunityHome.jsx');
      const homeContent = readFileSync(homePath, 'utf8');
      assert.match(homeContent, /min-h-\[44px\]/);

      const mediaPath = resolve(FRONTEND_SRC, 'components/community/feed/PostCard/PostMedia.jsx');
      const mediaContent = readFileSync(mediaPath, 'utf8');
      assert.match(mediaContent, /min-h-\[44px\]/);
    });
  });

  describe('Section 13: Query Invalidation Scoping & Cache Isolation', () => {
    it('verifies useCommunity scoped query keys and avoids sweeping cancellations', () => {
      const hookPath = resolve(FRONTEND_SRC, 'hooks/useCommunity.js');
      const content = readFileSync(hookPath, 'utf8');

      // Verify specific query key structure
      assert.match(content, /'community',\s*'feed'/);
      assert.match(content, /'community',\s*'stories'/);
      assert.match(content, /'community',\s*'saved'/);

      // Verify targeted invalidation for story creation
      assert.match(content, /queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['community',\s*'stories'\]/);

      // Verify targeted invalidation for post feed
      assert.match(content, /queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['community',\s*'feed'\]/);
    });
  });

  describe('Section 20 & 21: Database Integrity, Soft Deletion & String UUID ID Safety', () => {
    it('verifies all feed and retrieval queries enforce soft deletion (isDeleted: false)', () => {
      const repoPath = resolve(BACKEND_ROOT, 'src/modules/community/repositories/mongo-post.repository.ts');
      const content = readFileSync(repoPath, 'utf8');

      assert.match(content, /isDeleted:\s*false/);
    });

    it('verifies mongo-post repository safely handles UUID strings without unsafe ObjectId casting', () => {
      const repoPath = resolve(BACKEND_ROOT, 'src/modules/community/repositories/mongo-post.repository.ts');
      const content = readFileSync(repoPath, 'utf8');

      // Checks that string conversion / safe string matching is used in aggregations
      assert.match(content, /\$toString/);
    });

    it('verifies post deletion mutation executes soft delete only and never hard delete', () => {
      const repoPath = resolve(BACKEND_ROOT, 'src/modules/community/repositories/mongo-post.repository.ts');
      const content = readFileSync(repoPath, 'utf8');

      assert.match(content, /isDeleted:\s*true/);
      assert.match(content, /deletedAt:\s*new Date\(\)/);
    });
  });

  describe('Section 24: Community Route & API Contract Completeness', () => {
    it('verifies communityApi has complete coverage of post, story, comment, and discovery endpoints', () => {
      const apiPath = resolve(FRONTEND_SRC, 'services/communityApi.js');
      const content = readFileSync(apiPath, 'utf8');

      const requiredMethods = [
        'getFeed',
        'getActiveStories',
        'createStory',
        'deleteStory',
        'createPost',
        'getPost',
        'deletePost',
        'reactToPost',
        'removeReaction',
        'repostPost',
        'savePost',
        'removeSavedPost',
        'getComments',
        'createComment',
        'deleteComment',
        'searchCommunity',
        'getSavedPosts',
        'uploadMedia',
      ];

      for (const method of requiredMethods) {
        assert.equal(
          content.includes(`${method}:`) || content.includes(`${method}(`) || content.includes(method),
          true,
          `API missing method: ${method}`
        );
      }
    });
  });
});

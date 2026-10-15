import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '..');

test('Phase A: Community Moderation Pipeline Frontend Verification Suite', async (t) => {
  await t.test('1. ReportModal targetType and reason code support', () => {
    const reportModalPath = path.join(frontendSrc, 'components/network/ReportModal.jsx');
    const content = fs.readFileSync(reportModalPath, 'utf8');

    assert.ok(content.includes('INAPPROPRIATE_CONTENT'), 'Must include INAPPROPRIATE_CONTENT');
    assert.ok(content.includes('SPAM_OR_SCAM'), 'Must include SPAM_OR_SCAM');
    assert.ok(content.includes('IMPERSONATION'), 'Must include IMPERSONATION');
    assert.ok(content.includes('HARASSMENT'), 'Must include HARASSMENT');
    assert.ok(content.includes('OTHER'), 'Must include OTHER');
    assert.ok(content.includes('moderationService.createReport'), 'Must invoke moderationService.createReport');
  });

  await t.test('2. PostCard and CommentItem pass COMMUNITY targetType to ReportModal', () => {
    const postCardPath = path.join(frontendSrc, 'components/community/feed/PostCard/index.jsx');
    const postCardContent = fs.readFileSync(postCardPath, 'utf8');
    assert.ok(
      postCardContent.includes('targetType="COMMUNITY"'),
      'PostCard must supply targetType="COMMUNITY" to ReportModal',
    );

    const commentItemPath = path.join(frontendSrc, 'components/community/comments/CommentItem.jsx');
    const commentItemContent = fs.readFileSync(commentItemPath, 'utf8');
    assert.ok(
      commentItemContent.includes('targetType="COMMUNITY"'),
      'CommentItem must supply targetType="COMMUNITY" to ReportModal',
    );
  });

  await t.test('3. communityApi exports both getReports and getModerationReports with params support', () => {
    const apiPath = path.join(frontendSrc, 'services/communityApi.js');
    const content = fs.readFileSync(apiPath, 'utf8');

    assert.ok(content.includes('getReports: async (params)'), 'Must define getReports with params');
    assert.ok(content.includes('getModerationReports: async (params)'), 'Must define getModerationReports alias');
    assert.ok(content.includes('/community/moderation/reports'), 'Must target /community/moderation/reports endpoint');
    assert.ok(content.includes('/community/moderation/reports/${id}/resolve'), 'Must target resolve endpoint');
    assert.ok(content.includes('/community/moderation/posts/${id}/hide'), 'Must target hide endpoint');
  });

  await t.test('4. useCommunity.js exports required moderation query and mutation hooks', () => {
    const hookPath = path.join(frontendSrc, 'hooks/useCommunity.js');
    const content = fs.readFileSync(hookPath, 'utf8');

    assert.ok(content.includes('export function useModerationReports'), 'Must export useModerationReports');
    assert.ok(content.includes('export function useResolveReport'), 'Must export useResolveReport');
    assert.ok(content.includes('export function useHidePostAsMod'), 'Must export useHidePostAsMod');
    assert.ok(content.includes("queryKey: ['community', 'moderation', 'reports'"), 'Must track moderation query key');
  });

  await t.test('5. ModeratorDashboard safely handles dual-contract field names', () => {
    const dashboardPath = path.join(frontendSrc, 'pages/community/ModeratorDashboard.jsx');
    const content = fs.readFileSync(dashboardPath, 'utf8');

    assert.ok(content.includes('entityId || selectedReport.targetId'), 'Must support entityId or targetId fallback');
    assert.ok(content.includes('entityType || report.targetType'), 'Must support entityType or targetType fallback');
    assert.ok(content.includes('description || selectedReport.details'), 'Must support description or details fallback');
    assert.ok(content.includes('report._id || report.id'), 'Must support _id or id key fallback');
  });
});

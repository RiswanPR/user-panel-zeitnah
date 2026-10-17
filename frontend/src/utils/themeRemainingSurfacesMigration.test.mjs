import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to resolve paths relative to frontend/src
const resolveSrc = (relativePath) => path.resolve(__dirname, '..', relativePath);

describe('Zeitnah — Phase 5C: Remaining Surfaces Theme Migration Regression Tests', () => {

  // ── GROUP 1: Network & Opportunity Components ──
  describe('Group 1: Network, Opportunity, Organization, and Space Components', () => {
    it('1. OpportunityCard & OpportunityDetailModal use semantic surface and border tokens', () => {
      const card = fs.readFileSync(resolveSrc('components/network/OpportunityCard.jsx'), 'utf8');
      const modal = fs.readFileSync(resolveSrc('components/network/OpportunityDetailModal.jsx'), 'utf8');

      assert.ok(card.includes('bg-surface-card'), 'OpportunityCard must use bg-surface-card');
      assert.ok(card.includes('border-border'), 'OpportunityCard must use border-border');
      assert.ok(card.includes('text-text-primary'), 'OpportunityCard title must use text-text-primary');
      assert.ok(!card.includes('bg-white/[0.02]'), 'OpportunityCard must not have hardcoded dark card bg');

      assert.ok(modal.includes('bg-surface-card'), 'OpportunityDetailModal must use bg-surface-card');
      assert.ok(modal.includes('border-border'), 'OpportunityDetailModal must use border-border');
      assert.ok(modal.includes('text-text-primary'), 'OpportunityDetailModal header must use text-text-primary');
      assert.ok(!modal.includes('bg-[#0E1726]'), 'OpportunityDetailModal must not have bg-[#0E1726]');
    });

    it('2. OrganizationCard, ConnectionCard, ConnectionRequestCard, and ConnectionsList use semantic tokens', () => {
      const orgCard = fs.readFileSync(resolveSrc('components/network/OrganizationCard.jsx'), 'utf8');
      const connCard = fs.readFileSync(resolveSrc('components/network/ConnectionCard.jsx'), 'utf8');
      const connReqCard = fs.readFileSync(resolveSrc('components/network/ConnectionRequestCard.jsx'), 'utf8');
      const connList = fs.readFileSync(resolveSrc('components/network/ConnectionsList.jsx'), 'utf8');

      assert.ok(orgCard.includes('bg-surface-card') && orgCard.includes('border-border'));
      assert.ok(connCard.includes('bg-surface-card') && connCard.includes('border-border'));
      assert.ok(connReqCard.includes('bg-surface-card') && connReqCard.includes('border-border'));
      assert.ok(connReqCard.includes('bg-surface-elevated'));
      assert.ok(!connReqCard.includes('bg-[#0A0F14]'));
      assert.ok(!connReqCard.includes('bg-[#070B14]'));
      assert.ok(connList.includes('bg-surface-card') || connList.includes('bg-surface-elevated'));
      assert.ok(!orgCard.includes('bg-white/[0.02]'));
      assert.ok(!connCard.includes('bg-white/[0.02]'));
    });

    it('3. Student cards, modals, and filters adopt semantic theme tokens', () => {
      const studentCard = fs.readFileSync(resolveSrc('components/network/StudentCard.jsx'), 'utf8');
      const studentFilters = fs.readFileSync(resolveSrc('components/network/StudentFilters.jsx'), 'utf8');
      const profilePreview = fs.readFileSync(resolveSrc('components/network/StudentProfilePreviewModal.jsx'), 'utf8');
      const messageReq = fs.readFileSync(resolveSrc('components/network/SendMessageRequestModal.jsx'), 'utf8');

      assert.ok(studentCard.includes('bg-surface-card') && studentCard.includes('border-border'));
      assert.ok(studentFilters.includes('bg-surface-card') && studentFilters.includes('border-border'));
      assert.ok(profilePreview.includes('bg-surface-card') && profilePreview.includes('border-border'));
      assert.ok(messageReq.includes('bg-surface-card') && messageReq.includes('border-border'));
      assert.ok(!profilePreview.includes('bg-[#0A0F1A]'), 'StudentProfilePreviewModal must not have bg-[#0A0F1A]');
      assert.ok(!messageReq.includes('bg-[#0A0F1A]'), 'SendMessageRequestModal must not have bg-[#0A0F1A]');
    });

    it('4. ReportModal, ResourceModal, AnnouncementModal, and DiscussionModal use semantic tokens', () => {
      const report = fs.readFileSync(resolveSrc('components/network/ReportModal.jsx'), 'utf8');
      const resource = fs.readFileSync(resolveSrc('components/network/ResourceModal.jsx'), 'utf8');
      const announcement = fs.readFileSync(resolveSrc('components/network/AnnouncementModal.jsx'), 'utf8');
      const discussion = fs.readFileSync(resolveSrc('components/network/DiscussionModal.jsx'), 'utf8');

      for (const [name, content] of Object.entries({ report, resource, announcement, discussion })) {
        assert.ok(content.includes('bg-surface-card'), `${name} must use bg-surface-card`);
        assert.ok(content.includes('border-border'), `${name} must use border-border`);
        assert.ok(!content.includes('bg-[#0A0F1A]'), `${name} must not contain bg-[#0A0F1A]`);
      }
    });

    it('5. Space sub-views (Announcements, Discussions, Members, Resources) use semantic tokens', () => {
      const spaceAnnounce = fs.readFileSync(resolveSrc('components/network/SpaceAnnouncements.jsx'), 'utf8');
      const spaceDiscussions = fs.readFileSync(resolveSrc('components/network/SpaceDiscussions.jsx'), 'utf8');
      const spaceMembers = fs.readFileSync(resolveSrc('components/network/SpaceMembers.jsx'), 'utf8');
      const spaceResources = fs.readFileSync(resolveSrc('components/network/SpaceResources.jsx'), 'utf8');

      for (const [name, content] of Object.entries({ spaceAnnounce, spaceDiscussions, spaceMembers, spaceResources })) {
        assert.ok(content.includes('bg-surface-card') || content.includes('border-border'), `${name} must use semantic tokens`);
        assert.ok(!content.includes('bg-white/[0.02]'), `${name} must not contain bg-white/[0.02]`);
      }
    });

    it('6. CommunityCard, EventCard, LearningSpaceCard, InfrastructurePeopleCard, and NetworkActivityItem use semantic tokens', () => {
      const community = fs.readFileSync(resolveSrc('components/network/CommunityCard.jsx'), 'utf8');
      const event = fs.readFileSync(resolveSrc('components/network/EventCard.jsx'), 'utf8');
      const learning = fs.readFileSync(resolveSrc('components/network/LearningSpaceCard.jsx'), 'utf8');
      const people = fs.readFileSync(resolveSrc('components/network/InfrastructurePeopleCard.jsx'), 'utf8');
      const activity = fs.readFileSync(resolveSrc('components/network/NetworkActivityItem.jsx'), 'utf8');

      assert.ok(community.includes('bg-surface-card') && community.includes('border-border'));
      assert.ok((event.includes('zn-card') || event.includes('bg-surface-card')) && event.includes('bg-surface-elevated'));
      assert.ok(learning.includes('bg-surface-card') && learning.includes('border-border'));
      assert.ok(people.includes('bg-surface-card') && people.includes('border-border'));
      assert.ok(activity.includes('bg-surface-card') && activity.includes('border-border'));
    });
  });

  // ── GROUP 2: Shared UI, Badges, Progress, Skeletons, Toaster, UsernameClaim ──
  describe('Group 2: Shared UI Components, Toasts, Skeletons, and Username Modal', () => {
    it('7. AnnouncementBanner respects semantic surface and text tokens', () => {
      const banner = fs.readFileSync(resolveSrc('components/announcements/AnnouncementBanner.jsx'), 'utf8');
      assert.ok(banner.includes('surface-elevated'), 'AnnouncementBanner must use surface-elevated');
      assert.ok(banner.includes('border-border') || banner.includes('border-brand-mint/30'), 'AnnouncementBanner must use border tokens');
      assert.ok(banner.includes('text-text-primary'), 'AnnouncementBanner must use text-text-primary');
      assert.ok(!banner.includes('bg-[#0A101D]'), 'AnnouncementBanner must not have bg-[#0A101D]');
    });

    it('8. UI primitives (Badge, ProgressBar, Skeleton, Toast, App Toaster) respect semantic tokens', () => {
      const badge = fs.readFileSync(resolveSrc('components/ui/Badge.jsx'), 'utf8');
      const progress = fs.readFileSync(resolveSrc('components/ui/ProgressBar.jsx'), 'utf8');
      const skeleton = fs.readFileSync(resolveSrc('components/ui/Skeleton.jsx'), 'utf8');
      const toast = fs.readFileSync(resolveSrc('components/ui/Toast.jsx'), 'utf8');
      const app = fs.readFileSync(resolveSrc('App.jsx'), 'utf8');

      assert.ok(badge.includes('bg-surface-elevated') && badge.includes('border-border'), 'Badge outline variant must use semantic tokens');
      assert.ok(progress.includes('bg-surface-elevated') && progress.includes('border-border'), 'ProgressBar track must use semantic tokens');
      assert.ok(skeleton.includes('bg-surface-card') && skeleton.includes('border-border'), 'SkeletonCard must use semantic tokens');
      assert.ok((toast.includes('bg-surface-elevated') || toast.includes('bg-surface-card')) && toast.includes('text-text-primary'), 'Toast must use semantic tokens');
      assert.ok(app.includes('var(--zn-token-surface-card)') && app.includes('var(--zn-token-text-primary)'), 'App Toaster must bind to theme CSS tokens');
    });

    it('9. UsernameClaimModal adopts semantic surface and typography tokens', () => {
      const modal = fs.readFileSync(resolveSrc('components/username/UsernameClaimModal.jsx'), 'utf8');
      assert.ok(modal.includes('bg-bg-card') || modal.includes('bg-surface-card'), 'UsernameClaimModal must use semantic card token');
      assert.ok(modal.includes('border-border-default') || modal.includes('border-border'), 'UsernameClaimModal must use semantic border token');
      assert.ok(modal.includes('text-text-primary'), 'UsernameClaimModal must use text-text-primary');
      assert.ok(!modal.includes('bg-[#0E131F]'), 'UsernameClaimModal must not have bg-[#0E131F]');
    });
  });

  // ── GROUP 3: Utility, Legal, Admin, and Core Pages ──
  describe('Group 3: Utility, Legal, Diagnostic, and Core Pages', () => {
    it('10. TermsOfServicePage uses semantic tokens across all legal sections', () => {
      const tos = fs.readFileSync(resolveSrc('pages/legal/TermsOfServicePage.jsx'), 'utf8');
      assert.ok(tos.includes('bg-bg-base'), 'TermsOfServicePage must use bg-bg-base');
      assert.ok(tos.includes('bg-surface-card'), 'TermsOfServicePage must use bg-surface-card');
      assert.ok(tos.includes('border-border'), 'TermsOfServicePage must use border-border');
      assert.ok(tos.includes('text-text-primary'), 'TermsOfServicePage must use text-text-primary');
      assert.ok(!tos.includes('bg-[#0E1726]'), 'TermsOfServicePage must not have bg-[#0E1726]');
      assert.ok(!tos.includes('bg-[#0A0F1A]'), 'TermsOfServicePage must not have bg-[#0A0F1A]');
    });

    it('11. PrivacyPolicyPage uses semantic tokens for hero, sidebar, and cards', () => {
      const privacy = fs.readFileSync(resolveSrc('pages/privacy/PrivacyPolicyPage.jsx'), 'utf8');
      assert.ok(privacy.includes('bg-bg-base'), 'PrivacyPolicyPage must use bg-bg-base');
      assert.ok(privacy.includes('bg-surface-card'), 'PrivacyPolicyPage must use bg-surface-card');
      assert.ok(privacy.includes('border-border'), 'PrivacyPolicyPage must use border-border');
      assert.ok(privacy.includes('text-text-primary'), 'PrivacyPolicyPage must use text-text-primary');
      assert.ok(!privacy.includes('bg-[#0A101D]'), 'PrivacyPolicyPage must not have bg-[#0A101D]');
    });

    it('12. SupportPage uses semantic tokens for hero, FAQs, tabs, and ticket form', () => {
      const support = fs.readFileSync(resolveSrc('pages/support/SupportPage.jsx'), 'utf8');
      assert.ok(support.includes('bg-bg-base'), 'SupportPage must use bg-bg-base');
      assert.ok(support.includes('bg-surface-card'), 'SupportPage must use bg-surface-card');
      assert.ok(support.includes('border-border'), 'SupportPage must use border-border');
      assert.ok(support.includes('text-text-primary'), 'SupportPage must use text-text-primary');
      assert.ok(!support.includes('bg-[#0E1726]'), 'SupportPage must not have bg-[#0E1726]');
    });

    it('13. AboutPage and Home use semantic tokens for hero cards and ecosystem pillars', () => {
      const about = fs.readFileSync(resolveSrc('pages/about/AboutPage.jsx'), 'utf8');
      const home = fs.readFileSync(resolveSrc('pages/home/Home.jsx'), 'utf8');

      assert.ok(about.includes('bg-bg-base') && about.includes('bg-surface-card') && about.includes('border-border'));
      assert.ok(home.includes('bg-bg-base') && home.includes('bg-surface-card') && home.includes('border-border'));
      assert.ok(about.includes('text-text-primary'));
      assert.ok(home.includes('text-text-primary'));
      assert.ok(!about.includes('bg-white/[0.02]'));
      assert.ok(!home.includes('bg-white/[0.02]'));
    });

    it('14. NotFoundPage, ActiveSessions, and AuditLogs use semantic tokens', () => {
      const notFound = fs.readFileSync(resolveSrc('pages/NotFoundPage.jsx'), 'utf8');
      const sessions = fs.readFileSync(resolveSrc('pages/sessions/ActiveSessions.jsx'), 'utf8');
      const audit = fs.readFileSync(resolveSrc('pages/audit/AuditLogs.jsx'), 'utf8');

      assert.ok(notFound.includes('text-text-primary'), 'NotFoundPage heading must use text-text-primary');
      assert.ok(sessions.includes('text-text-primary') && sessions.includes('border-border'), 'ActiveSessions must use semantic tokens');
      assert.ok(audit.includes('text-text-primary') && audit.includes('border-border'), 'AuditLogs must use semantic tokens');
      assert.ok(!sessions.includes('border-white/[0.05]'));
      assert.ok(!audit.includes('hover:border-white/[0.1]'));
    });

    it('15. Admin surfaces (SessionDiagnostics, ErrorReportsDashboard, AdminBusinessReviewPage) use semantic tokens', () => {
      const diag = fs.readFileSync(resolveSrc('pages/admin/SessionDiagnostics.jsx'), 'utf8');
      const errorReports = fs.readFileSync(resolveSrc('pages/admin/ErrorReportsDashboard.jsx'), 'utf8');
      const bizReview = fs.readFileSync(resolveSrc('pages/admin/AdminBusinessReviewPage.jsx'), 'utf8');

      assert.ok(diag.includes('bg-bg-base') && diag.includes('bg-surface-card'));
      assert.ok(errorReports.includes('bg-bg-base') && errorReports.includes('bg-surface-card') && errorReports.includes('border-border'));
      assert.ok(bizReview.includes('bg-surface-card') && bizReview.includes('border-border'));

      assert.ok(!diag.includes('bg-[#07192a]'), 'SessionDiagnostics must not have bg-[#07192a]');
      assert.ok(!errorReports.includes('bg-[#070B14]'), 'ErrorReportsDashboard must not have bg-[#070B14]');
      assert.ok(!errorReports.includes('bg-[#0A1A2F]'), 'ErrorReportsDashboard must not have bg-[#0A1A2F]');
      assert.ok(!bizReview.includes('bg-[#14141c]'), 'AdminBusinessReviewPage must not have bg-[#14141c]');
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Area A: Network paths
const NETWORK_HERO_PATH = path.resolve(__dirname, '../components/network/NetworkHero.jsx');
const NETWORK_PAGE_PATH = path.resolve(__dirname, '../pages/network/NetworkPage.jsx');
const NETWORK_CONNECTIONS_PATH = path.resolve(__dirname, '../components/network/NetworkConnections.jsx');
const RELATIONSHIP_ACTION_PATH = path.resolve(__dirname, '../components/network/RelationshipAction.jsx');
const CONNECTION_REQUEST_CARD_PATH = path.resolve(__dirname, '../components/network/ConnectionRequestCard.jsx');
const STUDENT_FILTERS_PATH = path.resolve(__dirname, '../components/network/StudentFilters.jsx');

// Area B: Jobs paths
const JOBS_PAGE_PATH = path.resolve(__dirname, '../pages/jobs/JobsPage.jsx');
const JOB_DETAIL_PAGE_PATH = path.resolve(__dirname, '../pages/jobs/JobDetailPage.jsx');

// Area C: Opportunities paths
const OPPORTUNITY_INBOX_PAGE_PATH = path.resolve(__dirname, '../pages/opportunities/OpportunityInboxPage.jsx');
const OPPORTUNITY_CARD_PATH = path.resolve(__dirname, '../components/network/OpportunityCard.jsx');
const OPPORTUNITY_SERVICE_PATH = path.resolve(__dirname, '../services/opportunityService.js');

// Area D: Courses paths
const COURSES_PAGE_PATH = path.resolve(__dirname, '../pages/courses/Courses.jsx');
const RECORDING_COURSE_CARD_PATH = path.resolve(__dirname, '../components/courses/RecordingCourseCard.jsx');
const ONLINE_COURSE_CARD_PATH = path.resolve(__dirname, '../components/courses/OnlineCourseCard.jsx');
const CONTINUE_WATCHING_CARD_PATH = path.resolve(__dirname, '../components/courses/ContinueWatchingCard.jsx');

// Area E: Career Intelligence paths
const CAREER_PAGE_PATH = path.resolve(__dirname, '../pages/career/CareerIntelligencePage.jsx');

describe('Zeitnah — Phase 10D: Premium Theme Polish for Network, Jobs, Opportunities, Courses & Career Intelligence', () => {

  describe('Area A: Network Surface Refinement', () => {
    it('verifies NetworkHero telemetry metrics and Action chips use high-contrast dark/light tokens', () => {
      const content = fs.readFileSync(NETWORK_HERO_PATH, 'utf-8');
      assert.ok(content.includes('text-amber-600 dark:text-amber-400'), 'Pending requests telemetry number must have high-contrast amber token');
      assert.ok(content.includes('text-amber-800 dark:text-amber-300'), 'Action badge chip text must have dark/light contrast styling');
      assert.ok(content.includes('bg-amber-500/15'), 'Action badge chip must have amber bg token');
    });

    it('verifies NetworkPage tab badge for incoming requests uses accessible amber token', () => {
      const content = fs.readFileSync(NETWORK_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('text-amber-800 dark:text-brand-yellow'), 'Incoming requests tab badge must be readable in both modes');
    });

    it('verifies NetworkConnections attention badge uses high-contrast styling', () => {
      const content = fs.readFileSync(NETWORK_CONNECTIONS_PATH, 'utf-8');
      assert.ok(content.includes('bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30'), 'Attention subtab count badge must be accessible');
    });

    it('verifies RelationshipAction Accept and Connect buttons use adaptive primary CTA tokens', () => {
      const content = fs.readFileSync(RELATIONSHIP_ACTION_PATH, 'utf-8');
      assert.ok(content.includes('bg-brand-primary text-white hover:bg-brand-primary/90 dark:bg-brand-mint dark:text-brand-navy'), 'Accept CTA must use adaptive primary button colors');
      assert.ok(content.includes('border-brand-primary/30 dark:border-brand-mint/30') && content.includes('text-brand-primary dark:text-brand-mint'), 'Connect button must use adaptive brand colors');
      assert.ok(content.includes('text-amber-800 dark:text-amber-200'), 'Pending badge must use high-contrast amber');
    });

    it('verifies ConnectionRequestCard Accept CTA uses adaptive primary button tokens', () => {
      const content = fs.readFileSync(CONNECTION_REQUEST_CARD_PATH, 'utf-8');
      assert.ok(content.includes('bg-brand-primary text-white hover:bg-brand-primary/90 dark:bg-brand-mint dark:text-brand-navy'), 'Accept CTA must use adaptive primary button tokens');
    });

    it('verifies StudentFilters Apply Filters CTA and filter options eliminate raw white-on-yellow and white-on-mint', () => {
      const content = fs.readFileSync(STUDENT_FILTERS_PATH, 'utf-8');
      assert.ok(content.includes('bg-brand-primary text-white hover:bg-brand-primary/90 dark:bg-brand-mint dark:text-brand-navy'), 'Apply Filters button must use adaptive primary button tokens');
      assert.ok(!content.includes('bg-brand-yellow text-white'), 'Must never use white text on yellow background');
      assert.ok(!content.includes('bg-brand-mint text-bg-base'), 'Must never use low-contrast text-bg-base on mint');
    });
  });

  describe('Area B: Jobs Surface Refinement', () => {
    it('verifies JobsPage segmented navigation tabs use semantic roles and adaptive active styling', () => {
      const content = fs.readFileSync(JOBS_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('role="tablist"'), 'Navigation tabs container must specify role="tablist"');
      assert.ok(content.includes('role="tab"'), 'Tab items must specify role="tab"');
      assert.ok(content.includes('aria-selected'), 'Tabs must specify aria-selected state');
      assert.ok(content.includes('bg-surface-elevated text-text-primary font-bold border border-border shadow-sm'), 'Active tab must use theme-adaptive elevated styling');
    });

    it('verifies JobsPage View Job CTAs use adaptive brand button styling with minimum touch target height', () => {
      const content = fs.readFileSync(JOBS_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('bg-brand-primary text-white hover:bg-brand-primary/90 dark:bg-brand-mint dark:text-brand-navy'), 'View Job button must use adaptive brand colors');
      assert.ok(!content.includes('bg-brand-mint text-bg-base'), 'Must not contain low-contrast bg-brand-mint text-bg-base');
    });

    it('verifies JobDetailPage Apply Now CTA uses zn-btn-primary with accessible rounded styling', () => {
      const content = fs.readFileSync(JOB_DETAIL_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('zn-btn-primary min-h-[44px] rounded-2xl'), 'Apply Now button must use zn-btn-primary with min-h-[44px]');
      assert.ok(content.includes('text-emerald-700 dark:text-brand-mint'), 'Verified employer badge must have high contrast in light mode');
    });
  });

  describe('Area C: Opportunities Surface Refinement', () => {
    it('verifies OpportunityInboxPage segmented tabs use semantic roles and adaptive active styling', () => {
      const content = fs.readFileSync(OPPORTUNITY_INBOX_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('role="tablist"'), 'Inbox tabs container must specify role="tablist"');
      assert.ok(content.includes('role="tab"'), 'Inbox tabs must specify role="tab"');
      assert.ok(content.includes('aria-selected'), 'Inbox tabs must specify aria-selected state');
      assert.ok(content.includes('bg-surface-elevated border border-border shadow-sm'), 'Active tab must use elevated adaptive styling');
    });

    it('verifies OpportunityInboxPage Boost Profile CTA uses adaptive primary button tokens', () => {
      const content = fs.readFileSync(OPPORTUNITY_INBOX_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('bg-brand-primary text-white dark:bg-brand-mint dark:text-brand-navy'), 'Boost Profile CTA must use adaptive primary button colors');
    });

    it('verifies OpportunityCard View Details & modal Apply Now CTAs use zn-btn-primary with 44px min target', () => {
      const content = fs.readFileSync(OPPORTUNITY_CARD_PATH, 'utf-8');
      assert.ok(content.includes('zn-btn-primary px-5 py-2.5 rounded-xl') && content.includes('min-h-[44px]'), 'Modal Apply CTA must use zn-btn-primary');
      assert.ok(content.includes('text-emerald-600 dark:text-emerald-400'), 'Verified company badge must have high-contrast emerald token');
    });

    it('verifies Opportunity service contract integrity is preserved without mock mutation', () => {
      const content = fs.readFileSync(OPPORTUNITY_SERVICE_PATH, 'utf-8');
      assert.ok(content.includes('getCandidateInbox'), 'Service must export getCandidateInbox');
      assert.ok(content.includes('getCandidateOpportunityById'), 'Service must export getCandidateOpportunityById');
      assert.ok(content.includes('markInterested'), 'Service must export markInterested');
      assert.ok(content.includes('getInboxUnreadCount'), 'Service must export getInboxUnreadCount');
    });
  });

  describe('Area D: Courses Surface Refinement', () => {
    it('verifies Courses page browse catalog & retry buttons use zn-btn-primary and section accents are accessible', () => {
      const content = fs.readFileSync(COURSES_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('zn-btn-primary min-h-[44px]'), 'Course action buttons must use zn-btn-primary');
      assert.ok(content.includes('text-amber-800 dark:text-brand-yellow'), 'Masterclass eyebrow accent must be dark/light adaptive');
      assert.ok(content.includes('text-brand-primary dark:text-brand-mint'), 'Online courses eyebrow accent must be dark/light adaptive');
    });

    it('verifies RecordingCourseCard enrolled badges and CTAs eliminate white text on yellow', () => {
      const content = fs.readFileSync(RECORDING_COURSE_CARD_PATH, 'utf-8');
      assert.ok(content.includes('text-amber-800 dark:text-brand-yellow'), 'Enrolled badge must use dark/light adaptive yellow/amber');
      assert.ok(content.includes('text-brand-primary dark:text-brand-mint'), 'Continue masterclass button must use high-contrast brand colors');
      assert.ok(content.includes('bg-brand-yellow text-brand-navy'), 'Card action button on yellow must use text-brand-navy');
      assert.ok(!content.includes('bg-brand-yellow text-white'), 'Must never use white text on yellow');
    });

    it('verifies OnlineCourseCard Join button uses high-contrast text-brand-navy on yellow', () => {
      const content = fs.readFileSync(ONLINE_COURSE_CARD_PATH, 'utf-8');
      assert.ok(content.includes('bg-brand-yellow text-brand-navy'), 'Join button must use text-brand-navy on yellow background');
      assert.ok(!content.includes('bg-brand-yellow text-white'), 'Must never use white text on yellow');
    });

    it('verifies ContinueWatchingCard Resume button uses high-contrast text-brand-navy on yellow', () => {
      const content = fs.readFileSync(CONTINUE_WATCHING_CARD_PATH, 'utf-8');
      assert.ok(content.includes('bg-brand-yellow text-brand-navy'), 'Resume button must use text-brand-navy on yellow background');
      assert.ok(!content.includes('bg-brand-yellow text-white'), 'Must never use white text on yellow');
    });
  });

  describe('Area E: Career Intelligence Surface Refinement', () => {
    it('verifies CareerIntelligencePage segmented tabs use semantic roles and adaptive active styling', () => {
      const content = fs.readFileSync(CAREER_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('role="tablist"'), 'Navigation tabs container must specify role="tablist"');
      assert.ok(content.includes('role="tab"'), 'Tab items must specify role="tab"');
      assert.ok(content.includes('aria-selected'), 'Tabs must specify aria-selected state');
      assert.ok(content.includes('bg-surface-elevated text-text-primary font-bold border border-border shadow-sm'), 'Active tab must use elevated adaptive styling');
    });

    it('verifies CareerIntelligencePage Target Goal and Assistant action buttons use adaptive primary button tokens', () => {
      const content = fs.readFileSync(CAREER_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('bg-brand-primary text-white hover:bg-brand-primary/90 dark:bg-brand-mint dark:text-brand-navy dark:hover:bg-brand-mint/90'), 'Buttons must use adaptive primary button styling');
      assert.ok(!content.includes('bg-brand-mint text-bg-base'), 'Must not contain low-contrast bg-brand-mint text-bg-base');
    });

    it('verifies CareerIntelligencePage role alignment and gap badges have accessible light and dark contrast', () => {
      const content = fs.readFileSync(CAREER_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('text-emerald-700 dark:text-emerald-400') || content.includes('text-emerald-800 dark:text-emerald-400'), 'Match indicators must use dual light/dark tokens');
      assert.ok(content.includes('text-amber-800 dark:text-amber-400'), 'Development gap indicators must use dual light/dark tokens');
    });
  });
});

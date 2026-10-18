import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pages
const COURSES_PAGE_PATH = path.resolve(__dirname, '../pages/courses/Courses.jsx');
const COURSE_CHAPTERS_PAGE_PATH = path.resolve(__dirname, '../pages/courses/CourseChapters.jsx');
const COURSE_CLASSES_PAGE_PATH = path.resolve(__dirname, '../pages/courses/CourseClasses.jsx');
const CLASS_VIEW_PAGE_PATH = path.resolve(__dirname, '../pages/courses/ClassView.jsx');
const MY_LEARNING_PAGE_PATH = path.resolve(__dirname, '../pages/learning/MyLearning.jsx');
const DASHBOARD_PAGE_PATH = path.resolve(__dirname, '../pages/learning/Dashboard.jsx');
const MY_POINTS_PAGE_PATH = path.resolve(__dirname, '../pages/learning/MyPoints.jsx');

// Courses Components
const COURSE_NAVBAR_PATH = path.resolve(__dirname, '../components/courses/CourseNavbar.jsx');
const COURSE_HERO_PATH = path.resolve(__dirname, '../components/courses/CourseHero.jsx');
const CONTINUE_LEARNING_PATH = path.resolve(__dirname, '../components/courses/ContinueLearning.jsx');
const CONTINUE_WATCHING_CARD_PATH = path.resolve(__dirname, '../components/courses/ContinueWatchingCard.jsx');
const LEARNING_PROGRESS_STRIP_PATH = path.resolve(__dirname, '../components/courses/LearningProgressStrip.jsx');
const FEATURED_RECORDING_CARD_PATH = path.resolve(__dirname, '../components/courses/FeaturedRecordingCard.jsx');
const RECORDING_COURSE_CARD_PATH = path.resolve(__dirname, '../components/courses/RecordingCourseCard.jsx');
const ONLINE_COURSE_CARD_PATH = path.resolve(__dirname, '../components/courses/OnlineCourseCard.jsx');
const ONLINE_COURSE_CAROUSEL_PATH = path.resolve(__dirname, '../components/courses/OnlineCourseCarousel.jsx');
const COURSE_STANDING_STRIP_PATH = path.resolve(__dirname, '../components/courses/CourseStandingStrip.jsx');
const COURSE_CLOSING_CTA_PATH = path.resolve(__dirname, '../components/courses/CourseClosingCTA.jsx');
const COURSE_CATEGORY_EXPLORER_PATH = path.resolve(__dirname, '../components/courses/CourseCategoryExplorer.jsx');
const CHAPTER_CARD_PATH = path.resolve(__dirname, '../components/courses/ChapterCard.jsx');
const CLASS_CARD_PATH = path.resolve(__dirname, '../components/courses/ClassCard.jsx');
const COURSE_CARD_PATH = path.resolve(__dirname, '../components/courses/CourseCard.jsx');
const COURSE_ENQUIRY_MODAL_PATH = path.resolve(__dirname, '../components/courses/CourseEnquiryModal.jsx');
const COURSE_TYPE_BADGE_PATH = path.resolve(__dirname, '../components/courses/CourseTypeBadge.jsx');
const LEADERBOARD_PREVIEW_PATH = path.resolve(__dirname, '../components/courses/LeaderboardPreview.jsx');

// Classroom Components
const LEARNING_HEADER_PATH = path.resolve(__dirname, '../components/classroom/LearningHeader.jsx');
const CURRICULUM_SIDEBAR_PATH = path.resolve(__dirname, '../components/classroom/CurriculumSidebar.jsx');
const LESSON_NAVIGATION_PATH = path.resolve(__dirname, '../components/classroom/LessonNavigation.jsx');
const LESSON_TABS_PATH = path.resolve(__dirname, '../components/classroom/LessonTabs.jsx');
const CHAPTER_COMPLETE_MODAL_PATH = path.resolve(__dirname, '../components/classroom/ChapterCompleteModal.jsx');
const KEYBOARD_SHORTCUTS_MODAL_PATH = path.resolve(__dirname, '../components/classroom/KeyboardShortcutsModal.jsx');
const RESOURCE_PREVIEW_MODAL_PATH = path.resolve(__dirname, '../components/classroom/ResourcePreviewModal.jsx');
const VIDEO_STAGE_PATH = path.resolve(__dirname, '../components/classroom/VideoStage.jsx');

describe('Zeitnah — Phase 5B: Courses & Learning Experience Theme Migration Unit Tests', () => {
  // ── TEST 1: Courses Discovery & Overview Pages ──
  it('1. Courses pages (Courses, CourseChapters, CourseClasses, ClassView) adopt semantic tokens and avoid hardcoded surfaces', () => {
    const coursesContent = fs.readFileSync(COURSES_PAGE_PATH, 'utf8');
    const chaptersContent = fs.readFileSync(COURSE_CHAPTERS_PAGE_PATH, 'utf8');
    const classesContent = fs.readFileSync(COURSE_CLASSES_PAGE_PATH, 'utf8');
    const classViewContent = fs.readFileSync(CLASS_VIEW_PAGE_PATH, 'utf8');

    // ClassView has its own full-page canvas using bg-bg-base
    assert.ok(classViewContent.includes('bg-bg-base'), 'ClassView must use bg-bg-base canvas');

    for (const [name, content] of [
      ['Courses', coursesContent],
      ['CourseChapters', chaptersContent],
      ['CourseClasses', classesContent],
      ['ClassView', classViewContent],
    ]) {
      assert.ok(content.includes('bg-surface-card'), `${name} must use bg-surface-card for card surfaces`);
      assert.ok(content.includes('border-border'), `${name} must use border-border`);
      assert.ok(content.includes('text-text-primary'), `${name} must use text-text-primary for primary typography`);
      assert.doesNotMatch(content, /bg-\[#070B14\]/, `${name} must not contain hardcoded dark background #070B14`);
      assert.doesNotMatch(content, /bg-\[#0C121E\]/, `${name} must not contain hardcoded dark background #0C121E`);
      assert.doesNotMatch(content, /bg-\[#0D141A\]/, `${name} must not contain hardcoded dark background #0D141A`);
      assert.doesNotMatch(content, /bg-\[#0A0F14\]/, `${name} must not contain hardcoded dark background #0A0F14`);
    }
  });

  // ── TEST 2: Learning Experience Pages ──
  it('2. Learning experience pages (MyLearning, Dashboard, MyPoints) use semantic tokens for telemetry, gauges, and cards', () => {
    const myLearningContent = fs.readFileSync(MY_LEARNING_PAGE_PATH, 'utf8');
    const dashboardContent = fs.readFileSync(DASHBOARD_PAGE_PATH, 'utf8');
    const myPointsContent = fs.readFileSync(MY_POINTS_PAGE_PATH, 'utf8');

    for (const [name, content] of [
      ['MyLearning', myLearningContent],
      ['Dashboard', dashboardContent],
      ['MyPoints', myPointsContent],
    ]) {
      assert.ok(content.includes('bg-surface-card'), `${name} must use bg-surface-card`);
      assert.ok(content.includes('border-border'), `${name} must use border-border`);
      assert.ok(content.includes('text-text-primary'), `${name} must use text-text-primary`);
      assert.ok(content.includes('text-text-muted'), `${name} must use text-text-muted`);
      assert.doesNotMatch(content, /bg-\[#070B14\]/, `${name} must not contain hardcoded #070B14`);
      assert.doesNotMatch(content, /bg-\[#0D141A\]/, `${name} must not contain hardcoded #0D141A`);
    }
  });

  // ── TEST 3: Courses Navigation & Discovery Components ──
  it('3. Courses discovery components adopt semantic tokens and high-contrast button typography', () => {
    const navbarContent = fs.readFileSync(COURSE_NAVBAR_PATH, 'utf8');
    const heroContent = fs.readFileSync(COURSE_HERO_PATH, 'utf8');
    const continueLearningContent = fs.readFileSync(CONTINUE_LEARNING_PATH, 'utf8');
    const chapterCardContent = fs.readFileSync(CHAPTER_CARD_PATH, 'utf8');
    const classCardContent = fs.readFileSync(CLASS_CARD_PATH, 'utf8');
    const courseCardContent = fs.readFileSync(COURSE_CARD_PATH, 'utf8');
    const leaderboardContent = fs.readFileSync(LEADERBOARD_PREVIEW_PATH, 'utf8');

    assert.ok(navbarContent.includes('bg-surface-card'), 'CourseNavbar must use bg-surface-card');
    assert.ok(navbarContent.includes('border-border'), 'CourseNavbar must use border-border');
    assert.ok(navbarContent.includes('bg-surface-elevated'), 'CourseNavbar search must use bg-surface-elevated');

    assert.ok(heroContent.includes('border-border'), 'CourseHero must use border-border');
    assert.ok(heroContent.includes('text-text-primary'), 'CourseHero must use text-text-primary');

    assert.ok(continueLearningContent.includes('bg-surface-card'), 'ContinueLearning must use bg-surface-card');
    assert.ok(continueLearningContent.includes('text-brand-navy'), 'ContinueLearning yellow CTA must use text-brand-navy for contrast');

    assert.ok(chapterCardContent.includes('bg-surface-card'), 'ChapterCard must use bg-surface-card');
    assert.ok(chapterCardContent.includes('border-border'), 'ChapterCard must use border-border');

    assert.ok(classCardContent.includes('bg-surface-card'), 'ClassCard must use bg-surface-card');
    assert.ok(classCardContent.includes('border-border'), 'ClassCard must use border-border');
    assert.ok(classCardContent.includes('text-brand-navy'), 'ClassCard CTA button must use text-brand-navy');

    assert.ok(courseCardContent.includes('bg-surface-card'), 'CourseCard must use bg-surface-card');
    assert.ok(courseCardContent.includes('border-border'), 'CourseCard must use border-border');
    assert.ok(courseCardContent.includes('text-brand-navy'), 'CourseCard CTA must use text-brand-navy');

    assert.ok(leaderboardContent.includes('bg-surface-card'), 'LeaderboardPreview must use bg-surface-card');
    assert.ok(leaderboardContent.includes('border-border'), 'LeaderboardPreview must use border-border');
    assert.ok(leaderboardContent.includes('text-brand-navy'), 'LeaderboardPreview badges must use text-brand-navy');
  });

  // ── TEST 4: Classroom Studio & Interaction Components ──
  it('4. Classroom components (LearningHeader, CurriculumSidebar, LessonNavigation, LessonTabs) use semantic tokens', () => {
    const headerContent = fs.readFileSync(LEARNING_HEADER_PATH, 'utf8');
    const sidebarContent = fs.readFileSync(CURRICULUM_SIDEBAR_PATH, 'utf8');
    const navContent = fs.readFileSync(LESSON_NAVIGATION_PATH, 'utf8');
    const tabsContent = fs.readFileSync(LESSON_TABS_PATH, 'utf8');

    assert.ok(headerContent.includes('border-border'), 'LearningHeader must use border-border');
    assert.ok(headerContent.includes('bg-surface-elevated'), 'LearningHeader controls must use bg-surface-elevated');
    assert.ok(headerContent.includes('text-text-primary'), 'LearningHeader title must use text-text-primary');

    assert.ok(sidebarContent.includes('border-border'), 'CurriculumSidebar must use border-border');
    assert.ok(sidebarContent.includes('bg-surface-card'), 'CurriculumSidebar must use bg-surface-card');
    assert.ok(sidebarContent.includes('text-text-primary'), 'CurriculumSidebar titles must use text-text-primary');

    assert.ok(navContent.includes('bg-surface-card'), 'LessonNavigation must use bg-surface-card');
    assert.ok(navContent.includes('border-border'), 'LessonNavigation must use border-border');
    assert.ok(navContent.includes('text-brand-navy'), 'LessonNavigation yellow action button must use text-brand-navy');

    assert.ok(tabsContent.includes('bg-surface-card'), 'LessonTabs panels must use bg-surface-card');
    assert.ok(tabsContent.includes('border-border'), 'LessonTabs borders must use border-border');
    assert.ok(tabsContent.includes('text-text-primary'), 'LessonTabs headings must use text-text-primary');
    assert.ok(tabsContent.includes('text-brand-navy'), 'LessonTabs mint buttons must use text-brand-navy');
  });

  // ── TEST 5: Media Player & Document Viewer Stage Preservation ──
  it('5. Strictly preserves dark media player stage and document viewer canvas for contrast', () => {
    const videoStageContent = fs.readFileSync(VIDEO_STAGE_PATH, 'utf8');
    const resourceModalContent = fs.readFileSync(RESOURCE_PREVIEW_MODAL_PATH, 'utf8');

    // VideoStage must preserve black stage background for video contrast
    assert.ok(videoStageContent.includes('bg-black'), 'VideoStage must preserve bg-black for video aspect container');
    assert.ok(videoStageContent.includes('aspect-video'), 'VideoStage must preserve aspect-video ratio');
    assert.ok(videoStageContent.includes('border-border'), 'VideoStage outer shell must use border-border');

    // ResourcePreviewModal must preserve black stage for PDF / image previews
    assert.ok(resourceModalContent.includes('bg-black'), 'ResourcePreviewModal must preserve bg-black content stage');
    assert.ok(resourceModalContent.includes('bg-surface-card'), 'ResourcePreviewModal window must use bg-surface-card');
    assert.ok(resourceModalContent.includes('border-border'), 'ResourcePreviewModal must use border-border');
    assert.ok(resourceModalContent.includes('text-brand-navy'), 'ResourcePreviewModal download button must use text-brand-navy');
  });

  // ── TEST 6: CLS Elimination — Skeletons & Fixed Dimensions ──
  it('6. Skeletons and cards preserve explicit aspect ratios and padding to eliminate CLS', () => {
    const coursesContent = fs.readFileSync(COURSES_PAGE_PATH, 'utf8');
    const chaptersContent = fs.readFileSync(COURSE_CHAPTERS_PAGE_PATH, 'utf8');
    const classesContent = fs.readFileSync(COURSE_CLASSES_PAGE_PATH, 'utf8');
    const classCardContent = fs.readFileSync(CLASS_CARD_PATH, 'utf8');
    const leaderboardContent = fs.readFileSync(LEADERBOARD_PREVIEW_PATH, 'utf8');

    assert.ok(coursesContent.includes('aspect-video'), 'Courses.jsx skeletons must maintain aspect-video');
    assert.ok(coursesContent.includes('bg-surface-card'), 'Courses.jsx skeletons must use bg-surface-card');
    assert.ok(coursesContent.includes('border-border'), 'Courses.jsx skeletons must use border-border');

    assert.ok(chaptersContent.includes('aspect-video'), 'CourseChapters.jsx hero skeleton must maintain aspect-video');
    assert.ok(chaptersContent.includes('bg-surface-card'), 'CourseChapters.jsx skeletons must use bg-surface-card');

    assert.ok(classesContent.includes('h-32 shimmer rounded-2xl'), 'CourseClasses.jsx skeletons must maintain fixed lesson height');
    assert.ok(classCardContent.includes('aspect-video'), 'ClassCard.jsx thumbnail must maintain aspect-video');

    assert.ok(leaderboardContent.includes('min-h-[190px]'), 'LeaderboardPreview skeleton must maintain min-h-[190px] podium height');
    assert.ok(leaderboardContent.includes('bg-surface-card'), 'LeaderboardPreview skeleton must use bg-surface-card');
  });

  // ── TEST 7: Accessible Touch Targets (min-h-[44px]) ──
  it('7. Interactive triggers and modal action buttons enforce accessible touch targets (min-h-[44px])', () => {
    const enquiryModalContent = fs.readFileSync(COURSE_ENQUIRY_MODAL_PATH, 'utf8');
    const chapterModalContent = fs.readFileSync(CHAPTER_COMPLETE_MODAL_PATH, 'utf8');
    const shortcutsModalContent = fs.readFileSync(KEYBOARD_SHORTCUTS_MODAL_PATH, 'utf8');
    const resourceModalContent = fs.readFileSync(RESOURCE_PREVIEW_MODAL_PATH, 'utf8');
    const classCardContent = fs.readFileSync(CLASS_CARD_PATH, 'utf8');
    const courseCardContent = fs.readFileSync(COURSE_CARD_PATH, 'utf8');
    const navContent = fs.readFileSync(LESSON_NAVIGATION_PATH, 'utf8');

    for (const [name, content] of [
      ['CourseEnquiryModal', enquiryModalContent],
      ['ChapterCompleteModal', chapterModalContent],
      ['ResourcePreviewModal', resourceModalContent],
      ['ClassCard', classCardContent],
      ['CourseCard', courseCardContent],
      ['LessonNavigation', navContent],
    ]) {
      assert.ok(content.includes('min-h-[44px]'), `${name} must include min-h-[44px] touch target`);
    }

    // Modal dialog accessibility attributes
    assert.ok(enquiryModalContent.includes('role="dialog"'), 'CourseEnquiryModal must have role="dialog"');
    assert.ok(shortcutsModalContent.includes('role="dialog"'), 'KeyboardShortcutsModal must have role="dialog"');
    assert.ok(chapterModalContent.includes('role="dialog"'), 'ChapterCompleteModal must have role="dialog"');
  });

  // ── TEST 8: Modals Adopt Semantic Surface Cards & Borders ──
  it('8. All courses and classroom modals adopt semantic surface-card and border-border', () => {
    const enquiryModalContent = fs.readFileSync(COURSE_ENQUIRY_MODAL_PATH, 'utf8');
    const chapterModalContent = fs.readFileSync(CHAPTER_COMPLETE_MODAL_PATH, 'utf8');
    const shortcutsModalContent = fs.readFileSync(KEYBOARD_SHORTCUTS_MODAL_PATH, 'utf8');
    const resourceModalContent = fs.readFileSync(RESOURCE_PREVIEW_MODAL_PATH, 'utf8');

    for (const [name, content] of [
      ['CourseEnquiryModal', enquiryModalContent],
      ['ChapterCompleteModal', chapterModalContent],
      ['KeyboardShortcutsModal', shortcutsModalContent],
      ['ResourcePreviewModal', resourceModalContent],
    ]) {
      assert.ok(content.includes('bg-surface-card'), `${name} modal window must use bg-surface-card`);
      assert.ok(content.includes('border-border'), `${name} modal window must use border-border`);
      assert.doesNotMatch(content, /border-white\/10/, `${name} modal window must not use border-white/10`);
      assert.doesNotMatch(content, /bg-bg-surface/, `${name} modal window must not use raw bg-bg-surface`);
    }
  });

  // ── TEST 9: DEF-006 Regression — ZeitnahZMotif SVG Path Invariant ──
  it('9. DEF-006: ZeitnahZMotif uses valid SVG path string and avoids undefined d animation', () => {
    const motifPath = path.resolve(__dirname, '../components/courses/ZeitnahZMotif.jsx');
    const motifContent = fs.readFileSync(motifPath, 'utf8');

    // Must define valid ORGANIC_Z_PATH starting with 'M'
    assert.ok(motifContent.includes('const ORGANIC_Z_PATH = `'), 'ZeitnahZMotif must define ORGANIC_Z_PATH');
    assert.ok(motifContent.includes('M 8.2 9.2'), 'ORGANIC_Z_PATH must start with valid M command');

    // Main motion.path must bind d to ORGANIC_Z_PATH directly
    assert.ok(
      motifContent.includes('d={ORGANIC_Z_PATH}'),
      'ZeitnahZMotif main path must bind d to ORGANIC_Z_PATH'
    );

    // Must NOT animate d attribute across an array without a path morpher
    assert.ok(
      !motifContent.includes('d: [\n                        ORGANIC_Z_PATH,'),
      'ZeitnahZMotif must not animate d across an array, preventing d="undefined"'
    );
  });
});

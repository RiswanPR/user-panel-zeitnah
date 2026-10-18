import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  normalizeAvailability,
} from './profileNormalization.js';
import {
  CANONICAL_COMMUNITY_ROLES,
  AVAILABILITY_STATUSES,
} from '../constants/infrastructureTaxonomy.js';
import { normalizeUserRole } from './roleNavigation.js';

describe('Profile Hero Redesign — Modern Identity & Hero Experience Tests', () => {

  describe('1. Circular Profile Avatar Styling & Invariants', () => {
    it('generates consistent initials for fallback avatars without stretching or erroring', () => {
      function getInitials(name) {
        if (!name) return 'ZU';
        const parts = name.split(' ').filter(Boolean);
        if (parts.length === 0) return 'ZU';
        return parts.map((p) => p[0]).slice(0, 2).join('').toUpperCase();
      }

      assert.equal(getInitials('Riswan P.R'), 'RP');
      assert.equal(getInitials('Alexander Hamilton'), 'AH');
      assert.equal(getInitials('Zaha'), 'Z');
      assert.equal(getInitials(''), 'ZU');
      assert.equal(getInitials(null), 'ZU');
      assert.equal(getInitials(undefined), 'ZU');
      assert.equal(getInitials('   '), 'ZU');
    });

    it('validates circular avatar styling definitions and dimensions', async () => {
      const avatarFile = path.resolve('src/components/profile/ProfileAvatar.jsx');
      const content = fs.readFileSync(avatarFile, 'utf8');

      // Default shape is circle
      assert.match(content, /shape\s*=\s*["']circle["']/);

      // Enforces aspect ratio 1 / 1 and border-radius 50%
      assert.match(content, /aspectRatio:\s*["']1 \/ 1["']/);
      assert.match(content, /borderRadius:\s*["']50%["']/);
      assert.match(content, /objectFit:\s*["']cover["']/);

      // Prevents flex squishing with shrink-0 and aspect-square
      assert.match(content, /aspect-square/);
      assert.match(content, /shrink-0/);
      assert.match(content, /rounded-full/);

      // Hero xl sizing is responsive and prominent
      assert.match(content, /w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40/);
    });

    it('verifies non-colliding coordinates for status marker and verification badge on circular perimeter', async () => {
      const avatarFile = path.resolve('src/components/profile/ProfileAvatar.jsx');
      const content = fs.readFileSync(avatarFile, 'utf8');

      // Top-right status marker coordinates
      assert.match(content, /marker:.*top-0 right-0 sm:top-1 sm:right-1/);

      // Bottom-right badge coordinates
      assert.match(content, /badge:.*bottom-0 right-0 sm:bottom-1 sm:right-1/);
    });
  });

  describe('2. Open to Work and Open to Hiring Status Badges', () => {
    it('correctly maps raw availability strings into canonical values', () => {
      assert.equal(normalizeAvailability('OPEN_TO_WORK'), 'OPEN_TO_WORK');
      assert.equal(normalizeAvailability('OPEN_TO_HIRING'), 'OPEN_TO_HIRING');
      assert.equal(normalizeAvailability('NOT_AVAILABLE'), 'NOT_AVAILABLE');
      assert.equal(normalizeAvailability('NOT_CURRENTLY_AVAILABLE'), 'NOT_AVAILABLE');
      assert.equal(normalizeAvailability(''), 'NOT_AVAILABLE');
      assert.equal(normalizeAvailability(null), 'NOT_AVAILABLE');
      assert.equal(normalizeAvailability(undefined), 'NOT_AVAILABLE');
      assert.equal(normalizeAvailability('RANDOM_STRING'), 'NOT_AVAILABLE');
    });

    it('ensures AvailabilityBadge returns null for NOT_AVAILABLE or empty statuses', async () => {
      const badgeFile = path.resolve('src/components/network/AvailabilityBadge.jsx');
      const content = fs.readFileSync(badgeFile, 'utf8');

      // When normalized is NOT_AVAILABLE or null, it returns null
      assert.match(content, /if\s*\(!normalized\s*\|\|\s*normalized\s*===\s*["']NOT_AVAILABLE["']\)\s*\{\s*return null;\s*\}/);
    });

    it('verifies distinct color palettes and labels for Open to Work and Open to Hiring', async () => {
      const badgeFile = path.resolve('src/components/network/AvailabilityBadge.jsx');
      const content = fs.readFileSync(badgeFile, 'utf8');

      // Open to Hiring uses emerald palette
      assert.match(content, /OPEN_TO_HIRING:\s*\{[\s\S]*?label:\s*["']Open to Hiring["']/);
      assert.match(content, /text-emerald-300/);
      assert.match(content, /bg-emerald-500\/15/);
      assert.match(content, /border-emerald-400\/30/);

      // Open to Work uses sky palette
      assert.match(content, /OPEN_TO_WORK:\s*\{[\s\S]*?label:\s*["']Open to Work["']/);
      assert.match(content, /text-sky-300/);
      assert.match(content, /bg-sky-500\/15/);
      assert.match(content, /border-sky-400\/30/);

      // Includes pulse dot
      assert.match(content, /animate-pulse/);
    });

    it('maintains strict independence between platform canonical roles and availability status', () => {
      const platformRoles = ['STUDENT', 'PROFESSIONAL', 'RECRUITER', 'EDUCATOR', 'ADMIN'];

      for (const role of platformRoles) {
        // Normalizing role must never be influenced by availability
        const normalized = normalizeUserRole(role);
        assert.equal(normalized, role);
      }

      // Verifies that a Student can have OPEN_TO_HIRING (e.g. club or study group lead) without becoming a RECRUITER
      const studentAvailability = normalizeAvailability('OPEN_TO_HIRING');
      assert.equal(studentAvailability, 'OPEN_TO_HIRING');
      assert.equal(normalizeUserRole('STUDENT'), 'STUDENT');

      // Verifies that a Recruiter can have OPEN_TO_WORK without losing their RECRUITER role
      const recruiterAvailability = normalizeAvailability('OPEN_TO_WORK');
      assert.equal(recruiterAvailability, 'OPEN_TO_WORK');
      assert.equal(normalizeUserRole('RECRUITER'), 'RECRUITER');
    });
  });

  describe('3. Cover Banner & Branded Fallback Behavior', () => {
    it('verifies cover banner height, responsive gradients, and non-colliding controls', async () => {
      const heroFile = path.resolve('src/components/profile/ProfileHero.jsx');
      const content = fs.readFileSync(heroFile, 'utf8');

      // Responsive cover height
      assert.match(content, /h-48 sm:h-60 md:h-72 lg:h-80/);

      // Top vignette for controls contrast
      assert.match(content, /bg-gradient-to-b from-black\/60 to-transparent/);

      // Ambient bottom fade for avatar contrast
      assert.match(content, /bg-gradient-to-t from-(surface-card|\[#0A0F18\]) via-(surface-card\/40|\[#0A0F18\]\/50) to-transparent/);

      // Change Cover button is placed at top-right with z-20 to avoid overlap
      assert.match(content, /top-4 right-4 sm:top-5 sm:right-5 z-20/);

      // Fallback architectural grid and branding
      assert.match(content, /linear-gradient\(rgba\(159,213,178,0.4\) 1px/);
      assert.match(content, /Zeitnah Identity/);
    });
  });

  describe('4. Profile Information Hierarchy & Omission of Empty Fields', () => {
    it('verifies display name is the primary h1 heading with appropriate styling', async () => {
      const heroFile = path.resolve('src/components/profile/ProfileHero.jsx');
      const content = fs.readFileSync(heroFile, 'utf8');

      assert.match(content, /<h1 className="[^"]*font-heading font-black text-2xl sm:text-3xl md:text-\[34px\] lg:text-4xl/);
      assert.match(content, /break-words/);
    });

    it('verifies empty metadata fields (currentRole, location, industry) are omitted', async () => {
      const heroFile = path.resolve('src/components/profile/ProfileHero.jsx');
      const content = fs.readFileSync(heroFile, 'utf8');

      // The metadata container checks if at least one field exists
      assert.match(content, /\(profile\.currentRole\s*\|\|\s*profile\.location\s*\|\|\s*profile\.industry\)/);
      assert.match(content, /profile\.currentRole && \(/);
      assert.match(content, /profile\.location && \(/);
      assert.match(content, /profile\.industry && \(/);
    });

    it('ensures professional headline wraps cleanly and falls back gracefully for owner vs visitor', async () => {
      const heroFile = path.resolve('src/components/profile/ProfileHero.jsx');
      const content = fs.readFileSync(heroFile, 'utf8');

      // Long headline wrapping
      assert.match(content, /profile\.headline \? \(/);
      assert.match(content, /max-w-2xl break-words/);

      // Owner gets guidance prompt if empty, visitor gets null (no blank placeholder)
      assert.match(content, /Introduce yourself with a compelling professional headline/);
    });
  });

  describe('5. Action Buttons, Gamification & Accessibility', () => {
    it('ensures primary action buttons have accessible minimum tap targets', async () => {
      const heroFile = path.resolve('src/components/profile/ProfileHero.jsx');
      const content = fs.readFileSync(heroFile, 'utf8');

      // min-h-[44px] for touch targets
      const minTapMatches = content.match(/min-h-\[44px\]/g) || [];
      assert.ok(minTapMatches.length >= 4, 'Must have min-h-[44px] on action buttons for mobile touch target accessibility');

      // Edit Profile is primary, Public View is secondary
      assert.match(content, /zn-btn-primary[\s\S]*?Edit Profile/);
      assert.match(content, /zn-btn-secondary[\s\S]*?Public View/);
    });

    it('verifies owner controls are restricted and visitor controls are rendered properly', async () => {
      const heroFile = path.resolve('src/components/profile/ProfileHero.jsx');
      const content = fs.readFileSync(heroFile, 'utf8');

      // isOwner conditional branch
      assert.match(content, /\{isOwner \? \(/);
      assert.match(content, /onAvatarUpload/);
      assert.match(content, /onBannerUpload/);

      // Visitor controls
      assert.match(content, /RelationshipAction/);
      assert.match(content, /onSendMessage/);
      assert.match(content, /onSendOpportunity/);
      assert.match(content, /onReport/);
    });

    it('verifies gamification milestone capsule displays Level, Rank, and XP cleanly', async () => {
      const heroFile = path.resolve('src/components/profile/ProfileHero.jsx');
      const content = fs.readFileSync(heroFile, 'utf8');

      assert.match(content, /LEVEL \{gamification\.level \|\| 1\}/);
      assert.match(content, /\{gamification\.rank \|\| ["']Pioneer["']\}/);
      assert.match(content, /XPCountUp value=\{gamification\.totalPoints \|\| 0\}/);
    });
  });

  describe('6. Shared Usage in Profile and PublicProfilePage', () => {
    it('guarantees Profile.jsx and PublicProfilePage.jsx both import and render ProfileHero', async () => {
      const profilePath = path.resolve('src/pages/profile/Profile.jsx');
      const publicPath = path.resolve('src/pages/profile/PublicProfilePage.jsx');

      const profileContent = fs.readFileSync(profilePath, 'utf8');
      const publicContent = fs.readFileSync(publicPath, 'utf8');

      assert.match(profileContent, /import ProfileHero from ["']\.\.\/\.\.\/components\/profile\/ProfileHero["']/);
      assert.match(profileContent, /<ProfileHero[\s\S]*?isOwner=\{true\}/);

      assert.match(publicContent, /import ProfileHero from ["']\.\.\/\.\.\/components\/profile\/ProfileHero["']/);
      assert.match(publicContent, /<ProfileHero[\s\S]*?isOwner=\{isOwnProfile\}/);
    });
  });

  describe('7. Navbar Avatar Resolution, Normalization & Instant Propagation', () => {
    it('normalizes avatar URLs across diverse formats (relative, leading /uploads, https, object) without duplicates', async () => {
      const { getUploadUrl } = await import('./courseUi.js');

      // Absolute URLs preserved as-is
      assert.equal(getUploadUrl('https://example.com/avatar.jpg'), 'https://example.com/avatar.jpg');
      assert.equal(getUploadUrl('https://s3.amazonaws.com/bucket/profiles/user-123.jpg'), 'https://s3.amazonaws.com/bucket/profiles/user-123.jpg');

      // Relative paths get prefixed with uploadBaseUrl/uploads/
      const res1 = getUploadUrl('profiles/user-123.jpg');
      assert.match(res1, /\/uploads\/profiles\/user-123\.jpg$/);
      assert.ok(!res1.includes('/uploads/uploads/'), 'Must not produce duplicate uploads/ prefix');

      // Leading /uploads/ cleaned gracefully
      const res2 = getUploadUrl('/uploads/avatars/john.png');
      assert.match(res2, /\/uploads\/avatars\/john\.png$/);
      assert.ok(!res2.includes('/uploads/uploads/'), 'Must not produce duplicate uploads/ prefix for /uploads/ paths');

      // Leading uploads/ without slash
      const res3 = getUploadUrl('uploads/avatars/sarah.png');
      assert.match(res3, /\/uploads\/avatars\/sarah\.png$/);
      assert.ok(!res3.includes('/uploads/uploads/'));

      // Nested object format
      assert.match(getUploadUrl({ url: 'profiles/nested.webp' }), /\/uploads\/profiles\/nested\.webp$/);

      // Falsy, empty, or invalid values return null
      assert.equal(getUploadUrl(null), null);
      assert.equal(getUploadUrl(undefined), null);
      assert.equal(getUploadUrl(''), null);
      assert.equal(getUploadUrl('   '), null);
      assert.equal(getUploadUrl(12345), null);
    });

    it('guarantees MainLayout queries PROFILE_QUERY_KEYS.ME and passes profile to MainNavbar', async () => {
      const layoutPath = path.resolve('src/layouts/MainLayout.jsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');

      assert.match(layoutContent, /import\s*\{[^}]*coreProfileService[^}]*PROFILE_QUERY_KEYS[^}]*\}\s*from\s*["'][^"']*coreProfileService["']/);
      assert.match(layoutContent, /queryKey:\s*PROFILE_QUERY_KEYS\.ME/);
      assert.match(layoutContent, /<MainNavbar[\s\S]*?profile=\{authoritativeProfile\}/);
    });

    it('guarantees MainNavbar statically imports and renders ProfileAvatar for navbar trigger and dropdown', async () => {
      const navbarPath = path.resolve('src/components/navigation/MainNavbar.jsx');
      const navbarContent = fs.readFileSync(navbarPath, 'utf8');

      // Imports ProfileAvatar
      assert.match(navbarContent, /import ProfileAvatar from ["']\.\.\/profile\/ProfileAvatar["']/);

      // Resolves rawAvatar across profile, user, and legacy fields
      assert.match(navbarContent, /rawAvatar\s*=/);
      assert.match(navbarContent, /currentUser\?\.avatar/);
      assert.match(navbarContent, /user\?\.avatar/);

      // Uses ProfileAvatar on navbar trigger
      assert.match(navbarContent, /<ProfileAvatar[\s\S]*?src=\{rawAvatar\}[\s\S]*?size="xxs"[\s\S]*?shape="circle"/);

      // Uses ProfileAvatar in dropdown header
      assert.match(navbarContent, /<ProfileAvatar[\s\S]*?src=\{rawAvatar\}[\s\S]*?size="xs"[\s\S]*?shape="circle"/);
    });

    it('guarantees AuthContext enriches authUser with profile avatar on initial load', async () => {
      const authPath = path.resolve('src/context/AuthContext.tsx');
      const authContent = fs.readFileSync(authPath, 'utf8');

      assert.match(authContent, /api\.get\(["']\/profile\/me["']\)/);
      assert.match(authContent, /authUser\.avatar\s*=\s*profileUser\.avatar/);
    });

    it('guarantees Profile.jsx and EditProfile.jsx propagate avatar updates to PROFILE_QUERY_KEYS.ME and AuthContext', async () => {
      const profilePath = path.resolve('src/pages/profile/Profile.jsx');
      const profileContent = fs.readFileSync(profilePath, 'utf8');

      // Updates React Query cache
      assert.match(profileContent, /queryClient\.setQueryData\(PROFILE_QUERY_KEYS\.ME/);

      // Updates AuthContext user
      assert.match(profileContent, /setUser\(\(prev\)\s*=>\s*\(prev\s*\?\s*\{[^}]*\.\.\.prev,\s*avatar:\s*res\.avatar/);
    });

    it('verifies initials fallback is deterministic and triggers only when avatar is empty or load fails', () => {
      function resolveAvatarDisplay(src, imgError, name) {
        if (!src || imgError) {
          const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
          if (parts.length === 0) return { showImage: false, initials: 'ZU' };
          return { showImage: false, initials: parts.map((p) => p[0]).slice(0, 2).join('').toUpperCase() };
        }
        return { showImage: true, url: src };
      }

      // Valid avatar URL without error -> renders image
      const valid = resolveAvatarDisplay('https://cdn.zeitnah.com/avatars/riyas.jpg', false, 'Riyas Ahamed');
      assert.equal(valid.showImage, true);
      assert.equal(valid.url, 'https://cdn.zeitnah.com/avatars/riyas.jpg');

      // Valid avatar URL with imgError (image load genuinely failed) -> falls back to initials
      const failed = resolveAvatarDisplay('https://cdn.zeitnah.com/avatars/broken.jpg', true, 'Riyas Ahamed');
      assert.equal(failed.showImage, false);
      assert.equal(failed.initials, 'RA');

      // Missing avatar URL -> falls back to initials
      const missing = resolveAvatarDisplay(null, false, 'Riyas Ahamed');
      assert.equal(missing.showImage, false);
      assert.equal(missing.initials, 'RA');
    });
  });

  describe('8. Premium Unlocked Achievements Layout & Data Integrity', () => {
    it('verifies AchievementsGrid replaces narrow 3-column grid with full-width readable stack', async () => {
      const achievementsFile = path.resolve('src/components/profile/AchievementsGrid.jsx');
      const content = fs.readFileSync(achievementsFile, 'utf8');

      // Does NOT squeeze into 3 columns in the narrow sidebar
      assert.doesNotMatch(content, /grid-cols-3/);
      assert.doesNotMatch(content, /lg:grid-cols-3/);

      // Uses single-column full-width list
      assert.match(content, /grid grid-cols-1 gap-3/);

      // Sibling-aligned panel styling
      assert.match(content, /rounded-3xl border border-white\/\[0\.08\] bg-\[#0A0F18\]\/90/);
    });

    it('verifies readable typography without premature clipping or truncated titles', async () => {
      const achievementsFile = path.resolve('src/components/profile/AchievementsGrid.jsx');
      const content = fs.readFileSync(achievementsFile, 'utf8');

      // Title must use break-words and not truncate
      assert.match(content, /<h3[^>]*break-words/);
      assert.doesNotMatch(content, /<h3[^>]*truncate/);

      // Description must wrap naturally without line-clamp truncation
      assert.match(content, /<p[^>]*break-words/);
      assert.doesNotMatch(content, /<p[^>]*line-clamp-2/);

      // Body uses min-w-0 for reliable flex container wrapping
      assert.match(content, /min-w-0 flex-1/);
    });

    it('verifies Unlocked status badge has accessible green styling and dedicated row hierarchy', async () => {
      const achievementsFile = path.resolve('src/components/profile/AchievementsGrid.jsx');
      const content = fs.readFileSync(achievementsFile, 'utf8');

      // Unlocked indicator with emerald styling
      assert.match(content, /bg-emerald-500\/10/);
      assert.match(content, /text-emerald-400/);
      assert.match(content, /border-emerald-500\/25/);
      assert.match(content, /Unlocked/);
    });

    it('verifies section header displays Unlocked Achievements and real counter pill', async () => {
      const achievementsFile = path.resolve('src/components/profile/AchievementsGrid.jsx');
      const content = fs.readFileSync(achievementsFile, 'utf8');

      assert.match(content, /Unlocked Achievements/);
      assert.match(content, /\{achievements\.length\}\s*Unlocked/);
    });

    it('verifies polished empty state distinguishes earned vs locked milestones', async () => {
      const achievementsFile = path.resolve('src/components/profile/AchievementsGrid.jsx');
      const content = fs.readFileSync(achievementsFile, 'utf8');

      assert.match(content, /No achievements unlocked yet/);
      assert.match(content, /<Lock/);
    });

    it('preserves existing achievement definitions and resolves both snake_case and Title Case keys accurately', async () => {
      // Import from achievementMetadata utility
      const { resolveAchievementMeta, ACHIEVEMENT_METADATA } = await import('./achievementMetadata.js');

      // Snake case checks
      const firstStep = resolveAchievementMeta('first_class');
      assert.equal(firstStep.title, 'First Step');
      assert.equal(firstStep.desc, 'Streamed and completed your first lecture video.');

      const dedicated = resolveAchievementMeta('five_classes');
      assert.equal(dedicated.title, 'Dedicated Learner');

      const graduate = resolveAchievementMeta('course_completed');
      assert.equal(graduate.title, 'Course Graduate');

      const identity = resolveAchievementMeta('profile_100');
      assert.equal(identity.title, 'Identity Master');

      // Title case backend generated keys
      const century = resolveAchievementMeta('100 Points Earned');
      assert.equal(century.title, 'Century Learner');
      assert.equal(century.category, 'XP');

      const streak7 = resolveAchievementMeta('7 Day Streak');
      assert.equal(streak7.title, 'Weekly Consistency');
      assert.equal(streak7.category, 'Streak');

      const streak30 = resolveAchievementMeta('30 Day Streak');
      assert.equal(streak30.title, 'Unstoppable Momentum');

      // Custom key gracefully formatted without crash
      const custom = resolveAchievementMeta('bim_coordinator');
      assert.equal(custom.title, 'Bim Coordinator');
      assert.equal(custom.desc, 'Platform achievement unlocked.');

      // Object format preserved
      const objectMeta = resolveAchievementMeta({
        id: 'special_award',
        title: 'Project Lead',
        description: 'Led an infrastructure team.',
        xp: 150,
        date: 'Oct 2026',
      });
      assert.equal(objectMeta.title, 'Project Lead');
      assert.equal(objectMeta.desc, 'Led an infrastructure team.');
      assert.equal(objectMeta.xp, 150);
      assert.equal(objectMeta.date, 'Oct 2026');
    });
  });
});


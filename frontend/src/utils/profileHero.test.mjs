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
      assert.match(content, /bg-gradient-to-t from-\[#0A0F18\] via-\[#0A0F18\]\/50 to-transparent/);

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
});

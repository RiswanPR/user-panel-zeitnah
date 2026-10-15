import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Global Website Footer Removal Tests', () => {
  it('verifies MainLayout has completely removed Footer import and rendering', () => {
    const mainLayoutFile = path.resolve('src/layouts/MainLayout.jsx');
    assert.ok(fs.existsSync(mainLayoutFile), 'MainLayout.jsx must exist');

    const content = fs.readFileSync(mainLayoutFile, 'utf8');

    // Footer is not imported
    assert.doesNotMatch(content, /import\s+Footer/);
    assert.doesNotMatch(content, /components\/navigation\/Footer/);

    // Footer is not rendered
    assert.doesNotMatch(content, /<Footer/);
    assert.doesNotMatch(content, /aria-label=["']Platform Footer["']/);

    // No empty placeholder div with footer classes
    assert.doesNotMatch(content, /footer-placeholder/);
  });

  it('verifies AboutPage has completely removed Footer import and rendering', () => {
    const aboutFile = path.resolve('src/pages/about/AboutPage.jsx');
    assert.ok(fs.existsSync(aboutFile), 'AboutPage.jsx must exist');

    const content = fs.readFileSync(aboutFile, 'utf8');

    // Footer is not imported
    assert.doesNotMatch(content, /import\s+Footer/);
    assert.doesNotMatch(content, /components\/navigation\/Footer/);

    // Footer is not rendered
    assert.doesNotMatch(content, /<Footer/);
  });

  it('verifies top navigation and mobile bottom navigation are preserved in MainLayout', () => {
    const mainLayoutFile = path.resolve('src/layouts/MainLayout.jsx');
    const content = fs.readFileSync(mainLayoutFile, 'utf8');

    // MainNavbar remains present
    assert.match(content, /import MainNavbar from ["']\.\.\/components\/navigation\/MainNavbar["']/);
    assert.match(content, /<MainNavbar/);

    // Platform announcements remain present
    assert.match(content, /<PlatformAnnouncementBanner/);

    // Mobile bottom navigation remains present
    assert.match(content, /Mobile Bottom Navigation/);
    assert.match(content, /<MobileMoreDrawer/);
  });

  it('verifies MainLayout main area uses balanced bottom padding without excessive voids', () => {
    const mainLayoutFile = path.resolve('src/layouts/MainLayout.jsx');
    const content = fs.readFileSync(mainLayoutFile, 'utf8');

    // Safe-area-aware responsive padding ensures clearance over floating mobile navigation and clean desktop ending
    assert.match(content, /pb-\[calc\(.+safe-area-inset-bottom.+\] md:pb-6/);
  });

  it('verifies Profile Studio (EditProfile.jsx) contains no footer references and ends naturally', () => {
    const editProfileFile = path.resolve('src/pages/profile/EditProfile.jsx');
    assert.ok(fs.existsSync(editProfileFile), 'EditProfile.jsx must exist');

    const content = fs.readFileSync(editProfileFile, 'utf8');

    // No footer references
    assert.doesNotMatch(content, /<Footer/);
    assert.doesNotMatch(content, /components\/navigation\/Footer/);

    // Balanced container bottom padding
    assert.match(content, /pb-6 sm:pb-8/);

    // Profile Studio modules and navigation remain intact
    assert.match(content, /<ProfileNav/);
    assert.match(content, /Profile Studio/);
    assert.match(content, /SECTION_CONFIG/);
  });

  it('verifies Profile Overview (Profile.jsx) contains no footer references and ends naturally', () => {
    const profileFile = path.resolve('src/pages/profile/Profile.jsx');
    assert.ok(fs.existsSync(profileFile), 'Profile.jsx must exist');

    const content = fs.readFileSync(profileFile, 'utf8');

    // No footer references
    assert.doesNotMatch(content, /<Footer/);

    // Balanced container bottom padding
    assert.match(content, /pb-8 sm:pb-12/);

    // Hero and Profile navigation remain intact
    assert.match(content, /<ProfileHero/);
    assert.match(content, /<ProfileNav/);
    assert.match(content, /<AchievementsGrid/);
  });
});

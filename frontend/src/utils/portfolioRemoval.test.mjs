import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Zeitnah — Complete Portfolio Feature Removal Tests', () => {
  it('verifies ProfileNav completely removes Portfolio tab and preserves remaining tabs in correct order', () => {
    const profileNavFile = path.resolve('src/components/profile/ProfileNav.jsx');
    assert.ok(fs.existsSync(profileNavFile), 'ProfileNav.jsx must exist');
    const content = fs.readFileSync(profileNavFile, 'utf8');

    // Portfolio tab removed
    assert.doesNotMatch(content, /\/profile\/portfolio/);
    assert.doesNotMatch(content, /label:\s*["']Portfolio["']/);
    assert.doesNotMatch(content, /Layers/);

    // Remaining profile destinations preserved
    assert.match(content, /path:\s*["']\/profile["']/);
    assert.match(content, /path:\s*["']\/profile\/edit["']/);
    assert.match(content, /path:\s*["']\/public-profile["']/);
    assert.match(content, /path:\s*["']\/my-learning["']/);
    assert.match(content, /path:\s*["']\/my-points["']/);
    assert.match(content, /path:\s*["']\/profile\/account["']/);
  });

  it('verifies App.jsx redirects /profile/portfolio to /profile and public portfolio to user profile', () => {
    const appFile = path.resolve('src/App.jsx');
    const content = fs.readFileSync(appFile, 'utf8');

    // No lazy import of PortfolioPage
    assert.doesNotMatch(content, /lazyWithRetry\(\(\)\s*=>\s*import\(["']\.\/pages\/profile\/PortfolioPage["']\)\)/);

    // Redirects /profile/portfolio to /profile
    assert.match(content, /path=["']\/profile\/portfolio["']\s+element=\{<Navigate to=["']\/profile["'] replace \/>\}/);

    // Redirects /u/:username/portfolio and /profile/u/:username/portfolio to /u/:username
    assert.match(content, /path=["']\/u\/:username\/portfolio["']\s+element=\{<NetworkProfileRedirect \/>\}/);
    assert.match(content, /path=["']\/profile\/u\/:username\/portfolio["']\s+element=\{<NetworkProfileRedirect \/>\}/);
  });

  it('verifies Profile Overview (Profile.jsx) removes Portfolio & Artifacts shortcut card', () => {
    const profileFile = path.resolve('src/pages/profile/Profile.jsx');
    const content = fs.readFileSync(profileFile, 'utf8');

    assert.doesNotMatch(content, /Portfolio & Artifacts/);
    assert.doesNotMatch(content, /Open Portfolio Studio/);
    assert.doesNotMatch(content, /to=["']\/profile\/portfolio["']/);

    // Retains Course Progression and AchievementsGrid
    assert.match(content, /Course Progression/);
    assert.match(content, /<AchievementsGrid/);
  });

  it('verifies PublicProfilePage.jsx removes Portfolio Showcase card and dead links', () => {
    const publicProfileFile = path.resolve('src/pages/profile/PublicProfilePage.jsx');
    const content = fs.readFileSync(publicProfileFile, 'utf8');

    assert.doesNotMatch(content, /Portfolio Showcase/);
    assert.doesNotMatch(content, /View Full Portfolio/);
    assert.doesNotMatch(content, /\/portfolio["']/);
  });

  it('verifies MainNavbar.jsx removes Portfolio from user dropdown and route active check', () => {
    const navbarFile = path.resolve('src/components/navigation/MainNavbar.jsx');
    const content = fs.readFileSync(navbarFile, 'utf8');

    assert.doesNotMatch(content, /to:\s*["']\/profile\/portfolio["']/);
    assert.doesNotMatch(content, /key === ["']portfolio["']/);
  });

  it('verifies MobileMoreDrawer.jsx and roleNavigation.js remove Engineering Portfolio link', () => {
    const moreDrawerFile = path.resolve('src/components/navigation/MobileMoreDrawer.jsx');
    const moreDrawerContent = fs.readFileSync(moreDrawerFile, 'utf8');
    assert.doesNotMatch(moreDrawerContent, /path:\s*["']\/profile\/portfolio["']/);
    assert.doesNotMatch(moreDrawerContent, /Engineering Portfolio/);

    const roleNavFile = path.resolve('src/utils/roleNavigation.js');
    const roleNavContent = fs.readFileSync(roleNavFile, 'utf8');
    assert.doesNotMatch(roleNavContent, /path:\s*["']\/profile\/portfolio["']/);
    assert.doesNotMatch(roleNavContent, /key:\s*["']portfolio["']/);
  });

  it('verifies QuickSearchModal.jsx removes portfolio action item and updates search placeholder', () => {
    const searchFile = path.resolve('src/components/navigation/QuickSearchModal.jsx');
    const content = fs.readFileSync(searchFile, 'utf8');

    assert.doesNotMatch(content, /path:\s*["']\/profile\/portfolio["']/);
    assert.doesNotMatch(content, /title:\s*["']Engineering Portfolio["']/);
  });

  it('verifies portfolioService preserves verification methods required by VerificationCenterPage', () => {
    const serviceFile = path.resolve('src/services/portfolioService.js');
    const content = fs.readFileSync(serviceFile, 'utf8');

    assert.match(content, /getVerificationCenter\(/);
    assert.match(content, /submitVerificationRequest\(/);
  });

  it('verifies PortfolioPage.jsx has retired all old page UI in favor of a safe redirect component', () => {
    const pageFile = path.resolve('src/pages/profile/PortfolioPage.jsx');
    const content = fs.readFileSync(pageFile, 'utf8');

    // Retired UI elements must be absent
    assert.doesNotMatch(content, /Curate Showcase/);
    assert.doesNotMatch(content, /Curated Engineering Deliverables/);
    assert.doesNotMatch(content, /Official Resume & Credentials/);
    assert.doesNotMatch(content, /Upload PDF Resume/);
    assert.doesNotMatch(content, /featuredProjects/);

    // Must safely redirect
    assert.match(content, /<Navigate to=["']\/profile["'] replace \/>/);
  });
});

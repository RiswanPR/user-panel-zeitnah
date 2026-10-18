import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EDIT_PROFILE_PATH = path.resolve(__dirname, '../pages/profile/EditProfile.jsx');
const ACCOUNT_PAGE_PATH = path.resolve(__dirname, '../pages/profile/AccountPage.jsx');
const VERIFICATION_PAGE_PATH = path.resolve(__dirname, '../pages/profile/VerificationCenterPage.jsx');
const PROFILE_PATH = path.resolve(__dirname, '../pages/profile/Profile.jsx');
const PUBLIC_PROFILE_PATH = path.resolve(__dirname, '../pages/profile/PublicProfilePage.jsx');

const PROFILE_HERO_PATH = path.resolve(__dirname, '../components/profile/ProfileHero.jsx');
const PROFILE_COMPLETION_PATH = path.resolve(__dirname, '../components/profile/ProfileCompletionCard.jsx');
const PROFESSIONAL_IDENTITY_PATH = path.resolve(__dirname, '../components/profile/ProfessionalIdentityEditor.jsx');
const STRUCTURED_SKILLS_PATH = path.resolve(__dirname, '../components/profile/StructuredSkillsEditor.jsx');
const ROLE_SELECTOR_PATH = path.resolve(__dirname, '../components/profile/RoleSelector.jsx');
const PROJECT_EDITOR_MODAL_PATH = path.resolve(__dirname, '../components/profile/ProjectEditorModal.jsx');
const SHARE_PROFILE_MODAL_PATH = path.resolve(__dirname, '../components/profile/ShareProfileModal.jsx');
const CHANGE_USERNAME_MODAL_PATH = path.resolve(__dirname, '../components/username/ChangeUsernameModal.jsx');
const CAREER_PREFERENCES_PATH = path.resolve(__dirname, '../components/profile/CareerPreferencesSection.jsx');
const INFRASTRUCTURE_EXPERTISE_PATH = path.resolve(__dirname, '../components/profile/InfrastructureExpertiseSection.jsx');

const PROFILE_ABOUT_PATH = path.resolve(__dirname, '../components/profile/ProfileAboutSection.jsx');
const PROFILE_EXPERIENCE_PATH = path.resolve(__dirname, '../components/profile/ProfileExperienceSection.jsx');
const PROFILE_EDUCATION_PATH = path.resolve(__dirname, '../components/profile/ProfileEducationSection.jsx');
const PROFILE_SKILLS_PATH = path.resolve(__dirname, '../components/profile/ProfileSkillsSection.jsx');
const PROFILE_PROJECTS_PATH = path.resolve(__dirname, '../components/profile/ProfileProjectsSection.jsx');
const PROFILE_CERTS_PATH = path.resolve(__dirname, '../components/profile/ProfileCertificationsSection.jsx');
const PROFILE_RECS_PATH = path.resolve(__dirname, '../components/profile/ProfileRecommendationsSection.jsx');
const GAMIFICATION_SUMMARY_PATH = path.resolve(__dirname, '../components/profile/GamificationSummary.jsx');
const PROFILE_MODULES_GRID_PATH = path.resolve(__dirname, '../components/profile/ProfileModulesGrid.jsx');

describe('Zeitnah — Phase 4B: Profile and Account Theme Migration Unit Tests', () => {
  // ── TEST 1: EditProfile Studio surfaces, text, navigation, and modals ──
  it('1. EditProfile uses semantic tokens for studio layout, sections, and internal dialogs', () => {
    const content = fs.readFileSync(EDIT_PROFILE_PATH, 'utf8');

    // Studio root and headers use semantic text
    assert.ok(content.includes('text-text-primary'), 'EditProfile must use text-text-primary for primary typography');
    assert.ok(content.includes('bg-surface-card'), 'EditProfile studio cards must use bg-surface-card');
    assert.ok(content.includes('border-border'), 'EditProfile studio cards must use border-border');

    // Studio sections use semantic form inputs
    assert.ok(content.includes('bg-surface-elevated'), 'EditProfile form controls must use bg-surface-elevated');

    // Internal studio modals use semantic tokens
    assert.ok(content.includes('Unsaved Changes'), 'Unsaved Changes modal must be present');
    assert.ok(content.includes('Edit Experience'), 'Experience modal must be present');
    assert.ok(content.includes('Edit Academic Qualification'), 'Education modal must be present');
    assert.ok(content.includes('Edit Credential'), 'Credential modal must be present');
    assert.ok(content.includes('Request an Endorsement'), 'Endorsement modal must be present');

    // Strictly ensure no hardcoded dark background values in EditProfile.jsx
    assert.doesNotMatch(content, /bg-\[#070B14\]/, 'EditProfile must not contain bg-[#070B14]');
    assert.doesNotMatch(content, /bg-\[#0C121E\]/, 'EditProfile must not contain bg-[#0C121E]');
    assert.doesNotMatch(content, /bg-\[#0A0F18\]/, 'EditProfile must not contain bg-[#0A0F18]');
    assert.doesNotMatch(content, /border-white\/\[0\.1\]/, 'EditProfile must not contain border-white/[0.1]');
  });

  // ── TEST 2: AccountPage and VerificationCenterPage ──
  it('2. AccountPage and VerificationCenterPage use semantic tokens and avoid hardcoded dark surfaces', () => {
    const accountContent = fs.readFileSync(ACCOUNT_PAGE_PATH, 'utf8');
    const verifContent = fs.readFileSync(VERIFICATION_PAGE_PATH, 'utf8');

    // AccountPage
    assert.ok(accountContent.includes('text-text-primary'), 'AccountPage must use text-text-primary');
    assert.ok(accountContent.includes('bg-surface-card'), 'AccountPage cards must use bg-surface-card');
    assert.ok(accountContent.includes('border-border'), 'AccountPage cards must use border-border');
    assert.doesNotMatch(accountContent, /bg-\[#070B14\]/, 'AccountPage must not contain bg-[#070B14]');
    assert.doesNotMatch(accountContent, /bg-\[#0C121E\]/, 'AccountPage must not contain bg-[#0C121E]');

    // VerificationCenterPage
    assert.ok(verifContent.includes('text-text-primary'), 'VerificationCenterPage must use text-text-primary');
    assert.ok(verifContent.includes('bg-surface-card'), 'VerificationCenterPage cards must use bg-surface-card');
    assert.ok(verifContent.includes('border-border'), 'VerificationCenterPage cards must use border-border');
    assert.ok(verifContent.includes('bg-surface-elevated'), 'VerificationCenterPage elevated elements must use bg-surface-elevated');
    assert.doesNotMatch(verifContent, /bg-\[#070B14\]/, 'VerificationCenterPage must not contain bg-[#070B14]');
    assert.doesNotMatch(verifContent, /bg-\[#0C121E\]/, 'VerificationCenterPage must not contain bg-[#0C121E]');
  });

  // ── TEST 3: Profile.jsx (Private Dashboard) and PublicProfilePage.jsx ──
  it('3. Profile and PublicProfilePage use semantic surfaces, borders, and typography', () => {
    const profileContent = fs.readFileSync(PROFILE_PATH, 'utf8');
    const publicContent = fs.readFileSync(PUBLIC_PROFILE_PATH, 'utf8');

    // Profile.jsx
    assert.ok(profileContent.includes('text-text-primary'), 'Profile must use text-text-primary');
    assert.ok(profileContent.includes('bg-surface-card'), 'Profile cards must use bg-surface-card');
    assert.ok(profileContent.includes('border-border'), 'Profile cards must use border-border');
    assert.doesNotMatch(profileContent, /bg-\[#070B14\]/, 'Profile must not contain bg-[#070B14]');
    assert.doesNotMatch(profileContent, /bg-\[#0C121E\]/, 'Profile must not contain bg-[#0C121E]');

    // PublicProfilePage.jsx
    assert.ok(publicContent.includes('text-text-primary'), 'PublicProfilePage must use text-text-primary');
    assert.ok(publicContent.includes('bg-surface-card'), 'PublicProfilePage cards must use bg-surface-card');
    assert.ok(publicContent.includes('border-border'), 'PublicProfilePage cards must use border-border');
    assert.doesNotMatch(publicContent, /bg-\[#070B14\]/, 'PublicProfilePage must not contain bg-[#070B14]');
    assert.doesNotMatch(publicContent, /bg-\[#0C121E\]/, 'PublicProfilePage must not contain bg-[#0C121E]');
  });

  // ── TEST 4: ProfileHero and ProfileCompletionCard ──
  it('4. ProfileHero and ProfileCompletionCard adapt surfaces while preserving brand contrast', () => {
    const heroContent = fs.readFileSync(PROFILE_HERO_PATH, 'utf8');
    const completionContent = fs.readFileSync(PROFILE_COMPLETION_PATH, 'utf8');

    // ProfileHero
    assert.ok(heroContent.includes('text-text-primary'), 'ProfileHero must use text-text-primary for name & headlines');
    assert.ok(heroContent.includes('border-border'), 'ProfileHero must use border-border for adaptive borders');
    assert.ok(heroContent.includes('bg-surface-card'), 'ProfileHero must use bg-surface-card');
    assert.ok(heroContent.includes('bg-surface-elevated'), 'ProfileHero cover banner container must use bg-surface-elevated');
    assert.ok(heroContent.includes('from-surface-card'), 'ProfileHero bottom fade must use from-surface-card');
    assert.ok(heroContent.includes('border-surface-card'), 'ProfileHero avatar frame must use border-surface-card');
    assert.doesNotMatch(heroContent, /bg-\[#070B14\]/, 'ProfileHero must not contain bg-[#070B14]');
    assert.doesNotMatch(heroContent, /from-\[#0A0F18\]/, 'ProfileHero must not contain from-[#0A0F18]');
    assert.doesNotMatch(heroContent, /border-\[#0A0F18\]/, 'ProfileHero must not contain border-[#0A0F18]');


    // ProfileCompletionCard
    assert.ok(completionContent.includes('text-text-primary'), 'ProfileCompletionCard must use text-text-primary');
    assert.ok(completionContent.includes('bg-surface-card'), 'ProfileCompletionCard must use bg-surface-card');
    assert.ok(completionContent.includes('border-border'), 'ProfileCompletionCard must use border-border');
    assert.doesNotMatch(completionContent, /bg-\[#070B14\]/, 'ProfileCompletionCard must not contain bg-[#070B14]');
    assert.doesNotMatch(completionContent, /bg-\[#0C121E\]/, 'ProfileCompletionCard must not contain bg-[#0C121E]');
  });

  // ── TEST 5: Identity and Skills Editors ──
  it('5. ProfessionalIdentityEditor, StructuredSkillsEditor, and RoleSelector adapt forms and chips', () => {
    const identityContent = fs.readFileSync(PROFESSIONAL_IDENTITY_PATH, 'utf8');
    const skillsContent = fs.readFileSync(STRUCTURED_SKILLS_PATH, 'utf8');
    const roleContent = fs.readFileSync(ROLE_SELECTOR_PATH, 'utf8');

    // ProfessionalIdentityEditor
    assert.ok(identityContent.includes('text-text-primary'), 'ProfessionalIdentityEditor must use text-text-primary');
    assert.ok(
      identityContent.includes('bg-surface-card') || identityContent.includes('bg-bg-card'),
      'ProfessionalIdentityEditor must use semantic card surface tokens'
    );
    assert.ok(identityContent.includes('border-border'), 'ProfessionalIdentityEditor must use border-border');
    assert.ok(identityContent.includes('bg-surface-elevated'), 'ProfessionalIdentityEditor must use bg-surface-elevated');
    assert.doesNotMatch(identityContent, /bg-\[#070B14\]/, 'ProfessionalIdentityEditor must not contain bg-[#070B14]');

    // StructuredSkillsEditor
    assert.ok(skillsContent.includes('text-text-primary'), 'StructuredSkillsEditor must use text-text-primary');
    assert.ok(skillsContent.includes('bg-surface-elevated'), 'StructuredSkillsEditor must use bg-surface-elevated');
    assert.ok(skillsContent.includes('border-border'), 'StructuredSkillsEditor must use border-border');
    assert.doesNotMatch(skillsContent, /bg-\[#070B14\]/, 'StructuredSkillsEditor must not contain bg-[#070B14]');

    // RoleSelector
    assert.ok(roleContent.includes('text-text-primary'), 'RoleSelector must use text-text-primary');
    assert.ok(roleContent.includes('bg-surface-elevated'), 'RoleSelector must use bg-surface-elevated');
    assert.ok(roleContent.includes('border-border'), 'RoleSelector must use border-border');
  });

  // ── TEST 6: Profile Sections (About, Experience, Education, Skills, Projects, Certs, Recs) ──
  it('6. All modular profile sections use semantic card surfaces and responsive borders', () => {
    const sections = [
      { path: PROFILE_ABOUT_PATH, name: 'ProfileAboutSection' },
      { path: PROFILE_EXPERIENCE_PATH, name: 'ProfileExperienceSection' },
      { path: PROFILE_EDUCATION_PATH, name: 'ProfileEducationSection' },
      { path: PROFILE_SKILLS_PATH, name: 'ProfileSkillsSection' },
      { path: PROFILE_PROJECTS_PATH, name: 'ProfileProjectsSection' },
      { path: PROFILE_CERTS_PATH, name: 'ProfileCertificationsSection' },
      { path: PROFILE_RECS_PATH, name: 'ProfileRecommendationsSection' },
      { path: GAMIFICATION_SUMMARY_PATH, name: 'GamificationSummary' },
      { path: PROFILE_MODULES_GRID_PATH, name: 'ProfileModulesGrid' },
      { path: CAREER_PREFERENCES_PATH, name: 'CareerPreferencesSection' },
      { path: INFRASTRUCTURE_EXPERTISE_PATH, name: 'InfrastructureExpertiseSection' },
    ];

    for (const { path: secPath, name } of sections) {
      const content = fs.readFileSync(secPath, 'utf8');
      assert.ok(
        content.includes('text-text-primary'),
        `${name} must use text-text-primary for primary typography`
      );
      assert.ok(
        content.includes('border-border'),
        `${name} must use semantic border-border`
      );
      assert.doesNotMatch(
        content,
        /bg-\[#070B14\]/,
        `${name} must not contain hardcoded dark canvas bg-[#070B14]`
      );
      assert.doesNotMatch(
        content,
        /bg-\[#0C121E\]/,
        `${name} must not contain hardcoded dark card bg-[#0C121E]`
      );
    }
  });

  // ── TEST 7: Profile Modals (ProjectEditorModal, ShareProfileModal, ChangeUsernameModal) ──
  it('7. Profile-related modals use semantic surfaces, borders, and input styling', () => {
    const projectModal = fs.readFileSync(PROJECT_EDITOR_MODAL_PATH, 'utf8');
    const shareModal = fs.readFileSync(SHARE_PROFILE_MODAL_PATH, 'utf8');
    const usernameModal = fs.readFileSync(CHANGE_USERNAME_MODAL_PATH, 'utf8');

    // ProjectEditorModal
    assert.ok(projectModal.includes('bg-surface-card'), 'ProjectEditorModal must use bg-surface-card');
    assert.ok(projectModal.includes('border-border'), 'ProjectEditorModal must use border-border');
    assert.ok(projectModal.includes('text-text-primary'), 'ProjectEditorModal must use text-text-primary');

    // ShareProfileModal
    assert.ok(shareModal.includes('bg-surface-card'), 'ShareProfileModal must use bg-surface-card');
    assert.ok(shareModal.includes('border-border'), 'ShareProfileModal must use border-border');
    assert.ok(shareModal.includes('text-text-primary'), 'ShareProfileModal must use text-text-primary');

    // ChangeUsernameModal
    assert.ok(usernameModal.includes('border-border'), 'ChangeUsernameModal must use border-border');
    assert.ok(usernameModal.includes('text-text-primary'), 'ChangeUsernameModal must use text-text-primary');
  });

  // ── TEST 8: Preserves all functional contracts and studio structure ──
  it('8. Preserves 8 studio sections, title catalogue behavior, and completion invariants', () => {
    const editContent = fs.readFileSync(EDIT_PROFILE_PATH, 'utf8');

    // Verify all 8 section headers remain exactly intact (required by profileRedesign.test.mjs)
    assert.match(editContent, /SECTION 01 OF 08/);
    assert.match(editContent, /SECTION 02 OF 08/);
    assert.match(editContent, /SECTION 03 OF 08/);
    assert.match(editContent, /SECTION 04 OF 08/);
    assert.match(editContent, /SECTION 05 OF 08/);
    assert.match(editContent, /SECTION 06 OF 08/);
    assert.match(editContent, /SECTION 07 OF 08/);
    assert.match(editContent, /SECTION 08 OF 08/);

    // Verify no regression on excluded sections in EditProfile
    assert.doesNotMatch(editContent, /import\s+CareerPreferencesSection/);
    assert.doesNotMatch(editContent, /import\s+ProjectEditorModal/);
  });
});

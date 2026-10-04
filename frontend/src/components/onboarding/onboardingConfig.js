/**
 * ZEITNAH ONBOARDING TOUR — STEP DEFINITIONS & CONFIGURATION
 *
 * Defines the canonical tour flow.
 * Consists of 6 targeted UI spotlight steps framed by an introductory Welcome
 * and a concluding Launch Celebration screen.
 */

export const TOUR_STEPS = [
  // ── Step 0: Welcome Introduction ──
  {
    id: 'welcome',
    type: 'modal',
    sectionBadge: 'WELCOME',
    title: 'Welcome to Zeitnah',
    tagline: 'See the unseen',
    subtext: 'Build. Connect. Discover.',
    description:
      'Zeitnah brings your community, network, learning and opportunities together in one seamless platform.',
    primaryCta: 'Take the quick tour',
    secondaryCta: 'Explore on my own',
  },

  // ── Step 1: Learning ──
  {
    id: 'learning',
    type: 'spotlight',
    targetSelector: '[data-tour="learning"]',
    preferredPlacement: 'bottom',
    sectionBadge: '01 / LEARNING',
    title: 'Keep learning',
    description:
      'Explore courses, classes and learning spaces designed to help you grow your real-world technical skills.',
    highlights: [
      'Interactive technical courses & syllabi',
      'Chapter-by-chapter video lessons & practice',
      'Verified progression & certifications',
    ],
  },

  // ── Step 2: Community ──
  {
    id: 'community',
    type: 'spotlight',
    targetSelector: '[data-tour="community"]',
    preferredPlacement: 'bottom',
    sectionBadge: '02 / COMMUNITY',
    title: 'Discover Community',
    description:
      'Share ideas, discover conversations, meet peers and participate actively in the Zeitnah community.',
    highlights: [
      'Create posts with photos, videos & markdown',
      'Comment, react, repost & quote conversations',
      'Follow creators & discover 24h stories',
    ],
  },

  // ── Step 3: Network ──
  {
    id: 'network',
    type: 'spotlight',
    targetSelector: '[data-tour="network"]',
    preferredPlacement: 'bottom',
    sectionBadge: '03 / NETWORK',
    title: 'Build your network',
    description:
      'Connect with people, discover profiles and grow meaningful professional relationships across disciplines.',
    highlights: [
      'Peer discovery & collaborator matching',
      'Mutual verified connections',
      'Learning spaces & group discussions',
    ],
  },

  // ── Step 4: Opportunities ──
  {
    id: 'opportunities',
    type: 'spotlight',
    targetSelector: '[data-tour="opportunities"]',
    preferredPlacement: 'bottom',
    sectionBadge: '04 / OPPORTUNITIES',
    title: 'Discover opportunities',
    description:
      'Explore jobs, opportunities and organizations that can help you move your career forward.',
    highlights: [
      'Verified engineering & tech job listings',
      'Direct connection with founders & recruiters',
      'Targeted talent matching based on skills',
    ],
  },

  // ── Step 5: Stay Connected ──
  {
    id: 'connected',
    type: 'spotlight',
    targetSelector: '[data-tour="connected"], [data-tour="messages"]',
    preferredPlacement: 'bottom',
    sectionBadge: '05 / COLLABORATION',
    title: 'Stay connected',
    description:
      'Keep up with important updates, peer conversations, rank milestones, and real-time alerts.',
    highlights: [
      'Direct messaging & collaborative threads',
      'Global leaderboard standings (#rank capsule)',
      'Instant notifications for community activity',
    ],
  },

  // ── Step 6: Identity / Profile ──
  {
    id: 'profile',
    type: 'spotlight',
    targetSelector: '[data-tour="profile"]',
    preferredPlacement: 'bottom',
    sectionBadge: '06 / IDENTITY',
    title: 'Build your Zeitnah identity',
    description:
      'Complete your profile so people can discover your experience, interests, projects and journey.',
    highlights: [
      'Verified handle & public profile (@username)',
      'Project portfolio & credentials',
      'Secure session & account settings',
    ],
  },

  // ── Step 7: Launch Finish ──
  {
    id: 'finish',
    type: 'modal',
    sectionBadge: 'COMPLETED',
    title: "You're ready.",
    tagline: 'See the unseen',
    subtext: 'Build. Connect. Discover.',
    description:
      'Build your profile. Connect with people. Discover opportunities. Keep learning.',
    primaryCta: 'Start exploring',
    secondaryCta: 'Complete my profile',
  },
];

export const SPOTLIGHT_STEPS = TOUR_STEPS.filter((s) => s.type === 'spotlight');
export const TOTAL_SPOTLIGHT_STEPS = SPOTLIGHT_STEPS.length;

export function getTourStepById(id) {
  return TOUR_STEPS.find((s) => s.id === id);
}


# Zeitnah 2.0 UI Architecture & Navigation Specification

## 1. Global Shell & Navigation Framework (`MainLayout.jsx`)

The global application shell coordinates desktop and mobile user journeys without duplicate route rendering or DOM memory leaks.

```
                              ┌──────────────────────────────────────────────┐
                              │           PlatformAnnouncementBanner         │
                              └──────────────────────┬───────────────────────┘
                                                     │
                       ┌─────────────────────────────┴─────────────────────────────┐
                       │                                                           │
          ┌────────────▼─────────────┐                                ┌────────────▼─────────────┐
          │     Desktop Sidebar      │                                │    Mobile Header & Nav   │
          │  ┌────────────────────┐  │                                │  ┌────────────────────┐  │
          │  │ CORE               │  │                                │  │ Mobile Top Header  │  │
          │  │ - Network & Spaces │  │                                │  │ - Logo & Platform  │  │
          │  │ - Messages         │  │                                │  │ - Trophy rank pill │  │
          │  │ - Jobs             │  │                                │  │ - Avatar & Logout  │  │
          │  ├────────────────────┤  │                                │  └────────────────────┘  │
          │  │ PROFESSIONAL       │  │                                │  ┌────────────────────┐  │
          │  │ - Opportunities    │  │                                │  │ Mobile Bottom Nav  │  │
          │  │ - Career Intel     │  │                                │  │ 1. Network         │  │
          │  │ - Portfolio        │  │                                │  │ 2. Messages        │  │
          │  │ - Verification     │  │                                │  │ 3. Jobs            │  │
          │  ├────────────────────┤  │                                │  │ 4. Alerts          │  │
          │  │ LEARNING           │  │                                │  │ 5. More (Drawer)   │  │
          │  │ - Courses          │  │                                │  └────────────────────┘  │
          │  │ - My Learning      │  │                                └────────────┬─────────────┘
          │  ├────────────────────┤  │                                             │
          │  │ UTILITY & FOOTER   │  │                                             ▼
          │  │ - Leaderboard Card │  │                                ┌──────────────────────────┐
          │  │ - User Identity    │  │                                │    MobileMoreDrawer      │
          │  │ - Logout           │  │                                │  Full product navigation │
          │  └────────────────────┘  │                                └──────────────────────────┘
          └────────────┬─────────────┘
                       │
                       ▼
          ┌──────────────────────────┐
          │     Page Content Area    │
          │  Max-width 1440px shell  │
          │  FeatureErrorBoundary    │
          │  PageTransition          │
          └──────────────────────────┘
```

---

## 2. Route Hierarchy & Mapping

| Route Pattern | Feature Module | Navigation Category | Mobile Touchpoint |
| :--- | :--- | :--- | :--- |
| `/network` | Talent & Cohort Discovery | Core | Bottom Bar (Item 1) |
| `/messages`, `/messages/:id` | Real-time Messaging | Core | Bottom Bar (Item 2) |
| `/jobs`, `/jobs/:id` | Infrastructure Jobs Marketplace | Core | Bottom Bar (Item 3) |
| `/notifications` | Notification Center & Feed | Utility | Bottom Bar (Item 4) / Bell |
| `/opportunities/inbox` | Employer Inquiries & Invitations | Professional | More Drawer |
| `/career-intelligence` | Pathway & Skill Gaps | Professional | More Drawer |
| `/profile/portfolio` | Project Case Studies & Proof | Professional | More Drawer |
| `/profile/verification`| Credential Verification Center | Professional | More Drawer |
| `/courses`, `/courses/:id`| Technical Curriculum Catalog | Learning | More Drawer / Header |
| `/my-learning` | Enrolled Courses & Progress | Learning | More Drawer |
| `/leaderboard` | Global & Course Standings | Utility | Header Trophy / Drawer |
| `/my-points` | Gamification Badges & XP | Utility | More Drawer |
| `/active-sessions` | Security & Device Management | Security | More Drawer |
| `/manage-business` | Recruiter & Founder Portal | Business | Desktop / More Drawer |

---

## 3. High-Traffic Screen Compositions

### 3.1 Network & Spaces (`NetworkPage.jsx`)
- Multi-dimensional filtering by infrastructure taxonomy: Discipline, Specialization, Sector, Software, Experience, Location.
- Sub-experiences: People & Network, Learning Spaces cohorts, Active Opportunities, and Institutional Organizations.
- Responsive grid: 1-col on `<640px`, 2-col on `<1024px`, 3-col on `>=1024px`.

### 3.2 Messaging System (`MessagesPage.jsx`)
- Desktop: Split three-zone layout with conversation threads, rich chat pane, and empty state with quick action buttons.
- Mobile: Contextual navigation switching between conversation list and focused chat room with back button.
- Socket.IO connection maintained strictly at `/api/socket.io/`.

### 3.3 Jobs & Detail Page (`JobsPage.jsx` & `JobDetailPage.jsx`)
- Match scoring algorithm displaying fit percentages.
- Tabbed views: For You (AI Recommendations), All Jobs, Recent, Saved Jobs, Applications, Invitations.
- Detail View features sticky bottom action bar on mobile viewport ensuring 100% thumb accessibility.

### 3.4 Professional Identity & Portfolio (`Profile.jsx` & `PortfolioPage.jsx`)
- Cover banner with custom `ImageEditorModal`.
- Interactive XP count-up animations respecting `prefers-reduced-motion`.
- Verified credential badges, network stats (followers, following, connections), and structured case study blocks.

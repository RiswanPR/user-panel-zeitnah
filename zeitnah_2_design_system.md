# Zeitnah 2.0 Design System Specification

## 1. Executive Summary & Design Vision
Zeitnah 2.0 is an ultra-premium, editorial, calm, and technically disciplined design system engineered for the civil and digital infrastructure ecosystem (BIM specialists, structural engineers, project managers, quantity surveyors, recruiters, and founders).

The interface moves away from generic card grids, loud neon gradients, and superficial glassmorphism. It introduces layered depth, calm dark surfaces, fine hairline borders, restrained typography hierarchy, and ergonomics tailored for mobile thumb reach and high-density desktop productivity.

---

## 2. Design Tokens

### 2.1 Surfaces & Depth Palette
```css
:root {
  /* Foundation */
  --zn-bg: #070B14;              /* Deep obsidian base */
  --zn-surface-1: #0B111E;        /* Primary elevated pane / navigation shell */
  --zn-surface-2: #0F1728;        /* Secondary layered pane */
  --zn-surface-3: #152033;        /* Hover surface & popover containers */
  --zn-surface-card: #0D1625;     /* Canonical card background */
}
```

### 2.2 Borders & Outlines
```css
:root {
  --zn-border: rgba(255, 255, 255, 0.07);      /* Default structural hairline */
  --zn-border-subtle: rgba(159, 213, 178, 0.08); /* Mint tinted structural border */
  --zn-border-accent: rgba(159, 213, 178, 0.22); /* Active state border */
  --zn-border-gold: rgba(246, 237, 74, 0.25);   /* Achievement highlight border */
}
```

### 2.3 Brand & Semantic Accents
```css
:root {
  /* Brand */
  --zn-accent: #9FD5B2;          /* Restrained engineering mint */
  --zn-accent-soft: rgba(159, 213, 178, 0.12);
  --zn-gold: #F6ED4A;            /* Engineering precision yellow / achievement */
  --zn-gold-soft: rgba(246, 237, 74, 0.12);
  --zn-navy: #12314C;            /* Architectural deep navy */

  /* Semantics */
  --zn-success: #10B981;
  --zn-warning: #F59E0B;
  --zn-danger: #EF4444;
  --zn-info: #38BDF8;
}
```

### 2.4 Text Hierarchy
- **Heading Display:** `Sora`, `Inter`, -apple-system, sans-serif (800 weight, letter-spacing -0.02em)
- **Body & Controls:** `Inter`, `Sora`, system-ui, sans-serif (400-600 weight)
- **Technical & Metrics:** `ui-monospace`, `SFMono-Regular`, `Menlo`, monospace (tabular figures)
- Primary Text: `#FFFFFF`
- Secondary Text: `#94A3B8`
- Muted / Supporting: `#64748B`
- Faint / Outline: `#475569`

---

## 3. UI Component Primitives

### 3.1 Page Header (`PageHeader.jsx`)
Editorial header structure supporting:
- Eyebrow category tag (e.g. `CAREER MARKETPLACE`, `PROFESSIONAL DISCOVERY CENTER`)
- Crisp white H1 heading with tight tracking
- Balanced secondary description paragraph
- Responsive action buttons strip with wrap support
- Sub-header filters and tab integration

### 3.2 Cards (`PremiumCard.jsx`)
- **Surface (`.zn-card`):** Layered gradient (`#0D1625` to `#090F1B`) with 1px border and 18px radius.
- **Elevated (`.zn-card-elevated`):** High-depth modal or hero card with 20px radius and 40px blur.
- **Interactive (`.zn-card-interactive`):** Micro-elevation (`translateY(-2px)`), hairline glow, and click feedback.
- **Metric (`variant="metric"`):** High-contrast KPI presentation with technical counters.

### 3.3 Buttons (`PremiumButton.jsx`)
- **Primary:** Gold background (`#F6ED4A`), dark contrast typography (`#070B14`), 44px minimum height.
- **Accent:** Engineering mint background (`#9FD5B2`), dark typography (`#070B14`), 44px minimum height.
- **Secondary:** Frosted glass surface, 1px white hairline border, hover highlight.
- **Ghost:** Transparent background, muted text, subtle hover lift.
- **Danger:** Ruby tinted surface with red border for destructive flows.

### 3.4 Status & Verification Badges (`StatusBadge.jsx`)
- **Official / Verified:** Engineering mint tinted pill with check icon and optional pulse dot.
- **Pending:** Amber gold badge indicating in-review credentials.
- **Rejected / Expired:** Controlled red badge.
- **Neutral:** Clean navy / muted border badge.

### 3.5 Skeletons (`Skeleton.jsx`)
- Replaces generic spinner wheels with authentic wireframe shimmers matching the final editorial layout.
- Provides `SkeletonPage`, `SkeletonCard`, `SkeletonProfile`, `SkeletonList`, and `SkeletonText`.

---

## 4. Mobile Ergonomics & Breakpoints
1. Minimum touch target of **44px × 44px** across all mobile interactive controls (`.touch-min`).
2. Native safe-area inset compliance (`env(safe-area-inset-bottom)` and `env(safe-area-inset-top)`).
3. Dedicated mobile navigation:
   - 5-target bottom floating bar (`Network`, `Messages`, `Jobs`, `Alerts`, `More`).
   - "More" opens a full-height drawer (`MobileMoreDrawer.jsx`) granting one-thumb access to Courses, My Learning, Leaderboard, Points, Opportunities, Career Intelligence, Portfolio, Verification, Active Sessions, and Sign Out.
4. Fully validated at **320px, 360px, 375px, 390px, 414px, 430px, 768px, 1024px, 1280px, 1440px+**.

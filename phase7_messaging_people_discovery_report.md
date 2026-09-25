# ZEITNAH USER PANEL — PHASE 7 AUDIT REPORT
## Messaging + Infrastructure People Discovery

**Author**: Antigravity Engineering (Advanced Agentic Pair Programmer)  
**Date**: September 25, 2026  
**Status**: COMPLETE (Production-Ready)  
**Project**: Zeitnah LMS User Panel — Infrastructure-Only Professional Network  

---

## 1. Architecture Audit

Prior to Phase 7, the Zeitnah User Panel had robust foundations across Infrastructure Profiles & Roles (Phase 1), Businesses & Jobs (Phase 2), AI Job-to-Talent Matching (Phase 3), AI Talent-to-Job Matching (Phase 4), Career Intelligence (Phase 5), and Production Hardening (Phase 6). 

However, direct interaction between infrastructure professionals was fragmented:
- Learner discovery was restricted to a basic student card grid querying students without full integration with canonical infrastructure disciplines, sectors, software, or experience levels.
- Direct messaging was absent from the User Panel; notifications existed, but no dedicated real-time chat, conversation management, or message request system existed.
- Communication privacy settings were not yet structured to govern direct outreach (`ANYONE`, `CONNECTIONS_ONLY`, `NOBODY`).

Phase 7 resolves these limitations by creating a dual-engine capability:
1. **Infrastructure People Directory**: Upgrades the network directory into a canonical infrastructure search and filtering engine with mutual connection discovery, deterministic smart recommendation reasons, and privacy-aware message actions.
2. **Dedicated Messaging System (`/messages`)**: Production-ready communication architecture with WebSocket real-time delivery (`/messages` gateway namespace), graceful HTTP/polling fallback, message request lifecycles for non-connections, direct and group messaging, reactions, edits, deletes, typing indicators, and moderation reporting.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      PEOPLE DISCOVERY & NETWORKING                     │
│  /network?tab=network&sub=people                                      │
│  ├── Canonical Search (Name, Headline, Discipline, Sector, Software)  │
│  ├── Infrastructure Taxonomy Filters (9 Canonical Facets)              │
│  ├── Deterministic Smart Discovery Signals                             │
│  └── Relationship & Privacy Gatekeeper (Connect / Follow / Message)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DEDICATED MESSAGING SYSTEM                      │
│  /messages & /messages/:conversationId                                 │
│  ├── Gateway: WebSocket (/messages) + Reconnection Management           │
│  ├── Chat Panes: Desktop Split-Pane & Mobile Full-Screen Composer       │
│  ├── Views: Chats, Message Requests, Archived                          │
│  ├── Security: Member Auth, Block List, Privacy Rules, Anti-Tamper     │
│  └── Features: Reactions, Replies, Edits, Deletes, Presence, Typing    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Existing Messaging Infrastructure Discovered

During repository inspection:
- **WebSocket Foundation**: `NotificationsGateway` existed under namespace `/notifications` with JWT authentication handling notification broadcasts.
- **Moderation Architecture**: `ModerationService` existed with `hasBlockRelationship(userA, userB)`, `getExcludedUserIds(userId)`, and `createReport(...)`.
- **Connections Service**: `NetworkConnectionsService` supported connection requests and follow relationships via `NetworkConnection` model.
- **Absence of Dedicated Chat Models**: No existing message or conversation collection existed in the database; notifications were utilized for generic activity alerts.
- **Architectural Decision**: A dedicated `MessagingModule` was built cleanly in `backend/src/modules/messaging/` using its own WebSocket namespace `/messages`, preventing pollution of notification streams while reusing existing security and moderation services.

---

## 3. Schemas Created & Modified

### Modified Schemas:
1. **User Schema (`backend/src/modules/auth/schemas/user.schema.ts`)**:
   - Added `privacySettings.messaging`: `'ANYONE' | 'CONNECTIONS_ONLY' | 'NOBODY'` (default: `'ANYONE'`).
   - Added `privacySettings.readReceipts`: `boolean` (default: `true`).
   - Added `privacySettings.onlinePresence`: `boolean` (default: `true`).
   - Updated `UpdateProfileDto` in `backend/src/modules/profile/dto/update-profile.dto.ts` to validate these privacy settings.
2. **Report Schema (`backend/src/modules/moderation/schemas/report.schema.ts`)**:
   - Added `MESSAGE` and `CONVERSATION` to `ReportTargetType` enum, enabling native integration with the existing moderation audit log and report resolution pipeline.

### New Schemas Created:
1. **Conversation Schema (`backend/src/modules/messaging/schemas/conversation.schema.ts`)**:
   - `Conversation`:
     - `type`: `DIRECT` or `GROUP`
     - `name`: string (for group conversations)
     - `avatar`: string
     - `createdBy`: `ObjectId` -> `User`
     - `participants`: `ObjectId[]` -> `User` (indexed for high-performance membership checks)
     - `members`: Subdocuments array tracking `userId`, `role` (`ADMIN` | `MEMBER`), `joinedAt`, `lastReadAt`, `mutedUntil`, `isArchived`, `isDeletedFor`.
     - `requestStatus`: `NONE` | `PENDING` | `ACCEPTED` | `DECLINED`
     - `requestRecipientId`: `ObjectId` -> `User`
     - `lastMessage`: Embedded snapshot (`messageId`, `senderId`, `body`, `createdAt`, `status`)
     - `lastMessageAt`: Date (indexed)
   - Compound Indexes:
     - `{ participants: 1, type: 1 }`
     - `{ 'members.userId': 1, lastMessageAt: -1 }`
     - `{ requestRecipientId: 1, requestStatus: 1 }`
2. **Message Schema (`backend/src/modules/messaging/schemas/message.schema.ts`)**:
   - `Message`:
     - `conversationId`: `ObjectId` -> `Conversation` (indexed)
     - `senderId`: `ObjectId` -> `User` (indexed)
     - `body`: string (max 5000 chars)
     - `attachments`: `[{ url, name, type, size }]`
     - `replyTo`: `{ messageId, senderName, bodySnippet }`
     - `reactions`: `[{ userId, emoji, reactedAt }]`
     - `status`: `SENT` | `DELIVERED` | `READ`
     - `isEdited`: boolean & `editedAt`: Date
     - `isDeleted`: boolean & `deletedAt`: Date
     - `deletedForUserIds`: `ObjectId[]` (for "Delete for me" operations)
   - Compound Indexes:
     - `{ conversationId: 1, createdAt: -1 }`
     - `{ conversationId: 1, senderId: 1 }`

---

## 4. APIs Created & Modified

### New REST Endpoints (`/api/messages`):
| Method | Endpoint | Description | Guards / Security |
|---|---|---|---|
| `GET` | `/messages/conversations` | List user's conversations (`tab`: chats, requests, archived; debounced `q`) | `JwtAuthGuard`, Throttle |
| `GET` | `/messages/conversations/unread-counts` | Aggregated unread messages and requests counters | `JwtAuthGuard` |
| `GET` | `/messages/conversations/:id` | Get conversation details by ID | `JwtAuthGuard`, Membership check |
| `POST` | `/messages/conversations` | Start direct conversation or send message request | `JwtAuthGuard`, Privacy & Block check |
| `POST` | `/messages/conversations/group` | Create group conversation | `JwtAuthGuard`, Multi-user safety check |
| `GET` | `/messages/conversations/:id/messages` | Cursor-based message history (`before`, `limit`) | `JwtAuthGuard`, Membership check |
| `POST` | `/messages/conversations/:id/messages` | Send message to conversation | `JwtAuthGuard`, Membership & Request status check |
| `PATCH` | `/messages/conversations/:id/read` | Mark all unread messages as read | `JwtAuthGuard`, Membership check |
| `POST` | `/messages/conversations/:id/request/accept` | Accept message request | `JwtAuthGuard`, Recipient verification |
| `POST` | `/messages/conversations/:id/request/decline` | Decline message request | `JwtAuthGuard`, Recipient verification |
| `PATCH` | `/messages/conversations/:id/mute` | Mute/unmute conversation (`muted`, `until`) | `JwtAuthGuard`, Member verification |
| `PATCH` | `/messages/conversations/:id/archive` | Archive/unarchive conversation (`archived`) | `JwtAuthGuard`, Member verification |
| `POST` | `/messages/conversations/:id/leave` | Leave group conversation | `JwtAuthGuard`, Group check |
| `PATCH` | `/messages/messages/:id` | Edit own message within 15-minute window | `JwtAuthGuard`, Author check & Time policy |
| `DELETE` | `/messages/messages/:id` | Delete message (`mode`: `me` vs `everyone`) | `JwtAuthGuard`, Author / Admin policy |
| `POST` | `/messages/messages/:id/reactions` | Toggle emoji reaction (`👍`, `❤️`, `👏`, `🎯`) | `JwtAuthGuard`, Member check |
| `POST` | `/messages/conversations/:id/report` | Report conversation to moderation | `JwtAuthGuard`, Moderation audit log |
| `POST` | `/messages/messages/:id/report` | Report message to moderation | `JwtAuthGuard`, Moderation audit log |

### Modified Network Endpoints (`/api/network`):
- `GET /network/people`: Enhanced with query filters `discipline`, `specialization`, `sector`, `software`, `skill`, `experience`, `location`, `company`, `institution`, and `role`. Enforces block exclusion, returns mutual connection counts, calculates deterministic recommendation reasons, and includes messaging capability (`canMessage`, `messageAction`).
- `GET /network/filters`: Returns canonical infrastructure disciplines, sectors, software, and experience buckets.

---

## 5. People Discovery Changes

1. **Header & Subheading Upgrade**:
   - Header: `"Discover Infrastructure Professionals"`
   - Subheading: `"Find engineers, educators, mentors, recruiters, founders and other infrastructure professionals."`
2. **Infrastructure Structured Filters (`InfrastructurePeopleFilters.jsx`)**:
   - Role selector (`Student`, `Educator`, `Professional`, `Mentor`, `Recruiter`, `Founder`).
   - Discipline canonical dropdown (`Civil Engineering`, `Structural Engineering`, etc.).
   - Specialization dynamic dropdown filtered by chosen discipline.
   - Sector canonical dropdown (`Highways & Bridges`, `Metro & Rail`, `Water & Waste Water`, etc.).
   - Software canonical dropdown (`Primavera P6`, `AutoCAD`, `Revit`, `ETABS`, `BIM 360`, etc.).
   - Experience buckets (`0–1 years`, `1–3 years`, `3–5 years`, `5–10 years`, `10+ years`).
   - Location, Company, and Institution search filters.
   - Active filters count badge and one-click "Reset All" action.
3. **People Card (`InfrastructurePeopleCard.jsx`)**:
   - Matches the design specification from Section 8: Avatar with initials/photo, Name, @username, Headline, Role badge, Discipline, Sector, Location, Software and Skills chips, Experience and Connection count.
   - Mutual Connections counter with instant link to network context.
   - Smart Recommendation Badge (e.g., *"Because you both work with: Highway Infrastructure • Primavera P6"*).
   - Relationship Action (`Connect`, `Requested`, `Accept/Decline`, `Connected`).
   - Dynamic Message button:
     - If connected or messaging open: `[Message]`
     - If non-connection with ANYONE privacy: `[Message Request]` (opens `SendMessageRequestModal`)
     - If restricted by recipient privacy: Disabled state with tooltip.

---

## 6. Messaging Changes

1. **Dedicated Route (`/messages` & `/messages/:conversationId`)**:
   - Full User Panel messaging application with clean responsive layout.
2. **Navigation Integration**:
   - Desktop sidebar and mobile bottom navigation updated with `Messages` icon and real-time unread badge pills.
   - Mobile top header updated with direct `Messages` action button and unread indicator.
3. **Desktop & Mobile Responsive Experience**:
   - Desktop: Side-by-side split pane (left conversations list, right conversation window with sticky composer).
   - Mobile: Mobile-first navigation. When entering a conversation, full-screen mobile chat opens with sticky composer, top back button returning to conversation list, and safe keyboard handling.
4. **Message Requests View (`MessageRequestsView.jsx`)**:
   - Dedicated tab for requests from non-connected professionals.
   - Shows sender profile preview, introductory message snippet, and instant `[Accept Request]`, `[Decline]`, and `[Block]` buttons.
5. **Chat Features**:
   - Real-time messages with single/double checkmarks for sent/delivered/read.
   - In-app toast notifications when receiving messages while in other conversations.
   - Hover action menu on messages for quick reactions, copy, reply, edit, delete, and moderation report.
   - Reply preview banner and edit banner with cancel `[x]` triggers.
   - Real-time typing indicator with animated pulse.

---

## 7. Privacy & Security Model

Phase 7 implements strict defense-in-depth security:
1. **No Frontend Trust for Identities**:
   - The message sender ID is extracted exclusively from the authenticated session JWT in `JwtAuthGuard`. The frontend cannot spoof `senderId`.
2. **Conversation Access Authorization**:
   - Every read and write to `/messages/conversations/:id` validates that the caller is in `conversation.participants`. Non-members receive `403 Forbidden`.
3. **Messaging Privacy Enforcement**:
   - `ANYONE`: Non-connected users can initiate outreach, which is quarantined as a `PENDING` message request. Once accepted, regular messaging unlocks.
   - `CONNECTIONS_ONLY`: Verified through `NetworkConnection` model with `status: 'accepted'`. Non-connections receive `403 Forbidden`.
   - `NOBODY`: Blocks all incoming direct messages with `403 Forbidden`.
4. **Moderation & Block Relationships**:
   - Every message initiation checks `ModerationService.hasBlockRelationship(caller, recipient)`. If either user has blocked the other, messaging is strictly blocked.
   - Blocked users are automatically stripped from People Discovery results via `getExcludedUserIds`.
5. **Message Ownership Policies**:
   - Only the author can edit a message, and only within a 15-minute window (`message.createdAt > Date.now() - 15m`).
   - "Delete for everyone" is restricted to the author or group admin. "Delete for me" appends the user's ID to `deletedForUserIds` without destroying database audit history.

---

## 8. WebSocket Implementation

- **Dedicated Namespace**: `/messages` namespace running on Socket.IO alongside the existing `/notifications` namespace.
- **Connection Lifecycle & Authentication**:
  - Authenticates via JWT handshake: `socket.handshake.auth.token`.
  - Rejects unauthenticated connections and handles token refresh events (`zeitnah:auth:token-refreshed`).
- **Room Subscriptions**:
  - `user_${userId}`: Private room for user presence, conversation updates, and incoming message notifications.
  - `conversation_${conversationId}`: Room joined dynamically on conversation view for instant message delivery, read status, and typing indicators.
- **Graceful Degradation**:
  - Reconnecting banner with manual "Refresh" button when connection drops.
  - Falls back to REST APIs and TanStack Query polling so the messaging UI never freezes.
- **Resource Management**:
  - Ephemeral typing events are broadcast to active socket rooms and are never persisted to MongoDB.
  - Subscriptions clean up on unmount / route transition via `leave_conversation` events.

---

## 9. Notification Integration

The messaging system integrates directly with the existing `NotificationsService`:
- When a new message request arrives: Recipient receives an in-app notification linking to `/messages?tab=requests`.
- When a message request is accepted: The sender receives a notification that their request was accepted, linking directly to `/messages?c=${conversationId}`.
- Unread message counters update in real time across the Navbar, mobile bottom nav, and conversation list badges.

---

## 10. Moderation Integration

- **Target Types**: Added `MESSAGE` and `CONVERSATION` to `ReportTargetType` in `report.schema.ts`.
- **In-App Reporting**: Integrated with `ReportModal` to allow users to flag inappropriate messages or conversations. Submissions feed directly into the admin moderation review queue with audit timestamps.
- **Blocking**: Block actions trigger `ModerationService.blockUser(targetUserId)` which cascades into relationship prevention, conversation blocking, and discovery exclusion.

---

## 11. Performance Changes

- **Indexed MongoDB Queries**: Added compound indexes for `{ participants: 1, type: 1 }`, `{ 'members.userId': 1, lastMessageAt: -1 }`, and `{ conversationId: 1, createdAt: -1 }`.
- **Zero N+1 Queries in Discovery**:
  - Mutual connection counts are fetched in a single aggregation query across `NetworkConnection` intersecting the caller's connection IDs with the page's candidate user IDs.
  - Connection relationship statuses (`connected`, `pending_sent`, `pending_received`) are resolved in one batch query for all users on the current page.
- **Cursor Pagination for Messages**: Messages query utilizes `{ before: oldestMessageId, limit: 50 }` avoiding full conversation downloads.

---

## 12. Mobile UX Changes

- **Responsive Viewport Fitting**: Main chat container uses `h-[calc(100vh-4.25rem)]` preventing scrollbar clipping on mobile browsers.
- **Full-Screen Chat Transition**: On screens `< 768px`, selecting a conversation hides the conversation list and shows the full-screen conversation view. An accessible back arrow returns to the inbox.
- **Sticky Composer**: The composer sticks cleanly to the bottom with safe padding, supporting multiline expansion and touch-friendly icon buttons.
- **Bottom Navigation Badges**: The mobile bottom navigation renders a gold/mint unread count pill over the Messages tab.

---

## 13. Test Suites

A dedicated test suite was built in `backend/src/modules/phase7-messaging-discovery.spec.ts` covering:
1. **People Discovery & Infrastructure Taxonomy Filtering** (2 tests)
2. **Message Privacy & Safety Enforcement** (4 tests)
3. **Conversation Access & Anti-Tampering Security** (3 tests)
4. **Message Request Lifecycle** (4 tests)
5. **Message Operations: Edit, Delete, Reactions & Replies** (5 tests)
6. **Group Chat Foundation & Mute/Archive** (3 tests)

Total: **21 dedicated unit & integration tests**.

---

## 14. Full Test Results

Execution command: `npm test -- phase`

```text
PASS src/modules/phase7-messaging-discovery.spec.ts
  Phase 7 — Messaging + Infrastructure People Discovery QA Suite
    1. People Discovery & Infrastructure Taxonomy Filtering
      ✓ filters professionals by canonical discipline, sector, and experience range (8 ms)
      ✓ excludes blocked users from discovery results (2 ms)
    2. Message Privacy & Safety Enforcement
      ✓ prohibits messaging when recipient privacy is set to NOBODY (19 ms)
      ✓ prohibits messaging non-connections when recipient privacy is CONNECTIONS_ONLY (1 ms)
      ✓ allows messaging connections when recipient privacy is CONNECTIONS_ONLY (4 ms)
      ✓ rejects messaging if a block relationship exists in ModerationService (1 ms)
    3. Conversation Access & Anti-Tampering Security
      ✓ fails when a non-member attempts to read a conversation (1 ms)
      ✓ fails when a non-member attempts to send a message to a conversation (1 ms)
      ✓ always binds message sender identity to authenticated user session (1 ms)
    4. Message Request Lifecycle
      ✓ creates a PENDING message request when contacting non-connected user with ANYONE privacy (1 ms)
      ✓ allows recipient to accept request and transitions conversation to ACCEPTED (1 ms)
      ✓ prevents non-recipient from accepting message request (1 ms)
      ✓ allows recipient to decline request and marks requestStatus as DECLINED (1 ms)
    5. Message Operations: Edit, Delete, Reactions & Replies
      ✓ allows author to edit recent message within 15 minute window (1 ms)
      ✓ rejects editing a message after 15 minute edit window has expired (1 ms)
      ✓ rejects editing another users message (1 ms)
      ✓ toggles message reactions correctly (1 ms)
      ✓ allows author to delete for everyone while preventing non-authors (1 ms)
    6. Group Chat Foundation & Mute/Archive
      ✓ creates group conversation with title and active members (1 ms)
      ✓ allows a member to leave a group (1 ms)
      ✓ mutes and unarchives conversation for member correctly (1 ms)

PASS src/modules/phase6-production-hardening.spec.ts (11.456 s)
PASS src/modules/phase5-career-intelligence.spec.ts (7.984 s)
PASS src/modules/phase4-job-recommendations.spec.ts (10.624 s)
PASS src/modules/phase3-talent-matching.spec.ts (11.076 s)
PASS src/modules/phase2-business-jobs.spec.ts (11.52 s)
PASS src/modules/security-phase0.spec.ts (7.693 s)

Test Suites: 7 passed, 7 total
Tests:       162 passed, 162 total
Snapshots:   0 total
Time:        12.206 s
```

---

## 15. Build Results

### Backend (`npm run build`):
```text
> backend@0.0.1 build
> nest build

Exit code: 0 (Zero errors)
```

### Frontend (`npm run build`):
```text
vite v6.x building for production...
dist/assets/js/MessagesPage-BjgQkbBD.js      42.05 kB │ gzip: 9.21 kB
dist/assets/js/NetworkPage-BYOJyFuQ.js       91.02 kB │ gzip: 14.46 kB
PWA v1.3.0 mode generateSW precache 80 entries (4905.04 KiB)
Exit code: 0 (Zero errors)
```

---

## 16. Remaining Issues / Non-Blocking Notes

- None. All Phase 7 functional and security criteria are satisfied. Group management features (e.g. transfer ownership, advanced role administration) are intentionally reserved for community phases as specified in the Phase 7 scope boundary.

---

## 17. Manual Browser QA Checklist

- [x] Navigate to `/network?tab=network&sub=people`: Verify header says *"Discover Infrastructure Professionals"* and subheading matches.
- [x] Test search input: Type a software name (e.g. "Primavera") and verify debounced search executes without page refresh.
- [x] Test infrastructure filters: Select a Discipline and verify Specialization dropdown updates dynamically.
- [x] Check `InfrastructurePeopleCard`: Confirm avatar, role badge, discipline, sector, software tags, experience, and connection counts render cleanly.
- [x] Click `[Message]` on a connected professional: Verifies navigation to `/messages?user=${id}` and immediate chat activation.
- [x] Click `[Request]` on a non-connected professional: Verifies `SendMessageRequestModal` opens with introductory message prompt.
- [x] Navigate to `/messages`: Confirm layout displays split pane on desktop with Chats, Requests, and Archived tabs.
- [x] Test typing: Type in chat composer and confirm WebSocket emits `typing` event and partner screen shows `is typing...`.
- [x] Test reactions: Click quick reaction (👍) on a message and verify reaction pill updates with count.
- [x] Test mobile view: Resize browser to `< 768px` and confirm single-pane conversation view with back arrow navigation.

---

## 18. Preparation Notes for Phase 8

With People Discovery and Real-Time Messaging fully deployed:
- Phase 8 (or upcoming Network Expansion phases) can build on top of this messaging foundation to support real-time interview coordination, recruiter-to-candidate messaging, and automated project inquiry threads.
- In Phase 12 (Network Home / Feed), the deterministic discovery signals (`reasons`) and mutual connection lookups developed here can be directly embedded into the personalized Network Home feed alongside jobs and learning recommendations.

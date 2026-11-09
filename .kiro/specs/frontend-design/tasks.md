# Implementation Plan: Frontend Design

## Overview

Implementation language is JavaScript (React 19 + Vite, JSX), matching the design. Work follows the migration plan in
the design: tokens and fonts, water kit and primitives, shell and routing, then pages per role (Learner, Recruiter,
CourseProvider), then verification tooling. Only the three roles Learner, Recruiter and CourseProvider plus Visitors
are in scope. All paths are relative to `frontend/src/` unless stated. Each page task also moves that page's inline
`styles` objects to CSS Modules plus tokens, and implements Skeleton, EmptyState and ErrorState.

## Tasks

- [x] 1. Foundation: design tokens, fonts and motion preference
  - [x] 1.1 Add dependencies, self-hosted fonts and Tide design tokens
    - Install pinned exact versions: `@fontsource/bricolage-grotesque`, `@fontsource/instrument-sans`,
      `@fontsource/jetbrains-mono`, `fast-check` (dev), `@axe-core/playwright` (dev) using `uv`/`npm` as the project does
    - Import Latin-subset, `font-display: swap` font CSS from `main.jsx`; no third-party font hosts; keep a system
      fallback stack so text stays visible if a font fails
    - Update `styles/` tokens: the 12 colour tokens (light and dark values), type scale 12/13/15/17/20/24/32/44,
      15px/1.55 body, tabular numerals on numeric text, 4px spacing grid, radii 8/14/22, `--ease-tide` and durations
      120/220/320ms, 2px `--teal` focus ring
    - Add global `prefers-reduced-motion: reduce` rules (animation/transition at most 10ms, iteration count 1)
    - Restrict blur to overlays and configure `lucide-react` icons to stroke width 1.75 via a shared icon wrapper
    - _Requirements: 14.1, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 17.1, 17.7, 17.8, 21.2, 24.7_

  - [x] 1.2 Implement `hooks/useMotionPreference.js`
    - Return `{ reduced, canUseWebGL, saveData, allowAmbient }` from `matchMedia`, WebGL2 probe and
      `navigator.connection.saveData`; react to media-query changes
    - _Requirements: 16.1, 17.1_

  - [x] 1.3 Write unit tests for `useMotionPreference`
    - Cover each flag, default and non-default values, and live media-query change
    - _Requirements: 25.1_

  - [x] 1.4 Write property test for token contrast
    - **Property 8: Contrast**
    - **Validates: Requirements 14.2**
    - Compute ratios for every text/background and UI boundary pair used in light and dark themes (fast-check over the
      declared pair list, at least 100 cases)

- [x] 2. Water kit
  - [x] 2.1 Implement `computeMeterLevel` and `shouldRenderWaterCanvas` in `lib/water/`
    - `computeMeterLevel(value, reduced)`: clamp 0-100, round half up, handle Infinity, undefined/null/NaN returns
      level 0, amplitude 0, label "—"; amplitude `min(4, level/10)` except 0 when reduced or level 0/100
    - `shouldRenderWaterCanvas(env, activeCanvasCount)`: `static` for reduced, saveData, no WebGL2, cores <= 2 or
      another canvas animating; `paused` when under 1% visible or tab hidden; otherwise `animate`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.11, 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 2.2 Write property test for meter bounds and label
    - **Property 3: Meter bounds and label**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.11**
    - Use `fast-check` with at least 100 cases including NaN, Infinity, undefined, null

  - [x] 2.3 Write property test for meter wave amplitude
    - **Property 4: Meter wave amplitude**
    - **Validates: Requirements 15.4, 15.5, 15.6**

  - [x] 2.4 Write property test for canvas gating
    - **Property 6: Canvas gating and single ambient canvas**
    - **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

  - [x] 2.5 Implement `components/water/LiquidMeter.jsx` and make `ProgressBar` a wrapper
    - Props `value`, required non-blank `label` (PropTypes error and no render when blank), variants
      `bar|vessel|ring`, tones `primary|good|warn`; always print the label text; animate only transform/opacity
    - `ProgressBar` renders `LiquidMeter variant="bar"`; undefined/null/NaN displays "—", never "0%"
    - _Requirements: 15.7, 15.8, 15.9, 15.10, 15.11, 17.7, 17.9_

  - [x] 2.6 Implement `WaveDivider`, `useRipple` and `TideTransition`
    - `WaveDivider({ flip, tone })` two-layer SVG, slow transform drift, frozen when reduced
    - `useRipple(ref)`: 450ms radial ripple from pointer origin that leaves no element; 120ms opacity flash when
      reduced; attach to primary `Button`
    - `TideTransition`: 220ms cross-fade with 6px drift, no displacement filter; at most 10ms when reduced
    - _Requirements: 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_

  - [x] 2.7 Implement `components/water/WaterCanvas.jsx` with lazy shader chunk
    - Hand-written GLSL, no 3D library, shader code in its own chunk requested after first paint
    - Use `useMotionPreference`, `shouldRenderWaterCanvas`, `IntersectionObserver` and `visibilitychange`; module-level
      registry guarantees at most one `animate` canvas; `interactive` pointer ripple within 100ms; zero frames when paused
    - Static SVG fallback with identical dimensions (no layout shift) on gate `static`, context creation failure or
      context loss, with no user-visible error
    - _Requirements: 16.5, 16.6, 16.7, 16.9, 16.10, 16.11, 16.12, 24.7_

  - [x] 2.8 Write unit and property tests for the water components
    - **Property 5: Reduced motion**
    - **Validates: Requirements 15.4, 16.1, 17.1, 17.2, 17.3, 17.4**
    - Test props, ARIA roles, and reduced versus normal motion for `LiquidMeter`, `WaveDivider`, `useRipple`,
      `TideTransition`, `WaterCanvas` (mock WebGL)
    - _Requirements: 25.1_

- [x] 3. Shared UI primitives
  - [x] 3.1 Implement `components/ui/Field.jsx`
    - Visible label, optional hint, inline error; `aria-describedby` links hint and error; `aria-invalid` set on error
      and cleared within 200ms of the value becoming valid
    - _Requirements: 19.1, 19.2_

  - [x] 3.2 Implement `components/ui/DataTable.jsx`
    - Props `columns, rows, getRowId, onRowSelect, caption`; sort toggle via click/Enter/Space with direction icon and
      `aria-sort`; Up/Down arrow row focus without wrapping; `onRowSelect` once per selection; stacked rows below 640px
      with column labels; required non-empty caption; zero-row state keeps headers plus message
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9_

  - [x] 3.3 Write property test for table sort order
    - **Property 11: Table sort order**
    - **Validates: Requirements 20.1**

  - [x] 3.4 Implement `components/ui/Stepper.jsx`
    - Props `steps, current, onSelect`; shows step number, total, and not-started/current/completed indicator with text
    - _Requirements: 4.3, 12.3_

  - [x] 3.5 Implement the Toast viewport
    - `aria-live="polite"`, 5s auto-dismiss, pause on pointer or focus within and resume with remaining time; certificate
      toast variant that stays at least 5s or until dismissed
    - _Requirements: 18.5, 18.6, 21.9, 8.9_

  - [x] 3.6 Restyle `Modal` and `Tabs` for accessibility
    - Modal: focus moves inside within 100ms, Tab trap, restore focus on close, fall back to body if the opener is gone
    - Tabs: roles `tablist/tab/tabpanel`, single `aria-selected`, Left/Right arrows with wrapping
    - Restyle `Button`, `Panel`, `Tag` with radii and focus ring tokens
    - _Requirements: 18.7, 18.8, 21.3, 21.4, 21.5, 21.6, 21.7_

  - [x] 3.7 Implement the page-state set
    - Restyle `Skeleton` (same container dimensions as final layout), `EmptyState` (text plus exactly one primary action)
      and `ErrorState` (shows `{ error }` message and Retry; retains previous data; Retry disabled while pending)
    - Add a `useDataState` helper or `DataBoundView` wrapper used by all data-bound pages
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.9_

  - [x] 3.8 Write unit tests for primitives
    - Field, DataTable, Stepper, Toast, Modal, Tabs, page-state components: props, roles, reduced-motion, keyboard
    - _Requirements: 25.1_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Shell, routing and session handling
  - [x] 5.1 Implement `navItemsFor(user)` and verify route guards
    - Null or unknown role returns `[]`; Learner returns "My pathway" then "Account"; Recruiter "Employer tools";
      CourseProvider "Provider studio"; only items passing the role's guard; omit groups left empty
    - Confirm `LearnerRoute`, `RecruiterRoute`, `CourseProviderRoute`, `CourseStudioRoute` redirect to the user's own
      `getDashboardPath` without rendering page content
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 5.2 Write property test for nav reachability
    - **Property 2: Nav reachability**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
    - fast-check over arbitrary role strings, at least 100 cases

  - [x] 5.3 Write property test for role isolation
    - **Property 1: Role isolation**
    - **Validates: Requirements 1.2, 1.3**
    - Render routes under `MemoryRouter` for each role and every foreign-guarded path

  - [x] 5.4 Update `api/client.js` and add offline handling
    - Keep `XMLHttpRequest`; on 401 (except refresh) refresh exactly once and replay once, otherwise sign out, clear
      tokens and go to `/login` with return path within 2s; 403 redirect to own dashboard within 1s; 429 10s submit
      cooldown message; network error sets offline state, up to 3 automatic retries, first within 5s of connectivity
      returning; manual retry after 3 failures
    - Create the `OfflineBanner` component ("You're offline", removed within 1s on success) and its store
    - Never put tokens in URLs or console logs
    - _Requirements: 1.3, 22.1, 22.2, 22.4, 22.5, 22.6, 22.7, 22.8, 24.4_

  - [x] 5.5 Rebuild the `AppShell` layout
    - Rail 248px and topbar 70px at 1024px and up; 72px icon-only rail at 640-1023px; below 640px bottom `MobileNav`
      with at most 5 entries (first 4 plus "More" when over 5); skip-link first in tab order, moves focus to
      `main#main-content` within 100ms; 44px touch targets and no horizontal scroll from 360px; breakpoint changes
      apply within 300ms without losing route or form state; mount `OfflineBanner`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 22.5_

  - [x] 5.6 Wire routing in `App.jsx`
    - One lazy chunk per page with a retryable chunk-load error state; wrap route outlet in `TideTransition`
    - Visitor to authenticated route redirects to `/login` preserving path and query; post-login return path honoured only
      if permitted for the role, else role dashboard; sign-in navigates within 1s
    - `NotFoundPage` links to role dashboard or `/`; `/profile` and `/help` for all three roles, redirect Visitors to login
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7, 13.6, 13.7, 23.5, 23.8_

  - [x] 5.7 Write unit tests for shell, API client and routing
    - Breakpoint layouts, More overflow, skip-link, 401 refresh-once, 429 cooldown, offline retry, return-path logic
    - _Requirements: 25.1_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Public and authentication pages
  - [x] 7.1 Restyle `LoginPage`, `ForgotPasswordPage`, `ResetPasswordPage` and `ConfirmEmailPage`
    - Login: inline field errors beneath fields, focus first affected field, keep other values, 429 message and
      10s disabled submit; Forgot: identical neutral confirmation; Reset: strength meter with Weak/Fair/Good/Strong on
      each keystroke; Confirm: success with `/login` link, expired state with resend and result message
    - _Requirements: 4.1, 4.2, 4.6, 4.7, 4.8, 4.9, 19.5, 19.6, 19.8_

  - [x] 7.2 Rebuild `RegisterPage` as a two-step Stepper
    - Learner or company flow; resume PDF/DOCX up to 5 MB with parsed preview within 10s; reject wrong type, oversize or
      unparseable with a reason, no preview, other data retained; load `pdfjs` and `mammoth` lazily only here
    - _Requirements: 4.3, 4.4, 4.5, 23.7_

  - [x] 7.3 Rebuild `LandingPage`
    - Hero with `WaterCanvas` (static fallback when disallowed), `WaveDivider` between each pair of sections, specific
      copy with no placeholder text, no hard-coded statistics
    - Fetch unauthenticated stats with a 5s timeout; show both counts only when valid non-negative integers, otherwise
      omit the stats section with no visible error, zero or cached values
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 16.8_

  - [x] 7.4 Add legal template, public company profile and `/verify/:serialNumber`
    - Shared reading template for `/privacy` and `/terms` with identical typography
    - `CompanyProfilePage`: profile with job list, no-posts message, not-found or error state with link to landing and no
      other company data
    - New `VerifyCertificatePage` outside the Shell calling `GET /api/certificates/verify/{serialNumber}`: loading,
      result, 404 "not available" with link to `/`, and error with retry on network error, timeout over 10s or 5xx;
      register the route in `App.jsx`
    - _Requirements: 5.7, 5.8, 5.9, 5.10, 10.4, 10.5, 10.6, 10.7_

  - [x] 7.5 Write unit tests for public pages
    - Stats present and omitted cases, stepper, resume validation, verify page states, company profile states
    - _Requirements: 25.1_

- [x] 8. Learner pages
  - [x] 8.1 Rebuild `OverviewPage` and `SkillsPage`
    - Overview: exactly "Next move", "This week", "Pathway" regions in order; gap count and role name or no-gap/no-role
      text; at most 3 applications newest first or empty text; one `LiquidMeter` per pathway skill; `WaterCanvas` hero
      with `WaveDivider` base
    - Skills: solid style plus "Verified" text, outlined plus "Declared" text
    - Both pages: error state with retry that re-requests data
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 16.8_

  - [x] 8.2 Rebuild `JobsPage`
    - Sticky filter bar; filters synced to URL within 500ms without reload; apply valid URL filters and ignore invalid
      ones; empty state with clear-filters control; match percentage as whole number plus "%" or "—"
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 15.11_

  - [x] 8.3 Rebuild `JobDetailPage` and `ApplicationsPage`
    - Gap breakdown beside the apply panel at 1024px and up; "Close gap" navigates to `CoursesPage` filtered by skill
      category; already-applied state with disabled apply and no duplicate or error toast; failed submit shows error
      toast and keeps apply enabled
    - Applications: status timeline plus text status label
    - _Requirements: 7.7, 7.8, 7.9, 7.10, 7.11, 21.8_

  - [x] 8.4 Rebuild `CoursesPage` and `CourseContentPage`
    - Courses: continue-learning strip (1 to 10, most recent first) above recommended, omitted when empty; already
      enrolled state without error toast or progress change
    - Player: three panes at 1024px and up, notes/discussion bottom sheet 640-1023px, outline drawer below 640px;
      saved indicator within 1s lasting at least 2s and overall `LiquidMeter` update within 1s; failed save shows error,
      keeps meter and lesson position; certificate toast within 1s
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [x] 8.5 Rebuild `AssessmentsPage` proctoring flow
    - Pre-flight step explaining camera need, no permission prompt until continue; prompt within 1s of continue; on
      `NotAllowedError` show explanation, browser-help link, retry (prompt again within 1s) and leave (navigate away
      within 1s) with attempt unstarted; integrity warnings as text plus icon or border within 1s, never sound-only;
      score shown with `LiquidMeter` (fill = score / max); load `mediapipe` lazily only here
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 23.6_

  - [x] 8.6 Rebuild `CredentialsPage` and `CertificateDetailPage`
    - Grid of certificates each with verify link to `/verify/:serialNumber`; empty state when none; printable detail
      layout hiding navigation, Shell and action buttons in print CSS
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 8.7 Write property test for idempotent actions
    - **Property 9: Idempotent actions**
    - **Validates: Requirements 7.9, 8.3**
    - Generate repeated apply and enroll sequences and assert no error toast and no duplicate request effect

  - [x] 8.8 Write unit tests for Learner pages
    - Region order, URL filter parsing, drawer/sheet breakpoints, camera flow, apply error path, certificate toast
    - _Requirements: 25.1_

- [x] 9. Recruiter pages
  - [x] 9.1 Rebuild `BusinessDashboardPage`
    - Demand chart uses only API series points; missing, null or empty series shows `EmptyState` with no axes; failed
      or over-10s request shows error with retry while the rest of the page stays visible
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 9.2 Rebuild `PostJobPage` and `EditJobPage` on one shared form
    - Labelled sections, live preview updating within 300ms, edit reuses the form pre-populated; invalid required fields
      block submit, show errors by each field and keep values; error summary for forms over 5 fields with focus
      handling; unsaved-changes route-leave prompt
    - _Requirements: 11.4, 11.5, 11.6, 19.3, 19.4, 19.7_

  - [x] 9.3 Rebuild `JobApplicationsPage`
    - `DataTable` of applicants with side detail pane (skills, AI rank, status actions) on row select; "not ranked"
      indication when rank missing; on AI 502/503 show "Suggestions are unavailable right now", keep unranked order and
      status actions enabled
    - _Requirements: 11.7, 11.8, 11.10_

  - [x] 9.4 Rebuild `CompanyProfileEditPage`
    - Live public-profile preview updating within 300ms; unsaved-changes route-leave prompt
    - _Requirements: 11.9, 19.7_

  - [x] 9.5 Write unit tests for Recruiter pages
    - Chart states, form validation and preview timing, applicant pane, AI failure path
    - _Requirements: 25.1_

- [x] 10. CourseProvider and Course Studio
  - [x] 10.1 Rebuild `ProviderDashboardPage`
    - Only own courses grouped under Draft and Published headings with counts
    - _Requirements: 12.1_

  - [x] 10.2 Rebuild Course Studio (`CourseManagementPage`)
    - Own courses grouped Draft/Published within 2s of the list response; four-step Stepper (Basics, Outline, Lessons,
      Publish) preserving data across steps; autosave indicator "Saving/Saved/Save failed" updated within 1s with up to
      3 retries at 5s intervals keeping unsaved edits; delete 409 shows modal with unpublish guidance and keeps course
      listed; upload 413 shows field error naming 500MB video or 10MB document limit and discards the file; AI draft
      502/503 shows "Suggestions are unavailable right now" with manual controls enabled; unsaved-changes route-leave
      prompt; destructive actions use confirm `Modal`
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 19.7, 18.7_

  - [x] 10.3 Write unit tests for Provider pages and Course Studio
    - Grouping and counts, stepper data retention, autosave retry timing, 409/413/502 handling
    - _Requirements: 25.1_

- [x] 11. Profile, help and security
  - [x] 11.1 Rebuild `ProfilePage` and `HelpPage`
    - Profile: labelled sections and a light/dark theme toggle applied within 500ms and persisted across reloads
    - Help: case-insensitive substring FAQ search within 300ms of last keystroke, no-results message keeping the query,
      clearing restores all entries
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 11.2 Harden markdown rendering and analytics consent
    - Shared render util: `marked` then `DOMPurify`; on thrown error fall back to escaped plain text
    - Initialise PostHog only after cookie consent; stop sending within 1s of consent withdrawal
    - _Requirements: 24.1, 24.2, 24.3, 24.5, 24.6_

  - [x] 11.3 Write unit tests for profile, help and security utilities
    - Theme persistence, FAQ filter edge cases, sanitisation of script/handler/`javascript:` content, consent gating
    - _Requirements: 25.1_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Verification tooling and rollout gates
  - [x] 13.1 Add Playwright role suites
    - For Learner, Recruiter and CourseProvider: login, correct dashboard, visit every nav item, assert zero console
      errors
    - _Requirements: 25.3_

  - [x] 13.2 Add axe accessibility scans
    - `@axe-core/playwright` on every page in light, dark and `reducedMotion: 'reduce'`; fail on serious or critical
    - _Requirements: 21.1, 25.4_

  - [x] 13.3 Add visual regression screenshots
    - 10 most-visited pages at 360, 768 and 1280px in both themes (60 shots) with `WaterCanvas` replaced by its static
      fallback; fail on over 0.1% pixel difference and keep diff images
    - _Requirements: 25.5, 25.8_

  - [x] 13.4 Add the ship gate script and CI wiring
    - Run `npm test`, `npm run lint`, `npm run build` and the Playwright suite; block and name the failing check on any
      non-zero exit; permit shipping when all pass (update `.github/workflows/ci.yml`)
    - Add bundle-size check (landing initial JS at most 184,320 gzip bytes) and assert no mediapipe/pdfjs/mammoth/shader
      chunk in the initial landing load
    - _Requirements: 23.4, 23.6, 23.7, 16.11, 25.6, 25.7_

  - [x] 13.5 Add performance measurement tests
    - Playwright run with 4G throttling, at least 5 runs, checking LCP, CLS and INP at p75 against 2.5s, 0.05 and 200ms
    - _Requirements: 23.1, 23.2, 23.3_

  - [x] 13.6 Write property test for no colour-only signals
    - **Property 7: No colour-only signals**
    - **Validates: Requirements 21.8**
    - Render every application, assessment, lesson and integrity status value and assert text or labelled icon

  - [x] 13.7 Write page-states completeness test
    - **Property 10: Page states complete**
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.9**
    - Enumerate every data-bound page and assert loading, empty and error states render

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (fast-check, at least 100 cases each)
- Unit tests validate specific examples and edge cases
- Scope covers only Learner, Recruiter, CourseProvider and Visitor; no other roles are implemented

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "2.1", "3.1", "3.2", "3.4", "3.5", "3.6", "5.1", "5.4", "11.2"] },
    { "id": 2, "tasks": ["1.3", "2.2", "2.3", "2.4", "2.5", "2.6", "3.3", "3.7", "5.2"] },
    { "id": 3, "tasks": ["2.7", "3.8", "5.5"] },
    { "id": 4, "tasks": ["2.8", "5.3", "5.6", "5.7"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "9.1", "9.2", "9.3", "9.4", "10.1", "10.2", "11.1"] },
    { "id": 6, "tasks": ["7.5", "8.7", "8.8", "9.5", "10.3", "11.3"] },
    { "id": 7, "tasks": ["13.1", "13.2", "13.3", "13.4", "13.5", "13.6", "13.7"] }
  ]
}
```

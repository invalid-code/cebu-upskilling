# Frontend — React 19 + Vite 6 SPA

Learner/recruiter single-page app: auth, skill gaps, assessments, courses, jobs, applications, dashboards.

Related docs: [Root README](../README.md) · [API Reference](../docs/API.md) · [Architecture](../docs/ARCHITECTURE.md)

## Prerequisites

- Node **26** (`../.nvmrc`) — run `nvm use` before npm commands.
- Backend API running (dev: `http://localhost:5000`, see [backend README](../CebuUpskilling.Backend/README.md)).

## Scripts

| Command | What it does |
|---------|--------------|
| `npm ci` / `npm run dev -- --port 5173 --host 127.0.0.1` | Install / start dev server on `:5173` |
| `npm run build` / `npm run preview` | Production build to `dist/` / preview it |
| `npm test` / `npm run test:watch` | vitest single run / watch mode |
| `npm run test:e2e` (+ `:ui`, `:headed`) | Playwright (chromium, baseURL `:5173`, boots dev server) |
| `npm run lint` | **oxlint** (not ESLint) |

Coverage thresholds (in `vite.config.js`): lines 50, branches 45, functions 40.

## Dev server & API proxy

- `vite.config.js` proxies `/api` → `http://localhost:5000`.
- Override with `VITE_API_URL` (see `.env.example`, `.env.development`).
- `src/api/client.js` uses **`XMLHttpRequest` deliberately, not `fetch`** — a browser extension patches `window.fetch` and rewrites URLs. Do NOT "modernize" it to `fetch`.

## Structure

```
src/
  api/client.js        # XHR client: JWT attach, expiry pre-check, 401 → clear + /login, friendly errors
  lib/                 # jwt (decode/expiry/session), markdown (marked + DOMPurify), proctoring, parsePolling
  utils/               # validation, fileUrl (R2/legacy /uploads), resumeText (lazy pdfjs/mammoth)
  stores/              # Zustand: auth, enrollments, applications, toast, notification, cookieConsent
  context/             # Thin shims over the stores (Auth, Enrollments, Applications, Toast, CookieConsent)
  components/          # Layout, RoleRoute, GoogleSignInButton, jobs/, shared/ (15), ui/ (9)
  pages/               # ~21 route pages (Overview, Skills, Jobs, Courses, …)
  App.jsx              # Router: PublicRoute / ProtectedRoute + Learner/Recruiter/CourseProvider/CourseStudio routes
  main.jsx / index.css
e2e/                   # Playwright specs + helpers (mock API, fake token) + fixtures
```

## Auth & routing

- JWT + user JSON in `localStorage` (`stores/authStore.js`); `logout()` clears locally then best-effort `POST /auth/logout`.
- `ProtectedRoute` (in `App.jsx`) gates on the stored user; role routes (`RoleRoute.jsx`) split Learner/Recruiter/CourseProvider/CourseStudio.
- Server is the authority: expired/revoked tokens get 401 → session cleared → `/login` (loop-guarded).

## Notes

- Heavy deps (`@mediapipe/tasks-vision`, `pdfjs-dist`, `mammoth`, `marked`) are lazy-imported; keep them out of the initial bundle.
- `Modal` implements focus trap / `Escape` / opener-restore; `index.css` honors `prefers-reduced-motion`.
- If `/api` hits an unexpected host, check for the `fetch`-patching extension — XHR must stay.

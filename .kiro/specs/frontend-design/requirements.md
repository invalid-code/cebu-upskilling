# Requirements Document

## Introduction

The Cebu Upskilling web SPA (`frontend/`) is a career-pathway platform for Cebu. This feature formalizes the current
information architecture and introduces a new visual and motion direction, "Tide", with targeted UX improvements.
The audiences are exactly three authenticated roles (Learner, Recruiter, CourseProvider) plus unauthenticated
Visitors. The scope is web only, responsive down to 360px, English only. The existing API contract is unchanged.

## Glossary

- **Web_App**: The Cebu Upskilling React single-page application in `frontend/`.
- **Visitor**: An unauthenticated user of the Web_App.
- **Learner**: An authenticated user who builds a skill profile, finds jobs, takes courses and assessments.
- **Recruiter**: An authenticated user who posts jobs, reviews applicants and authors courses.
- **CourseProvider**: An authenticated user who publishes course curriculum.
- **Route_Guard**: The component set (`LearnerRoute`, `RecruiterRoute`, `CourseProviderRoute`, `CourseStudioRoute`)
  that restricts routes by role.
- **Dashboard_Path**: The landing route of a role: `/dashboard` (Learner), `/business-dashboard` (Recruiter),
  `/provider-dashboard` (CourseProvider).
- **Shell**: The authenticated layout containing the left rail, topbar and mobile navigation.
- **Nav_Resolver**: The function `navItemsFor(user)` that returns the navigation groups for a user.
- **Liquid_Meter**: The component that displays a 0â€“100 value as an animated fill with a printed text value.
- **Meter_Calculator**: The function `computeMeterLevel(value, reduced)` that returns level, wave amplitude and label.
- **Water_Canvas**: The WebGL caustic-light surface used on the landing hero and learner dashboard hero.
- **Canvas_Gate**: The function `shouldRenderWaterCanvas(env, activeCanvasCount)` that returns `animate`, `paused` or
  `static`.
- **Static_Fallback**: The static SVG wave on the same gradient and dimensions as the Water_Canvas.
- **Motion_Preference**: The hook `useMotionPreference` returning `reduced`, `canUseWebGL`, `saveData`, `allowAmbient`.
- **Tide_Transition**: The route-change cross-fade of 220ms with 6px vertical drift.
- **Ripple**: The radial pointer-origin feedback on primary buttons and success confirmations.
- **Wave_Divider**: The two-layer SVG wave separating landing sections and the dashboard hero base.
- **Design_Tokens**: The CSS custom properties for colour, typography, spacing, radius and motion.
- **Page_State_Set**: The loading, empty and error states of a data-bound page.
- **Toast_Viewport**: The `aria-live="polite"` region that shows non-blocking notifications.
- **Data_Table**: The sortable, keyboard-navigable table component that stacks rows below 640px.
- **Stepper**: The multi-step progress component used by registration and the Course Studio.
- **Course_Studio**: The shared course authoring pages (`/company-courses`) for Recruiter and CourseProvider.
- **API_Client**: `api/client.js`, which performs requests using `XMLHttpRequest`.
- **Match_Percentage**: An integer 0â€“100 showing how closely a Learner's skills match a job.

## Requirements

### Requirement 1: Role-based route access

**User Story:** As a user, I want to see only the pages meant for my role, so that I always land somewhere useful.

#### Acceptance Criteria

1. WHEN a Learner, Recruiter or CourseProvider signs in successfully, THE Web_App SHALL navigate to the Dashboard_Path
   of that role within 1 second of the sign-in response being received.
2. IF an authenticated user requests a route guarded for a different role, THEN THE Route_Guard SHALL redirect the
   user to the Dashboard_Path of the user's own role without rendering the requested page content.
3. IF an API request made by an authenticated user returns HTTP 403, THEN THE Web_App SHALL redirect the user to the
   Dashboard_Path of the user's own role within 1 second of receiving the response and SHALL NOT render the content of
   the page that issued the request.
4. IF a Visitor requests an authenticated route, THEN THE Web_App SHALL redirect the Visitor to `/login` without
   rendering the requested page content and SHALL preserve the requested path, including its query string, as the
   return path.
5. WHEN a Visitor signs in successfully and a return path is preserved, THE Web_App SHALL navigate to the return path
   if the route is permitted for the signed-in user's role, and otherwise to the Dashboard_Path of the user's own
   role.
6. WHEN the NotFoundPage renders for an authenticated user, THE Web_App SHALL display a link to that user's
   Dashboard_Path.
7. WHEN the NotFoundPage renders for a Visitor, THE Web_App SHALL display a link to `/`.

### Requirement 2: Role-aware navigation

**User Story:** As a user, I want navigation that lists only destinations I can open, so that no link sends me away.

#### Acceptance Criteria

1. IF the user is null, THEN THE Nav_Resolver SHALL return an empty list of navigation groups.
2. WHEN the user role is Learner, THE Nav_Resolver SHALL return exactly two navigation groups, "My pathway" and
   "Account", in that order, and no other groups.
3. WHEN the user role is Recruiter, THE Nav_Resolver SHALL return exactly one navigation group, "Employer tools", and
   no other groups.
4. WHEN the user role is CourseProvider, THE Nav_Resolver SHALL return exactly one navigation group, "Provider
   studio", and no other groups.
5. THE Nav_Resolver SHALL include in each returned group only items whose route passes the Route_Guard of the user's
   role.
6. IF every item in a navigation group has a route that fails the Route_Guard of the user's role, THEN THE
   Nav_Resolver SHALL omit that group from the returned list.
7. IF the user role is not one of Learner, Recruiter, or CourseProvider, THEN THE Nav_Resolver SHALL return an empty
   list of navigation groups.

### Requirement 3: Responsive shell

**User Story:** As a user on any device, I want the navigation to fit my screen, so that I can use the app from 360px
upward.

#### Acceptance Criteria

1. WHILE the viewport width is 1024px or greater, THE Shell SHALL display a left rail with a width of 248px and a
   topbar with a height of 70px.
2. WHILE the viewport width is between 640px and 1023px inclusive, THE Shell SHALL display the left rail as an
   icon-only rail with a width of 72px, and SHALL display each navigation destination as an icon without a visible
   text label.
3. WHILE the viewport width is below 640px, THE Shell SHALL hide the left rail and display a bottom MobileNav showing
   at most 5 entries.
4. WHILE the viewport width is below 640px and the user has more than 5 navigation destinations, THE Shell SHALL
   display the first 4 destinations plus a "More" entry as the fifth entry, and SHALL list the remaining destinations
   in the "More" entry.
5. WHILE the viewport width is below 640px and the user has 5 or fewer navigation destinations, THE Shell SHALL
   display all destinations in the MobileNav without a "More" entry.
6. WHEN the user activates the skip-link, THE Shell SHALL move keyboard focus to the `main#main-content` element
   within 100ms.
7. WHEN the user presses Tab as the first keyboard interaction on a page load, THE Shell SHALL make the skip-link the
   first focused element and visible in the viewport.
8. WHILE the viewport width is between 360px and 639px inclusive, THE Web_App SHALL render every interactive control
   with a touch target of at least 44px by 44px, and SHALL display page content without horizontal scrolling.
9. WHEN the viewport width crosses the 640px or 1024px breakpoint, THE Shell SHALL apply the layout for the new width
   range within 300ms without reloading the page and without losing the current route or entered form data.

### Requirement 4: Authentication and onboarding pages

**User Story:** As a visitor, I want clear sign-in, registration and recovery flows, so that I can get into my account.

#### Acceptance Criteria

1. WHEN the login API returns a field validation error, THE LoginPage SHALL display the error text inline directly
   beneath each affected field, retain all values the user entered in the other fields, and move keyboard focus to
   the first affected field.
2. IF the login API returns HTTP 429, THEN THE LoginPage SHALL display the text "Too many attempts, try again in a
   minute", disable the submit control for 10 seconds, and re-enable the submit control when the 10 seconds elapse.
3. THE RegisterPage SHALL present registration as a two-step Stepper that shows the current step number, the total
   step count of 2, and a visual indicator marking each step as not started, current, or completed.
4. WHEN a Learner uploads a resume in PDF or DOCX format of 5 MB or smaller during registration, THE RegisterPage
   SHALL display a preview of the parsed resume content within 10 seconds of upload completion.
5. IF a Learner uploads a resume that is not in PDF or DOCX format, exceeds 5 MB, or cannot be parsed, THEN THE
   RegisterPage SHALL display an error message indicating the reason for rejection, display no preview, and retain
   all other registration data already entered.
6. WHEN the ConfirmEmailPage receives a valid token, THE ConfirmEmailPage SHALL display a success state with a link to
   `/login`.
7. IF the ConfirmEmailPage receives an expired token, THEN THE ConfirmEmailPage SHALL display an expired state with a
   resend action, and WHEN the resend action is activated, THE ConfirmEmailPage SHALL display a confirmation that a
   new email was sent or an error message indicating the request failed.
8. WHEN a password is entered on the ResetPasswordPage, THE ResetPasswordPage SHALL update a password strength meter
   on each keystroke, showing a text label of exactly one of "Weak", "Fair", "Good", or "Strong".
9. WHEN a reset request is submitted on the ForgotPasswordPage, THE ForgotPasswordPage SHALL display the same neutral
   confirmation copy, identical in text and layout, regardless of whether the email exists.

### Requirement 5: Landing page and public pages

**User Story:** As a visitor, I want a landing page with real information, so that I can decide whether to register.

#### Acceptance Criteria

1. THE LandingPage SHALL contain no placeholder text (including "Lorem ipsum", "TODO", "TBD", and "Coming soon") and
   no statistic values hard-coded in the Web_App source.
2. WHEN the LandingPage loads and the unauthenticated statistics source returns a response within 5 seconds
   containing a non-negative integer Cebu job count and a non-negative integer Cebu course count, THE LandingPage
   SHALL display both counts exactly as returned by the API response.
3. IF the unauthenticated statistics source is unavailable, returns an error, does not respond within 5 seconds, or
   returns a response missing either count or containing a count that is not a non-negative integer, THEN THE
   LandingPage SHALL omit the statistics section entirely, SHALL display no zero, default, or cached count values in
   its place, and SHALL render all other sections without a visible error.
4. WHEN the LandingPage loads, THE LandingPage SHALL display a hero section containing the Water_Canvas.
5. IF the Water_Canvas cannot be rendered in the visitor's browser, or the visitor has requested reduced motion, THEN
   THE LandingPage SHALL display the Static_Fallback in the hero section in place of the Water_Canvas.
6. THE LandingPage SHALL place one Wave_Divider between each pair of adjacent sections on the page.
7. WHEN a visitor navigates to `/privacy` or `/terms`, THE Web_App SHALL render the corresponding page using the same
   shared reading template, with identical typography (font family, font size, line height, and maximum content
   width) on both pages.
8. WHEN a visitor navigates to `/companies/:companyId` and a company with that `companyId` exists, THE Web_App SHALL
   display the public company profile and the list of that company's job posts without requiring authentication.
9. IF a visitor navigates to `/companies/:companyId` and no company with that `companyId` exists or the company data
   request fails, THEN THE Web_App SHALL display a not-found or error message indicating the company could not be
   loaded, SHALL provide a link back to the LandingPage, and SHALL NOT display any other company's data.
10. WHEN a company has no job posts, THE Web_App SHALL display the company profile together with a message indicating
    that no job posts are currently available.

### Requirement 6: Learner dashboard and skills

**User Story:** As a Learner, I want a dashboard that tells me my next move, so that I can close my skill gaps.

#### Acceptance Criteria

1. WHEN the Learner opens the OverviewPage, THE OverviewPage SHALL present exactly three regions, in this order, each
   with a visible heading: "Next move", "This week" and "Pathway".
2. WHEN the Learner has a target role with one or more open skill gaps, THE OverviewPage SHALL display the integer
   count of remaining gaps and the target role name in the "Next move" region.
3. IF the Learner has no target role, or the target role has zero open skill gaps, THEN THE OverviewPage SHALL display
   in the "Next move" region a text message indicating that no skill gaps are open or that no target role is set, and
   SHALL NOT display a gap count.
4. WHEN the OverviewPage renders the "Pathway" region, THE OverviewPage SHALL render exactly one Liquid_Meter per
   pathway skill, each labelled with the skill name and showing its current proficiency value from 0 to 100 percent.
5. WHEN the SkillsPage renders a skill, THE SkillsPage SHALL render each verified skill with a solid style and each
   declared skill with an outlined style, and SHALL show the text label "Verified" or "Declared" on each skill
   respectively.
6. WHEN the OverviewPage renders the "This week" region, THE OverviewPage SHALL display the Learner's open
   applications as a timeline of at most three entries, ordered from most recent to oldest by application date.
7. IF the Learner has no open applications, THEN THE OverviewPage SHALL display in the "This week" region a text
   message indicating that there are no open applications, and SHALL NOT render a timeline.
8. IF the OverviewPage or SkillsPage fails to load Learner data, THEN THE page SHALL display an error message
   indicating that the data could not be loaded and SHALL provide a retry control that, when activated, requests the
   data again.

### Requirement 7: Jobs and applications

**User Story:** As a Learner, I want to search jobs and see how well I match, so that I can apply with confidence.

#### Acceptance Criteria

1. THE JobsPage SHALL display a filter bar that remains fixed at the top of the viewport while the job list is
   scrolled.
2. WHEN a Learner changes a filter value on the JobsPage, THE JobsPage SHALL update the URL query string to reflect
   all current filter values within 500 milliseconds, without a full page reload.
3. WHEN the JobsPage loads with filter values in the URL query string, THE JobsPage SHALL apply those filters and
   display only jobs matching all of them.
4. IF the URL query string contains a filter value that is not valid (unknown filter name or value outside the
   allowed options), THEN THE JobsPage SHALL ignore that filter value, apply the remaining valid filters, and keep
   the page usable without displaying an error page.
5. WHEN no jobs match the applied filters, THE JobsPage SHALL display an empty-state message indicating that no jobs
   were found and a control to clear all filters.
6. THE JobsPage SHALL display the Match_Percentage on each job row as a whole number from 0 to 100 followed by a
   percent sign.
7. THE JobDetailPage SHALL display the skill gap breakdown, listing each required skill the Learner lacks, in a panel
   positioned beside the apply panel on viewports of 1024 pixels width or greater.
8. WHEN a Learner selects "Close gap" on a skill, THE Web_App SHALL navigate to the CoursesPage filtered by the
   category of that skill.
9. WHEN a Learner applies to a job that the Learner has already applied to, THE JobDetailPage SHALL display the
   "already applied" state, keep the apply control disabled, create no duplicate application, and display no error
   toast.
10. IF an application submission fails because of a network or server error, THEN THE JobDetailPage SHALL display an
    error toast indicating the application was not submitted and keep the apply control enabled so the Learner can
    retry.
11. THE ApplicationsPage SHALL display each application with a status timeline and a text status label that names the
    current status, so that status is not conveyed by color alone.

### Requirement 8: Courses and course player

**User Story:** As a Learner, I want to find, start and continue courses, so that I can build skills.

#### Acceptance Criteria

1. THE CoursesPage SHALL display the continue-learning strip above the recommended courses section, and the strip
   SHALL list between 1 and 10 in-progress courses, ordered by most recently accessed first.
2. IF the Learner has no in-progress courses, THEN THE CoursesPage SHALL omit the continue-learning strip and display
   the recommended courses section first.
3. WHEN a Learner enrolls in a course the Learner is already enrolled in, THE CoursesPage SHALL display the "already
   enrolled" state on that course, SHALL NOT display an error Toast, and SHALL leave the existing enrollment and
   progress unchanged.
4. WHILE the viewport width is 1024px or greater, THE CourseContentPage SHALL display the outline, lesson and
   notes/discussion panes side by side in a single row.
5. WHILE the viewport width is between 640px and 1023px inclusive, THE CourseContentPage SHALL display the
   notes/discussion pane as a bottom sheet that is closed by default and opens when the Learner activates the
   notes/discussion control.
6. WHILE the viewport width is below 640px, THE CourseContentPage SHALL display the outline as a drawer that is
   closed by default and opens when the Learner activates the outline control.
7. WHEN a lesson progress update is saved successfully, THE CourseContentPage SHALL display a saved indication within
   1 second that remains visible for at least 2 seconds, and SHALL update the overall Liquid_Meter to the new
   progress percentage (0 to 100) within 1 second.
8. IF saving a lesson progress update fails, THEN THE CourseContentPage SHALL display an error indication that the
   progress was not saved, SHALL leave the Liquid_Meter at its previous value, and SHALL retain the Learner's current
   lesson position.
9. WHEN the API returns a certificate after lesson progress reaches 100%, THE CourseContentPage SHALL display a
   certificate Toast within 1 second that remains visible for at least 5 seconds or until dismissed by the Learner.

### Requirement 9: Assessments

**User Story:** As a Learner, I want to know what a proctored assessment requires, so that I can take it without
surprises.

#### Acceptance Criteria

1. WHEN a Learner starts a proctored assessment, THE AssessmentsPage SHALL display a pre-flight step that states the
   reason the camera is needed and SHALL NOT invoke the browser camera permission prompt until the Learner selects a
   continue action on that step.
2. WHEN a Learner selects the continue action on the pre-flight step, THE AssessmentsPage SHALL invoke the browser
   camera permission prompt within 1 second.
3. IF camera permission is denied with `NotAllowedError`, THEN THE AssessmentsPage SHALL display text explaining why
   the camera is needed, a link to browser help for re-enabling camera permission, a retry action and a leave action,
   and SHALL keep the assessment attempt unstarted with no answers recorded.
4. WHEN a Learner selects the retry action after a camera permission denial, THE AssessmentsPage SHALL invoke the
   browser camera permission prompt again within 1 second.
5. WHEN a Learner selects the leave action after a camera permission denial, THE AssessmentsPage SHALL exit the
   assessment and navigate the Learner away from the attempt view within 1 second.
6. WHEN an integrity warning is raised during an attempt, THE AssessmentsPage SHALL display the warning within 1
   second as visible text accompanied by a non-audio visual indicator (an icon or a highlighted border), and SHALL NOT
   rely on sound to convey the warning.
7. THE AssessmentsPage SHALL display each assessment score using a Liquid_Meter that shows the score value as a number
   alongside the meter fill, with the fill proportion equal to the score divided by the maximum possible score.

### Requirement 10: Credentials and certificate verification

**User Story:** As a Learner or employer, I want to verify a certificate by serial number, so that credentials can be
trusted.

#### Acceptance Criteria

1. WHEN a Learner opens the CredentialsPage, THE CredentialsPage SHALL display each issued certificate as a grid item
   containing a verify link that navigates to `/verify/:serialNumber` for that certificate's serial number.
2. IF the Learner has zero issued certificates, THEN THE CredentialsPage SHALL display an empty-state message
   indicating no certificates have been issued and SHALL display no grid items.
3. WHEN a Learner opens the CertificateDetailPage, THE CertificateDetailPage SHALL display the certificate and its
   serial number in a printable layout in which navigation, the Shell, and action buttons are hidden when the page is
   printed.
4. THE Web_App SHALL provide a public route `/verify/:serialNumber` outside the Shell that is accessible without
   authentication.
5. WHEN a Visitor opens `/verify/:serialNumber`, THE Web_App SHALL request
   `GET /api/certificates/verify/{serialNumber}`, display a loading indicator until the response is received, and
   then display the verification result.
6. IF the verification request returns HTTP 404, THEN THE Web_App SHALL display "not available" text with a link to
   `/` and SHALL NOT display any certificate details.
7. IF the verification request fails with a network error, a timeout exceeding 10 seconds, or an HTTP 5xx response,
   THEN THE Web_App SHALL display an error message indicating verification could not be completed, together with a
   retry control that re-sends the request when activated.

### Requirement 11: Recruiter tools

**User Story:** As a Recruiter, I want efficient job and applicant tools, so that I can hire faster.

#### Acceptance Criteria

1. WHEN the BusinessDashboardPage finishes loading, THE BusinessDashboardPage SHALL render the demand chart using only
   data points from the API demand series and SHALL NOT render any data point that is absent from that series.
2. IF the API returns a demand series that is missing, null, or contains 0 data points, THEN THE
   BusinessDashboardPage SHALL display an EmptyState in place of the chart and SHALL NOT render chart axes or data
   points.
3. IF the API request for the demand series fails or does not respond within 10 seconds, THEN THE
   BusinessDashboardPage SHALL display an error indication with a retry control in place of the chart, and the other
   dashboard content SHALL remain displayed.
4. THE PostJobPage SHALL present the job form divided into labeled sections and a job post preview that updates within
   300 milliseconds after each field change, without requiring a form submission.
5. THE EditJobPage SHALL reuse the same form component as the PostJobPage, pre-populated with the saved values of the
   job being edited.
6. IF the Recruiter submits the PostJobPage or EditJobPage form with a required field empty or invalid, THEN THE page
   SHALL NOT submit the form, SHALL display an error indication next to each invalid field, and SHALL retain all
   values the Recruiter entered.
7. WHEN the JobApplicationsPage loads a job that has applicants, THE JobApplicationsPage SHALL display the applicants
   in a Data_Table and, WHEN the Recruiter selects an applicant row, SHALL open a side detail pane showing that
   applicant's skills, AI rank and status actions.
8. IF the selected applicant has no AI rank available, THEN THE JobApplicationsPage SHALL show a "not ranked"
   indication in the AI rank field of the side detail pane and keep the skills and status actions usable.
9. WHEN the CompanyProfileEditPage is displayed, THE CompanyProfileEditPage SHALL display a preview of the public
   company profile that updates within 300 milliseconds after each field change, without requiring a save.
10. IF the AI ranking service returns HTTP 502 or 503, THEN THE JobApplicationsPage SHALL display the message
    "Suggestions are unavailable right now", SHALL continue to display the applicants in the Data_Table in their
    unranked order, and SHALL keep status actions enabled for manual review.

### Requirement 12: Provider dashboard and Course Studio

**User Story:** As a Recruiter or CourseProvider, I want to author and publish courses, so that Learners can enroll.

#### Acceptance Criteria

1. WHEN a Recruiter or CourseProvider opens the ProviderDashboardPage, THE ProviderDashboardPage SHALL display only
   the courses owned by that user, grouped under the status headings Draft and Published, with a count of courses
   shown on each heading.
2. WHEN a Recruiter or CourseProvider opens the Course_Studio, THE Course_Studio SHALL display only the courses owned
   by that user, grouped under the headings Draft and Published, within 2 seconds of the course list response being
   received.
3. WHEN a Recruiter or CourseProvider starts course creation, THE Course_Studio SHALL present a Stepper with exactly
   four steps in the order Basics, Outline, Lessons and Publish, and SHALL indicate the current step, and SHALL
   preserve entered data when the user moves between steps.
4. WHILE a course is being edited, THE Course_Studio SHALL display an autosave indicator with a text state of
   "Saving", "Saved" or "Save failed", and SHALL update the text state within 1 second of each autosave attempt
   starting or completing.
5. IF an autosave attempt fails, THEN THE Course_Studio SHALL set the autosave indicator text to "Save failed", SHALL
   keep the unsaved edits in the form, and SHALL retry the autosave up to 3 times at 5-second intervals.
6. IF deleting a course returns HTTP 409, THEN THE Course_Studio SHALL display a Modal explaining that learners are
   enrolled and offering unpublish guidance, SHALL keep the course in the list with its current status, and SHALL
   provide a control that closes the Modal.
7. IF an upload returns HTTP 413, THEN THE Course_Studio SHALL display a field error on the upload field naming the
   limit of 500MB for video or 10MB for documents, SHALL discard the rejected file, and SHALL keep all other form
   data unchanged.
8. IF the AI draft service returns HTTP 502 or 503, THEN THE Course_Studio SHALL display the text "Suggestions are
   unavailable right now" and SHALL keep all manual authoring controls enabled.

### Requirement 13: Profile and help

**User Story:** As an authenticated user, I want settings and help, so that I can manage my account and find answers.

#### Acceptance Criteria

1. WHEN an authenticated user opens the ProfilePage, THE ProfilePage SHALL display its settings grouped into labeled
   sections, with a theme toggle offering exactly two options, light and dark, within one of those sections.
2. WHEN the user selects a theme option on the ProfilePage theme toggle, THE Web_App SHALL apply the selected theme to
   all pages within 500 milliseconds and retain the selection across page reloads and subsequent sessions on the same
   browser.
3. WHEN the user types in the HelpPage search field, THE HelpPage SHALL, within 300 milliseconds of the last
   keystroke, display only the FAQ entries whose question or answer text contains the query as a case-insensitive
   substring.
4. IF the HelpPage search query matches no FAQ entries, THEN THE HelpPage SHALL display a message indicating that no
   results were found and SHALL keep the search field value unchanged.
5. WHEN the user clears the HelpPage search field, THE HelpPage SHALL display all FAQ entries.
6. WHERE the authenticated user has the Learner, Recruiter or CourseProvider role, THE Web_App SHALL make the
   `/profile` and `/help` routes accessible to that user.
7. IF an unauthenticated visitor requests `/profile` or `/help`, THEN THE Web_App SHALL redirect the visitor to the
   login page without displaying the requested page content.

### Requirement 14: Design tokens and typography

**User Story:** As a user, I want a consistent, readable visual style, so that the interface feels coherent.

#### Acceptance Criteria

1. THE Web_App SHALL define each of the Design_Tokens `--bg`, `--surface`, `--surface2`, `--ink`, `--muted`, `--line`,
   `--teal`, `--teal-soft`, `--coral`, `--good`, `--danger` and `--amber-ink` with exactly one value for the light
   theme and exactly one value for the dark theme (24 token values in total).
2. THE Web_App SHALL render every text and background color pair used in either theme with a contrast ratio of at
   least 4.5:1 for text smaller than 24px (or smaller than 18.66px when bold), and at least 3:1 for text of 24px or
   larger (or 18.66px or larger when bold), and for UI component boundaries and icons.
3. THE Web_App SHALL render headings in Bricolage Grotesque, body text in Instrument Sans at a font size of 15px with
   a line height of 1.55, and numeric values in JetBrains Mono with tabular numerals enabled.
4. THE Web_App SHALL serve Bricolage Grotesque, Instrument Sans and JetBrains Mono exclusively from self-hosted
   assets, with `font-display: swap` and the Latin subset only, and SHALL make zero requests to third-party font
   hosts.
5. IF a self-hosted font fails to load within 3000 ms, THEN THE Web_App SHALL continue to render text using a fallback
   font, SHALL keep all text visible and readable, and SHALL NOT block page interaction.
6. THE Web_App SHALL restrict font sizes to the type scale of 12px, 13px, 15px, 17px, 20px, 24px, 32px and 44px.
7. THE Web_App SHALL restrict spacing values (margin, padding and gap) to multiples of 4px, and SHALL use border radii
   of 8px for controls, 14px for panels and 22px for overlays.
8. THE Web_App SHALL use only `lucide-react` icons, each rendered with a stroke width of 1.75.
9. THE Web_App SHALL apply a blur effect only to overlays, and SHALL apply no blur effect to any non-overlay element.

### Requirement 15: Liquid meter

**User Story:** As a user, I want progress and match values shown as a fill with a number, so that I understand status
at a glance.

#### Acceptance Criteria

1. WHEN the Meter_Calculator receives a finite numeric value, THE Meter_Calculator SHALL return a level equal to the
   value clamped to the range 0 to 100 inclusive and rounded to the nearest integer, with values at .5 rounded up
   (e.g., 49.5 returns 50, -5 returns 0, 150 returns 100, Infinity returns 100, -Infinity returns 0).
2. IF the Meter_Calculator receives undefined, null or NaN, THEN THE Meter_Calculator SHALL return level 0, wave
   amplitude 0 and the label "â€”" (em dash, U+2014) without throwing an error.
3. WHEN the Meter_Calculator receives a finite numeric value, THE Meter_Calculator SHALL return a text label equal to
   the rounded level followed by "%" (e.g., 73.4 returns "73%").
4. WHILE reduced motion is requested, THE Meter_Calculator SHALL return a wave amplitude of 0 for every input value.
5. WHEN the level is 0 or 100, THE Meter_Calculator SHALL return a wave amplitude of 0.
6. WHEN the level is between 1 and 99 inclusive and reduced motion is not requested, THE Meter_Calculator SHALL return
   a wave amplitude equal to the lesser of 4 and level divided by 10 (e.g., level 20 returns 2, level 40 returns 4,
   level 99 returns 4).
7. THE Liquid_Meter SHALL render the label returned by the Meter_Calculator as visible text and SHALL require an
   accessible `label` prop of at least 1 non-whitespace character.
8. IF the `label` prop is missing, empty or whitespace-only, THEN THE Liquid_Meter SHALL log a development-time error
   through PropTypes validation and SHALL NOT render a meter with an empty accessible name.
9. THE Liquid_Meter SHALL support exactly the variants `bar`, `vessel` and `ring` and exactly the tones `primary`,
   `good` and `warn`.
10. THE ProgressBar SHALL render a Liquid_Meter with `variant="bar"`.
11. IF a Match_Percentage or progress value is undefined, null or NaN, THEN THE Web_App SHALL display "â€”" and SHALL NOT
    display "0" or "0%".

### Requirement 16: Ambient water surface gating

**User Story:** As a user on a constrained device, I want ambient animation to switch off, so that the app stays fast
and comfortable.

#### Acceptance Criteria

1. IF the `prefers-reduced-motion: reduce` media query matches, Save-Data is enabled, WebGL2 is unavailable, or
   `navigator.hardwareConcurrency` is 2 or less, THEN THE Canvas_Gate SHALL return `static`.
2. IF one or more other Water_Canvas instances are already in `animate` mode, THEN THE Canvas_Gate SHALL return
   `static` for the requesting Water_Canvas.
3. WHILE the Water_Canvas is less than 1% visible in the viewport or the browser tab is hidden, and no static
   condition applies, THE Canvas_Gate SHALL return `paused`.
4. WHEN no static or paused condition applies, THE Canvas_Gate SHALL return `animate`.
5. THE Web_App SHALL render at most one Water_Canvas in `animate` mode at any time.
6. WHILE the Canvas_Gate returns `static`, THE Web_App SHALL render the Static_Fallback with width and height
   identical to the Water_Canvas, with 0 px layout shift between the two.
7. IF WebGL context creation fails or the WebGL context is lost, THEN THE Water_Canvas SHALL render the
   Static_Fallback, display no error message to the user, and leave the rest of the page interactive.
8. THE Web_App SHALL render the Water_Canvas only on the landing hero and the learner dashboard hero, and on no other
   page or component.
9. WHEN the pointer moves over a Water_Canvas that is in `animate` mode and has `interactive` enabled, THE
   Water_Canvas SHALL create a ripple originating at the pointer position within 100 ms of the pointer event.
10. WHILE the Water_Canvas is in `paused` mode, THE Water_Canvas SHALL render 0 animation frames and SHALL NOT create
    ripples.
11. THE Web_App SHALL load the Water_Canvas shader code in a separate chunk that is requested only after the first
    paint event, so that the shader chunk is absent from the initial page load requests.
12. WHEN the conditions that caused `paused` no longer apply and no static condition applies, THE Canvas_Gate SHALL
    return `animate` within 500 ms.

### Requirement 17: Motion behaviour

**User Story:** As a user sensitive to motion, I want animation to respect my settings, so that the app is comfortable
to use.

#### Acceptance Criteria

1. WHILE `prefers-reduced-motion: reduce` is set, THE Web_App SHALL limit the duration of every CSS animation and CSS
   transition to 10ms or less, with an animation iteration count of 1.
2. WHILE `prefers-reduced-motion: reduce` is set, THE Web_App SHALL freeze Wave_Divider waves in a static,
   non-moving state.
3. WHILE `prefers-reduced-motion: reduce` is set, WHEN a primary button is pressed, THE Ripple SHALL be replaced by a
   120ms opacity flash on the button, with no expanding or position-changing motion.
4. WHILE `prefers-reduced-motion: reduce` is set, WHEN the route changes, THE Tide_Transition SHALL complete in 10ms
   or less, with no cross-fade, no vertical drift and no displacement filter.
5. WHILE `prefers-reduced-motion: reduce` is not set, WHEN the route changes, THE Tide_Transition SHALL cross-fade for
   220ms with 6px vertical drift and apply no displacement filter.
6. WHILE `prefers-reduced-motion: reduce` is not set, WHEN a primary button is pressed, THE Ripple SHALL expand from
   the pointer origin for 450ms and finish with opacity 0 and no remaining visible element.
7. THE Web_App SHALL animate only the `transform` and `opacity` CSS properties, and SHALL run those animations
   without blocking the main thread (no animation of layout properties such as width, height, top, left, margin or
   padding).
8. THE Web_App SHALL use the easing `--ease-tide: cubic-bezier(0.22, 1, 0.36, 1)` with durations of 120ms (micro),
   220ms (standard) and 320ms (large).
9. THE Web_App SHALL show every meter value and every error message as text visible on screen, regardless of whether
   an animation is playing, finished, or disabled by reduced motion.

### Requirement 18: Page states

**User Story:** As a user, I want every page to show what is happening, so that I am never left with a blank screen.

#### Acceptance Criteria

1. WHILE data for a page is loading, THE Web_App SHALL display a Skeleton whose placeholder regions occupy the same
   container dimensions as the final content layout, such that the Cumulative Layout Shift score caused by replacing
   the Skeleton with loaded content is 0.
2. WHEN a data-bound page finishes loading and the response contains zero items, THE Web_App SHALL display an
   EmptyState containing a text description and exactly one primary action button.
3. IF a data request fails, THEN THE Web_App SHALL replace the Skeleton with an ErrorState that displays the
   `{ error }` message returned by the request and a Retry button, and SHALL retain any previously displayed data on
   the page.
4. WHEN the user activates the Retry button, THE Web_App SHALL re-issue the failed data request, display the Skeleton
   while the request is pending, and prevent additional Retry activations until the request completes.
5. WHEN a non-destructive action succeeds, THE Web_App SHALL show a Toast in the Toast_Viewport for 5 seconds and then
   dismiss it.
6. WHILE the pointer or keyboard focus is within a Toast, THE Toast_Viewport SHALL pause the Toast dismissal timer
   and, WHEN the pointer and keyboard focus have both left the Toast, resume the timer with the remaining time.
7. WHEN a user starts a destructive action, THE Web_App SHALL display a Modal requesting confirmation with a confirm
   button and a cancel button, and SHALL NOT execute the action until the user activates the confirm button.
8. WHEN the user activates the cancel button or dismisses the Modal, THE Web_App SHALL close the Modal and leave the
   data unchanged.
9. THE Web_App SHALL implement the Page_State_Set (Skeleton, EmptyState, ErrorState) on every data-bound page.

### Requirement 19: Forms

**User Story:** As a user, I want forms that explain errors clearly, so that I can correct input quickly.

#### Acceptance Criteria

1. THE Field component SHALL display a visible label, an optional hint, and an inline error message, and SHALL link
   the hint and the inline error to the control through `aria-describedby`.
2. IF a field fails validation, THEN THE Field component SHALL display the inline error message adjacent to the
   control, set `aria-invalid="true"` on the control, and remove the error and `aria-invalid` within 200 ms of the
   field value becoming valid.
3. WHERE a form has more than 5 fields, THE Web_App SHALL display an error summary at the top of the form listing one
   entry per invalid field.
4. WHEN a form submission is rejected by validation, THE Web_App SHALL move keyboard focus to the error summary, or to
   the first invalid field if the form has 5 fields or fewer, within 200 ms, and SHALL preserve all values the user
   entered.
5. IF the server returns HTTP 400 with `{ error }`, THEN THE Web_App SHALL display the `error` message in the form
   summary, retain all entered field values, and re-enable the submit control.
6. IF the server returns HTTP 400 with a missing, empty, or non-string `error` value, THEN THE Web_App SHALL display a
   generic message indicating the request could not be processed, in the form summary.
7. WHILE a form has unsaved changes on the PostJobPage, CompanyProfileEditPage, or Course_Studio, THE Web_App SHALL
   prompt for confirmation before leaving the route, and SHALL remain on the current route with entered values
   retained if the user cancels the prompt.
8. IF the server returns HTTP 429, THEN THE Web_App SHALL display the message "Too many attempts, try again in a
   minute" in the form summary, retain all entered field values, and re-enable the submit control.

### Requirement 20: Data table

**User Story:** As a Recruiter, I want to sort and navigate tables with a keyboard, so that I can review applicants
efficiently.

#### Acceptance Criteria

1. WHEN a user activates a sortable column header by click, Enter key, or Space key, THE Data_Table SHALL sort all
   rows by that column in ascending order if the column is not currently sorted or is sorted descending, and in
   descending order if the column is currently sorted ascending.
2. WHEN a user activates a sortable column header, THE Data_Table SHALL display a sort direction indicator on that
   header, remove the indicator from all other headers, and expose the current direction (ascending or descending) to
   assistive technology.
3. WHEN a user presses the Down Arrow key while a row has focus, THE Data_Table SHALL move focus to the next row, and
   WHEN a user presses the Up Arrow key while a row has focus, THE Data_Table SHALL move focus to the previous row.
4. IF a user presses the Down Arrow key while the last row has focus or the Up Arrow key while the first row has
   focus, THEN THE Data_Table SHALL keep focus on the current row without wrapping.
5. WHEN a user selects a row by click, Enter key, or Space key, THE Data_Table SHALL invoke `onRowSelect` exactly once
   with the identifier of the selected row.
6. WHILE the viewport width is below 640px, THE Data_Table SHALL render each row as a stacked block with each cell's
   column label shown alongside its value.
7. WHILE the viewport width is 640px or above, THE Data_Table SHALL render rows in a standard tabular layout.
8. THE Data_Table SHALL render a non-empty `caption` element describing the table's content.
9. IF the Data_Table has zero rows, THEN THE Data_Table SHALL render the column headers and a visible message
   indicating that no rows are available, and SHALL NOT invoke `onRowSelect`.

### Requirement 21: Accessibility

**User Story:** As a user with accessibility needs, I want the app to be fully keyboard and screen-reader usable.

#### Acceptance Criteria

1. THE Web_App SHALL conform to WCAG 2.1 level AA on every page, as verified by zero level A or AA violations
   reported by an automated accessibility scan and by manual keyboard-only and screen-reader walkthroughs of each
   page.
2. WHILE an interactive element has keyboard focus, THE Web_App SHALL display a focus ring that is 2px wide, uses
   `--teal`, and has a contrast ratio of at least 3:1 against adjacent colours.
3. WHEN a Modal opens, THE Modal SHALL move keyboard focus to an element inside the Modal within 100 ms and keep Tab
   and Shift+Tab cycling only among focusable elements inside the Modal.
4. WHEN a Modal closes, THE Modal SHALL return keyboard focus to the element that had focus immediately before the
   Modal opened.
5. IF the element that had focus before the Modal opened no longer exists when the Modal closes, THEN THE Modal SHALL
   move keyboard focus to the document body, so that focus is not lost to a removed element.
6. WHEN the user presses the Left Arrow or Right Arrow key while a tab in the Tabs component has focus, THE Tabs
   component SHALL move focus to the previous or next tab respectively, wrapping from the last tab to the first and
   from the first to the last.
7. THE Tabs component SHALL follow the ARIA tabs pattern by exposing the roles tablist, tab, and tabpanel, by setting
   `aria-selected="true"` on exactly one tab, and by associating each tab with its tabpanel.
8. THE Web_App SHALL render every application, assessment, lesson, and integrity status as visible text or an icon
   with an accessible name, in addition to colour, so that the status is identifiable without relying on colour.
9. THE Toast_Viewport SHALL have the attribute `aria-live="polite"`, so that toast messages are announced by screen
   readers without interrupting the current announcement.

### Requirement 22: Error handling and session

**User Story:** As a user, I want predictable recovery when something fails, so that I can continue working.

#### Acceptance Criteria

1. IF any request other than the token refresh request returns HTTP 401, THEN THE API_Client SHALL attempt exactly one
   token refresh and, WHEN the refresh succeeds, SHALL replay the original request exactly once with the new token.
2. IF the token refresh fails or the replayed request returns HTTP 401, THEN THE Web_App SHALL sign the user out,
   clear the stored session tokens, and navigate to `/login` with the current path preserved as the return path,
   within 2 seconds of the failure.
3. IF a request returns HTTP 404, THEN THE Web_App SHALL display either the NotFoundPage (for a page-level resource)
   or an inline "not available" message (for an embedded resource), each containing a link to the corresponding list
   page.
4. IF a request returns HTTP 429, THEN THE Web_App SHALL display an inline message stating the user should wait 10
   seconds before retrying, and SHALL disable the submit control for 10 seconds from the time the response is
   received and re-enable it afterwards.
5. IF an XHR network error occurs, THEN THE Web_App SHALL display a banner with the text "You're offline" within 1
   second, preserve any unsaved form input, and retry the failed request automatically up to 3 times, with the first
   retry made no later than 5 seconds after connectivity returns.
6. WHEN connectivity returns and a retry succeeds, THE Web_App SHALL remove the "You're offline" banner within 1
   second.
7. IF all 3 automatic retries fail, THEN THE Web_App SHALL keep the banner visible, display an inline error message
   with a manual retry control, and preserve the unsaved form input.
8. THE API_Client SHALL use `XMLHttpRequest` for all requests.

### Requirement 23: Performance

**User Story:** As a user on a mobile network, I want pages to load quickly, so that I can start using the app fast.

#### Acceptance Criteria

1. WHEN the landing page loads over a 4G connection (throttled to 9 Mbps download, 1.5 Mbps upload, 170 ms round-trip
   latency) with an empty browser cache, THE Web_App SHALL reach Largest Contentful Paint within 2.5 seconds,
   measured at the 75th percentile across at least 5 test runs.
2. WHEN a page finishes loading and the user interacts with it for up to 30 seconds, THE Web_App SHALL keep Cumulative
   Layout Shift at 0.05 or less for that page, measured at the 75th percentile across at least 5 test runs.
3. WHEN the user performs a click, tap, or key press on any page, THE Web_App SHALL keep Interaction to Next Paint at
   200 ms or less, measured at the 75th percentile across at least 5 test runs.
4. THE Web_App SHALL limit the total gzip-compressed JavaScript transferred for the initial load of the landing page
   to 180 KB (184,320 bytes) or less.
5. WHEN a user navigates to a page, THE Web_App SHALL request the JavaScript for that page as exactly one lazily
   loaded route chunk, and SHALL NOT request the route chunk of any other page before the user navigates to it.
6. THE Web_App SHALL request the `mediapipe` library only on the assessment page, and SHALL NOT request `mediapipe`
   during the initial load of any other page.
7. THE Web_App SHALL request the `pdfjs` and `mammoth` libraries only on the resume upload page and document pages,
   and SHALL NOT request either library during the initial load of any other page.
8. IF a lazy route chunk or a lazily loaded library (`mediapipe`, `pdfjs`, or `mammoth`) fails to load, THEN THE
   Web_App SHALL display an error message indicating the page or feature could not be loaded, SHALL offer a retry
   action, and SHALL keep the user on the current page with existing data preserved.

### Requirement 24: Security and privacy

**User Story:** As a user, I want my data and content handled safely, so that I can trust the platform.

#### Acceptance Criteria

1. WHEN markdown authored by a user or generated by AI is rendered, THE Web_App SHALL convert it to HTML using
   `marked` and sanitise the result using `DOMPurify` before inserting it into the page.
2. WHEN sanitisation by `DOMPurify` removes script elements, inline event-handler attributes, or `javascript:` URLs
   from rendered markdown, THE Web_App SHALL display the remaining content without executing the removed elements.
3. IF `marked` or `DOMPurify` throws an error while rendering markdown, THEN THE Web_App SHALL display the content as
   plain escaped text and SHALL NOT insert unsanitised HTML into the page.
4. THE Web_App SHALL NOT include authentication tokens, session tokens, or refresh tokens in any URL (path, query
   string, or fragment) or in any browser console log output.
5. WHILE the user has not given cookie consent, THE Web_App SHALL NOT initialise PostHog analytics and SHALL NOT send
   any network request to the PostHog host.
6. WHEN the user withdraws previously given cookie consent, THE Web_App SHALL stop sending PostHog events within 1
   second and SHALL NOT send further PostHog requests after that point in the current session.
7. THE Web_App SHALL serve shader and font assets from the same origin as the Web_App so that all loads comply with
   the Content Security Policy `default-src 'self'`, producing zero CSP violation reports for these assets.

### Requirement 25: Verification tooling and rollout

**User Story:** As a maintainer, I want automated checks and an incremental rollout, so that the redesign ships safely.

#### Acceptance Criteria

1. THE Web_App SHALL include, for each new component, at least one Vitest test for each of the following: every
   declared prop (default value and at least one non-default value), every ARIA role the component renders, and the
   behaviour when `prefers-reduced-motion: reduce` is active versus inactive.
2. THE Web_App SHALL include `fast-check` property tests for the Meter_Calculator, Canvas_Gate and Nav_Resolver, each
   running at least 100 generated cases per property and each asserting at least one invariant on valid inputs.
3. WHEN the Playwright suite runs, THE Web_App SHALL execute, for each user role, tests that cover: successful login,
   landing on that role's dashboard, navigation to every item in that role's navigation, and zero browser console
   messages of type `error` during each of those steps.
4. WHEN the Playwright suite runs, THE Web_App SHALL run `@axe-core/playwright` scans of every page in the light
   theme, the dark theme, and with `reducedMotion: 'reduce'`, and each scan SHALL report zero violations of impact
   "serious" or "critical".
5. WHEN the Playwright suite runs, THE Web_App SHALL capture screenshots of the 10 pages designated as most-visited at
   viewport widths of 360px, 768px and 1280px in both themes (60 screenshots in total), with the Water_Canvas
   replaced by the Static_Fallback.
6. IF any of `npm test`, `npm run lint`, `npm run build` or the Playwright suite exits with a non-zero status or
   reports a failed test, THEN THE Web_App SHALL block the migration step from shipping and report which check
   failed.
7. WHEN all of `npm test`, `npm run lint`, `npm run build` and the Playwright suite exit with status zero, THE Web_App
   SHALL permit the migration step to ship.
8. IF a screenshot differs from its stored baseline by more than 0.1% of pixels, THEN THE Web_App SHALL fail the
   Playwright suite and retain the diff image for review.

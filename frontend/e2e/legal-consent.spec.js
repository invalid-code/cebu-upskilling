import { test, expect } from './fixtures.js';
import {
  setAuth,
  mockApi,
  mockLearnerShell,
  mockRecruiterShell,
  learnerUser,
  recruiterUser,
} from './helpers.js';

/**
 * Build a minimal single-page PDF with extractable text.
 * Offsets for the xref table are computed as objects are appended,
 * so pdfjs-dist can parse it without recovery mode.
 */
function buildResumePdf(text) {
  const encoder = (obj) => obj; // all-ASCII content, byte length == string length
  const chunks = [];
  let offset = 0;
  const push = (str) => {
    chunks.push(encoder(str));
    offset += str.length;
  };
  const offsets = [0];

  push('%PDF-1.4\n');
  const addObj = (body) => {
    offsets.push(offset);
    push(`${offsets.length - 1} 0 obj\n${body}\nendobj\n`);
  };

  const stream =
    `BT /F1 14 Tf 72 720 Td (${text.replace(/([()\\])/g, '\\$1')}) Tj ET\n`;
  addObj('<</Type/Catalog/Pages 2 0 R>>');
  addObj('<</Type/Pages/Kids[3 0 R]/Count 1>>');
  addObj(
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
  );
  addObj(`<</Length ${stream.length}>>\nstream\n${stream}endstream`);
  addObj('<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>');

  const xrefStart = offset;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`);

  return Buffer.from(chunks.join(''), 'latin1');
}

const RESUME_PDF = buildResumePdf(
  'QA Tester Resume. Skills: JavaScript, React, Node.js, SQL, Manual Testing, Playwright. Experience: three years at TestCorp Cebu.',
);

test.describe('Cookie consent banner', () => {
    // These tests exercise genuine first-visit behavior, so disable the shared
    // consent seeding: a context init script would re-seed on every reload.
    test.use({
      // oxlint-disable-next-line no-empty-pattern -- Playwright requires destructuring; no fixtures needed here
      seedCookieConsent: async ({}, use) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture signature, not a React hook
        await use();
      },
    });

  test('shows on first visit with no stored choice', async ({ page }) => {
    await page.goto('/login');
    const banner = page.getByRole('region', { name: 'Cookie notice' });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('link', { name: 'Privacy Notice' })).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Accept' })).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Decline' })).toBeVisible();
  });

  test('accept persists the choice and hides the banner after reload', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('region', { name: 'Cookie notice' })).toBeVisible();

    await page.getByRole('region', { name: 'Cookie notice' }).getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByRole('region', { name: 'Cookie notice' })).toBeHidden();
    await expect(page.evaluate(() => localStorage.getItem('cebu-cookie-consent'))).resolves.toBe('accepted');

    await page.reload();
    await expect(page.getByRole('region', { name: 'Cookie notice' })).toBeHidden();
    await expect(page.evaluate(() => localStorage.getItem('cebu-cookie-consent'))).resolves.toBe('accepted');
  });

  test('decline persists the choice and hides the banner after reload', async ({ page }) => {
    await page.goto('/forgot-password');
    const banner = page.getByRole('region', { name: 'Cookie notice' });
    await expect(banner).toBeVisible();

    await banner.getByRole('button', { name: 'Decline' }).click();
    await expect(banner).toBeHidden();
    await expect(page.evaluate(() => localStorage.getItem('cebu-cookie-consent'))).resolves.toBe('declined');

    await page.reload();
    await expect(page.getByRole('region', { name: 'Cookie notice' })).toBeHidden();
  });

  test('privacy link inside the banner navigates to /privacy and back', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('region', { name: 'Cookie notice' }).getByRole('link', { name: 'Privacy Notice' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { name: 'Privacy Notice', level: 1 })).toBeVisible();
  });

  test('banner does not overlap sidebar controls on desktop (learner shell)', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await page.addInitScript(() => localStorage.removeItem('cebu-cookie-consent'));
    await mockLearnerShell(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    const banner = page.getByRole('region', { name: 'Cookie notice' });
    await expect(banner).toBeVisible();

    // Sidebar "Sign out" control must be clickable while the banner is up
    const signOut = page.getByLabel('Sign out');
    await expect(signOut).toBeVisible();
    await signOut.click({ trial: true });
    const bannerBox = await banner.boundingBox();
    const signOutBox = await signOut.boundingBox();
    expect(bannerBox.x).toBeGreaterThanOrEqual(signOutBox.x + signOutBox.width - 1);
  });

  test('mobile viewport keeps banner clear of bottom nav', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await page.addInitScript(() => localStorage.removeItem('cebu-cookie-consent'));
    await mockLearnerShell(page);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/courses');
    const banner = page.getByRole('region', { name: 'Cookie notice' });
    await expect(banner).toBeVisible();

    // Page content renders alongside the banner in the empty state
    await expect(page.getByRole('heading', { name: 'Courses', level: 1 })).toBeVisible();
    const bannerBox = await banner.boundingBox();
    const navBox = await page.locator('.mobile-nav').boundingBox().catch(() => null);
    if (navBox) {
      expect(bannerBox.y + bannerBox.height).toBeLessThanOrEqual(navBox.y + 1);
    }
    expect(bannerBox.y + bannerBox.height).toBeLessThanOrEqual(667);
  });
});

test.describe('Footer and legal pages', () => {
  test('footer renders for learner with working legal links', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/dashboard');

    const footer = page.locator('footer.app-footer');
    await expect(footer).toBeVisible();
    await expect(footer.getByText('CebuUpskilling', { exact: true })).toBeVisible();
    await expect(footer.getByText(`© ${new Date().getFullYear()} CebuUpskilling`)).toBeVisible();

    await footer.getByRole('link', { name: 'Privacy Notice' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { name: 'Privacy Notice', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What we collect' })).toBeVisible();
  });

  test('footer renders for recruiter and terms link works', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await mockRecruiterShell(page);
    await page.goto('/business-dashboard');

    const footer = page.locator('footer.app-footer');
    await expect(footer).toBeVisible();
    await footer.getByRole('link', { name: 'Terms of Service' }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Acceptable use' })).toBeVisible();
  });

  test('footer help center link navigates to /help', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/dashboard');
    await page.locator('footer.app-footer').getByRole('link', { name: 'Help Center' }).click();
    await expect(page).toHaveURL(/\/help$/);
  });

  test('legal pages render standalone without authentication', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Notice', level: 1 })).toBeVisible();
    for (const section of ['What we collect', 'How we use your data', 'Cookies', 'Sharing and retention', 'Your rights and contact']) {
      await expect(page.getByRole('heading', { name: section })).toBeVisible();
    }

    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible();
    for (const section of ['Using the platform', 'Courses and learner content', 'Employers and job postings', 'Acceptable use', 'Disclaimers and changes']) {
      await expect(page.getByRole('heading', { name: section })).toBeVisible();
    }
  });

  test('legal pages are reachable when already authenticated (no redirect loop)', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Notice', level: 1 })).toBeVisible();
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible();
  });
});

test.describe('Registration — confirm password and AI resume parsing flow', () => {
  test('mismatched confirm password blocks submit without API call', async ({ page }) => {
    let registerCalls = 0;
    await mockApi(page, {
      'POST /api/auth/register': (route) => {
        registerCalls += 1;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      },
    });

    await page.goto('/register');
    await page.getByPlaceholder('First name').fill('QA');
    await page.getByPlaceholder('Last name').fill('Tester');
    await page.getByPlaceholder('Email address').fill('qa.tester@example.com');
    await page.getByPlaceholder('Password', { exact: true }).fill('secret123');
    await page.getByPlaceholder('Confirm password').fill('different123');
    await page.getByLabel('Birthday').fill('1998-05-10');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
    expect(registerCalls).toBe(0);
    await expect(page).toHaveURL(/\/register/);
  });

  test('empty confirm password shows required error without API call', async ({ page }) => {
    let registerCalls = 0;
    await mockApi(page, {
      'POST /api/auth/register': (route) => {
        registerCalls += 1;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      },
    });

    await page.goto('/register');
    await page.getByPlaceholder('First name').fill('QA');
    await page.getByPlaceholder('Last name').fill('Tester');
    await page.getByPlaceholder('Email address').fill('qa.tester2@example.com');
    await page.getByPlaceholder('Password', { exact: true }).fill('secret123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Confirm password is required')).toBeVisible();
    expect(registerCalls).toBe(0);
  });

  test('typing in confirm password clears its error', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder('Password', { exact: true }).fill('secret123');
    await page.getByPlaceholder('Confirm password').fill('nope');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Passwords do not match')).toBeVisible();

    await page.getByPlaceholder('Confirm password').fill('secret123');
    await expect(page.getByText('Passwords do not match')).toBeHidden();
  });

  test('AI agent path: learner registers with resume and sees parsed skills toast', async ({ page }) => {
    let registerBody = '';
    let registerContentType = '';

    // NOTE: use mockApi handlers (pathname matching), not raw page.route globs —
    // '**/api/auth/register' does not match the cross-origin VITE_API_URL base.
    await mockApi(page, {
      'POST /api/auth/register': async (route) => {
        // Learner registration uploads multipart/form-data (resume file), not JSON.
        registerContentType = route.request().headers()['content-type'] || '';
        registerBody = route.request().postDataBuffer()?.toString('latin1') ?? route.request().postData() ?? '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'e2e-new-learner-token',
            firstName: 'QA',
            role: 'Learner',
            parsedSkillCount: 5,
            assessmentCount: 3,
          }),
        });
      },
    });

    await page.goto('/register');
    await page.getByPlaceholder('First name').fill('QA');
    await page.getByPlaceholder('Last name').fill('Tester');
    await page.getByPlaceholder('Email address').fill('qa.ai@example.com');
    await page.getByPlaceholder('Password', { exact: true }).fill('secret123');
    await page.getByPlaceholder('Confirm password').fill('secret123');
    await page.getByLabel('Birthday').fill('1998-05-10');

    await page.setInputFiles('input[type="file"]', {
      name: 'qa-resume.pdf',
      mimeType: 'application/pdf',
      buffer: RESUME_PDF,
    });

    await page.getByRole('button', { name: 'Create account' }).click();

    // pdfjs-dist + worker are dynamic imports; allow for cold dev-server transforms.
    await expect(page.getByText(/Parsed 5 skills · 3 assessments ready to verify/)).toBeVisible({ timeout: 30_000 });
    expect(registerContentType).toContain('multipart/form-data');
    expect(registerBody).toContain('filename="qa-resume.pdf"');
    expect(registerBody).toContain('qa.ai@example.com');
    expect(registerBody).not.toContain('confirmPassword');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('AI agent path: registration still succeeds when parser returns zero skills', async ({ page }) => {
    let registerHadResume = false;
    await mockApi(page, {
      'POST /api/auth/register': async (route) => {
        // Multipart upload: presence of the resume file part, not a JSON field.
        const raw = route.request().postDataBuffer()?.toString('latin1') ?? route.request().postData() ?? '';
        registerHadResume = raw.includes('filename=');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'e2e-zero-token',
            firstName: 'No',
            role: 'Learner',
            parsedSkillCount: 0,
            assessmentCount: 0,
          }),
        });
      },
    });

    await page.goto('/register');
    await page.getByPlaceholder('First name').fill('No');
    await page.getByPlaceholder('Last name').fill('Skills');
    await page.getByPlaceholder('Email address').fill('no.skills@example.com');
    await page.getByPlaceholder('Password', { exact: true }).fill('secret123');
    await page.getByPlaceholder('Confirm password').fill('secret123');
    await page.getByLabel('Birthday').fill('1999-01-01');

    await page.setInputFiles('input[type="file"]', {
      name: 'no-skills-resume.pdf',
      mimeType: 'application/pdf',
      buffer: RESUME_PDF,
    });

    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Account created')).toBeVisible();
    expect(registerHadResume).toBe(true);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('employer registration hides resume upload and birthday', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Employer' }).click();
    await expect(page.getByLabel('Resume')).toHaveCount(0);
    await expect(page.getByLabel('Birthday')).toHaveCount(0);
    await expect(page.getByPlaceholder('Company name')).toBeVisible();
    await expect(page.getByPlaceholder('Confirm password')).toBeVisible();
  });
});

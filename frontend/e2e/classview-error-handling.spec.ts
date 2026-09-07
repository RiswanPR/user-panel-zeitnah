import { test, expect } from '@playwright/test';

test.describe('ClassView Frontend Error Handling Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept API calls specifically (NOT document/page navigations)
    await page.route('**/*', async (route) => {
      const url = route.request().url();

      if (url.includes('/api/auth/me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              _id: 'student-test-123',
              name: 'Test Student',
              email: 'student@example.com',
              role: 'student',
            },
          }),
        });
      }

      if (url.includes('/api/courses/start-stream')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ active: true, message: 'Stream started' }),
        });
      }

      // Continue all other requests
      return route.continue();
    });

    // Inject valid authentication token
    await page.addInitScript(() => {
      localStorage.setItem('token', 'valid-mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        userId: 'student-test-123',
        name: 'Test Student',
        email: 'student@example.com',
      }));
    });
  });

  test('1. API Timeout — Displays Timeout UI with Retry, does NOT redirect', async ({ page }) => {
    await page.route('**/api/courses/class/timeout-class', async (route) => {
      await route.abort('timedout');
    });

    await page.goto('/courses/class/timeout-class');

    // Confirm user stays on ClassView page
    expect(page.url()).toContain('/courses/class/timeout-class');

    // Retry button must be visible
    const retryBtn = page.getByRole('button', { name: /retry/i });
    await expect(retryBtn).toBeVisible({ timeout: 10000 });

    // Back to courses button must be visible
    const backBtn = page.getByRole('button', { name: /back to courses/i });
    await expect(backBtn).toBeVisible({ timeout: 5000 });

    // Verify no unexpected redirect to /login or /error
    expect(page.url()).not.toContain('/login');
    expect(page.url()).not.toContain('/error');
  });

  test('2. 500 Server Error — Displays Error Message with Retry, does NOT redirect', async ({ page }) => {
    await page.route('**/api/courses/class/500-class', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    await page.goto('/courses/class/500-class');

    expect(page.url()).toContain('/courses/class/500-class');
    const retryBtn = page.getByRole('button', { name: /retry/i });
    await expect(retryBtn).toBeVisible({ timeout: 10000 });

    expect(page.url()).not.toContain('/login');
    expect(page.url()).not.toContain('/error');
  });

  test('3. 503 Service Unavailable — Displays Maintenance Message with Retry, does NOT redirect', async ({ page }) => {
    await page.route('**/api/courses/class/503-class', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Service Temporarily Unavailable' }),
      });
    });

    await page.goto('/courses/class/503-class');

    expect(page.url()).toContain('/courses/class/503-class');
    const retryBtn = page.getByRole('button', { name: /retry/i });
    await expect(retryBtn).toBeVisible({ timeout: 10000 });

    expect(page.url()).not.toContain('/login');
    expect(page.url()).not.toContain('/error');
  });

  test('4. Network Failure — Displays Offline/Connection Message with Retry, does NOT redirect', async ({ page }) => {
    await page.route('**/api/courses/class/net-failure-class', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/courses/class/net-failure-class');

    expect(page.url()).toContain('/courses/class/net-failure-class');
    const retryBtn = page.getByRole('button', { name: /retry/i });
    await expect(retryBtn).toBeVisible({ timeout: 10000 });

    expect(page.url()).not.toContain('/login');
    expect(page.url()).not.toContain('/error');
  });
});

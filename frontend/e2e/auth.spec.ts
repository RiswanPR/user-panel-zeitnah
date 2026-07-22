import { test, expect } from '@playwright/test';

test.describe('Authentication Reliability Tests', () => {
  // Test 1: Successful Login OTP flow
  test('Successful login request OTP', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@zeitnahacademy.com');
    
    // Intercept API to mock success
    await page.route('**/api/auth/login/send-otp', async (route) => {
      await route.fulfill({ status: 200, json: { message: "OTP sent successfully" } });
    });
    
    await page.click('button:has-text("Continue with OTP")');
    await expect(page).toHaveURL(/.*verify-login-otp/);
  });

  // Test 2: Invalid Email Error
  test('Invalid email shows correct error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid-email');
    
    await page.route('**/api/auth/login/send-otp', async (route) => {
      await route.fulfill({ status: 400, json: { message: "Invalid email format" } });
    });
    
    await page.click('button:has-text("Continue with OTP")');
    
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  // Test 3: Offline Mode Error
  test('Offline mode shows network error', async ({ page, context }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@zeitnahacademy.com');
    
    await context.setOffline(true);
    
    await page.click('button:has-text("Continue with OTP")');
    
    await expect(page.locator('text=You appear to be offline')).toBeVisible();
  });

  // Test 4: Rate Limiting Error
  test('429 Rate Limit shows correct error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@zeitnahacademy.com');
    
    await page.route('**/api/auth/login/send-otp', async (route) => {
      await route.fulfill({ status: 429, json: { message: "Too many requests" } });
    });
    
    await page.click('button:has-text("Continue with OTP")');
    
    await expect(page.locator('text=Too many requests')).toBeVisible();
  });

  // Test 5: 500 Internal Server Error
  test('500 Error is handled gracefully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@zeitnahacademy.com');
    
    await page.route('**/api/auth/login/send-otp', async (route) => {
      // Simulate slow response first, then 500 to test retry logic
      await new Promise(f => setTimeout(f, 200));
      await route.fulfill({ status: 500 });
    });
    
    await page.click('button:has-text("Continue with OTP")');
    
    await expect(page.locator('text=We encountered an internal server error')).toBeVisible({ timeout: 10000 });
  });

  // Test 6: Timeout Simulation
  test('Timeout shows friendly error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@zeitnahacademy.com');
    
    await page.route('**/api/auth/login/send-otp', async (route) => {
      // Force abort to simulate timeout/abort
      route.abort('timedout');
    });
    
    await page.click('button:has-text("Continue with OTP")');
    
    // Check for network error generic message (aborts trigger ERR_FAILED which maps to network error usually)
    await expect(page.locator('text=Unable to connect to the server')).toBeVisible();
  });
});

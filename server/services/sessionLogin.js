/**
 * Session Login Service
 * Uses Playwright to perform a form-based login on a target website
 * and returns the authenticated browser storage state (cookies + localStorage).
 *
 * The returned state can be passed back to Playwright when scraping
 * so all subsequent requests happen within the logged-in session.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Reasonable selectors that cover the majority of login forms
const USERNAME_SELECTORS = [
  'input[type="email"]',
  'input[name="email"]',
  'input[name="username"]',
  'input[name="user"]',
  'input[name="login"]',
  'input[name="identifier"]',
  'input[autocomplete="username"]',
  'input[autocomplete="email"]',
  'input[id*="email"]',
  'input[id*="user"]',
  'input[placeholder*="email" i]',
  'input[placeholder*="username" i]',
];

const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[name="password"]',
  'input[name="pass"]',
  'input[autocomplete="current-password"]',
];

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button:has-text("Sign in")',
  'button:has-text("Log in")',
  'button:has-text("Login")',
  'button:has-text("Sign In")',
  'button:has-text("Log In")',
  'button:has-text("Continue")',
];

/**
 * Attempts to log into a website and returns the authenticated browser storage state.
 *
 * @param {string} loginUrl - The URL of the login page
 * @param {string} username - Username or email
 * @param {string} password - Password
 * @param {object} options.customSelectors - Optional override {usernameSelector, passwordSelector, submitSelector}
 * @param {function} options.onProgress - Optional progress callback
 * @returns {Promise<{ storageState: object, cookies: object[], success: boolean, error?: string }>}
 */
export async function performLogin(loginUrl, username, password, options = {}) {
  const { customSelectors = {}, onProgress = () => {} } = options;

  let browser;
  try {
    const { chromium } = await import('playwright');

    onProgress('Launching stealth browser for login...');

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
    });

    // Mask automation detection
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
    });

    const page = await context.newPage();

    onProgress(`Navigating to login page: ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    // ── Find username field ──────────────────────────────────────────
    onProgress('Looking for username/email field...');
    const usernameSelectors = customSelectors.usernameSelector
      ? [customSelectors.usernameSelector]
      : USERNAME_SELECTORS;

    let usernameField = null;
    for (const sel of usernameSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 })) {
          usernameField = el;
          onProgress(`Found username field with selector: ${sel}`);
          break;
        }
      } catch {}
    }

    if (!usernameField) {
      throw new Error('Could not find a username or email input field on the login page.');
    }

    await usernameField.click();
    await usernameField.fill(username);
    await page.waitForTimeout(500);

    // ── Find password field ──────────────────────────────────────────
    // Some sites (e.g., Google) show username first, then navigate to password page
    const passwordSelectors = customSelectors.passwordSelector
      ? [customSelectors.passwordSelector]
      : PASSWORD_SELECTORS;

    let passwordField = null;

    // First attempt: check if password field is already visible
    for (const sel of passwordSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 })) {
          passwordField = el;
          onProgress(`Found password field with selector: ${sel}`);
          break;
        }
      } catch {}
    }

    // If not found, try clicking "Next" or "Continue" first (multi-step flows)
    if (!passwordField) {
      onProgress('Password field not visible yet. Trying multi-step login flow...');
      const nextSelectors = [
        'button[type="submit"]',
        'button:has-text("Next")',
        'button:has-text("Continue")',
        '#identifierNext',
      ];
      for (const sel of nextSelectors) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 1000 })) {
            await el.click();
            await page.waitForTimeout(2000);
            break;
          }
        } catch {}
      }

      // Try again after clicking next
      for (const sel of passwordSelectors) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 2000 })) {
            passwordField = el;
            onProgress(`Found password field (step 2) with selector: ${sel}`);
            break;
          }
        } catch {}
      }
    }

    if (!passwordField) {
      throw new Error('Could not find a password input field on the login page.');
    }

    await passwordField.click();
    await passwordField.fill(password);
    await page.waitForTimeout(500);

    // ── Submit the form ──────────────────────────────────────────────
    onProgress('Submitting login form...');
    const submitSelectors = customSelectors.submitSelector
      ? [customSelectors.submitSelector]
      : SUBMIT_SELECTORS;

    let submitted = false;
    for (const sel of submitSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 })) {
          await el.click();
          submitted = true;
          onProgress(`Clicked submit button: ${sel}`);
          break;
        }
      } catch {}
    }

    if (!submitted) {
      // Fallback to pressing Enter in password field
      await passwordField.press('Enter');
      submitted = true;
      onProgress('Submitted via Enter key');
    }

    // ── Wait for navigation to complete ──────────────────────────────
    onProgress('Waiting for login to complete...');
    await page.waitForTimeout(3000);

    try {
      await page.waitForNavigation({ timeout: 8000, waitUntil: 'networkidle' });
    } catch {
      // Navigation may not occur if it's a SPA — continue
    }

    await page.waitForTimeout(1000);

    const finalUrl = page.url();
    onProgress(`Login completed. Final URL: ${finalUrl}`);

    // Capture all cookies and local storage state
    const storageState = await context.storageState();
    const cookies = storageState.cookies || [];

    await browser.close();

    return {
      success: true,
      storageState,
      cookies,
      finalUrl,
      cookieCount: cookies.length,
    };

  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    return {
      success: false,
      storageState: null,
      cookies: [],
      error: error.message,
    };
  }
}

/**
 * Security Patch: Session Storage Redirect for Authentication Keys
 *
 * This utility transparently redirects session-sensitive authentication keys from
 * `localStorage` to `sessionStorage`.
 *
 * Why this is necessary:
 * - The application stores auth details, user profiles, and menus under "authUser", "authDetails", and "userMenu".
 * - Storing these in `localStorage` allows user login sessions to persist indefinitely even if the browser/tab is closed.
 * - By redirecting these specific keys to `sessionStorage`, we ensure the browser naturally and securely discards
 *   the session tokens when the user closes the tab or browser.
 * - This resolves security risks, stale session issues, and automatic login without re-authentication.
 * - It keeps other non-session items (like language preferences, table filters, etc.) in `localStorage`.
 */

const authKeys = new Set(["authUser", "authDetails", "userMenu"]);

const nativeGetItem = Storage.prototype.getItem;
const nativeSetItem = Storage.prototype.setItem;
const nativeRemoveItem = Storage.prototype.removeItem;

try {
  localStorage.getItem = function (key) {
    if (authKeys.has(key)) {
      return nativeGetItem.call(sessionStorage, key);
    }
    return nativeGetItem.call(localStorage, key);
  };

  localStorage.setItem = function (key, value) {
    if (authKeys.has(key)) {
      return nativeSetItem.call(sessionStorage, key, value);
    }
    return nativeSetItem.call(localStorage, key, value);
  };

  localStorage.removeItem = function (key) {
    if (authKeys.has(key)) {
      return nativeRemoveItem.call(sessionStorage, key);
    }
    return nativeRemoveItem.call(localStorage, key);
  };
} catch (error) {
  console.error("Failed to apply localStorage secure interceptor:", error);
}

/**
 * Waitlist signup logic for the sdm landing page.
 *
 * Pure module — zero framework dependencies — so it can be shared by the
 * client form and the /api/waitlist endpoint AND unit-tested with plain
 * `node --test` (no install needed).
 */

/** Scene tags a signup may declare. Kept short on purpose: the seed-city
 * launch needs density, not a long tail of empty scenes. */
export const SCENES = Object.freeze([
  'techno',
  'house',
  'indie',
  'hip-hop',
  'metal',
  'punk',
  'drum-and-bass',
  'edm',
  'jazz',
  'rnb',
  'afrobeats',
  'latin',
  'k-pop',
  'country'
]);

const MAX_EMAIL_LEN = 254;
const MAX_CITY_LEN = 80;
// Pragmatic RFC-ish shape check: no spaces, one @, at least one dot in domain.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an email address.
 * @param {unknown} email
 * @returns {{ ok: boolean, error: string | null }}
 */
export function validateEmail(email) {
  if (typeof email !== 'string') return fail('Email must be text.');
  const value = email.trim();
  if (value.length === 0) return fail('Email is required.');
  if (value.length > MAX_EMAIL_LEN) return fail('That email is too long.');
  if (!EMAIL_SHAPE.test(value)) return fail('That email doesn\u2019t look right.');
  if (value.includes('..')) return fail('That email doesn\u2019t look right.');
  const [local] = value.split('@');
  if (local.startsWith('.') || local.endsWith('.')) {
    return fail('That email doesn\u2019t look right.');
  }
  return { ok: true, error: null };
}

/**
 * Normalize + validate a full waitlist signup.
 * @param {{ email?: unknown, city?: unknown, scenes?: unknown }} input
 * @returns {{ ok: boolean, error: string | null, payload: object | null }}
 */
export function validateSignup(input = {}) {
  const emailCheck = validateEmail(input.email);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error, payload: null };

  const email = String(input.email).trim().toLowerCase();

  let city = null;
  if (input.city !== undefined && input.city !== null && String(input.city).trim() !== '') {
    if (typeof input.city !== 'string') return failSignup('City must be text.');
    city = input.city.trim();
    if (city.length > MAX_CITY_LEN) return failSignup('City name is too long.');
  }

  let scenes = [];
  if (input.scenes !== undefined && input.scenes !== null) {
    if (!Array.isArray(input.scenes)) return failSignup('Scenes must be a list.');
    const wanted = new Set(
      input.scenes.filter((s) => typeof s === 'string').map((s) => s.trim().toLowerCase())
    );
    scenes = [...wanted].filter((s) => SCENES.includes(s));
  }

  return {
    ok: true,
    error: null,
    payload: { email, city, scenes, source: 'landing-page' }
  };
}

function fail(error) {
  return { ok: false, error };
}
function failSignup(error) {
  return { ok: false, error, payload: null };
}

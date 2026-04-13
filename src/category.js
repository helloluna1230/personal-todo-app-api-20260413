/** Fixed category enum for tasks */
const CATEGORIES = Object.freeze({
  WORK: 'WORK',
  LIFE: 'LIFE',
  STUDY: 'STUDY',
});

const DEFAULT_CATEGORY = CATEGORIES.WORK;

const VALID_CATEGORIES = Object.values(CATEGORIES);

/**
 * Normalise a raw category value from the database or request body.
 * Falls back to the default when the value is absent or unrecognised.
 *
 * @param {string|null|undefined} value
 * @returns {string}
 */
function resolveCategory(value) {
  if (value && VALID_CATEGORIES.includes(value)) {
    return value;
  }
  return DEFAULT_CATEGORY;
}

module.exports = { CATEGORIES, DEFAULT_CATEGORY, VALID_CATEGORIES, resolveCategory };

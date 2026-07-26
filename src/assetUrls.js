const ensureTrailingSlash = (value) => (value.endsWith("/") ? value : `${value}/`);

const BASE_URL = ensureTrailingSlash(import.meta.env.BASE_URL || "/");

export const withBase = (path) => `${BASE_URL}${String(path).replace(/^\/+/, "")}`;

export const DEFAULT_RESULTS_URL = withBase("results.json");

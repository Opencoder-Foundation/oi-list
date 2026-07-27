const ensureTrailingSlash = (value) => (value.endsWith("/") ? value : `${value}/`);

const BASE_URL = ensureTrailingSlash(import.meta.env.BASE_URL || "/");
const API_BASE_URL = "https://zadania.oki.org.pl/";
//const API_BASE_URL = "http://127.0.0.1:3000/";

export const withBase = (path) => `${BASE_URL}${String(path).replace(/^\/+/, "")}`;

export const PROBLEMS_URL = new URL(
  "api/problems",
  ensureTrailingSlash(API_BASE_URL),
).toString();

export const USER_URL = new URL(
  "/api/user",
  ensureTrailingSlash(API_BASE_URL),
).toString();

export const AUTH_URL = new URL(
  "/api/auth",
  ensureTrailingSlash(API_BASE_URL),
).toString();

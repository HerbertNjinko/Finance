export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  role?: string;
  institutionId?: string | null;
};

const STORAGE_KEY = 'institution_portal_auth';
let cached: AuthTokens | null = load();

function load(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    return null;
  }
}

export function getTokens(): AuthTokens | null {
  return cached;
}

export function setTokens(tokens: AuthTokens | null) {
  cached = tokens;
  if (!tokens) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  }
}

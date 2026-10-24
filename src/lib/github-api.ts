import { headers } from "next/headers";
import { getToken } from "next-auth/jwt";

export class GitHubAuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "GitHubAuthError";
    this.status = status;
  }
}

const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

/**
 * Reads the signed-in user's GitHub OAuth token from the encrypted Auth.js session cookie.
 * The token stays in the JWT and is never copied onto the session object, so it does not
 * reach the browser through /api/auth/session or useSession().
 */
export async function getSessionGitHubAuth(): Promise<{ accessToken?: string; scope?: string }> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return {};

  let requestHeaders: Headers;
  try {
    requestHeaders = await headers();
  } catch {
    // Outside a request scope (build, cached function, script): no user token.
    return {};
  }

  const secureCookie = (requestHeaders.get("cookie") ?? "").includes(SECURE_SESSION_COOKIE);
  const token = await getToken({ req: { headers: requestHeaders }, secret, secureCookie });
  return {
    accessToken: typeof token?.accessToken === "string" ? token.accessToken : undefined,
    scope: typeof token?.oauthScope === "string" ? token.oauthScope : undefined,
  };
}

export async function getSessionGitHubToken(): Promise<string | undefined> {
  return (await getSessionGitHubAuth()).accessToken;
}

function isRateLimited(response: Response): boolean {
  return response.status === 429 || (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
}

export async function fetchGitHubAPI(url: string | URL | Request, options: RequestInit = {}): Promise<Response> {
  const systemToken = process.env.NOVARIS_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const sessionToken = await getSessionGitHubToken();
  const headers = new Headers(options.headers);

  const doFetch = async (token?: string) => {
    const fetchHeaders = new Headers(headers);
    if (token && !fetchHeaders.has("Authorization") && !fetchHeaders.has("authorization")) {
      fetchHeaders.set("Authorization", `Bearer ${token}`);
    }
    return fetch(url, {
      ...options,
      headers: fetchHeaders,
      cache: "no-store",
      next: { revalidate: 0 },
    });
  };

  let response = await doFetch(sessionToken || systemToken);

  // If the session token is expired (401), and we have a valid system token, retry!
  if (response.status === 401 && sessionToken && systemToken && sessionToken !== systemToken) {
    console.warn(`[GitHub API] Session token got 401 on ${url.toString()}, retrying with system token...`);
    response = await doFetch(systemToken);
  }

  if (response.status === 401 || isRateLimited(response)) {
    console.error(`GitHub API Error (${response.status}) on ${url.toString()}`);
    throw new GitHubAuthError(
      response.status === 401
        ? "Bad credentials or expired GitHub token."
        : "GitHub API rate limit exceeded.",
      response.status
    );
  }

  // Other 403s (no access to a resource) fall through so callers see a normal API error.
  return response;
}

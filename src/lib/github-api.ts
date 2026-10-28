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

const PUBLIC_VISIBILITY_TTL_MS = 10 * 60 * 1000;
const publicRepoChecks = new Map<string, number>();

function notFoundResponse(): Response {
  return new Response(JSON.stringify({ message: "Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

function repoFromApiUrl(url: string | URL | Request): { owner: string; repo: string; isRepoRoot: boolean } | null {
  try {
    const parsed = new URL(typeof url === "string" ? url : url instanceof URL ? url.href : url.url);
    if (parsed.hostname !== "api.github.com") return null;
    const match = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/.exec(parsed.pathname);
    if (!match) return null;
    return {
      owner: decodeURIComponent(match[1]).toLowerCase(),
      repo: decodeURIComponent(match[2]).toLowerCase(),
      isRepoRoot: !match[3] || match[3] === "/",
    };
  } catch {
    return null;
  }
}

/**
 * The system token may see private repositories (its owner's or an org's). Without a signed-in
 * user it is only ever used for public ones: a private repository looks like a 404, exactly as it
 * would to an anonymous GitHub visitor.
 */
async function systemTokenMayRead(
  target: { owner: string; repo: string },
  fetchRepo: () => Promise<Response>
): Promise<{ allowed: boolean; repoResponse?: Response }> {
  const key = `${target.owner}/${target.repo}`;
  const checkedAt = publicRepoChecks.get(key);
  if (checkedAt && Date.now() - checkedAt < PUBLIC_VISIBILITY_TTL_MS) return { allowed: true };

  const { isRepoMarkedPrivate, markRepoPrivate } = await import("./cache");
  if (await isRepoMarkedPrivate(target.owner, target.repo)) return { allowed: false };

  const response = await fetchRepo();
  if (!response.ok) return { allowed: true, repoResponse: response };
  const data = (await response.clone().json().catch(() => null)) as { private?: unknown } | null;
  if (data?.private === true) {
    await markRepoPrivate(target.owner, target.repo);
    return { allowed: false };
  }
  publicRepoChecks.set(key, Date.now());
  return { allowed: true, repoResponse: response };
}

export async function fetchGitHubAPI(url: string | URL | Request, options: RequestInit = {}): Promise<Response> {
  const systemToken = process.env.NOVARIS_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const sessionToken = await getSessionGitHubToken();
  const headers = new Headers(options.headers);

  const doFetch = async (token?: string, target: string | URL | Request = url) => {
    const fetchHeaders = new Headers(headers);
    if (token && !fetchHeaders.has("Authorization") && !fetchHeaders.has("authorization")) {
      fetchHeaders.set("Authorization", `Bearer ${token}`);
    }
    return fetch(target, {
      ...options,
      headers: fetchHeaders,
      cache: "no-store",
      next: { revalidate: 0 },
    });
  };

  let response: Response;
  if (sessionToken) {
    // A rejected user token is reported, never retried as the service account:
    // the system token can see repositories the user cannot.
    response = await doFetch(sessionToken);
  } else {
    const target = repoFromApiUrl(url);
    if (target && systemToken) {
      const repoUrl = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`;
      const check = await systemTokenMayRead(target, () => doFetch(systemToken, repoUrl));
      if (!check.allowed) return notFoundResponse();
      response = target.isRepoRoot && check.repoResponse && (options.method ?? "GET").toUpperCase() === "GET"
        ? check.repoResponse
        : await doFetch(systemToken);
    } else {
      response = await doFetch(systemToken);
    }
  }

  if (response.status === 401 || isRateLimited(response)) {
    console.error(`GitHub API Error (${response.status}) on ${url.toString()}`);
    throw new GitHubAuthError(
      response.status === 401
        ? sessionToken
          ? "GitHub token expired or was revoked. Sign in again."
          : "Bad credentials or expired GitHub token."
        : "GitHub API rate limit exceeded.",
      response.status
    );
  }

  // Other 403s (no access to a resource) fall through so callers see a normal API error.
  return response;
}

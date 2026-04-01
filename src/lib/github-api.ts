import { auth } from "@/lib/auth";

export class GitHubAuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "GitHubAuthError";
    this.status = status;
  }
}

export async function fetchGitHubAPI(url: string | URL | Request, options: RequestInit = {}): Promise<Response> {
  const systemToken = process.env.NOVARIS_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  let sessionToken: string | undefined = undefined;
  
  try {
    const session = await auth();
    // @ts-expect-error accessToken is injected via callbacks in auth.config.ts
    if (session?.accessToken) {
      sessionToken = session.accessToken as string;
    }
  } catch (err) {
    // auth() can throw when called outside of a Next.js Request context
  }

  let tokenToUse = sessionToken || systemToken;

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

  let response = await doFetch(tokenToUse);

  console.log(`[GitHub API] Used token: ${tokenToUse ? tokenToUse.substring(0, 8) + '...' : 'undefined'}`);
  console.log(`[GitHub API] Session token: ${sessionToken ? sessionToken.substring(0, 8) + '...' : 'undefined'}`);
  console.log(`[GitHub API] System token: ${systemToken ? systemToken.substring(0, 8) + '...' : 'undefined'}`);
  console.log(`[GitHub API] Status: ${response.status}`);

  // If the session token is expired (401), and we have a valid system token, retry!
  if (response.status === 401 && sessionToken && systemToken && sessionToken !== systemToken) {
    console.warn(`[GitHub API] Session token got 401 on ${url.toString()}, retrying with system token...`);
    response = await doFetch(systemToken);
    console.log(`[GitHub API] Retry status: ${response.status}`);
  }

  if (response.status === 401 || response.status === 403) {
    console.error(`GitHub API Error (${response.status}) on ${url.toString()}`);
    throw new GitHubAuthError(
      response.status === 401 
        ? "Bad credentials or expired GitHub token." 
        : "GitHub API rate limit exceeded.",
      response.status
    );
  }

  return response;
}

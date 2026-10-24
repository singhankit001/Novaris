import type { ReactNode } from "react";
import { buttonClasses } from "./button-styles";
import { cn } from "./cn";

interface StateBase {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

type Glyph = "empty" | "error" | "lock" | "missing";

/**
 * Layered silver plates with one electric-blue mark. Decorative: every state also says what happened in text.
 * Gradient ids are per-glyph so several illustrations can sit on one page.
 */
function Illustration({ glyph }: { glyph: Glyph }) {
  const id = `nv-ill-${glyph}`;
  return (
    <svg aria-hidden viewBox="0 0 160 112" className="h-28 w-40 shrink-0" fill="none">
      <defs>
        <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eceef3" />
        </linearGradient>
        <linearGradient id={`${id}-sig`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f54ff" />
          <stop offset="0.6" stopColor="#7a4dff" />
          <stop offset="1" stopColor="#19b6e6" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7a4dff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#7a4dff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="100" rx="58" ry="7" fill="#14161d" opacity="0.07" />
      <circle cx="80" cy="52" r="48" fill={`url(#${id}-glow)`} />
      <rect x="30" y="34" width="100" height="56" rx="12" fill={`url(#${id}-plate)`} stroke="#d5d8e0" opacity="0.7" transform="rotate(-6 80 62)" />
      <rect x="30" y="26" width="100" height="58" rx="12" fill={`url(#${id}-plate)`} stroke="#d5d8e0" />
      <rect x="31" y="27" width="98" height="56" rx="11" stroke="#fff" strokeOpacity="0.9" />
      {glyph === "empty" && (
        <>
          <rect x="44" y="40" width="40" height="5" rx="2.5" fill="#d5d8e0" />
          <rect x="44" y="52" width="72" height="5" rx="2.5" fill="#e6e8ee" />
          <rect x="44" y="64" width="56" height="5" rx="2.5" fill="#e6e8ee" />
          <circle cx="116" cy="42" r="8" fill={`url(#${id}-sig)`} />
          <path d="M112.5 42h7M116 38.5v7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      {glyph === "error" && (
        <>
          <path d="M44 66l16-14 12 10 14-20 16 16 14-12" stroke="#d5d8e0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="80" cy="42" r="11" fill="#c22c25" />
          <path d="M80 36.5v6.5M80 47.2v.1" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
      {glyph === "lock" && (
        <>
          <rect x="66" y="48" width="28" height="22" rx="6" fill={`url(#${id}-sig)`} />
          <path d="M72 48v-6a8 8 0 0116 0v6" stroke="#2f54ff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="80" cy="59" r="2.5" fill="#fff" />
        </>
      )}
      {glyph === "missing" && (
        <>
          <circle cx="76" cy="54" r="14" stroke={`url(#${id}-sig)`} strokeWidth="3.5" />
          <path d="M86.5 64.5L98 76" stroke={`url(#${id}-sig)`} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M70.5 49.5l11 9M81.5 49.5l-11 9" stroke="#868b99" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function Frame({ glyph, title, children, action, className, role, code }: StateBase & { glyph: Glyph; role?: "alert"; code?: string }) {
  return (
    <div role={role} className={cn("mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-14 text-center", className)}>
      <Illustration glyph={glyph} />
      {code && <p className="nv-eyebrow nv-num">{code}</p>}
      <h2 className="nv-display text-balance text-nv-display-md">{title}</h2>
      {children && <div className="text-pretty text-nv-body text-nv-ivory-200 [&_p+p]:mt-2">{children}</div>}
      {action && <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState(p: StateBase) {
  return <Frame glyph="empty" {...p} />;
}

/** `detail` is a technical reference (request id / status), shown mono so users can quote it. */
export function ErrorState({ detail, ...p }: StateBase & { detail?: string }) {
  return (
    <Frame glyph="error" role="alert" {...p}>
      {p.children}
      {detail && (
        <p className="mt-3 inline-block rounded-nv-xs border border-nv-graphite-700 bg-nv-graphite-850 px-2 py-1 font-nv-mono text-nv-micro text-nv-ivory-300">
          {detail}
        </p>
      )}
    </Frame>
  );
}

export function UnauthorizedState({ signInHref = "/api/auth/signin", reason, ...p }: Partial<StateBase> & { signInHref?: string; reason?: string }) {
  return (
    <Frame
      glyph="lock"
      title={p.title ?? "Sign in to continue"}
      action={p.action ?? <a className={buttonClasses("primary")} href={signInHref}>Sign in with GitHub</a>}
      code="401"
    >
      {p.children ?? <p>{reason ?? "This view belongs to a signed-in account. Public analysis stays available without one."}</p>}
    </Frame>
  );
}

export function NotFoundState({ homeHref = "/", ...p }: Partial<StateBase> & { homeHref?: string }) {
  return (
    <Frame
      glyph="missing"
      title={p.title ?? "Nothing at this address"}
      code="404"
      action={p.action ?? <a className={buttonClasses("secondary")} href={homeHref}>Back to search</a>}
    >
      {p.children ?? <p>The page, report or repository link may have expired, moved, or never existed.</p>}
    </Frame>
  );
}

import type { ReactNode } from "react";
import { FileQuestion, Inbox, Lock, ServerCrash } from "lucide-react";
import { buttonClasses } from "./button-styles";
import { cn } from "./cn";

interface StateBase {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

function Frame({ icon, title, children, action, className, role, code }: StateBase & { icon: ReactNode; role?: "alert"; code?: string }) {
  return (
    <div role={role} className={cn("mx-auto flex max-w-lg flex-col items-start gap-3 px-4 py-12", className)}>
      <span aria-hidden className="grid size-11 place-items-center rounded-nv-sm border border-nv-graphite-600 text-nv-copper-400">
        {icon}
      </span>
      {code && <p className="nv-eyebrow nv-num">{code}</p>}
      <h2 className="nv-display text-nv-display-md">{title}</h2>
      {children && <div className="text-nv-body text-nv-ivory-200 [&_p+p]:mt-2">{children}</div>}
      {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState(p: StateBase) {
  return <Frame icon={<Inbox className="size-5" />} {...p} />;
}

/** `detail` is a technical reference (request id / status), shown mono so users can quote it. */
export function ErrorState({ detail, ...p }: StateBase & { detail?: string }) {
  return (
    <Frame icon={<ServerCrash className="size-5" />} role="alert" {...p}>
      {p.children}
      {detail && <p className="mt-3 rounded-nv-xs bg-nv-graphite-850 px-2 py-1 font-mono text-nv-micro text-nv-ivory-300">{detail}</p>}
    </Frame>
  );
}

export function UnauthorizedState({ signInHref = "/api/auth/signin", reason, ...p }: Partial<StateBase> & { signInHref?: string; reason?: string }) {
  return (
    <Frame
      icon={<Lock className="size-5" />}
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
      icon={<FileQuestion className="size-5" />}
      title={p.title ?? "Nothing at this address"}
      code="404"
      action={p.action ?? <a className={buttonClasses("secondary")} href={homeHref}>Back to search</a>}
    >
      {p.children ?? <p>The page, report or repository link may have expired, moved, or never existed.</p>}
    </Frame>
  );
}

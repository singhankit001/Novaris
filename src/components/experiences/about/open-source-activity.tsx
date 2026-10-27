import { CircleDot, GitCommitHorizontal, GitFork, GitPullRequest, MessageSquareText, Tag } from "lucide-react";
import type { ReactNode } from "react";

// The kinds of activity that make up open source, placed around the globe. Positions are percentages of the frame.
const ACTIVITY = [
  { label: "Pull request", Icon: GitPullRequest, x: "6%", y: "14%", tone: "text-nv-copper-400" },
  { label: "Commit", Icon: GitCommitHorizontal, x: "70%", y: "6%", tone: "text-nv-violet-400" },
  { label: "Issue", Icon: CircleDot, x: "80%", y: "44%", tone: "text-nv-success" },
  { label: "Fork", Icon: GitFork, x: "0%", y: "56%", tone: "text-nv-violet-400" },
  { label: "Review", Icon: MessageSquareText, x: "62%", y: "82%", tone: "text-nv-copper-400" },
  { label: "Release", Icon: Tag, x: "12%", y: "86%", tone: "text-nv-ion-600" },
] as const;

/** Wraps the globe with labelled open-source activity chips that float gently; decorative, the caption explains it. */
export function OpenSourceActivity({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto max-w-md">
      {children}
      <ul aria-hidden className="pointer-events-none absolute inset-0 m-0 list-none p-0">
        {ACTIVITY.map(({ label, Icon, x, y, tone }, i) => (
          <li
            key={label}
            className="absolute flex items-center gap-2 rounded-full border border-nv-graphite-700 bg-white/90 py-1.5 pl-2 pr-3 text-nv-micro font-medium text-nv-ivory-100 shadow-[0_1px_2px_rgb(20_22_29/0.05),0_10px_28px_-10px_rgb(47_84_255/0.35)] backdrop-blur-[2px] animate-[osFloat_8s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{ left: x, top: y, animationDelay: `${i * -1.35}s` }}
          >
            <Icon className={`size-3.5 ${tone}`} />
            {label}
          </li>
        ))}
      </ul>
      <style>{`@keyframes osFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`}</style>
    </div>
  );
}

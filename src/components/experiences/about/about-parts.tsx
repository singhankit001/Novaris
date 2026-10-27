import type { ReactNode } from "react";
import { CubesGrid } from "@/components/fx/scene/cubes-grid";
import { Globe } from "@/components/fx/scene/globe";
import { Particles3D } from "@/components/fx/scene/particles-3d";
import { ActionLink, H2, Prose } from "@/components/seo/blocks";
import { OpenSourceActivity } from "./open-source-activity";

/**
 * Hero backdrop: pointer-reactive cube field across the full viewport width, from the very top of the page
 * (under the floating header) down through the hero. It fades out at the bottom and softens behind the text.
 */
export function CubesBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[calc(var(--nv-header-h,72px)+64px)] bottom-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden [mask-image:linear-gradient(to_bottom,black_72%,transparent)]"
      >
        <div className="absolute inset-0 [mask-image:linear-gradient(to_left,black_30%,rgb(0_0_0/0.28)_78%)] max-md:opacity-60">
          <CubesGrid />
        </div>
      </div>
      {children}
    </div>
  );
}

export function Limits() {
  const items = [
    "It does not clone or run your code.",
    "It does not rank developers or score people.",
    "It cannot guarantee a model answer is correct. Check the cited files.",
    "It reads private repositories only when you grant GitHub access.",
  ];
  return (
    <section aria-labelledby="ab-not-h">
      <H2 id="ab-not-h">What it does not do</H2>
      <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2">
        {items.map((t) => (
          <li key={t} className="nv-card p-6 text-nv-body leading-relaxed text-nv-ivory-100 text-pretty">
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OpenSourceGlobe() {
  return (
    <section aria-labelledby="ab-open-h" className="grid items-center gap-10 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-6">
        <H2 id="ab-open-h">Open source has no borders</H2>
        <Prose className="mt-8">
          <p>
            Novaris works on public GitHub repositories, and open-source code is written and read all over the world. Any
            public repository can be pointed at, wherever its authors live.
          </p>
        </Prose>
      </div>
      <figure className="m-0 min-w-0 lg:col-span-5 lg:col-start-8">
        <OpenSourceActivity>
          <Globe className="mx-auto max-w-sm" caption="Illustrative globe with example connection arcs between sample points" />
        </OpenSourceActivity>
        <figcaption className="mt-3 text-center text-nv-small text-nv-text-muted">
          Illustration only. The arcs and labels show the kinds of open-source activity, not real users, repositories, or locations.
        </figcaption>
      </figure>
    </section>
  );
}

export function Maker() {
  return (
    <section aria-labelledby="ab-who-h" className="relative isolate overflow-hidden rounded-nv-xl border border-nv-graphite-700 bg-white p-8 sm:p-12">
      <div aria-hidden className="absolute inset-0 -z-10">
        <Particles3D quantity={36} />
      </div>
      <H2 id="ab-who-h">Who built it</H2>
      <Prose className="mt-8">
        <p>
          Novaris is built by{" "}
          <a href="https://www.linkedin.com/in/singhankit001/" target="_blank" rel="noopener noreferrer">
            Ankit Singh
          </a>{" "}
          (GitHub{" "}
          <a href="https://github.com/singhankit001" target="_blank" rel="noopener noreferrer">
            @singhankit001
          </a>
          ), a software developer. It started as a personal project to understand unfamiliar repositories faster.
        </p>
      </Prose>
      <div className="mt-6 flex flex-wrap gap-3">
        <ActionLink href="/" variant="primary">
          Try Novaris
        </ActionLink>
        <ActionLink href="https://github.com/singhankit001/novaris" external>
          View source
        </ActionLink>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import { CubesGrid } from "@/components/fx/scene/cubes-grid";
import { Globe } from "@/components/fx/scene/globe";
import { Particles3D } from "@/components/fx/scene/particles-3d";
import { Timeline } from "@/components/fx/surface/timeline";
import { ActionLink, BulletList, H2, Prose } from "@/components/seo/blocks";

/** Hero backdrop: pointer-reactive cube field, masked to fade out toward the text column. */
export function CubesBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 bottom-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_left,black,transparent_75%)] max-md:opacity-50"
      >
        <CubesGrid />
      </div>
      {children}
    </div>
  );
}

export function HowItWorks() {
  return (
    <section aria-labelledby="ab-does-h">
      <H2 id="ab-does-h">What it does</H2>
      <div className="mt-10 max-w-4xl">
        <Timeline
          entries={[
            {
              id: "give",
              label: "Step 1",
              title: "You point it at GitHub",
              content: (
                <Prose>
                  <p>
                    You give it a repository URL, <code>owner/repo</code>, or a GitHub username.
                  </p>
                </Prose>
              ),
            },
            {
              id: "fetch",
              label: "Step 2",
              title: "It reads whole files",
              content: (
                <Prose>
                  <p>Novaris fetches public data through the GitHub API and picks the complete files relevant to your question.</p>
                </Prose>
              ),
            },
            {
              id: "answer",
              label: "Step 3",
              title: "You get a cited answer",
              content: (
                <>
                  <Prose>
                    <p>It sends them to Google Gemini to produce an answer, an architecture diagram, or a security review.</p>
                  </Prose>
                  <div className="mt-5 max-w-[var(--nv-measure)]">
                    <BulletList
                      items={[
                        "Architecture and dependency questions answered from whole files, not fragments.",
                        "Quick security scans for everyone, deeper scans for signed-in users.",
                        "Reports you can revisit for 7 days.",
                      ]}
                    />
                  </div>
                </>
              ),
            },
          ]}
        />
      </div>
    </section>
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
        <Globe className="mx-auto max-w-sm" caption="Illustrative globe with example connection arcs between sample points" />
        <figcaption className="mt-3 text-center text-nv-small text-nv-text-muted">
          Illustration only. The arcs are examples; they are not users, repositories, or locations.
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

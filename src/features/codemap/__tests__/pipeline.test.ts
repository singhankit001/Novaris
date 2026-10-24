import { describe, expect, it } from "vitest";
import { coverageLine, planBatches, runPipeline, type FetchFiles, type PipelineState } from "../pipeline";

const tree = Array.from({ length: 90 }, (_, i) => ({ path: `src/f${i}.ts`, type: "blob" as const, size: 1000 }));
const ctx = (paths: string[]) => paths.map((p) => `\n--- FILE: ${p} ---\nimport x from "./f0";\n`).join("");
const ok: FetchFiles = async (_o, _r, files) => ({ context: ctx(files.map((f) => f.path)), fetchedFiles: files.map((f) => f.path) });

async function run(fetchFiles: FetchFiles, maxFiles?: number): Promise<PipelineState[]> {
  const states: PipelineState[] = [];
  await runPipeline({ owner: "o", repo: "r", tree, fetchFiles, maxFiles, onState: (s) => states.push(s) });
  return states;
}

describe("runPipeline", () => {
  it("emits structure first, streams batches, and finishes with full coverage", async () => {
    const states = await run(ok);
    expect(states[0]?.phase).toBe("structure");
    expect(states[0]?.graph.edges).toHaveLength(0);
    const last = states.at(-1);
    expect(last?.phase).toBe("done");
    expect(last?.read).toBe(90);
    expect(last?.graph.edges.length).toBe(89);
    expect(coverageLine(last as PipelineState)).toBeNull();
  });

  it("keeps a partial graph and says why when the server stops answering", async () => {
    let calls = 0;
    const states = await run(async (o, r, files) => {
      if (++calls > 1) throw new Error("API rate limit exceeded");
      return ok(o, r, files);
    });
    const last = states.at(-1);
    expect(last?.phase).toBe("done");
    expect(last?.stopped?.kind).toBe("rate-limit");
    expect(last?.read).toBe(40);
    expect(coverageLine(last as PipelineState)).toBe("Mapped imports in 40 of 90 source files; 50 not read: GitHub rate limit reached.");
  });

  it("shows an error state when nothing could be read", async () => {
    const states = await run(async () => ({ context: "", fetchedFiles: [] }));
    expect(states.at(-1)?.phase).toBe("error");
    expect(states.at(-1)?.error?.kind).toBe("rate-limit");
  });

  it("states the cap when more source files exist than are read", async () => {
    const states = await run(ok, 40);
    expect(coverageLine(states.at(-1) as PipelineState)).toBe("Mapped imports in 40 of 90 source files; 50 not read: limit of 40 files reached");
  });

  it("splits batches by count and by bytes", () => {
    expect(planBatches(tree).map((b) => b.length)).toEqual([40, 40, 10]);
    expect(planBatches([{ path: "a", size: 300_000 }, { path: "b", size: 300_000 }]).length).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { MAX_FILE_PATHS, selectRequestFilePaths } from "@/lib/request-file-paths";

const file = (path: string) => ({ path });

describe("selectRequestFilePaths", () => {
  it("returns the list unchanged when it fits", () => {
    const files = [file("b.ts"), file("a.ts")];
    expect(selectRequestFilePaths(files, [], 5)).toBe(files);
  });

  it("caps a large repository at the server limit so the request is accepted", () => {
    const files = Array.from({ length: 34_537 }, (_, i) => file(`packages/p${i % 40}/src/f${i}.ts`));
    expect(selectRequestFilePaths(files)).toHaveLength(MAX_FILE_PATHS);
  });

  it("keeps tagged files, then source over tests and docs, then shallower paths", () => {
    const files = [
      file("test/e2e/deep/case.ts"),
      file("docs/guide.md"),
      file("packages/next/src/server/render.ts"),
      file("package.json"),
      file("packages/next/src/server/render.test.ts"),
      file("examples/blog/page.tsx"),
    ];
    const picked = selectRequestFilePaths(files, ["examples/blog/page.tsx"], 3).map((f) => f.path);
    expect(picked).toEqual(["examples/blog/page.tsx", "package.json", "packages/next/src/server/render.ts"]);
  });
});

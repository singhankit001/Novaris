import { Badge, BasisTag, StatusPill } from "@/components/nv/badge";
import { BarList, Sparkline, StackedBar } from "@/components/nv/charts";
import { CodeBlock } from "@/components/nv/code-block";
import { DataRow, DataTable, Metric, MetricGroup } from "@/components/nv/data";
import { Citation, EvidencePanel } from "@/components/nv/evidence";
import { Notice } from "@/components/nv/notice";
import { Panel } from "@/components/nv/panel";
import { Section, Specimen } from "./section";

const sample = `export async function getProfile(login: string) {
  const res = await github.get(\`/users/\${login}\`);
  if (!res.ok) throw new GitHubError(res.status);
  return normalize(await res.json());
}`;

export function DataSections() {
  return (
    <>
      <Section id="evidence" title="Evidence" lede="Scope comes before conclusions: who, which repositories, which dates, how fresh, what was not collected, what is measured and what is inferred. Sample data only.">
        <EvidencePanel scope={{
          identity: "octocat (user, public profile)",
          repos: { included: 8, total: 11, excluded: "3 forks skipped" },
          dateRange: "14 Oct 2025 to 14 Oct 2026",
          freshness: "Collected 14 Oct 2026, 09:12 UTC. Cached for 30 min.",
          limits: ["Public repositories only", "Latest 100 commits per repository", "Commit authorship by GitHub login"],
          measured: ["Commit counts", "Languages by bytes", "Open issue counts"],
          inferred: ["Primary focus areas", "Architecture layering"],
          uncertainty: "Squash merges hide individual commit history; counts understate work in those repositories.",
        }} />
        <Specimen label="Citations and basis tags">
          <div className="flex flex-wrap items-center gap-2">
            <Citation kind="file" repo="octocat/hello" target="src/lib/github.ts" lines="12-40" href="#" />
            <Citation kind="commit" target="a1b2c3d" />
            <BasisTag basis="measured" /><BasisTag basis="inferred" /><BasisTag basis="unknown" />
          </div>
        </Specimen>
      </Section>

      <Section id="data" title="Metrics, rows, tables and charts" lede="Charts show only values the product holds: commit counts per week, language bytes, finding counts by severity. Each has a text alternative and a visible value.">
        <MetricGroup>
          <Metric label="Commits" value="1,204" source="GitHub REST, 14 Oct" />
          <Metric label="Repositories" value={8} source="GitHub REST" />
          <Metric label="Open findings" value={3} source="Deep scan #418" />
          <Metric label="Layering" value="Service" source="model reading of 14 files" basis="inferred" />
        </MetricGroup>
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Weekly commits" eyebrow="12 weeks">
            <Sparkline values={[4, 6, 5, 9, 12, 8, 14, 11, 19, 22, 17, 31]} label="Commits per week" summary="Twelve weeks, rising from 4 to 31." />
            <p className="nv-num mt-2 text-nv-small text-nv-ivory-200">Latest week: 31</p>
          </Panel>
          <Panel title="Languages" eyebrow="By bytes">
            <BarList caption="Share of bytes" items={[
              { label: "TypeScript", value: 62, display: "62%" }, { label: "CSS", value: 21, display: "21%", tone: "patina" }, { label: "Shell", value: 9, display: "9%", tone: "ivory" }]} />
          </Panel>
          <Panel title="Findings" eyebrow="By severity">
            <StackedBar caption="Open findings" segments={[
              { label: "High", value: 1, tone: "copper" }, { label: "Medium", value: 2, tone: "patina" }, { label: "Low", value: 4, tone: "ivory" }]} />
          </Panel>
        </div>
        <div className="overflow-hidden rounded-nv-md border border-nv-graphite-700">
          <DataRow title="vercel/next.js" meta="TypeScript · updated 2 days ago" trailing="128,402" href="#" />
          <DataRow title="selected row" meta="Active context" trailing="12" selected />
          <DataRow title="Disabled row" meta="Private, access not granted" trailing="n/a" disabled />
        </div>
        <DataTable caption="Recent scans" rows={[
          { id: "1", repo: "octocat/hello", mode: "Deep", status: "success" as const, findings: 3 },
          { id: "2", repo: "octocat/spoon", mode: "Quick", status: "warning" as const, findings: 11 },
        ]} rowKey={(r) => r.id} columns={[
          { key: "repo", header: "Repository", render: (r) => <span className="font-mono">{r.repo}</span> },
          { key: "mode", header: "Mode", render: (r) => r.mode },
          { key: "status", header: "Status", render: (r) => <StatusPill status={r.status}>{r.status === "success" ? "Verified" : "Needs review"}</StatusPill> },
          { key: "f", header: "Findings", numeric: true, render: (r) => r.findings },
        ]} />
        <Specimen label="Empty table"><DataTable caption="No scans" rows={[]} rowKey={() => ""} columns={[{ key: "a", header: "Repository", render: () => null }]} empty="No scans yet. Run one from a repository page." /></Specimen>
      </Section>

      <Section id="code" title="Code, badges and notices">
        <CodeBlock path="src/lib/github.ts" code={sample} startLine={12} highlight={[14, 15]} />
        <div className="flex flex-wrap gap-2">
          <StatusPill status="success">Verified fixed</StatusPill><StatusPill status="warning">Inferred</StatusPill>
          <StatusPill status="danger">High severity</StatusPill><StatusPill status="info">Quick scan</StatusPill>
          <StatusPill status="pending">Queued</StatusPill><Badge>v1.4.2</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Notice tone="info" title="Public data only">Private repositories need GitHub access with the repo scope.</Notice>
          <Notice tone="success" title="Fix verified">The cited line no longer matches the finding.</Notice>
          <Notice tone="warning" title="Collection limit reached">Only the latest 100 commits per repository were read.</Notice>
          <Notice tone="danger" title="GitHub rate limit">Retry after 09:40 UTC.</Notice>
        </div>
      </Section>
    </>
  );
}

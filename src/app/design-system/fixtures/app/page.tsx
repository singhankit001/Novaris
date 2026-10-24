import type { Metadata } from "next";
import type { StoredScan } from "@/lib/services/scan-storage";
import type { ReportFindingView } from "@/lib/services/report-service";
import type { AnalyticsData } from "@/lib/analytics";
import { ReportContent } from "@/app/report/[scan_id]/ReportContent";
import { ReportExpiredState } from "@/app/report/components/ReportExpiredState";
import { SharedLinkFailureState } from "@/app/report/components/SharedLinkFailureState";
import StatsDashboardClient from "@/app/admin/stats/StatsDashboardClient";
import MotionSettings from "@/components/Dashboard/MotionSettings";
import { OverviewStatsView } from "@/components/Dashboard/OverviewStats";
import { ScansView, type ScanListItem } from "@/components/Dashboard/ScansTable";
import PageHeader from "@/components/Dashboard/PageHeader";
import { Panel } from "@/components/nv/panel";

export const metadata: Metadata = { title: "App surfaces fixtures", robots: { index: false, follow: false } };

// Every value below is FIXTURE DATA for visual review only. It is not scan output.
const NOW = Date.UTC(2026, 9, 24, 9, 0, 0);
const DAY = 86_400_000;

const scans: ScanListItem[] = [
  { id: "fx1", owner: "fixture-org", repo: "payments-api", timestamp: NOW - 2 * 3_600_000, depth: "deep", summary: { critical: 1, high: 2, medium: 3, low: 1, total: 7 } },
  { id: "fx2", owner: "fixture-org", repo: "docs-site", timestamp: NOW - DAY, depth: "quick", summary: { high: 0, medium: 1, low: 0, total: 1 } },
  { id: "fx3", owner: "fixture-user", repo: "clean-lib", timestamp: NOW - 3 * DAY, depth: "quick", summary: { high: 0, medium: 0, low: 0, total: 0 } },
];

function view(index: number, f: ReportFindingView["finding"]): ReportFindingView {
  return {
    index,
    finding: f,
    fingerprint: `fx-fp-${index}`,
    triageScore: 0,
    proof: "FIXTURE: matched rule at cited line; verifier confirmed source reaches sink.",
    impact: "FIXTURE: attacker-controlled input can reach this sink.",
    confidenceRationale: "FIXTURE confidence rationale.",
    fixPrompt: "FIXTURE fix prompt",
    chatHref: "/chat",
  };
}

const findings: ReportFindingView["finding"][] = [
  { type: "secret", severity: "critical", title: "Hardcoded API key (fixture)", description: "d", file: "src/config/keys.ts", line: 12, recommendation: "Move the key to an environment variable and rotate it.", confidence: "high", verificationStatus: "AUTO_VERIFIED_TRUE", exploitabilityTag: "high", ruleId: "fixture.secret", engine: "deterministic-v2", snippet: "10| const region = \"eu\";\n11| \n12| export const API_KEY = \"fx_live_0000\";\n13| export const TIMEOUT = 3000;", evidence: [{ type: "source", message: "Literal assigned to exported constant", line: 12 }], verificationSignals: [{ name: "entropy", passed: true, detail: "High entropy literal" }] },
  { type: "code", severity: "high", title: "SQL built from request input (fixture)", description: "d", file: "src/db/query.ts", line: 40, recommendation: "Use parameterized queries.", confidence: "medium", verificationStatus: "AUTO_VERIFIED_TRUE", cwe: "CWE-89", trace: [{ type: "source", detail: "req.query.id", line: 31 }, { type: "sink", detail: "db.raw(...)", line: 40 }], snippet: "const id = req.query.id;\ndb.raw(`select * from t where id=${id}`)" },
  { type: "code", severity: "medium", title: "Permissive CORS origin (fixture)", description: "d", file: "src/server.ts", line: 8, recommendation: "Restrict allowed origins.", confidence: "low", verificationStatus: "DETECTED" },
  { type: "dependency", severity: "low", title: "Outdated lockfile entry (fixture)", description: "d", file: "package-lock.json", recommendation: "Update the dependency." },
  { type: "configuration", severity: "info", title: "Debug flag enabled (fixture)", description: "d", file: ".env.example", line: 3, recommendation: "Disable in production.", verificationStatus: "OPEN" },
];

const scan: StoredScan = {
  id: "fx1",
  owner: "fixture-org",
  repo: "payments-api",
  timestamp: NOW - 2 * 3_600_000,
  expiresAt: NOW + 5 * DAY,
  depth: "deep",
  summary: { total: 7, critical: 1, high: 2, medium: 3, low: 1, info: 0, debug: { filesReceived: 120, codeFilesFiltered: 90, filesSuccessfullyFetched: 88, patternFindings: 9, aiFindings: 2, afterDedup: 8, afterConfidenceFilter: 7 } },
  findings,
  userId: "fixture-user",
};
const findingViews = findings.map((f, i) => view(i, f));

const reportProps = {
  priorScanDiff: { new: 2, resolved: 1, unchanged: 4 },
  topFixes: findingViews.slice(0, 3),
  findingViews,
  globalFixPrompt: "FIXTURE prompt: fix findings in fixture-org/payments-api.",
  globalChatHref: "/chat",
  reportExpiresAt: scan.expiresAt,
} as const;

const analytics: AnalyticsData = {
  totalVisitors: 1280, totalQueries: 4310, activeNow: 3, activeUsers24h: 41, returningUsers30d: 212, retentionRate30d: 24.6, totalLoggedInUsers: 2,
  deviceStats: { desktop: 900, mobile: 350, unknown: 30 }, countryStats: { IN: 600, US: 300, DE: 120 },
  kvStats: { currentSize: 2_400_000, maxSize: 256_000_000, history: Array.from({ length: 12 }, (_, i) => ({ timestamp: NOW - (12 - i) * 3_600_000, size: 2_000_000 + i * 40_000 })) },
  searchPerformance: { byWindow: { "24h": { avgSelectionMs: 180, indexHitRate: 71.2, fallbackRate: 8.4, selections: 96 }, "7d": { avgSelectionMs: 200, indexHitRate: 69, fallbackRate: 9, selections: 640 } } },
  reportFunnel: undefined,
  falsePositiveReview: {
    total: 1, pending: 1, confirmedFalsePositive: 0, rejected: 0,
    recentSubmissions: [{ id: "fp1", scanId: "fx1", owner: "fixture-org", repo: "payments-api", title: "Permissive CORS origin (fixture)", severity: "medium", file: "src/server.ts", line: 8, reason: "INTENDED_BEHAVIOR", details: "FIXTURE: public API, CORS is intentional.", status: "PENDING", isSharedView: true, submittedByGithubLogin: null, createdAt: NOW - 3_600_000 }],
  } as unknown as AnalyticsData["falsePositiveReview"],
  recentVisitors: [{ id: "v-fixture-0001", actorType: "authenticated", actorKey: "k", githubLogin: "fixture-user", country: "IN", device: "desktop", lastSeen: NOW - 60_000, firstSeen: NOW - DAY, queryCount: 12 }],
  loggedInUsers: [{ id: "u-fixture-1", email: "fixture@example.invalid", githubLogin: "fixture-user", queryCount: 12, scanCount: 3, searchCount: 5, chatCount: 2, createdAt: NOW - 20 * DAY, lastActivityAt: NOW - 60_000 }, { id: "u-fixture-2", email: null, githubLogin: "fixture-incomplete", queryCount: 0, scanCount: 0, searchCount: 0, chatCount: 0, createdAt: NOW - 2 * DAY, lastActivityAt: null }],
  nextVisitorCursor: null, nextLoggedInCursor: null,
};

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="border-t-4 border-nv-copper-600 pt-6">
      <h2 id={`${id}-h`} className="nv-eyebrow mb-4 px-[var(--nv-gutter)]">
        Fixture: {title}
      </h2>
      {children}
    </section>
  );
}

const noop = () => {};

export default function AppSurfacesFixturePage() {
  return (
    <div className="space-y-16 pb-24">
      <div className="px-[var(--nv-gutter)] pt-8">
        <PageHeader eyebrow="Development only" title="App surface fixtures" description="All data on this page is fixture data written for visual review." />
      </div>

      <Block id="dashboard" title="dashboard with scans">
        <div className="mx-auto max-w-[var(--nv-page-max)] space-y-8 px-[var(--nv-gutter)]">
          <OverviewStatsView state={{ status: "ok", data: { stats: { reposScanned: 3, issuesFound: 8, deepScans: 1 } } }} retry={noop} />
          <ScansView state={{ status: "ok", data: { scans } }} retry={noop} showViewAll />
        </div>
      </Block>

      <Block id="dashboard-states" title="dashboard empty, loading, error, signed out">
        <div className="mx-auto grid max-w-[var(--nv-page-max)] gap-8 px-[var(--nv-gutter)] lg:grid-cols-2">
          <ScansView state={{ status: "ok", data: { scans: [] } }} retry={noop} />
          <ScansView state={{ status: "loading" }} retry={noop} />
          <ScansView state={{ status: "error", message: "Failed to fetch scans", httpStatus: 500 }} retry={noop} />
          <ScansView state={{ status: "unauthorized", message: "Unauthorized" }} retry={noop} />
          <OverviewStatsView state={{ status: "error", message: "Failed to fetch stats", httpStatus: 500 }} retry={noop} />
        </div>
      </Block>

      <Block id="settings" title="settings form (signed-out browser mode)">
        <div className="mx-auto max-w-xl px-[var(--nv-gutter)]">
          <Panel as="section">
            <p className="nv-eyebrow">Preferences</p>
            <h3 className="mb-5 text-nv-title font-medium text-nv-ivory-50">Display</h3>
            <MotionSettings />
          </Panel>
        </div>
      </Block>

      <Block id="report" title="report with findings of every severity (private view)">
        <ReportContent scan={scan} {...reportProps} hasPreviousScan isSharedView={false} canShareReport canGenerateOutreach shareMode="canonical" />
      </Block>

      <Block id="report-shared" title="shared read-only report, no previous scan">
        <ReportContent scan={{ ...scan, findings: [], summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 } }} {...reportProps} findingViews={[]} topFixes={[]} hasPreviousScan={false} isSharedView shareToken="fixture-token" canShareReport canGenerateOutreach={false} shareMode="copy-current-url" />
      </Block>

      <Block id="expired" title="expired report">
        <ReportExpiredState owner="fixture-org" repo="payments-api" expiresAt={NOW - DAY} />
      </Block>

      <Block id="shared-failures" title="shared link failure states">
        <div className="grid lg:grid-cols-3">
          <SharedLinkFailureState reason="invalid" />
          <SharedLinkFailureState reason="expired" />
          <SharedLinkFailureState reason="revoked" />
        </div>
      </Block>

      <Block id="admin-stats" title="admin stats">
        <div className="mx-auto max-w-[var(--nv-page-max)] px-[var(--nv-gutter)]">
          <StatsDashboardClient data={analytics} userAgent="FixtureBrowser/1.0" country="Local (Dev)" isMobile={false} currentUsername="fixture-admin" />
        </div>
      </Block>
    </div>
  );
}

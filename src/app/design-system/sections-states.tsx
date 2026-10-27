import { Button } from "@/components/nv/button";
import { EmptyState, ErrorState, NotFoundState, UnauthorizedState } from "@/components/nv/states";
import { IndeterminateProgress, LoadingRegion, Skeleton, Spinner } from "@/components/nv/skeleton";
import { Section, Specimen } from "./section";

export function StateSections() {
  return (
    <Section id="states" title="Async states" lede="Loading never shows a made-up percentage; it names the phase. Empty, error, unauthorized and not-found each say what happened and offer one next step.">
      <div className="grid gap-8 md:grid-cols-3">
        <Specimen label="Skeleton">
          <LoadingRegion label="Loading repositories" className="flex flex-col gap-3">
            <Skeleton className="h-6 w-2/3" /><Skeleton className="w-full" /><Skeleton className="w-5/6" /><Skeleton className="h-24 w-full" />
          </LoadingRegion>
        </Specimen>
        <Specimen label="Spinner (short waits)"><Spinner label="Fetching profile" /></Specimen>
        <Specimen label="Indeterminate (long waits)"><IndeterminateProgress label="Deep scan" phase="Reading 48 of 212 files" /></Specimen>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          <EmptyState key="e" title="No scans yet" action={<Button variant="primary">Scan a repository</Button>}>
            <p>Reports you create appear here with their evidence scope.</p></EmptyState>,
          <ErrorState key="r" title="We could not read this repository" detail="github 403 · request 7f3a21" action={<Button>Try again</Button>}>
            <p>GitHub refused the request, usually a rate limit. Nothing was saved.</p></ErrorState>,
          <UnauthorizedState key="u" />,
          <NotFoundState key="n" />,
        ].map((el, i) => <div key={i} className="nv-card">{el}</div>)}
      </div>
    </Section>
  );
}

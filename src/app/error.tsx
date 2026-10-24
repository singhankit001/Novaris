"use client";

import { useEffect } from "react";
import StateScreen from "@/components/seo/StateScreen";
import { ActionLink, btnClass } from "@/components/seo/blocks";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StateScreen
      alert
      code="500"
      title="This page could not load"
      reference={error.digest ? `Reference ${error.digest}` : undefined}
      actions={
        <>
          <button type="button" onClick={reset} className={btnClass("primary", true)}>
            Try again
          </button>
          <ActionLink href="/" large>
            Back to search
          </ActionLink>
        </>
      }
    >
      <p>Something failed while preparing this page. Trying again often works. If it keeps failing, quote the reference when you contact us.</p>
    </StateScreen>
  );
}

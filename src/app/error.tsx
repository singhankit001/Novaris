"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/nv/states";
import { Button } from "@/components/nv/button";
import { buttonClasses } from "@/components/nv/button-styles";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="This page could not load"
      detail={error.digest ? `Reference ${error.digest}` : undefined}
      action={
        <>
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Link href="/" className={buttonClasses("secondary")}>
            Back to search
          </Link>
        </>
      }
    >
      <p>Something failed while preparing this page. Trying again often works. If it keeps failing, quote the reference when you contact us.</p>
    </ErrorState>
  );
}

"use client";

// Renders outside the root layout, so it cannot rely on next/font or the app providers.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0b0c", color: "#ede7da", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: "32rem", margin: "0 auto", padding: "4rem 1rem" }}>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aba698" }}>Error</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "2rem", margin: "0.5rem 0 1rem" }}>Novaris hit an unexpected error</h1>
          <p style={{ color: "#d3cdc0", lineHeight: 1.55 }}>The page could not be shown. Try again, or reload.</p>
          {error.digest && <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#aba698" }}>Reference {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            style={{ minHeight: 44, padding: "0 1rem", border: 0, borderRadius: 4, background: "#d08f63", color: "#0a0b0c", fontSize: 15, fontWeight: 500, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

"use client";

// Renders outside the root layout, so it cannot rely on next/font, Tailwind or app providers: styles are inline.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          color: "#14161d",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background:
            "radial-gradient(60% 50% at 18% 10%, rgba(47,84,255,0.14), transparent 70%), radial-gradient(45% 40% at 84% 6%, rgba(122,77,255,0.14), transparent 70%), #fafaf7",
        }}
      >
        <main style={{ maxWidth: "32rem", padding: "4rem 1.5rem", textAlign: "center" }}>
          <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#5a5f6e", margin: 0 }}>Error</p>
          <h1 style={{ fontFamily: "Georgia, 'Iowan Old Style', serif", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(2rem, 6vw, 3rem)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: "0.75rem 0 1rem" }}>
            Novaris hit an unexpected error
          </h1>
          <p style={{ color: "#3a3e4a", lineHeight: 1.6, margin: 0 }}>The page could not be shown. Try again, or reload.</p>
          {error.digest && <p style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: "#5a5f6e" }}>Reference {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              minHeight: 48,
              padding: "0 1.75rem",
              border: "1px solid #2744e0",
              borderRadius: 999,
              background: "linear-gradient(180deg, #5273ff, #2f54ff)",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: "0 8px 20px -8px rgba(47,84,255,0.5)",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

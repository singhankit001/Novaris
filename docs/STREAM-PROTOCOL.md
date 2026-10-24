# Chat stream protocol

Applies to `POST /api/chat/repo` and `POST /api/chat/profile`. Implementation:
`src/app/api/chat/_shared.ts`. Types: `src/lib/streaming-types.ts`. Parser: `src/lib/streaming-parser.ts`.

## Transport

- Response `Content-Type: application/x-ndjson`. Each line is one JSON object ending in `\n`. This is not SSE.
- A line may be split across network reads; buffer until `\n` (`parseStreamChunk` does this).
- Errors found before streaming starts are plain JSON with an HTTP status: `{ "error": string, "code": string }`.
  Errors after streaming starts are `error` chunks in the stream (HTTP status is already 200).

## Chunk types

| `type` | Fields | Meaning |
| --- | --- | --- |
| `status` | `message`, `progress` (0-100), `code?` | Progress text. `code: "TOOLS_UNAVAILABLE"` means tool budget storage is down; the answer continues without tools. |
| `tool` | `name`, `detail?`, `usageUnits?`, `billable?` | A tool ran. Billing is server-side; clients only display it. |
| `thought` | `text` | Reasoning summary text (thinking mode). |
| `content` | `text`, `append` | Answer text. Append when `append` is true, otherwise replace. |
| `files` | `files: string[]` | Files selected for the answer. |
| `complete` | `relevantFiles`, `metadata?` | Terminal, success. |
| `error` | `code`, `message` | Terminal, failure. `message` is a fixed user-safe string. |

## Ordering and terminal rules

1. Non-terminal chunks (`status`, `tool`, `thought`, `content`, `files`) arrive in generation order.
2. Every stream that starts ends with exactly one terminal chunk: `complete` or `error`. The server drops anything the generator emits after the first terminal chunk, so `complete` is delivered once.
3. A generator that ends without a terminal chunk produces `error` with code `STREAM_TRUNCATED`. The partial text is kept.
4. If the connection closes with no terminal chunk, the client must treat the answer as unfinished and recover through run status (below). It must not show it as complete.
5. `complete` is sent only after the run row is written `COMPLETED`. If that write fails the client receives `STORAGE_UNAVAILABLE` instead.

## Error codes

`AI_UNAVAILABLE`, `AI_TIMEOUT`, `AI_FUNCTION_TURN_ORDER`, `AI_MISSING_THOUGHT_SIGNATURE`, `GITHUB_RATE_LIMITED`,
`GITHUB_NOT_FOUND`, `GITHUB_AUTH_EXPIRED`, `REPO_TOO_LARGE`, `STORAGE_UNAVAILABLE`, `STREAM_TRUNCATED`, `INTERNAL`.
Messages come from `STREAM_ERROR_MESSAGES`. Raw upstream text is logged server-side only.

Pre-stream JSON errors add: `INVALID_SESSION` (401), `LOGIN_REQUIRED_THINKING_MODE` (401), `LOGIN_REQUIRED_CROSS_REPO` (401),
`RATE_LIMITED` (429, `Retry-After` header and `retryAfterSeconds`), `LIMITER_UNAVAILABLE` (503), `PAYLOAD_TOO_LARGE` (413),
`INVALID_JSON`, `BODY_INVALID`, `QUERY_REQUIRED`, `QUERY_TOO_LONG`, `HISTORY_INVALID`, `HISTORY_TOO_LONG`,
`HISTORY_TURN_TOO_LONG`, `FILE_PATHS_INVALID`, `FILE_PATHS_TOO_MANY`, `FILE_SHAS_INVALID`, `FILE_SHAS_TOO_MANY`,
`REPO_INVALID`, `USERNAME_INVALID`, `RUN_ID_INVALID` (400), `RUN_NOT_FOUND` (403), `RUN_ALREADY_COMPLETED` (409),
`RUN_IN_PROGRESS` (409), `AI_UNAVAILABLE` (503, GEMINI_API_KEY missing; the run is marked FAILED and nothing is charged).

Limits: query 4000 chars; history 40 turns of at most 20000 chars each, roles `user` or `model`; 5000 file paths of at most
512 chars; owner, repo and username match `^[A-Za-z0-9_.-]{1,100}$`; ids at most 128 chars; body 4 MB (repo) / 2 MB (profile).

## Run status lifecycle

`POST /api/chat/run` creates a `ChatRun` for `(actor, conversation, clientRequestId)`.

```
RUNNING --complete--> COMPLETED
RUNNING --error / truncation / thrown error / DB write failure--> FAILED
```

- A run is created directly as `RUNNING` (the schema has no `PENDING`; the window between create and first chunk is `RUNNING` with empty `partialText`). `CANCELLED` exists in the schema but is never set: there is no cancel path.
- `partialText` is updated at most every 400 ms while content streams. `finalText` is set only on `COMPLETED`.
- A failed run keeps its `partialText`. `errorMessage` is stored as `"CODE: safe message"`; `GET /api/chat/run` returns it split as `errorCode` and `errorMessage`.
- Every code path reaches a terminal status. If persistence itself fails mid-stream the server attempts `FAILED`, sends `STORAGE_UNAVAILABLE`, and ends the stream.
- Duplicate in-flight POSTs for one `runId` are rejected with 409 `RUN_IN_PROGRESS` (a best-effort KV lock, released when the stream ends). A `runId` already `COMPLETED` returns 409 `RUN_ALREADY_COMPLETED`.

### Idempotency of `POST /api/chat/run`

The same `(actor, conversation, clientRequestId)` always returns the same run, with its current `status`, `partialText` and
`finalText`. Concurrent creates resolve to one row (unique constraint); the loser reads the winner. Generate one
`clientRequestId` per user question and reuse it on retries of the create call.

## Disconnect policy

Generation continues on the server after the client disconnects. This is deliberate: the answer is persisted to the run so a
reload can resume it. The cost is that a closed tab still spends Gemini and GitHub quota until the run ends. There is no cancel
endpoint, so the UI must not show a "stop generating" control that implies cancellation; "stop watching" (abort the fetch and
poll run status) is the honest action.

## Resuming after reload or reconnect

1. Read the stored `runId` for the conversation and call `GET /api/chat/run?runId=...`.
2. `RUNNING`: show `partialText` as in-progress, poll every 1-2 s. If `updatedAt` stops moving for a minute or more, say the run may have stalled and offer to ask again.
3. `COMPLETED`: show `finalText`.
4. `FAILED`: show `partialText` (labelled incomplete) plus the message for `errorCode`, and offer retry with a new `clientRequestId`.
5. 404/403 `RUN_NOT_FOUND`: the run belongs to another actor or no longer exists; start fresh.
6. 503 `STORAGE_UNAVAILABLE`: say status cannot be checked right now and offer retry; do not claim failure.

Stale results: each question owns one run and one `AbortController`. When the user starts a newer question, abort the previous
fetch and ignore its chunks and poll results; apply output only if its `runId` is still the latest.

## Tool budget and charging

- Budget model: reserve-then-settle. Before generating, the server atomically reserves up to 3 tool units (`INCRBY` on the day key; if that crossed the limit the excess is `DECRBY`ed straight back). Concurrent requests cannot overshoot.
- On a `complete` run the reservation is settled to the units actually used. A failed, truncated or errored run refunds everything. Native web search is not billed.
- If the budget store cannot be reached the server fails closed for tools only: tools are disabled, a `status` chunk with `code: "TOOLS_UNAVAILABLE"` is sent, and the answer still streams.
- Anonymous callers are limited by the stricter of the `rm_anon_id` cookie actor and a network identity (HMAC-SHA256 of the client IP keyed with `AUTH_SECRET`; raw IPs are never stored or logged). Trust assumption: the platform (Vercel) sets `x-real-ip` / the first hop of `x-forwarded-for`; behind any proxy that passes client-supplied values through, this limit is bypassable.

## Rate limits

Fixed window, 60 s, per actor and per network: chat routes 20 / 60 per window, `/api/fix-mermaid` 30 / 90. Over the limit returns 429 with
`Retry-After`. If the limiter store is down these Gemini-spending routes return 503 `LIMITER_UNAVAILABLE` rather than run unlimited.

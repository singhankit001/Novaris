# Novaris demo videos

Looping, illustrative UI demos rendered from HTML with [Hyperframes](https://hyperframes.dev) (the engine behind the Brag skill), then encoded with ffmpeg.

- `*.html`: one composition per demo (GSAP timeline, seek-safe, fictional data only).
- `shared/`: UI kit (`ui.css`, Novaris tokens), helpers (`lib.js`), self-hosted Sora and JetBrains Mono, GSAP.
- `render.sh`: renders to `public/media/demos/<name>.webm` (VP9), `<name>.mp4` (H.264) and `<name>-poster.webp`.

Re-render (Node 22+, ffmpeg with libvpx-vp9 and libx264, `cwebp`):

```bash
video/render.sh                 # all demos
video/render.sh ai-chat         # one demo
CRF_VP9=34 video/render.sh      # quality override
```

Every demo starts and ends on the same empty state so the loop has no jump. Use `<DemoVideo name="..." />` from `src/components/media/DemoVideo.tsx`.

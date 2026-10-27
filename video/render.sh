#!/usr/bin/env bash
# Render demo compositions to public/media/demos/<name>.{webm,mp4}, <name>-poster.webp.
# Usage: video/render.sh [name ...]   (default: all)
# Needs: Node 22+, ffmpeg (libvpx-vp9, libx264, cwebp (webp)). Hyperframes is fetched by npx.
set -euo pipefail
cd "$(dirname "$0")"
OUT=../public/media/demos
mkdir -p .render "$OUT"
# name:poster-second
ALL=(repo-analysis:4.9 developer-analysis:5.6 ai-chat:5.6 ai-chat-narrow:5.6 security-scan:6.2 code-review:5.6 architecture:4.4 select:2.4)
for entry in "${ALL[@]}"; do
  name="${entry%%:*}"; poster="${entry##*:}"
  if [ "$#" -gt 0 ] && [[ ! " $* " == *" $name "* ]]; then continue; fi
  npx hyperframes render . -c "$name.html" -o ".render/$name.mp4" --fps 30 --quality delivery --quiet --workers 1
  ffmpeg -v error -y -i ".render/$name.mp4" -an -c:v libvpx-vp9 -b:v 0 -crf "${CRF_VP9:-36}" -pix_fmt yuv420p -row-mt 1 -g 90 -deadline good -cpu-used 1 "$OUT/$name.webm"
  ffmpeg -v error -y -i ".render/$name.mp4" -an -c:v libx264 -profile:v main -preset slow -crf "${CRF_H264:-26}" -pix_fmt yuv420p -movflags +faststart "$OUT/$name.mp4"
  ffmpeg -v error -y -ss "$poster" -i ".render/$name.mp4" -frames:v 1 ".render/$name.png"
  cwebp -quiet -q 88 ".render/$name.png" -o "$OUT/$name-poster.webp"
  ls -l "$OUT/$name".{webm,mp4} "$OUT/$name-poster.webp"
done

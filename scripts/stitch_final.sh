#!/usr/bin/env bash
# scripts/stitch_final.sh
# < 2s lossless stream-copy concat (-c:v copy) of chunks/chunk_01..06.mp4 + 48kHz AAC 192k mux
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHUNKS_TXT="${ROOT_DIR}/chunks.txt"
WAV_PATH="${ROOT_DIR}/soundtrack_60s.wav"
OUT_MP4="${ROOT_DIR}/final_vaucher_noir_1080p30.mp4"

if [[ ! -f "${WAV_PATH}" ]]; then
  echo "ERROR: Missing ${WAV_PATH}" >&2
  exit 1
fi

: > "${CHUNKS_TXT}"
for i in 1 2 3 4 5 6; do
  CHUNK_FILE="${ROOT_DIR}/chunks/chunk_0${i}.mp4"
  if [[ ! -f "${CHUNK_FILE}" ]]; then
    echo "ERROR: Missing ${CHUNK_FILE}" >&2
    exit 1
  fi
  echo "file '${CHUNK_FILE}'" >> "${CHUNKS_TXT}"
done

T0=$(date +%s%3N)
ffmpeg -y -hide_banner -loglevel error \
  -f concat -safe 0 -i "${CHUNKS_TXT}" \
  -i "${WAV_PATH}" \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart \
  "${OUT_MP4}"
T1=$(date +%s%3N)

BYTES=$(stat -c%s "${OUT_MP4}")
MAX_BYTES=36700160 # 35 MiB
if (( BYTES >= MAX_BYTES )); then
  echo "ERROR: ${OUT_MP4} is ${BYTES} bytes (>= 35 MiB limit)" >&2
  exit 1
fi

echo "[STITCH PASS] $((T1 - T0)) ms | size=${BYTES} bytes | ${OUT_MP4}"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_frames,sample_rate,channels -of json "${OUT_MP4}"

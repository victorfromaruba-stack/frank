#!/usr/bin/env bash
# Turn one of Frank's phone clips into the files the app plays.
#
#   tools/media/process.sh <clip> <exercise id> [start] [end] [--wide] [--howto]
#
#   start, end   where the clean repetitions begin and end: seconds (12.5) or m:ss (0:12.5).
#                Leave them out to use the whole clip.
#   --wide       keep the whole sideways frame. Use it for moves done lying or on hands and
#                knees. Without it, a sideways clip is cut to 4:3 around the middle.
#   --howto      the longer clip where Frank explains the move: keeps the sound and saves
#                media/<id>-howto.mp4 for the How-to tab.
#
# Writes media/<id>.mp4 (muted, loops, about 1 MB) and media/<id>.jpg (the still for lists),
# then prints the line to add to js/media.js. Needs ffmpeg (brew install ffmpeg / apt install ffmpeg).
set -euo pipefail

usage() { sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }
[ $# -ge 2 ] || usage
command -v ffmpeg >/dev/null || { echo "ffmpeg is not installed" >&2; exit 1; }

clip=$1; id=$2; shift 2
start=""; end=""; wide=0; howto=0
for a in "$@"; do
  case "$a" in
    --wide) wide=1 ;;
    --howto) howto=1 ;;
    *) if [ -z "$start" ]; then start=$a; elif [ -z "$end" ]; then end=$a; else usage; fi ;;
  esac
done
[ -f "$clip" ] || { echo "No such file: $clip" >&2; exit 1; }
case "$id" in *[!a-z0-9-]*|"") echo "The exercise id is lower case with dashes, like squat or glute-bridge" >&2; exit 1 ;; esac

root=$(cd "$(dirname "$0")/../.." && pwd)
if ! grep -qE "^[[:space:]]+'?$id'?: \{" "$root/js/exercises.js"; then
  echo "Warning: no exercise called '$id' in js/exercises.js. Check the spelling." >&2
fi
mkdir -p "$root/media"

# the clip's shape after the phone's rotation is applied
read -r w h rot < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height:stream_side_data=rotation:stream_tags=rotate \
  -of csv=p=0:nk=1 "$clip" | tr ',\n' '  ' | awk '{print $1, $2, ($3==""?0:$3)}')
case "${rot#-}" in 90|270) t=$w; w=$h; h=$t ;; esac

if [ "$w" -ge "$h" ]; then
  # sideways: 4:3 around the middle, or the whole frame (16:9 at most) with --wide; 720 high
  if [ $wide -eq 1 ]; then crop="crop='min(iw,ih*16/9)':ih"; else crop="crop='min(iw,ih*4/3)':ih"; fi
  scale="scale=-2:720"
else
  # upright: 4:5, 900 high
  crop="crop=iw:'min(ih,iw*5/4)'"
  scale="scale=-2:900"
fi
# Black rows along the top and bottom (the AI takes have about 4 of 720 each, a dark line in the app): cut off first,
# when they are a thin strip (2% of the height at most, so a dark wall at the edge of a phone clip stays)
bars=""
cd=$(ffmpeg -hide_banner -nostats -i "$clip" -vf "cropdetect=limit=24:round=2:reset=0" -frames:v 48 -an -f null - 2>&1 \
  | grep -o 'crop=[0-9]*:[0-9]*:[0-9]*:[0-9]*' | tail -1 || true)
if [ -n "$cd" ]; then
  IFS=: read -r _ ch _ cy <<< "${cd#crop=}"
  cb=$((h - ch - cy))
  if [ $((cy + cb)) -gt 0 ] && [ "$cy" -ge 0 ] && [ "$cb" -ge 0 ] && [ "$cy" -le $((h / 50)) ] && [ "$cb" -le $((h / 50)) ]; then
    bars="crop=iw:$ch:0:$cy,"
  fi
fi
vf="$bars$crop,$scale,fps=30,format=yuv420p"

trim=()
[ -n "$start" ] && trim+=(-ss "$start")
[ -n "$end" ] && trim+=(-to "$end")

if [ $howto -eq 1 ]; then
  out="media/$id-howto.mp4"
  ffmpeg -hide_banner -loglevel error -y "${trim[@]}" -i "$clip" -vf "$vf" \
    -c:v libx264 -preset slow -crf 25 -profile:v main -c:a aac -b:a 96k -ac 1 -movflags +faststart "$root/$out"
  echo "Saved $out ($(du -h "$root/$out" | cut -f1))"
  echo "Add it to the exercise's line in js/media.js:  howto: '$out'"
  exit 0
fi

out="media/$id.mp4"; poster="media/$id.jpg"
ffmpeg -hide_banner -loglevel error -y "${trim[@]}" -i "$clip" -vf "$vf" -an \
  -c:v libx264 -preset slow -crf 27 -profile:v main -movflags +faststart "$root/$out"
# the still: a frame from the middle of the result
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$root/$out")
mid=$(awk -v d="$dur" 'BEGIN { printf "%.2f", d / 2 }')
ffmpeg -hide_banner -loglevel error -y -ss "$mid" -i "$root/$out" -frames:v 1 -q:v 4 "$root/$poster"

echo "Saved $out ($(du -h "$root/$out" | cut -f1), $(printf '%.1f' "$dur") s) and $poster"
echo "Add this line inside W.WBF.MEDIA in js/media.js:"
echo "    '$id': { video: '$out', poster: '$poster' },"

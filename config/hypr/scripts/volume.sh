#!/usr/bin/env bash
# OSD de volumen: cambia el volumen con wpctl y muestra una barra con dunst.
# Uso: volume.sh up|down|mute
set -euo pipefail

readonly SINK="@DEFAULT_AUDIO_SINK@"
readonly STEP="5%"
# Tope en 1.0 (100%) para no saturar los parlantes al mantener la tecla
readonly MAX_VOLUME="1"
readonly PERCENT=100
readonly STACK_TAG="volume"
readonly TIMEOUT_MS=1500

case "${1:-}" in
    up)   wpctl set-volume -l "$MAX_VOLUME" "$SINK" "$STEP+" ;;
    down) wpctl set-volume "$SINK" "$STEP-" ;;
    mute) wpctl set-mute "$SINK" toggle ;;
    *)    echo "uso: ${0##*/} up|down|mute" >&2; exit 2 ;;
esac

# Formato de wpctl: "Volume: 0.45" o "Volume: 0.45 [MUTED]"
read -r _ fraction muted < <(wpctl get-volume "$SINK")
level=$(awk -v f="$fraction" -v p="$PERCENT" 'BEGIN { printf "%d", f * p + 0.5 }')

if [[ -n "${muted:-}" ]]; then
    icon="audio-volume-muted"; text="Silenciado"
elif (( level < PERCENT / 3 )); then
    icon="audio-volume-low"; text="Volumen ${level}%"
elif (( level < PERCENT * 2 / 3 )); then
    icon="audio-volume-medium"; text="Volumen ${level}%"
else
    icon="audio-volume-high"; text="Volumen ${level}%"
fi

notify-send -a volume -u low -t "$TIMEOUT_MS" -i "$icon" \
    -h "int:value:${level}" -h "string:x-dunst-stack-tag:${STACK_TAG}" \
    "$text"

#!/usr/bin/env bash
set -e

# Auto-detect the LAN IP so --public-host never has to be hardcoded.
# Prefer the Wi-Fi interface (wl*/wlan*) — the phone shares that network —
# and ignore VPN/tunnel/loopback addresses (e.g. CloudflareWARP 172.16.x).
IP=$(ip -o -4 addr show 2>/dev/null | awk '$2 ~ /^(wl|wlan)/ {print $4}' | cut -d/ -f1 | head -1)

# Fallback: any private 192.168.x / 10.x address that isn't loopback.
if [ -z "$IP" ]; then
  IP=$(ip -o -4 addr show 2>/dev/null \
    | awk '{print $4}' | cut -d/ -f1 \
    | grep -E '^(192\.168|10\.)' | head -1)
fi

if [ -z "$IP" ]; then
  echo "✗ No se pudo detectar la IP de la red local. ¿Estás conectado al WiFi?" >&2
  exit 1
fi

echo "→ Dev server en http://$IP:8100 (detectado automáticamente)"

export JAVA_HOME="$HOME/.jdks/jdk-21.0.11+10"
exec ionic cap run android -l --external --public-host="$IP" "$@"

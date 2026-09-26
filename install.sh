#!/usr/bin/env bash
# Instala las configs de este repo en ~/.config con backup de lo existente.
# No instala paquetes: solo verifica que estén y muestra cómo instalarlos.
set -euo pipefail

readonly REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}"
readonly STAMP="$(date +%Y%m%d-%H%M%S-%N)"
readonly AGS_JS="/usr/share/ags/js"
readonly COMPONENTS=(hypr ags)

missing_packages() {
    local list="$1"
    local pkg
    while read -r pkg; do
        [[ -z "$pkg" ]] && continue
        pacman -Q "$pkg" &>/dev/null || echo "$pkg"
    done < "$list"
}

check_packages() {
    local repo_missing aur_missing
    repo_missing="$(missing_packages "$REPO_DIR/packages/pacman.txt")"
    aur_missing="$(missing_packages "$REPO_DIR/packages/aur.txt")"
    if [[ -n "$repo_missing" ]]; then
        echo "Faltan paquetes de los repos oficiales:"
        echo "  sudo pacman -S --needed $(echo $repo_missing)"
    fi
    if [[ -n "$aur_missing" ]]; then
        echo "Faltan paquetes del AUR (revisá cada PKGBUILD antes de instalar):"
        echo "  paru -S $(echo $aur_missing)"
    fi
    [[ -z "$repo_missing" && -z "$aur_missing" ]]
}

install_component() {
    local name="$1"
    local target="$CONFIG_DIR/$name"
    if [[ -e "$target" ]]; then
        mv "$target" "$target.bak-$STAMP"
        echo "backup: $target -> $target.bak-$STAMP"
    fi
    cp -a "$REPO_DIR/config/$name" "$target"
    echo "instalado: $target"
}

# AGS resuelve "ags" y "gnim" desde node_modules; son symlinks al JS del paquete, no hace falta npm.
link_ags_modules() {
    local modules="$CONFIG_DIR/ags/node_modules"
    mkdir -p "$modules"
    ln -sfn "$AGS_JS" "$modules/ags"
    ln -sfn "$AGS_JS/node_modules/gnim" "$modules/gnim"
    if command -v ags &>/dev/null; then
        (cd "$CONFIG_DIR/ags" && ags types >/dev/null) && echo "tipos generados en $CONFIG_DIR/ags/@girs"
    fi
}

main() {
    if ! check_packages; then
        echo "Instalá los paquetes faltantes y volvé a correr ./install.sh"
        exit 1
    fi
    local component
    for component in "${COMPONENTS[@]}"; do
        install_component "$component"
    done
    chmod +x "$CONFIG_DIR/hypr/scripts/"*.sh
    link_ags_modules
    echo
    echo "Listo. Si tu monitor no es HDMI-A-1 2560x1080@100, ajustá hyprland.lua y hyprpaper.conf."
    echo "Dentro de Hyprland: hyprctl reload  (la barra arranca sola al iniciar sesión)."
}

main "$@"

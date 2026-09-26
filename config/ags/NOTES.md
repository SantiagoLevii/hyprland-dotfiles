# Barra AGS v3 (PC de Cata) — notas para retomar
## Estado
- Autostart: hyprland.lua (hl.on "hyprland.start") -> `ags run --directory ~/.config/ags`. Bajar: `kill $(pgrep -x gjs)` (no `pkill -f`).
- Layer "ags-bar", EXCLUSIVE, reserved top = 52. `npm install` NO hace falta (node_modules = symlinks a /usr/share/ags/js).
- Hyprland usa config Lua: dispatch = `hyprctl dispatch 'hl.dsp.focus({ workspace = 2 })'`; mover cursor: `hl.dsp.cursor.move({ x=, y= })`.
## Monitor / geometría
- HDMI-A-1 2560x1080 @100Hz, scale 1 (runtime con Gdk.Monitor.get_geometry()).
- Márgenes: laterales 19*ancho/1920 = 25px, superior 6. Alto 46, padding pill 16, radius 8. Solo se escalan márgenes externos.
## Layout
- Izquierda: pill launcher (cuadrado 46x46, Arch f303 en $arch-blue #1793d1, fuera de la paleta por pedido).
  Click y SUPER+| (keysym "bar", latam) = `rofi -show drun -show-icons`.
  Hover (EventControllerMotion + revealer SLIDE_RIGHT 250ms) despliega: red ↓, CPU, RAM, GPU. Cierre con retardo 150ms.
- Centro: workspaces, centrado exacto por centerbox (medido 1280±0.5). Cada botón en Gtk.Revealer: abrir/cerrar anima
  el ancho (crece a ambos lados). Hijos manejados a mano: <For> los quita al instante y no deja animar el cierre.
- Derecha: reloj (f017, "%a %d %b" • "%H:%M", locale es_AR).
## Fuentes
- Texto: "Inter Display" (no instalada) > "Adwaita Sans" (derivada de Inter, instalada; la que se usa) > JetBrainsMono NF. 15px, "tnum".
- .icon usa "JetBrainsMono Nerd Font Propo" (glifo centrado). CPU f4bc, RAM efc5, GPU f08ae, red f0200/f0202.
- Colores stats (fuera de paleta, pedido): cpu #ff8514, red on #3fc433 / off #c43333, ram #7db2de, gpu #a733c4.
## Estilos (validar: `ags bundle app.ts /tmp/x.js`, sin tsc; centerbox lleva cssName="centerbox")
- style/_colors.scss: 20 hex + alias $ok/$alert/$warn/$accent + derivados (hover +10%, active +14%, solid() redondea).
- style/bar.scss: $all-modules (launcher-group, workspaces, clock) genera UNA lista de selectores para el pill.
## Módulos
- Red (Net.tsx): solo ↓rx, monotónico; cambia de unidad al llegar a 1000 (base 1024). Verde (f0200) si carrier=1 y hay ruta default v4/v6;
  si no, f0202 tachado en rojo y "--" (prueba: AGS_BAR_IFACE=noexiste ags run). iface: física sin wireless/, excluye lo/docker/veth/br-/virbr/tailscale0 => enp8s0.
- CPU: delta /proc/stat. RAM: (MemTotal-MemAvailable)/MemTotal. GPU: gpu_busy_percent de la amdgpu con más VRAM (RX 580, card1).
- Workspaces: íconos activo eefe #f07f22 / inactivo f444 #f7bf91 (nombre en tooltip), hover $foreground. AstalHyprland, id>=1 del conector; click/rueda = message_async(..., callback) con "dispatch hl.dsp.focus({ workspace = N })" (la forma Promise NO existe)
  porque ws.focus() usa sintaxis vieja y Hyprland-Lua la rechaza.
- widget/Stat.tsx: ícono + [prefijo] número + unidad; gap ícono 6 (STAT_ICON_GAP), entre stats 12 (x2). Ancho natural.
  Separador Gtk.Separator logo|stats a 20px de cada lado (medido; $arch-glyph-inset=11 medido).
- Tipografía: base 500 + "tnum"; números 600, unidades 400 en $foreground2; hora 700, fecha $foreground2; ws 600/700.
- lib/sys.ts: readText/listDir nunca lanzan (GLib.Error => null; otros se loguean).
## Verificado (2026-09-26)
- Puntero real sin herramientas: script Python zwlr_virtual_pointer (move/scroll/click), el warp no sirve.
- CPU vs top, RAM vs free, red vs curl, pixel #1a1a1a, logo #1793d1, desconexión simulada, centrado de workspaces.
- Simetría medida por píxel: padding 16 en todos los pills, contenido centrado a ±0.5px (Arch +2px padding óptico).
- Hyprland: dwindle ratio 0.5, force_split=2, split_width_multiplier=1.8, follow_mouse=2 (con 0 Hyprland no manda leave: el hover no cierra), rounding 8. Hooks Lua:
  window.open_early enfoca la última en mosaico (sigue la cadena); window.close en ws vacío -> ws existente anterior.
## Pendiente
- Hora: RTC en hora local (Windows); falta `sudo timedatectl set-ntp true` + `sudo hwclock --systohc --localtime`. Borrar backups *.bak-* acumulados (pedir confirmación). Fuera de alcance: audio, tray, notif., OSD.

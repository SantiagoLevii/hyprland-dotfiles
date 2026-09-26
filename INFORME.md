# Informe técnico: entorno Hyprland + barra AGS v3

Documento de traspaso. Describe **qué hay, por qué está así y cómo se verificó**, para que otra
persona pueda replicar el entorno exactamente hasta este punto (2026-09-26) sin redescubrir los
problemas ya resueltos.

---

## 1. Máquina de referencia

| Ítem | Valor |
|---|---|
| Distro | Arch Linux (kernel 7.2.x), usuario `santi` |
| GPU | AMD RX 580 (Polaris, `card1`, 8 GB) + iGPU AMD Phoenix (`card0`, 512 MB) |
| Monitor | Uno solo: `HDMI-A-1`, 2560x1080 @ 100 Hz, scale 1 (ultrawide 21:9, 670x280 mm) |
| Teclado | Layout `latam` (la tecla a la izquierda del 1 es `|`, keysym `bar`) |
| Red | Cableada `enp8s0` (también existen `wlp7s0` y `tailscale0`, no se usan) |
| Dual boot | Hay Windows (Windows Boot Manager en EFI). **No tocar particiones ni Windows.** |
| Locale | `es_AR.UTF-8`, zona `America/Argentina/Buenos_Aires` |

---

## 2. Arquitectura

```
Hyprland 0.56.2 (config en LUA: ~/.config/hypr/hyprland.lua)
├── autostart: hyprpolkitagent, dunst, hyprpaper, cliphist, ags run
├── layout dwindle "Fibonacci" (der./abajo) + 2 hooks Lua
├── hyprpaper  -> wallpaper (hyprpaper.conf)
├── dunst      -> notificaciones + OSD de volumen (scripts/volume.sh)
├── rofi       -> lanzador (drun con íconos)
└── AGS v3 (Astal, GTK4, TSX, SCSS) -> barra superior (~/.config/ags)
    ├── izquierda: pill launcher (logo Arch) + panel de stats que se despliega en hover
    ├── centro:    workspaces (íconos, animados, click y rueda)
    └── derecha:   reloj
```

> **Importante:** Hyprland 0.56 usa `hyprland.lua`, NO `hyprland.conf`. Toda la sintaxis de
> binds, dispatchers y `hyprctl dispatch` es Lua (ver §6).

---

## 3. Hyprland (`config/hypr/hyprland.lua`)

### 3.1 Monitores y look
- `HDMI-A-1` fijado a `2560x1080@100`, cualquier otro monitor en `preferred/auto`.
- `gaps_in 3`, `gaps_out 7`, `border_size 2`, borde activo `rgb(2f518b)`, inactivo `rgb(484848)`.
- `rounding = WINDOW_RADIUS` (8 px, igual al radius de los pills de la barra). Sin sombra ni blur.
- Animaciones de la config base de Hyprland (curvas `easeOutQuint`, `almostLinear`, `quick`, spring `easy`).
- `misc.background_color = 0x111111`, sin logo ni wallpaper por defecto.

### 3.2 Input
- `kb_layout = "latam"`.
- **`follow_mouse = 2`**: el puntero actúa donde está (hover, scroll, salir de la barra) pero el
  foco de teclado **solo cambia con click**. Requisito del usuario: "mover el mouse sin que cambie
  la ventana seleccionada".
  - ⚠️ NO usar `follow_mouse = 0`: con 0 Hyprland **no envía `wl_pointer.leave`** al pasar de la
    barra a una ventana (verificado con `WAYLAND_DEBUG=client`), y el panel de stats nunca se cierra.
    Además la rueda no llega a la ventana bajo el cursor.

### 3.3 Layout dwindle "Fibonacci"
Objetivo del usuario: 1 ocupa todo; 2 divide a la mitad (1 izquierda, 2 derecha); 3 divide la mitad
derecha (2 arriba, 3 abajo); 4 a la derecha de 3; 5 debajo de 4; etc.

```lua
dwindle = {
    preserve_split         = true,
    default_split_ratio    = EQUAL_SPLIT_RATIO * BSPWM_TO_DWINDLE_RATIO, -- 0.5 * 2 = 1.0 (mitades exactas)
    force_split            = 2,    -- nueva ventana siempre derecha/abajo
    split_width_multiplier = 1.8,  -- en ultrawide dwindle partiría siempre a lo ancho; esto fuerza a alternar
}
```
- El 1.8 se eligió entre las cotas 1.25 y 2.5 que garantizan alternar lado/abajo con 2560x1080.
- Antes el ratio era 1.04 (legado bspwm 0.52) y las mitades no eran iguales: corregido.
- Resultado medido (5 kitty): `1:[9,61 1317x1010]`, `2:[1336,61]`, `3:[1336,591]`, `4:[1971,591]`, `5:[1971,844]`.

### 3.4 Hooks Lua (API de eventos de Hyprland 0.56)
1. **`window.open_early`**: dwindle parte la ventana *enfocada*. Para que la nueva ventana continúe
   siempre la cadena Fibonacci sin importar el foco, antes de insertarla se enfoca la ventana en
   mosaico más reciente del workspace (mayor `stable_id`). Verificado enfocando la ventana 1 y la 2
   antes de abrir la 4 y la 5: la cadena siguió intacta.
2. **`window.close`**: si se cierra la última ventana del workspace **activo**, se pasa al workspace
   existente con número más cercano por debajo (si no hay, al más cercano por arriba). Si el cierre
   ocurre en otro workspace, no hace nada.

Objetos Lua útiles (descubiertos inspeccionando `pairs(hl)`): `hl.get_active_window()`,
`hl.get_active_workspace()`, `hl.get_workspaces()`, `hl.get_workspace_windows(ws)`, `hl.on(evento, fn)`,
`hl.dispatch(hl.dsp.*)`. Ventana: `stable_id`, `address`, `class`, `floating`, `mapped`, `workspace`.
Workspace: `id`, `name`, `windows`, `monitor`, `special`.

### 3.5 Atajos principales (`SUPER` = mainMod)
| Atajo | Acción |
|---|---|
| `SUPER + Return` | kitty |
| `SUPER + \|` (keysym `bar`) | rofi `-show drun -show-icons` (antes era SUPER+D) |
| `SUPER + E` / `SUPER + SHIFT + F` | thunar / chromium |
| `SUPER + Print` | captura de región al portapapeles: `grim -g "$(slurp; sleep 0.2)" - \| wl-copy` |
| `SUPER + W` / `SUPER + SHIFT + W` | cerrar / matar ventana |
| `SUPER + F` / `SUPER + M` | fullscreen / maximizar |
| `SUPER + S` / `SUPER + T` / `SUPER + SHIFT + T` | toggle float / tile / pseudo |
| `SUPER + flechas` | foco por dirección |
| `SUPER + SHIFT + flechas` | swap |
| `SUPER + CTRL + ALT + flechas` | preselección dwindle |
| `SUPER + CTRL + flechas` / `SUPER + ALT + flechas` | mover / redimensionar flotante (20 px) |
| `SUPER + 1..0` / `SUPER + SHIFT + 1..0` | ir a / mover a workspace |
| `SUPER + CTRL + 1..9` | split ratio exacto (i/10, estilo bspwm) |
| `SUPER + [` / `]`, `SUPER + Tab`, `SUPER + grave` | workspace anterior/siguiente, previo, última ventana |
| `SUPER + G` | mover a la raíz del árbol dwindle |
| `SUPER + Escape` / `SUPER + ALT + R` | `hyprctl reload` |
| `SUPER + ALT + Q` | salir de Hyprland |
| Teclas multimedia | `scripts/volume.sh up/down/mute` (OSD con dunst), `playerctl` |

> **Nota sobre la captura:** el `sleep 0.2` evita un recuadro gris en la mitad inferior de la región
> capturada (bug observado con slurp+grim, causa no confirmada). **No quitarlo ni cambiar el valor.**

### 3.6 Autostart
```lua
hl.on("hyprland.start", function()
    hl.exec_cmd("/usr/lib/hyprpolkitagent/hyprpolkitagent")
    hl.exec_cmd("dunst")
    hl.exec_cmd("hyprpaper")
    hl.exec_cmd("wl-paste --watch cliphist store")
    hl.exec_cmd("ags run --directory ~/.config/ags")
end)
```

---

## 4. Barra AGS v3 (`config/ags/`)

### 4.1 Stack y reglas técnicas (verificadas en producción)
1. **Solo API de AGS v3 / gnim**: `createState`, `createBinding`, `createComputed`, `createPoll`,
   `<For>`, `<With>`, `createRoot`, `onCleanup`. **Prohibido** `Variable`, `bind`, `astalify`, `astal/`.
2. Runtime **GJS** (no Node, no Bun).
3. GTK CSS: sin `!important`, sin `:root`/`var()`. Alpha con `color.change()`. `@use`/`@forward`, nunca `@import`.
4. Codepoints Nerd Font en JSX **siempre** como `{"\u{XXXX}"}` (en string literal de atributo no se resuelven).
5. Toda lectura de archivo/subproceso en try/catch con fallback `"--"` (una excepción mata la barra).
   `lib/sys.ts` (`readText`, `listDir`) nunca lanza.
6. Namespace del layer explícito: `"ags-bar"` (ver con `hyprctl layers`).
7. `npm install` **no hace falta**: `node_modules/{ags,gnim}` son symlinks a `/usr/share/ags/js`
   (los crea `ags init`; `install.sh` los recrea). `@girs/` se regenera con `ags types`.
8. `createPoll(init, ms, fn(prev))` es la firma instalada (ver `/usr/share/ags/js/lib/time.ts`).
9. `ags --version` muestra 3.1.0 aunque sea 3.1.2 (archivo de versión desactualizado upstream).
10. No hay `tsc`: se valida con `ags bundle app.ts /tmp/x.js` (esbuild, sin chequeo de tipos).

### 4.2 Estructura
```
app.ts               arranque: app.start({ css, main: monitores -> Bar })
style.scss           entrada: @use "style/bar"
style/_colors.scss   paleta (20 hex base) + colores de stats/workspaces + estados derivados
style/bar.scss       geometría, pills, tipografía
lib/sys.ts           FALLBACK "--", POLL_MS 1000, readText/listDir sin excepciones
widget/Bar.tsx       <window> layer TOP|LEFT|RIGHT, EXCLUSIVE, namespace "ags-bar", <centerbox>
widget/Launcher.tsx  pill izquierdo: botón Arch (rofi) + revealer con stats en hover
widget/Stat.tsx      componente común: ícono + [prefijo] número + unidad
widget/Net.tsx       bajada de red (rx) + estado de conexión
widget/Cpu.tsx       CPU % (delta /proc/stat)
widget/Ram.tsx       RAM % ((MemTotal-MemAvailable)/MemTotal)
widget/Gpu.tsx       GPU % (gpu_busy_percent de la amdgpu con más VRAM)
widget/Workspaces.tsx workspaces animados, click y rueda
widget/Clock.tsx     fecha "%a %d %b" • hora "%H:%M"
NOTES.md             resumen corto para retomar
```

### 4.3 Geometría (referencia 1920x1080, escalada en runtime)
- Márgenes laterales `round(19 * ancho/1920)` = 25 px; superior `round(6 * alto/1080)` = 6 px
  (se leen de `Gdk.Monitor.get_geometry()`, no se hardcodea el conector).
- Alto 46 px, padding de pill 16, radius 8, borde 1 px `color.change($foreground, $alpha: 0.1)`.
- Zona exclusiva: 52 px (46 + 6). Las ventanas empiezan en y=61 (52 + gaps_out 7 + border 2).
- **Simetría medida por píxel** (grim + python): padding 16 en todos los pills; contenido centrado ±0.5 px.
- `GtkCenterBox` tiene nodo CSS `box`: se le fija `cssName="centerbox"` para poder estilarlo.

### 4.4 Paleta (`style/_colors.scss`)
Base (exactamente 20): background `#1a1a1a`, foreground `#e0e0e0`, foreground2 `#c6c6c6`,
highlight `#ff2c2c`, highlight2 `#fab387`, bordes `#2c2c2c`, bordes2 `#3a3a3a`, red `#ff2c2c`,
pink `#ff5588`, purple `#7e3ff2`, brown `#a65e3b`, grey `#5a5a5a`, indigo `#4b3b9b`, amber `#ff9e3b`,
orange `#ff6400`, green `#7ccf41`, yellow `#e0c240`, teal `#008080`, cyan `#4eb3d3`, blue `#5068d8`.
Alias: `$ok: $green`, `$alert: $red`, `$warn: $amber`, `$accent: $blue`.
Derivados (sass:color, redondeados con `solid()`): hover +10% lightness, active +14%, elevated +6%.

Pedidos explícitos del usuario, fuera de la paleta base:
| Uso | Color |
|---|---|
| Logo Arch | `#1793d1` |
| CPU | `#ff8514` |
| Red conectada / desconectada | `#3fc433` / `#c43333` |
| RAM | `#7db2de` |
| GPU | `#a733c4` |
| Workspace activo / inactivo | `#f07f22` / `#f7bf91` |

### 4.5 Tipografía
- Texto: `"Inter Display", "Adwaita Sans", "JetBrainsMono Nerd Font", ...` 15 px, peso 500,
  `font-feature-settings: "tnum"`. Inter Display **no está instalada**; en la práctica se usa
  **Adwaita Sans** (derivada de Inter, paquete `adwaita-fonts`).
- Íconos: clase `.icon` con `"JetBrainsMono Nerd Font Propo"`. La variante *Propo* hace coincidir
  el avance del glifo con su dibujo: con la variante normal el logo de Arch quedaba 3.5 px corrido.
- Jerarquía: números de stats 600, unidades 400 en `$foreground2`; hora 700, fecha `$foreground2`.
- Logo Arch: `padding-top: 2px` óptico (el glifo tiene el dibujo 1 px arriba de su centro).

### 4.6 Módulos
**Launcher** (izquierda): cuadrado 46x46 con logo Arch (`\u{f303}`). Click → `rofi -show drun -show-icons`.
Hover (`Gtk.EventControllerMotion`) abre un `revealer` SLIDE_RIGHT (250 ms) con:
separador vertical `|` (a 20 px exactos del logo y del primer stat) + Red, CPU, RAM, GPU.
El cierre tiene retardo de 150 ms (evita parpadeo por `leave` espurios durante la animación).

**Stat** (`widget/Stat.tsx`): ícono a 6 px del valor (`STAT_ICON_GAP`), entre stats 12 px (el doble).
Ancho natural (sin `widthChars`): con ancho fijo aparecía un hueco feo entre ícono y valor.

**Red**: detecta en runtime la interfaz cableada = física (`/sys/class/net/X/device` existe) y sin
`wireless/`, excluyendo `lo|docker*|veth*|br-*|virbr*|tailscale0` → `enp8s0`. Si hay 0 o >1
candidatas, muestra desconectado (y loguea). Velocidad = delta `rx_bytes` / reloj monotónico
(`GLib.get_monotonic_time`), base 1024, cambia de unidad al llegar a 1000 (máx. 3 dígitos enteros).
Conectado (ícono `\u{f0200}` verde) si `carrier == 1` **y** hay ruta por defecto por esa interfaz
(`/proc/net/route` destino `00000000`, o `/proc/net/ipv6_route`). Si no: cable tachado `\u{f0202}`
rojo y `--`. Prueba: `AGS_BAR_IFACE=noexiste ags run` o `AGS_BAR_IFACE=tailscale0 ags run`.

**CPU** `\u{f4bc}`: delta de `/proc/stat` (8 campos; idle = idle + iowait); primera lectura `--`.
**RAM** `\u{efc5}`: `(MemTotal - MemAvailable) / MemTotal` (no MemFree).
**GPU** `\u{f08ae}`: `/sys/class/drm/cardN/device/gpu_busy_percent` de la amdgpu con mayor
`mem_info_vram_total` (la RX 580, no la iGPU).

**Workspaces** (centro, centrado exacto por el centerbox, medido x=1280 ±0.5):
- Solo workspaces existentes, `id >= 1`, del monitor de la barra (conector del `Gdk.Monitor`).
- Activo `\u{eefe}` (fantasma) `#f07f22`; inactivo `\u{f444}` (punto) `#f7bf91`; hover `$foreground`;
  nombre en tooltip. Caja fija de 14 px por ícono.
- Cada botón vive dentro de un `Gtk.Revealer`: al abrir/cerrar un workspace el pill anima su ancho
  y, al estar centrado, crece hacia ambos lados. Los hijos se manejan **a mano** (no `<For>`):
  `<For>` quita el hijo al instante y no deja animar el cierre.
- Click y rueda (`Gtk.EventControllerScroll` VERTICAL|DISCRETE, abajo = siguiente, sin wrap) llaman a
  `hypr.message_async('dispatch hl.dsp.focus({ workspace = N })', callback)`.
  - ⚠️ `Workspace.focus()` de AstalHyprland manda `dispatch workspace N` (sintaxis vieja): Hyprland-Lua lo rechaza.
  - ⚠️ La forma Promise de `message_async` **no existe** en este binding: exige callback + `message_finish`.

**Reloj** (derecha): `GLib.DateTime` + `createPoll` 1 s. `%a %d %b` • `%H:%M`, ícono `\u{f017}`.

---

## 5. Verificación (cómo se probó cada cosa)
| Qué | Cómo | Resultado |
|---|---|---|
| CPU | 6x `yes > /dev/null` en 12 hilos vs `top` | 51% vs 51.6% |
| RAM | vs `free -m` | 27% vs 27.4% |
| Red | `curl --limit-rate 2M` | 2.1 MB/s (overhead TCP/TLS) |
| Colores | `grim -t ppm` + python (sin PIL ni ImageMagick) | hex exactos |
| Desconexión | `AGS_BAR_IFACE=noexiste` / `tailscale0` | rojo tachado, sin excepciones |
| Geometría | `hyprctl layers -j`, `hyprctl monitors -j` (reserved) | h=46, reserved top 52 |
| Hover/click/rueda | `tools/vptr.py` (puntero virtual Wayland) | OK 3/3 ciclos |
| Fibonacci/foco | abrir kitty `--class fibtestN` en ws 9 y leer `hyprctl clients -j` | patrón exacto |

**`tools/vptr.py`**: cliente Wayland en Python puro (sin dependencias) que usa
`zwlr_virtual_pointer_v1` para generar movimiento absoluto, rueda y click **reales**:
```bash
python3 tools/vptr.py move:1280,600 sleep:0.2 move:47,29 sleep:1   # hover sobre el launcher
python3 tools/vptr.py move:1270,29 scroll:1                          # rueda abajo en workspaces
python3 tools/vptr.py move:1292,29 click                             # click
```
> `hl.dsp.cursor.move` (warp) **no sirve** para probar hover: Hyprland manda enter/leave espurios.
> `pkill -f` puede matar tu propio shell si el patrón aparece en el comando: usar `pgrep -x`/`kill PID`.

---

## 6. Hyprland 0.56 con config Lua: cheatsheet
```bash
hyprctl reload && hyprctl configerrors
hyprctl dispatch 'hl.dsp.focus({ workspace = 2 })'
hyprctl dispatch 'hl.dsp.exec_cmd("ags run --directory ~/.config/ags")'
hyprctl dispatch 'hl.dsp.cursor.move({ x = 100, y = 100 })'
hyprctl getoption dwindle:force_split -j
# evaluar Lua arbitrario (volcar a archivo, el retorno debe ser un dispatcher):
hyprctl dispatch "(function() local f=io.open('/tmp/x','w') f:write(tostring(hl.get_active_window().class)) f:close() return hl.dsp.exec_cmd('true') end)()"
```
`hyprctl dispatch workspace 2` (sintaxis vieja) **falla** con `')' expected near '2'`.

---

## 7. Pendientes / estado del sistema
- **Hora**: la zona es correcta pero NTP estaba inactivo y el RTC se lee como hora local (hay
  Windows). Solución elegida (mantiene RTC local, compatible con Windows), requiere sudo:
  ```bash
  sudo timedatectl set-ntp true
  sudo hwclock --systohc --localtime   # un minuto después, ya sincronizado
  ```
- `hyprpaper.conf` tiene el monitor `HDMI-A-1` fijo: ajustarlo en otra máquina.
- Kitty corre con la configuración de fábrica (`~/.config/kitty` vacío, a propósito).
- dunst y rofi usan su configuración de fábrica.
- Fuera de alcance por ahora: audio en la barra, tray, notificaciones propias, OSD en AGS.

## 8. Replicar desde cero
Ver `README.md` (instalación) y `TECNOLOGIAS.txt` (paquetes). Resumen:
1. Instalar paquetes de repo oficial + AUR (`packages/pacman.txt`, `packages/aur.txt`).
2. `./install.sh` (copia configs con backup, recrea symlinks de AGS, corre `ags types`).
3. Ajustar monitor en `hyprland.lua` y `hyprpaper.conf` si no es `HDMI-A-1` 2560x1080@100.
4. Cerrar sesión y entrar a Hyprland. Verificar con `hyprctl layers | grep ags-bar`.

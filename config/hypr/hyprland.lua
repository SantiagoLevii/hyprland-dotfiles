-- Hyprland 0.56 (config Lua). Base: /usr/share/hypr/hyprland.lua
-- Binds migrados de sxhkd/bspwm (dottss). Doc: https://wiki.hypr.land/

------------------
---- MONITORS ----
------------------

hl.monitor({
    output   = "HDMI-A-1",
    mode     = "2560x1080@100",
    position = "0x0",
    scale    = 1,
})

-- Cualquier otro monitor que se conecte
hl.monitor({
    output   = "",
    mode     = "preferred",
    position = "auto",
    scale    = "auto",
})


---------------------
---- MY PROGRAMS ----
---------------------

local terminal    = "kitty"
local fileManager = "thunar"
local menu        = "rofi -show drun -show-icons"
local browser     = "chromium"
local screenshot  = 'grim -g "$(slurp; sleep 0.2)" - | wl-copy'
local volume      = os.getenv("HOME") .. "/.config/hypr/scripts/volume.sh"
local WINDOW_RADIUS = 8 -- px


-------------------
---- AUTOSTART ----
-------------------

hl.on("hyprland.start", function()
    hl.exec_cmd("/usr/lib/hyprpolkitagent/hyprpolkitagent")
    hl.exec_cmd("dunst")
    hl.exec_cmd("hyprpaper")
    hl.exec_cmd("wl-paste --watch cliphist store")
    hl.exec_cmd("ags run --directory ~/.config/ags")
end)


-------------------------------
---- ENVIRONMENT VARIABLES ----
-------------------------------

-- Symlink estable a la RX 580 (regla udev 61-rx580-dev-path.rules): by-path tiene ':' y
-- AQ_DRM_DEVICES usa ':' como separador, y cardN cambia entre arranques.
hl.env("AQ_DRM_DEVICES", "/dev/dri/rx580")
hl.env("XCURSOR_SIZE", "24")
hl.env("HYPRCURSOR_SIZE", "24")


-----------------------
---- LOOK AND FEEL ----
-----------------------

-- Look portado de bspwmrc: border_width 2, window_gap 7; bordes redondeados como la barra.
-- En Hyprland el espacio entre ventanas es 2 * gaps_in.
hl.config({
    general = {
        gaps_in     = 3,
        gaps_out    = 7,
        border_size = 2,
        col = {
            active_border   = "rgb(2f518b)",
            inactive_border = "rgb(484848)",
        },
        resize_on_border = false,
        allow_tearing    = false,
        layout           = "dwindle",
    },

    decoration = {
        -- Mismo radio que los pills de la barra AGS (style/bar.scss $radius).
        rounding         = WINDOW_RADIUS,
        active_opacity   = 1.0,
        inactive_opacity = 1.0,
        shadow = { enabled = false },
        blur   = { enabled = false },
    },

    animations = {
        enabled = true,
    },
})

hl.curve("easeOutQuint", { type = "bezier", points = { {0.23, 1},  {0.32, 1} } })
hl.curve("linear",       { type = "bezier", points = { {0, 0},     {1, 1}    } })
hl.curve("almostLinear", { type = "bezier", points = { {0.5, 0.5}, {0.75, 1} } })
hl.curve("quick",        { type = "bezier", points = { {0.15, 0},  {0.1, 1}  } })
hl.curve("easy",         { type = "spring", mass = 1, stiffness = 238.1191, dampening = 24.21279333 })

hl.animation({ leaf = "global",        enabled = true, speed = 10,   bezier = "default" })
hl.animation({ leaf = "border",        enabled = true, speed = 5.39, bezier = "easeOutQuint" })
hl.animation({ leaf = "windows",       enabled = true, speed = 4.79, spring = "easy" })
hl.animation({ leaf = "windowsIn",     enabled = true, speed = 4.1,  spring = "easy",         style = "popin 87%" })
hl.animation({ leaf = "windowsOut",    enabled = true, speed = 1.49, bezier = "linear",       style = "popin 87%" })
hl.animation({ leaf = "fadeIn",        enabled = true, speed = 1.73, bezier = "almostLinear" })
hl.animation({ leaf = "fadeOut",       enabled = true, speed = 1.46, bezier = "almostLinear" })
hl.animation({ leaf = "fade",          enabled = true, speed = 3.03, bezier = "quick" })
hl.animation({ leaf = "layers",        enabled = true, speed = 3.81, bezier = "easeOutQuint" })
hl.animation({ leaf = "layersIn",      enabled = true, speed = 4,    bezier = "easeOutQuint", style = "fade" })
hl.animation({ leaf = "layersOut",     enabled = true, speed = 1.5,  bezier = "linear",       style = "fade" })
hl.animation({ leaf = "fadeLayersIn",  enabled = true, speed = 1.79, bezier = "almostLinear" })
hl.animation({ leaf = "fadeLayersOut", enabled = true, speed = 1.39, bezier = "almostLinear" })
hl.animation({ leaf = "workspaces",    enabled = true, speed = 1.94, bezier = "almostLinear", style = "fade" })
hl.animation({ leaf = "workspacesIn",  enabled = true, speed = 1.21, bezier = "almostLinear", style = "fade" })
hl.animation({ leaf = "workspacesOut", enabled = true, speed = 1.94, bezier = "almostLinear", style = "fade" })
hl.animation({ leaf = "zoomFactor",    enabled = true, speed = 7,    bezier = "quick" })

-- dwindle usa 1.0 = mitad; los ratios estilo bspwm (0-1) se multiplican por 2
local BSPWM_TO_DWINDLE_RATIO = 2
-- Cada ventana nueva parte exactamente a la mitad el espacio de la anterior.
local EQUAL_SPLIT_RATIO      = 0.5
local FORCE_SPLIT_RIGHT_BOTTOM = 2
local SPLIT_WIDTH_MULTIPLIER   = 1.8

hl.config({
    dwindle = {
        preserve_split         = true,
        default_split_ratio    = EQUAL_SPLIT_RATIO * BSPWM_TO_DWINDLE_RATIO,
        -- La ventana nueva va siempre a la derecha/abajo (patrón Fibonacci-dwindle).
        force_split            = FORCE_SPLIT_RIGHT_BOTTOM,
        -- En ultrawide dwindle parte siempre a lo ancho; el multiplicador fuerza a alternar lado/abajo.
        split_width_multiplier = SPLIT_WIDTH_MULTIPLIER,
    },
})

-- Dwindle parte siempre la ventana enfocada. Para que la nueva continúe la cadena
-- Fibonacci (derecha/abajo) sin importar el foco, antes de insertarla se enfoca la
-- ventana en mosaico más reciente del workspace (mayor stable_id = última abierta).
hl.on("window.open_early", function(new_window)
    local workspace = hl.get_active_workspace()
    if workspace == nil then return end
    local new_id = new_window and new_window.stable_id
    local newest = nil
    for _, w in ipairs(hl.get_workspace_windows(workspace)) do
        if w.mapped and not w.floating and w.stable_id ~= new_id
            and (newest == nil or w.stable_id > newest.stable_id) then
            newest = w
        end
    end
    local active = hl.get_active_window()
    if newest == nil or (active ~= nil and active.stable_id == newest.stable_id) then return end
    hl.dispatch(hl.dsp.focus({ window = "address:" .. newest.address }))
end)

-- Al cerrar la última ventana del workspace activo, pasar al workspace existente con
-- número más cercano por debajo (si no hay, al más cercano por arriba).
hl.on("window.close", function(closed)
    local current = hl.get_active_workspace()
    if closed == nil or current == nil or closed.workspace == nil then return end
    if closed.workspace.id ~= current.id then return end
    for _, w in ipairs(hl.get_workspace_windows(current)) do
        if w.stable_id ~= closed.stable_id then return end
    end
    local below, above = nil, nil
    for _, ws in ipairs(hl.get_workspaces()) do
        local id = ws.id
        if not ws.special and id ~= current.id and id >= 1 then
            if id < current.id and (below == nil or id > below) then below = id end
            if id > current.id and (above == nil or id < above) then above = id end
        end
    end
    local target = below or above
    if target == nil then return end
    hl.dispatch(hl.dsp.focus({ workspace = target }))
end)

hl.config({
    misc = {
        force_default_wallpaper = 0,
        disable_hyprland_logo   = true,
        -- Fondo sólido hasta definir wallpaper en hyprpaper.conf
        background_color        = 0x111111,
    },
})


---------------
---- INPUT ----
---------------

hl.config({
    input = {
        kb_layout    = "latam",
        kb_variant   = "",
        kb_model     = "",
        kb_options   = "",
        kb_rules     = "",
        -- 2: el puntero sigue al mouse (hover, scroll, salir de la barra) pero el foco de teclado
        -- solo cambia con click. Con 0 Hyprland ni siquiera manda "leave" al pasar a otra superficie.
        follow_mouse = 2,
        sensitivity  = 0,
    },
})


---------------------
---- KEYBINDINGS ----
---------------------

local mainMod     = "SUPER"
local MOVE_STEP   = 20 -- px, igual que "bspc node -v" del sxhkdrc
local RESIZE_STEP = 20 -- px

-- Apps
hl.bind(mainMod .. " + Return",    hl.dsp.exec_cmd(terminal))
hl.bind(mainMod .. " + bar",       hl.dsp.exec_cmd(menu))
hl.bind(mainMod .. " + E",         hl.dsp.exec_cmd(fileManager))
hl.bind(mainMod .. " + SHIFT + F", hl.dsp.exec_cmd(browser))
hl.bind(mainMod .. " + Print",     hl.dsp.exec_cmd(screenshot))

-- Sesión: reload reemplaza "pkill -USR1 sxhkd" y "bspc wm -r"
hl.bind(mainMod .. " + Escape",    hl.dsp.exec_cmd("hyprctl reload"))
hl.bind(mainMod .. " + ALT + R",   hl.dsp.exec_cmd("hyprctl reload"))
hl.bind(mainMod .. " + ALT + Q",   hl.dsp.exit())

-- Cerrar / matar
hl.bind(mainMod .. " + W",         hl.dsp.window.close())
hl.bind(mainMod .. " + SHIFT + W", hl.dsp.window.kill())

-- Estados (bspc node -t ...). El "monocle" de bspwm ≈ maximizar
hl.bind(mainMod .. " + M",         hl.dsp.window.fullscreen({ mode = "maximized", action = "toggle" }))
hl.bind(mainMod .. " + T",         hl.dsp.window.float({ action = "unset" }))
hl.bind(mainMod .. " + SHIFT + T", hl.dsp.window.pseudo())
hl.bind(mainMod .. " + S",         hl.dsp.window.float({ action = "toggle" }))
hl.bind(mainMod .. " + F",         hl.dsp.window.fullscreen({ mode = "fullscreen", action = "toggle" }))
-- sticky de bspwm ≈ pin (solo ventanas flotantes)
hl.bind(mainMod .. " + CTRL + Y",  hl.dsp.window.pin())

-- "swap biggest" ≈ subir la ventana a la raíz del árbol dwindle
hl.bind(mainMod .. " + G",         hl.dsp.layout("movetoroot"))

-- Foco, swap, preselección, mover flotante y resize por dirección
local directions = {
    { key = "Left",  dir = "left",  presel = "l", dx = -1, dy =  0 },
    { key = "Down",  dir = "down",  presel = "d", dx =  0, dy =  1 },
    { key = "Up",    dir = "up",    presel = "u", dx =  0, dy = -1 },
    { key = "Right", dir = "right", presel = "r", dx =  1, dy =  0 },
}

for _, d in ipairs(directions) do
    hl.bind(mainMod .. " + " .. d.key,              hl.dsp.focus({ direction = d.dir }))
    hl.bind(mainMod .. " + SHIFT + " .. d.key,      hl.dsp.window.swap({ direction = d.dir }))
    hl.bind(mainMod .. " + CTRL + ALT + " .. d.key, hl.dsp.layout("preselect " .. d.presel))
    hl.bind(mainMod .. " + CTRL + " .. d.key,
        hl.dsp.window.move({ x = d.dx * MOVE_STEP, y = d.dy * MOVE_STEP, relative = true }),
        { repeating = true })
    hl.bind(mainMod .. " + ALT + " .. d.key,
        hl.dsp.window.resize({ x = d.dx * RESIZE_STEP, y = d.dy * RESIZE_STEP, relative = true }),
        { repeating = true })
end

-- Ciclar ventanas, workspace anterior/siguiente, última ventana/workspace
hl.bind(mainMod .. " + C",            hl.dsp.window.cycle_next())
hl.bind(mainMod .. " + SHIFT + C",    hl.dsp.window.cycle_next({ next = false }))
hl.bind(mainMod .. " + bracketleft",  hl.dsp.focus({ workspace = "e-1" }))
hl.bind(mainMod .. " + bracketright", hl.dsp.focus({ workspace = "e+1" }))
hl.bind(mainMod .. " + grave",        hl.dsp.focus({ last = true }))
hl.bind(mainMod .. " + Tab",          hl.dsp.focus({ workspace = "previous" }))

-- Ratio del split (bspc node -o 0.N)
for i = 1, 9 do
    local ratio = i / 10 * BSPWM_TO_DWINDLE_RATIO
    hl.bind(mainMod .. " + CTRL + " .. i, hl.dsp.layout("splitratio " .. ratio .. " exact"))
end

-- Workspaces 1-10
for i = 1, 10 do
    local key = i % 10 -- 10 va en la tecla 0
    hl.bind(mainMod .. " + " .. key,         hl.dsp.focus({ workspace = i }))
    hl.bind(mainMod .. " + SHIFT + " .. key, hl.dsp.window.move({ workspace = i }))
end

-- Mouse
hl.bind(mainMod .. " + mouse_down", hl.dsp.focus({ workspace = "e+1" }))
hl.bind(mainMod .. " + mouse_up",   hl.dsp.focus({ workspace = "e-1" }))
hl.bind(mainMod .. " + mouse:272",  hl.dsp.window.drag(),   { mouse = true })
hl.bind(mainMod .. " + mouse:273",  hl.dsp.window.resize(), { mouse = true })

-- Multimedia (OSD de volumen con dunst)
hl.bind("XF86AudioRaiseVolume", hl.dsp.exec_cmd(volume .. " up"),   { locked = true, repeating = true })
hl.bind("XF86AudioLowerVolume", hl.dsp.exec_cmd(volume .. " down"), { locked = true, repeating = true })
hl.bind("XF86AudioMute",        hl.dsp.exec_cmd(volume .. " mute"), { locked = true })
hl.bind("XF86AudioMicMute",     hl.dsp.exec_cmd("wpctl set-mute @DEFAULT_AUDIO_SOURCE@ toggle"), { locked = true })
hl.bind("XF86AudioNext",        hl.dsp.exec_cmd("playerctl next"),       { locked = true })
hl.bind("XF86AudioPause",       hl.dsp.exec_cmd("playerctl play-pause"), { locked = true })
hl.bind("XF86AudioPlay",        hl.dsp.exec_cmd("playerctl play-pause"), { locked = true })
hl.bind("XF86AudioPrev",        hl.dsp.exec_cmd("playerctl previous"),   { locked = true })


--------------------------------
---- WINDOWS AND WORKSPACES ----
--------------------------------

hl.window_rule({
    name  = "suppress-maximize-events",
    match = { class = ".*" },
    suppress_event = "maximize",
})

hl.window_rule({
    name  = "fix-xwayland-drags",
    match = {
        class      = "^$",
        title      = "^$",
        xwayland   = true,
        float      = true,
        fullscreen = false,
        pin        = false,
    },
    no_focus = true,
})

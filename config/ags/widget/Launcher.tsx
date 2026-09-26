import GLib from "gi://GLib"
import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { createState, onCleanup } from "ags"
import Net from "./Net"
import Cpu from "./Cpu"
import Ram from "./Ram"
import Gpu from "./Gpu"
import { STAT_GROUP_GAP } from "./Stat"

// Mismo comando que el atajo SUPER+| en hyprland.lua.
const LAUNCHER_CMD = ["rofi", "-show", "drun", "-show-icons"]
const REVEAL_MS = 250
// Un "leave" suelto (p. ej. al cambiar el tamaño durante la animación) no debe cerrar el panel.
const COLLAPSE_DELAY_MS = 150

function openLauncher() {
  execAsync(LAUNCHER_CMD).catch((e: unknown) => console.error("launcher:", e))
}

export default function Launcher() {
  const [expanded, setExpanded] = createState(false)
  let collapseSource: number | null = null

  function cancelCollapse() {
    if (collapseSource === null) return
    GLib.source_remove(collapseSource)
    collapseSource = null
  }

  function onEnter() {
    cancelCollapse()
    setExpanded(true)
  }

  function onLeave() {
    cancelCollapse()
    collapseSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, COLLAPSE_DELAY_MS, () => {
      collapseSource = null
      setExpanded(false)
      return GLib.SOURCE_REMOVE
    })
  }

  onCleanup(cancelCollapse)

  return (
    <box class="launcher-group">
      <Gtk.EventControllerMotion onEnter={onEnter} onLeave={onLeave} />
      <button class="launcher" onClicked={openLauncher}>
        <label class="icon arch-logo" label={"\u{f303}"} />
      </button>
      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        transitionDuration={REVEAL_MS}
        revealChild={expanded}
      >
        <box class="stats" spacing={STAT_GROUP_GAP}>
          <Gtk.Separator class="stats-separator" orientation={Gtk.Orientation.VERTICAL} />
          <Net />
          <Cpu />
          <Ram />
          <Gpu />
        </box>
      </revealer>
    </box>
  )
}

import AstalHyprland from "gi://AstalHyprland"
import GLib from "gi://GLib"
import { Gdk, Gtk } from "ags/gtk4"
import { createBinding, onCleanup } from "ags"

// Los workspaces especiales (scratchpads) tienen id negativo.
const FIRST_REGULAR_ID = 1
const DISPATCH_OK = "ok"
const TRANSITION_MS = 250
const ACTIVE_CLASS = "ws-active"
const ICON_ACTIVE = "\u{eefe}"
const ICON_INACTIVE = "\u{f444}"

interface Entry {
  revealer: Gtk.Revealer
  button: Gtk.Button
  icon: Gtk.Label
  closing: boolean
}

// Workspace.focus() manda "dispatch workspace N" (sintaxis vieja): Hyprland con config Lua lo rechaza.
// La variante con Promise de message_async no está disponible en este binding (exige callback).
function focusWorkspace(hypr: AstalHyprland.Hyprland, id: number) {
  hypr.message_async(`dispatch hl.dsp.focus({ workspace = ${id} })`, (_, result) => {
    try {
      const reply = hypr.message_finish(result)
      if (reply.trim() !== DISPATCH_OK) console.error(`workspaces: focus ${id}: ${reply}`)
    } catch (e) {
      if (!(e instanceof GLib.Error)) throw e
      console.error(`workspaces: focus ${id}: ${e.message}`)
    }
  })
}

// Se manejan los hijos a mano (no <For>): <For> los quita al instante y no deja animar el cierre.
export default function Workspaces({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  const hypr = AstalHyprland.get_default()
  const connector = gdkmonitor.get_connector()
  const focused = createBinding(hypr, "focusedWorkspace")
  const workspaces = createBinding(hypr, "workspaces").as((all) =>
    all
      .filter((ws) => ws.id >= FIRST_REGULAR_ID && ws.monitor?.name === connector)
      .sort((a, b) => a.id - b.id),
  )
  const entries = new Map<number, Entry>()
  let container: Gtk.Box | null = null

  function createEntry(box: Gtk.Box, ws: AstalHyprland.Workspace, after: Gtk.Widget | null): Entry {
    const id = ws.id
    const icon = new Gtk.Label({ label: ICON_INACTIVE, cssClasses: ["icon", "ws-icon"] })
    const button = new Gtk.Button({ child: icon, tooltipText: ws.name })
    button.add_css_class("ws-button")
    button.connect("clicked", () => focusWorkspace(hypr, id))
    const revealer = new Gtk.Revealer({
      child: button,
      transitionType: Gtk.RevealerTransitionType.SLIDE_RIGHT,
      transitionDuration: TRANSITION_MS,
      revealChild: false,
    })
    revealer.connect("notify::child-revealed", () => {
      const entry = entries.get(id)
      if (!entry?.closing || revealer.childRevealed) return
      box.remove(revealer)
      entries.delete(id)
    })
    box.insert_child_after(revealer, after)
    // Revelar en el siguiente ciclo, ya mapeado, para que la transición se anime.
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      revealer.revealChild = true
      return GLib.SOURCE_REMOVE
    })
    return { revealer, button, icon, closing: false }
  }

  function syncFocus() {
    const activeId = focused.peek()?.id
    for (const [id, { button, icon }] of entries) {
      const active = id === activeId
      icon.label = active ? ICON_ACTIVE : ICON_INACTIVE
      if (active) button.add_css_class(ACTIVE_CLASS)
      else button.remove_css_class(ACTIVE_CLASS)
    }
  }

  function syncWorkspaces() {
    const box = container
    if (!box) return
    const list = workspaces.peek()
    const alive = new Set(list.map((ws) => ws.id))
    for (const [id, entry] of entries) {
      if (alive.has(id) || entry.closing) continue
      entry.closing = true
      entry.revealer.revealChild = false
    }
    let previous: Gtk.Widget | null = null
    for (const ws of list) {
      let entry = entries.get(ws.id)
      if (entry?.closing) {
        entry.closing = false
        entry.revealer.revealChild = true
      }
      if (!entry) {
        entry = createEntry(box, ws, previous)
        entries.set(ws.id, entry)
      }
      previous = entry.revealer
    }
    syncFocus()
  }

  // Un paso de rueda = un workspace; hacia abajo el siguiente. En los extremos se detiene.
  function onScroll(_: Gtk.EventControllerScroll, _dx: number, dy: number): boolean {
    if (dy === 0) return false
    const ids = workspaces.peek().map((ws) => ws.id)
    const index = ids.indexOf(focused.peek()?.id ?? NaN)
    if (index < 0) return false
    const target = ids[index + Math.sign(dy)]
    if (target !== undefined) focusWorkspace(hypr, target)
    return true
  }

  const unsubscribers = [workspaces.subscribe(syncWorkspaces), focused.subscribe(syncFocus)]
  onCleanup(() => unsubscribers.forEach((unsubscribe) => unsubscribe()))

  return (
    <box
      class="workspaces"
      $={(self) => {
        container = self
        syncWorkspaces()
      }}
    >
      <Gtk.EventControllerScroll
        flags={Gtk.EventControllerScrollFlags.VERTICAL | Gtk.EventControllerScrollFlags.DISCRETE}
        onScroll={onScroll}
      />
    </box>
  )
}

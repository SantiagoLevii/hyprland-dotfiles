import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import Clock from "./Clock"
import Workspaces from "./Workspaces"
import Launcher from "./Launcher"

// Geometría de referencia pensada para 1920x1080; se escala contra el monitor real.
const REF_WIDTH = 1920
const REF_HEIGHT = 1080
const REF_SIDE_MARGIN = 19
const REF_TOP_MARGIN = 6
const LOOSE_GROUP_SPACING = 6

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
  const { width, height } = gdkmonitor.get_geometry()
  const sideMargin = Math.round((REF_SIDE_MARGIN * width) / REF_WIDTH)
  const topMargin = Math.round((REF_TOP_MARGIN * height) / REF_HEIGHT)

  return (
    <window
      visible
      name="bar"
      namespace="ags-bar"
      class="Bar"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      marginTop={topMargin}
      marginLeft={sideMargin}
      marginRight={sideMargin}
      application={app}
    >
      <centerbox cssName="centerbox">
        <box $type="start" class="group-loose" spacing={LOOSE_GROUP_SPACING}>
          <Launcher />
        </box>
        <box $type="center" class="group-shared">
          <Workspaces gdkmonitor={gdkmonitor} />
        </box>
        <box $type="end" class="group-shared">
          <Clock />
        </box>
      </centerbox>
    </window>
  )
}

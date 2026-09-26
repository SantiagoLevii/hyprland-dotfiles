import { Accessor } from "ags"
import { FALLBACK } from "../lib/sys"

// Ícono pegado al valor; entre stats va el doble (STAT_GROUP_GAP en Launcher).
export const STAT_ICON_GAP = 6
export const STAT_GROUP_GAP = STAT_ICON_GAP * 2

type Text = string | Accessor<string>

interface StatProps {
  icon: Text
  iconClass: Text
  value: Accessor<string>
  unit: Text
  prefix?: string
}

export default function Stat({ icon, iconClass, value, unit, prefix }: StatProps) {
  const hasValue = value.as((v) => v !== FALLBACK)

  return (
    <box class="stat" spacing={STAT_ICON_GAP}>
      <label class={iconClass} label={icon} />
      <box class="stat-value">
        {prefix && <label class="stat-prefix" label={prefix} visible={hasValue} />}
        <label class="stat-number" label={value} />
        <label class="stat-unit" label={unit} visible={hasValue} />
      </box>
    </box>
  )
}

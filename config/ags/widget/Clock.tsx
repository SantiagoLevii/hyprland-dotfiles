import GLib from "gi://GLib"
import { createPoll } from "ags/time"
import { FALLBACK, POLL_MS } from "../lib/sys"

const DATE_FORMAT = "%a %d %b"
const TIME_FORMAT = "%H:%M"

function now(format: string): string {
  return GLib.DateTime.new_now_local()?.format(format) ?? FALLBACK
}

export default function Clock() {
  const date = createPoll(FALLBACK, POLL_MS, () => now(DATE_FORMAT))
  const time = createPoll(FALLBACK, POLL_MS, () => now(TIME_FORMAT))

  return (
    <box class="clock" spacing={6}>
      <label class="icon icon-muted" label={"\u{f017}"} />
      <label class="clock-date" label={date} />
      <label class="separator" label={"\u{2022}"} />
      <label class="clock-time" label={time} />
    </box>
  )
}

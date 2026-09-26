import { createPoll } from "ags/time"
import Stat from "./Stat"
import { FALLBACK, POLL_MS, readText } from "../lib/sys"

const PERCENT = 100

function meminfoKb(text: string, key: string): number | null {
  const match = text.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"))
  return match ? Number(match[1]) : null
}

function readUsage(): string {
  const text = readText("/proc/meminfo")
  if (!text) return FALLBACK
  const total = meminfoKb(text, "MemTotal")
  const available = meminfoKb(text, "MemAvailable")
  if (!total || available === null) return FALLBACK
  return `${Math.round(((total - available) / total) * PERCENT)}`
}

export default function Ram() {
  const usage = createPoll(FALLBACK, POLL_MS, readUsage)

  return <Stat icon={"\u{efc5}"} iconClass="icon icon-ram" value={usage} unit="%" />
}

import { createPoll } from "ags/time"
import Stat from "./Stat"
import { FALLBACK, POLL_MS, readText } from "../lib/sys"

// user nice system idle iowait irq softirq steal (guest ya está contado en user).
const COUNTED_FIELDS = 8
const IDLE_INDEX = 3
const IOWAIT_INDEX = 4
const PERCENT = 100

interface CpuSample {
  total: number
  idle: number
}

function readSample(): CpuSample | null {
  const firstLine = readText("/proc/stat")?.split("\n", 1)[0]
  if (!firstLine?.startsWith("cpu ")) return null
  const fields = firstLine.trim().split(/\s+/).slice(1, COUNTED_FIELDS + 1).map(Number)
  if (fields.length < COUNTED_FIELDS || fields.some(Number.isNaN)) return null
  return {
    total: fields.reduce((a, b) => a + b, 0),
    idle: fields[IDLE_INDEX] + fields[IOWAIT_INDEX],
  }
}

export default function Cpu() {
  let prev: CpuSample | null = null

  const usage = createPoll(FALLBACK, POLL_MS, () => {
    const sample = readSample()
    const last = prev
    prev = sample
    if (!sample || !last) return FALLBACK
    const dTotal = sample.total - last.total
    if (dTotal <= 0) return FALLBACK
    const busy = 1 - (sample.idle - last.idle) / dTotal
    return `${Math.round(busy * PERCENT)}`
  })

  return <Stat icon={"\u{f4bc}"} iconClass="icon icon-cpu" value={usage} unit="%" />
}

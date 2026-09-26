import { createPoll } from "ags/time"
import Stat from "./Stat"
import { FALLBACK, POLL_MS, listDir, readText } from "../lib/sys"

const DRM_DIR = "/sys/class/drm"
const CARD_NAME = /^card\d+$/

// Con iGPU + dGPU (Phoenix + RX 580) se toma la de más VRAM: la discreta.
function detectGpuBusyPath(): string | null {
  let best: { path: string; vram: number } | null = null
  for (const card of listDir(DRM_DIR).filter((name) => CARD_NAME.test(name))) {
    const device = `${DRM_DIR}/${card}/device`
    if (readText(`${device}/gpu_busy_percent`) === null) continue
    const vram = Number(readText(`${device}/mem_info_vram_total`)?.trim() ?? NaN)
    if (Number.isNaN(vram)) continue
    if (!best || vram > best.vram) best = { path: `${device}/gpu_busy_percent`, vram }
  }
  return best?.path ?? null
}

export default function Gpu() {
  const busyPath = detectGpuBusyPath()
  const usage = createPoll(FALLBACK, POLL_MS, () => {
    const raw = busyPath ? readText(busyPath)?.trim() : undefined
    return raw && /^\d+$/.test(raw) ? raw : FALLBACK
  })

  return <Stat icon={"\u{f08ae}"} iconClass="icon icon-gpu" value={usage} unit="%" />
}

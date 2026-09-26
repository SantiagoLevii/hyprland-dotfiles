import GLib from "gi://GLib"
import { createPoll } from "ags/time"
import Stat from "./Stat"
import { FALLBACK, POLL_MS, listDir, readText } from "../lib/sys"

const NET_DIR = "/sys/class/net"
const EXCLUDED = /^(lo|docker.*|veth.*|br-.*|virbr.*|tailscale0)$/
// Override para pruebas: AGS_BAR_IFACE=noexiste ags run
const IFACE_OVERRIDE = GLib.getenv("AGS_BAR_IFACE")
const UNIT_BASE = 1024
const UNITS = ["B/s", "KB/s", "MB/s"]
// Se cambia de unidad al llegar a 1000 (base sigue siendo 1024) para no pasar de 3 dígitos enteros.
const DISPLAY_LIMIT = 1000
const ONE_DIGIT = 10
const TWO_DIGITS = 100
const MICROS_PER_SECOND = 1_000_000
const DEFAULT_ROUTE_V4 = "00000000"
const DEFAULT_ROUTE_V6 = "00000000000000000000000000000000"
const ICON_CONNECTED = "\u{f0200}"
const ICON_DISCONNECTED = "\u{f0202}"
const DOWNLOAD_ARROW = "\u{2193}"

interface Rate {
  value: string
  unit: string
}

interface NetState extends Rate {
  connected: boolean
}

interface Sample {
  rx: number
  micros: number
}

const DISCONNECTED: NetState = { value: FALLBACK, unit: "", connected: false }

// Cableada = dispositivo físico (tiene device/) y sin directorio wireless/.
function detectWiredIface(): string | null {
  const candidates = listDir(NET_DIR).filter(
    (name) =>
      !EXCLUDED.test(name) &&
      GLib.file_test(`${NET_DIR}/${name}/device`, GLib.FileTest.EXISTS) &&
      !GLib.file_test(`${NET_DIR}/${name}/wireless`, GLib.FileTest.EXISTS),
  )
  if (candidates.length !== 1) {
    console.warn(`net: se esperaba 1 interfaz cableada, hay ${candidates.length}: ${candidates}`)
    return null
  }
  return candidates[0]
}

// carrier da EINVAL con la interfaz administrativamente caída: readText -> null -> sin link.
function hasLink(iface: string): boolean {
  return readText(`${NET_DIR}/${iface}/carrier`)?.trim() === "1"
}

function hasDefaultRoute(iface: string): boolean {
  const v4 = readText("/proc/net/route")
    ?.split("\n")
    .slice(1)
    .some((line) => {
      const [name, destination] = line.trim().split(/\s+/)
      return name === iface && destination === DEFAULT_ROUTE_V4
    })
  if (v4) return true
  return (
    readText("/proc/net/ipv6_route")
      ?.split("\n")
      .some((line) => {
        const fields = line.trim().split(/\s+/)
        return fields[0] === DEFAULT_ROUTE_V6 && fields[fields.length - 1] === iface
      }) ?? false
  )
}

function readRxBytes(iface: string): number {
  const raw = readText(`${NET_DIR}/${iface}/statistics/rx_bytes`)
  return raw === null ? NaN : Number(raw.trim())
}

function formatRate(bytesPerSecond: number): Rate {
  let value = bytesPerSecond
  let unit = 0
  while (value >= DISPLAY_LIMIT && unit < UNITS.length - 1) {
    value /= UNIT_BASE
    unit++
  }
  if (unit === 0) return { value: `${Math.round(value)}`, unit: UNITS[unit] }
  const digits = value < ONE_DIGIT ? 2 : value < TWO_DIGITS ? 1 : 0
  return { value: value.toFixed(digits), unit: UNITS[unit] }
}

export default function Net() {
  const iface = IFACE_OVERRIDE ?? detectWiredIface()
  let prev: Sample | null = null

  const state = createPoll<NetState>(DISCONNECTED, POLL_MS, () => {
    if (!iface || !hasLink(iface) || !hasDefaultRoute(iface)) {
      prev = null
      return DISCONNECTED
    }
    const sample = { rx: readRxBytes(iface), micros: GLib.get_monotonic_time() }
    if (Number.isNaN(sample.rx)) {
      prev = null
      return DISCONNECTED
    }
    const last = prev
    prev = sample
    if (!last || sample.micros <= last.micros || sample.rx < last.rx) {
      return { value: FALLBACK, unit: "", connected: true }
    }
    const seconds = (sample.micros - last.micros) / MICROS_PER_SECOND
    return { ...formatRate((sample.rx - last.rx) / seconds), connected: true }
  })

  return (
    <Stat
      icon={state.as((s) => (s.connected ? ICON_CONNECTED : ICON_DISCONNECTED))}
      iconClass={state.as((s) => (s.connected ? "icon icon-net-on" : "icon icon-net-off"))}
      prefix={DOWNLOAD_ARROW}
      value={state.as((s) => s.value)}
      unit={state.as((s) => s.unit)}
    />
  )
}

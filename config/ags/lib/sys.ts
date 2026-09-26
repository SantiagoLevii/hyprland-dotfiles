import GLib from "gi://GLib"

export const FALLBACK = "--"
export const POLL_MS = 1000

const decoder = new TextDecoder()

// Nunca lanza: una excepción no capturada dentro de un poll tira abajo la barra entera.
export function readText(path: string): string | null {
  try {
    const [ok, bytes] = GLib.file_get_contents(path)
    return ok ? decoder.decode(bytes) : null
  } catch (e) {
    if (!(e instanceof GLib.Error)) console.error(`readText(${path}):`, e)
    return null
  }
}

export function listDir(path: string): string[] {
  try {
    const dir = GLib.Dir.open(path, 0)
    const names: string[] = []
    for (let name = dir.read_name(); name !== null; name = dir.read_name()) names.push(name)
    dir.close()
    return names
  } catch (e) {
    if (!(e instanceof GLib.Error)) console.error(`listDir(${path}):`, e)
    return []
  }
}

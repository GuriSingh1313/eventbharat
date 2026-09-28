// Packs a business profile into a shareable link (#d=...), so a demo can be sent on WhatsApp
// without any database. Deflate-compressed when the browser supports it (prefix "z"), plain otherwise ("j").

const toB64Url = (bytes) => {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromB64Url = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())

export async function encodeProfile(profile) {
  const bytes = new TextEncoder().encode(JSON.stringify(profile))
  if (typeof CompressionStream === 'function') return `z${toB64Url(await pipe(bytes, new CompressionStream('deflate-raw')))}`
  return `j${toB64Url(bytes)}`
}

// Returns the decoded object, or null for a broken link.
export async function decodeProfile(code) {
  try {
    const bytes = fromB64Url(code.slice(1))
    if (code[0] === 'z') return JSON.parse(new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw'))))
    if (code[0] === 'j') return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    // fall through
  }
  return null
}

export async function demoLink(profile) {
  return `${location.origin}/dukaan/#d=${await encodeProfile(profile)}`
}

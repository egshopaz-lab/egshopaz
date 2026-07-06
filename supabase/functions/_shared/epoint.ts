const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function encodePayload(payload: Record<string, unknown>) {
  return bytesToBase64(encoder.encode(JSON.stringify(payload)));
}

export function decodePayload(data: string) {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function signEpointData(data: string, privateKey: string) {
  const source = encoder.encode(`${privateKey}${data}${privateKey}`);
  const digest = await crypto.subtle.digest("SHA-1", source);
  return bytesToBase64(new Uint8Array(digest));
}

export function signaturesMatch(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

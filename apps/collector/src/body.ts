/**
 * Reads the body as text, giving up as soon as it grows past `maxBytes`.
 * Content-Length is only a hint (it can be missing or lie), so the stream itself is counted:
 * an oversized body is never buffered in full.
 */
export async function readTextWithLimit(request: Request, maxBytes: number): Promise<string | null> {
  if (Number(request.headers.get('Content-Length')) > maxBytes) return null;
  if (!request.body) return '';

  // The runtime types leave the chunk type open (`any`); a request body is always a byte stream.
  const reader = (request.body as ReadableStream<Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

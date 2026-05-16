/**
 * Consume an SSE response body (`data: {"text":"..."}\n\n` events).
 * Calls `onText` for each text delta; resolves with the full concatenated text.
 */
export async function consumeSSETextStream(body, { onText, signal } = {}) {
  if (!body) throw new Error("No response body");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let leftover = "";
  let full = "";

  const handleEvent = (evt) => {
    const line = evt.trim();
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") return;
    try {
      const obj = JSON.parse(payload);
      if (typeof obj.text === "string") {
        full += obj.text;
        onText?.(obj.text, full);
      } else if (obj.error) {
        throw new Error(obj.error);
      }
    } catch (e) {
      if (e instanceof SyntaxError) return;
      throw e;
    }
  };

  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = leftover + decoder.decode(value, { stream: true });
      const parts = chunk.split("\n\n");
      leftover = parts.pop() || "";
      for (const evt of parts) handleEvent(evt);
    }
    if (leftover.trim()) handleEvent(leftover);
  } finally {
    reader.releaseLock?.();
  }

  return full;
}

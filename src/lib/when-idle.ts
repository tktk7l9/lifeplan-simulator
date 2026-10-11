/**
 * Runs `task` once the browser is idle (requestIdleCallback, falling back to a short timeout
 * where it is missing, e.g. Safari), and returns a cancel function for effect cleanup.
 * Used to fetch code that the first paint does not need.
 */
export function whenIdle(task: () => void, timeoutMs = 2000): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 200);
  return () => window.clearTimeout(id);
}

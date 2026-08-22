import { useCallback } from "react";

/**
 * Returns a mousedown handler that tracks horizontal drag movement and
 * reports incremental pixel deltas via onDelta. Used to drive draggable
 * split/resize handles between panels.
 */
export function useDragResize(onDelta: (deltaX: number) => void) {
  return useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      let lastX = e.clientX;
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - lastX;
        lastX = ev.clientX;
        onDelta(delta);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onDelta]
  );
}

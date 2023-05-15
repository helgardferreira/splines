import { Observable, map } from "rxjs";

export const mapNormalizedPointer =
  (box: DOMRect) =>
  (
    source$: Observable<PointerEvent>
  ): Observable<{
    x: number;
    y: number;
  }> =>
    source$.pipe(
      map((e) => {
        // Normalize the mouse position coordinates between -1 and 1
        const normalizedX =
          (2 * (e.clientX - box.left)) / (box.right - box.left) - 1;
        const normalizedY =
          2 * (1 - (e.clientY - box.top) / (box.bottom - box.top)) - 1;

        return {
          x: normalizedX,
          y: normalizedY,
        };
      })
    );

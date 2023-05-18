import { type Observable, type OperatorFunction, map } from "rxjs";

export const mapNormalizedPointer: OperatorFunction<
  [PointerEvent, DOMRect],
  { x: number; y: number }
> = (
  source$: Observable<[PointerEvent, DOMRect]>
): Observable<{
  x: number;
  y: number;
}> =>
  source$.pipe(
    map(([pointerEvent, box]) => {
      // Normalize the mouse position coordinates between -1 and 1
      const normalizedX =
        (2 * (pointerEvent.clientX - box.left)) / (box.right - box.left) - 1;
      const normalizedY =
        2 * (1 - (pointerEvent.clientY - box.top) / (box.bottom - box.top)) - 1;

      return {
        x: normalizedX,
        y: normalizedY,
      };
    })
  );

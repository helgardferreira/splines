import { type MonoTypeOperatorFunction, type Observable, filter } from "rxjs";

export const filterBoxConstraint: MonoTypeOperatorFunction<
  [PointerEvent, DOMRect]
> = (source$: Observable<[PointerEvent, DOMRect]>) =>
  source$.pipe(
    filter(
      ([pointEvent, box]) =>
        pointEvent.clientX >= box.left &&
        pointEvent.clientX <= box.right &&
        pointEvent.clientY >= box.top &&
        pointEvent.clientY <= box.bottom
    )
  );

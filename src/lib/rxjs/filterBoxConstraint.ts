import { Observable, filter } from "rxjs";

export const filterBoxConstraint =
  (box: DOMRect) => (source$: Observable<PointerEvent>) =>
    source$.pipe(
      filter((e) => {
        return (
          e.clientX >= box.left &&
          e.clientX <= box.right &&
          e.clientY >= box.top &&
          e.clientY <= box.bottom
        );
      })
    );

import {
  type Observable,
  type OperatorFunction,
  map,
  combineLatestWith,
  fromEvent,
  startWith,
} from "rxjs";
import { Raycaster, type Vector2 } from "three";

import { filterBoxConstraint, mapNormalizedPointer } from ".";

import { type PointIntersection, type Experience } from "../../types";
import { Point } from "../../core/Point";

export const mapPointRaycast =
  (
    experience: Experience
  ): OperatorFunction<PointerEvent, PointIntersection[]> =>
  (source$: Observable<PointerEvent>) => {
    const {
      renderer: { domElement },
      camera,
      scene,
    } = experience;
    const raycaster = new Raycaster();

    return source$.pipe(
      combineLatestWith(
        fromEvent<UIEvent>(window, "resize").pipe(
          startWith(domElement.getBoundingClientRect()),
          map(() => domElement.getBoundingClientRect())
        )
      ),
      filterBoxConstraint,
      mapNormalizedPointer,
      map((pointer) => {
        raycaster.setFromCamera(pointer as Vector2, camera);
        const intersects: PointIntersection[] = raycaster
          .intersectObjects(scene.children)
          .filter(
            (intersection) => intersection.object instanceof Point
          ) as PointIntersection[];

        return intersects;
      })
    );
  };

import { type Observable, type OperatorFunction, map } from "rxjs";
import { Raycaster, type Vector2 } from "three";

import { filterBoxConstraint, mapNormalizedPointer } from ".";

import { type BasicIntersection, type Experience } from "../../types";

export const mapRaycastIntersects =
  (
    experience: Experience
  ): OperatorFunction<PointerEvent, BasicIntersection[]> =>
  (source$: Observable<PointerEvent>) => {
    const {
      renderer: { domElement },
      camera,
      scene,
    } = experience;
    const raycaster = new Raycaster();
    const box = domElement.getBoundingClientRect();

    return source$.pipe(
      filterBoxConstraint(box),
      mapNormalizedPointer(box),
      map((pointer) => {
        raycaster.setFromCamera(pointer as Vector2, camera);
        const intersects: BasicIntersection[] = raycaster
          .intersectObjects(scene.children)
          .filter((intersection) =>
            /circle/.test(intersection.object.name)
          ) as BasicIntersection[];

        return intersects;
      })
    );
  };

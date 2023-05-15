import { Observable, map } from "rxjs";
import { Raycaster, Vector2 } from "three";

import { filterBoxConstraint, mapNormalizedPointer } from ".";

import { BasicIntersection, Experience } from "../../types";

export const mapRaycastIntersects =
  (experience: Experience) => (source$: Observable<PointerEvent>) => {
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

import { Object3D, BufferGeometry, LineBasicMaterial } from "three";

class LineMesh extends Object3D {
  isLine: boolean;
  type: string;
  geometry: BufferGeometry;
  material: LineBasicMaterial;

  constructor(
    geometry = new BufferGeometry(),
    material = new LineBasicMaterial()
  ) {
    super();

    this.isLine = true;

    this.type = "Line";

    this.geometry = geometry;
    this.material = material;
  }

  copy(source: this, recursive: boolean) {
    super.copy(source, recursive);

    this.material = source.material;
    this.geometry = source.geometry;

    return this;
  }
}

export { LineMesh };

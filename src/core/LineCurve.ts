import { Curve, Vector2 } from "three";

type LineCurveJSON = {
  metadata: {
    version: number;

    type: string;

    generator: string;
  };
  arcLengthDivisions?: number;
  type?: string;
  v1?: number[];
  v2?: number[];
};

class LineCurve extends Curve<Vector2> {
  isLineCurve = true;
  type = "LineCurve";

  v1: Vector2;
  v2: Vector2;

  constructor(v1 = new Vector2(), v2 = new Vector2()) {
    super();

    this.v1 = v1;
    this.v2 = v2;
  }

  getPoint(t: number, target = new Vector2()) {
    const point = target;

    if (t === 1) {
      point.copy(this.v2);
    } else {
      point.copy(this.v2).sub(this.v1);
      point.multiplyScalar(t).add(this.v1);
    }

    return point;
  }

  // Line curve is linear, so we can overwrite default getPointAt
  getPointAt(u: number, target: Vector2) {
    return this.getPoint(u, target);
  }

  copy(source: LineCurve) {
    super.copy(source);

    this.v1.copy(source.v1);
    this.v2.copy(source.v2);

    return this;
  }

  toJSON(): LineCurveJSON {
    const data = super.toJSON() as LineCurveJSON;

    data.v1 = this.v1.toArray();
    data.v2 = this.v2.toArray();

    return data;
  }

  fromJSON(json: LineCurveJSON) {
    super.fromJSON(json);
    if (!json.v1 || !json.v2) throw new Error("v1 and v2 vectors are required");

    this.v1.fromArray(json.v1);
    this.v2.fromArray(json.v2);

    return this;
  }
}

export { LineCurve };

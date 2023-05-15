import { Vector2 } from "three";
import { Curve } from "./Curve";
import { lerp } from "../math";

type LineCurveJSON = {
  metadata: {
    version: number;

    type: string;

    generator: string;
  };
  arcLengthDivisions?: number;
  type?: string;
  p0?: number[];
  p1?: number[];
  t?: number;
};

const isLineCurve = (source: Curve | LineCurve): source is LineCurve => {
  return (source as LineCurve).isLineCurve;
};

class LineCurve extends Curve {
  isLineCurve = true;
  type = "LineCurve";

  p0: Vector2;
  p1: Vector2;
  private pLerp: Vector2;
  readonly numPoints: number;
  private t: number;

  constructor(p0 = new Vector2(), p1 = new Vector2(), t = 1, numPoints = 100) {
    super();

    this.p0 = p0;
    this.p1 = p1;
    this.t = t;
    this.pLerp = lerp(p0, p1, t);
    this.numPoints = numPoints;
  }

  setT = (t: number) => {
    this.t = t;
    this.pLerp = lerp(this.p0, this.p1, t);
  };

  getT = () => this.t;

  getPoint(t: number, target = new Vector2()) {
    return lerp(this.p0, this.pLerp, t, target);
  }

  // Line curve is linear, so we can overwrite default getPointAt
  getPointAt(u: number, target: Vector2) {
    return this.getPoint(u, target);
  }

  getPoints(): Vector2[] {
    this.pLerp = lerp(this.p0, this.p1, this.t);
    return super.getPoints(this.numPoints);
  }

  copy(source: Curve) {
    super.copy(source);

    if (isLineCurve(source)) {
      this.p0.copy(source.p0);
      this.p1.copy(source.p1);
      this.pLerp.copy(source.pLerp);
      this.t = source.t;
    }

    return this;
  }

  toJSON(): LineCurveJSON {
    const data = super.toJSON() as LineCurveJSON;

    data.p0 = this.p0.toArray();
    data.p1 = this.p1.toArray();
    data.t = this.t;

    return data;
  }

  fromJSON(json: LineCurveJSON) {
    super.fromJSON(json);
    if (!json.p0 || !json.p1 || !json.t)
      throw new Error("p0, p1, and t are required");

    this.p0.fromArray(json.p0);
    this.p1.fromArray(json.p1);
    this.pLerp = lerp(this.p0, this.p1, json.t);

    return this;
  }
}

export { LineCurve };

import { Vector2 } from "three";

type CurveJSON = {
  metadata: {
    version: number;

    type: string;

    generator: string;
  };
  arcLengthDivisions?: number;
  type?: string;
};

abstract class Curve {
  type: string;
  arcLengthDivisions: number;
  cacheArcLengths?: number[];
  needsUpdate: any;

  constructor() {
    this.type = "Curve";

    this.arcLengthDivisions = 200;
  }

  // Virtual base class method to overwrite and implement in subclasses
  //	- t [0 .. 1]
  abstract getPoint(t: number, target?: Vector2): Vector2;

  // Get point at relative position in curve according to arc length
  // - u [0 .. 1]
  getPointAt(u: number, target?: Vector2) {
    const t = this.getUtoTmapping(u);
    return this.getPoint(t, target);
  }

  // Get sequence of points using getPoint( t )
  getPoints(divisions = 5) {
    const points = [];

    for (let d = 0; d <= divisions; d++) {
      points.push(this.getPoint(d / divisions));
    }

    return points;
  }

  // Get sequence of points using getPointAt( u )
  getSpacedPoints(divisions = 5) {
    const points = [];

    for (let d = 0; d <= divisions; d++) {
      points.push(this.getPointAt(d / divisions));
    }

    return points;
  }

  // Get total curve arc length
  getLength() {
    const lengths = this.getLengths();
    return lengths[lengths.length - 1];
  }

  // Get list of cumulative segment lengths
  getLengths(divisions = this.arcLengthDivisions) {
    if (
      this.cacheArcLengths &&
      this.cacheArcLengths.length === divisions + 1 &&
      !this.needsUpdate
    ) {
      return this.cacheArcLengths;
    }

    this.needsUpdate = false;

    const cache = [];
    let current,
      last = this.getPoint(0);
    let sum = 0;

    cache.push(0);

    for (let p = 1; p <= divisions; p++) {
      current = this.getPoint(p / divisions);
      sum += current.distanceTo(last);
      cache.push(sum);
      last = current;
    }

    this.cacheArcLengths = cache;

    return cache; // { sums: cache, sum: sum }; Sum is in the last element.
  }

  updateArcLengths() {
    this.needsUpdate = true;
    this.getLengths();
  }

  // Given u ( 0 .. 1 ), get a t to find p. This gives you points which are equidistant
  getUtoTmapping(u: number, distance?: number) {
    const arcLengths = this.getLengths();

    let i = 0;
    const aLIdx = arcLengths.length;

    let targetArcLength; // The targeted u distance value to get

    if (distance) {
      targetArcLength = distance;
    } else {
      targetArcLength = u * arcLengths[aLIdx - 1];
    }

    // binary search for the index with largest value smaller than target u distance

    let low = 0,
      high = aLIdx - 1,
      comparison;

    while (low <= high) {
      i = Math.floor(low + (high - low) / 2); // less likely to overflow, though probably not issue here, JS doesn't really have integers, all numbers are floats

      comparison = arcLengths[i] - targetArcLength;

      if (comparison < 0) {
        low = i + 1;
      } else if (comparison > 0) {
        high = i - 1;
      } else {
        high = i;
        break;

        // DONE
      }
    }

    i = high;

    if (arcLengths[i] === targetArcLength) {
      return i / (aLIdx - 1);
    }

    // we could get finer grain at lengths, or use simple interpolation between two points

    const lengthBefore = arcLengths[i];
    const lengthAfter = arcLengths[i + 1];

    const segmentLength = lengthAfter - lengthBefore;

    // determine where we are between the 'before' and 'after' points

    const segmentFraction = (targetArcLength - lengthBefore) / segmentLength;

    // add that fractional amount to t

    const t = (i + segmentFraction) / (aLIdx - 1);

    return t;
  }

  clone() {
    return (new (this.constructor as new () => Curve)() as Curve).copy(this);
  }

  copy(source: Curve) {
    this.arcLengthDivisions = source.arcLengthDivisions;

    return this;
  }

  toJSON(): CurveJSON {
    const data: CurveJSON = {
      metadata: {
        version: 4.5,
        type: "Curve",
        generator: "Curve.toJSON",
      },
    };

    data.arcLengthDivisions = this.arcLengthDivisions;
    data.type = this.type;

    return data;
  }

  fromJSON(json: { arcLengthDivisions: number }) {
    this.arcLengthDivisions = json.arcLengthDivisions;

    return this;
  }
}

export { Curve };

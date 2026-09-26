import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SeededRandom } from './SeededRandom';
import { RoadValidator } from './RoadValidator';

export type RoadSectionStyle = 'straight' | 'sweeper' | 's_curves' | 'crest_descent' | 'mountain_climb';

export interface PlannedRoadSection {
  style: RoadSectionStyle;
  controlPoints: Vector3[];
  targetHeadingRad: number;
}

export class RoadSectionPlanner {
  private rng: SeededRandom;

  constructor(seed: number = 42) {
    this.rng = new SeededRandom(seed);
  }

  /**
   * Plans the next continuous sequence of road control points starting from an existing tip.
   */
  public planNextSection(
    startPos: Vector3,
    currentHeadingRad: number,
    targetLength: number = 800.0,
    preferredStyle?: RoadSectionStyle
  ): PlannedRoadSection {
    const style = preferredStyle || this.chooseNextStyle();
    const points: Vector3[] = [startPos.clone()];
    let currPos = startPos.clone();
    let currHeading = currentHeadingRad;

    const segmentCount = Math.max(5, Math.ceil(targetLength / 90.0));
    const stepLength = targetLength / segmentCount;

    for (let i = 0; i < segmentCount; i++) {
      let turnDelta = 0;
      let heightDelta = 0;

      switch (style) {
        case 'straight':
          turnDelta = this.rng.gaussian(0, 0.04);
          heightDelta = this.rng.gaussian(0, 1.5);
          break;

        case 'sweeper': {
          // Sustained sweeping curve (left or right)
          const turnSign = Math.sin(currPos.x * 0.005 + currPos.z * 0.005) > 0 ? 1 : -1;
          turnDelta = turnSign * this.rng.range(0.12, 0.22);
          heightDelta = this.rng.range(-1.2, 2.5);
          break;
        }

        case 's_curves': {
          // Alternating left/right chicane
          const phase = (i / segmentCount) * Math.PI * 2.5;
          turnDelta = Math.sin(phase) * 0.25;
          heightDelta = Math.cos(phase) * 1.8;
          break;
        }

        case 'mountain_climb':
          turnDelta = this.rng.gaussian(0, 0.14);
          heightDelta = this.rng.range(3.5, 7.5); // Climb upwards
          break;

        case 'crest_descent':
          turnDelta = this.rng.gaussian(0, 0.12);
          heightDelta = this.rng.range(-6.5, -2.5); // Descend
          break;
      }

      currHeading += turnDelta;

      // Calculate candidate point
      const nextX = currPos.x + Math.sin(currHeading) * stepLength;
      const nextZ = currPos.z - Math.cos(currHeading) * stepLength;
      let nextY = currPos.y + heightDelta;

      // Prevent diving below sea level (sea level is -3.2m)
      if (nextY < 1.0) nextY = 1.0 + Math.abs(nextY);
      // Cap maximum mountain height
      if (nextY > 280.0) nextY = 280.0;

      const candidate = new Vector3(nextX, nextY, nextZ);

      // Validate point
      if (RoadValidator.validatePoint(points, candidate)) {
        points.push(candidate);
        currPos = candidate;
      } else {
        // Fallback: continue straight along previous direction
        const safeY = currPos.y + Math.max(-2.0, Math.min(2.0, heightDelta));
        const safePt = new Vector3(
          currPos.x + Math.sin(currentHeadingRad) * stepLength,
          safeY,
          currPos.z - Math.cos(currentHeadingRad) * stepLength
        );
        points.push(safePt);
        currPos = safePt;
      }
    }

    return {
      style,
      controlPoints: points,
      targetHeadingRad: currHeading,
    };
  }

  private chooseNextStyle(): RoadSectionStyle {
    const roll = this.rng.next();
    if (roll < 0.25) return 'straight';
    if (roll < 0.55) return 'sweeper';
    if (roll < 0.78) return 's_curves';
    if (roll < 0.90) return 'mountain_climb';
    return 'crest_descent';
  }
}

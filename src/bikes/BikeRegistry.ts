import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { BikeDefinition } from './BikeDefinition';
import { DEFAULT_PHYSICS_CONFIG } from '../config/physics';

export const S1000RR_2019: BikeDefinition = {
  id: 's1000rr-2019',
  displayName: 'BMW S1000RR (2019)',
  manufacturer: 'BMW Motorrad',
  modelYear: 2019,
  description: '999cc inline-four liter-class superbike with BMW ShiftCam variable valve timing. 207 hp, 113 Nm torque, 197 kg curb weight.',
  modelPath: 'assets/bikes/s1000rr-2019/model.glb',
  modelScale: new Vector3(1, 1, 1),
  modelRotationOffset: new Vector3(0, Math.PI, 0), // Rotate 180° so forward is along -Z
  modelPositionOffset: new Vector3(0, 0, 0),
  physics: {
    ...DEFAULT_PHYSICS_CONFIG,
    massKg: 197,
    wheelbaseMeters: 1.441,
    wheelRadiusMeters: 0.31,
    maxLeanAngleDeg: 54.0,
  },
  engine: {
    idleRpm: 1250,
    maxRpm: 14600,
    redlineRpm: 14200,
    peakTorqueNm: 113,
    peakTorqueRpm: 11000,
    peakPowerHp: 207,
    peakPowerRpm: 13500,
    flywheelInertia: 0.08,
    engineBrakingTorque: 28,
  },
  transmission: {
    gearRatios: [0, 2.647, 2.091, 1.727, 1.500, 1.360, 1.261],
    primaryReduction: 1.652,
    finalDriveRatio: 2.647,
    upshiftRpm: 13200,
    downshiftRpm: 5500,
    shiftDelaySeconds: 0.08, // Quickshifter shift cut
  },
  nodeMapping: {
    rootNodeName: 'bmws19',
    frontWheelNodeName: 'wheel_lf.child',
    frontWheelSubNodeNames: ['wheel_lf.child.001', 'bikedisc_f'],
    rearWheelNodeName: 'wheel_lr.child',
    rearWheelSubNodeNames: ['wheel_lr.child.001', 'bikedisc_r'],
    frontForkNodeName: 'forks_u',
    frontForkSubNodeNames: ['forks_l'],
    handlebarsNodeName: 'handlebars',
    cockpitNodeName: 'cockpit',
    dialsNodeName: 'dials',
    chassisNodeName: 'chassis',
    swingarmNodeName: 'swingarm',
    frontDiscNodeName: 'bikedisc_f',
    rearDiscNodeName: 'bikedisc_r',
    exhaustNodeName: 'bmws19_exh_1',
  },
  cameraAnchors: {
    chaseOffset: new Vector3(0, 1.15, 2.7),
    chaseLookAtOffset: new Vector3(0, 0.72, -0.8),
    riderEyeOffset: new Vector3(0, 0.88, -0.05),
    riderLookAtOffset: new Vector3(0, 0.80, -4.5),
  },
  garageCamera: {
    radius: 2.8,
    alpha: -Math.PI * 0.35,
    beta: 1.28,
    targetOffset: new Vector3(0, 0.52, 0),
  },
};

export const M1000RR_RACE: BikeDefinition = {
  id: 'bike-02',
  displayName: 'BMW M1000RR Race',
  manufacturer: 'BMW M Motorsport',
  modelYear: 2021,
  description: 'Homologation special superbike with carbon winglets, race exhaust, and lightened forged internals. 212 hp, 113 Nm, 192 kg.',
  modelPath: 'assets/bikes/bike-02/model.glb',
  modelScale: new Vector3(1, 1, 1),
  modelRotationOffset: new Vector3(0, Math.PI, 0),
  modelPositionOffset: new Vector3(0, 0, 0),
  physics: {
    ...DEFAULT_PHYSICS_CONFIG,
    massKg: 192,
    wheelbaseMeters: 1.457,
    wheelRadiusMeters: 0.31,
    maxLeanAngleDeg: 56.0,
    steeringSensitivity: 1.9,
  },
  engine: {
    idleRpm: 1300,
    maxRpm: 15100,
    redlineRpm: 14700,
    peakTorqueNm: 113,
    peakTorqueRpm: 11000,
    peakPowerHp: 212,
    peakPowerRpm: 14500,
    flywheelInertia: 0.07,
    engineBrakingTorque: 26,
  },
  transmission: {
    gearRatios: [0, 2.647, 2.091, 1.727, 1.500, 1.360, 1.261],
    primaryReduction: 1.652,
    finalDriveRatio: 2.647,
    upshiftRpm: 13800,
    downshiftRpm: 5800,
    shiftDelaySeconds: 0.06,
  },
  nodeMapping: {
    rootNodeName: 'offlrds1000r',
    frontWheelNodeName: 'wheel_lf.child',
    rearWheelNodeName: 'wheel_lr.child',
    frontForkNodeName: 'forks_u',
    handlebarsNodeName: 'handlebars',
    cockpitNodeName: 'cockpit',
    dialsNodeName: 'dials',
    chassisNodeName: 'chassis',
    swingarmNodeName: 'swingarm',
    frontDiscNodeName: 'bikedisc_f',
    rearDiscNodeName: 'bikedisc_r',
    exhaustNodeName: 'exhaust_1',
  },
  cameraAnchors: {
    chaseOffset: new Vector3(0, 1.15, 2.7),
    chaseLookAtOffset: new Vector3(0, 0.72, -0.8),
    riderEyeOffset: new Vector3(0, 0.88, -0.05),
    riderLookAtOffset: new Vector3(0, 0.80, -4.5),
  },
  garageCamera: {
    radius: 2.8,
    alpha: -Math.PI * 0.35,
    beta: 1.28,
    targetOffset: new Vector3(0, 0.52, 0),
  },
};

export class BikeRegistry {
  private static bikes: Map<string, BikeDefinition> = new Map([
    [S1000RR_2019.id, S1000RR_2019],
    [M1000RR_RACE.id, M1000RR_RACE],
  ]);

  public static getDefaultBike(): BikeDefinition {
    return S1000RR_2019;
  }

  public static getBike(id: string): BikeDefinition | undefined {
    return this.bikes.get(id);
  }

  public static getAllBikes(): BikeDefinition[] {
    return Array.from(this.bikes.values());
  }

  public static registerBike(bike: BikeDefinition): void {
    this.bikes.set(bike.id, bike);
  }
}

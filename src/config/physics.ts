export interface BikePhysicsConfig {
  massKg: number;              // Total motorcycle mass (kg)
  wheelbaseMeters: number;     // Distance between front and rear axle (m)
  wheelRadiusMeters: number;   // Wheel radius (m) (approx 0.31m for 17 inch + tire)
  groundContactOffsetY: number;// Vertical offset from bike root to bottom of tyres (m)
  frontalAreaM2: number;       // Frontal aerodynamic area (m^2)
  dragCoefficient: number;     // Aerodynamic drag coefficient (Cd)
  rollingResistance: number;   // Coefficient of rolling resistance (Crr)
  maxBrakingDecel: number;     // Max braking deceleration (m/s^2, ~1.1G = ~10.8 m/s^2)
  maxLeanAngleDeg: number;     // Max lean angle (degrees, ~52° on road/track)
  leanSpeed: number;           // Lean response agility factor (rad/s)
  steeringSensitivity: number; // Base steering agility
  counterSteerFactor: number;  // Dynamic lean rate multiplier
  stabilityReturnRate: number; // Rate at which bike self-rights when steering input drops
  suspensionStiffness: number; // Pitch reaction to acceleration and braking
}

export const DEFAULT_PHYSICS_CONFIG: BikePhysicsConfig = {
  massKg: 197,               // BMW S1000RR curb weight (approx 197 kg)
  wheelbaseMeters: 1.441,    // 1441 mm wheelbase
  wheelRadiusMeters: 0.31,   // 310 mm radius (120/70-ZR17, 190/55-ZR17)
  groundContactOffsetY: 0.556, // Distance from root node to bottom of front tyre (0.5558m)
  frontalAreaM2: 0.60,       // Superbike aerodynamic frontal area
  dragCoefficient: 0.55,     // Cd with rider in moderate tuck
  rollingResistance: 0.015,  // High performance radial tire rolling resistance
  maxBrakingDecel: 10.5,     // ~1.07 G dual radial 4-piston calipers
  maxLeanAngleDeg: 54.0,     // Max lean angle
  leanSpeed: 4.5,            // Fast natural lean responsiveness
  steeringSensitivity: 1.8,  // Speed-sensitive steering response
  counterSteerFactor: 1.4,   // Countersteer flick rate
  stabilityReturnRate: 6.0,  // Auto-centering gyroscopic stability
  suspensionStiffness: 0.04, // Subtle chassis pitch squat/dive
};

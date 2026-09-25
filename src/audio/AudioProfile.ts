export interface RpmBandConfig {
  sampleUrl: string;
  nominalRpm: number;
  minRpm: number;
  maxRpm: number;
  volume: number;
}

export interface CameraAudioMix {
  intakeVolume: number;
  exhaustVolume: number;
  mechanicalVolume: number;
  windVolume: number;
  lowpassCutoffHz: number;
}

export interface BikeAudioProfile {
  id: string;
  hasRecordedSamples: boolean;
  idleSampleUrl?: string;
  rpmBands?: RpmBandConfig[];
  revLimiterSampleUrl?: string;
  shiftCutSampleUrl?: string;
  engineStartSampleUrl?: string;
  engineStopSampleUrl?: string;
  
  // Camera specific balance
  chaseMix: CameraAudioMix;
  cockpitMix: CameraAudioMix;
  
  // Throttle & Pitch response factors
  intakeRoarIntensity: number;
  engineBrakeBurbleIntensity: number;
  pitchModulationRange: number; // Max semitone pitch shift (+/- semitones)
}

export const DEFAULT_SUPERBIKE_AUDIO_PROFILE: BikeAudioProfile = {
  id: 'inline-4-litre',
  hasRecordedSamples: false, // Fallback to FallbackEngineAudio until WAVs supplied
  chaseMix: {
    intakeVolume: 0.35,
    exhaustVolume: 0.95,
    mechanicalVolume: 0.40,
    windVolume: 0.70,
    lowpassCutoffHz: 12000,
  },
  cockpitMix: {
    intakeVolume: 0.95,
    exhaustVolume: 0.45,
    mechanicalVolume: 0.85,
    windVolume: 0.95,
    lowpassCutoffHz: 8000,
  },
  intakeRoarIntensity: 0.75,
  engineBrakeBurbleIntensity: 0.60,
  pitchModulationRange: 3.5, // max 3.5 semitones pitch shift per band
};

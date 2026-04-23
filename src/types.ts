export type ArenaEnvironment = 'indoor' | 'outdoor'

export type RiderLevel =
  | 'Beginner'
  | 'Novice'
  | 'Intermediate'
  | 'Advanced'
  | 'Professional'

export type TrainingGoal =
  | 'Rhythm'
  | 'Turns'
  | 'Confidence'
  | 'Accuracy'
  | 'Combinations'
  | 'Competition simulation'

export type ObstacleType =
  | 'Vertical'
  | 'Oxer'
  | 'Triple Bar'
  | 'Combination'
  | 'Cross Rail'
  | 'Liverpool'
  | 'Wall'
  | 'Gate'

export interface HeightBand {
  id: string
  label: string
  minCm: number
  maxCm: number
}

export interface ObstacleDefinition {
  type: ObstacleType
  name: string
  description: string
  usage: string
  widthM: number
  depthM: number
  difficulty: number
  minimumLevel: RiderLevel
  recommendedHeightMinCm: number
  recommendedHeightMaxCm: number
}

export interface ArenaSetup {
  widthM: number
  lengthM: number
  environment: ArenaEnvironment
}

export interface CourseSettings {
  arena: ArenaSetup
  riderLevel: RiderLevel
  heightBandId: string
  obstacleCount: number
  allowedObstacleTypes: ObstacleType[]
  trainingGoal?: TrainingGoal
}

export interface CourseObstacle {
  id: string
  type: ObstacleType
  xM: number
  yM: number
  widthM: number
  depthM: number
  order: number
  heightCm: number
  difficulty: number
}

export interface CourseLayout {
  id: string
  createdAtIso: string
  settings: CourseSettings
  obstacles: CourseObstacle[]
}

export interface ValidationIssue {
  code: string
  message: string
  suggestion: string
}

export interface GeneratorResult {
  layout?: CourseLayout
  issues: ValidationIssue[]
}

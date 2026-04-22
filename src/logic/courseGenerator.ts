import {
  heightBands,
  obstacleLibrary,
  riderLevels,
} from '../data/courseData'
import type {
  CourseLayout,
  CourseObstacle,
  CourseSettings,
  GeneratorResult,
  ObstacleDefinition,
  ObstacleType,
  RiderLevel,
  TrainingGoal,
} from '../types'
import { validateLayout, validateSettings } from './courseValidation'

const levelIndex = (value: RiderLevel): number => riderLevels.indexOf(value)

const hashSeed = (input: string): number => {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const createRng = (seed: number): (() => number) => {
  let current = seed || 1
  return () => {
    current ^= current << 13
    current ^= current >>> 17
    current ^= current << 5
    return ((current >>> 0) % 1_000_000) / 1_000_000
  }
}

const spacingByLevel: Record<RiderLevel, number> = {
  Beginner: 10,
  Novice: 9,
  Intermediate: 8,
  Advanced: 7,
  Professional: 6,
}

const goalWeights = (
  goal: TrainingGoal | undefined,
): Partial<Record<ObstacleType, number>> => {
  switch (goal) {
    case 'Rhythm':
      return { Vertical: 1.3, 'Cross Rail': 1.2, Gate: 1.1 }
    case 'Turns':
      return { Vertical: 1.2, Wall: 1.2, Gate: 1.2 }
    case 'Confidence':
      return { 'Cross Rail': 1.5, Vertical: 1.2 }
    case 'Accuracy':
      return { Vertical: 1.4, Liverpool: 1.2, Combination: 1.2 }
    case 'Combinations':
      return { Combination: 2 }
    case 'Competition simulation':
      return { Oxer: 1.2, Liverpool: 1.2, Wall: 1.2, 'Triple Bar': 1.2 }
    default:
      return {}
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const chooseObstacleType = (
  rng: () => number,
  options: ObstacleDefinition[],
  usageCount: Map<ObstacleType, number>,
  goal: TrainingGoal | undefined,
): ObstacleDefinition => {
  const weights = goalWeights(goal)
  const scored = options.map((item) => {
    const currentUsage = usageCount.get(item.type) ?? 0
    const balanceWeight = 1 / (1 + currentUsage)
    const goalWeight = weights[item.type] ?? 1
    const weight = balanceWeight * goalWeight
    return { item, weight }
  })

  const totalWeight = scored.reduce((sum, value) => sum + value.weight, 0)
  const pick = rng() * totalWeight

  let rolling = 0
  for (const option of scored) {
    rolling += option.weight
    if (pick <= rolling) {
      return option.item
    }
  }

  return scored[scored.length - 1].item
}

const calculateObstacleHeight = (
  rng: () => number,
  minCm: number,
  maxCm: number,
  difficulty: number,
): number => {
  const difficultyBoost = (difficulty - 1) * 0.08
  const normalized = clamp(rng() + difficultyBoost, 0, 1)
  return Math.round(minCm + (maxCm - minCm) * normalized)
}

const overlaps = (first: CourseObstacle, second: CourseObstacle): boolean => {
  const firstLeft = first.xM - first.widthM / 2
  const firstRight = first.xM + first.widthM / 2
  const firstTop = first.yM - first.depthM / 2
  const firstBottom = first.yM + first.depthM / 2

  const secondLeft = second.xM - second.widthM / 2
  const secondRight = second.xM + second.widthM / 2
  const secondTop = second.yM - second.depthM / 2
  const secondBottom = second.yM + second.depthM / 2

  return !(
    firstRight < secondLeft ||
    firstLeft > secondRight ||
    firstBottom < secondTop ||
    firstTop > secondBottom
  )
}

const sortByPath = (obstacles: CourseObstacle[]): CourseObstacle[] => {
  const sorted = [...obstacles].sort((a, b) => a.yM - b.yM || a.xM - b.xM)
  return sorted.map((obstacle, index) => ({ ...obstacle, order: index + 1 }))
}

export const generateCourse = (settings: CourseSettings): GeneratorResult => {
  const settingsIssues = validateSettings(settings)
  if (settingsIssues.length > 0) {
    return { issues: settingsIssues }
  }

  const heightBand = heightBands.find((item) => item.id === settings.heightBandId)
  if (!heightBand) {
    return {
      issues: [
        {
          code: 'HEIGHT_BAND_UNKNOWN',
          message: 'Height band was not recognized.',
          suggestion: 'Pick another course height and retry.',
        },
      ],
    }
  }

  const allowedObstacleDefinitions = obstacleLibrary.filter(
    (item) =>
      settings.allowedObstacleTypes.includes(item.type) &&
      levelIndex(item.minimumLevel) <= levelIndex(settings.riderLevel),
  )

  if (allowedObstacleDefinitions.length === 0) {
    return {
      issues: [
        {
          code: 'NO_ELIGIBLE_OBSTACLES',
          message: 'No eligible obstacles remain for this rider level and selection.',
          suggestion: 'Enable beginner-friendly types or raise rider level.',
        },
      ],
    }
  }

  const seedInput = JSON.stringify(settings)
  const rng = createRng(hashSeed(seedInput))
  const marginM = 2
  const minSpacing = spacingByLevel[settings.riderLevel]
  const usageCount = new Map<ObstacleType, number>()
  const placed: CourseObstacle[] = []

  for (let index = 0; index < settings.obstacleCount; index += 1) {
    const obstacleType = chooseObstacleType(
      rng,
      allowedObstacleDefinitions,
      usageCount,
      settings.trainingGoal,
    )

    let attempts = 0
    let didPlace = false

    while (attempts < 700 && !didPlace) {
      attempts += 1
      const minX = marginM + obstacleType.widthM / 2
      const maxX = settings.arena.widthM - marginM - obstacleType.widthM / 2
      const minY = marginM + obstacleType.depthM / 2
      const maxY = settings.arena.lengthM - marginM - obstacleType.depthM / 2

      if (minX >= maxX || minY >= maxY) {
        break
      }

      const candidate: CourseObstacle = {
        id: `${index + 1}-${obstacleType.type.toLowerCase().replace(/\s+/g, '-')}`,
        type: obstacleType.type,
        xM: Number((minX + rng() * (maxX - minX)).toFixed(2)),
        yM: Number((minY + rng() * (maxY - minY)).toFixed(2)),
        widthM: obstacleType.widthM,
        depthM: obstacleType.depthM,
        order: index + 1,
        heightCm: calculateObstacleHeight(
          rng,
          Math.max(heightBand.minCm, obstacleType.recommendedHeightMinCm),
          Math.min(heightBand.maxCm, obstacleType.recommendedHeightMaxCm),
          obstacleType.difficulty,
        ),
        difficulty: obstacleType.difficulty,
      }

      const conflict = placed.some((existing) => {
        const distance = Math.hypot(existing.xM - candidate.xM, existing.yM - candidate.yM)
        return distance < minSpacing || overlaps(existing, candidate)
      })

      if (!conflict) {
        placed.push(candidate)
        usageCount.set(obstacleType.type, (usageCount.get(obstacleType.type) ?? 0) + 1)
        didPlace = true
      }
    }

    if (!didPlace) {
      return {
        issues: [
          {
            code: 'PLACEMENT_FAILED',
            message: `Could not place obstacle ${index + 1} safely within arena constraints.`,
            suggestion:
              'Reduce obstacle count, expand arena dimensions, or remove large obstacle types.',
          },
        ],
      }
    }
  }

  const layout: CourseLayout = {
    id: `${Date.now()}`,
    createdAtIso: new Date().toISOString(),
    settings,
    obstacles: sortByPath(placed),
  }

  const issues = validateLayout(layout)
  return {
    layout: issues.length > 0 ? undefined : layout,
    issues,
  }
}

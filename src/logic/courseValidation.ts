import { heightBands, obstacleLibrary, riderLevels, validHeightBandsByLevel } from '../data/courseData'
import type {
  CourseLayout,
  CourseSettings,
  ValidationIssue,
} from '../types'

const levelIndex = (value: string): number => riderLevels.indexOf(value as never)

const rectanglesOverlap = (
  a: { xM: number; yM: number; widthM: number; depthM: number },
  b: { xM: number; yM: number; widthM: number; depthM: number },
): boolean => {
  const aLeft = a.xM - a.widthM / 2
  const aRight = a.xM + a.widthM / 2
  const aTop = a.yM - a.depthM / 2
  const aBottom = a.yM + a.depthM / 2

  const bLeft = b.xM - b.widthM / 2
  const bRight = b.xM + b.widthM / 2
  const bTop = b.yM - b.depthM / 2
  const bBottom = b.yM + b.depthM / 2

  return !(aRight < bLeft || aLeft > bRight || aBottom < bTop || aTop > bBottom)
}

const spacingByLevel = {
  Beginner: 10,
  Novice: 9,
  Intermediate: 8,
  Advanced: 7,
  Professional: 6,
}

export const validateSettings = (settings: CourseSettings): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const { arena, riderLevel, heightBandId, obstacleCount, allowedObstacleTypes } = settings

  if (arena.widthM < 20 || arena.lengthM < 30) {
    issues.push({
      code: 'ARENA_TOO_SMALL',
      message: 'Arena dimensions are below practical training minimums (20m x 30m).',
      suggestion: 'Use at least 20m width and 30m length to generate a safe course.',
    })
  }

  const validHeightBands = validHeightBandsByLevel[riderLevel]
  if (!validHeightBands.includes(heightBandId)) {
    issues.push({
      code: 'HEIGHT_LEVEL_MISMATCH',
      message: 'Selected height does not match the rider level.',
      suggestion: `Choose one of: ${validHeightBands.join(', ')}.`,
    })
  }

  if (allowedObstacleTypes.length === 0) {
    issues.push({
      code: 'NO_OBSTACLES_SELECTED',
      message: 'No obstacle types are enabled.',
      suggestion: 'Enable at least one obstacle type before generating.',
    })
  }

  const blockedByLevel = allowedObstacleTypes.filter((type) => {
    const obstacle = obstacleLibrary.find((item) => item.type === type)
    return obstacle ? levelIndex(obstacle.minimumLevel) > levelIndex(riderLevel) : true
  })

  if (blockedByLevel.length > 0) {
    issues.push({
      code: 'OBSTACLE_LEVEL_MISMATCH',
      message: `Some selected obstacles are too advanced: ${blockedByLevel.join(', ')}.`,
      suggestion: 'Disable advanced obstacle types or increase rider level.',
    })
  }

  const arenaArea = arena.widthM * arena.lengthM
  const maxByArea = Math.max(4, Math.floor(arenaArea / 140))
  if (obstacleCount > maxByArea) {
    issues.push({
      code: 'COURSE_OVERCROWDING_RISK',
      message: `Obstacle count is high for arena size (estimated maximum ${maxByArea}).`,
      suggestion: `Reduce obstacle count to ${maxByArea} or below, or increase arena dimensions.`,
    })
  }

  return issues
}

export const validateLayout = (layout: CourseLayout): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const settingsIssues = validateSettings(layout.settings)
  issues.push(...settingsIssues)

  if (layout.obstacles.length !== layout.settings.obstacleCount) {
    issues.push({
      code: 'COUNT_MISMATCH',
      message: `Expected ${layout.settings.obstacleCount} obstacles but got ${layout.obstacles.length}.`,
      suggestion: 'Regenerate or lower obstacle count to fit the arena constraints.',
    })
  }

  const selectedHeight = heightBands.find((item) => item.id === layout.settings.heightBandId)

  layout.obstacles.forEach((obstacle) => {
    const definition = obstacleLibrary.find((item) => item.type === obstacle.type)
    if (!definition) {
      issues.push({
        code: 'UNKNOWN_OBSTACLE',
        message: `Obstacle type ${obstacle.type} is not recognized.`,
        suggestion: 'Replace with a valid obstacle from the library.',
      })
      return
    }

    if (
      obstacle.xM - obstacle.widthM / 2 < 0 ||
      obstacle.xM + obstacle.widthM / 2 > layout.settings.arena.widthM ||
      obstacle.yM - obstacle.depthM / 2 < 0 ||
      obstacle.yM + obstacle.depthM / 2 > layout.settings.arena.lengthM
    ) {
      issues.push({
        code: 'OUT_OF_BOUNDS',
        message: `Obstacle ${obstacle.order} is outside arena boundaries.`,
        suggestion: 'Drag it back inside or regenerate the layout.',
      })
    }

    if (
      selectedHeight &&
      (obstacle.heightCm < selectedHeight.minCm || obstacle.heightCm > selectedHeight.maxCm)
    ) {
      issues.push({
        code: 'INVALID_HEIGHT',
        message: `Obstacle ${obstacle.order} has a height outside selected range.`,
        suggestion: 'Regenerate layout or adjust to a valid height range.',
      })
    }
  })

  const minSpacing = spacingByLevel[layout.settings.riderLevel]
  for (let i = 0; i < layout.obstacles.length; i += 1) {
    for (let j = i + 1; j < layout.obstacles.length; j += 1) {
      const first = layout.obstacles[i]
      const second = layout.obstacles[j]

      if (rectanglesOverlap(first, second)) {
        issues.push({
          code: 'OVERLAP',
          message: `Obstacle ${first.order} overlaps obstacle ${second.order}.`,
          suggestion: 'Drag one obstacle away or regenerate.',
        })
        continue
      }

      const distance = Math.hypot(first.xM - second.xM, first.yM - second.yM)
      if (distance < minSpacing) {
        issues.push({
          code: 'SPACING_TOO_TIGHT',
          message: `Obstacles ${first.order} and ${second.order} are too close (${distance.toFixed(1)}m).`,
          suggestion: `Increase spacing to at least ${minSpacing}m for ${layout.settings.riderLevel}.`,
        })
      }
    }
  }

  return issues
}

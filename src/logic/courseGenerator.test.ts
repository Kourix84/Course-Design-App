import { describe, expect, it } from 'vitest'
import type { CourseSettings } from '../types'
import { generateCourse } from './courseGenerator'

const settings: CourseSettings = {
  arena: {
    widthM: 40,
    lengthM: 70,
    environment: 'outdoor',
  },
  riderLevel: 'Intermediate',
  heightBandId: '80-100',
  obstacleCount: 10,
  allowedObstacleTypes: ['Vertical', 'Oxer', 'Triple Bar', 'Combination', 'Cross Rail'],
  trainingGoal: 'Rhythm',
}

describe('generateCourse', () => {
  it('generates deterministic layouts for identical settings', () => {
    const first = generateCourse(settings)
    const second = generateCourse(settings)

    expect(first.issues).toEqual([])
    expect(second.issues).toEqual([])
    expect(first.layout?.obstacles).toEqual(second.layout?.obstacles)
  })

  it('places exactly requested obstacle count', () => {
    const result = generateCourse(settings)

    expect(result.issues).toEqual([])
    expect(result.layout?.obstacles).toHaveLength(settings.obstacleCount)
  })

  it('returns actionable issues for impossible overcrowded layouts', () => {
    const crowded: CourseSettings = {
      ...settings,
      arena: {
        widthM: 20,
        lengthM: 30,
        environment: 'indoor',
      },
      obstacleCount: 20,
    }

    const result = generateCourse(crowded)

    expect(result.layout).toBeUndefined()
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].suggestion.length).toBeGreaterThan(0)
  })
})

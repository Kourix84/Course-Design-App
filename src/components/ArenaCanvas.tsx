import { useMemo, useRef, useState } from 'react'
import type { CourseLayout, CourseObstacle } from '../types'

interface ArenaCanvasProps {
  course: CourseLayout
  selectedObstacleId?: string
  onObstacleSelect: (id?: string) => void
  onObstacleMove: (id: string, xM: number, yM: number) => void
}

interface DragState {
  id: string
  pointerOffsetXM: number
  pointerOffsetYM: number
}

const colorsByType: Record<string, string> = {
  Vertical: '#2563eb',
  Oxer: '#9333ea',
  'Triple Bar': '#7c3aed',
  Combination: '#db2777',
  'Cross Rail': '#16a34a',
  Liverpool: '#0891b2',
  Wall: '#b45309',
  Gate: '#4f46e5',
}

export function ArenaCanvas({
  course,
  selectedObstacleId,
  onObstacleSelect,
  onObstacleMove,
}: ArenaCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)

  const pixelsPerMeter = useMemo(() => {
    const widthScale = 860 / course.settings.arena.widthM
    const heightScale = 540 / course.settings.arena.lengthM
    return Math.min(widthScale, heightScale)
  }, [course.settings.arena.lengthM, course.settings.arena.widthM])

  const arenaPixelWidth = course.settings.arena.widthM * pixelsPerMeter
  const arenaPixelHeight = course.settings.arena.lengthM * pixelsPerMeter

  const orderedPoints = [...course.obstacles]
    .sort((a, b) => a.order - b.order)
    .map((obstacle) => `${obstacle.xM * pixelsPerMeter},${obstacle.yM * pixelsPerMeter}`)
    .join(' ')

  const findObstacle = (id: string): CourseObstacle | undefined =>
    course.obstacles.find((item) => item.id === id)

  const toMeters = (event: React.PointerEvent<SVGElement>) => {
    const svg = svgRef.current
    if (!svg) {
      return null
    }

    const rect = svg.getBoundingClientRect()
    const xM = ((event.clientX - rect.left) / rect.width) * course.settings.arena.widthM
    const yM = ((event.clientY - rect.top) / rect.height) * course.settings.arena.lengthM
    return { xM, yM }
  }

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState) {
      return
    }

    const pointer = toMeters(event)
    if (!pointer) {
      return
    }

    const obstacle = findObstacle(dragState.id)
    if (!obstacle) {
      return
    }

    const nextX = pointer.xM - dragState.pointerOffsetXM
    const nextY = pointer.yM - dragState.pointerOffsetYM

    const clampedX = Math.max(obstacle.widthM / 2, Math.min(course.settings.arena.widthM - obstacle.widthM / 2, nextX))
    const clampedY = Math.max(obstacle.depthM / 2, Math.min(course.settings.arena.lengthM - obstacle.depthM / 2, nextY))

    onObstacleMove(obstacle.id, Number(clampedX.toFixed(2)), Number(clampedY.toFixed(2)))
  }

  return (
    <section className="card">
      <div className="arena-header">
        <h2>Arena Layout</h2>
        <p>
          {course.settings.arena.widthM}m × {course.settings.arena.lengthM}m ({course.settings.arena.environment})
        </p>
      </div>
      <svg
        ref={svgRef}
        className="arena-svg"
        width={arenaPixelWidth}
        height={arenaPixelHeight}
        viewBox={`0 0 ${arenaPixelWidth} ${arenaPixelHeight}`}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDragState(null)}
        onPointerLeave={() => setDragState(null)}
      >
        <rect x={0} y={0} width={arenaPixelWidth} height={arenaPixelHeight} className="arena-border" />
        <polyline className="course-path" points={orderedPoints} />

        {course.obstacles.map((obstacle) => {
          const widthPx = obstacle.widthM * pixelsPerMeter
          const depthPx = obstacle.depthM * pixelsPerMeter
          const xPx = obstacle.xM * pixelsPerMeter - widthPx / 2
          const yPx = obstacle.yM * pixelsPerMeter - depthPx / 2
          const isSelected = obstacle.id === selectedObstacleId

          return (
            <g
              key={obstacle.id}
              onPointerDown={(event) => {
                event.preventDefault()
                const pointer = toMeters(event)
                if (!pointer) {
                  return
                }

                setDragState({
                  id: obstacle.id,
                  pointerOffsetXM: pointer.xM - obstacle.xM,
                  pointerOffsetYM: pointer.yM - obstacle.yM,
                })
                onObstacleSelect(obstacle.id)
              }}
              onClick={() => onObstacleSelect(obstacle.id)}
              style={{ cursor: 'grab' }}
            >
              <rect
                x={xPx}
                y={yPx}
                width={widthPx}
                height={depthPx}
                rx={6}
                fill={colorsByType[obstacle.type] ?? '#0f172a'}
                opacity={0.85}
                className={isSelected ? 'obstacle-selected' : ''}
              />
              <text x={obstacle.xM * pixelsPerMeter} y={obstacle.yM * pixelsPerMeter + 4} textAnchor="middle">
                {obstacle.order}
              </text>
            </g>
          )
        })}
      </svg>
    </section>
  )
}

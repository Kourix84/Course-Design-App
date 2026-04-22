import { useEffect, useMemo, useRef, useState } from 'react'
import { obstacleLibrary, obstacleTypes, riderLevels, validHeightBandsByLevel } from './data/courseData'
import { ArenaCanvas } from './components/ArenaCanvas'
import { Wizard } from './components/Wizard'
import { generateCourse } from './logic/courseGenerator'
import { validateLayout } from './logic/courseValidation'
import type { CourseLayout, CourseSettings, ObstacleType, ValidationIssue } from './types'
import { exportAsImage, exportAsPdf, printLayout } from './utils/exporters'
import { loadCourses, loadWizardDraft, saveCourse, saveWizardDraft } from './utils/persistence'
import './styles/app.css'

const defaultSettings: CourseSettings = {
  arena: {
    widthM: 40,
    lengthM: 70,
    environment: 'outdoor',
  },
  riderLevel: 'Beginner',
  heightBandId: '40-60',
  obstacleCount: 8,
  allowedObstacleTypes: [...obstacleTypes],
  trainingGoal: undefined,
}

const getLevelCompatibleTypes = (settings: CourseSettings): ObstacleType[] =>
  obstacleLibrary
    .filter(
      (item) =>
        riderLevels.indexOf(item.minimumLevel) <= riderLevels.indexOf(settings.riderLevel),
    )
    .map((item) => item.type)

function App() {
  const [step, setStep] = useState(0)
  const [settings, setSettings] = useState<CourseSettings>(() =>
    loadWizardDraft<CourseSettings>(defaultSettings),
  )
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [course, setCourse] = useState<CourseLayout | undefined>()
  const [savedCourses, setSavedCourses] = useState<CourseLayout[]>(() => loadCourses())
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | undefined>()
  const svgContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    saveWizardDraft(settings)
  }, [settings])

  const selectedObstacle = useMemo(
    () => course?.obstacles.find((item) => item.id === selectedObstacleId),
    [course?.obstacles, selectedObstacleId],
  )

  const nextStep = () => setStep((current) => Math.min(6, current + 1))
  const previousStep = () => setStep((current) => Math.max(0, current - 1))

  const generate = () => {
    const result = generateCourse(settings)
    if (!result.layout) {
      setCourse(undefined)
      setIssues(result.issues)
      return
    }

    const validatedIssues = validateLayout(result.layout)
    setIssues(validatedIssues)
    setCourse(result.layout)
    setSelectedObstacleId(undefined)
  }

  const moveObstacle = (id: string, xM: number, yM: number) => {
    setCourse((current) => {
      if (!current) {
        return current
      }

      const updated: CourseLayout = {
        ...current,
        obstacles: current.obstacles.map((obstacle) =>
          obstacle.id === id
            ? {
                ...obstacle,
                xM,
                yM,
              }
            : obstacle,
        ),
      }

      setIssues(validateLayout(updated))
      return updated
    })
  }

  const replaceObstacleType = (id: string, nextType: string) => {
    const definition = obstacleLibrary.find((item) => item.type === nextType)
    if (!definition) {
      return
    }

    setCourse((current) => {
      if (!current) {
        return current
      }

      const updated: CourseLayout = {
        ...current,
        obstacles: current.obstacles.map((obstacle) =>
          obstacle.id === id
            ? {
                ...obstacle,
                type: definition.type,
                widthM: definition.widthM,
                depthM: definition.depthM,
                difficulty: definition.difficulty,
              }
            : obstacle,
        ),
      }

      setIssues(validateLayout(updated))
      return updated
    })
  }

  const saveCurrentCourse = () => {
    if (!course) {
      return
    }

    saveCourse(course)
    setSavedCourses(loadCourses())
  }

  const renderIssue = (issue: ValidationIssue) => (
    <li key={`${issue.code}-${issue.message}`}>
      <strong>{issue.message}</strong>
      <span>{issue.suggestion}</span>
    </li>
  )

  const updateSettings = (next: CourseSettings) => {
    const validBands = validHeightBandsByLevel[next.riderLevel]
    const safeHeightBand = validBands.includes(next.heightBandId) ? next.heightBandId : validBands[0]

    setSettings({
      ...next,
      heightBandId: safeHeightBand,
      allowedObstacleTypes:
        next.allowedObstacleTypes.length === 0 ? getLevelCompatibleTypes(next) : next.allowedObstacleTypes,
    })
  }

  const getSvg = (): SVGSVGElement | null =>
    svgContainerRef.current?.querySelector('svg') ?? null

  return (
    <main className="app-layout">
      <header>
        <h1>Course Design App</h1>
        <p>Create deterministic showjumping courses that work fully offline.</p>
      </header>

      <div className="grid-two">
        <Wizard
          step={step}
          settings={settings}
          onSettingsChange={updateSettings}
          onNext={nextStep}
          onBack={previousStep}
          onGenerate={generate}
        />

        <section className="card">
          <h2>Saved Courses</h2>
          {savedCourses.length === 0 ? (
            <p>No saved courses yet.</p>
          ) : (
            <ul className="saved-list">
              {savedCourses.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setCourse(item)
                      setIssues(validateLayout(item))
                    }}
                  >
                    {new Date(item.createdAtIso).toLocaleString()} · {item.settings.riderLevel} · {item.obstacles.length} obstacles
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {issues.length > 0 && (
        <section className="card issue-card">
          <h2>Validation Feedback</h2>
          <ul>{issues.map(renderIssue)}</ul>
        </section>
      )}

      {course && (
        <>
          <div className="grid-two" ref={svgContainerRef}>
            <ArenaCanvas
              course={course}
              selectedObstacleId={selectedObstacleId}
              onObstacleSelect={setSelectedObstacleId}
              onObstacleMove={moveObstacle}
            />

            <section className="card">
              <h2>Course Controls</h2>
              <div className="control-group">
                <button onClick={generate}>Regenerate layout</button>
                <button onClick={saveCurrentCourse}>Save locally</button>
              </div>
              <div className="control-group">
                <button
                  onClick={async () => {
                    const svg = getSvg()
                    if (svg) {
                      await exportAsImage(svg)
                    }
                  }}
                >
                  Export image
                </button>
                <button
                  onClick={async () => {
                    const svg = getSvg()
                    if (svg) {
                      await exportAsPdf(svg)
                    }
                  }}
                >
                  Export PDF
                </button>
                <button
                  onClick={() => {
                    const svg = getSvg()
                    if (svg) {
                      printLayout(svg.outerHTML)
                    }
                  }}
                >
                  Printable layout
                </button>
              </div>

              {selectedObstacle && (
                <div className="editor-panel">
                  <h3>Edit obstacle #{selectedObstacle.order}</h3>
                  <p>
                    Position: {selectedObstacle.xM.toFixed(1)}m, {selectedObstacle.yM.toFixed(1)}m
                  </p>
                  <label>
                    Replace type
                    <select
                      value={selectedObstacle.type}
                      onChange={(event) => replaceObstacleType(selectedObstacle.id, event.target.value)}
                    >
                      {settings.allowedObstacleTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  )
}

export default App

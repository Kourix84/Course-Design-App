import { heightBands, obstacleTypes, trainingGoals, validHeightBandsByLevel } from '../data/courseData'
import type { CourseSettings, RiderLevel, TrainingGoal } from '../types'

interface WizardProps {
  step: number
  settings: CourseSettings
  onSettingsChange: (next: CourseSettings) => void
  onNext: () => void
  onBack: () => void
  onGenerate: () => void
}

const steps = [
  'Arena Setup',
  'Rider Level',
  'Course Height',
  'Obstacle Count',
  'Obstacle Preferences',
  'Training Goal',
  'Generate',
]

export function Wizard({
  step,
  settings,
  onSettingsChange,
  onNext,
  onBack,
  onGenerate,
}: WizardProps) {
  const setArena = (field: 'widthM' | 'lengthM', value: number): void => {
    onSettingsChange({
      ...settings,
      arena: {
        ...settings.arena,
        [field]: value,
      },
    })
  }

  const setRiderLevel = (riderLevel: RiderLevel): void => {
    const validBands = validHeightBandsByLevel[riderLevel]
    const heightBandId = validBands.includes(settings.heightBandId)
      ? settings.heightBandId
      : validBands[0]

    onSettingsChange({
      ...settings,
      riderLevel,
      heightBandId,
    })
  }

  const toggleObstacleType = (type: (typeof obstacleTypes)[number], enabled: boolean): void => {
    const nextTypes = enabled
      ? [...settings.allowedObstacleTypes, type]
      : settings.allowedObstacleTypes.filter((item) => item !== type)

    onSettingsChange({
      ...settings,
      allowedObstacleTypes: nextTypes,
    })
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="wizard-grid">
            <label>
              Arena width (m)
              <input
                type="number"
                min={20}
                max={100}
                value={settings.arena.widthM}
                onChange={(event) => setArena('widthM', Number(event.target.value))}
              />
            </label>
            <label>
              Arena length (m)
              <input
                type="number"
                min={30}
                max={200}
                value={settings.arena.lengthM}
                onChange={(event) => setArena('lengthM', Number(event.target.value))}
              />
            </label>
            <label>
              Environment
              <select
                value={settings.arena.environment}
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    arena: {
                      ...settings.arena,
                      environment: event.target.value as 'indoor' | 'outdoor',
                    },
                  })
                }
              >
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
              </select>
            </label>
          </div>
        )
      case 1:
        return (
          <div className="radio-stack">
            {(['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Professional'] as RiderLevel[]).map(
              (level) => (
                <label key={level}>
                  <input
                    type="radio"
                    name="rider-level"
                    checked={settings.riderLevel === level}
                    onChange={() => setRiderLevel(level)}
                  />
                  {level}
                </label>
              ),
            )}
          </div>
        )
      case 2:
        return (
          <div className="radio-stack">
            {heightBands
              .filter((band) => validHeightBandsByLevel[settings.riderLevel].includes(band.id))
              .map((band) => (
                <label key={band.id}>
                  <input
                    type="radio"
                    name="height"
                    checked={settings.heightBandId === band.id}
                    onChange={() => onSettingsChange({ ...settings, heightBandId: band.id })}
                  />
                  {band.label}
                </label>
              ))}
          </div>
        )
      case 3:
        return (
          <label>
            Obstacles to place
            <input
              type="number"
              min={4}
              max={20}
              value={settings.obstacleCount}
              onChange={(event) =>
                onSettingsChange({ ...settings, obstacleCount: Number(event.target.value) })
              }
            />
          </label>
        )
      case 4:
        return (
          <div className="checkbox-grid">
            {obstacleTypes.map((type) => (
              <label key={type}>
                <input
                  type="checkbox"
                  checked={settings.allowedObstacleTypes.includes(type)}
                  onChange={(event) => toggleObstacleType(type, event.target.checked)}
                />
                {type}
              </label>
            ))}
          </div>
        )
      case 5:
        return (
          <label>
            Training goal (optional)
            <select
              value={settings.trainingGoal ?? ''}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  trainingGoal: (event.target.value || undefined) as TrainingGoal | undefined,
                })
              }
            >
              <option value="">No specific goal</option>
              {trainingGoals.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>
          </label>
        )
      default:
        return (
          <div className="summary-box">
            <p>Ready to generate your course with the selected settings.</p>
            <button onClick={onGenerate}>Generate Course</button>
          </div>
        )
    }
  }

  return (
    <section className="card">
      <h2>Course Wizard</h2>
      <p className="step-label">
        Step {step + 1} / {steps.length}: {steps[step]}
      </p>
      {renderStep()}
      <div className="actions">
        <button onClick={onBack} disabled={step === 0}>
          Back
        </button>
        {step < steps.length - 1 ? (
          <button onClick={onNext}>Next</button>
        ) : (
          <button onClick={onGenerate}>Generate</button>
        )}
      </div>
    </section>
  )
}

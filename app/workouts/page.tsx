'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getDateString } from '@/lib/utils'

interface Exercise {
  id: string
  name: string
  target_reps?: number
  display_order: number
}

interface WorkoutTemplate {
  id: string
  name: string
  exercises: Exercise[]
}

interface WorkoutSet {
  id?: string
  exercise_id: string
  exercise_name: string
  set_number: number
  reps?: number
  weight?: number
  rpe?: number
  notes?: string
}

interface WorkoutSession {
  id: string
  template_id: string
  template_name: string
  date: string
  completed: boolean
  sets: WorkoutSet[]
}

interface PrevSet {
  set_number: number
  reps?: number
  weight?: number
  rpe?: number
}

function formatRestTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function WorkoutsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newExerciseName, setNewExerciseName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Progressive overload: previous session sets, keyed by exercise_id
  const [prevSets, setPrevSets] = useState<Record<string, PrevSet[]>>({})
  const [prevDate, setPrevDate] = useState<string | null>(null)

  // Rest timer
  const [restSeconds, setRestSeconds] = useState<number | null>(null)
  const [restDone, setRestDone] = useState(false)

  useEffect(() => {
    if (restSeconds === null) return
    if (restSeconds <= 0) {
      setRestDone(true)
      setRestSeconds(null)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([200, 100, 200])
      }
      return
    }
    const t = setTimeout(() => {
      setRestSeconds(s => (s !== null ? s - 1 : null))
    }, 1000)
    return () => clearTimeout(t)
  }, [restSeconds])

  const startRest = (seconds: number) => {
    setRestDone(false)
    setRestSeconds(seconds)
  }

  const loadPreviousSets = async (client: any, userId: string, templateId: string, beforeDate: string) => {
    try {
      const { data: prevSession } = await client
        .from('workout_sessions')
        .select('id, date')
        .eq('user_id', userId)
        .eq('template_id', templateId)
        .lt('date', beforeDate)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (prevSession?.id) {
        setPrevDate(prevSession.date)
        const { data: sets } = await client
          .from('workout_sets')
          .select('exercise_id, set_number, reps, weight, rpe')
          .eq('workout_session_id', prevSession.id)
          .order('set_number')

        if (sets) {
          const grouped: Record<string, PrevSet[]> = {}
          for (const s of sets) {
            if (!grouped[s.exercise_id]) grouped[s.exercise_id] = []
            grouped[s.exercise_id].push({
              set_number: s.set_number,
              reps: s.reps,
              weight: s.weight,
              rpe: s.rpe
            })
          }
          setPrevSets(grouped)
        }
      } else {
        setPrevSets({})
        setPrevDate(null)
      }
    } catch {
      // No previous session found — that's fine
      setPrevSets({})
      setPrevDate(null)
    }
  }

  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        const client = createClient()
        const { data: { user: authUser } } = await client.auth.getUser()

        if (!authUser) {
          router.push('/auth/login')
          return
        }

        setUser(authUser)

        const { data: templatesData } = await client
          .from('workout_templates')
          .select(`
            id,
            name,
            display_order,
            exercises(
              id,
              name,
              target_reps,
              display_order
            )
          `)
          .eq('user_id', authUser.id)
          .order('display_order')

        if (templatesData) {
          setTemplates(templatesData as any)
        }

        const sessionId = searchParams.get('session')
        if (sessionId) {
          const { data: sessionData } = await client
            .from('workout_sessions')
            .select(`
              id,
              template_id,
              date,
              completed,
              workout_templates:template_id(name),
              workout_sets(
                id,
                exercise_id,
                set_number,
                reps,
                weight,
                rpe,
                notes,
                exercises(name)
              )
            `)
            .eq('id', sessionId)
            .single()

          if (sessionData) {
            setActiveSession({
              id: sessionData.id,
              template_id: sessionData.template_id,
              template_name: (sessionData as any).workout_templates?.name,
              date: sessionData.date,
              completed: sessionData.completed,
              sets: (sessionData as any).workout_sets?.map((s: any) => ({
                id: s.id,
                exercise_id: s.exercise_id,
                exercise_name: s.exercises?.name,
                set_number: s.set_number,
                reps: s.reps,
                weight: s.weight,
                rpe: s.rpe,
                notes: s.notes
              })) || []
            })
            await loadPreviousSets(client, authUser.id, sessionData.template_id, sessionData.date)
          }
        }
      } catch (error) {
        console.error('Error loading workouts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWorkouts()
  }, [router, searchParams])

  const createTemplate = async () => {
    if (!user || !newTemplateName.trim()) return

    try {
      const client = createClient()
      const { data: templateData } = await client
        .from('workout_templates')
        .insert([{
          user_id: user.id,
          name: newTemplateName,
          display_order: templates.length
        }])
        .select()

      if (templateData?.[0]) {
        setTemplates([...templates, { ...templateData[0], exercises: [] }])
        setNewTemplateName('')
        setShowNewTemplate(false)
        setSelectedTemplate(templateData[0].id)
      }
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  const addExercise = async () => {
    if (!selectedTemplate || !newExerciseName.trim()) return

    try {
      const client = createClient()
      const { data: exerciseData } = await client
        .from('exercises')
        .insert([{
          template_id: selectedTemplate,
          name: newExerciseName,
          display_order: 0
        }])
        .select()

      if (exerciseData?.[0]) {
        const updatedTemplates = templates.map(t =>
          t.id === selectedTemplate
            ? { ...t, exercises: [...t.exercises, exerciseData[0] as any] }
            : t
        )
        setTemplates(updatedTemplates)
        setNewExerciseName('')
      }
    } catch (error) {
      console.error('Error adding exercise:', error)
    }
  }

  const startWorkout = async (templateId: string, templateName: string) => {
    if (!user) return

    try {
      const client = createClient()
      const today = getDateString()

      const { data: existingSession } = await client
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('template_id', templateId)
        .eq('date', today)
        .single()

      let sessionId = existingSession?.id

      if (!sessionId) {
        const { data: newSession } = await client
          .from('workout_sessions')
          .insert([{
            user_id: user.id,
            template_id: templateId,
            date: today
          }])
          .select()

        sessionId = newSession?.[0]?.id
      }

      if (sessionId) {
        const template = templates.find(t => t.id === templateId)
        if (template) {
          setActiveSession({
            id: sessionId,
            template_id: templateId,
            template_name: templateName,
            date: today,
            completed: false,
            sets: template.exercises.map((ex) => ({
              exercise_id: ex.id,
              exercise_name: ex.name,
              set_number: 1,
            }))
          })
          await loadPreviousSets(client, user.id, templateId, today)
        }
      }
    } catch (error) {
      console.error('Error starting workout:', error)
    }
  }

  const saveSet = async (exerciseId: string, setNumber: number, data: any) => {
    if (!activeSession) return

    try {
      const client = createClient()

      const { data: existingSet } = await client
        .from('workout_sets')
        .select('id')
        .eq('workout_session_id', activeSession.id)
        .eq('exercise_id', exerciseId)
        .eq('set_number', setNumber)
        .single()

      if (existingSet?.id) {
        await client
          .from('workout_sets')
          .update(data)
          .eq('id', existingSet.id)
      } else {
        await client
          .from('workout_sets')
          .insert([{
            workout_session_id: activeSession.id,
            exercise_id: exerciseId,
            set_number: setNumber,
            ...data
          }])
      }
    } catch (error) {
      console.error('Error saving set:', error)
    }
  }

  const completeWorkout = async () => {
    if (!activeSession) return

    try {
      const client = createClient()
      await client
        .from('workout_sessions')
        .update({ completed: true })
        .eq('id', activeSession.id)

      setActiveSession(null)
      setRestSeconds(null)
      setRestDone(false)
      router.push('/')
    } catch (error) {
      console.error('Error completing workout:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading...</div>
  }

  // Active workout view
  if (activeSession) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-40 space-y-5">
        <div className="flex justify-between items-center pt-2">
          <div>
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
              In Progress
            </p>
            <h1 className="text-2xl font-bold text-white">{activeSession.template_name}</h1>
          </div>
          <button
            onClick={() => setActiveSession(null)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition text-lg"
            aria-label="Close workout"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {templates.find(t => t.id === activeSession.template_id)?.exercises.map((exercise) => {
            const lastSets = prevSets[exercise.id]
            return (
              <div key={exercise.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                <h3 className="font-bold text-lg text-white">{exercise.name}</h3>

                {/* Progressive overload hint */}
                {lastSets && lastSets.length > 0 ? (
                  <p className="text-sm text-blue-300 mt-1 mb-4">
                    Last time:{' '}
                    <span className="font-semibold">
                      {lastSets
                        .filter(s => s.reps || s.weight)
                        .map(s => `${s.weight ?? '–'} lb × ${s.reps ?? '–'}`)
                        .join(' · ') || 'logged, no data'}
                    </span>
                    {' '}— try to beat it 💪
                  </p>
                ) : (
                  <p className="text-sm text-slate-500 mt-1 mb-4">First time logging this — set your baseline</p>
                )}

                <div className="space-y-3">
                  {[1, 2, 3].map((setNum) => (
                    <div key={setNum} className="flex items-center gap-3">
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700">
                        <span className="text-sm font-bold text-slate-300">{setNum}</span>
                      </div>

                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                            Reps
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder={String(lastSets?.find(s => s.set_number === setNum)?.reps ?? 0)}
                            defaultValue={activeSession.sets.find(s => s.exercise_id === exercise.id && s.set_number === setNum)?.reps || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val) saveSet(exercise.id, setNum, { reps: parseInt(val) })
                            }}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-2.5 text-center text-base font-bold text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                            Lbs
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder={String(lastSets?.find(s => s.set_number === setNum)?.weight ?? 0)}
                            defaultValue={activeSession.sets.find(s => s.exercise_id === exercise.id && s.set_number === setNum)?.weight || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val) saveSet(exercise.id, setNum, { weight: parseFloat(val) })
                            }}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-2.5 text-center text-base font-bold text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                            RPE
                          </label>
                          <select
                            defaultValue={activeSession.sets.find(s => s.exercise_id === exercise.id && s.set_number === setNum)?.rpe || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val) saveSet(exercise.id, setNum, { rpe: parseInt(val) })
                            }}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-1 py-2.5 text-center text-base font-bold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">-</option>
                            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={completeWorkout}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-3.5 rounded-xl transition shadow-lg shadow-green-900/30"
        >
          ✓ Complete Workout
        </button>

        {/* Rest timer bar — fixed above bottom nav */}
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2">
          <div className="max-w-2xl mx-auto">
            {restSeconds !== null ? (
              <div className="flex items-center justify-between bg-blue-600 rounded-xl px-4 py-3 shadow-lg">
                <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Rest</span>
                <span className="text-2xl font-bold text-white tabular-nums">{formatRestTime(restSeconds)}</span>
                <button
                  onClick={() => setRestSeconds(null)}
                  className="text-sm font-semibold text-blue-100 hover:text-white transition"
                >
                  Skip
                </button>
              </div>
            ) : restDone ? (
              <button
                onClick={() => setRestDone(false)}
                className="w-full bg-green-600 rounded-xl px-4 py-3 shadow-lg text-white font-bold"
              >
                ✓ Rest done — go!
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur rounded-xl px-3 py-2.5 border border-slate-700 shadow-lg">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Rest</span>
                {[60, 90, 120, 180].map(secs => (
                  <button
                    key={secs}
                    onClick={() => startRest(secs)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg py-1.5 text-sm font-bold text-white transition"
                  >
                    {formatRestTime(secs)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Templates list view
  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">
      <h1 className="text-2xl font-bold text-white pt-2">Workouts</h1>

      {showNewTemplate && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
          <input
            type="text"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Template name (e.g., Full Body A)"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-base text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={createTemplate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition"
            >
              Create
            </button>
            <button
              onClick={() => setShowNewTemplate(false)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showNewTemplate && (
        <button
          onClick={() => setShowNewTemplate(true)}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 rounded-xl transition border border-slate-700"
        >
          + New Template
        </button>
      )}

      <div className="space-y-3">
        {templates.map((template) => (
          <div key={template.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <h3 className="font-bold text-lg text-white mb-1">{template.name}</h3>
            <p className="text-sm text-slate-400 mb-3">{template.exercises.length} exercises</p>

            {selectedTemplate === template.id && (
              <div className="bg-slate-800 rounded-xl p-3 mb-3 space-y-2">
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="Exercise name"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addExercise}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg text-sm transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {template.exercises.length > 0 && (
              <div className="space-y-1.5 mb-4">
                {template.exercises.map((ex) => (
                  <div key={ex.id} className="text-sm text-slate-300 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-slate-500" />
                    {ex.name}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => startWorkout(template.id, template.name)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition"
              >
                Start
              </button>
              {selectedTemplate !== template.id && (
                <button
                  onClick={() => setSelectedTemplate(template.id)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg text-sm transition border border-slate-700"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Workouts() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-slate-400">Loading...</div>}>
      <WorkoutsContent />
    </Suspense>
  )
}

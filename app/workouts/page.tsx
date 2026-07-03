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
              reps: undefined,
              weight: undefined,
              rpe: undefined
            }))
          })
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
      router.push('/')
    } catch (error) {
      console.error('Error completing workout:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (activeSession) {
    return (
      <div className="max-w-2xl mx-auto px-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{activeSession.template_name}</h1>
          <button
            onClick={() => setActiveSession(null)}
            className="text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {templates.find(t => t.id === activeSession.template_id)?.exercises.map((exercise) => (
            <div key={exercise.id} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <h3 className="font-semibold mb-3">{exercise.name}</h3>
              <div className="space-y-2">
                {[1, 2, 3].map((setNum) => (
                  <div key={setNum} className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <label className="text-xs text-slate-400">Set {setNum}</label>
                      <input
                        type="number"
                        placeholder="reps"
                        defaultValue={activeSession.sets.find(s => s.exercise_id === exercise.id && s.set_number === setNum)?.reps || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val) saveSet(exercise.id, setNum, { reps: parseInt(val) })
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Weight</label>
                      <input
                        type="number"
                        placeholder="lbs"
                        defaultValue={activeSession.sets.find(s => s.exercise_id === exercise.id && s.set_number === setNum)?.weight || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val) saveSet(exercise.id, setNum, { weight: parseFloat(val) })
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">RPE</label>
                      <select
                        defaultValue={activeSession.sets.find(s => s.exercise_id === exercise.id && s.set_number === setNum)?.rpe || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val) saveSet(exercise.id, setNum, { rpe: parseInt(val) })
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                      >
                        <option value="">-</option>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={completeWorkout}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition"
        >
          ✓ Complete Workout
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-4">
      <h1 className="text-2xl font-bold">Workouts</h1>

      {showNewTemplate && (
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-3">
          <input
            type="text"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Template name (e.g., Full Body A)"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={createTemplate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
            >
              Create
            </button>
            <button
              onClick={() => setShowNewTemplate(false)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showNewTemplate && (
        <button
          onClick={() => setShowNewTemplate(true)}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition"
        >
          + New Template
        </button>
      )}

      <div className="space-y-3">
        {templates.map((template) => (
          <div key={template.id} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
            <h3 className="font-semibold mb-2">{template.name}</h3>
            <p className="text-sm text-slate-400 mb-3">{template.exercises.length} exercises</p>

            {selectedTemplate === template.id && (
              <div className="bg-slate-800 rounded p-3 mb-3 space-y-2">
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="Exercise name"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1 text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addExercise}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 rounded text-sm transition"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1 rounded text-sm transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {template.exercises.length > 0 && (
              <div className="space-y-1 mb-3">
                {template.exercises.map((ex) => (
                  <div key={ex.id} className="text-sm text-slate-400">
                    • {ex.name}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => startWorkout(template.id, template.name)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition"
              >
                Start
              </button>
              {selectedTemplate !== template.id && (
                <button
                  onClick={() => setSelectedTemplate(template.id)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded-lg text-sm transition"
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
    <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
      <WorkoutsContent />
    </Suspense>
  )
}
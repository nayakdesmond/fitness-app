'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { getDateString, type WeightUnit } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import ActiveSessionView, {
  type PrevSet,
  type WorkoutSession,
} from '@/components/workouts/ActiveSessionView'
import TemplateCard, { type WorkoutTemplate } from '@/components/workouts/TemplateCard'
import ProgressView from '@/components/workouts/ProgressView'

function WorkoutsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs')
  const [view, setView] = useState<'templates' | 'progress'>('templates')

  // Progressive overload: previous session sets, keyed by exercise_id
  const [prevSets, setPrevSets] = useState<Record<string, PrevSet[]>>({})

  const loadPreviousSets = async (
    client: ReturnType<typeof createClient>,
    userId: string,
    templateId: string,
    beforeDate: string
  ) => {
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
              rpe: s.rpe,
            })
          }
          setPrevSets(grouped)
        }
      } else {
        setPrevSets({})
      }
    } catch {
      // No previous session found — that's fine
      setPrevSets({})
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

        const { data: settingsData } = await client
          .from('user_settings')
          .select('weight_unit')
          .eq('id', authUser.id)
          .single()

        if (settingsData?.weight_unit === 'kg') {
          setWeightUnit('kg')
        }

        const { data: templatesData, error: templatesError } = await client
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

        if (templatesError) throw templatesError
        if (templatesData) {
          setTemplates(templatesData as unknown as WorkoutTemplate[])
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
            const row = sessionData as unknown as {
              workout_templates: { name?: string } | null
              workout_sets: Array<{
                id: string
                exercise_id: string
                set_number: number
                reps?: number
                weight?: number
                rpe?: number
                notes?: string
                exercises: { name?: string } | null
              }> | null
            }
            setActiveSession({
              id: sessionData.id,
              template_id: sessionData.template_id,
              template_name: row.workout_templates?.name || 'Workout',
              date: sessionData.date,
              completed: sessionData.completed,
              sets: row.workout_sets?.map((s) => ({
                id: s.id,
                exercise_id: s.exercise_id,
                exercise_name: s.exercises?.name || '',
                set_number: s.set_number,
                reps: s.reps,
                weight: s.weight,
                rpe: s.rpe,
                notes: s.notes,
              })) || [],
            })
            await loadPreviousSets(client, authUser.id, sessionData.template_id, sessionData.date)
          }
        }
      } catch (error) {
        console.error('Error loading workouts:', error)
        toast('error', 'Could not load your workouts. Pull to refresh or try again.')
      } finally {
        setLoading(false)
      }
    }

    loadWorkouts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams])

  const createTemplate = async () => {
    if (!user || !newTemplateName.trim()) return

    try {
      const client = createClient()
      const { data: templateData, error } = await client
        .from('workout_templates')
        .insert([{
          user_id: user.id,
          name: newTemplateName,
          display_order: templates.length,
        }])
        .select()

      if (error) throw error
      if (templateData?.[0]) {
        setTemplates([...templates, { ...templateData[0], exercises: [] }])
        setNewTemplateName('')
        setShowNewTemplate(false)
        setSelectedTemplate(templateData[0].id)
      }
    } catch (error) {
      console.error('Error creating template:', error)
      toast('error', 'Could not create the template.')
    }
  }

  const addExercise = async (templateId: string, name: string) => {
    try {
      const client = createClient()
      const { data: exerciseData, error } = await client
        .from('exercises')
        .insert([{
          template_id: templateId,
          name,
          display_order: 0,
        }])
        .select()

      if (error) throw error
      if (exerciseData?.[0]) {
        setTemplates(templates.map(t =>
          t.id === templateId
            ? { ...t, exercises: [...t.exercises, exerciseData[0]] }
            : t
        ))
      }
    } catch (error) {
      console.error('Error adding exercise:', error)
      toast('error', 'Could not add the exercise.')
    }
  }

  const renameTemplate = async (templateId: string, name: string) => {
    try {
      const client = createClient()
      const { error } = await client
        .from('workout_templates')
        .update({ name })
        .eq('id', templateId)

      if (error) throw error
      setTemplates(templates.map(t =>
        t.id === templateId ? { ...t, name } : t
      ))
    } catch (error) {
      console.error('Error renaming template:', error)
      toast('error', 'Could not rename the template.')
    }
  }

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this workout template? This cannot be undone.')) return

    try {
      const client = createClient()

      // Delete exercises first, then the template
      await client.from('exercises').delete().eq('template_id', templateId)
      const { error } = await client
        .from('workout_templates')
        .delete()
        .eq('id', templateId)

      if (error) {
        toast('error', 'Could not delete — this template has logged workout history. You can rename it instead.')
        return
      }

      setTemplates(templates.filter(t => t.id !== templateId))
      setSelectedTemplate(null)
    } catch (error) {
      console.error('Error deleting template:', error)
      toast('error', 'Could not delete the template.')
    }
  }

  const renameExercise = async (exerciseId: string, name: string) => {
    try {
      const client = createClient()
      const { error } = await client
        .from('exercises')
        .update({ name })
        .eq('id', exerciseId)

      if (error) throw error
      setTemplates(templates.map(t => ({
        ...t,
        exercises: t.exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, name } : ex
        ),
      })))
    } catch (error) {
      console.error('Error renaming exercise:', error)
      toast('error', 'Could not rename the exercise.')
    }
  }

  const deleteExercise = async (exerciseId: string) => {
    if (!confirm('Delete this exercise from the template?')) return

    try {
      const client = createClient()
      const { error } = await client
        .from('exercises')
        .delete()
        .eq('id', exerciseId)

      if (error) {
        toast('error', 'Could not delete — this exercise has logged sets. You can rename it instead.')
        return
      }

      setTemplates(templates.map(t => ({
        ...t,
        exercises: t.exercises.filter(ex => ex.id !== exerciseId),
      })))
    } catch (error) {
      console.error('Error deleting exercise:', error)
      toast('error', 'Could not delete the exercise.')
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
        const { data: newSession, error } = await client
          .from('workout_sessions')
          .insert([{
            user_id: user.id,
            template_id: templateId,
            date: today,
          }])
          .select()

        if (error) throw error
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
            })),
          })
          await loadPreviousSets(client, user.id, templateId, today)
        }
      }
    } catch (error) {
      console.error('Error starting workout:', error)
      toast('error', 'Could not start the workout.')
    }
  }

  const saveSet = async (exerciseId: string, setNumber: number, data: Record<string, number>) => {
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
        const { error } = await client
          .from('workout_sets')
          .update(data)
          .eq('id', existingSet.id)
        if (error) throw error
      } else {
        const { error } = await client
          .from('workout_sets')
          .insert([{
            workout_session_id: activeSession.id,
            exercise_id: exerciseId,
            set_number: setNumber,
            ...data,
          }])
        if (error) throw error
      }
    } catch (error) {
      console.error('Error saving set:', error)
      toast('error', 'Set not saved — check your connection.')
    }
  }

  const completeWorkout = async () => {
    if (!activeSession) return

    try {
      const client = createClient()
      const { error } = await client
        .from('workout_sessions')
        .update({ completed: true })
        .eq('id', activeSession.id)

      if (error) throw error
      setActiveSession(null)
      router.push('/')
    } catch (error) {
      console.error('Error completing workout:', error)
      toast('error', 'Could not complete the workout — check your connection.')
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-neutral-400">Loading...</div>
  }

  if (activeSession) {
    return (
      <ActiveSessionView
        session={activeSession}
        exercises={templates.find(t => t.id === activeSession.template_id)?.exercises || []}
        prevSets={prevSets}
        weightUnit={weightUnit}
        onSaveSet={saveSet}
        onComplete={completeWorkout}
        onClose={() => setActiveSession(null)}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">
      <h1 className="text-2xl font-display uppercase tracking-wide text-white pt-2">Workouts</h1>

      {/* View toggle */}
      <div className="grid grid-cols-2 gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
        {(
          [
            ['templates', 'Templates'],
            ['progress', 'Progress'],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`py-2 rounded-lg text-sm font-semibold transition ${
              view === v ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'progress' && user && (
        <ProgressView userId={user.id} weightUnit={weightUnit} />
      )}

      {view === 'templates' && (
        <>
      {showNewTemplate && (
        <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 space-y-3">
          <input
            type="text"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Template name (e.g., Full Body A)"
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-base text-white placeholder-neutral-500 focus:border-white focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={createTemplate}
              className="flex-1 bg-white hover:bg-neutral-200 text-black font-semibold py-2.5 rounded-lg transition"
            >
              Create
            </button>
            <button
              onClick={() => setShowNewTemplate(false)}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-2.5 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showNewTemplate && (
        <button
          onClick={() => setShowNewTemplate(true)}
          className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3.5 rounded-xl transition border border-neutral-700"
        >
          + New Template
        </button>
      )}

      <div className="space-y-3">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isEditing={selectedTemplate === template.id}
            onStart={() => startWorkout(template.id, template.name)}
            onOpenEdit={() => setSelectedTemplate(template.id)}
            onCloseEdit={() => setSelectedTemplate(null)}
            onRename={(name) => renameTemplate(template.id, name)}
            onDelete={() => deleteTemplate(template.id)}
            onAddExercise={(name) => addExercise(template.id, name)}
            onRenameExercise={renameExercise}
            onDeleteExercise={deleteExercise}
          />
        ))}
      </div>
        </>
      )}
    </div>
  )
}

export default function Workouts() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-neutral-400">Loading...</div>}>
      <WorkoutsContent />
    </Suspense>
  )
}

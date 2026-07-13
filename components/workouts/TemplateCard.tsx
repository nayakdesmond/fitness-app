'use client'

import { useState } from 'react'
import type { Exercise } from './ActiveSessionView'
import { searchExercises } from '@/lib/exerciseLibrary'

export interface WorkoutTemplate {
  id: string
  name: string
  exercises: Exercise[]
}

interface Props {
  template: WorkoutTemplate
  isEditing: boolean
  onStart: () => void
  onOpenEdit: () => void
  onCloseEdit: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onAddExercise: (name: string) => void
  onRenameExercise: (exerciseId: string, name: string) => void
  onDeleteExercise: (exerciseId: string) => void
}

export default function TemplateCard({
  template,
  isEditing,
  onStart,
  onOpenEdit,
  onCloseEdit,
  onRename,
  onDelete,
  onAddExercise,
  onRenameExercise,
  onDeleteExercise,
}: Props) {
  const [editTemplateName, setEditTemplateName] = useState(template.name)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)
  const [editingExerciseName, setEditingExerciseName] = useState('')

  const submitAddExercise = () => {
    if (!newExerciseName.trim()) return
    onAddExercise(newExerciseName.trim())
    setNewExerciseName('')
  }

  const submitRenameExercise = (exerciseId: string) => {
    if (editingExerciseName.trim()) {
      onRenameExercise(exerciseId, editingExerciseName.trim())
    }
    setEditingExerciseId(null)
    setEditingExerciseName('')
  }

  return (
    <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
      <h3 className="font-bold text-lg text-white mb-1">{template.name}</h3>
      <p className="text-sm text-neutral-400 mb-3">{template.exercises.length} exercises</p>

      {isEditing && (
        <div className="bg-neutral-800 rounded-xl p-3 mb-3 space-y-3">
          {/* Rename template */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">
              Template Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={editTemplateName}
                onChange={(e) => setEditTemplateName(e.target.value)}
                className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm font-semibold focus:border-white focus:outline-none"
              />
              <button
                onClick={() => editTemplateName.trim() && onRename(editTemplateName.trim())}
                className="bg-white hover:bg-neutral-200 text-black font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                Save
              </button>
            </div>
          </div>

          {/* Edit exercises */}
          {template.exercises.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
                Exercises — tap ✏️ to rename
              </label>
              <div className="space-y-1.5">
                {template.exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center gap-2">
                    {editingExerciseId === ex.id ? (
                      <>
                        <input
                          type="text"
                          value={editingExerciseName}
                          onChange={(e) => setEditingExerciseName(e.target.value)}
                          autoFocus
                          className="flex-1 bg-neutral-700 border border-white rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
                        />
                        <button
                          onClick={() => submitRenameExercise(ex.id)}
                          className="text-green-400 hover:text-green-300 font-bold px-2 py-1"
                          aria-label="Save name"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => { setEditingExerciseId(null); setEditingExerciseName('') }}
                          className="text-neutral-400 hover:text-white px-2 py-1"
                          aria-label="Cancel"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-neutral-200 bg-neutral-700/50 rounded-lg px-3 py-1.5">
                          {ex.name}
                        </span>
                        <button
                          onClick={() => { setEditingExerciseId(ex.id); setEditingExerciseName(ex.name) }}
                          className="text-neutral-300 hover:text-white px-2 py-1"
                          aria-label="Rename exercise"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onDeleteExercise(ex.id)}
                          className="text-red-400 hover:text-red-300 px-2 py-1"
                          aria-label="Delete exercise"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add exercise — library autocomplete with free-text fallback */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">
              Add Exercise
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="Search library or type your own"
                className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-white placeholder-neutral-500 text-sm focus:border-white focus:outline-none"
              />
              <button
                onClick={submitAddExercise}
                className="bg-white hover:bg-neutral-200 text-black font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                Add
              </button>
            </div>
            {newExerciseName.trim() && (
              <div className="mt-1.5 space-y-1">
                {searchExercises(newExerciseName, template.exercises.map(ex => ex.name)).map(sug => (
                  <button
                    key={sug.name}
                    onClick={() => {
                      onAddExercise(sug.name)
                      setNewExerciseName('')
                    }}
                    className="w-full flex items-center justify-between bg-neutral-700/60 hover:bg-neutral-600 rounded-lg px-3 py-2 text-left transition"
                  >
                    <span className="text-sm text-white">{sug.name}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 bg-neutral-800 rounded-full px-2 py-0.5 ml-2 shrink-0">
                      {sug.muscle}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onCloseEdit}
              className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold py-2 rounded-lg text-sm transition"
            >
              Done
            </button>
            <button
              onClick={onDelete}
              className="bg-red-900/60 hover:bg-red-900 text-red-300 font-semibold px-4 py-2 rounded-lg text-sm transition border border-red-800/50"
            >
              Delete Template
            </button>
          </div>
        </div>
      )}

      {!isEditing && template.exercises.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {template.exercises.map((ex) => (
            <div key={ex.id} className="text-sm text-neutral-300 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-neutral-500" />
              {ex.name}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onStart}
          className="flex-1 bg-white hover:bg-neutral-200 text-black font-bold py-2.5 rounded-lg text-sm transition"
        >
          Start
        </button>
        {!isEditing && (
          <button
            onClick={() => { setEditTemplateName(template.name); onOpenEdit() }}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-2.5 rounded-lg text-sm transition border border-neutral-700"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

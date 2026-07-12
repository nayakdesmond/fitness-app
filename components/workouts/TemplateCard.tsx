'use client'

import { useState } from 'react'
import type { Exercise } from './ActiveSessionView'

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
    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
      <h3 className="font-bold text-lg text-white mb-1">{template.name}</h3>
      <p className="text-sm text-slate-400 mb-3">{template.exercises.length} exercises</p>

      {isEditing && (
        <div className="bg-slate-800 rounded-xl p-3 mb-3 space-y-3">
          {/* Rename template */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Template Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={editTemplateName}
                onChange={(e) => setEditTemplateName(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-semibold focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={() => editTemplateName.trim() && onRename(editTemplateName.trim())}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                Save
              </button>
            </div>
          </div>

          {/* Edit exercises */}
          {template.exercises.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
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
                          className="flex-1 bg-slate-700 border border-blue-500 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
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
                          className="text-slate-400 hover:text-white px-2 py-1"
                          aria-label="Cancel"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-slate-200 bg-slate-700/50 rounded-lg px-3 py-1.5">
                          {ex.name}
                        </span>
                        <button
                          onClick={() => { setEditingExerciseId(ex.id); setEditingExerciseName(ex.name) }}
                          className="text-slate-300 hover:text-white px-2 py-1"
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

          {/* Add exercise */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Add Exercise
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="Exercise name"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={submitAddExercise}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onCloseEdit}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg text-sm transition"
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
            <div key={ex.id} className="text-sm text-slate-300 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-slate-500" />
              {ex.name}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onStart}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition"
        >
          Start
        </button>
        {!isEditing && (
          <button
            onClick={() => { setEditTemplateName(template.name); onOpenEdit() }}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg text-sm transition border border-slate-700"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

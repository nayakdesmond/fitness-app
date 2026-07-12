// Curated exercise catalog for the add-exercise picker.
// Static on purpose: searchable offline, no schema or RLS changes needed.
// Users can still type any custom exercise name not listed here.

export interface LibraryExercise {
  name: string
  muscle: string
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // Chest
  { name: 'Barbell Bench Press', muscle: 'Chest' },
  { name: 'Incline Barbell Bench Press', muscle: 'Chest' },
  { name: 'Dumbbell Bench Press', muscle: 'Chest' },
  { name: 'Incline Dumbbell Press', muscle: 'Chest' },
  { name: 'Dumbbell Fly', muscle: 'Chest' },
  { name: 'Cable Fly', muscle: 'Chest' },
  { name: 'Pec Deck', muscle: 'Chest' },
  { name: 'Chest Dip', muscle: 'Chest' },
  { name: 'Push-Up', muscle: 'Chest' },
  { name: 'Machine Chest Press', muscle: 'Chest' },

  // Back
  { name: 'Deadlift', muscle: 'Back' },
  { name: 'Pull-Up', muscle: 'Back' },
  { name: 'Chin-Up', muscle: 'Back' },
  { name: 'Lat Pulldown', muscle: 'Back' },
  { name: 'Barbell Row', muscle: 'Back' },
  { name: 'Dumbbell Row', muscle: 'Back' },
  { name: 'Seated Cable Row', muscle: 'Back' },
  { name: 'T-Bar Row', muscle: 'Back' },
  { name: 'Straight-Arm Pulldown', muscle: 'Back' },
  { name: 'Rack Pull', muscle: 'Back' },
  { name: 'Back Extension', muscle: 'Back' },

  // Shoulders
  { name: 'Overhead Press', muscle: 'Shoulders' },
  { name: 'Seated Dumbbell Shoulder Press', muscle: 'Shoulders' },
  { name: 'Arnold Press', muscle: 'Shoulders' },
  { name: 'Lateral Raise', muscle: 'Shoulders' },
  { name: 'Cable Lateral Raise', muscle: 'Shoulders' },
  { name: 'Front Raise', muscle: 'Shoulders' },
  { name: 'Rear Delt Fly', muscle: 'Shoulders' },
  { name: 'Face Pull', muscle: 'Shoulders' },
  { name: 'Upright Row', muscle: 'Shoulders' },
  { name: 'Machine Shoulder Press', muscle: 'Shoulders' },
  { name: 'Shrug', muscle: 'Shoulders' },

  // Biceps
  { name: 'Barbell Curl', muscle: 'Biceps' },
  { name: 'EZ-Bar Curl', muscle: 'Biceps' },
  { name: 'Dumbbell Curl', muscle: 'Biceps' },
  { name: 'Hammer Curl', muscle: 'Biceps' },
  { name: 'Incline Dumbbell Curl', muscle: 'Biceps' },
  { name: 'Preacher Curl', muscle: 'Biceps' },
  { name: 'Cable Curl', muscle: 'Biceps' },
  { name: 'Concentration Curl', muscle: 'Biceps' },

  // Triceps
  { name: 'Close-Grip Bench Press', muscle: 'Triceps' },
  { name: 'Tricep Pushdown', muscle: 'Triceps' },
  { name: 'Overhead Tricep Extension', muscle: 'Triceps' },
  { name: 'Skull Crusher', muscle: 'Triceps' },
  { name: 'Tricep Dip', muscle: 'Triceps' },
  { name: 'Cable Kickback', muscle: 'Triceps' },
  { name: 'Diamond Push-Up', muscle: 'Triceps' },

  // Quads
  { name: 'Barbell Back Squat', muscle: 'Quads' },
  { name: 'Front Squat', muscle: 'Quads' },
  { name: 'Goblet Squat', muscle: 'Quads' },
  { name: 'Hack Squat', muscle: 'Quads' },
  { name: 'Leg Press', muscle: 'Quads' },
  { name: 'Leg Extension', muscle: 'Quads' },
  { name: 'Bulgarian Split Squat', muscle: 'Quads' },
  { name: 'Walking Lunge', muscle: 'Quads' },
  { name: 'Step-Up', muscle: 'Quads' },

  // Hamstrings & Glutes
  { name: 'Romanian Deadlift', muscle: 'Hamstrings' },
  { name: 'Stiff-Leg Deadlift', muscle: 'Hamstrings' },
  { name: 'Sumo Deadlift', muscle: 'Hamstrings' },
  { name: 'Lying Leg Curl', muscle: 'Hamstrings' },
  { name: 'Seated Leg Curl', muscle: 'Hamstrings' },
  { name: 'Good Morning', muscle: 'Hamstrings' },
  { name: 'Hip Thrust', muscle: 'Glutes' },
  { name: 'Glute Bridge', muscle: 'Glutes' },
  { name: 'Cable Pull-Through', muscle: 'Glutes' },

  // Calves
  { name: 'Standing Calf Raise', muscle: 'Calves' },
  { name: 'Seated Calf Raise', muscle: 'Calves' },

  // Core
  { name: 'Plank', muscle: 'Core' },
  { name: 'Side Plank', muscle: 'Core' },
  { name: 'Crunch', muscle: 'Core' },
  { name: 'Cable Crunch', muscle: 'Core' },
  { name: 'Hanging Leg Raise', muscle: 'Core' },
  { name: 'Russian Twist', muscle: 'Core' },
  { name: 'Ab Wheel Rollout', muscle: 'Core' },
  { name: 'Mountain Climber', muscle: 'Core' },

  // Full body / conditioning
  { name: 'Clean and Press', muscle: 'Full Body' },
  { name: 'Kettlebell Swing', muscle: 'Full Body' },
  { name: "Farmer's Carry", muscle: 'Full Body' },
  { name: 'Thruster', muscle: 'Full Body' },
  { name: 'Burpee', muscle: 'Full Body' },
]

export function searchExercises(query: string, exclude: string[] = [], limit = 6): LibraryExercise[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const excluded = new Set(exclude.map(n => n.toLowerCase()))
  return EXERCISE_LIBRARY.filter(
    ex =>
      !excluded.has(ex.name.toLowerCase()) &&
      (ex.name.toLowerCase().includes(q) || ex.muscle.toLowerCase().includes(q))
  ).slice(0, limit)
}

export const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = typeof mealTypes[number];
export type Meal = { id: string; user_id: string; meal_type: MealType; notes: string; eaten_at: string; meal_date: string; photo_path: string };
export type Sleep = { id: string; user_id: string; sleep_date: string; slept_at: string; woke_at: string; duration_minutes: number };
export const mealEmoji: Record<MealType,string> = {breakfast:'🍳',lunch:'🥗',dinner:'🍜',snack:'🍓'};

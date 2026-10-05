import type {Meal,Sleep} from './types';
export function weeklyRows(days:string[],meals:Meal[],sleep:Sleep[]) {
  return days.map(day=>{
    const counts={breakfast:0,lunch:0,dinner:0,snack:0};
    for(const meal of meals)if(meal.meal_date===day)counts[meal.meal_type]++;
    const night=sleep.find(s=>s.sleep_date===day);
    return {day,...counts,total:Object.values(counts).reduce((a,b)=>a+b,0),sleepHours:night?Number(night.duration_minutes)/60:null};
  });
}

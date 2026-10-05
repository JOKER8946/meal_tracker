'use client';
import {useEffect,useState} from 'react';
import {DayPicker} from 'react-day-picker';
import 'react-day-picker/style.css';
import {dateKey,fromKey} from '@/lib/dates';
import {readRange} from '@/lib/read-rows';
import type {Meal,Sleep} from '@/lib/types';
export function Calendar({userId,day,onSelect,version}:{userId:string;day:string;onSelect:(day:string)=>void;version:number}) {
  const [month,setMonth]=useState(()=>fromKey(day));const [mealDays,setMealDays]=useState<Date[]>([]);const [sleepDays,setSleepDays]=useState<Date[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(false);
  useEffect(()=>setMonth(fromKey(day)),[day]);
  const monthKey=`${month.getFullYear()}-${month.getMonth()}`;
  useEffect(()=>{
    let active=true;setError('');setLoading(true);setMealDays([]);setSleepDays([]);
    const from=dateKey(new Date(month.getFullYear(),month.getMonth(),1));const to=dateKey(new Date(month.getFullYear(),month.getMonth()+1,0));
    Promise.all([readRange<Meal>('meals',userId,from,to),readRange<Sleep>('sleep_logs',userId,from,to)]).then(([meals,sleep])=>{if(active){setMealDays(meals.map(m=>fromKey(m.meal_date)));setSleepDays(sleep.map(s=>fromKey(s.sleep_date)));}}).catch(()=>{if(active)setError('Could not load calendar markers. Select a day to load its entries.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
    // monthKey deliberately ignores the day to avoid reloading the same month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[monthKey,userId,version]);
  return <aside className="calendar-panel" aria-label="Journal calendar"><span className="eyebrow">A LITTLE LOOK BACK</span><h3>Your days, collected.</h3><DayPicker mode="single" required selected={fromKey(day)} month={month} onMonthChange={setMonth} onSelect={date=>{if(date)onSelect(dateKey(date));}} captionLayout="dropdown" startMonth={new Date(2000,0)} endMonth={new Date(2100,11)} weekStartsOn={1} labels={{labelDayButton:date=>`View ${dateKey(date)}`}} modifiers={{hasMeal:mealDays,hasSleep:sleepDays}} modifiersClassNames={{hasMeal:'has-meal',hasSleep:'has-sleep'}}/>
    <div className="calendar-legend"><span><i className="meal-dot"/>Meals</span><span><i className="sleep-dot"/>Sleep</span></div>{loading&&<p className="fine" role="status">Loading your days…</p>}{error&&<p className="error" role="alert">{error}</p>}
  </aside>;
}

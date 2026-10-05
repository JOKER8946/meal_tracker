export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function fromKey(day: string) { return new Date(`${day}T12:00:00`); }
export function shiftDay(day: string, amount: number) { const d=fromKey(day);d.setDate(d.getDate()+amount);return dateKey(d); }
export function localInput(iso: string) {const d=new Date(iso);return `${dateKey(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
export function inputIso(input: string) {
  const d=new Date(input);
  if (!Number.isFinite(d.getTime()) || localInput(d.toISOString()) !== input) throw new Error('Choose a valid local date and time. This time may fall in a daylight-saving clock change.');
  return d.toISOString();
}
export function durationLabel(minutes: number) { const m=Math.round(minutes);return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`; }
export function sleepDuration(start: string,end: string) {
  const minutes=(new Date(inputIso(end)).getTime()-new Date(inputIso(start)).getTime())/60000;
  if(minutes<=0 || minutes>1440)throw new Error('Wake-up must be after bedtime, within 24 hours. Check both dates.');
  return minutes;
}

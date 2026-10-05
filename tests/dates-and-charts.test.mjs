import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sleepDuration,shiftDay,durationLabel} from '../src/lib/dates.ts';
import {weeklyRows} from '../src/lib/weekly.ts';
test('local calendar arithmetic crosses month/year and leap-day boundaries',()=>{
  assert.equal(shiftDay('2026-12-31',1),'2027-01-01');assert.equal(shiftDay('2028-03-01',-1),'2028-02-29');
  assert.equal(sleepDuration('2026-10-04T23:30','2026-10-05T07:15'),465);assert.equal(durationLabel(465),'7h 45m');
  assert.throws(()=>sleepDuration('2026-10-05T23:00','2026-10-05T07:00'));assert.throws(()=>sleepDuration('2026-10-04T23:00','2026-10-06T07:00'));
});
test('weekly series preserves missing sleep and counts each meal type per day',()=>{
  const days=Array.from({length:7},(_,i)=>`2026-10-${String(5+i).padStart(2,'0')}`);
  const rows=weeklyRows(days,[{meal_date:days[0],meal_type:'breakfast'},{meal_date:days[0],meal_type:'lunch'},{meal_date:days[0],meal_type:'lunch'},{meal_date:days[1],meal_type:'snack'},{meal_date:'2026-09-30',meal_type:'dinner'}],[{sleep_date:days[0],duration_minutes:465}]);
  assert.equal(rows.length,7);assert.equal(rows[0].breakfast,1);assert.equal(rows[0].lunch,2);assert.equal(rows[0].total,3);assert.equal(rows[0].sleepHours,7.75);assert.equal(rows[1].snack,1);assert.equal(rows[1].sleepHours,null);assert.equal(rows[6].total,0);
});

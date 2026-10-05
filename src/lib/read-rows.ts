import {supabase} from './supabase';
export async function readRange<T>(table:'meals'|'sleep_logs',userId:string,from:string,to:string):Promise<T[]> {
  const column=table==='meals'?'meal_date':'sleep_date';const rows:T[]=[];
  for(let offset=0;;offset+=1000){
    const {data,error}=await supabase().from(table).select('*').eq('user_id',userId).gte(column,from).lte(column,to).order(column).order('id').range(offset,offset+999);
    if(error)throw error;rows.push(...data as T[]);if(data.length<1000)return rows;
  }
}

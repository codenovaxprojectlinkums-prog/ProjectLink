'use client';
import type {Slot} from '@/lib/types';
const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export default function SlotEditor({value,onChange}:{value:Slot[],onChange:(v:Slot[])=>void}){
 function update(i:number,patch:Partial<Slot>){onChange(value.map((s,j)=>j===i?{...s,...patch}:s));}
 return <div className="stack">{value.map((slot,i)=><div className="slot" key={i}>
 <select aria-label="Day" value={slot.weekday} onChange={e=>update(i,{weekday:Number(e.target.value)})}>
 {days.map((name,j)=><option key={name} value={j+1}>{name}</option>)}</select>
 <input aria-label="Start time" type="time" value={slot.start_time.slice(0,5)} onChange={e=>update(i,{start_time:e.target.value})}/>
 <input aria-label="End time" type="time" value={slot.end_time.slice(0,5)} onChange={e=>update(i,{end_time:e.target.value})}/>
 <button type="button" className="secondary" onClick={()=>onChange(value.filter((_,j)=>i!==j))}>Remove</button>
 </div>)}
 <button type="button" className="secondary" onClick={()=>onChange([...value,{weekday:6,start_time:'09:00',end_time:'12:00'}])}>+ Add time slot</button>
 </div>;
}

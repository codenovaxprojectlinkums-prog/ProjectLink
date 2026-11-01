'use client';
export default function TagPicker({items,selected,onChange}:{
 items:{id:string;name:string}[],selected:string[],onChange:(ids:string[])=>void
}){
 return <div className="chips" role="group" aria-label="Select tags">{items.map(item=><button
  type="button" key={item.id} className={'chip '+(selected.includes(item.id)?'on':'')}
  aria-pressed={selected.includes(item.id)}
  onClick={()=>onChange(selected.includes(item.id)?selected.filter(x=>x!==item.id):[...selected,item.id])}
 >{item.name}</button>)}</div>;
}

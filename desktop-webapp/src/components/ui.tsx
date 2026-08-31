import { X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppStore';

export function Button({variant='primary',className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'ghost'|'danger'}){return <button className={`button button--${variant} ${className}`} {...props}/>;}
export function IconButton({label,children,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{label:string;children:ReactNode}){return <button aria-label={label} title={label} className="icon-button" {...props}>{children}</button>;}
export function Toggle({checked,onChange,label}:{checked:boolean;onChange:(v:boolean)=>void;label:string}){return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked?'is-on':''}`} onClick={()=>onChange(!checked)}><span/></button>;}
export function Avatar({name,src,size='md'}:{name:string;src?:string|null;size?:'sm'|'md'|'lg'}){const initials=name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();return <span className={`avatar avatar--${size}`}>{src?<img src={src} alt=""/>:initials}</span>;}
export function Empty({icon:Icon,title,description,action}:{icon:LucideIcon;title:string;description:string;action?:ReactNode}){return <div className="empty-state"><span className="empty-icon"><Icon/></span><h3>{title}</h3><p>{description}</p>{action}</div>;}
export function Modal({open,title,onClose,children,size='md'}:{open:boolean;title?:string;onClose:()=>void;children:ReactNode;size?:'sm'|'md'|'lg'}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',esc);ref.current?.focus();return()=>{document.removeEventListener('keydown',esc);previous?.focus();};},[open,onClose]);
  if(!open)return null;return <div className="modal-backdrop" onMouseDown={onClose}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`modal modal--${size}`} onMouseDown={e=>e.stopPropagation()}>{title&&<div className="modal-header"><h2>{title}</h2><IconButton label="Close" onClick={onClose}><X/></IconButton></div>}{children}</div></div>;
}
export function PageHeader({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:ReactNode}){return <header className="page-header"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</header>;}
export function Stat({label,value,trend}:{label:string;value:string;trend?:string}){return <div className="stat"><span>{label}</span><strong>{value}</strong>{trend&&<small className={trend.startsWith('+')?'positive':'negative'}>{trend}</small>}</div>;}
export function Toasts(){const{toasts}=useApp();return <div className="toast-stack" aria-live="polite">{toasts.map(t=><div key={t.id} className={`toast ${t.tone?`toast--${t.tone}`:''}`}>{t.message}</div>)}</div>;}
export function InlineLink({to,children}:{to:string;children:ReactNode}){return <Link className="inline-link" to={to}>{children}</Link>;}

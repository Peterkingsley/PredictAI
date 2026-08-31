import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { defaultPrivacy, defaultWalletSettings, initialNotifications, initialPosts, users } from '../services/data';
import type { Notification, Post, PrivacySettings, User, WalletSettings } from '../types';

type Toast = { id: number; message: string; tone?: 'success' | 'danger' };
type Store = {
  session: string | null; login:(email:string)=>void; logout:()=>void;
  sidebarCollapsed:boolean; setSidebarCollapsed:(value:boolean)=>void;
  posts:Post[]; users:User[]; updatePost:(id:string,patch:Partial<Post>)=>void; createPost:(post:Omit<Post,'id'|'createdAt'|'likes'|'replies'|'reposts'|'liked'|'saved'|'reposted'|'authorId'>)=>string; deletePost:(id:string)=>void; updateUser:(id:string,patch:Partial<User>)=>void;
  wallet:WalletSettings; setWallet:(next:WalletSettings)=>void; privacy:PrivacySettings; setPrivacy:(next:PrivacySettings)=>void;
  notifications:Notification[]; markNotification:(id:string)=>void; markAllNotifications:()=>void;
  profilePhoto:string|null; setProfilePhoto:(value:string|null)=>void;
  toast:(message:string,tone?:Toast['tone'])=>void; toasts:Toast[];
};

const AppContext=createContext<Store|null>(null);
const read=<T,>(key:string,fallback:T):T=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback;}catch{return fallback;}};
const persist=<T,>(key:string,value:T)=>{localStorage.setItem(key,JSON.stringify(value));};

export function AppProvider({children}:{children:ReactNode}){
  const [session,setSession]=useState<string|null>(()=>read('predictai.session',null));
  const [sidebarCollapsed,setCollapsed]=useState(()=>read('predictai.sidebar',false));
  const [posts,setPosts]=useState<Post[]>(()=>read('predictai.posts',initialPosts));
  const [people,setPeople]=useState<User[]>(()=>read('predictai.users',users));
  const [wallet,setWalletState]=useState<WalletSettings>(()=>read('predictai.wallet',defaultWalletSettings));
  const [privacy,setPrivacyState]=useState<PrivacySettings>(()=>read('predictai.privacy',defaultPrivacy));
  const [notifications,setNotifications]=useState<Notification[]>(()=>read('predictai.notifications',initialNotifications));
  const [profilePhoto,setPhoto]=useState<string|null>(()=>localStorage.getItem('predictai.photo'));
  const [toasts,setToasts]=useState<Toast[]>([]);
  const toast=useCallback((message:string,tone?:Toast['tone'])=>{const id=Date.now();setToasts(v=>[...v,{id,message,tone}]);window.setTimeout(()=>setToasts(v=>v.filter(t=>t.id!==id)),2800);},[]);
  const value=useMemo<Store>(()=>({
    session,login:(email)=>{setSession(email);persist('predictai.session',email);},logout:()=>{setSession(null);localStorage.removeItem('predictai.session');},
    sidebarCollapsed,setSidebarCollapsed:(value)=>{setCollapsed(value);persist('predictai.sidebar',value);},
    posts,users:people,updatePost:(id,patch)=>setPosts(current=>{const next=current.map(p=>p.id===id?{...p,...patch}:p);persist('predictai.posts',next);return next;}),
    createPost:(draft)=>{const id=`local-${Date.now()}`;const next:Post={...draft,id,authorId:'current',createdAt:new Date().toISOString(),likes:0,replies:0,reposts:0,liked:false,saved:false,reposted:false};setPosts(current=>{const result=[next,...current];persist('predictai.posts',result);return result;});return id;},
    deletePost:(id)=>setPosts(current=>{const next=current.filter(p=>p.id!==id);persist('predictai.posts',next);return next;}),
    updateUser:(id,patch)=>setPeople(current=>{const next=current.map(u=>u.id===id?{...u,...patch}:u);persist('predictai.users',next);return next;}),
    wallet,setWallet:(next)=>{setWalletState(next);persist('predictai.wallet',next);},privacy,setPrivacy:(next)=>{setPrivacyState(next);persist('predictai.privacy',next);},
    notifications,markNotification:(id)=>setNotifications(current=>{const next=current.map(n=>n.id===id?{...n,read:true}:n);persist('predictai.notifications',next);return next;}),markAllNotifications:()=>setNotifications(current=>{const next=current.map(n=>({...n,read:true}));persist('predictai.notifications',next);return next;}),
    profilePhoto,setProfilePhoto:(value)=>{setPhoto(value);if(value)localStorage.setItem('predictai.photo',value);else localStorage.removeItem('predictai.photo');},toast,toasts
  }),[session,sidebarCollapsed,posts,people,wallet,privacy,notifications,profilePhoto,toast]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(){const value=useContext(AppContext);if(!value)throw new Error('useApp must be used inside AppProvider');return value;}

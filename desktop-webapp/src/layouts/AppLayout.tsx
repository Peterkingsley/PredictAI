import { Bell, Bot, ChevronLeft, ChevronRight, CircleHelp, LayoutDashboard, LogOut, Menu, Search, Settings, UserRound, UsersRound, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, IconButton, Toasts } from '../components/ui';
import { markets } from '../services/data';
import { useApp } from '../store/AppStore';

const phonePattern=/Android|iPhone|iPod|Windows Phone|Mobile/i;
function isPhoneBrowser(){return phonePattern.test(navigator.userAgent)&&Math.min(screen.width,screen.height)<768;}

export function MobileGuard({children}:{children:React.ReactNode}){
  if(!isPhoneBrowser())return children;
  const target=import.meta.env.VITE_PUBLIC_DOWNLOAD_URL;
  if(target){window.location.replace(target);return null;}
  return <main className="device-guard"><div className="brand-mark">P</div><h1>PredictAI is built for desktop</h1><p>Use the PredictAI mobile app on this device, or open this address from a desktop browser.</p><a className="button button--primary" href="/">Go to PredictAI</a></main>;
}

export function RequireAuth(){const{session}=useApp();const location=useLocation();if(!session)return <Navigate replace to={`/login?next=${encodeURIComponent(location.pathname+location.search)}`}/>;return <Outlet/>;}

export function AppLayout(){
  const {sidebarCollapsed,setSidebarCollapsed,notifications,profilePhoto,users,logout}=useApp();
  const navigate=useNavigate();const location=useLocation();const [query,setQuery]=useState('');const [popover,setPopover]=useState(false);
  const unread=notifications.filter(n=>!n.read).length;const current=users.find(u=>u.isCurrent)!;
  const title=useMemo(()=>location.pathname.includes('/posts')?'Posts':location.pathname.includes('/assets')?'Assets':location.pathname.includes('/account')?'Account':'Predict',[location.pathname]);
  const search=(e:React.FormEvent)=>{e.preventDefault();if(!query.trim())return;navigate(location.pathname.includes('/posts')?`/app/posts/search?q=${encodeURIComponent(query)}`:`/app/search?q=${encodeURIComponent(query)}`);};
  const links=[{to:'/app/predict',label:'Predict',icon:LayoutDashboard},{to:'/app/posts',label:'Posts',icon:UsersRound},{to:'/app/assets',label:'Assets',icon:WalletCards}];
  return <MobileGuard><div className={`app-shell ${sidebarCollapsed?'is-collapsed':''}`}>
    <aside className="sidebar">
      <div className="sidebar-brand"><span className="brand-mark">P</span>{!sidebarCollapsed&&<strong>PredictAI</strong>}</div>
      <nav aria-label="Primary">{links.map(({to,label,icon:Icon})=><NavLink key={to} to={to} className={({isActive})=>`nav-item ${isActive?'active':''}`}><Icon/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><NavLink to="/app/account" className="nav-item"><Settings/><span>Settings</span></NavLink><button className="nav-item" onClick={()=>{logout();navigate('/login');}}><LogOut/><span>Sign out</span></button><button className="collapse-button" onClick={()=>setSidebarCollapsed(!sidebarCollapsed)}>{sidebarCollapsed?<ChevronRight/>:<><ChevronLeft/><span>Collapse</span></>}</button></div>
    </aside>
    <div className="app-column">
      <header className="topbar"><div className="topbar-title"><IconButton label="Toggle navigation" onClick={()=>setSidebarCollapsed(!sidebarCollapsed)}><Menu/></IconButton><strong>{title}</strong></div><form className="global-search" onSubmit={search}><Search/><input aria-label="Search events and posts" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search events and posts"/><kbd>⌘ K</kbd></form><div className="topbar-actions"><div className="popover-wrap"><IconButton label={`Notifications${unread?` (${unread} unread)`:''}`} onClick={()=>setPopover(!popover)}><Bell/>{unread>0&&<span className="notification-dot">{unread}</span>}</IconButton>{popover&&<NotificationPopover close={()=>setPopover(false)}/>}</div><button className="profile-button" onClick={()=>navigate('/app/account')}><Avatar name={current.displayName} src={profilePhoto} size="sm"/><span>{current.displayName}</span></button></div></header>
      <div className="workspace"><main className="main-canvas"><Outlet/></main><aside className="context-rail"><RailContent/></aside></div>
    </div><Toasts/></div></MobileGuard>;
}

function NotificationPopover({close}:{close:()=>void}){const{notifications,markNotification}=useApp();const navigate=useNavigate();return <div className="notification-popover"><div className="popover-title"><strong>Notifications</strong><button onClick={()=>{navigate('/app/notifications');close();}}>View all</button></div>{notifications.slice(0,3).map(n=><button key={n.id} className={n.read?'':'unread'} onClick={()=>markNotification(n.id)}><span>{n.title}</span><small>{n.time}</small></button>)}</div>}

function RailContent(){const location=useLocation();const navigate=useNavigate();if(location.pathname.includes('/posts'))return <><div className="rail-card"><h3>Trending markets</h3>{markets.slice(5).map(m=><button key={m.id} onClick={()=>navigate(`/app/market/${m.id}`)}><span>{m.title}</span><small>{m.volume}</small></button>)}</div><div className="rail-card compact"><Bot/><div><strong>Share informed ideas</strong><p>Attach a market or AI analysis to make every post useful.</p></div></div></>;if(location.pathname.includes('/assets'))return <><div className="rail-card"><h3>Quick actions</h3><button onClick={()=>navigate('/app/assets/deposit')}>Deposit funds</button><button onClick={()=>navigate('/app/assets/withdraw')}>Withdraw</button><button onClick={()=>navigate('/app/assets/history')}>Transaction history</button></div><div className="rail-note"><CircleHelp/><p>Only send supported assets over the selected network.</p></div></>;return <><div className="rail-card"><h3>Market pulse</h3><div className="pulse"><span>Crypto</span><strong className="positive">+4.8%</strong></div><div className="pulse"><span>Politics</span><strong>Steady</strong></div><div className="pulse"><span>Sports</span><strong>12 live</strong></div></div><div className="rail-card"><h3>Popular now</h3>{markets.slice(0,3).map(m=><button key={m.id} onClick={()=>navigate(`/app/market/${m.id}`)}>{m.title}</button>)}</div></>}

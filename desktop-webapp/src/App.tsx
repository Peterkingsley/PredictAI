import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout, RequireAuth } from './layouts/AppLayout';
import { ForgotPasswordPage, LoginPage, PasswordPage, SignupPage } from './pages/AuthPages';
import { AccountPage, NotificationsPage } from './pages/AccountPages';
import { AssetsHome, DepositPage, FundsHistoryPage, ScannerPage, WalletSettingsPage, WithdrawPage } from './pages/AssetsPages';
import { EventSearchPage, IntelligencePage, MarketDetailPage, PredictHome } from './pages/PredictPages';
import { ComposerPage, EditPublicProfilePage, FollowersPage, LeaderboardPage, MarketPostsPage, PostDetailPage, PostsFeedPage, PublicPortfolioPage, SavedPostsPage, ShareBuilderPage, SocialPrivacyPage, SocialSearchPage, TraderProfilePage } from './pages/PostsPages';
import { Empty } from './components/ui';
import { SearchX } from 'lucide-react';

export function App(){return <Routes>
  <Route path="/" element={<Navigate to="/app/predict" replace/>}/>
  <Route path="/login" element={<LoginPage/>}/><Route path="/signup" element={<SignupPage/>}/><Route path="/password" element={<PasswordPage/>}/><Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
  <Route element={<RequireAuth/>}><Route path="/app" element={<AppLayout/>}>
    <Route index element={<Navigate to="predict" replace/>}/><Route path="predict" element={<PredictHome/>}/><Route path="search" element={<EventSearchPage/>}/><Route path="market/:id" element={<MarketDetailPage/>}/><Route path="market/:id/intelligence" element={<IntelligencePage/>}/>
    <Route path="posts" element={<PostsFeedPage/>}/><Route path="posts/new" element={<ComposerPage/>}/><Route path="posts/search" element={<SocialSearchPage/>}/><Route path="posts/leaderboard" element={<LeaderboardPage/>}/><Route path="posts/saved" element={<SavedPostsPage/>}/><Route path="posts/:id" element={<PostDetailPage/>}/><Route path="posts/market/:id" element={<MarketPostsPage/>}/><Route path="posts/profile/edit" element={<EditPublicProfilePage/>}/><Route path="posts/privacy" element={<SocialPrivacyPage/>}/><Route path="posts/profile/:id" element={<TraderProfilePage/>}/><Route path="posts/profile/:id/followers" element={<FollowersPage mode="followers"/>}/><Route path="posts/profile/:id/following" element={<FollowersPage mode="following"/>}/><Route path="posts/profile/:id/portfolio" element={<PublicPortfolioPage/>}/><Route path="posts/portfolio/new" element={<ShareBuilderPage kind="portfolio"/>}/><Route path="posts/position/new" element={<ShareBuilderPage kind="position"/>}/>
    <Route path="assets" element={<AssetsHome/>}/><Route path="assets/deposit" element={<DepositPage/>}/><Route path="assets/withdraw" element={<WithdrawPage/>}/><Route path="assets/scan" element={<ScannerPage/>}/><Route path="assets/history" element={<FundsHistoryPage/>}/><Route path="assets/settings" element={<WalletSettingsPage/>}/>
    <Route path="notifications" element={<NotificationsPage/>}/><Route path="account" element={<AccountPage/>}/><Route path="*" element={<div className="page"><Empty icon={SearchX} title="Page not found" description="The desktop route you requested does not exist."/></div>}/>
  </Route></Route>
  <Route path="*" element={<Navigate to="/app/predict" replace/>}/>
  </Routes>}

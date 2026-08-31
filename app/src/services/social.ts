import { markets } from './marketData';
import { defaultSocialPrivacy, publicPositions, samplePortfolio, socialPosts, socialReplies, socialUsers } from './socialData';
import type { ComposerDraft, LeaderboardType, SocialFeedType, SocialPost, SocialPrivacySettings, SocialReply, SocialSearchResults, SocialUser } from '../types/social';

const wait = (milliseconds = 180) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let privacy: SocialPrivacySettings = { ...defaultSocialPrivacy };
const mutedUserIds = new Set<string>();
const blockedUserIds = new Set<string>();
const isVisiblePost = (post: SocialPost) => !mutedUserIds.has(post.author.id) && !blockedUserIds.has(post.author.id);

export async function getFeed(type: SocialFeedType): Promise<SocialPost[]> {
  await wait();
  if (type === 'following') return socialPosts.filter((post) => isVisiblePost(post) && (post.author.isFollowing || post.author.isCurrentUser));
  if (type === 'trending') return socialPosts.filter(isVisiblePost).sort((a, b) => b.likes + b.replies * 2 + b.reposts * 3 - (a.likes + a.replies * 2 + a.reposts * 3));
  return socialPosts.filter(isVisiblePost);
}

export async function getPost(id: string) { await wait(90); return socialPosts.find((post) => post.id === id) ?? null; }
export async function getReplies(postId: string) { await wait(100); return socialReplies.filter((reply) => reply.postId === postId); }
export async function getUser(id: string) { await wait(90); return socialUsers.find((item) => item.id === id) ?? null; }
export async function getUserPosts(id: string) { await wait(100); return socialPosts.filter((post) => post.author.id === id && isVisiblePost(post)); }
export async function getMarketPosts(marketId: string) { await wait(100); return socialPosts.filter((post) => post.marketId === marketId && isVisiblePost(post)); }
export async function getSavedPosts() { await wait(100); return socialPosts.filter((post) => post.saved && isVisiblePost(post)); }

export async function followUser(id: string) { const target = socialUsers.find((item) => item.id === id); if (target && !target.isFollowing) { target.isFollowing = true; target.followers += 1; } return target ?? null; }
export async function unfollowUser(id: string) { const target = socialUsers.find((item) => item.id === id); if (target?.isFollowing) { target.isFollowing = false; target.followers = Math.max(0, target.followers - 1); } return target ?? null; }
export async function muteUser(id: string) { mutedUserIds.add(id); await wait(70); }
export async function blockUser(id: string) { blockedUserIds.add(id); mutedUserIds.delete(id); await wait(70); }

export async function likePost(id: string, liked: boolean) { const post = socialPosts.find((item) => item.id === id); if (post && post.liked !== liked) { post.liked = liked; post.likes = Math.max(0, post.likes + (liked ? 1 : -1)); } return post ?? null; }
export async function savePost(id: string, saved: boolean) { const post = socialPosts.find((item) => item.id === id); if (post) post.saved = saved; return post ?? null; }
export async function repostPost(id: string) { const post = socialPosts.find((item) => item.id === id); if (post && !post.reposted) { post.reposted = true; post.reposts += 1; } return post ?? null; }
export async function deletePost(id: string) { const index = socialPosts.findIndex((item) => item.id === id && item.author.isCurrentUser); if (index >= 0) socialPosts.splice(index, 1); }
export async function editPost(id: string, content: string) { const post = socialPosts.find((item) => item.id === id && item.author.isCurrentUser); if (post) post.content = content.trim(); await wait(100); return post ?? null; }

export async function createPost(draft: ComposerDraft) {
  const currentUser = socialUsers.find((item) => item.isCurrentUser)!;
  const type: SocialPost['type'] = draft.aiAnalysis ? 'ai_analysis' : draft.portfolio ? 'portfolio' : draft.position ? 'position' : draft.marketId ? 'market' : 'insight';
  const post: SocialPost = { id: `local-${Date.now()}`, author: currentUser, type, content: draft.content.trim(), createdAt: new Date().toISOString(), marketId: draft.marketId, position: draft.position, portfolio: draft.portfolio, aiAnalysis: draft.aiAnalysis, quotePostId: draft.quotePostId, likes: 0, replies: 0, reposts: 0, liked: false, saved: false, reposted: false };
  socialPosts.unshift(post);
  await wait(120);
  return post;
}

export async function addReply(postId: string, content: string): Promise<SocialReply> {
  const mention = content.trim().match(/^@([A-Za-z0-9_]+)\s*/);
  const reply: SocialReply = { id: `reply-${Date.now()}`, postId, author: socialUsers.find((item) => item.isCurrentUser)!, content: mention ? content.trim().slice(mention[0].length) : content.trim(), createdAt: new Date().toISOString(), likes: 0, liked: false, replyingTo: mention?.[1] };
  socialReplies.push(reply);
  const post = socialPosts.find((item) => item.id === postId);
  if (post) post.replies += 1;
  await wait(100);
  return reply;
}

export async function likeReply(id: string, liked: boolean) {
  const reply = socialReplies.find((item) => item.id === id);
  if (reply && reply.liked !== liked) {
    reply.liked = liked;
    reply.likes = Math.max(0, reply.likes + (liked ? 1 : -1));
  }
  await wait(70);
  return reply ?? null;
}

export async function getLeaderboard(type: LeaderboardType): Promise<SocialUser[]> {
  await wait();
  const metric = (user: SocialUser) => type === 'accuracy' ? user.predictionAccuracy ?? -1 : type === 'performance' ? user.performance30d ?? -999 : type === 'consistency' ? user.consistency ?? -1 : user.contrarianScore ?? -1;
  return socialUsers.filter((user) => !user.isCurrentUser || privacy.allowLeaderboards).sort((a, b) => metric(b) - metric(a));
}

export async function searchSocial(query: string): Promise<SocialSearchResults> {
  await wait(120);
  const value = query.trim().toLowerCase();
  if (!value) return { users: [], posts: [], marketIds: [] };
  return {
    users: socialUsers.filter((user) => (!user.isCurrentUser || privacy.allowSearch) && [user.displayName, user.username, user.bio, ...user.specialization].join(' ').toLowerCase().includes(value)),
    posts: socialPosts.filter((post) => isVisiblePost(post) && post.content.toLowerCase().includes(value)),
    marketIds: markets.filter((market) => [market.title, market.category, market.subcategory].join(' ').toLowerCase().includes(value)).map((market) => market.id),
  };
}

export function getCurrentUser() { return socialUsers.find((item) => item.isCurrentUser)!; }
export function getSocialUser(id: string) { return socialUsers.find((item) => item.id === id); }
export function getSocialPost(id: string) { return socialPosts.find((item) => item.id === id); }
export function getPrivacySettings() { return { ...privacy }; }
export function updatePrivacySettings(next: SocialPrivacySettings) { privacy = { ...next }; }
export function updateCurrentUser(values: Pick<SocialUser, 'displayName' | 'username' | 'bio' | 'specialization'>) { Object.assign(getCurrentUser(), values); return getCurrentUser(); }
export function getSuggestedUsers() { return socialUsers.filter((user) => !user.isCurrentUser).slice(0, 5); }
export function getShareablePositions() { return [publicPositions.btc, publicPositions.ethLoss, publicPositions.sol].map((position) => ({ ...position })); }
export function getPortfolioTemplate() { return { ...samplePortfolio, positions: samplePortfolio.positions.map((position) => ({ ...position })) }; }

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { followUser, likePost, repostPost, savePost, unfollowUser } from '../../services/social';
import { colors } from '../../theme/colors';
import type { SocialPost } from '../../types/social';
import { formatPercent, formatSocialTime } from '../../utils/socialFormatters';
import { AIAnalysisShareCard } from './AIAnalysisShareCard';
import { PostOptionsSheet } from './PostOptionsSheet';
import { PublicPortfolioCard } from './PublicPortfolioCard';
import { PublicPositionCard } from './PublicPositionCard';
import { QuotedPostCard } from './QuotedPostCard';
import { SocialActionRow } from './SocialActionRow';
import { SocialAvatar } from './SocialAvatar';
import { SocialMarketCard } from './SocialMarketCard';

export function SocialPostCard({ expanded, onChanged, onComment, onOpenAnalysis, onOpenMarket, onOpenPortfolio, onOpenPost, onOpenProfile, onQuote, post, showFollow = false }: { expanded?: boolean; onChanged: () => void; onComment: () => void; onOpenAnalysis: (marketId: string) => void; onOpenMarket: (marketId: string) => void; onOpenPortfolio: (userId: string) => void; onOpenPost: (id: string) => void; onOpenProfile: (id: string) => void; onQuote: (id: string) => void; post: SocialPost; showFollow?: boolean }) {
  const [local, setLocal] = useState(post);
  const [showMore, setShowMore] = useState(!!expanded);
  const [optionsOpen, setOptionsOpen] = useState(false);
  useEffect(() => setLocal({ ...post }), [post]);
  const changed = (updated?: SocialPost | null) => { if (updated) setLocal({ ...updated }); onChanged(); };
  const toggleFollow = async () => { local.author.isFollowing ? await unfollowUser(local.author.id) : await followUser(local.author.id); setLocal({ ...local, author: { ...local.author } }); onChanged(); };
  return <View style={styles.card}><View style={styles.header}><Pressable onPress={() => onOpenProfile(local.author.id)}><SocialAvatar initials={local.author.initials} /></Pressable><Pressable onPress={() => onOpenProfile(local.author.id)} style={styles.author}><Text style={styles.name}>{local.author.displayName}</Text><Text style={styles.meta}>@{local.author.username} · {formatSocialTime(local.createdAt)}</Text></Pressable>{showFollow && !local.author.isFollowing && !local.author.isCurrentUser ? <Pressable onPress={() => void toggleFollow()} style={styles.follow}><Text style={styles.followText}>Follow</Text></Pressable> : null}<Pressable accessibilityLabel="Post options" hitSlop={8} onPress={() => setOptionsOpen(true)}><Ionicons color={colors.textMuted} name="ellipsis-horizontal" size={19} /></Pressable></View>{local.content ? <Pressable onPress={() => onOpenPost(local.id)}><Text numberOfLines={showMore ? undefined : 5} style={styles.content}>{local.content}</Text>{!showMore && local.content.length > 220 ? <Pressable onPress={() => setShowMore(true)}><Text style={styles.showMore}>Show more</Text></Pressable> : null}</Pressable> : null}{local.marketId && local.type === 'market' ? <SocialMarketCard marketId={local.marketId} onOpen={() => onOpenMarket(local.marketId!)} /> : null}{local.position ? <PublicPositionCard position={local.position} /> : null}{local.portfolio ? <PublicPortfolioCard onOpen={() => onOpenPortfolio(local.author.id)} portfolio={local.portfolio} /> : null}{local.aiAnalysis ? <AIAnalysisShareCard analysis={local.aiAnalysis} marketId={local.marketId} onOpen={local.marketId ? () => onOpenAnalysis(local.marketId!) : undefined} /> : null}{local.quotePostId ? <QuotedPostCard onOpen={() => onOpenPost(local.quotePostId!)} postId={local.quotePostId} /> : null}{local.performanceSincePosted !== undefined ? <Text style={[styles.since, { color: local.performanceSincePosted >= 0 ? colors.accent : colors.danger }]}>Since posted {formatPercent(local.performanceSincePosted)}</Text> : null}<SocialActionRow onComment={onComment} onLike={() => void likePost(local.id, !local.liked).then(changed)} onQuote={() => onQuote(local.id)} onRepost={() => void repostPost(local.id).then(changed)} onSave={() => void savePost(local.id, !local.saved).then(changed)} post={local} /><PostOptionsSheet onChanged={onChanged} onClose={() => setOptionsOpen(false)} post={local} visible={optionsOpen} /></View>;
}
const styles = StyleSheet.create({ card: { paddingHorizontal: 15, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', gap: 10 }, author: { flex: 1 }, name: { color: colors.text, fontSize: 12, fontWeight: '700' }, meta: { color: colors.textMuted, fontSize: 9, marginTop: 2 }, follow: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, backgroundColor: colors.button }, followText: { color: colors.buttonText, fontSize: 8, fontWeight: '700' }, content: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 11 }, showMore: { color: colors.textMuted, fontSize: 10, marginTop: 3 }, since: { fontSize: 9, fontWeight: '600', marginTop: 10 }, });

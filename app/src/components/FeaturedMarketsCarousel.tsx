import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors } from '../theme/colors';

const announcements = [
  {
    eyebrow: 'PREDICTAI UPDATE',
    title: 'Smarter predictions are here',
    description: 'Explore live markets and follow probability changes in real time.',
    icon: 'sparkles' as const,
    background: '#162B24',
    accent: '#9BE116',
  },
  {
    eyebrow: 'NEW MARKETS',
    title: 'More sports markets every day',
    description: 'Discover match outcomes, game lines, totals, and spreads.',
    icon: 'football-outline' as const,
    background: '#282313',
    accent: '#FFC528',
  },
  {
    eyebrow: 'MARKET INSIGHT',
    title: 'Track what the crowd expects',
    description: 'Watch implied probabilities move as new information arrives.',
    icon: 'analytics-outline' as const,
    background: '#172336',
    accent: '#56A8FF',
  },
];

const HERO_HEIGHT = 140;

export function AnnouncementCarousel() {
  const { width } = useWindowDimensions();
  const pageWidth = width;
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPage((current) => {
        const next = (current + 1) % announcements.length;
        scrollRef.current?.scrollTo({ x: next * pageWidth, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [pageWidth]);

  const updatePage = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(event.nativeEvent.contentOffset.x / pageWidth));

  return <View style={styles.root}>
    <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} snapToInterval={pageWidth} decelerationRate="fast" onMomentumScrollEnd={updatePage}>
      {announcements.map((announcement) => <View key={announcement.title} style={[styles.slide, { width: pageWidth }]}>
        <View style={[styles.banner, { backgroundColor: announcement.background }]}>
          <View style={styles.copy}>
            <Text allowFontScaling={false} style={[styles.eyebrow, { color: announcement.accent }]}>{announcement.eyebrow}</Text>
            <Text allowFontScaling={false} style={styles.title}>{announcement.title}</Text>
            <Text allowFontScaling={false} numberOfLines={2} style={styles.description}>{announcement.description}</Text>
          </View>
          <View style={[styles.iconCircle, { borderColor: announcement.accent }]}>
            <Ionicons color={announcement.accent} name={announcement.icon} size={31} />
          </View>
        </View>
      </View>)}
    </ScrollView>
    <View style={styles.dots}>{announcements.map((announcement, index) => <View key={announcement.title} style={[styles.dot, index === page && styles.dotActive]} />)}</View>
  </View>;
}

const styles = StyleSheet.create({ root: { height: HERO_HEIGHT, backgroundColor: '#151719' }, slide: { height: HERO_HEIGHT }, banner: { flex: 1, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 28, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }, copy: { flex: 1, paddingRight: 12 }, eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1 }, title: { color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: '700', marginTop: 5 }, description: { color: '#B2B4B9', fontSize: 11, lineHeight: 16, marginTop: 5 }, iconCircle: { width: 62, height: 62, borderRadius: 31, borderWidth: 1, backgroundColor: 'rgba(0,0,0,.18)', alignItems: 'center', justifyContent: 'center' }, dots: { position: 'absolute', right: 0, bottom: 5, left: 0, height: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }, dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#72757B' }, dotActive: { width: 12, backgroundColor: colors.text } });

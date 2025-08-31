import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { theme } from '../theme';
import { videos } from '../data/videos';
import Thumbnail from '../components/Thumbnail';
import { loadComments } from '../storage';
import { timeAgo } from '../utils/time';

export default function HomeScreen({ navigation }) {
  const data = useMemo(() => videos, []);

  const [commentCounts, setCommentCounts] = useState({});
  const [lastActivity, setLastActivity] = useState({});

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const counts = {};
      const latest = {};
      for (const v of data) {
        try {
          const list = await loadComments(v.id);
          const arr = Array.isArray(list) ? list : [];
          counts[v.id] = arr.length;

          let ts = 0;
          for (const c of arr) {
            ts = Math.max(ts, c.createdAt || 0);
            if (Array.isArray(c.replies)) {
              for (const r of c.replies) ts = Math.max(ts, r.createdAt || 0);
            }
          }
          latest[v.id] = ts || 0;
        } catch (e) {
          counts[v.id] = 0;
          latest[v.id] = 0;
        }
      }
      if (isMounted) {
        setCommentCounts(counts);
        setLastActivity(latest);
      }
    })();
    return () => { isMounted = false; };
  }, [data]);

  const openVideo = (item) => {
    navigation.navigate('Player', {
      videoId: item.id,
      videoTitle: item.title,
      source: item.local ? item.source : { uri: item.source },
    });
  };

  const renderItem = ({ item }) => {
    const count = commentCounts[item.id] ?? 0;
    const updatedAgo = lastActivity[item.id]
      ? timeAgo(lastActivity[item.id])
      : item.updated || '';

    return (
      <Pressable style={styles.card} onPress={() => openVideo(item)}>
        <Thumbnail uri={item.thumbnail} duration={item.duration} />

        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={styles.title}>{item.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.meta}>
              <View style={styles.dot} />
              <Text style={styles.metaText}>{item.size}</Text>
            </View>

            <View style={styles.meta}>
              <Icon name="comment-outline" size={14} color={theme.c.subtext} />
              <Text style={styles.metaText}>
                {count} {count === 1 ? 'comment' : 'comments'}
              </Text>
            </View>

            <View style={styles.meta}>
              <Icon name="calendar-clock" size={14} color={theme.c.subtext} />
              <Text style={styles.metaText}>{updatedAgo || "--"}</Text>
            </View>
          </View>

          <View style={styles.ctaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.tag}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.primaryBtn} onPress={() => openVideo(item)}>
              <Text style={styles.primaryBtnText}>Open</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <Header title="Projects" />
      <FlatList
        data={data}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.c.bg },
  listContent: { padding: 14, paddingBottom: 24 },

  card: {
    backgroundColor: theme.c.card,
    borderColor: theme.c.border,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardBody: { padding: 12, gap: 8 },
  title: { color: theme.c.text, fontWeight: '700', fontSize: 14 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: theme.c.subtext, fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.c.purple },

  ctaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  badge: {
    backgroundColor: theme.c.cardAlt,
    borderColor: theme.c.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { color: theme.c.subtext, fontSize: 12 },

  primaryBtn: {
    backgroundColor: theme.c.purple,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});

// src/screens/PlayerScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import DrawingCanvas from '../components/DrawingCanvas';
import { loadComments, saveComments, loadDrawings, saveDrawings } from '../storage';
import { toTime } from '../utils/time';

/**
 * Comment shape:
 * {
 *   id: string,
 *   time: number,
 *   text: string,
 *   createdAt: number,
 *   replies: Array<{ id: string, text: string, createdAt: number }>
 * }
 */

export default function PlayerScreen({ route }) {
  const { source, videoId } = route.params;

  // video
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyOpenFor, setReplyOpenFor] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [highlightId, setHighlightId] = useState(null); // highlight like the mock

  // drawing
  const [drawActive, setDrawActive] = useState(false);
  const [color, setColor] = useState('#111111');
  const drawRef = useRef(null);
  const [paths, setPaths] = useState([]);

  useEffect(() => {
    (async () => {
      const c = await loadComments(videoId);
      setComments(Array.isArray(c) ? c : []);
      const d = await loadDrawings(videoId);
      setPaths(Array.isArray(d) ? d : []);
    })();
  }, [videoId]);

  const onAddComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    const next = [
      ...comments,
      {
        id: String(Date.now()),
        time: Math.floor(progress),
        text,
        createdAt: Date.now(),
        replies: [],
      },
    ].sort((a, b) => a.time - b.time || a.createdAt - b.createdAt);
    setCommentText('');
    setComments(next);
    await saveComments(videoId, next);
  };

  const onSeekTo = (sec, id) => {
    videoRef.current?.seek?.(sec);
    setProgress(sec);
    setHighlightId(id);
    // remove highlight after a moment (like tapped state)
    setTimeout(() => setHighlightId(null), 1500);
  };

  const addReply = async (parentId) => {
    const text = replyText.trim();
    if (!text) return;
    const next = comments.map((c) =>
      c.id === parentId
        ? { ...c, replies: [...c.replies, { id: `r_${Date.now()}`, text, createdAt: Date.now() }] }
        : c
    );
    setComments(next);
    setReplyOpenFor(null);
    setReplyText('');
    await saveComments(videoId, next);
  };

  const onToggleDraw = () => setDrawActive((v) => !v);

  const onSaveDrawings = async () => {
    const current = drawRef.current?.getPaths?.() ?? paths;
    setPaths(current);
    await saveDrawings(videoId, current);
  };

  const onClearDrawings = async () => {
    drawRef.current?.clear?.();
    setPaths([]);
    await saveDrawings(videoId, []);
  };

  const keyExtractor = useMemo(() => (item) => item.id, []);

  const renderComment = ({ item }) => {
    const isHighlighted = highlightId === item.id;
    return (
      <View style={[styles.commentRow, isHighlighted && styles.commentRowActive]}>
        {/* avatar dot */}
        <View style={styles.avatarDot} />
        <View style={{ flex: 1 }}>
          {/* first line: name/time + menu */}
          <View style={styles.cHeader}>
            <Text style={styles.cName}>Noah Green</Text>
            <Text style={styles.cSubTime}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>

            <View style={{ flex: 1 }} />
            <Pressable style={styles.menuBtn} hitSlop={8}>
              <Text style={styles.menuText}>⋯</Text>
            </Pressable>
          </View>

          {/* timestamp & text */}
          <View style={styles.cBody}>
            <Pressable onPress={() => onSeekTo(item.time, item.id)} hitSlop={6}>
              <Text style={styles.cTimestamp}>{toTime(item.time)}</Text>
            </Pressable>
            <Text style={styles.cText}>{item.text}</Text>
          </View>

          {/* reply action */}
          <View style={styles.replyRow}>
            <Pressable onPress={() => setReplyOpenFor((v) => (v === item.id ? null : item.id))}>
              <Text style={styles.replyBtn}>Reply</Text>
            </Pressable>
          </View>

          {/* replies */}
          {item.replies?.length > 0 && (
            <View style={styles.repliesWrap}>
              {item.replies.map((r) => (
                <View key={r.id} style={styles.replyBubbleRow}>
                  <View style={[styles.avatarDot, { width: 18, height: 18 }]} />
                  <View style={styles.replyBubble}>
                    <Text style={styles.replyBubbleText}>{r.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* inline reply input */}
          {replyOpenFor === item.id && (
            <View style={styles.replyInputRow}>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Write your reply"
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable style={styles.smallGoldBtn} onPress={() => addReply(item.id)}>
                <Text style={styles.smallGoldBtnText}>Send</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.container}>
        {/* ===== Video ===== */}
        <View style={styles.playerWrap}>
          <Video
            source={source}
            ref={videoRef}
            paused={paused}
            resizeMode="contain"
            style={styles.video}
            onProgress={(p) => setProgress(p.currentTime || 0)}
            onLoad={(m) => setDuration(m.duration || 0)}
          />
          <DrawingCanvas
            ref={drawRef}
            active={drawActive}
            color={color}
            width={3}
            initial={paths}
            onChange={setPaths}
          />

          {/* slim control bar like mock */}
          <View style={styles.controlBar}>
            <Pressable onPress={() => setPaused((v) => !v)} style={styles.ctrlBtn} hitSlop={8}>
              <Text style={styles.ctrlIcon}>{paused ? '▶' : '⏸'}</Text>
            </Pressable>
            <View style={{ width: 8 }} />
            <Text style={styles.ctrlTime}>{toTime(progress)}</Text>
            <Text style={styles.ctrlTime}> / {toTime(duration)}</Text>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.ctrlBtn} hitSlop={8}>
              <Text style={styles.ctrlIcon}>⛶</Text>
            </Pressable>
          </View>
        </View>

        {/* ===== Comments header ===== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Comments</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{comments.length}</Text>
          </View>
        </View>

        {/* ===== Composer tools row: timestamp pill + pencil + color squares + save/clear when drawing ===== */}
        <View style={styles.toolsRow}>
          <View style={styles.tsPill}>
            <Text style={styles.tsText}>{toTime(progress)}</Text>
            <Text style={styles.tsCaret}>▾</Text>
          </View>

          <Pressable
            onPress={onToggleDraw}
            style={[styles.pencilBtn, drawActive && styles.pencilBtnActive]}
            accessibilityLabel="Toggle drawing"
          >
            <Text style={styles.pencilIcon}>✏️</Text>
          </Pressable>

          <View style={styles.colorsRow}>
            {['#111111', '#0EA5E9', '#22C55E', '#F59E0B', '#EF4444'].map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorSquare,
                  { backgroundColor: c, borderColor: color === c ? '#000' : '#dcdcdc', borderWidth: color === c ? 2 : 1 },
                ]}
              />
            ))}
          </View>

          {drawActive && (
            <>
              <Pressable style={styles.toolGhostBtn} onPress={onSaveDrawings}>
                <Text style={styles.toolGhostBtnText}>Save</Text>
              </Pressable>
              <Pressable style={styles.toolGhostBtn} onPress={onClearDrawings}>
                <Text style={styles.toolGhostBtnText}>Clear</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* ===== Input row (separate) with gold Comment button right ===== */}
        <View style={styles.inputRow}>
          <View style={styles.inputIconDot} />
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Write your comment here"
            style={[styles.input, { flex: 1 }]}
          />
          <Pressable style={styles.goldBtn} onPress={onAddComment}>
            <Text style={styles.goldBtnText}>Comment</Text>
          </Pressable>
        </View>

        {/* ===== List ===== */}
        <FlatList
          data={comments}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={renderComment}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  /* Video */
  playerWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  video: { position: 'absolute', width: '100%', height: '100%' },

  controlBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  ctrlBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  ctrlIcon: { color: '#fff', fontSize: 16 },
  ctrlTime: { color: '#fff', fontVariant: ['tabular-nums'], fontSize: 12 },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  countPill: {
    marginLeft: 8,
    backgroundColor: '#eef3ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: { color: '#2162ff', fontWeight: '700', fontSize: 12 },

  /* Tools row (timestamp + pencil + colors + save/clear) */
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 8,
  },
  tsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  tsText: { fontVariant: ['tabular-nums'], color: '#111', fontSize: 12 },
  tsCaret: { marginLeft: 6, color: '#777', fontSize: 12 },

  pencilBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  pencilBtnActive: { borderColor: '#2162ff', shadowColor: '#2162ff', shadowOpacity: 0.15, shadowRadius: 3 },
  pencilIcon: { fontSize: 16 },

  colorsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorSquare: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },

  toolGhostBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    backgroundColor: '#fff',
  },
  toolGhostBtnText: { color: '#222', fontWeight: '600', fontSize: 12 },

  /* Input row */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
  inputIconDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e9eef6',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 10, android: 8 }),
    backgroundColor: '#fff',
  },
  goldBtn: {
    backgroundColor: '#8B6E2A', // gold-like button from the mock
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  goldBtnText: { color: '#fff', fontWeight: '700' },

  /* Comment rows */
  commentRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#efefef',
    backgroundColor: '#fff',
  },
  commentRowActive: {
    backgroundColor: '#F4FBEF', // light green highlight like mock
    borderColor: '#E0F1D6',
  },
  avatarDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e9eef6', marginRight: 10, marginTop: 2 },

  cHeader: { flexDirection: 'row', alignItems: 'center' },
  cName: { fontWeight: '700', color: '#222' },
  cSubTime: { marginLeft: 6, color: '#6b7280', fontSize: 12 },
  menuBtn: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 4 },
  menuText: { color: '#6b7280', fontSize: 18 },

  cBody: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  cTimestamp: { color: '#1EA14C', fontWeight: '700', fontVariant: ['tabular-nums'], fontSize: 12 }, // green timestamp as in mock
  cText: { color: '#222', flexShrink: 1 },

  replyRow: { marginTop: 8 },
  replyBtn: { color: '#2162ff', fontWeight: '600', fontSize: 12 },

  repliesWrap: { marginTop: 8, gap: 6 },
  replyBubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyBubble: { backgroundColor: '#f7f8fa', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, maxWidth: '92%' },
  replyBubbleText: { color: '#333' },

  replyInputRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallGoldBtn: { backgroundColor: '#8B6E2A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  smallGoldBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});

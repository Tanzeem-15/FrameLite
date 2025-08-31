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
  useWindowDimensions,
  Image,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import Header from '../components/Header';
import DrawingCanvas from '../components/DrawingCanvas';
import FullscreenVideoModal from '../components/FullscreenVideoModal';
import { loadComments, saveComments } from '../storage';
import { toTime } from '../utils/time';
import { theme } from '../theme';

export default function PlayerScreen({ route }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const { videoTitle, source, videoId } = route.params;

  const videoRef = useRef(null);
  const fsVideoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastUiUpdateRef = useRef(0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsInitialSeek, setFsInitialSeek] = useState(0);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyOpenFor, setReplyOpenFor] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [highlightId, setHighlightId] = useState(null);

  const drawRef = useRef(null);
  const [drawActive, setDrawActive] = useState(false);
  const [penColor, setPenColor] = useState('#FFFFFF');
  const [pendingDrawing, setPendingDrawing] = useState(null);

  const [visibleDrawingCommentId, setVisibleDrawingCommentId] = useState(null);
  const [displayPaths, setDisplayPaths] = useState([]);

  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const c = await loadComments(videoId);
      setComments(Array.isArray(c) ? c : []);
    })();
  }, [videoId]);

  const handlePlayPause = () => {
    if (ended) {
      videoRef.current?.seek?.(0);
      fsVideoRef.current?.seek?.(0);
      setEnded(false);
      setPaused(false);
    } else {
      setPaused((p) => !p);
    }
  };

  const enterFullscreen = () => {
    setFsInitialSeek(progress);
    setIsFullscreen(true);
  };
  const exitFullscreen = () => setIsFullscreen(false);

  const onToggleDraw = () => {
    setDrawActive((v) => {
      const next = !v;
      if (next) {
        setPaused(true);
        setVisibleDrawingCommentId(null);
        setDisplayPaths([]);
      } else {
        drawRef.current?.clear?.();
      }
      return next;
    });
  };

  const onSaveDrawing = () => {
    const strokes = drawRef.current?.getPaths?.() || [];
    if (!strokes.length) return;
    setPendingDrawing(strokes);
    drawRef.current?.clear?.();
    inputRef.current?.focus?.();
  };

  const onClearAuthoring = () => {
    drawRef.current?.clear?.();
    setPendingDrawing(null);
  };

  const onAddComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    const newComment = {
      id: String(Date.now()),
      time: Math.floor(progress),
      text,
      createdAt: Date.now(),
      replies: [],
      ...(pendingDrawing ? { drawing: pendingDrawing } : null),
    };
    const next = [...comments, newComment].sort((a, b) => a.time - b.time || a.createdAt - b.createdAt);
    setComments(next);
    setCommentText('');
    setPendingDrawing(null);

    if (drawActive) {
      setDrawActive(false);
      drawRef.current?.clear?.();
      setPaused(false);
    }

    await saveComments(videoId, next);
    inputRef.current?.blur?.();
  };

  const onSeekTo = (sec, id) => {
    videoRef.current?.seek?.(sec);
    fsVideoRef.current?.seek?.(sec);
    setProgress(sec);
    if (id) {
      setHighlightId(id);
      setTimeout(() => setHighlightId(null), 1500);
    }
  };

  const onToggleCommentDrawing = (comment) => {
    if (!comment?.drawing || !comment.drawing.length) return;
    if (visibleDrawingCommentId === comment.id) {
      setVisibleDrawingCommentId(null);
      setDisplayPaths([]);
      return;
    }
    setVisibleDrawingCommentId(comment.id);
    setDisplayPaths(comment.drawing);
    setDrawActive(false);
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

  const keyExtractor = useMemo(() => (item) => item.id, []);

  const renderComment = ({ item }) => {
    const isHighlighted = highlightId === item.id;
    const hasDrawing = Array.isArray(item.drawing) && item.drawing.length > 0;
    const isShowingThisDrawing = visibleDrawingCommentId === item.id;

    return (
      <Pressable
        onPress={() => onToggleCommentDrawing(item)}
        style={[styles.commentRow, isHighlighted && styles.commentRowActive]}
      >
        <Image
          source={require('../../assets/images/avatar.png')}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <View style={styles.cHeader}>
            <Text style={styles.cName}>Noah Green</Text>
            <Text style={styles.cSubTime}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <View style={{ flex: 1 }} />
            {hasDrawing && (
              <Icon
                name="gesture"
                size={18}
                color={isShowingThisDrawing ? theme.c.lime : theme.c.muted}
                style={{ marginRight: 6 }}
              />
            )}
            <Pressable style={styles.menuBtn} hitSlop={8}>
              <Icon name="dots-horizontal" size={20} color={theme.c.muted} />
            </Pressable>
          </View>

          <View style={styles.cBody}>
            <Pressable onPress={() => onSeekTo(item.time, item.id)} hitSlop={6}>
              <View style={styles.timeChip}>
                <Text style={styles.timeChipText}>{toTime(item.time)}</Text>
              </View>
            </Pressable>
            <Text style={styles.cText}>{item.text}</Text>
          </View>

          <View style={styles.replyRow}>
            <Pressable onPress={() => setReplyOpenFor((v) => (v === item.id ? null : item.id))}>
              <Text style={styles.replyBtn}>Reply</Text>
            </Pressable>
          </View>

          {item.replies?.length > 0 && (
            <View style={styles.repliesWrap}>
              {item.replies.map((r) => (
                <View key={r.id} style={styles.replyBubbleRow}>
                  <Image
                    source={require('../../assets/images/avatar2.png')}
                    style={[styles.avatar, { width: 20, height: 20 }]}
                  />

                  <View style={{ flex: 1 }}>
                    <View style={styles.replyHeader}>
                      <Text style={styles.replyName}>Amina Grace</Text>
                      <Text style={styles.replyTime}>
                        {new Date(r.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    {/* <View style={styles.replyBubble}> */}
                      <Text style={styles.replyBubbleText}>{r.text}</Text>
                    {/* </View> */}
                  </View>
                </View>
              ))}
            </View>
          )}

          {replyOpenFor === item.id && (
            <View style={styles.replyInputRow}>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Write your reply"
                placeholderTextColor={theme.c.muted}
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable style={styles.smallPrimaryBtn} onPress={() => addReply(item.id)}>
                <Text style={styles.smallPrimaryBtnText}>Send</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const VideoBlock = (
    <View style={[styles.playerWrap, isLandscape && styles.playerLandscape]}>
      <Video
        source={source}
        ref={videoRef}
        paused={paused}
        resizeMode="contain"
        style={[styles.video, isLandscape && styles.videoLandscape]}
        onProgress={(p) => {
          const t = p.currentTime || 0;
          const now = Date.now();
          if (now - lastUiUpdateRef.current > 150) {
            lastUiUpdateRef.current = now;
            setProgress(t);
          }
          if (duration && t >= duration - 0.1) setEnded(true);
        }}
        onLoad={(m) => {
          setDuration(m?.duration || 0);
          setEnded(false);
        }}
        onSeek={() => setEnded(false)}
        onEnd={() => { setEnded(true); setPaused(true); }}
      />

      <DrawingCanvas
        ref={drawRef}
        active={drawActive}
        color={penColor}
        width={3}
        initial={drawActive ? [] : displayPaths}
      />

      <View style={styles.controlBar}>
        <Pressable onPress={handlePlayPause} style={styles.ctrlBtn} hitSlop={8}>
          <Icon name={ended ? 'replay' : (paused ? 'play' : 'pause')} size={18} color="#fff" />
        </Pressable>

        <View style={{ width: 10 }} />
        <View style={styles.pill}>
          <Text style={styles.pillText}>{toTime(progress)}</Text>
        </View>

        <View style={{ flex: 1 }} />
        <Pressable style={styles.ctrlBtn} hitSlop={8} onPress={enterFullscreen}>
          <Icon name="fullscreen" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.c.bg }}
      behavior={Platform.select({
        ios: isLandscape ? undefined : 'padding',
        android: undefined,
      })}
    >
      <View style={styles.container}>
        <Header title={videoTitle} />

        <View key={isLandscape ? 'land' : 'port'} style={[styles.body, isLandscape && styles.bodyLandscape]}>
          <View style={[styles.leftPane, isLandscape && styles.leftPaneLand]}>
            {VideoBlock}
          </View>

          <View style={[styles.rightPane, isLandscape && styles.rightPaneLand]}>
            <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
              <View style={styles.toolsRow}>
                <View style={styles.tsPillDark}>
                  <Text style={styles.tsPillDarkText}>{toTime(progress)}</Text>
                </View>

                <Pressable
                  onPress={onToggleDraw}
                  style={[styles.pencilBtn, drawActive && styles.pencilBtnActive]}
                  accessibilityLabel="Toggle drawing"
                >
                  <Icon name="pencil" size={18} color={drawActive ? theme.c.purple : theme.c.text} />
                </Pressable>

                <View style={styles.colorsRow}>
                  {['#FFFFFF', '#6C5CE7', '#22C55E', '#F4D13D', '#EF4444'].map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setPenColor(c)}
                      style={[
                        styles.colorSquare,
                        { backgroundColor: c, borderColor: penColor === c ? '#fff' : theme.c.border, borderWidth: 1.5 },
                      ]}
                    />
                  ))}
                </View>

                {drawActive && (
                  <>
                    <Pressable style={styles.toolGhostBtn} onPress={onSaveDrawing}>
                      <Text style={styles.toolGhostBtnText}>Save</Text>
                    </Pressable>
                    <Pressable style={styles.toolGhostBtn} onPress={onClearAuthoring}>
                      <Text style={styles.toolGhostBtnText}>Clear</Text>
                    </Pressable>
                  </>
                )}
              </View>

              <View style={[styles.inputRow, { paddingTop: 4 }]}>
                {pendingDrawing ? (
                  <View style={styles.sketchBadge}>
                    <Icon name="gesture" size={16} color={theme.c.lime} />
                  </View>
                ) : null}

                <TextInput
                  ref={inputRef}
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder={pendingDrawing ? 'Describe your drawing…' : 'Leave your comment…'}
                  placeholderTextColor={theme.c.muted}
                  style={[styles.input, { flex: 1 }]}
                />
                <Pressable style={styles.primaryBtn} onPress={onAddComment}>
                  <Text style={styles.primaryBtnText}>Comment</Text>
                </Pressable>
              </View>
            </View>

            <FlatList
              data={comments}
              keyExtractor={keyExtractor}
              contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={renderComment}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </View>

      <FullscreenVideoModal
        ref={fsVideoRef}
        visible={isFullscreen}
        source={source}
        paused={paused}
        progress={progress}
        duration={duration}
        initialSeek={fsInitialSeek}
        ended={ended}
        onUpdateProgress={(t) => {
          const now = Date.now();
          if (now - lastUiUpdateRef.current > 150) {
            lastUiUpdateRef.current = now;
            setProgress(t);
          }
          if (duration && t >= duration - 0.1) setEnded(true);
        }}
        onLoaded={(dur) => {
          setDuration(dur || 0);
          setEnded(false);
        }}
        onSeek={() => setEnded(false)}
        onEnd={() => { setEnded(true); setPaused(true); }}
        onRequestClose={exitFullscreen}
        onPlayPause={handlePlayPause}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.c.bg },

  body: { flex: 1 },
  bodyLandscape: { flexDirection: 'row' },

  leftPane: {},
  leftPaneLand: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: theme.c.border,
  },

  rightPane: { flex: 1 },
  rightPaneLand: { flex: 1 },

  playerWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  playerLandscape: { width: '100%', height: '100%', aspectRatio: undefined },
  video: { position: 'absolute', width: '100%', height: '100%' },
  videoLandscape: {},

  controlBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: theme.c.overlay,
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  ctrlBtn: { paddingHorizontal: 6, paddingVertical: 4 },

  pill: {
    backgroundColor: theme.c.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pillText: { color: theme.c.text, fontVariant: ['tabular-nums'], fontSize: 12 },

  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  tsPillDark: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.c.card,
    borderColor: theme.c.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tsPillDarkText: { color: theme.c.text, fontVariant: ['tabular-nums'], fontSize: 12 },

  pencilBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.c.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.c.card,
  },
  pencilBtnActive: { borderColor: theme.c.purple },

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
    borderColor: theme.c.border,
    backgroundColor: theme.c.card,
  },
  toolGhostBtnText: { color: theme.c.text, fontWeight: '600', fontSize: 12 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 10, android: 8 }),
    backgroundColor: theme.c.cardAlt,
    color: theme.c.text,
    minWidth: '40%',
  },
  primaryBtn: {
    backgroundColor: theme.c.purple,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },

  sketchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.c.card,
    borderColor: theme.c.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sketchBadgeText: { color: theme.c.text, fontWeight: '600', fontSize: 12 },

  commentRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.c.border,
    backgroundColor: theme.c.card,
  },
  commentRowActive: { backgroundColor: '#16231A', borderColor: '#244229' },
  avatarDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.c.cardAlt,
    marginRight: 10,
    marginTop: 2,
  },

  cHeader: { flexDirection: 'row', alignItems: 'center' },
  cName: { fontWeight: '700', color: theme.c.text },
  cSubTime: { marginLeft: 6, color: theme.c.subtext, fontSize: 12 },
  menuBtn: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 4 },

  cBody: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  timeChip: {
    backgroundColor: theme.c.chipYellowBg,
    borderColor: theme.c.chipYellowText,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeChipText: { color: theme.c.chipYellowText, fontVariant: ['tabular-nums'], fontSize: 12 },
  cText: { color: theme.c.text, flexShrink: 1 },

  replyRow: { marginTop: 8 },
  replyBtn: { color: theme.c.purple, fontWeight: '600', fontSize: 12 },

  repliesWrap: { marginTop: 8, gap: 6 },
  replyBubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyBubble: {
    backgroundColor: theme.c.cardAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    maxWidth: '92%',
    borderWidth: 1,
    borderColor: theme.c.border,
  },
  replyBubbleText: { color: theme.c.subtext },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyName: {
    fontWeight: '600',
    color: theme.c.text,
    marginRight: 6,
    fontSize: 13,
  },
  replyTime: {
    fontSize: 11,
    color: theme.c.subtext,
  },

  replyInputRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallPrimaryBtn: {
    backgroundColor: theme.c.purple,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallPrimaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
});

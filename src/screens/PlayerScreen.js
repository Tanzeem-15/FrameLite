import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import Video from 'react-native-video';
import { toTime } from '../utils/time';
import { loadComments, saveComments, loadDrawings, saveDrawings } from '../storage';
import DrawingCanvas from '../components/DrawingCanvas';

export default function PlayerScreen({ route }) {
  const { source, videoId } = route.params;
  const videoRef = useRef(null);

  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds

  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);

  const [drawActive, setDrawActive] = useState(false);
  const [color, setColor] = useState('#ff4757');
  const drawRef = useRef(null);
  const [paths, setPaths] = useState([]);

  useEffect(() => {
    (async () => {
      const c = await loadComments(videoId);
      setComments(c);
      const d = await loadDrawings(videoId);
      setPaths(d);
    })();
  }, [videoId]);

  const addComment = async () => {
    if (!comment.trim()) return;
    const next = [
      ...comments,
      { id: Date.now().toString(), time: Math.floor(progress), text: comment.trim() }
    ].sort((a,b)=>a.time-b.time);
    setComment('');
    setComments(next);
    await saveComments(videoId, next);
  };

  const onSaveDrawings = async () => {
    const current = drawRef.current?.getPaths?.() || paths;
    setPaths(current);
    await saveDrawings(videoId, current);
  };

  const onClearDrawings = async () => {
    drawRef.current?.clear?.();
    setPaths([]);
    await saveDrawings(videoId, []);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <View style={styles.container}>

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

          {/* Drawing overlay */}
          <DrawingCanvas
            ref={drawRef}
            active={drawActive}
            color={color}
            width={3}
            initial={paths}
            onChange={setPaths}
          />
        </View>

        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={() => setPaused(p => !p)}>
            <Text style={styles.btnText}>{paused ? 'Play' : 'Pause'}</Text>
          </Pressable>

          <Text style={styles.time}>
            {toTime(progress)} / {toTime(duration)}
          </Text>
        </View>

        {/* Drawing controls (simple color chooser) */}
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View style={styles.colors}>
            {['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#2f3542'].map(c => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c, borderWidth: color === c ? 3 : 1 }
                ]}
              />
            ))}
          </View>

          <View style={styles.row}>
            <Pressable style={[styles.btn, drawActive && styles.btnActive]} onPress={() => setDrawActive(a => !a)}>
              <Text style={styles.btnText}>{drawActive ? 'Stop Drawing' : 'Draw'}</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={onSaveDrawings}>
              <Text style={styles.btnText}>Save Drawing</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={onClearDrawings}>
              <Text style={styles.btnText}>Clear</Text>
            </Pressable>
          </View>
        </View>

        {/* Comment input */}
        <View style={[styles.row, { paddingHorizontal: 8 }]}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add comment (linked to current time)"
            style={styles.input}
          />
          <Pressable style={styles.btn} onPress={addComment}>
            <Text style={styles.btnText}>Add</Text>
          </Pressable>
        </View>

        {/* Comment list */}
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 8 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <View style={styles.commentCard}>
              <Text style={styles.commentTime}>{toTime(item.time)}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
          )}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  playerWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  video: { position: 'absolute', width: '100%', height: '100%' },

  row: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8 },
  btn: { backgroundColor: '#1e90ff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  btnActive: { backgroundColor: '#3742fa' },
  btnText: { color: '#fff', fontWeight: '600' },

  time: { marginLeft: 8, fontVariant: ['tabular-nums'] },

  colors: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderColor: '#333' },

  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },

  commentCard: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, backgroundColor: '#fafafa' },
  commentTime: { fontWeight: '700', marginBottom: 4 },
  commentText: { color: '#333' },
});

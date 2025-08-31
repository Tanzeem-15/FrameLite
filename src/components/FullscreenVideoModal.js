import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StatusBar, StyleSheet, Platform } from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme';

const toTime = (secs = 0) => {
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  const m = Math.floor((secs / 60) % 60).toString().padStart(2, '0');
  const h = Math.floor(secs / 3600);
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const FullscreenVideoModal = forwardRef(function FullscreenVideoModal(
  {
    visible,
    source,
    paused,
    progress,
    duration,
    initialSeek = 0,
    onUpdateProgress,
    onLoaded,
    onSeek,
    onEnd,
    onRequestClose,
    onPlayPause,
    ended,
  },
  ref
) {
  const videoRef = useRef(null);
  const [shouldSeekOnLoad, setShouldSeekOnLoad] = useState(false);

  useImperativeHandle(ref, () => ({
    seek: (t) => videoRef.current?.seek?.(t ?? 0),
  }));

  useEffect(() => {
    if (visible) setShouldSeekOnLoad(true);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onRequestClose}
      hardwareAccelerated
      presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Video
          ref={videoRef}
          source={source}
          paused={paused}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
          onProgress={(p) => onUpdateProgress?.(p.currentTime || 0)}
          onLoad={(m) => {
            onLoaded?.(m?.duration || 0);
            if (shouldSeekOnLoad) {
              videoRef.current?.seek?.(Math.max(0, initialSeek));
              setShouldSeekOnLoad(false);
            }
          }}
          onSeek={onSeek}
          onEnd={onEnd}
        />

        <View style={styles.controlBar}>
          <Pressable onPress={onPlayPause} style={styles.ctrlBtn} hitSlop={8}>
            <Icon name={ended ? 'replay' : (paused ? 'play' : 'pause')} size={18} color="#fff" />
          </Pressable>
          <View style={{ width: 8 }} />
          <Text style={styles.ctrlTime}>{toTime(progress)}</Text>
          <Text style={styles.ctrlTime}> / {toTime(duration)}</Text>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.ctrlBtn} hitSlop={8} onPress={onRequestClose}>
            <Icon name="fullscreen-exit" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  controlBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: theme.c.overlay,
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  ctrlBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  ctrlTime: { color: '#fff', fontVariant: ['tabular-nums'], fontSize: 12 },
});

export default FullscreenVideoModal;

import React, { useState, useMemo } from 'react';
import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme';

const FALLBACK_THUMB =
  'https://placehold.co/480x270/0E1222/8A94B0.png?text=No+Thumbnail';

export default function Thumbnail({
  uri,
  duration = '',
  style,
  imageStyle,
}) {
  const [failed, setFailed] = useState(false);

  const sourceUri = useMemo(() => {
    if (!uri || failed) return FALLBACK_THUMB;
    if (typeof uri === 'string' && uri.startsWith('http://')) {
      return uri.replace('http://', 'https://');
    }
    return uri;
  }, [uri, failed]);

  return (
    <ImageBackground
      source={typeof uri === 'string' ? { uri } : uri}
      style={[styles.thumb, style]}
      imageStyle={[styles.image, imageStyle]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    >
      <View style={styles.badge}>
        <Icon name="play" size={18} color="#fff" />
        {duration ? <Text style={styles.duration}>{duration}</Text> : null}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  thumb: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  image: { borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  badge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.c.overlay,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  duration: { color: '#fff', fontVariant: ['tabular-nums'], fontSize: 12 },
  playEmoji: { color: '#fff', fontSize: 14 },
});

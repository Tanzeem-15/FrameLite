import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { theme } from '../theme';

/**
 * Dark header that matches the app theme.
 * - Covers the status bar area (Android + iOS).
 * - Centers the title.
 * - Optional left/right slots via props.
 */
export default function Header({ title = '', Left = null, Right = null }) {
  return (
    <View style={styles.wrap}>
      {/* Make status bar match the header */}
      <StatusBar
        translucent
        backgroundColor={theme.c.bg}
        barStyle="light-content"
      />
      <View style={styles.container}>
        <View style={styles.side}>{Left ? <Left /> : null}</View>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View style={styles.side}>{Right ? <Right /> : null}</View>
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const STATUSBAR_PAD = Platform.select({
  ios: 48,          // safe-area-ish; works for most notches
  android: StatusBar.currentHeight ? StatusBar.currentHeight : 24,
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.c.bg,
  },
  container: {
    paddingTop: STATUSBAR_PAD,
    paddingBottom: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.c.bg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: 44,             // space for optional icon/button
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: theme.c.text,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.c.border,
  },
});

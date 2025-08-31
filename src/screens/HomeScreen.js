import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Frame.io-lite</Text>
      <Button
        title="Open sample video"
        onPress={() =>
          navigation.navigate('Player', {
            videoId: 'sample',
            // NOTE: ensure this file exists
            source: require('../../assets/videos/sample.mp4'),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 16 },
});

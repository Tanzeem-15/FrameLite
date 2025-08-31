import AsyncStorage from '@react-native-async-storage/async-storage';

const keyComments = (videoId) => `comments:${videoId}`;
const keyDrawings = (videoId) => `drawings:${videoId}`;

export async function loadComments(videoId) {
  const raw = await AsyncStorage.getItem(keyComments(videoId));
  return raw ? JSON.parse(raw) : [];
}
export async function saveComments(videoId, comments) {
  await AsyncStorage.setItem(keyComments(videoId), JSON.stringify(comments));
}

export async function loadDrawings(videoId) {
  const raw = await AsyncStorage.getItem(keyDrawings(videoId));
  return raw ? JSON.parse(raw) : [];
}
export async function saveDrawings(videoId, drawings) {
  await AsyncStorage.setItem(keyDrawings(videoId), JSON.stringify(drawings));
}

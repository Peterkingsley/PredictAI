import { useEffect, useSyncExternalStore } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

type ProfilePhotoState = {
  ready: boolean;
  revision: number;
  uri: string | null;
};

export type ProfilePhotoSelectionResult = 'saved' | 'cancelled' | 'denied' | 'error';

const profilePhotoPath = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}predictai-profile-photo` : null;
const listeners = new Set<() => void>();
let state: ProfilePhotoState = { ready: false, revision: 0, uri: null };
let hydration: Promise<void> | null = null;

function publish(next: Partial<ProfilePhotoState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function hydrateProfilePhoto() {
  if (hydration) return hydration;
  hydration = (async () => {
    if (!profilePhotoPath) {
      publish({ ready: true });
      return;
    }

    try {
      const info = await FileSystem.getInfoAsync(profilePhotoPath);
      publish({ ready: true, uri: info.exists ? profilePhotoPath : null });
    } catch {
      publish({ ready: true, uri: null });
    }
  })();
  return hydration;
}

export async function selectProfilePhoto(): Promise<ProfilePhotoSelectionResult> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return 'denied';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });

    if (result.canceled || !result.assets[0]) return 'cancelled';
    const sourceUri = result.assets[0].uri;

    if (profilePhotoPath) {
      await FileSystem.deleteAsync(profilePhotoPath, { idempotent: true });
      await FileSystem.copyAsync({ from: sourceUri, to: profilePhotoPath });
      publish({ ready: true, revision: state.revision + 1, uri: profilePhotoPath });
    } else {
      publish({ ready: true, revision: state.revision + 1, uri: sourceUri });
    }

    return 'saved';
  } catch {
    return 'error';
  }
}

export async function removeProfilePhoto() {
  try {
    if (profilePhotoPath) await FileSystem.deleteAsync(profilePhotoPath, { idempotent: true });
  } finally {
    publish({ ready: true, revision: state.revision + 1, uri: null });
  }
}

export function useProfilePhoto() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => { void hydrateProfilePhoto(); }, []);
  return snapshot;
}

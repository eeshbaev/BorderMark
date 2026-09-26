import * as FileSystem from 'expo-file-system/legacy';

export const PROFILE_PHOTO_RELATIVE = 'profile/avatar.jpg';

function borderMarkRoot(documentDirectory: string): string {
  const base = documentDirectory.endsWith('/') ? documentDirectory : `${documentDirectory}/`;
  return `${base}bordermark/`;
}

export function resolveProfilePhotoUri(
  documentDirectory: string | null,
  relativePath: string | null,
): string | null {
  if (!documentDirectory || !relativePath) {
    return null;
  }
  return `${borderMarkRoot(documentDirectory)}${relativePath}`;
}

export async function importProfilePhoto(sourceUri: string): Promise<string> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error('Document directory unavailable.');
  }

  const profileDirectory = `${borderMarkRoot(documentDirectory)}profile/`;
  await FileSystem.makeDirectoryAsync(profileDirectory, { intermediates: true });
  const destination = `${profileDirectory}avatar.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return PROFILE_PHOTO_RELATIVE;
}

export async function removeProfilePhoto(relativePath: string | null): Promise<void> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory || !relativePath) {
    return;
  }

  const absoluteUri = resolveProfilePhotoUri(documentDirectory, relativePath);
  if (!absoluteUri) {
    return;
  }

  const info = await FileSystem.getInfoAsync(absoluteUri);
  if (info.exists) {
    await FileSystem.deleteAsync(absoluteUri, { idempotent: true });
  }
}

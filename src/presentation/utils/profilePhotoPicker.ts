export async function pickProfileImageUri(): Promise<string | null> {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    type: 'image/*',
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset.mimeType?.startsWith('image/')) {
    throw new Error('Choose an image file for your profile photo.');
  }

  return asset.uri;
}

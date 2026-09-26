export interface PassportUploadSelection {
  uri: string;
  fileName: string;
  mimeType: string;
}

export async function pickPassportUpload(): Promise<PassportUploadSelection | null> {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    type: ['image/*', 'application/pdf'],
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
  };
}

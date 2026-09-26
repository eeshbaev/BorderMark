import type { StayAttachmentCategory } from '@/shared/types';

export interface PickedStayAttachment {
  uri: string;
  fileName: string;
  mimeType: string;
  category: StayAttachmentCategory;
}

export async function pickStayPhotoFromLibrary(): Promise<PickedStayAttachment | null> {
  const ImagePicker = await import('expo-image-picker');
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to add photos.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    category: 'photo',
  };
}

export async function takeStayPhoto(): Promise<PickedStayAttachment | null> {
  const ImagePicker = await import('expo-image-picker');
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is required to take a photo.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    category: 'photo',
  };
}

export async function pickStayFile(category: 'ticket' | 'other'): Promise<PickedStayAttachment | null> {
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
    category,
  };
}

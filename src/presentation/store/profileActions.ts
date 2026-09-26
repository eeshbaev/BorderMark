import type { UserProfile } from '@/shared/types';
import { getUserProfile, updateUserProfile } from '@/data/repositories/settingsRepository';
import { useBorderMarkStore } from '@/presentation/store/appStore';

export async function saveUserProfile(partial: Partial<UserProfile>): Promise<UserProfile> {
  const profile = await updateUserProfile(partial);
  useBorderMarkStore.setState({ profile });
  return profile;
}

export async function reloadUserProfile(): Promise<UserProfile> {
  const profile = await getUserProfile();
  useBorderMarkStore.setState({ profile });
  return profile;
}

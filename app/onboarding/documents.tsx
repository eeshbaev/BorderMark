import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/presentation/components/onboarding/OnboardingScaffold';
import { OnboardingDocumentPreview } from '@/presentation/components/onboarding/OnboardingIllustrations';

export default function OnboardingDocumentsScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      step={3}
      headline="Nothing important slips through."
      body="Store passports, visas, permits, and insurance in one wallet. BorderMark watches expiry dates and surfaces what needs your attention — before it becomes a problem."
      bullets={['Document wallet with attachments', 'Expiry reminders', '"On your radar" attention feed']}
      visual={<OnboardingDocumentPreview />}
      onContinue={() => router.push('/onboarding/journey')}
    />
  );
}

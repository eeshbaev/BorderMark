import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/presentation/components/onboarding/OnboardingScaffold';
import { OnboardingHomePreview } from '@/presentation/components/onboarding/OnboardingIllustrations';

export default function OnboardingStaysScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      step={2}
      headline="Always know where you stand."
      body="Track where you've been, where you are now and for how many days. BorderMark counts days against immigration rules like Schengen 90/180 and US tax presence — so you're never guessing."
      bullets={[
        'Current stay at a glance',
        'Rule limits with clear status',
        'Visa, passport, residency permit, insurance, and other rules',
      ]}
      visual={<OnboardingHomePreview />}
      onContinue={() => router.push('/onboarding/documents')}
    />
  );
}

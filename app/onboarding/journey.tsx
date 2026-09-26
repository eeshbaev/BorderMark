import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/presentation/components/onboarding/OnboardingScaffold';
import { OnboardingJourneyPreview } from '@/presentation/components/onboarding/OnboardingIllustrations';

export default function OnboardingJourneyScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      step={4}
      headline="Your story, not just your stats."
      body="See your life as a timeline and country chapters — where you lived, studied, worked, and visited. BorderMark turns day counts into a biography you'll actually want to revisit."
      bullets={[
        'Timeline with filters',
        'Country chapters with cities & notes',
        'Milestones like "first time abroad"',
      ]}
      visual={<OnboardingJourneyPreview />}
      onContinue={() => router.push('/onboarding/profile')}
    />
  );
}

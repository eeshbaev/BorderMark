import { AttentionList } from '@/presentation/components/AttentionList';
import { Screen } from '@/presentation/components/Screen';
import { useBorderMarkStore } from '@/presentation/store/appStore';

export default function AttentionScreen() {
  const attentionItems = useBorderMarkStore((state) => state.attentionItems);

  return (
    <Screen title="Attention" subtitle="Things you should pay attention to.">
      <AttentionList items={attentionItems} />
    </Screen>
  );
}

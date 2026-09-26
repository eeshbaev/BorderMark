import { type TextInputProps } from 'react-native';

import { IsoDateField } from '@/presentation/components/IsoDateField';

type BirthDateTextInputProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: string;
  onChangeText: (value: string) => void;
};

export function BirthDateTextInput({ value, onChangeText, ...rest }: BirthDateTextInputProps) {
  return (
    <IsoDateField
      {...rest}
      label="Date of birth"
      value={value}
      onChangeText={onChangeText}
      maximumDate={new Date()}
    />
  );
}

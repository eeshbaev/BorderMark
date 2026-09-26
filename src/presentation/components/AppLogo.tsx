import { Image, ImageStyle, StyleProp } from 'react-native';

const logoSource = require('../../../assets/icon-512.png');

interface AppLogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export function AppLogo({ size = 88, style }: AppLogoProps) {
  return (
    <Image
      source={logoSource}
      style={[{ width: size, height: size, borderRadius: size * 0.22 }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

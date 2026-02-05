interface SadPixelCharacterProps {
  size?: number;
}

export default function SadPixelCharacter({ size = 80 }: SadPixelCharacterProps) {
  const colors = {
    primary: '#9CA3AF',
    secondary: '#D1D5DB',
    highlight: '#E5E7EB',
  };

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="opacity-60">
      <rect x="6" y="1" width="4" height="2" fill={colors.secondary} fillOpacity="0.8"/>
      <rect x="5" y="3" width="6" height="2" fill={colors.primary} fillOpacity="0.9"/>
      <rect x="4" y="5" width="8" height="3" fill={colors.primary} fillOpacity="0.95"/>
      
      <rect x="5" y="5" width="2" height="1" fill="black" fillOpacity="0.7"/>
      <rect x="9" y="5" width="2" height="1" fill="black" fillOpacity="0.7"/>
      <rect x="5" y="6" width="1" height="1" fill="black" fillOpacity="0.5"/>
      <rect x="10" y="6" width="1" height="1" fill="black" fillOpacity="0.5"/>
      
      <rect x="7" y="7" width="1" height="1" fill={colors.highlight} fillOpacity="0.4"/>
      <rect x="8" y="7" width="1" height="1" fill={colors.highlight} fillOpacity="0.4"/>
      
      <rect x="4" y="8" width="8" height="3" fill={colors.secondary} fillOpacity="0.85"/>
      <rect x="6" y="9" width="1" height="1" fill="black" fillOpacity="0.3"/>
      <rect x="9" y="9" width="1" height="1" fill="black" fillOpacity="0.3"/>
      <rect x="7" y="10" width="2" height="1" fill="black" fillOpacity="0.2"/>
      
      <rect x="3" y="9" width="2" height="4" fill={colors.primary} fillOpacity="0.7"/>
      <rect x="11" y="9" width="2" height="4" fill={colors.primary} fillOpacity="0.7"/>
      <rect x="5" y="11" width="2" height="3" fill={colors.secondary} fillOpacity="0.8"/>
      <rect x="9" y="11" width="2" height="3" fill={colors.secondary} fillOpacity="0.8"/>
      <rect x="5" y="14" width="2" height="1" fill={colors.highlight} fillOpacity="0.6"/>
      <rect x="9" y="14" width="2" height="1" fill={colors.highlight} fillOpacity="0.6"/>
    </svg>
  );
}

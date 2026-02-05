import { ProviderId } from '../types/providers';

interface PixelCharacterProps {
  provider: ProviderId;
  size?: number;
  isLow?: boolean;
  isActive?: boolean;
}

const COLORS: Record<ProviderId | 'inactive', { primary: string; secondary: string; highlight: string }> = {
  anthropic: { primary: '#D97757', secondary: '#E8956A', highlight: '#F4B896' },
  openai: { primary: '#10A37F', secondary: '#1DBF8E', highlight: '#6EE7B7' },
  google: { primary: '#4285F4', secondary: '#669DF6', highlight: '#A8C7FA' },
  azure: { primary: '#0078D4', secondary: '#50A0E0', highlight: '#90C8F0' },
  cohere: { primary: '#FF6B6B', secondary: '#FF9090', highlight: '#FFB5B5' },
  mistral: { primary: '#FF7F00', secondary: '#FFA040', highlight: '#FFC080' },
  perplexity: { primary: '#20C997', secondary: '#50D9B0', highlight: '#80E9C9' },
  inactive: { primary: '#9CA3AF', secondary: '#D1D5DB', highlight: '#E5E7EB' },
};

export default function PixelCharacter({ provider, size = 64, isLow = false, isActive = false }: PixelCharacterProps) {
  const opacity = isLow ? 'opacity-50' : 'opacity-100';
  const palette = isActive ? (COLORS[provider] || COLORS.inactive) : COLORS.inactive;
  
  if (provider === 'anthropic') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className={`${opacity} transition-opacity`}>
        <rect x="6" y="1" width="4" height="2" fill={palette.primary} fillOpacity="0.9"/>
        <rect x="5" y="3" width="6" height="2" fill={palette.secondary} fillOpacity="0.8"/>
        <rect x="4" y="5" width="8" height="3" fill={palette.primary} fillOpacity="0.9"/>
        <rect x="6" y="5" width="1" height="1" fill="black"/>
        <rect x="9" y="5" width="1" height="1" fill="black"/>
        <rect x="7" y="7" width="2" height="1" fill={palette.highlight} fillOpacity="0.5"/>
        <rect x="4" y="8" width="8" height="3" fill={palette.secondary} fillOpacity="0.7"/>
        <rect x="3" y="9" width="2" height="4" fill={palette.primary} fillOpacity="0.6"/>
        <rect x="11" y="9" width="2" height="4" fill={palette.primary} fillOpacity="0.6"/>
        <rect x="5" y="11" width="2" height="3" fill={palette.secondary} fillOpacity="0.8"/>
        <rect x="9" y="11" width="2" height="3" fill={palette.secondary} fillOpacity="0.8"/>
        <rect x="5" y="14" width="2" height="1" fill={palette.highlight} fillOpacity="0.5"/>
        <rect x="9" y="14" width="2" height="1" fill={palette.highlight} fillOpacity="0.5"/>
      </svg>
    );
  }

  if (provider === 'openai') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className={`${opacity} transition-opacity`}>
        <rect x="5" y="1" width="6" height="1" fill={palette.highlight} fillOpacity="0.7"/>
        <rect x="4" y="2" width="8" height="2" fill={palette.secondary} fillOpacity="0.85"/>
        <rect x="3" y="4" width="10" height="4" fill={palette.primary} fillOpacity="0.9"/>
        <rect x="5" y="5" width="2" height="2" fill="black"/>
        <rect x="9" y="5" width="2" height="2" fill="black"/>
        <rect x="6" y="5" width="1" height="1" fill={palette.highlight} fillOpacity="0.8"/>
        <rect x="10" y="5" width="1" height="1" fill={palette.highlight} fillOpacity="0.8"/>
        <rect x="4" y="8" width="8" height="3" fill={palette.secondary} fillOpacity="0.75"/>
        <rect x="2" y="8" width="2" height="5" fill={palette.primary} fillOpacity="0.6"/>
        <rect x="12" y="8" width="2" height="5" fill={palette.primary} fillOpacity="0.6"/>
        <rect x="5" y="11" width="3" height="4" fill={palette.secondary} fillOpacity="0.8"/>
        <rect x="8" y="11" width="3" height="4" fill={palette.secondary} fillOpacity="0.8"/>
      </svg>
    );
  }

  if (provider === 'google') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className={`${opacity} transition-opacity`}>
        <rect x="6" y="0" width="4" height="2" fill={palette.highlight} fillOpacity="0.6"/>
        <rect x="5" y="2" width="6" height="1" fill={palette.secondary} fillOpacity="0.75"/>
        <rect x="4" y="3" width="8" height="4" fill={palette.primary} fillOpacity="0.9"/>
        <rect x="5" y="4" width="2" height="2" fill="black"/>
        <rect x="9" y="4" width="2" height="2" fill="black"/>
        <rect x="6" y="4" width="1" height="1" fill={palette.highlight} fillOpacity="0.9"/>
        <rect x="10" y="4" width="1" height="1" fill={palette.highlight} fillOpacity="0.9"/>
        <rect x="3" y="7" width="10" height="4" fill={palette.secondary} fillOpacity="0.8"/>
        <rect x="1" y="8" width="2" height="4" fill={palette.primary} fillOpacity="0.5"/>
        <rect x="13" y="8" width="2" height="4" fill={palette.primary} fillOpacity="0.5"/>
        <rect x="2" y="12" width="2" height="2" fill={palette.highlight} fillOpacity="0.6"/>
        <rect x="12" y="12" width="2" height="2" fill={palette.highlight} fillOpacity="0.6"/>
        <rect x="5" y="11" width="2" height="4" fill={palette.secondary} fillOpacity="0.85"/>
        <rect x="9" y="11" width="2" height="4" fill={palette.secondary} fillOpacity="0.85"/>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={`${opacity} transition-opacity`}>
      <rect x="5" y="2" width="6" height="2" fill={palette.secondary} fillOpacity="0.8"/>
      <rect x="4" y="4" width="8" height="4" fill={palette.primary} fillOpacity="0.9"/>
      <rect x="6" y="5" width="1" height="1" fill="black"/>
      <rect x="9" y="5" width="1" height="1" fill="black"/>
      <rect x="7" y="7" width="2" height="1" fill={palette.highlight} fillOpacity="0.5"/>
      <rect x="4" y="8" width="8" height="3" fill={palette.secondary} fillOpacity="0.7"/>
      <rect x="3" y="9" width="2" height="4" fill={palette.primary} fillOpacity="0.6"/>
      <rect x="11" y="9" width="2" height="4" fill={palette.primary} fillOpacity="0.6"/>
      <rect x="5" y="11" width="2" height="3" fill={palette.secondary} fillOpacity="0.8"/>
      <rect x="9" y="11" width="2" height="3" fill={palette.secondary} fillOpacity="0.8"/>
    </svg>
  );
}

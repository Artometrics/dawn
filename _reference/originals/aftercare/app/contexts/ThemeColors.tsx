import { useTheme } from './ThemeContext';

export const useThemeColors = () => {
  const { isDark } = useTheme();

  return {
    icon: isDark ? '#FDF0F4' : '#3D2A32',
    bg: isDark ? '#1A1215' : '#FDF0F4',
    invert: isDark ? '#1F1518' : '#FFF8FA',
    secondary: isDark ? '#2A1F24' : '#FFFFFF',
    state: isDark ? 'rgba(253, 240, 244, 0.3)' : 'rgba(61, 42, 50, 0.3)',
    sheet: isDark ? '#2A1F24' : '#FFFFFF',
    highlight: isDark ? '#E8A0B5' : '#D4849A',
    lightDark: isDark ? '#2A1F24' : '#FFFFFF',
    border: isDark ? 'rgba(232, 160, 181, 0.2)' : 'rgba(212, 132, 154, 0.25)',
    text: isDark ? '#FDF0F4' : '#3D2A32',
    placeholder: isDark ? 'rgba(253,240,244,0.4)' : 'rgba(61,42,50,0.4)',
    switch: isDark ? 'rgba(232,160,181,0.4)' : '#E8C4CF',
    chatBg: isDark ? '#2A1F24' : '#F8E4EA',
    gradient: isDark ? 'rgba(26,18,21,1)' : 'rgba(212,132,154,0.15)',
    isDark
  };
};

export default useThemeColors;

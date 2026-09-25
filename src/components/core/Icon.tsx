import React from 'react';
import { ViewStyle } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { colors } from '../../theme';

export type IconName =
  | 'Home'
  | 'Compass'
  | 'PlusCircle'
  | 'Plus'
  | 'Bell'
  | 'User'
  | 'Search'
  | 'Settings'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUpRight'
  | 'X'
  | 'Check'
  | 'CheckCircle2'
  | 'Heart'
  | 'MessageCircle'
  | 'MessageSquare'
  | 'Repeat2'
  | 'Bookmark'
  | 'Share2'
  | 'MoreHorizontal'
  | 'SlidersHorizontal'
  | 'Brain'
  | 'Dna'
  | 'Activity'
  | 'Cpu'
  | 'Shield'
  | 'Layers'
  | 'Zap'
  | 'Binary'
  | 'FileText'
  | 'Image'
  | 'BarChart2'
  | 'TrendingUp'
  | 'Tag'
  | 'Globe'
  | 'Users'
  | 'MapPin'
  | 'Calendar'
  | 'ExternalLink'
  | 'Send'
  | 'AlertTriangle'
  | 'AlertCircle'
  | 'RefreshCw'
  | 'Inbox'
  | 'Atom'
  | 'FlaskConical'
  | 'Pill'
  | 'Microscope'
  | 'Terminal'
  | 'Leaf'
  | 'Sparkles'
  | 'Eye'
  | 'EyeOff'
  | 'Lock'
  | 'Mail'
  | 'Key'
  | 'Download'
  | 'LogOut'
  | 'Trash2'
  | 'Sun'
  | 'Moon'
  | 'BookOpen'
  | 'Award'
  | 'UserCheck'
  | 'UserX'
  | 'Database'
  | 'AtSign'
  | 'Link'
  | 'Slash';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface IconProps {
  name: IconName;
  size?: IconSize;
  color?: string;
  strokeWidth?: number;
  fill?: string;
  style?: ViewStyle | any;
}

const sizeMap: Record<string, number> = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = colors.textPrimary,
  strokeWidth = 2,
  fill = 'transparent',
  style,
}) => {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size] || 22;
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Circle;

  return (
    <IconComponent
      size={pixelSize}
      color={color}
      strokeWidth={strokeWidth}
      fill={fill}
      style={style}
    />
  );
};

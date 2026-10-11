export type ChatThemeId =
  | 'default'
  | 'coral'
  | 'peach'
  | 'lavender'
  | 'sky'
  | 'honey'
  | 'blush'
  | 'mint'
  | 'dark';

export interface ChatThemeConfig {
  id: ChatThemeId;
  name: string;
  category: 'default' | 'doodle' | 'dark';
  previewColor: string;
  accentColor: string;
  backgroundColor: string;
  myBubbleColor: string;
  myBubbleTextColor: string;
  otherBubbleColor: string;
  otherBubbleTextColor: string;
  timestampMyColor: string;
  timestampOtherColor: string;
  backgroundImage?: any;
  overlayOpacity: number;
}

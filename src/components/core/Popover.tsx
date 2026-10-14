import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  ViewStyle,
  Platform,
} from 'react-native';

export interface PopoverProps {
  visible: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<View | any>;
  anchorCoords?: {
    x?: number;
    y?: number;
    top?: number;
    left?: number;
    width?: number;
    height?: number;
  } | null;
  position?: 'top' | 'bottom' | 'auto';
  align?: 'start' | 'center' | 'end';
  estimatedWidth?: number;
  estimatedHeight?: number;
  offset?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Popover: React.FC<PopoverProps> = ({
  visible,
  onClose,
  anchorRef,
  anchorCoords,
  position = 'auto',
  align = 'center',
  estimatedWidth = 210,
  estimatedHeight = 110,
  offset = 8,
  children,
  style,
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!visible) return;

    const calculatePosition = (x: number, y: number, width: number, height: number) => {
      const windowWidth = Dimensions.get('window').width;
      const windowHeight = Dimensions.get('window').height;

      // 1. Determine vertical placement (top vs bottom)
      let resolvedPosition = position;
      if (resolvedPosition === 'auto') {
        resolvedPosition = y > windowHeight * 0.55 ? 'top' : 'bottom';
      }

      let top = 0;
      if (resolvedPosition === 'top') {
        top = y - estimatedHeight - offset;
      } else {
        top = y + height + offset;
      }

      // Ensure top stays on-screen
      top = Math.max(12, Math.min(top, windowHeight - estimatedHeight - 12));

      // 2. Determine horizontal placement
      let left = 0;
      if (align === 'start') {
        left = x;
      } else if (align === 'end') {
        left = x + width - estimatedWidth;
      } else {
        left = x + width / 2 - estimatedWidth / 2;
      }

      // Ensure left stays on-screen
      left = Math.max(12, Math.min(left, windowWidth - estimatedWidth - 12));

      setCoords({ top, left });
    };

    if (anchorCoords) {
      if (anchorCoords.top !== undefined && anchorCoords.left !== undefined) {
        setCoords({ top: anchorCoords.top, left: anchorCoords.left });
      } else {
        calculatePosition(
          anchorCoords.x ?? 0,
          anchorCoords.y ?? 0,
          anchorCoords.width || 24,
          anchorCoords.height || 24
        );
      }
    } else if (anchorRef?.current) {
      if (typeof anchorRef.current.measureInWindow === 'function') {
        anchorRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
          calculatePosition(x, y, width || 24, height || 24);
        });
      } else if (typeof (anchorRef.current as any).getBoundingClientRect === 'function') {
        const rect = (anchorRef.current as any).getBoundingClientRect();
        calculatePosition(rect.left, rect.top, rect.width, rect.height);
      }
    }
  }, [visible, anchorRef, anchorCoords, position, align, estimatedWidth, estimatedHeight, offset]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.popoverCard,
                { width: estimatedWidth },
                coords ? { top: coords.top, left: coords.left } : styles.fallback,
                style,
              ]}
            >
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export interface PopoverItemProps {
  icon?: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  active?: boolean;
  activeColor?: string;
}

export const PopoverItem: React.FC<PopoverItemProps> = ({
  icon,
  label,
  subtitle,
  onPress,
  destructive = false,
  active = false,
  activeColor = '#10B981',
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.popoverItem}
      onPress={onPress}
    >
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <View style={styles.textWrap}>
        <Text
          style={[
            styles.itemLabel,
            destructive && styles.destructiveLabel,
            active && { color: activeColor, fontWeight: '700' },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export const PopoverDivider: React.FC = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  popoverCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 9999,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  iconWrap: {
    marginRight: 10,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#1E293B',
  },
  destructiveLabel: {
    color: '#EF4444',
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  fallback: {
    alignSelf: 'center',
    top: '40%',
  },
});

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Image as RNImage,
  PanResponder,
  PanResponderInstance,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import {
  X,
  Check,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCcw,
  Camera,
  Image as ImageIcon,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';

export type CropType = 'avatar' | 'banner';

export interface CroppedImageResult {
  uri: string;
  width: number;
  height: number;
  base64?: string;
  mimeType: string;
  fileSize?: number;
}

export interface ImageCropperModalProps {
  visible: boolean;
  imageUri: string | null;
  cropType?: CropType;
  onSave: (result: CroppedImageResult) => void;
  onCancel: () => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  visible,
  imageUri,
  cropType = 'avatar',
  onSave,
  onCancel,
}) => {
  const isAvatar = cropType === 'avatar';
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Viewport dimensions
  const cropSize = useMemo(() => {
    if (isAvatar) {
      const size = Math.min(screenWidth - 48, 290);
      return { width: size, height: size, borderRadius: size / 2 };
    }
    // Banner 3:1 ratio
    const width = Math.min(screenWidth - 32, 360);
    const height = Math.round(width / 2.85);
    return { width, height, borderRadius: 12 };
  }, [isAvatar, screenWidth]);

  // Image natural dimensions
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // References for live gesture calculations
  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);

  // Keep refs in sync
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Load natural dimensions when imageUri changes
  useEffect(() => {
    if (!imageUri || !visible) {
      setNaturalSize(null);
      setScale(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      return;
    }

    RNImage.getSize(
      imageUri,
      (width, height) => {
        setNaturalSize({ width, height });

        // Calculate minimum scale so image completely covers the crop box
        const scaleX = cropSize.width / width;
        const scaleY = cropSize.height / height;
        const initialFitScale = Math.max(scaleX, scaleY);

        setMinScale(initialFitScale);
        setScale(initialFitScale);
        scaleRef.current = initialFitScale;
        setPan({ x: 0, y: 0 });
        panRef.current = { x: 0, y: 0 };
        setRotation(0);
      },
      () => {
        // Fallback dimensions
        const fallback = { width: 1200, height: 1200 };
        setNaturalSize(fallback);
        setMinScale(1);
        setScale(1);
      }
    );
  }, [imageUri, visible, cropSize]);

  // Pan Responder for multi-touch (Pinch Zoom & Drag Pan)
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_evt, gestureState) => {
        initialPinchDistRef.current = null;
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        // Two-finger pinch to zoom
        if (touches.length >= 2) {
          const touch1 = touches[0];
          const touch2 = touches[1];
          const dx = touch1.pageX - touch2.pageX;
          const dy = touch1.pageY - touch2.pageY;
          const currentDist = Math.sqrt(dx * dx + dy * dy);

          if (!initialPinchDistRef.current) {
            initialPinchDistRef.current = currentDist;
            initialScaleRef.current = scaleRef.current;
          } else {
            const factor = currentDist / initialPinchDistRef.current;
            const newScale = Math.max(minScale, Math.min(minScale * 4.5, initialScaleRef.current * factor));
            setScale(newScale);
          }
        } else {
          // Single-finger drag pan
          const newX = panRef.current.x + gestureState.dx;
          const newY = panRef.current.y + gestureState.dy;

          setPan({ x: newX, y: newY });
        }
      },
      onPanResponderRelease: () => {
        initialPinchDistRef.current = null;
      },
    });
  }, [minScale]);

  // Zoom slider buttons
  const handleZoomIn = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setScale((prev) => Math.min(minScale * 4.5, prev * 1.2));
  };

  const handleZoomOut = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setScale((prev) => Math.max(minScale, prev / 1.2));
  };

  const handleRotate = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setScale(minScale);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // Perform accurate crop using expo-image-manipulator
  const handleApplyCrop = async () => {
    if (!imageUri || !naturalSize || isProcessing) return;

    setIsProcessing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      // 1. Calculate image dimensions considering rotation
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const baseWidth = isRotated90or270 ? naturalSize.height : naturalSize.width;
      const baseHeight = isRotated90or270 ? naturalSize.width : naturalSize.height;

      // 2. Rendered dimensions on screen in the viewport
      const displayedWidth = baseWidth * scale;
      const displayedHeight = baseHeight * scale;

      // 3. Crop viewport center relative to rendered image
      const cropCenterX = displayedWidth / 2 - pan.x;
      const cropCenterY = displayedHeight / 2 - pan.y;

      // 4. Crop box bounds in screen coordinate space
      const screenCropLeft = cropCenterX - cropSize.width / 2;
      const screenCropTop = cropCenterY - cropSize.height / 2;

      // 5. Convert to original image pixel coordinates
      const ratio = 1 / scale;
      let originX = Math.round(screenCropLeft * ratio);
      let originY = Math.round(screenCropTop * ratio);
      let cropW = Math.round(cropSize.width * ratio);
      let cropH = Math.round(cropSize.height * ratio);

      // Clamp within natural image dimensions to prevent out-of-bounds error
      originX = Math.max(0, Math.min(baseWidth - 10, originX));
      originY = Math.max(0, Math.min(baseHeight - 10, originY));
      cropW = Math.max(10, Math.min(baseWidth - originX, cropW));
      cropH = Math.max(10, Math.min(baseHeight - originY, cropH));

      // 6. Manipulator actions: Rotate first if needed, then Crop, then resize to clean standard size
      const actions: any[] = [];
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      actions.push({
        crop: {
          originX,
          originY,
          width: cropW,
          height: cropH,
        },
      });

      // Target resolution
      const targetSize = isAvatar
        ? { width: 600, height: 600 }
        : { width: 1200, height: Math.round(1200 / 2.85) };

      actions.push({ resize: targetSize });

      const manipResult = await manipulateAsync(imageUri, actions, {
        compress: 0.88,
        format: SaveFormat.JPEG,
        base64: true,
      });

      onSave({
        uri: manipResult.uri,
        width: manipResult.width,
        height: manipResult.height,
        base64: manipResult.base64,
        mimeType: 'image/jpeg',
      });
    } catch (err: any) {
      console.warn('[ImageCropperModal] Crop error:', err);
      // Fallback: use raw image if manipulation had an issue
      onSave({
        uri: imageUri,
        width: naturalSize.width,
        height: naturalSize.height,
        mimeType: 'image/jpeg',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible || !imageUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />

        {/* Modal Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onCancel}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <X size={20} color={colors.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {isAvatar ? 'Crop Profile Picture' : 'Crop Profile Banner'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isAvatar ? 'Drag & pinch to fit circular frame' : 'Drag & pinch to fit banner frame'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleApplyCrop}
            disabled={isProcessing}
            style={[styles.saveHeaderButton, isProcessing && { opacity: 0.6 }]}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Check size={16} color={colors.white} />
                <Text style={styles.saveHeaderText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Main Crop Viewport Stage */}
        <View style={styles.stageContainer}>
          {/* Active Crop Box with Overlays */}
          <View
            style={[
              styles.cropViewport,
              {
                width: cropSize.width,
                height: cropSize.height,
                borderRadius: cropSize.borderRadius,
              },
            ]}
          >
            {/* Draggable & Scalable Image Container */}
            <View
              {...panResponder.panHandlers}
              style={[
                styles.imageTransformContainer,
                {
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale },
                    { rotate: `${rotation}deg` },
                  ],
                },
              ]}
            >
              <Image
                source={{ uri: imageUri }}
                style={[
                  styles.imagePreview,
                  naturalSize ? { width: naturalSize.width, height: naturalSize.height } : null,
                ]}
                contentFit="contain"
                transition={100}
              />
            </View>

            {/* Grid Lines Overlay */}
            <View style={styles.gridOverlay} pointerEvents="none">
              <View style={styles.gridRow}>
                <View style={styles.gridCell} />
                <View style={[styles.gridCell, styles.gridBorderLeft, styles.gridBorderRight]} />
                <View style={styles.gridCell} />
              </View>
              <View style={[styles.gridRow, styles.gridBorderTop, styles.gridBorderBottom]}>
                <View style={styles.gridCell} />
                <View style={[styles.gridCell, styles.gridBorderLeft, styles.gridBorderRight]} />
                <View style={styles.gridCell} />
              </View>
              <View style={styles.gridRow}>
                <View style={styles.gridCell} />
                <View style={[styles.gridCell, styles.gridBorderLeft, styles.gridBorderRight]} />
                <View style={styles.gridCell} />
              </View>
            </View>

            {/* Frame Border Outline */}
            <View
              style={[
                styles.frameBorder,
                {
                  borderRadius: cropSize.borderRadius,
                  borderColor: isAvatar ? colors.white : colors.white,
                },
              ]}
              pointerEvents="none"
            />
          </View>

          {/* Visual Hint Pill */}
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>
              {isAvatar ? 'Pinch to zoom · Drag to reposition' : 'Pinch to zoom · Drag horizontally to align'}
            </Text>
          </View>
        </View>

        {/* Bottom Control Toolbar */}
        <View style={styles.bottomToolbar}>
          {/* Zoom Controller */}
          <View style={styles.zoomRow}>
            <TouchableOpacity
              onPress={handleZoomOut}
              style={styles.toolIconBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ZoomOut size={19} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.zoomBarContainer}>
              <View style={styles.zoomTrack}>
                <View
                  style={[
                    styles.zoomProgress,
                    {
                      width: `${Math.min(100, Math.max(5, ((scale - minScale) / (minScale * 3.5)) * 100))}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.zoomValueText}>{(scale / minScale).toFixed(1)}x</Text>
            </View>

            <TouchableOpacity
              onPress={handleZoomIn}
              style={styles.toolIconBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ZoomIn size={19} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Action Tools: Rotate, Reset, Cancel, Save */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              onPress={handleRotate}
              style={styles.secondaryToolBtn}
              activeOpacity={0.75}
            >
              <RotateCw size={17} color={colors.white} />
              <Text style={styles.secondaryToolText}>Rotate 90°</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleReset}
              style={styles.secondaryToolBtn}
              activeOpacity={0.75}
            >
              <RefreshCcw size={16} color={colors.white} />
              <Text style={styles.secondaryToolText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleApplyCrop}
              disabled={isProcessing}
              style={styles.primarySaveBtn}
              activeOpacity={0.85}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <>
                  <Check size={18} color={colors.black} />
                  <Text style={styles.primarySaveText}>Apply Crop</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0B0F17',
    zIndex: 10,
  },
  headerButton: {
    padding: spacing.xs,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.bodyLargeBold,
    color: colors.white,
    fontSize: 16,
  },
  headerSubtitle: {
    ...typography.micro,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  saveHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  saveHeaderText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 13,
  },
  stageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  cropViewport: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#161B22',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 15,
  },
  imageTransformContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: 600,
    height: 600,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.25,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
  },
  gridBorderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: colors.white,
  },
  gridBorderRight: {
    borderRightWidth: 1,
    borderRightColor: colors.white,
  },
  gridBorderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.white,
  },
  gridBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.white,
  },
  frameBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  hintPill: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  hintText: {
    ...typography.micro,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  bottomToolbar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: '#0B0F17',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.md,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toolIconBtn: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  zoomTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  zoomProgress: {
    height: '100%',
    backgroundColor: colors.accentBlue,
    borderRadius: radii.full,
  },
  zoomValueText: {
    ...typography.micro,
    color: 'rgba(255, 255, 255, 0.6)',
    width: 32,
    textAlign: 'right',
    fontSize: 11,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secondaryToolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  secondaryToolText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
  },
  primarySaveBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  primarySaveText: {
    ...typography.captionBold,
    color: colors.black,
    fontSize: 13,
  },
});

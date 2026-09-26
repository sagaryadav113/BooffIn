import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';

interface ImageViewerModalProps {
  images: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
  authorName?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  images,
  initialIndex = 0,
  visible,
  onClose,
  authorName,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      // Wait for layout before scrolling to initial index
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: Math.min(initialIndex, Math.max(0, images.length - 1)),
          animated: false,
        });
      }, 50);
    }
  }, [visible, initialIndex, images.length]);

  if (!visible || !images || images.length === 0) return null;

  const { width: screenWidth, height: screenHeight } = dimensions;

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const page = Math.round(offset / slideSize);
    if (page >= 0 && page < images.length && page !== currentIndex) {
      setCurrentIndex(page);
    }
  };

  const handlePrev = (e: any) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
  };

  const handleNext = (e: any) => {
    e.stopPropagation();
    if (currentIndex < images.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
            accessibilityLabel="Close image viewer"
          >
            <X size={22} color={colors.white} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            {images.length > 1 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} / {images.length}
                </Text>
              </View>
            )}
            {authorName && (
              <Text style={styles.authorText} numberOfLines={1}>
                {authorName}
              </Text>
            )}
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Carousel / Swiper */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={images}
            keyExtractor={(_, index) => `viewer_img_${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            initialScrollIndex={initialIndex < images.length ? initialIndex : 0}
            renderItem={({ item }) => (
              <View style={[styles.imageSlide, { width: screenWidth }]}>
                <Image
                  source={{ uri: item }}
                  style={[
                    styles.fullImage,
                    { width: screenWidth, height: screenHeight * 0.76 },
                  ]}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}
          />

          {/* Web / Desktop navigation arrows */}
          {Platform.OS === 'web' && images.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navArrow, styles.navArrowLeft]}
                  onPress={handlePrev}
                  activeOpacity={0.8}
                >
                  <ChevronLeft size={28} color={colors.white} />
                </TouchableOpacity>
              )}
              {currentIndex < images.length - 1 && (
                <TouchableOpacity
                  style={[styles.navArrow, styles.navArrowRight]}
                  onPress={handleNext}
                  activeOpacity={0.8}
                >
                  <ChevronRight size={28} color={colors.white} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Bottom Pagination Dots */}
        {images.length > 1 && (
          <View style={styles.footer}>
            <View style={styles.dotsContainer}>
              {images.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setCurrentIndex(idx);
                    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <View
                    style={[
                      styles.dot,
                      idx === currentIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : spacing.sm,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginBottom: 2,
  },
  counterText: {
    ...typography.microBold,
    color: colors.white,
    fontSize: 12,
  },
  authorText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    maxWidth: 200,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageSlide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    backgroundColor: 'transparent',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navArrowLeft: {
    left: spacing.md,
  },
  navArrowRight: {
    right: spacing.md,
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dot: {
    height: 6,
    borderRadius: radii.full,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.white,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});

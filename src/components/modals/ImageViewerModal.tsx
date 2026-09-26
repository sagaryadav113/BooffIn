import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  SafeAreaView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);

  // Synchronize initial index when modal becomes visible or initialIndex changes
  useEffect(() => {
    if (visible) {
      const safeIndex = Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1));
      setCurrentIndex(safeIndex);
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: safeIndex * screenWidth,
          animated: false,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [visible, initialIndex, images.length, screenWidth]);

  if (!visible || !images || images.length === 0) return null;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    if (screenWidth > 0) {
      const page = Math.round(offsetX / screenWidth);
      if (page >= 0 && page < images.length && page !== currentIndex) {
        setCurrentIndex(page);
      }
    }
  };

  const handleScrollToPage = (pageIndex: number, animated = true) => {
    if (pageIndex >= 0 && pageIndex < images.length) {
      setCurrentIndex(pageIndex);
      scrollViewRef.current?.scrollTo({
        x: pageIndex * screenWidth,
        animated,
      });
    }
  };

  const handlePrev = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (currentIndex > 0) {
      handleScrollToPage(currentIndex - 1, true);
    }
  };

  const handleNext = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (currentIndex < images.length - 1) {
      handleScrollToPage(currentIndex + 1, true);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
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

        {/* Carousel / Swiper Area */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleScroll}
            nestedScrollEnabled
            directionalLockEnabled
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {images.map((imgUrl, index) => (
              <View
                key={`slide_${index}`}
                style={[
                  styles.imageSlide,
                  { width: screenWidth, height: screenHeight * 0.76 },
                ]}
              >
                <Image
                  source={{ uri: imgUrl }}
                  style={[
                    styles.fullImage,
                    { width: screenWidth, height: '100%' },
                  ]}
                  contentFit="contain"
                  priority="high"
                  transition={150}
                />
              </View>
            ))}
          </ScrollView>

          {/* Left Arrow Button */}
          {images.length > 1 && currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navArrow, styles.navArrowLeft]}
              onPress={handlePrev}
              activeOpacity={0.8}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <ChevronLeft size={28} color={colors.white} />
            </TouchableOpacity>
          )}

          {/* Right Arrow Button */}
          {images.length > 1 && currentIndex < images.length - 1 && (
            <TouchableOpacity
              style={[styles.navArrow, styles.navArrowRight]}
              onPress={handleNext}
              activeOpacity={0.8}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <ChevronRight size={28} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Pagination Dots */}
        {images.length > 1 && (
          <View style={styles.footer}>
            <View style={styles.dotsContainer}>
              {images.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleScrollToPage(idx, true)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginBottom: 2,
  },
  counterText: {
    ...typography.microBold,
    color: colors.white,
    fontSize: 12.5,
    fontWeight: '700',
  },
  authorText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    maxWidth: 220,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
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
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  navArrowLeft: {
    left: spacing.sm,
  },
  navArrowRight: {
    right: spacing.sm,
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  dot: {
    height: 7,
    borderRadius: radii.full,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.white,
  },
  dotInactive: {
    width: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, radii, spacing, typography } from '../../theme';
import { ImageViewerModal } from '../modals/ImageViewerModal';

interface PostImageClusterProps {
  images: string[];
  authorName?: string;
  style?: ViewStyle;
}

export const PostImageCluster: React.FC<PostImageClusterProps> = ({
  images,
  authorName,
  style,
}) => {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || !Array.isArray(images) || images.length === 0) {
    return null;
  }

  const handlePressImage = (index: number, e: any) => {
    e.stopPropagation();
    setSelectedIndex(index);
    setViewerVisible(true);
  };

  const count = images.length;

  return (
    <>
      <View style={[styles.clusterContainer, style]}>
        {/* 1 Image: Full single hero card */}
        {count === 1 && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.singleImageWrapper}
            onPress={(e) => handlePressImage(0, e)}
          >
            <Image
              source={{ uri: images[0] }}
              style={styles.fullImage}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        )}

        {/* 2 Images: 2 equal side-by-side columns */}
        {count === 2 && (
          <View style={styles.twoImagesRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.halfImageWrapper}
              onPress={(e) => handlePressImage(0, e)}
            >
              <Image
                source={{ uri: images[0] }}
                style={styles.fullImage}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.halfImageWrapper}
              onPress={(e) => handlePressImage(1, e)}
            >
              <Image
                source={{ uri: images[1] }}
                style={styles.fullImage}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* 3 Images: 1 large left column + 2 stacked right column */}
        {count === 3 && (
          <View style={styles.threeImagesRow}>
            {/* Left large figure */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.threeLeftWrapper}
              onPress={(e) => handlePressImage(0, e)}
            >
              <Image
                source={{ uri: images[0] }}
                style={styles.fullImage}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>

            {/* Right 2 stacked figures */}
            <View style={styles.threeRightCol}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.threeRightItemWrapper}
                onPress={(e) => handlePressImage(1, e)}
              >
                <Image
                  source={{ uri: images[1] }}
                  style={styles.fullImage}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.threeRightItemWrapper}
                onPress={(e) => handlePressImage(2, e)}
              >
                <Image
                  source={{ uri: images[2] }}
                  style={styles.fullImage}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 4+ Images: 2x2 cluster grid */}
        {count >= 4 && (
          <View style={styles.fourImagesGrid}>
            {/* Top Row */}
            <View style={styles.gridRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.gridItemWrapper}
                onPress={(e) => handlePressImage(0, e)}
              >
                <Image
                  source={{ uri: images[0] }}
                  style={styles.fullImage}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.gridItemWrapper}
                onPress={(e) => handlePressImage(1, e)}
              >
                <Image
                  source={{ uri: images[1] }}
                  style={styles.fullImage}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>
            </View>

            {/* Bottom Row */}
            <View style={styles.gridRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.gridItemWrapper}
                onPress={(e) => handlePressImage(2, e)}
              >
                <Image
                  source={{ uri: images[2] }}
                  style={styles.fullImage}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.gridItemWrapper}
                onPress={(e) => handlePressImage(3, e)}
              >
                <Image
                  source={{ uri: images[3] }}
                  style={styles.fullImage}
                  contentFit="cover"
                  transition={200}
                />
                {count > 4 && (
                  <View style={styles.moreCountOverlay}>
                    <Text style={styles.moreCountText}>+{count - 3}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Interactive Full Screen Swipeable Modal */}
      <ImageViewerModal
        visible={viewerVisible}
        initialIndex={selectedIndex}
        images={images}
        authorName={authorName}
        onClose={() => setViewerVisible(false)}
      />
    </>
  );
};

const CLUSTER_HEIGHT = 240;

const styles = StyleSheet.create({
  clusterContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
  },
  fullImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundSecondary,
  },
  singleImageWrapper: {
    width: '100%',
    height: 250,
  },
  twoImagesRow: {
    flexDirection: 'row',
    height: 210,
    gap: 3,
  },
  halfImageWrapper: {
    flex: 1,
    height: '100%',
  },
  threeImagesRow: {
    flexDirection: 'row',
    height: CLUSTER_HEIGHT,
    gap: 3,
  },
  threeLeftWrapper: {
    flex: 1.1,
    height: '100%',
  },
  threeRightCol: {
    flex: 0.9,
    flexDirection: 'column',
    gap: 3,
  },
  threeRightItemWrapper: {
    flex: 1,
    width: '100%',
  },
  fourImagesGrid: {
    height: CLUSTER_HEIGHT,
    flexDirection: 'column',
    gap: 3,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  gridItemWrapper: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  moreCountOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCountText: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '700',
    fontSize: 22,
  },
});

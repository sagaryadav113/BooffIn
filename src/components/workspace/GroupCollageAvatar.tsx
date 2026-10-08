import React from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';

interface GroupCollageAvatarProps {
  size?: number;
  avatars?: string[];
  name?: string;
}

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
];

export const GroupCollageAvatar: React.FC<GroupCollageAvatarProps> = ({
  size = 48,
  avatars = [],
  name = 'Group',
}) => {
  const displayAvatars = avatars.length >= 2 ? avatars.slice(0, 4) : DEFAULT_AVATARS;
  const halfSize = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={styles.grid}>
        <View style={[styles.quadrant, { width: halfSize, height: halfSize }]}>
          <Image source={{ uri: displayAvatars[0] }} style={styles.image} />
        </View>
        <View style={[styles.quadrant, { width: halfSize, height: halfSize }]}>
          <Image source={{ uri: displayAvatars[1] }} style={styles.image} />
        </View>
        <View style={[styles.quadrant, { width: halfSize, height: halfSize }]}>
          <Image source={{ uri: displayAvatars[2] }} style={styles.image} />
        </View>
        <View style={[styles.quadrant, { width: halfSize, height: halfSize }]}>
          <Image source={{ uri: displayAvatars[3] }} style={styles.image} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
  },
  quadrant: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Avatar } from '../core/Avatar';

interface GroupCollageAvatarProps {
  size?: number;
  avatars?: string[];
  name?: string;
  avatarUrl?: string | null;
}

export const GroupCollageAvatar: React.FC<GroupCollageAvatarProps> = ({
  size = 48,
  avatars = [],
  name = 'Group',
  avatarUrl,
}) => {
  if (avatarUrl) {
    return <Avatar uri={avatarUrl} name={name} size={size} />;
  }

  const validAvatars = (avatars || []).filter(
    (a) => typeof a === 'string' && a.trim().length > 0
  );

  if (validAvatars.length >= 2) {
    const displayAvatars = validAvatars.slice(0, 4);
    const halfSize = size / 2;

    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={styles.grid}>
          {displayAvatars.map((uri, idx) => (
            <View key={idx} style={[styles.quadrant, { width: halfSize, height: halfSize }]}>
              <Image source={{ uri }} style={styles.image} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return <Avatar uri={undefined} name={name} size={size} />;
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

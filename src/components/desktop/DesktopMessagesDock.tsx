import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Search,
  Users,
  Edit3,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';

export const DesktopMessagesDock: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const currentUser = useAuthStore((s) => s.user);

  // Mock initial connections for desktop DM dock preview
  const sampleConversations = [
    {
      id: '1',
      name: 'Dr. Arjun Mehta',
      title: 'Computational Biology · NCBS',
      lastMessage: 'Let us connect on the synaptic plasticity dataset.',
      time: '2h',
      unread: true,
    },
    {
      id: '2',
      name: 'Dr. Elena Park',
      title: 'Neuroimmunology · Stanford',
      lastMessage: 'Shared a new preprint on microglial activation.',
      time: '1d',
      unread: false,
    },
    {
      id: '3',
      name: 'Dr. Sofia Almeida',
      title: 'AI for Drug Discovery · Oxford',
      lastMessage: 'The AlphaFold confidence intervals look solid.',
      time: '3d',
      unread: false,
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 28,
        width: 320,
        zIndex: 9999,
      }}
    >
      <View style={styles.dockContainer}>
        {/* Header Bar */}
        <TouchableOpacity
          id="booffin-desktop-messages-toggle"
          activeOpacity={0.9}
          onPress={() => setIsOpen(!isOpen)}
          style={styles.headerBar}
        >
          <View style={styles.headerLeft}>
            <Avatar
              uri={currentUser?.avatarUrl}
              name={currentUser?.fullName || 'User'}
              size="xs"
            />
            <Text style={styles.headerTitle}>Community & DMs</Text>
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>1</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {isOpen ? (
              <ChevronDown size={18} color="#475569" />
            ) : (
              <ChevronUp size={18} color="#475569" />
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Body */}
        {isOpen && (
          <View style={styles.expandedBody}>
            {/* Search Input */}
            <View style={styles.searchRow}>
              <Search size={14} color="#94A3B8" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search messages..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
              <TouchableOpacity activeOpacity={0.7} style={styles.newChatBtn}>
                <Edit3 size={15} color="#064E3B" />
              </TouchableOpacity>
            </View>

            {/* Conversations List */}
            <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
              {sampleConversations.map((conv) => (
                <TouchableOpacity
                  key={conv.id}
                  activeOpacity={0.7}
                  style={[
                    styles.conversationItem,
                    conv.unread && styles.conversationItemUnread,
                  ]}
                >
                  <Avatar name={conv.name} size="sm" />
                  <View style={styles.convMeta}>
                    <View style={styles.convNameRow}>
                      <Text style={styles.convName} numberOfLines={1}>
                        {conv.name}
                      </Text>
                      <Text style={styles.convTime}>{conv.time}</Text>
                    </View>
                    <Text style={styles.convLastMessage} numberOfLines={1}>
                      {conv.lastMessage}
                    </Text>
                  </View>
                  {conv.unread && <View style={styles.activeDot} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.footerNote}>
              <Users size={12} color="#94A3B8" />
              <Text style={styles.footerNoteText}>
                Encrypted academic messaging
              </Text>
            </View>
          </View>
        )}
      </View>
    </div>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  unreadBadge: {
    backgroundColor: '#064E3B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedBody: {
    height: 360,
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },
  newChatBtn: {
    padding: 4,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 10,
    position: 'relative',
  },
  conversationItemUnread: {
    backgroundColor: '#F0FDF4',
  },
  convMeta: {
    flex: 1,
  },
  convNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  convTime: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  convLastMessage: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#064E3B',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerNoteText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

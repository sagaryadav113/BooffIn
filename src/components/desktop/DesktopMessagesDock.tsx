import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Search,
  Users,
  Sparkles,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { getCollaborationRequests } from '../../api/connectionService';
import { CollaborationRequest } from '../../types';

export const DesktopMessagesDock: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState<CollaborationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    if (currentUser?.id && isOpen) {
      setIsLoading(true);
      getCollaborationRequests(currentUser.id)
        .then(({ incoming, outgoing }) => {
          setRequests([...incoming, ...outgoing]);
        })
        .finally(() => setIsLoading(false));
    }
  }, [currentUser?.id, isOpen]);

  const filtered = requests.filter((req) => {
    const otherUser = req.senderId === currentUser?.id ? req.recipient : req.sender;
    const name = otherUser?.fullName || otherUser?.handle || '';
    const topic = req.topic || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || topic.toLowerCase().includes(q);
  });

  const pendingCount = requests.filter((r) => r.status === 'pending' && r.recipientId === currentUser?.id).length;

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
              name={currentUser?.fullName || currentUser?.handle || 'User'}
              size="xs"
            />
            <Text style={styles.headerTitle}>Community & DMs</Text>
            {pendingCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{pendingCount}</Text>
              </View>
            )}
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
                placeholder="Search messages & topics..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
            </View>

            {/* Conversations List */}
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color="#064E3B" />
              </View>
            ) : filtered.length > 0 ? (
              <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
                {filtered.map((req) => {
                  const isIncoming = req.recipientId === currentUser?.id;
                  const otherUser = isIncoming ? req.sender : req.recipient;
                  const name = otherUser?.fullName || otherUser?.handle || 'Researcher';
                  const avatar = otherUser?.avatarUrl;
                  const isPending = req.status === 'pending' && isIncoming;

                  return (
                    <TouchableOpacity
                      key={req.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (otherUser?.id) {
                          router.push(`/profile/${otherUser.id}`);
                        }
                      }}
                      style={[
                        styles.conversationItem,
                        isPending && styles.conversationItemUnread,
                      ]}
                    >
                      <Avatar uri={avatar} name={name} size="sm" />
                      <View style={styles.convMeta}>
                        <View style={styles.convNameRow}>
                          <Text style={styles.convName} numberOfLines={1}>
                            {name}
                          </Text>
                          <Text style={styles.convTime}>{req.createdAt}</Text>
                        </View>
                        <Text style={styles.convTopic} numberOfLines={1}>
                          Topic: {req.topic}
                        </Text>
                        <Text style={styles.convLastMessage} numberOfLines={1}>
                          {req.message}
                        </Text>
                      </View>
                      {isPending && <View style={styles.activeDot} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Users size={28} color="#CBD5E1" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySub}>
                  Send collaboration proposals from researcher profiles or discussions to start messaging.
                </Text>
              </View>
            )}

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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
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
  convTopic: {
    fontSize: 11.5,
    color: '#064E3B',
    fontWeight: '600',
    marginTop: 1,
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

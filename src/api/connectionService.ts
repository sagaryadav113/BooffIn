import { supabase } from './client';
import {
  CollaborationRequest,
  CollaborationRequestStatus,
  ConnectionStatus,
  SendCollaborationRequestParams,
  UserProfile,
  Post,
} from '../types';
import { mockUsers, mockPosts } from '../data/mockData';
import { isLiveSupabaseConfigured } from './authService';

// In-memory / persistent mock store for collaboration requests
let memoryCollaborationRequests: CollaborationRequest[] = [
  {
    id: 'req_1',
    senderId: 'usr_3', // Dr. Elena Park
    recipientId: 'usr_me', // Current User
    topic: 'Functional Connectomics & Organoids',
    message: 'Saw your questions on synaptic plasticity in 3D cortical organoids. Would love to share our calcium imaging protocols and discuss potential dataset collaboration.',
    status: 'pending',
    createdAt: '1d ago',
  },
  {
    id: 'req_2',
    senderId: 'usr_me', // Current User
    recipientId: 'usr_1', // Dr. Aanya Rao
    topic: 'Two-Photon In Vivo Imaging',
    message: 'Hi Dr. Rao, I have been analyzing cross-layer dendritic reorganization in visual cortex models and would appreciate exchanging methodologies.',
    status: 'accepted',
    createdAt: '3d ago',
  },
];

function mapCollaborationRecord(record: any, senderProfile?: UserProfile, recipientProfile?: UserProfile): CollaborationRequest {
  return {
    id: record.id,
    senderId: record.sender_id,
    sender: senderProfile,
    recipientId: record.recipient_id,
    recipient: recipientProfile,
    topic: record.topic,
    message: record.message,
    status: record.status as CollaborationRequestStatus,
    createdAt: record.created_at
      ? new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Recently',
    updatedAt: record.updated_at,
  };
}

/**
 * Returns an array of research interests shared between two researchers
 */
export function getSharedResearchInterests(
  userA?: UserProfile | null,
  userB?: UserProfile | null
): string[] {
  if (!userA?.researchInterests || !userB?.researchInterests) {
    return [];
  }

  const interestsA = userA.researchInterests.map((i) => i.trim().toLowerCase());
  return userB.researchInterests.filter((interestB) =>
    interestsA.includes(interestB.trim().toLowerCase())
  );
}

/**
 * Aggregates topics discussed or referenced by a researcher from their posts & shared papers
 */
export function getResearcherDiscussedTopics(
  researcherId: string,
  allPosts?: Post[]
): { topic: string; count: number }[] {
  const postsPool = allPosts && allPosts.length > 0 ? allPosts : mockPosts;
  const userPosts = postsPool.filter((p) => p.author.id === researcherId);

  const topicCountMap: Record<string, number> = {};

  userPosts.forEach((post) => {
    // Collect from post tags
    if (Array.isArray(post.topics)) {
      post.topics.forEach((t) => {
        const clean = t.trim();
        if (clean) {
          topicCountMap[clean] = (topicCountMap[clean] || 0) + 1;
        }
      });
    }
    // Collect from referenced paper topics
    if (post.paper && Array.isArray(post.paper.topics)) {
      post.paper.topics.forEach((pt: any) => {
        const clean = typeof pt === 'string' ? pt.trim() : pt?.name?.trim?.() || '';
        if (clean) {
          topicCountMap[clean] = (topicCountMap[clean] || 0) + 1;
        }
      });
    }
  });

  // If user has direct research interests, include them as well
  const researcher = mockUsers.find((u) => u.id === researcherId);
  if (researcher?.researchInterests) {
    researcher.researchInterests.forEach((interest) => {
      if (!topicCountMap[interest]) {
        topicCountMap[interest] = 1;
      }
    });
  }

  return Object.entries(topicCountMap)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Checks connection status between current user (sender) and viewed researcher (recipient)
 */
export async function getConnectionStatus(
  currentUserId: string,
  targetUserId: string
): Promise<ConnectionStatus> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return 'none';
  }

  try {
    if (isLiveSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('collaboration_requests')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},recipient_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},recipient_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return 'none';
      }

      // Check for accepted connection first
      const accepted = data.find((r) => r.status === 'accepted');
      if (accepted) return 'connected';

      // Check for active pending request
      const pendingSent = data.find(
        (r) => r.sender_id === currentUserId && r.status === 'pending'
      );
      if (pendingSent) return 'pending_sent';

      const pendingReceived = data.find(
        (r) => r.recipient_id === currentUserId && r.status === 'pending'
      );
      if (pendingReceived) return 'pending_received';

      return 'none';
    }

    // Mock fallback
    const match = memoryCollaborationRequests.find(
      (r) =>
        (r.senderId === currentUserId && r.recipientId === targetUserId) ||
        (r.senderId === targetUserId && r.recipientId === currentUserId)
    );

    if (!match) return 'none';
    if (match.status === 'accepted') return 'connected';
    if (match.status === 'pending') {
      return match.senderId === currentUserId ? 'pending_sent' : 'pending_received';
    }
    return 'none';
  } catch {
    return 'none';
  }
}

/**
 * Send a new collaboration connection request
 */
export async function sendCollaborationRequest(
  senderId: string,
  params: SendCollaborationRequestParams
): Promise<{ success: boolean; request?: CollaborationRequest; error?: string }> {
  try {
    const cleanTopic = params.topic.trim();
    const cleanMessage = params.message.trim();

    if (!senderId || !params.recipientId) {
      return { success: false, error: 'Sender and recipient are required.' };
    }
    if (senderId === params.recipientId) {
      return { success: false, error: 'Cannot send collaboration request to yourself.' };
    }
    if (!cleanTopic) {
      return { success: false, error: 'Please specify a research topic.' };
    }
    if (!cleanMessage) {
      return { success: false, error: 'Please write a brief collaboration proposal or note.' };
    }

    if (isLiveSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('collaboration_requests')
        .insert({
          sender_id: senderId,
          recipient_id: params.recipientId,
          topic: cleanTopic,
          message: cleanMessage,
          status: 'pending',
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'You already have a pending collaboration request with this researcher for this topic.' };
        }
        return { success: false, error: error.message };
      }

      const created = mapCollaborationRecord(data);
      return { success: true, request: created };
    }

    // Mock Fallback
    const newReq: CollaborationRequest = {
      id: `req_${Date.now()}`,
      senderId,
      recipientId: params.recipientId,
      topic: cleanTopic,
      message: cleanMessage,
      status: 'pending',
      createdAt: 'Just now',
    };

    // Remove old matching request if existing
    memoryCollaborationRequests = [
      newReq,
      ...memoryCollaborationRequests.filter(
        (r) => !(r.senderId === senderId && r.recipientId === params.recipientId)
      ),
    ];

    return { success: true, request: newReq };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send collaboration request.' };
  }
}

/**
 * Accept or decline an incoming collaboration request
 */
export async function respondToCollaborationRequest(
  requestId: string,
  status: 'accepted' | 'declined'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (isLiveSupabaseConfigured()) {
      const { error } = await supabase
        .from('collaboration_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    }

    // Mock Fallback
    memoryCollaborationRequests = memoryCollaborationRequests.map((r) =>
      r.id === requestId ? { ...r, status, updatedAt: 'Just now' } : r
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update collaboration request.' };
  }
}

/**
 * Withdraw a pending collaboration request
 */
export async function withdrawCollaborationRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (isLiveSupabaseConfigured()) {
      const { error } = await supabase
        .from('collaboration_requests')
        .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    }

    // Mock Fallback
    memoryCollaborationRequests = memoryCollaborationRequests.filter((r) => r.id !== requestId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to withdraw collaboration request.' };
  }
}

/**
 * Retrieves all incoming and outgoing collaboration requests for a given user
 */
export async function getCollaborationRequests(
  userId: string
): Promise<{ incoming: CollaborationRequest[]; outgoing: CollaborationRequest[] }> {
  try {
    if (isLiveSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('collaboration_requests')
        .select(`
          *,
          sender:profiles!collaboration_requests_sender_id_fkey(*),
          recipient:profiles!collaboration_requests_recipient_id_fkey(*)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error || !data) {
        return { incoming: [], outgoing: [] };
      }

      const incoming: CollaborationRequest[] = [];
      const outgoing: CollaborationRequest[] = [];

      data.forEach((row) => {
        const req = mapCollaborationRecord(
          row,
          row.sender ? (row.sender as any) : undefined,
          row.recipient ? (row.recipient as any) : undefined
        );
        if (row.recipient_id === userId) {
          incoming.push(req);
        } else {
          outgoing.push(req);
        }
      });

      return { incoming, outgoing };
    }

    // Mock Fallback
    const incoming = memoryCollaborationRequests
      .filter((r) => r.recipientId === userId)
      .map((r) => ({
        ...r,
        sender: mockUsers.find((u) => u.id === r.senderId),
        recipient: mockUsers.find((u) => u.id === r.recipientId),
      }));

    const outgoing = memoryCollaborationRequests
      .filter((r) => r.senderId === userId)
      .map((r) => ({
        ...r,
        sender: mockUsers.find((u) => u.id === r.senderId),
        recipient: mockUsers.find((u) => u.id === r.recipientId),
      }));

    return { incoming, outgoing };
  } catch {
    return { incoming: [], outgoing: [] };
  }
}

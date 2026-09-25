import { supabase } from './client';
import {
  CollaborationRequest,
  CollaborationRequestStatus,
  ConnectionStatus,
  SendCollaborationRequestParams,
  UserProfile,
  Post,
} from '../types';
import { isLiveSupabaseConfigured } from './authService';
import { sanitizeTextContent } from '../utils/security';

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
  allPosts: Post[] = []
): { topic: string; count: number }[] {
  const userPosts = allPosts.filter((p) => p.author.id === researcherId);
  const topicCountMap: Record<string, number> = {};

  userPosts.forEach((post) => {
    if (Array.isArray(post.topics)) {
      post.topics.forEach((t) => {
        const clean = t.trim();
        if (clean) {
          topicCountMap[clean] = (topicCountMap[clean] || 0) + 1;
        }
      });
    }
    if (post.paper && Array.isArray(post.paper.topics)) {
      post.paper.topics.forEach((pt: any) => {
        const clean = typeof pt === 'string' ? pt.trim() : pt?.name?.trim?.() || '';
        if (clean) {
          topicCountMap[clean] = (topicCountMap[clean] || 0) + 1;
        }
      });
    }
  });

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

    const accepted = data.find((r) => r.status === 'accepted');
    if (accepted) return 'connected';

    const pendingSent = data.find(
      (r) => r.sender_id === currentUserId && r.status === 'pending'
    );
    if (pendingSent) return 'pending_sent';

    const pendingReceived = data.find(
      (r) => r.recipient_id === currentUserId && r.status === 'pending'
    );
    if (pendingReceived) return 'pending_received';

    return 'none';
  } catch {
    return 'none';
  }
}

/**
 * Send a new collaboration connection request
 */
export async function sendCollaborationRequest(
  _senderId: string,
  params: SendCollaborationRequestParams
): Promise<{ success: boolean; request?: CollaborationRequest; error?: string }> {
  try {
    const cleanTopic = sanitizeTextContent(params.topic, 200);
    const cleanMessage = sanitizeTextContent(params.message, 2000);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required to send collaboration request.' };
    }
    const verifiedSenderId = user.id;

    if (!params.recipientId) {
      return { success: false, error: 'Recipient is required.' };
    }
    if (verifiedSenderId === params.recipientId) {
      return { success: false, error: 'Cannot send collaboration request to yourself.' };
    }
    if (!cleanTopic) {
      return { success: false, error: 'Please specify a research topic.' };
    }
    if (!cleanMessage) {
      return { success: false, error: 'Please write a brief collaboration proposal or note.' };
    }

    const { data, error } = await supabase
      .from('collaboration_requests')
      .insert({
        sender_id: verifiedSenderId,
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required.' };
    }

    const { error } = await supabase
      .from('collaboration_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('recipient_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required.' };
    }

    const { error } = await supabase
      .from('collaboration_requests')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('sender_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

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
  if (!userId) return { incoming: [], outgoing: [] };

  try {
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
  } catch {
    return { incoming: [], outgoing: [] };
  }
}

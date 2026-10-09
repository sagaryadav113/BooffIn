import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../api/client';

export type CallSignalType = 'audio' | 'video';

export interface IncomingCallPayload {
  roomId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  callerTitle?: string | null;
  callType: CallSignalType;
  timestamp: number;
}

export interface SignalingCallbacks {
  onIncomingCall?: (payload: IncomingCallPayload) => void;
  onCallAccepted?: (calleeId: string) => void;
  onCallRejected?: (reason: string) => void;
  onSdpOffer?: (sdp: any, senderId: string) => void;
  onSdpAnswer?: (sdp: any, senderId: string) => void;
  onIceCandidate?: (candidate: any, senderId: string) => void;
  onPeerMediaToggle?: (state: { isMuted?: boolean; isVideoOff?: boolean }) => void;
  onCallHangup?: () => void;
}

class WebRTCSignalingManager {
  private activeChannels: Map<string, RealtimeChannel> = new Map();
  private userGlobalChannel: RealtimeChannel | null = null;
  private currentRoomId: string | null = null;

  /**
   * Listen for incoming calls targeted to the current user
   * (Zero-storage, ephemeral in-memory Realtime broadcast)
   */
  public listenForIncomingCalls(
    userId: string,
    onIncoming: (call: IncomingCallPayload) => void
  ): () => void {
    if (this.userGlobalChannel) {
      this.userGlobalChannel.unsubscribe();
      this.userGlobalChannel = null;
    }

    const channelName = `p2p_signaling_user_${userId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'incoming_call' }, (res: any) => {
      const payload: IncomingCallPayload = res.payload;
      if (payload && payload.roomId && payload.callerId !== userId) {
        onIncoming(payload);
      }
    });

    channel.subscribe();
    this.userGlobalChannel = channel;

    return () => {
      channel.unsubscribe();
      if (this.userGlobalChannel === channel) {
        this.userGlobalChannel = null;
      }
    };
  }

  /**
   * Ring recipient device with an ephemeral call offer
   */
  public async ringRecipient(
    recipientUserId: string,
    payload: IncomingCallPayload
  ): Promise<void> {
    const targetChannelName = `p2p_signaling_user_${recipientUserId}`;
    const channel = supabase.channel(targetChannelName, {
      config: { broadcast: { self: false } },
    });

    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'incoming_call',
      payload,
    });

    // Cleanup ephemeral sender channel after firing
    setTimeout(() => {
      channel.unsubscribe();
    }, 2000);
  }

  /**
   * Join a private, ephemeral room for P2P WebRTC handshake
   */
  public joinCallRoom(
    roomId: string,
    currentUserId: string,
    callbacks: SignalingCallbacks
  ): () => void {
    this.currentRoomId = roomId;

    const channelName = `p2p_call_room_${roomId}`;
    let channel = this.activeChannels.get(roomId);

    if (channel) {
      channel.unsubscribe();
    }

    channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    // 1. Call Accepted
    channel.on('broadcast', { event: 'call_accepted' }, (res: any) => {
      if (res.payload?.senderId !== currentUserId) {
        callbacks.onCallAccepted?.(res.payload?.senderId);
      }
    });

    // 2. Call Rejected
    channel.on('broadcast', { event: 'call_rejected' }, (res: any) => {
      if (res.payload?.senderId !== currentUserId) {
        callbacks.onCallRejected?.(res.payload?.reason || 'declined');
      }
    });

    // 3. SDP Offer (WebRTC Handshake)
    channel.on('broadcast', { event: 'sdp_offer' }, (res: any) => {
      if (res.payload?.senderId !== currentUserId && res.payload?.sdp) {
        callbacks.onSdpOffer?.(res.payload.sdp, res.payload.senderId);
      }
    });

    // 4. SDP Answer (WebRTC Handshake)
    channel.on('broadcast', { event: 'sdp_answer' }, (res: any) => {
      if (res.payload?.senderId !== currentUserId && res.payload?.sdp) {
        callbacks.onSdpAnswer?.(res.payload.sdp, res.payload.senderId);
      }
    });

    // 5. ICE Candidate (P2P Network Routing)
    channel.on('broadcast', { event: 'ice_candidate' }, (res: any) => {
      if (res.payload?.senderId !== currentUserId && res.payload?.candidate) {
        callbacks.onIceCandidate?.(res.payload.candidate, res.payload.senderId);
      }
    });

    // 6. Media State Toggle (Mute/Video)
    channel.on('broadcast', { event: 'media_toggle' }, (res: any) => {
      if (res.payload?.senderId !== currentUserId) {
        callbacks.onPeerMediaToggle?.({
          isMuted: res.payload?.isMuted,
          isVideoOff: res.payload?.isVideoOff,
        });
      }
    });

    // 7. Call Hangup
    channel.on('broadcast', { event: 'call_hangup' }, (res: any) => {
      if (res.payload?.senderId !== currentUserId) {
        callbacks.onCallHangup?.();
      }
    });

    channel.subscribe();
    this.activeChannels.set(roomId, channel);

    return () => {
      this.leaveCallRoom(roomId, currentUserId);
    };
  }

  /**
   * Send ephemeral signal in current call room
   */
  public async sendSignal(
    roomId: string,
    event: 'call_accepted' | 'call_rejected' | 'sdp_offer' | 'sdp_answer' | 'ice_candidate' | 'media_toggle' | 'call_hangup',
    payload: any
  ): Promise<void> {
    const channel = this.activeChannels.get(roomId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  }

  /**
   * Leave call room and destroy ephemeral broadcast channels
   */
  public leaveCallRoom(roomId: string, currentUserId: string): void {
    const channel = this.activeChannels.get(roomId);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'call_hangup',
        payload: { senderId: currentUserId, roomId },
      }).catch(() => {});

      channel.unsubscribe();
      this.activeChannels.delete(roomId);
    }
    if (this.currentRoomId === roomId) {
      this.currentRoomId = null;
    }
  }
}

export const webrtcSignaling = new WebRTCSignalingManager();

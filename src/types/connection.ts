import { UserProfile } from './user';

export type CollaborationRequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected';

export interface CollaborationRequest {
  id: string;
  senderId: string;
  sender?: UserProfile;
  recipientId: string;
  recipient?: UserProfile;
  topic: string;
  message: string;
  status: CollaborationRequestStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface SendCollaborationRequestParams {
  recipientId: string;
  topic: string;
  message: string;
}

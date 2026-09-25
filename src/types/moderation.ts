export type ReportType = 'post' | 'comment' | 'profile' | 'system_issue';
export type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other' | string;
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

export interface ContentReport {
  id: string;
  reporterId: string;
  reportedType: ReportType;
  reportedId: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  createdAt: string;
}

export interface UserBlock {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface CreateReportParams {
  reportedType: ReportType;
  reportedId: string;
  reason: ReportReason;
  details?: string;
}

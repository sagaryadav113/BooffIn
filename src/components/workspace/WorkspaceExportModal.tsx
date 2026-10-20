import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  Alert,
} from 'react-native';
import {
  X,
  FileText,
  Share2,
  Copy,
  Check,
  Scroll,
  BookOpen,
  Code,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Workspace, WorkspaceMessage, WorkspaceMember } from '../../types/workspace';
import { useColors, useIsDark } from '../../theme';

interface WorkspaceExportModalProps {
  visible: boolean;
  onClose: () => void;
  workspace: Workspace;
  messages: WorkspaceMessage[];
  members: WorkspaceMember[];
}

export type ExportFormat = 'lab_record' | 'markdown' | 'json';

export const WorkspaceExportModal: React.FC<WorkspaceExportModalProps> = ({
  visible,
  onClose,
  workspace,
  messages,
  members,
}) => {
  const colors = useColors();
  const isDark = useIsDark();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('lab_record');
  const [isCopied, setIsCopied] = useState(false);

  // Generate formatted export content
  const exportData = useMemo(() => {
    const podName = workspace.name || 'Research Pod';
    const exportedAt = new Date().toLocaleString();
    const isE2EE = workspace.e2ee_enabled ?? true;

    // 1. JSON Export
    if (selectedFormat === 'json') {
      const payload = {
        exportVersion: '1.0',
        exportedAt: new Date().toISOString(),
        pod: {
          id: workspace.id,
          name: podName,
          type: workspace.type,
          description: workspace.description,
          e2ee: isE2EE,
          createdAt: workspace.created_at,
        },
        members: members.map((m) => ({
          userId: m.user_id,
          role: m.role,
          name: m.profile?.fullName,
          handle: m.profile?.handle,
          orcidVerified: m.profile?.orcidVerified,
          institution: m.profile?.institution,
        })),
        messages: messages.map((m) => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.sender?.fullName,
          content: m.content,
          type: m.message_type,
          doi: m.doi_metadata?.doi || null,
          createdAt: m.created_at,
        })),
      };
      return JSON.stringify(payload, null, 2);
    }

    // 2. Standard Markdown Log
    if (selectedFormat === 'markdown') {
      let md = `# Discussion Log: ${podName}\n`;
      md += `**Date Exported:** ${exportedAt}\n\n`;
      md += `## Messages (${messages.length})\n\n`;
      messages.forEach((m) => {
        const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sender = m.sender?.fullName || 'Researcher';
        md += `- **[${time}] ${sender}:** ${m.content}\n`;
      });
      return md;
    }

    // 3. Academic Lab Record (Comprehensive Markdown Report)
    let record = `# 🔬 BOOFFIN ACADEMIC RESEARCH RECORD\n`;
    record += `### ${podName.toUpperCase()}\n`;
    record += `*Confidential Inner Circle Pod • ${isE2EE ? 'End-to-End Encrypted' : 'Standard'} Record*\n\n`;
    record += `> **Generated on:** ${exportedAt}\n`;
    record += `> **Pod ID:** \`${workspace.id}\`\n`;
    if (workspace.description) {
      record += `> **Research Scope:** ${workspace.description}\n`;
    }
    record += `\n---\n\n`;

    // Members Section
    record += `## 👥 Pod Roster & Research Collaborators (${members.length})\n\n`;
    members.forEach((m) => {
      const roleStr = m.role ? m.role.toUpperCase() : 'MEMBER';
      const orcid = m.profile?.orcidVerified ? ' [ORCID Verified ✓]' : '';
      const affil = m.profile?.institution ? ` (${m.profile.institution})` : '';
      record += `- **${m.profile?.fullName || 'Researcher'}** (@${m.profile?.handle || 'user'})${affil}${orcid} — \`${roleStr}\`\n`;
    });
    record += `\n---\n\n`;

    // DOIs & Papers Section
    const doiMessages = messages.filter((m) => Boolean(m.doi_metadata));
    if (doiMessages.length > 0) {
      record += `## 📄 Referenced Literature & Preprints (${doiMessages.length})\n\n`;
      doiMessages.forEach((m) => {
        const d = m.doi_metadata!;
        record += `### ${d.title}\n`;
        record += `- **DOI:** [${d.doi}](https://doi.org/${d.doi})\n`;
        if (d.journal) record += `- **Journal:** ${d.journal} (${d.publicationYear || ''})\n`;
        if (d.authors && d.authors.length > 0) {
          record += `- **Authors:** ${d.authors.map((a) => a.name).join(', ')}\n`;
        }
        if (d.abstract) {
          record += `> *${d.abstract.slice(0, 200)}...*\n`;
        }
        record += `\n`;
      });
      record += `---\n\n`;
    }

    // Discussion Transcript
    record += `## 💬 Chronological Discussion Transcript\n\n`;
    if (messages.length === 0) {
      record += `*No discussion messages recorded in this pod session.*\n`;
    } else {
      messages.forEach((m) => {
        const time = new Date(m.created_at).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const sender = m.sender?.fullName || 'Researcher';
        const role = members.find((mem) => mem.user_id === m.sender_id)?.role || 'member';

        record += `#### [${time}] ${sender} (${role})\n`;
        record += `${m.content}\n\n`;
      });
    }

    record += `---\n`;
    record += `*End of Academic Pod Record. Generated via BooffIn Academic Network.*`;
    return record;
  }, [selectedFormat, workspace, messages, members]);

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(exportData);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);

    if (Platform.OS === 'web') {
      window.alert('Pod record copied to clipboard!');
    }
  };

  // Handle Share Transcript
  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      await Share.share({
        title: `${workspace.name || 'Research Pod'} - Academic Record`,
        message: exportData,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BookOpen size={20} color={isDark ? '#10B981' : '#164E3F'} strokeWidth={2.2} />
              <Text style={styles.modalTitle}>Export Pod Record</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Generate an archival lab notebook transcript, reference bibliography, and contributor log.
          </Text>

          {/* Format Selector Pills */}
          <View style={styles.formatPillsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedFormat('lab_record')}
              style={[
                styles.formatPill,
                selectedFormat === 'lab_record' && styles.formatPillActive,
              ]}
            >
              <Scroll
                size={14}
                color={selectedFormat === 'lab_record' ? (isDark ? '#06281E' : '#FFFFFF') : (isDark ? '#94A3B8' : '#164E3F')}
              />
              <Text
                style={[
                  styles.formatPillText,
                  selectedFormat === 'lab_record' && styles.formatPillTextActive,
                ]}
              >
                Lab Record (.md)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedFormat('markdown')}
              style={[
                styles.formatPill,
                selectedFormat === 'markdown' && styles.formatPillActive,
              ]}
            >
              <FileText
                size={14}
                color={selectedFormat === 'markdown' ? (isDark ? '#06281E' : '#FFFFFF') : (isDark ? '#94A3B8' : '#164E3F')}
              />
              <Text
                style={[
                  styles.formatPillText,
                  selectedFormat === 'markdown' && styles.formatPillTextActive,
                ]}
              >
                Simple Log
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedFormat('json')}
              style={[
                styles.formatPill,
                selectedFormat === 'json' && styles.formatPillActive,
              ]}
            >
              <Code
                size={14}
                color={selectedFormat === 'json' ? (isDark ? '#06281E' : '#FFFFFF') : (isDark ? '#94A3B8' : '#164E3F')}
              />
              <Text
                style={[
                  styles.formatPillText,
                  selectedFormat === 'json' && styles.formatPillTextActive,
                ]}
              >
                JSON Data
              </Text>
            </TouchableOpacity>
          </View>

          {/* Live Preview Box */}
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Live Transcript Preview</Text>
              <Text style={styles.previewLength}>
                {messages.length} messages • {exportData.length} chars
              </Text>
            </View>
            <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={true}>
              <Text style={styles.previewText} selectable>
                {exportData}
              </Text>
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCopy}
              style={[styles.actionBtn, styles.copyBtn]}
            >
              {isCopied ? (
                <>
                  <Check size={16} color={isDark ? '#34D399' : '#164E3F'} strokeWidth={2.5} />
                  <Text style={styles.copyBtnTextActive}>Copied!</Text>
                </>
              ) : (
                <>
                  <Copy size={16} color={isDark ? '#34D399' : '#164E3F'} />
                  <Text style={styles.copyBtnText}>Copy Text</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleShare}
              style={[styles.actionBtn, styles.shareBtn]}
            >
              <Share2 size={16} color={isDark ? '#06281E' : '#FFFFFF'} strokeWidth={2.2} />
              <Text style={styles.shareBtnText}>Share Record</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '85%',
      backgroundColor: isDark ? '#161B26' : '#FFFFFF',
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? '#2E384D' : 'transparent',
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? '#F8FAFC' : '#0F172A',
      letterSpacing: -0.3,
    },
    closeBtn: {
      padding: 4,
    },
    modalSubtitle: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
      lineHeight: 18,
      marginBottom: 16,
    },
    formatPillsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    formatPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#1F2636' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#2E384D' : '#E2E8F0',
    },
    formatPillActive: {
      backgroundColor: isDark ? '#10B981' : '#164E3F',
      borderColor: isDark ? '#10B981' : '#164E3F',
    },
    formatPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#164E3F',
    },
    formatPillTextActive: {
      color: isDark ? '#06281E' : '#FFFFFF',
      fontWeight: '700',
    },
    previewContainer: {
      backgroundColor: isDark ? '#0B0F17' : '#0F172A',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      maxHeight: 280,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? '#1F2636' : 'transparent',
    },
    previewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1F2636' : '#334155',
      paddingBottom: 8,
      marginBottom: 8,
    },
    previewTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    previewLength: {
      fontSize: 11,
      color: '#64748B',
    },
    previewScroll: {
      maxHeight: 220,
    },
    previewText: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      fontSize: 11,
      lineHeight: 17,
      color: '#E2E8F0',
    },
    actionButtonsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
    },
    copyBtn: {
      backgroundColor: isDark ? '#10B9811A' : '#F0FDF4',
      borderWidth: 1.5,
      borderColor: isDark ? '#10B981' : '#A7F3D0',
    },
    copyBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#34D399' : '#164E3F',
    },
    copyBtnTextActive: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? '#34D399' : '#164E3F',
    },
    shareBtn: {
      backgroundColor: isDark ? '#10B981' : '#164E3F',
    },
    shareBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#06281E' : '#FFFFFF',
    },
  });

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Images, Camera, Link2 } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Button } from '../core/Button';
import {
  pickPostImages,
  capturePostImage,
  uploadPostImage,
} from '../../api/storageService';

export interface ImageAttachmentModalProps {
  visible: boolean;
  onClose: () => void;
  onImagesSelected: (urls: string[]) => void;
  userId?: string;
  maxImages?: number;
  existingCount?: number;
}

export const ImageAttachmentModal: React.FC<ImageAttachmentModalProps> = ({
  visible,
  onClose,
  onImagesSelected,
  userId,
  maxImages = 4,
  existingCount = 0,
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);

  const handleClose = () => {
    if (isUploading) return;
    setShowUrlInput(false);
    setImageUrlInput('');
    setUploadProgressText(null);
    onClose();
  };

  const handlePickFromLibrary = async () => {
    const remainingSlots = Math.max(1, maxImages - existingCount);
    const pickResult = await pickPostImages(remainingSlots);

    if (pickResult.error) {
      Alert.alert('Photos Access', pickResult.error);
      return;
    }

    if (pickResult.cancelled || !pickResult.assets || pickResult.assets.length === 0) {
      return;
    }

    if (!userId) {
      // Return local asset URIs if userId is not yet known
      const uris = pickResult.assets.slice(0, remainingSlots).map((a) => a.uri);
      onImagesSelected(uris);
      handleClose();
      return;
    }

    setIsUploading(true);
    try {
      const assetsToUpload = pickResult.assets.slice(0, remainingSlots);
      const newUrls: string[] = [];

      for (let i = 0; i < assetsToUpload.length; i++) {
        setUploadProgressText(
          assetsToUpload.length > 1
            ? `Uploading ${i + 1} of ${assetsToUpload.length}...`
            : 'Uploading image...'
        );
        const uploadRes = await uploadPostImage(userId, assetsToUpload[i]);
        if (uploadRes.success && uploadRes.url) {
          newUrls.push(uploadRes.url);
        } else if (uploadRes.error) {
          Alert.alert('Upload Issue', uploadRes.error || 'Failed to upload photo.');
        }
      }

      if (newUrls.length > 0) {
        onImagesSelected(newUrls);
        handleClose();
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'An error occurred during photo upload.');
    } finally {
      setIsUploading(false);
      setUploadProgressText(null);
    }
  };

  const handleCaptureCamera = async () => {
    const captureResult = await capturePostImage();

    if (captureResult.error) {
      Alert.alert('Camera Access', captureResult.error);
      return;
    }

    if (captureResult.cancelled || !captureResult.asset) {
      return;
    }

    if (!userId) {
      onImagesSelected([captureResult.asset.uri]);
      handleClose();
      return;
    }

    setIsUploading(true);
    setUploadProgressText('Uploading photo...');
    try {
      const uploadRes = await uploadPostImage(userId, captureResult.asset);
      if (uploadRes.success && uploadRes.url) {
        onImagesSelected([uploadRes.url]);
        handleClose();
      } else {
        Alert.alert('Upload Failed', uploadRes.error || 'Could not upload photo.');
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'An error occurred during photo upload.');
    } finally {
      setIsUploading(false);
      setUploadProgressText(null);
    }
  };

  const handleAddUrlImage = () => {
    const trimmed = imageUrlInput.trim();
    if (trimmed) {
      onImagesSelected([trimmed]);
      handleClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {isUploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="large" color={colors.accentLink} />
                  <Text style={styles.uploadingText}>
                    {uploadProgressText || 'Uploading media...'}
                  </Text>
                </View>
              ) : !showUrlInput ? (
                <>
                  <Text style={styles.modalTitle}>Add Figure / Image</Text>
                  <Text style={styles.modalSubtitle}>
                    Select a scientific diagram, microscope scan, chart, or photo.
                  </Text>

                  <View style={styles.imageOptionsList}>
                    {/* Option 1: Choose from Phone Storage / Photo Library */}
                    <TouchableOpacity
                      style={styles.imageOptionItem}
                      onPress={handlePickFromLibrary}
                      activeOpacity={0.75}
                    >
                      <View style={styles.imageOptionIconWrap}>
                        <Images size={22} color={colors.textPrimary} />
                      </View>
                      <View style={styles.imageOptionTextWrap}>
                        <Text style={styles.imageOptionTitle}>Photo Library</Text>
                        <Text style={styles.imageOptionDesc}>
                          Upload directly from your phone storage
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Option 2: Camera */}
                    <TouchableOpacity
                      style={styles.imageOptionItem}
                      onPress={handleCaptureCamera}
                      activeOpacity={0.75}
                    >
                      <View style={styles.imageOptionIconWrap}>
                        <Camera size={22} color={colors.textPrimary} />
                      </View>
                      <View style={styles.imageOptionTextWrap}>
                        <Text style={styles.imageOptionTitle}>Take Photo</Text>
                        <Text style={styles.imageOptionDesc}>
                          Capture diagram or figure with camera
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Option 3: Image URL */}
                    <TouchableOpacity
                      style={styles.imageOptionItem}
                      onPress={() => setShowUrlInput(true)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.imageOptionIconWrap}>
                        <Link2 size={22} color={colors.textPrimary} />
                      </View>
                      <View style={styles.imageOptionTextWrap}>
                        <Text style={styles.imageOptionTitle}>Image Link (URL)</Text>
                        <Text style={styles.imageOptionDesc}>
                          Paste an online image or journal figure URL
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <Button
                    title="Cancel"
                    variant="secondary"
                    size="sm"
                    onPress={handleClose}
                    style={{ marginTop: spacing.md }}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Paste Image Link</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter a direct URL for your diagram, chart, or scientific figure.
                  </Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="https://example.com/figure.png"
                    placeholderTextColor={colors.textMuted}
                    value={imageUrlInput}
                    onChangeText={setImageUrlInput}
                    autoCapitalize="none"
                    autoFocus
                  />

                  <View style={styles.modalBtnRow}>
                    <Button
                      title="Back"
                      variant="secondary"
                      size="sm"
                      onPress={() => setShowUrlInput(false)}
                      style={{ flex: 1, marginRight: spacing.sm }}
                    />
                    <Button
                      title="Attach"
                      variant="primary"
                      size="sm"
                      onPress={handleAddUrlImage}
                      disabled={!imageUrlInput.trim()}
                      style={{ flex: 1.5 }}
                    />
                  </View>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: '92%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 4,
    fontWeight: '700',
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontSize: 13,
    lineHeight: 18,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: spacing.md,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  imageOptionsList: {
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  imageOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
  },
  imageOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  imageOptionTextWrap: {
    flex: 1,
  },
  imageOptionTitle: {
    ...typography.captionBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  imageOptionDesc: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  uploadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  uploadingText: {
    ...typography.captionBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
});

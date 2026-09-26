import * as ImagePicker from 'expo-image-picker';
import { supabase } from './client';
import { useAuthStore } from '../store/useAuthStore';

export const PROFILE_MEDIA_BUCKET = 'profile-media';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/jpg',
];

export interface PickImageOptions {
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
}

export interface ImageValidationResult {
  isValid: boolean;
  error: string | null;
  mimeType: string;
  sizeBytes?: number;
}

export interface UploadMediaResult {
  success: boolean;
  url: string | null;
  error: string | null;
}

/**
 * Validates selected image asset against allowed MIME types and max size limit (5MB)
 */
export function validateImage(
  asset: ImagePicker.ImagePickerAsset,
  blobSize?: number
): ImageValidationResult {
  const mimeType = (asset.mimeType || 'image/jpeg').toLowerCase();

  // Check MIME Type
  const isValidMime = ALLOWED_MIME_TYPES.some((allowed) =>
    mimeType.startsWith(allowed) || allowed === mimeType
  );

  if (!isValidMime) {
    return {
      isValid: false,
      error: 'Invalid file format. Please choose a JPG, PNG, WebP, or GIF image.',
      mimeType,
    };
  }

  // Check file size if available from asset or blob
  const size = blobSize || asset.fileSize;
  if (size && size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
      mimeType,
      sizeBytes: size,
    };
  }

  return {
    isValid: true,
    error: null,
    mimeType,
    sizeBytes: size,
  };
}

/**
 * Prompts user to pick an image from their gallery/library
 */
export async function pickImageFromLibrary(
  options: PickImageOptions = {}
): Promise<{ cancelled: boolean; asset: ImagePicker.ImagePickerAsset | null; error: string | null }> {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      return {
        cancelled: true,
        asset: null,
        error: 'Permission to access photos was denied. Please enable photos access in settings.',
      };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect,
      quality: options.quality ?? 0.85,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { cancelled: true, asset: null, error: null };
    }

    return {
      cancelled: false,
      asset: result.assets[0],
      error: null,
    };
  } catch (err: any) {
    return {
      cancelled: true,
      asset: null,
      error: err.message || 'Failed to open image picker.',
    };
  }
}

/**
 * Prompts user to pick an avatar image (1:1 square crop)
 */
export async function pickAvatarImage(): Promise<{
  cancelled: boolean;
  asset: ImagePicker.ImagePickerAsset | null;
  error: string | null;
}> {
  return pickImageFromLibrary({
    aspect: [1, 1],
    quality: 0.85,
    allowsEditing: true,
  });
}

/**
 * Prompts user to pick a banner/cover image (3:1 panoramic aspect)
 */
export async function pickBannerImage(): Promise<{
  cancelled: boolean;
  asset: ImagePicker.ImagePickerAsset | null;
  error: string | null;
}> {
  return pickImageFromLibrary({
    aspect: [3, 1],
    quality: 0.85,
    allowsEditing: true,
  });
}

/**
 * Converts image URI to ArrayBuffer for reliable cross-platform upload to Supabase Storage
 */
async function uriToArrayBuffer(uri: string): Promise<{ data: ArrayBuffer; size: number }> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const size = blob.size;
  const arrayBuffer = await response.arrayBuffer();
  return { data: arrayBuffer, size };
}

/**
 * Uploads user profile avatar to Supabase Storage and updates public.profiles
 */
export async function uploadProfileAvatar(
  userId: string,
  asset: ImagePicker.ImagePickerAsset,
  onProgress?: (progress: number) => void
): Promise<UploadMediaResult> {
  try {
    if (!userId) {
      return { success: false, url: null, error: 'User must be authenticated.' };
    }

    if (onProgress) onProgress(0.1);

    // 1. Read binary data
    const { data: fileData, size } = await uriToArrayBuffer(asset.uri);

    // 2. Validate file size and MIME type
    const validation = validateImage(asset, size);
    if (!validation.isValid) {
      return { success: false, url: null, error: validation.error };
    }

    if (onProgress) onProgress(0.3);

    // 3. Determine file extension
    const ext = validation.mimeType.split('/')[1] || 'jpg';
    const cleanExt = ext === 'jpeg' ? 'jpg' : ext;
    const fileName = `avatar_${Date.now()}.${cleanExt}`;
    const filePath = `${userId}/${fileName}`;

    if (onProgress) onProgress(0.5);

    // 4. Upload to Supabase Storage (RLS enforces user owns folder {userId}/*)
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_MEDIA_BUCKET)
      .upload(filePath, fileData, {
        contentType: validation.mimeType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage avatar upload error:', uploadError);
      return {
        success: false,
        url: null,
        error: uploadError.message || 'Failed to upload profile photo to storage.',
      };
    }

    if (onProgress) onProgress(0.8);

    // 5. Get public URL
    const { data: publicData } = supabase.storage
      .from(PROFILE_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicData.publicUrl;

    // 6. Update database record with has_custom_avatar = true
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        has_custom_avatar: true,
      })
      .eq('id', userId);

    if (dbError) {
      console.warn('Database avatar update error:', dbError);
    }

    // 7. Update auth store state
    useAuthStore.getState().updateProfile({
      avatarUrl: publicUrl,
      hasCustomAvatar: true,
    });

    if (onProgress) onProgress(1.0);

    return {
      success: true,
      url: publicUrl,
      error: null,
    };
  } catch (err: any) {
    return {
      success: false,
      url: null,
      error: err.message || 'An unexpected error occurred during photo upload.',
    };
  }
}

/**
 * Removes user profile avatar from profile and sets has_custom_avatar = true
 */
export async function removeProfileAvatar(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!userId) {
      return { success: false, error: 'User must be authenticated.' };
    }

    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        has_custom_avatar: true,
      })
      .eq('id', userId);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    useAuthStore.getState().updateProfile({
      avatarUrl: undefined,
      hasCustomAvatar: true,
    });

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to remove profile photo.',
    };
  }
}

/**
 * Uploads user profile banner to Supabase Storage and updates public.profiles
 */
export async function uploadProfileBanner(
  userId: string,
  asset: ImagePicker.ImagePickerAsset,
  onProgress?: (progress: number) => void
): Promise<UploadMediaResult> {
  try {
    if (!userId) {
      return { success: false, url: null, error: 'User must be authenticated.' };
    }

    if (onProgress) onProgress(0.1);

    // 1. Read binary data
    const { data: fileData, size } = await uriToArrayBuffer(asset.uri);

    // 2. Validate file size and MIME type
    const validation = validateImage(asset, size);
    if (!validation.isValid) {
      return { success: false, url: null, error: validation.error };
    }

    if (onProgress) onProgress(0.3);

    // 3. Determine file extension
    const ext = validation.mimeType.split('/')[1] || 'jpg';
    const cleanExt = ext === 'jpeg' ? 'jpg' : ext;
    const fileName = `banner_${Date.now()}.${cleanExt}`;
    const filePath = `${userId}/${fileName}`;

    if (onProgress) onProgress(0.5);

    // 4. Upload to Supabase Storage (RLS enforces user owns folder {userId}/*)
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_MEDIA_BUCKET)
      .upload(filePath, fileData, {
        contentType: validation.mimeType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage banner upload error:', uploadError);
      return {
        success: false,
        url: null,
        error: uploadError.message || 'Failed to upload banner to storage.',
      };
    }

    if (onProgress) onProgress(0.8);

    // 5. Get public URL
    const { data: publicData } = supabase.storage
      .from(PROFILE_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicData.publicUrl;

    // 6. Update database record with has_custom_banner = true
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        banner_url: publicUrl,
        has_custom_banner: true,
      })
      .eq('id', userId);

    if (dbError) {
      console.warn('Database banner update error:', dbError);
    }

    // 7. Update auth store state
    useAuthStore.getState().updateProfile({
      bannerUrl: publicUrl,
      hasCustomBanner: true,
    });

    if (onProgress) onProgress(1.0);

    return {
      success: true,
      url: publicUrl,
      error: null,
    };
  } catch (err: any) {
    return {
      success: false,
      url: null,
      error: err.message || 'An unexpected error occurred during banner upload.',
    };
  }
}

/**
 * Removes user profile banner from profile and sets has_custom_banner = true
 */
export async function removeProfileBanner(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!userId) {
      return { success: false, error: 'User must be authenticated.' };
    }

    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        banner_url: null,
        has_custom_banner: true,
      })
      .eq('id', userId);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    useAuthStore.getState().updateProfile({
      bannerUrl: undefined,
      hasCustomBanner: true,
    });

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to remove banner image.',
    };
  }
}

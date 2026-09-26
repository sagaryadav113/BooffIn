import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
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
 * Infers MIME type from asset URI if mimeType is undefined
 */
function inferMimeType(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.mimeType) return asset.mimeType.toLowerCase();
  const uri = asset.uri.toLowerCase();
  if (uri.endsWith('.png')) return 'image/png';
  if (uri.endsWith('.webp')) return 'image/webp';
  if (uri.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/**
 * Decodes base64 string to Uint8Array for binary upload
 */
function decodeBase64ToUint8Array(base64: string): Uint8Array {
  // If atob is available (Web, Hermes, modern React Native)
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Pure JS fallback decoding
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bufferLength = base64.length * 0.75;
  if (base64.endsWith('==')) bufferLength -= 2;
  else if (base64.endsWith('=')) bufferLength -= 1;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = chars.indexOf(base64[i]);
    const encoded2 = chars.indexOf(base64[i + 1]);
    const encoded3 = chars.indexOf(base64[i + 2]);
    const encoded4 = chars.indexOf(base64[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64 && encoded3 !== -1) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (encoded4 !== 64 && encoded4 !== -1) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return bytes;
}

/**
 * Validates selected image asset against allowed MIME types and max size limit (5MB)
 */
export function validateImage(
  asset: ImagePicker.ImagePickerAsset,
  calculatedSize?: number
): ImageValidationResult {
  const mimeType = inferMimeType(asset);

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

  // Check file size if available from asset, calculatedSize, or base64 length
  const size = calculatedSize || asset.fileSize || (asset.base64 ? asset.base64.length * 0.75 : undefined);
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
 * Prompts user to pick an image from their gallery/library with base64 enabled for mobile reliability
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
      base64: true, // Crucial for React Native storage uploads
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
 * Converts image asset to binary data (Uint8Array / ArrayBuffer / Blob) cross-platform
 */
async function getAssetBinaryData(
  asset: ImagePicker.ImagePickerAsset
): Promise<{ data: Uint8Array | ArrayBuffer | Blob; size: number }> {
  // 1. If base64 is available (standard in Expo ImagePicker when base64: true)
  if (asset.base64) {
    const bytes = decodeBase64ToUint8Array(asset.base64);
    return { data: bytes, size: bytes.byteLength };
  }

  // 2. Web fallback (blob / arrayBuffer)
  if (Platform.OS === 'web' || typeof window !== 'undefined') {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    return { data: blob, size: blob.size };
  }

  // 3. Mobile fallback
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  return { data: blob, size: blob.size || asset.fileSize || 0 };
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
    const { data: fileData, size } = await getAssetBinaryData(asset);

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

    // 4. Upload to Supabase Storage
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

    // 5. Get public URL with timestamp cache buster
    const { data: publicData } = supabase.storage
      .from(PROFILE_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = `${publicData.publicUrl}?t=${Date.now()}`;

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

    // 7. Update auth store state and cache
    await useAuthStore.getState().updateProfile({
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
    console.error('uploadProfileAvatar unexpected error:', err);
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

    await useAuthStore.getState().updateProfile({
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
    const { data: fileData, size } = await getAssetBinaryData(asset);

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

    // 4. Upload to Supabase Storage
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

    // 5. Get public URL with timestamp cache buster
    const { data: publicData } = supabase.storage
      .from(PROFILE_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = `${publicData.publicUrl}?t=${Date.now()}`;

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

    // 7. Update auth store state and cache
    await useAuthStore.getState().updateProfile({
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
    console.error('uploadProfileBanner unexpected error:', err);
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

    await useAuthStore.getState().updateProfile({
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

/**
 * Prompts user to pick one or more images from their photo library for a post
 */
export async function pickPostImages(
  maxSelection: number = 4
): Promise<{
  cancelled: boolean;
  assets: ImagePicker.ImagePickerAsset[];
  error: string | null;
}> {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      return {
        cancelled: true,
        assets: [],
        error: 'Permission to access photos was denied. Please allow photo access in your phone settings.',
      };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, maxSelection),
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { cancelled: true, assets: [], error: null };
    }

    return {
      cancelled: false,
      assets: result.assets,
      error: null,
    };
  } catch (err: any) {
    return {
      cancelled: true,
      assets: [],
      error: err?.message || 'Failed to open photo library.',
    };
  }
}

/**
 * Prompts user to capture a new photo with the camera for a post
 */
export async function capturePostImage(): Promise<{
  cancelled: boolean;
  asset: ImagePicker.ImagePickerAsset | null;
  error: string | null;
}> {
  try {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      return {
        cancelled: true,
        asset: null,
        error: 'Permission to access camera was denied. Please allow camera access in your phone settings.',
      };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
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
      error: err?.message || 'Failed to open camera.',
    };
  }
}

/**
 * Uploads a single post image asset directly to Supabase Storage bucket 'profile-media'
 * and returns the public CDN URL.
 */
export async function uploadPostImage(
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
    const { data: fileData, size } = await getAssetBinaryData(asset);

    // 2. Validate file size and MIME type
    const validation = validateImage(asset, size);
    if (!validation.isValid) {
      return { success: false, url: null, error: validation.error };
    }

    if (onProgress) onProgress(0.3);

    // 3. Determine file extension and random safe filename
    const ext = validation.mimeType.split('/')[1] || 'jpg';
    const cleanExt = ext === 'jpeg' ? 'jpg' : ext;
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileName = `post_${Date.now()}_${randomSuffix}.${cleanExt}`;
    const filePath = `${userId}/posts/${fileName}`;

    if (onProgress) onProgress(0.5);

    // 4. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_MEDIA_BUCKET)
      .upload(filePath, fileData, {
        contentType: validation.mimeType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage post image upload error:', uploadError);
      return {
        success: false,
        url: null,
        error: uploadError.message || 'Failed to upload image to storage.',
      };
    }

    if (onProgress) onProgress(0.8);

    // 5. Get public URL
    const { data: publicData } = supabase.storage
      .from(PROFILE_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicData.publicUrl;

    if (onProgress) onProgress(1.0);

    return {
      success: true,
      url: publicUrl,
      error: null,
    };
  } catch (err: any) {
    console.error('uploadPostImage unexpected error:', err);
    return {
      success: false,
      url: null,
      error: err.message || 'An unexpected error occurred during image upload.',
    };
  }
}

/**
 * Uploads multiple post images in parallel or sequence, returning successful public URLs
 */
export async function uploadMultiplePostImages(
  userId: string,
  assets: ImagePicker.ImagePickerAsset[],
  onProgress?: (completed: number, total: number) => void
): Promise<{ urls: string[]; errors: string[] }> {
  const urls: string[] = [];
  const errors: string[] = [];
  let completed = 0;

  for (const asset of assets) {
    const result = await uploadPostImage(userId, asset);
    completed++;
    if (onProgress) onProgress(completed, assets.length);

    if (result.success && result.url) {
      urls.push(result.url);
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { urls, errors };
}


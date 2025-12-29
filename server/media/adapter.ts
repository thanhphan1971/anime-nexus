export interface UploadUrlRequest {
  userId: string;
  contentType: string;
  sizeBytes: number;
  kind: 'post' | 'story' | 'avatar' | 'card';
}

export interface UploadUrlResponse {
  signedUrl: string;
  objectKey: string;
  expiresAt: Date;
}

export interface FinalizeUploadRequest {
  userId: string;
  objectKey: string;
  kind: 'post' | 'story' | 'avatar' | 'card';
  metadata?: Record<string, any>;
}

export interface FinalizeUploadResponse {
  publicUrl: string;
  objectKey: string;
}

export interface MediaAdapter {
  getSignedUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResponse>;
  finalizeUpload(request: FinalizeUploadRequest): Promise<FinalizeUploadResponse>;
  deleteObject(objectKey: string): Promise<void>;
  getPublicUrl(objectKey: string): string;
}

export function getMediaAdapter(): MediaAdapter {
  const provider = process.env.MEDIA_PROVIDER || 'supabase';
  
  if (provider === 'r2') {
    // Check if R2 is configured
    if (!process.env.CLOUDFLARE_R2_ACCOUNT_ID) {
      console.warn('[Media] R2 requested but not configured, falling back to Supabase');
      const { SupabaseStorageAdapter } = require('./supabaseStorageAdapter');
      return new SupabaseStorageAdapter();
    }
    const { R2StorageAdapter } = require('./r2StorageAdapter');
    return new R2StorageAdapter();
  }
  
  const { SupabaseStorageAdapter } = require('./supabaseStorageAdapter');
  return new SupabaseStorageAdapter();
}

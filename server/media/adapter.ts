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
    throw new Error('R2 adapter not yet implemented. Set MEDIA_PROVIDER=supabase for beta.');
  }
  
  const { SupabaseStorageAdapter } = require('./supabaseStorageAdapter');
  return new SupabaseStorageAdapter();
}

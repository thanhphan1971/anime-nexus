import type { MediaAdapter, UploadUrlRequest, UploadUrlResponse, FinalizeUploadRequest, FinalizeUploadResponse } from './adapter';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { nanoid } from 'nanoid';

const BUCKET_NAME = 'media';

const BUCKET_PATHS: Record<string, string> = {
  post: 'posts',
  story: 'stories',
  avatar: 'avatars',
  card: 'cards',
};

const EXPIRY_SECONDS = 3600;

export class SupabaseStorageAdapter implements MediaAdapter {
  async getSignedUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResponse> {
    const { userId, contentType, kind } = request;
    
    const extension = this.getExtensionFromMimeType(contentType);
    const filename = `${nanoid()}.${extension}`;
    const objectKey = `${BUCKET_PATHS[kind]}/${userId}/${filename}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(objectKey, {
        upsert: false,
      });
    
    if (error || !data) {
      console.error('Supabase signed URL error:', error);
      throw new Error(`Failed to create upload URL: ${error?.message || 'Unknown error'}`);
    }
    
    const expiresAt = new Date(Date.now() + EXPIRY_SECONDS * 1000);
    
    return {
      signedUrl: data.signedUrl,
      objectKey,
      expiresAt,
    };
  }
  
  async finalizeUpload(request: FinalizeUploadRequest): Promise<FinalizeUploadResponse> {
    const { objectKey } = request;
    
    const { data: fileData } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(objectKey.split('/').slice(0, -1).join('/'), {
        search: objectKey.split('/').pop(),
      });
    
    if (!fileData || fileData.length === 0) {
      throw new Error('File not found after upload');
    }
    
    const publicUrl = this.getPublicUrl(objectKey);
    
    return {
      publicUrl,
      objectKey,
    };
  }
  
  async deleteObject(objectKey: string): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([objectKey]);
    
    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete object: ${error.message}`);
    }
  }
  
  getPublicUrl(objectKey: string): string {
    const { data } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(objectKey);
    
    return data.publicUrl;
  }
  
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    };
    return mimeToExt[mimeType] || 'bin';
  }
}

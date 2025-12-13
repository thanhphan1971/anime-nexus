import type { MediaAdapter, UploadUrlRequest, UploadUrlResponse, FinalizeUploadRequest, FinalizeUploadResponse } from './adapter';

export class R2StorageAdapter implements MediaAdapter {
  async getSignedUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResponse> {
    throw new Error('R2 adapter not yet implemented. Coming at launch.');
  }
  
  async finalizeUpload(request: FinalizeUploadRequest): Promise<FinalizeUploadResponse> {
    throw new Error('R2 adapter not yet implemented. Coming at launch.');
  }
  
  async deleteObject(objectKey: string): Promise<void> {
    throw new Error('R2 adapter not yet implemented. Coming at launch.');
  }
  
  getPublicUrl(objectKey: string): string {
    throw new Error('R2 adapter not yet implemented. Coming at launch.');
  }
}

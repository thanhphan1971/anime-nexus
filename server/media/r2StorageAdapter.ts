import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { MediaAdapter, UploadUrlRequest, UploadUrlResponse, FinalizeUploadRequest, FinalizeUploadResponse } from './adapter';
import { nanoid } from 'nanoid';

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;

function getR2Client(): S3Client {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Cloudflare R2 credentials not configured. Set CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY.');
  }
  
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

function getBucketName(): string {
  if (!R2_BUCKET_NAME) {
    throw new Error('R2 bucket name not configured. Set CLOUDFLARE_R2_BUCKET_NAME.');
  }
  return R2_BUCKET_NAME;
}

function getObjectKeyForKind(userId: string, kind: string, contentType: string): string {
  const extension = contentType.split('/')[1] || 'bin';
  const uniqueId = nanoid(12);
  const timestamp = Date.now();
  
  switch (kind) {
    case 'avatar':
      return `avatars/${userId}/${timestamp}-${uniqueId}.${extension}`;
    case 'post':
      return `posts/${userId}/${timestamp}-${uniqueId}.${extension}`;
    case 'story':
      return `stories/${userId}/${timestamp}-${uniqueId}.${extension}`;
    case 'card':
      return `cards/${timestamp}-${uniqueId}.${extension}`;
    default:
      return `misc/${userId}/${timestamp}-${uniqueId}.${extension}`;
  }
}

export class R2StorageAdapter implements MediaAdapter {
  private client: S3Client;
  
  constructor() {
    this.client = getR2Client();
  }
  
  async getSignedUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResponse> {
    const objectKey = getObjectKeyForKind(request.userId, request.kind, request.contentType);
    const expiresIn = 3600; // 1 hour
    
    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: objectKey,
      ContentType: request.contentType,
      ContentLength: request.sizeBytes,
    });
    
    const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    return {
      signedUrl,
      objectKey,
      expiresAt,
    };
  }
  
  async finalizeUpload(request: FinalizeUploadRequest): Promise<FinalizeUploadResponse> {
    const publicUrl = this.getPublicUrl(request.objectKey);
    
    return {
      publicUrl,
      objectKey: request.objectKey,
    };
  }
  
  async deleteObject(objectKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: objectKey,
    });
    
    await this.client.send(command);
  }
  
  getPublicUrl(objectKey: string): string {
    if (!R2_PUBLIC_URL) {
      throw new Error('R2 public URL not configured. Set CLOUDFLARE_R2_PUBLIC_URL.');
    }
    
    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
    return `${baseUrl}/${objectKey}`;
  }
}

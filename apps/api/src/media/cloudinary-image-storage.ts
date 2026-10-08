import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryImageResourceSchema } from './cloudinary.schemas';

const ALLOWED_FORMATS = 'jpg,jpeg,png,webp';

export interface CloudinaryUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  uploadPreset: string;
  publicId: string;
  allowedFormats: string;
}

export interface CloudinaryImageResource {
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

@Injectable()
export class CloudinaryImageStorage {
  constructor(private readonly config: ConfigService) {}

  createUploadSignature(publicId: string): CloudinaryUploadSignature {
    const credentials = this.credentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
      allowed_formats: ALLOWED_FORMATS,
      overwrite: false,
      public_id: publicId,
      timestamp,
      upload_preset: credentials.uploadPreset,
    };
    const signature = cloudinary.utils.api_sign_request(
      params,
      credentials.apiSecret,
    );

    return {
      cloudName: credentials.cloudName,
      apiKey: credentials.apiKey,
      timestamp,
      signature,
      uploadPreset: credentials.uploadPreset,
      publicId,
      allowedFormats: ALLOWED_FORMATS,
    };
  }

  async getImageResource(publicId: string): Promise<CloudinaryImageResource> {
    const credentials = this.credentials();
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });

    const resource: unknown = await cloudinary.api.resource(publicId, {
      resource_type: 'image',
    });
    return cloudinaryImageResourceSchema.parse(resource);
  }

  private credentials() {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    const uploadPreset = this.config.get<string>('CLOUDINARY_UPLOAD_PRESET');
    if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
      throw new ServiceUnavailableException(
        'Configura Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET y CLOUDINARY_UPLOAD_PRESET) en la API',
      );
    }
    return { cloudName, apiKey, apiSecret, uploadPreset };
  }
}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { MediaController } from './media.controller';
import { CloudinaryImageStorage } from './cloudinary-image-storage';
import { MediaService } from './media.service';

@Module({
  imports: [AuthModule, CatalogModule],
  controllers: [MediaController],
  providers: [CloudinaryImageStorage, MediaService],
})
export class MediaModule {}

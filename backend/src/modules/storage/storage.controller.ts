import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }),
  )
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Please provide a file to upload');
    }
    const result = await this.storageService.saveMedia(file);
    return {
      success: true,
      ...result,
    };
  }

  @Get('stats')
  async getStats() {
    return this.storageService.getStorageStats();
  }

  @Delete(':filename')
  async deleteFile(@Param('filename') filename: string) {
    const deleted = await this.storageService.deleteMedia(filename);
    return { success: deleted };
  }
}

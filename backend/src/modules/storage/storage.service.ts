import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredMediaResult {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly mediaDir = path.join(process.cwd(), 'uploads', 'media');
  private readonly receiptsDir = path.join(process.cwd(), 'uploads', 'receipts');

  constructor() {
    if (!fs.existsSync(this.mediaDir)) {
      fs.mkdirSync(this.mediaDir, { recursive: true });
    }
    if (!fs.existsSync(this.receiptsDir)) {
      fs.mkdirSync(this.receiptsDir, { recursive: true });
    }
  }

  /**
   * Save uploaded campaign or bot media (images, videos, audio, documents)
   */
  async saveMedia(file: any): Promise<StoredMediaResult> {
    if (!file) throw new BadRequestException('No file provided');

    // Allowed extensions and MIME types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'audio/mpeg',
      'audio/ogg',
      'application/pdf',
      'application/zip',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported media type: ${file.mimetype}. Allowed: Images (JPG/PNG/WEBP/GIF), Videos (MP4), Audios (MP3/OGG), Documents (PDF/ZIP).`,
      );
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeFilename = `media_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const destinationPath = path.join(this.mediaDir, safeFilename);

    await fs.promises.writeFile(destinationPath, file.buffer);
    this.logger.log(`Media file saved: ${safeFilename} (${(file.size / 1024).toFixed(1)} KB)`);

    return {
      url: `/uploads/media/${safeFilename}`,
      filename: safeFilename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Delete media file
   */
  async deleteMedia(filename: string): Promise<boolean> {
    const safeName = path.basename(filename);
    const targetPath = path.join(this.mediaDir, safeName);

    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
      this.logger.log(`Deleted media file: ${safeName}`);
      return true;
    }
    return false;
  }

  /**
   * Check total storage usage
   */
  async getStorageStats() {
    let totalBytes = 0;
    let fileCount = 0;

    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const stats = fs.statSync(path.join(dir, entry.name));
          totalBytes += stats.size;
          fileCount++;
        }
      }
    };

    scanDir(this.mediaDir);
    scanDir(this.receiptsDir);

    return {
      totalFiles: fileCount,
      totalBytes,
      totalMegaBytes: (totalBytes / (1024 * 1024)).toFixed(2),
      mediaFolder: this.mediaDir,
      receiptsFolder: this.receiptsDir,
    };
  }
}

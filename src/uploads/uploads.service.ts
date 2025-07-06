import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadsService {
    private readonly logger = new Logger(UploadsService.name);
    private readonly uploadsDir = join(process.cwd(), 'uploads');

    constructor() {
        // Ensure uploads directory exists
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
            this.logger.log(`Created uploads directory at ${this.uploadsDir}`);
        }
    }

    /**
     * Get the absolute path to an uploaded file
     * @param filename The filename of the uploaded file
     * @returns The absolute path to the file
     */
    getFilePath(filename: string): string {
        return join(this.uploadsDir, filename);
    }

    /**
     * Delete an uploaded file
     * @param filename The filename of the uploaded file to delete
     * @returns True if the file was deleted, false otherwise
     */
    async deleteFile(filename: string): Promise<boolean> {
        const filePath = this.getFilePath(filename);

        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                this.logger.log(`Deleted file: ${filePath}`);
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error(`Failed to delete file ${filePath}: ${error.message}`);
            return false;
        }
    }
} 
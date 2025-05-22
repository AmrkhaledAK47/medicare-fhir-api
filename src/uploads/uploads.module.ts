import { Module, Global } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';

const storageDirectory = './uploads';

// Create uploads directory if it doesn't exist
if (!existsSync(storageDirectory)) {
    mkdirSync(storageDirectory, { recursive: true });
}

@Global()
@Module({
    imports: [
        MulterModule.register({
            storage: diskStorage({
                destination: (req, file, cb) => {
                    cb(null, storageDirectory);
                },
                filename: (req, file, cb) => {
                    // Generate a unique filename with original extension
                    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                    const ext = extname(file.originalname);
                    cb(null, `${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                // Accept only image files
                if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
                    return cb(new Error('Only image files are allowed!'), false);
                }
                cb(null, true);
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB max file size
            },
        }),
    ],
    exports: [MulterModule],
})
export class UploadsModule { } 
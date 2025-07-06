import { Controller, Post, UseInterceptors, UploadedFile, Get, Param, Res, Delete, UseGuards, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { Response } from 'express';
import * as fs from 'fs';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
    private readonly logger = new Logger(UploadsController.name);

    constructor(private readonly uploadsService: UploadsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Upload a file' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'File uploaded successfully' })
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: any) {
        this.logger.log(`File uploaded: ${file.filename}`);
        return {
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            url: `/uploads/${file.filename}`,
        };
    }

    @Get(':filename')
    @ApiOperation({ summary: 'Get an uploaded file' })
    @ApiResponse({ status: 200, description: 'File returned successfully' })
    @ApiResponse({ status: 404, description: 'File not found' })
    async getFile(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = this.uploadsService.getFilePath(filename);

        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }

        return res.status(404).send({ message: 'File not found' });
    }

    @Delete(':filename')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete an uploaded file' })
    @ApiResponse({ status: 200, description: 'File deleted successfully' })
    @ApiResponse({ status: 404, description: 'File not found' })
    async deleteFile(@Param('filename') filename: string) {
        const deleted = await this.uploadsService.deleteFile(filename);

        if (deleted) {
            return { message: 'File deleted successfully' };
        }

        return { message: 'File not found or could not be deleted' };
    }
} 
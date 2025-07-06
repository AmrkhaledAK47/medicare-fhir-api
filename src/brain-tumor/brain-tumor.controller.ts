import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UseInterceptors,
    UploadedFile,
    Query,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiConsumes,
    ApiBody,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
    ApiResponse,
    ApiOkResponse,
    ApiCreatedResponse,
} from '@nestjs/swagger';
import { BrainTumorService } from './brain-tumor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/schemas/user.schema';
import { BrainScanDto } from './dto/brain-scan.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Express } from 'express';

@ApiTags('Brain Tumor Detection')
@Controller('brain-tumor')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BrainTumorController {
    constructor(private readonly brainTumorService: BrainTumorService) { }

    @Post('upload')
    @ApiOperation({ summary: 'Upload a brain MRI scan for tumor detection' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Brain MRI scan image (JPEG, PNG)',
                },
                patientId: {
                    type: 'string',
                    description: 'FHIR Patient resource ID (optional, defaults to current user if patient)',
                },
            },
        },
    })
    @ApiCreatedResponse({
        description: 'Brain scan uploaded and processing initiated',
        type: BrainScanDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB max file size
            },
            fileFilter: (req, file, callback) => {
                // Only accept image files
                if (!file.mimetype.includes('image')) {
                    return callback(new BadRequestException('Only image files are allowed'), false);
                }
                callback(null, true);
            },
        }),
    )
    async uploadBrainScan(
        @UploadedFile() file: any,
        @Query('patientId') patientId: string,
        @CurrentUser() user: User,
    ) {
        // Determine the patient ID to use
        let targetPatientId = patientId;

        // If no patientId provided and current user is a patient, use their linked FHIR ID
        if (!targetPatientId && user.role === UserRole.PATIENT && user.fhirResourceId) {
            targetPatientId = user.fhirResourceId;
        }

        // Validate that we have a patientId
        if (!targetPatientId) {
            throw new BadRequestException('Patient ID is required');
        }

        // If user is a patient, they can only upload for themselves
        if (user.role === UserRole.PATIENT && user.fhirResourceId !== targetPatientId) {
            throw new BadRequestException('You can only upload scans for yourself');
        }

        return this.brainTumorService.processBrainScan(targetPatientId, file);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a brain scan by ID' })
    @ApiParam({ name: 'id', description: 'Brain scan ID' })
    @ApiOkResponse({
        description: 'Brain scan details',
        type: BrainScanDto,
    })
    async getBrainScan(@Param('id') id: string, @CurrentUser() user: User) {
        const brainScan = await this.brainTumorService.getBrainScanById(id);

        // If user is a patient, they can only view their own scans
        if (user.role === UserRole.PATIENT && user.fhirResourceId !== brainScan.patientId) {
            throw new BadRequestException('You can only view your own scans');
        }

        return brainScan;
    }

    @Get('patient/:patientId')
    @ApiOperation({ summary: 'Get all brain scans for a patient' })
    @ApiParam({ name: 'patientId', description: 'FHIR Patient resource ID' })
    @ApiOkResponse({
        description: 'List of brain scans',
        type: [BrainScanDto],
    })
    async getPatientBrainScans(
        @Param('patientId') patientId: string,
        @CurrentUser() user: User,
    ) {
        // If user is a patient, they can only view their own scans
        if (user.role === UserRole.PATIENT && user.fhirResourceId !== patientId) {
            throw new BadRequestException('You can only view your own scans');
        }

        return this.brainTumorService.getBrainScansByPatientId(patientId);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Delete a brain scan' })
    @ApiParam({ name: 'id', description: 'Brain scan ID' })
    @ApiOkResponse({
        description: 'Brain scan deleted successfully',
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    example: 'Brain scan deleted successfully',
                },
            },
        },
    })
    async deleteBrainScan(@Param('id') id: string) {
        return this.brainTumorService.deleteBrainScan(id);
    }
} 
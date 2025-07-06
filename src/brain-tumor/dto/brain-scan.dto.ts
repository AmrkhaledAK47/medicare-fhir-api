import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DetectionStatus, TumorType } from '../schemas/brain-scan.schema';

export class BrainScanDto {
    @ApiProperty({ description: 'Brain scan ID' })
    id: string;

    @ApiProperty({ description: 'FHIR Patient resource ID' })
    patientId: string;

    @ApiProperty({ description: 'Path to the scan image' })
    scanImagePath: string;

    @ApiPropertyOptional({ description: 'Path to the thumbnail image' })
    thumbnailPath?: string;

    @ApiProperty({
        description: 'Detection status',
        enum: DetectionStatus,
        example: DetectionStatus.COMPLETED,
    })
    status: DetectionStatus;

    @ApiPropertyOptional({
        description: 'Date and time when detection was completed',
        type: Date,
    })
    detectedAt?: Date;

    @ApiProperty({
        description: 'Whether a tumor was detected',
        type: Boolean,
        example: true,
    })
    tumorDetected: boolean;

    @ApiPropertyOptional({
        description: 'Type of tumor detected',
        enum: TumorType,
        example: TumorType.GLIOMA,
    })
    tumorType?: TumorType;

    @ApiPropertyOptional({
        description: 'Confidence score of the detection (0-1)',
        type: Number,
        minimum: 0,
        maximum: 1,
        example: 0.95,
    })
    confidence?: number;

    @ApiPropertyOptional({
        description: 'Raw detection result from the AI model',
        type: Object,
    })
    detectionResult?: Record<string, any>;

    @ApiPropertyOptional({
        description: 'FHIR Observation resource ID',
    })
    fhirObservationId?: string;

    @ApiPropertyOptional({
        description: 'FHIR DiagnosticReport resource ID',
    })
    fhirDiagnosticReportId?: string;

    @ApiPropertyOptional({
        description: 'Error message if detection failed',
    })
    errorMessage?: string;

    @ApiPropertyOptional({
        description: 'Tumor bounding box coordinates',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                x: { type: 'number' },
                y: { type: 'number' },
            },
        },
        example: [
            { x: 100, y: 120 },
            { x: 150, y: 120 },
            { x: 150, y: 170 },
            { x: 100, y: 170 },
        ],
    })
    tumorBoundingBox?: { x: number; y: number }[];

    @ApiPropertyOptional({
        description: 'Additional metadata',
        type: Object,
    })
    metadata?: Record<string, any>;

    @ApiProperty({
        description: 'Creation timestamp',
        type: Date,
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Last update timestamp',
        type: Date,
    })
    updatedAt: Date;
} 
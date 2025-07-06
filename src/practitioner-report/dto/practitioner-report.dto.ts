import { ApiProperty } from '@nestjs/swagger';

export class ReportPatientDto {
    @ApiProperty({ description: 'Patient ID', example: 'patient-123' })
    id: string;

    @ApiProperty({ description: 'Patient name', example: 'Alice Smith' })
    name: string;
}

export class PractitionerReportDto {
    @ApiProperty({ description: 'Report ID', example: 'report-123' })
    id: string;

    @ApiProperty({ description: 'Report title', example: 'MRI Brain Scan Results' })
    title: string;

    @ApiProperty({ description: 'Report date', example: '2023-06-10T14:30:00Z' })
    date: string;

    @ApiProperty({
        description: 'Patient information',
        type: ReportPatientDto
    })
    patient: ReportPatientDto;

    @ApiProperty({
        description: 'Report type',
        example: 'diagnostic-imaging',
        enum: ['diagnostic-imaging', 'laboratory', 'pathology', 'clinical-note']
    })
    type: string;

    @ApiProperty({
        description: 'Report status',
        example: 'final',
        enum: ['preliminary', 'final', 'amended', 'entered-in-error']
    })
    status: string;
} 
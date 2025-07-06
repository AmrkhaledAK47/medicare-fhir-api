import { ApiProperty } from '@nestjs/swagger';

export class LabResultPatientDto {
    @ApiProperty({ description: 'Patient ID', example: 'patient-123' })
    id: string;

    @ApiProperty({ description: 'Patient name', example: 'Alice Smith' })
    name: string;
}

export class PractitionerLabResultDto {
    @ApiProperty({ description: 'Lab result ID', example: 'lab-result-123' })
    id: string;

    @ApiProperty({ description: 'Lab test name', example: 'Hemoglobin A1c' })
    name: string;

    @ApiProperty({ description: 'Result value', example: '7.2' })
    value: string;

    @ApiProperty({
        description: 'Result unit',
        example: '%',
        required: false
    })
    unit?: string;

    @ApiProperty({
        description: 'Reference range',
        example: '4.0-5.6',
        required: false
    })
    referenceRange?: string;

    @ApiProperty({
        description: 'Result status',
        example: 'high',
        enum: ['normal', 'high', 'low', 'critical', 'unknown']
    })
    status: string;

    @ApiProperty({
        description: 'Patient information',
        type: LabResultPatientDto
    })
    patient: LabResultPatientDto;

    @ApiProperty({ description: 'Date of the lab test', example: '2023-06-10T14:30:00Z' })
    date: string;
} 
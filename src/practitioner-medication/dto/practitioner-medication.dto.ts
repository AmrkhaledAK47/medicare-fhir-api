import { ApiProperty } from '@nestjs/swagger';

export class MedicationPatientDto {
    @ApiProperty({ description: 'Patient ID', example: 'patient-123' })
    id: string;

    @ApiProperty({ description: 'Patient name', example: 'Alice Smith' })
    name: string;
}

export class PractitionerMedicationDto {
    @ApiProperty({ description: 'Medication ID', example: 'medication-123' })
    id: string;

    @ApiProperty({ description: 'Medication name', example: 'Lisinopril' })
    name: string;

    @ApiProperty({ description: 'Dosage instructions', example: '10mg once daily' })
    dosage: string;

    @ApiProperty({
        description: 'Patient information',
        type: MedicationPatientDto
    })
    patient: MedicationPatientDto;

    @ApiProperty({
        description: 'Status of the medication',
        example: 'active',
        enum: ['active', 'completed', 'entered-in-error', 'stopped']
    })
    status: string;

    @ApiProperty({ description: 'Date prescribed', example: '2023-06-01T14:30:00Z' })
    datePrescribed: string;
} 
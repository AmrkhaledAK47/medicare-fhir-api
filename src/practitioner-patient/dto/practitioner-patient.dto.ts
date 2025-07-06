import { ApiProperty } from '@nestjs/swagger';

export class PractitionerPatientDto {
    @ApiProperty({ description: 'Patient ID', example: 'patient-123' })
    id: string;

    @ApiProperty({ description: 'Full name of the patient', example: 'Alice Smith' })
    name: string;

    @ApiProperty({ description: 'Patient age', example: 45 })
    age: number;

    @ApiProperty({
        description: 'Patient gender',
        example: 'female',
        enum: ['male', 'female', 'other', 'unknown']
    })
    gender: string;

    @ApiProperty({
        description: 'Patient profile image URL',
        example: 'https://example.com/profiles/alice-smith.jpg',
        required: false
    })
    profileImageUrl?: string;

    @ApiProperty({
        description: 'Next appointment date',
        example: '2023-06-15T14:30:00Z',
        required: false
    })
    nextAppointment?: string;

    @ApiProperty({
        description: 'Active conditions',
        example: ['Hypertension', 'Type 2 Diabetes'],
        isArray: true,
        required: false
    })
    activeConditions?: string[];

    @ApiProperty({
        description: 'Recent vital signs status',
        example: 'normal',
        enum: ['normal', 'abnormal', 'critical', 'unknown'],
        required: false
    })
    vitalsStatus?: string;
} 
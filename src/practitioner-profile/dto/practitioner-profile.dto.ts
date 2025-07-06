import { ApiProperty } from '@nestjs/swagger';

export class QualificationDto {
    @ApiProperty({ description: 'Qualification code', example: 'MD' })
    code: string;

    @ApiProperty({ description: 'Qualification display name', example: 'Doctor of Medicine' })
    display: string;
}

export class PractitionerProfileDto {
    @ApiProperty({ description: 'Practitioner ID', example: 'practitioner-123' })
    id: string;

    @ApiProperty({ description: 'Full name of the practitioner', example: 'Dr. John Doe' })
    name: string;

    @ApiProperty({ description: 'Email address', example: 'dr.john.doe@example.com' })
    email: string;

    @ApiProperty({ description: 'Phone number', example: '+1-555-123-4567', required: false })
    phone?: string;

    @ApiProperty({
        description: 'List of practitioner specialties',
        example: ['Neurology', 'Oncology'],
        isArray: true,
        required: false
    })
    specialty?: string[];

    @ApiProperty({
        description: 'List of practitioner qualifications',
        type: [QualificationDto],
        required: false
    })
    qualification?: QualificationDto[];

    @ApiProperty({
        description: 'Practitioner gender',
        example: 'male',
        enum: ['male', 'female', 'other', 'unknown'],
        required: false
    })
    gender?: string;

    @ApiProperty({
        description: 'Profile image URL',
        example: 'https://example.com/profiles/john-doe.jpg',
        required: false
    })
    profileImageUrl?: string;
} 
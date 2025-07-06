import { ApiProperty } from '@nestjs/swagger';

export class AppointmentPatientDto {
    @ApiProperty({ description: 'Patient ID', example: 'patient-123' })
    id: string;

    @ApiProperty({ description: 'Patient name', example: 'Alice Smith' })
    name: string;

    @ApiProperty({
        description: 'Patient profile image URL',
        example: 'https://example.com/profiles/alice-smith.jpg',
        required: false
    })
    profileImageUrl?: string;
}

export class AppointmentLocationDto {
    @ApiProperty({ description: 'Location ID', example: 'location-123' })
    id: string;

    @ApiProperty({ description: 'Location name', example: 'Main Clinic' })
    name: string;

    @ApiProperty({
        description: 'Location address',
        example: '123 Medical Drive',
        required: false
    })
    address?: string;
}

export class PractitionerAppointmentDto {
    @ApiProperty({ description: 'Appointment ID', example: 'appointment-123' })
    id: string;

    @ApiProperty({ description: 'Start time of appointment', example: '2023-06-15T14:30:00Z' })
    start: string;

    @ApiProperty({
        description: 'End time of appointment',
        example: '2023-06-15T15:00:00Z',
        required: false
    })
    end?: string;

    @ApiProperty({
        description: 'Appointment description',
        example: 'Follow-up consultation'
    })
    description: string;

    @ApiProperty({
        description: 'Appointment status',
        example: 'booked',
        enum: ['booked', 'cancelled', 'fulfilled', 'noshow']
    })
    status: string;

    @ApiProperty({
        description: 'Patient information',
        type: AppointmentPatientDto
    })
    patient: AppointmentPatientDto;

    @ApiProperty({
        description: 'Location information',
        type: AppointmentLocationDto,
        required: false
    })
    location?: AppointmentLocationDto;

    @ApiProperty({
        description: 'Type of appointment',
        example: 'follow-up',
        enum: ['initial', 'follow-up', 'emergency', 'routine']
    })
    appointmentType: string;
} 
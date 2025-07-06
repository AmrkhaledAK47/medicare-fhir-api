import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FhirResourceDetailsDto {
    @ApiProperty({ description: 'FHIR resource type (Patient, Practitioner, etc.)' })
    resourceType: string;

    @ApiProperty({ description: 'FHIR resource ID' })
    resourceId: string;

    @ApiProperty({ description: 'Relevant FHIR resource data' })
    details: any;
}

export class UserProfileDto {
    @ApiProperty({ description: 'User ID' })
    id: string;

    @ApiProperty({ description: 'User name' })
    name: string;

    @ApiProperty({ description: 'User email' })
    email: string;

    @ApiProperty({ description: 'User role (patient, practitioner, admin)' })
    role: string;

    @ApiProperty({ description: 'User status (active, pending, inactive)' })
    status: string;

    @ApiPropertyOptional({ description: 'User phone number' })
    phone?: string;

    @ApiPropertyOptional({ description: 'URL to user profile image' })
    profileImageUrl?: string;

    @ApiProperty({ description: 'Whether the email has been verified' })
    isEmailVerified: boolean;

    @ApiPropertyOptional({ description: 'FHIR resource details if linked' })
    fhirDetails?: FhirResourceDetailsDto;

    @ApiPropertyOptional({ description: 'Chronic diseases categorized by type' })
    diseases?: {
        speech: string[];
        physical: string[];
    };
}

export class BiomarkerDto {
    @ApiProperty({ description: 'Biomarker type (heart, kidney, liver, etc.)' })
    type: string;

    @ApiProperty({ description: 'Biomarker name (Blood Pressure, Glucose, etc.)' })
    name: string;

    @ApiProperty({ description: 'Biomarker value' })
    value: string;

    @ApiPropertyOptional({ description: 'Biomarker unit (mmHg, mg/dL, etc.)' })
    unit?: string;

    @ApiPropertyOptional({ description: 'Reference range for the biomarker' })
    referenceRange?: string;

    @ApiProperty({ description: 'Status of the biomarker (normal, high, low, critical, unknown)' })
    status: 'normal' | 'high' | 'low' | 'critical' | 'unknown';

    @ApiPropertyOptional({ description: 'Date when the biomarker was measured' })
    date?: string;

    @ApiPropertyOptional({ description: 'Who performed the measurement' })
    performer?: string;
}

export class AppointmentDto {
    @ApiProperty({ description: 'Appointment ID' })
    id: string;

    @ApiProperty({ description: 'Appointment start time' })
    start: string;

    @ApiPropertyOptional({ description: 'Appointment end time' })
    end?: string;

    @ApiProperty({ description: 'Appointment description' })
    description: string;

    @ApiProperty({ description: 'Appointment status (booked, pending, etc.)' })
    status: string;

    @ApiProperty({ description: 'Practitioner information' })
    practitioner: {
        id: string;
        name: string;
        speciality?: string;
        imageUrl?: string;
    };

    @ApiPropertyOptional({ description: 'Location information' })
    location?: {
        id: string;
        name: string;
        address?: string;
    };

    @ApiProperty({ description: 'Appointment type (in-person, virtual, phone)' })
    appointmentType: string;
}

export class CalendarEventItemDto {
    @ApiProperty({ description: 'Event ID' })
    id: string;

    @ApiProperty({ description: 'Event title' })
    title: string;

    @ApiProperty({ description: 'Event time (HH:MM format)' })
    time: string;

    @ApiProperty({ description: 'Event type (appointment, task, reminder)' })
    type: string;
}

export class CalendarEventDto {
    @ApiProperty({ description: 'Date of the events (YYYY-MM-DD format)' })
    date: string;

    @ApiProperty({ description: 'List of events for this date', type: [CalendarEventItemDto] })
    events: CalendarEventItemDto[];
}

export class QuickActionDto {
    @ApiProperty({ description: 'Quick action ID' })
    id: string;

    @ApiProperty({ description: 'Quick action title' })
    title: string;

    @ApiProperty({ description: 'Quick action description' })
    description: string;

    @ApiProperty({ description: 'URL to navigate to when action is clicked' })
    url: string;

    @ApiProperty({ description: 'Action type (consultation, location, emergency, etc.)' })
    type: string;

    @ApiProperty({ description: 'Icon name for the quick action' })
    icon: string;
}

export class DashboardDto {
    @ApiProperty({ description: 'User profile information' })
    profile: UserProfileDto;

    @ApiPropertyOptional({ description: 'Biomarker data', type: [BiomarkerDto] })
    biomarkers?: BiomarkerDto[];

    @ApiPropertyOptional({ description: 'Upcoming appointments', type: [AppointmentDto] })
    appointments?: AppointmentDto[];

    @ApiPropertyOptional({ description: 'Calendar events', type: [CalendarEventDto] })
    calendar?: CalendarEventDto[];

    @ApiPropertyOptional({ description: 'Quick actions', type: [QuickActionDto] })
    quickActions?: QuickActionDto[];

    @ApiPropertyOptional({ description: 'Any errors that occurred during dashboard build', type: [String] })
    errors?: string[];
} 
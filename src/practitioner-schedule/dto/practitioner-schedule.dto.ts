import { ApiProperty } from '@nestjs/swagger';

export class SchedulePatientDto {
    @ApiProperty({ description: 'Patient ID', example: 'patient-123' })
    id: string;

    @ApiProperty({ description: 'Patient name', example: 'Alice Smith' })
    name: string;
}

export class ScheduleSlotDto {
    @ApiProperty({ description: 'Slot ID', example: 'slot-123' })
    id: string;

    @ApiProperty({ description: 'Start time of slot', example: '2023-06-15T09:00:00Z' })
    start: string;

    @ApiProperty({ description: 'End time of slot', example: '2023-06-15T09:30:00Z' })
    end: string;

    @ApiProperty({
        description: 'Slot status (free, busy)',
        example: 'free',
        enum: ['free', 'busy']
    })
    status: string;

    @ApiProperty({
        description: 'Appointment ID if slot is booked',
        example: 'appointment-123',
        required: false
    })
    appointmentId?: string;

    @ApiProperty({
        description: 'Patient information if slot is booked',
        type: SchedulePatientDto,
        required: false
    })
    patient?: SchedulePatientDto;
}

export class WorkingHoursDto {
    @ApiProperty({ description: 'Start time of working hours', example: '09:00' })
    start: string;

    @ApiProperty({ description: 'End time of working hours', example: '17:00' })
    end: string;
}

export class PractitionerScheduleDto {
    @ApiProperty({ description: 'Schedule ID', example: 'schedule-123' })
    id: string;

    @ApiProperty({ description: 'Schedule date', example: '2023-06-15' })
    date: string;

    @ApiProperty({
        description: 'Schedule slots',
        type: [ScheduleSlotDto]
    })
    slots: ScheduleSlotDto[];

    @ApiProperty({
        description: 'Working hours',
        type: WorkingHoursDto
    })
    workingHours: WorkingHoursDto;
} 
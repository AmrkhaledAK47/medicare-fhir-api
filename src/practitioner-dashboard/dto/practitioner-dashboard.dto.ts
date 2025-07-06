import { ApiProperty } from '@nestjs/swagger';
import { PractitionerProfileDto } from '../../practitioner-profile/dto/practitioner-profile.dto';
import { PractitionerPatientDto } from '../../practitioner-patient/dto/practitioner-patient.dto';
import { PractitionerAppointmentDto } from '../../practitioner-appointment/dto/practitioner-appointment.dto';
import { PractitionerScheduleDto } from '../../practitioner-schedule/dto/practitioner-schedule.dto';
import { PractitionerReportDto } from '../../practitioner-report/dto/practitioner-report.dto';
import { PractitionerMedicationDto } from '../../practitioner-medication/dto/practitioner-medication.dto';
import { PractitionerLabResultDto } from '../../practitioner-lab-result/dto/practitioner-lab-result.dto';

export class DashboardStatisticsDto {
  @ApiProperty({
    description: 'Total number of patients under this practitioner',
    example: 42
  })
  totalPatients: number;

  @ApiProperty({
    description: 'Number of new patients in the last 30 days',
    example: 5
  })
  newPatients: number;

  @ApiProperty({
    description: 'Total number of appointments scheduled',
    example: 18
  })
  totalAppointments: number;

  @ApiProperty({
    description: 'Number of upcoming appointments',
    example: 7
  })
  upcomingAppointments: number;

  @ApiProperty({
    description: 'Number of appointments today',
    example: 3
  })
  todayAppointments: number;

  @ApiProperty({
    description: 'Number of pending lab results awaiting review',
    example: 4
  })
  pendingLabResults: number;
}

export class DashboardErrorDto {
  @ApiProperty({
    description: 'The component that failed to load',
    example: 'appointments',
    enum: ['profile', 'patients', 'appointments', 'schedule', 'reports', 'medications', 'labResults']
  })
  component: string;

  @ApiProperty({
    description: 'Error message',
    example: 'Failed to fetch appointments data'
  })
  message: string;
}

export class PractitionerDashboardDto {
  @ApiProperty({
    description: 'Practitioner profile information',
    type: PractitionerProfileDto,
    nullable: true
  })
  profile?: PractitionerProfileDto;

  @ApiProperty({
    description: 'List of patients under this practitioner',
    type: [PractitionerPatientDto],
    nullable: true
  })
  patients?: PractitionerPatientDto[];

  @ApiProperty({
    description: 'List of upcoming appointments',
    type: [PractitionerAppointmentDto],
    nullable: true
  })
  appointments?: PractitionerAppointmentDto[];

  @ApiProperty({
    description: 'Practitioner schedule information',
    type: PractitionerScheduleDto,
    nullable: true
  })
  schedule?: PractitionerScheduleDto;

  @ApiProperty({
    description: 'List of recent reports',
    type: [PractitionerReportDto],
    nullable: true
  })
  reports?: PractitionerReportDto[];

  @ApiProperty({
    description: 'List of recent medications prescribed',
    type: [PractitionerMedicationDto],
    nullable: true
  })
  medications?: PractitionerMedicationDto[];

  @ApiProperty({
    description: 'List of recent lab results',
    type: [PractitionerLabResultDto],
    nullable: true
  })
  labResults?: PractitionerLabResultDto[];

  @ApiProperty({
    description: 'Dashboard statistics',
    type: DashboardStatisticsDto
  })
  statistics: DashboardStatisticsDto;

  @ApiProperty({
    description: 'Timestamp when the dashboard was generated',
    example: '2023-06-15T14:30:45.123Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'List of errors that occurred during dashboard generation',
    type: [DashboardErrorDto],
    nullable: true
  })
  errors?: DashboardErrorDto[];
} 
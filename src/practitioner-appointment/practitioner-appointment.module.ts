import { Module } from '@nestjs/common';
import { PractitionerAppointmentService } from '../practitioner-dashboard/services/practitioner-appointment.service';

@Module({
    providers: [PractitionerAppointmentService],
    exports: [PractitionerAppointmentService],
})
export class PractitionerAppointmentModule { } 
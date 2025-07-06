import { Module } from '@nestjs/common';
import { PractitionerPatientService } from '../practitioner-dashboard/services/practitioner-patient.service';

@Module({
    providers: [PractitionerPatientService],
    exports: [PractitionerPatientService],
})
export class PractitionerPatientModule { } 
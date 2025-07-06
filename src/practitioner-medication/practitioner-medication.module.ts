import { Module } from '@nestjs/common';
import { PractitionerMedicationService } from '../practitioner-dashboard/services/practitioner-medication.service';

@Module({
    providers: [PractitionerMedicationService],
    exports: [PractitionerMedicationService],
})
export class PractitionerMedicationModule { } 
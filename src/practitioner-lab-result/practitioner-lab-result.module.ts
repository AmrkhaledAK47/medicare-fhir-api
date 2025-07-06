import { Module } from '@nestjs/common';
import { PractitionerLabResultService } from '../practitioner-dashboard/services/practitioner-lab-result.service';

@Module({
    providers: [PractitionerLabResultService],
    exports: [PractitionerLabResultService],
})
export class PractitionerLabResultModule { } 
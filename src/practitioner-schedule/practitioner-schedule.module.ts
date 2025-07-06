import { Module } from '@nestjs/common';
import { PractitionerScheduleService } from '../practitioner-dashboard/services/practitioner-schedule.service';

@Module({
    providers: [PractitionerScheduleService],
    exports: [PractitionerScheduleService],
})
export class PractitionerScheduleModule { } 
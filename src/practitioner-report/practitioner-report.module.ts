import { Module } from '@nestjs/common';
import { PractitionerReportService } from '../practitioner-dashboard/services/practitioner-report.service';

@Module({
    providers: [PractitionerReportService],
    exports: [PractitionerReportService],
})
export class PractitionerReportModule { } 
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PractitionerReportService {
    private readonly logger = new Logger(PractitionerReportService.name);

    async getRecentReports(practitionerId: string) {
        this.logger.log(`Getting recent reports for practitioner ${practitionerId}`);

        // Mock implementation - in a real app, this would fetch data from FHIR or database
        return [
            {
                id: 'report-1',
                title: 'MRI Brain Scan Results',
                date: '2023-06-10T14:30:00Z',
                patient: {
                    id: 'patient-1',
                    name: 'Alice Smith'
                },
                type: 'diagnostic-imaging',
                status: 'final'
            },
            {
                id: 'report-2',
                title: 'Blood Test Results',
                date: '2023-06-12T09:15:00Z',
                patient: {
                    id: 'patient-2',
                    name: 'Bob Johnson'
                },
                type: 'laboratory',
                status: 'preliminary'
            }
        ];
    }
} 
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PractitionerMedicationService {
    private readonly logger = new Logger(PractitionerMedicationService.name);

    async getRecentMedications(practitionerId: string) {
        this.logger.log(`Getting recent medications for practitioner ${practitionerId}`);

        // Mock implementation - in a real app, this would fetch data from FHIR or database
        return [
            {
                id: 'medication-1',
                name: 'Lisinopril',
                dosage: '10mg once daily',
                patient: {
                    id: 'patient-1',
                    name: 'Alice Smith'
                },
                status: 'active',
                datePrescribed: '2023-06-01T14:30:00Z'
            },
            {
                id: 'medication-2',
                name: 'Metformin',
                dosage: '500mg twice daily',
                patient: {
                    id: 'patient-1',
                    name: 'Alice Smith'
                },
                status: 'active',
                datePrescribed: '2023-06-01T14:30:00Z'
            },
            {
                id: 'medication-3',
                name: 'Ibuprofen',
                dosage: '400mg as needed for pain',
                patient: {
                    id: 'patient-2',
                    name: 'Bob Johnson'
                },
                status: 'active',
                datePrescribed: '2023-06-05T10:15:00Z'
            }
        ];
    }
} 
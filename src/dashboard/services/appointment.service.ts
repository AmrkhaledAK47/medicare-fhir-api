import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../../fhir/fhir.service';
import { AppointmentDto } from '../dto/dashboard.dto';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AppointmentService {
    private readonly logger = new Logger(AppointmentService.name);

    constructor(
        private readonly fhirService: FhirService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async getUpcomingAppointments(patientFhirId: string, count: number = 5): Promise<AppointmentDto[]> {
        this.logger.log(`Fetching upcoming appointments for patient ${patientFhirId}`);

        const cacheKey = `appointments:${patientFhirId}:${count}`;

        // Try to get from cache first
        const cachedAppointments = await this.cacheManager.get<AppointmentDto[]>(cacheKey);
        if (cachedAppointments) {
            this.logger.debug('Returning appointments from cache');
            return cachedAppointments;
        }

        try {
            // Fetch appointments from FHIR server
            const appointments = await this.fhirService.getUpcomingAppointments(patientFhirId, count);

            // Map FHIR appointments to our DTO
            const mappedAppointments = await this.mapFhirAppointments(appointments);

            // Cache the results
            await this.cacheManager.set(cacheKey, mappedAppointments, 60 * 1000); // 60 seconds TTL

            return mappedAppointments;
        } catch (error) {
            this.logger.error(`Failed to fetch appointments for patient ${patientFhirId}: ${error.message}`);
            throw error;
        }
    }

    private async mapFhirAppointments(fhirAppointments: any[]): Promise<AppointmentDto[]> {
        if (!fhirAppointments || !fhirAppointments.length) {
            return [];
        }

        const appointmentsDto: AppointmentDto[] = [];

        for (const appointment of fhirAppointments) {
            try {
                const mappedAppointment: AppointmentDto = {
                    id: appointment.id,
                    start: appointment.start,
                    end: appointment.end,
                    description: appointment.description || appointment.serviceType?.[0]?.text || 'Appointment',
                    status: appointment.status,
                    practitioner: await this.extractPractitioner(appointment),
                    location: this.extractLocation(appointment),
                    appointmentType: this.determineAppointmentType(appointment),
                };

                appointmentsDto.push(mappedAppointment);
            } catch (error) {
                this.logger.warn(`Error mapping appointment ${appointment.id}: ${error.message}`);
                continue;
            }
        }

        return appointmentsDto;
    }

    private async extractPractitioner(appointment: any): Promise<{ id: string; name: string; speciality?: string; imageUrl?: string }> {
        let practitioner: { id: string; name: string; speciality?: string; imageUrl?: string } = {
            id: 'unknown',
            name: 'Unknown Provider',
            speciality: undefined
        };

        try {
            const practitionerParticipant = appointment.participant?.find(p =>
                p.actor?.reference?.startsWith('Practitioner/') ||
                p.actor?.type === 'Practitioner'
            );

            if (!practitionerParticipant) {
                return practitioner;
            }

            if (practitionerParticipant.actor?.reference) {
                // Check if the resource is already included in the response
                if (practitionerParticipant.actor.resource) {
                    const practitionerResource = practitionerParticipant.actor.resource;
                    const name = this.formatHumanName(practitionerResource.name?.[0]);
                    const speciality = this.extractSpeciality(practitionerResource);

                    practitioner = {
                        id: practitionerResource.id,
                        name: name || practitionerParticipant.actor.display || 'Unknown Provider',
                        speciality,
                        imageUrl: undefined,  // FHIR doesn't typically store image URLs directly
                    };
                } else {
                    // If not included, fetch it separately
                    const reference = practitionerParticipant.actor.reference;
                    const practitionerId = reference.split('/')[1];

                    if (practitionerId) {
                        try {
                            // Try to get the practitioner details
                            const practitionerResource = await this.fhirService.getResource('Practitioner', practitionerId);

                            if (practitionerResource) {
                                const name = this.formatHumanName(practitionerResource.name?.[0]);
                                const speciality = this.extractSpeciality(practitionerResource);

                                practitioner = {
                                    id: practitionerId,
                                    name: name || 'Unknown Provider',
                                    speciality,
                                    imageUrl: undefined,  // FHIR doesn't typically store image URLs directly
                                };
                            }
                        } catch (error) {
                            // If we can't fetch the practitioner, use the display name if available
                            if (practitionerParticipant.actor.display) {
                                practitioner.name = practitionerParticipant.actor.display;
                            }
                        }
                    }
                }
            } else if (practitionerParticipant?.actor?.display) {
                // If we only have the display name
                practitioner.name = practitionerParticipant.actor.display;
            }
        } catch (error) {
            this.logger.warn(`Failed to extract practitioner from appointment: ${error.message}`);
        }

        return practitioner;
    }

    private extractLocation(appointment: any): { id: string; name: string; address?: string } | undefined {
        try {
            const locationParticipant = appointment.participant?.find(p =>
                p.actor?.reference?.startsWith('Location/') ||
                p.actor?.type === 'Location'
            );

            if (!locationParticipant) {
                return undefined;
            }

            // Check if the location resource is already included
            if (locationParticipant.actor?.resource) {
                const locationResource = locationParticipant.actor.resource;
                return {
                    id: locationResource.id,
                    name: locationResource.name || locationParticipant.actor.display || 'Unknown Location',
                    address: this.formatAddress(locationResource.address?.[0]),
                };
            } else if (locationParticipant.actor?.reference) {
                const reference = locationParticipant.actor.reference;
                const locationId = reference.split('/')[1];

                return {
                    id: locationId,
                    name: locationParticipant.actor.display || 'Unknown Location',
                };
            } else if (locationParticipant.actor?.display) {
                return {
                    id: 'unknown',
                    name: locationParticipant.actor.display,
                };
            }
        } catch (error) {
            this.logger.warn(`Failed to extract location from appointment: ${error.message}`);
        }

        return undefined;
    }

    private formatAddress(address: any): string | undefined {
        if (!address) return undefined;

        const parts = [];

        if (address.line && address.line.length > 0) {
            parts.push(address.line.join(', '));
        }

        if (address.city) {
            parts.push(address.city);
        }

        if (address.state) {
            parts.push(address.state);
        }

        if (address.postalCode) {
            parts.push(address.postalCode);
        }

        return parts.join(', ');
    }

    private determineAppointmentType(appointment: any): string {
        try {
            // Check for appointment type in the appointmentType field
            if (appointment.appointmentType?.coding?.[0]?.code) {
                const code = appointment.appointmentType.coding[0].code;

                if (code === 'VIRTUAL') {
                    return 'virtual';
                } else if (code === 'PHONE') {
                    return 'phone';
                }
            }

            // Check for virtual meeting information
            if (appointment.telecom || appointment.contained?.find(r => r.resourceType === 'HealthcareService' && r.telecom)) {
                return 'virtual';
            }

            // Check location - if there's a location, it's likely in-person
            const hasLocation = appointment.participant?.some(p =>
                p.actor?.reference?.startsWith('Location/') ||
                p.actor?.type === 'Location'
            );

            if (hasLocation) {
                return 'in-person';
            }
        } catch (error) {
            this.logger.warn(`Failed to determine appointment type: ${error.message}`);
        }

        // Default to in-person if we can't determine
        return 'in-person';
    }

    private formatHumanName(name: any): string | undefined {
        if (!name) return undefined;

        const given = Array.isArray(name.given) ? name.given.join(' ') : name.given;
        const family = name.family;

        if (given && family) {
            return `${given} ${family}`;
        } else if (family) {
            return family;
        } else if (given) {
            return given;
        } else if (name.text) {
            return name.text;
        }

        return undefined;
    }

    private extractSpeciality(practitioner: any): string | undefined {
        try {
            // Try to get speciality from qualification
            if (practitioner.qualification && practitioner.qualification.length > 0) {
                for (const qual of practitioner.qualification) {
                    if (qual.code?.coding && qual.code.coding.length > 0) {
                        const speciality = qual.code.coding[0].display || qual.code.text;
                        if (speciality) return speciality;
                    }
                }
            }

            // Try from practitionerRole if linked
            if (practitioner.extension) {
                const roleExt = practitioner.extension.find(ext =>
                    ext.url === 'http://hl7.org/fhir/StructureDefinition/practitioner-role'
                );

                if (roleExt && roleExt.valueReference?.reference) {
                    // Would need to fetch PractitionerRole separately
                    // Not implementing for this example to avoid additional API calls
                }
            }
        } catch (error) {
            this.logger.warn(`Failed to extract speciality: ${error.message}`);
        }

        return undefined;
    }
} 
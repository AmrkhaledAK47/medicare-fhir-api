import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../../fhir/fhir.service';
import { CalendarEventDto } from '../dto/dashboard.dto';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CalendarService {
    private readonly logger = new Logger(CalendarService.name);

    constructor(
        private readonly fhirService: FhirService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async getCalendarEvents(patientFhirId: string, monthDate?: string): Promise<CalendarEventDto[]> {
        this.logger.log(`Fetching calendar events for patient ${patientFhirId}`);

        // Calculate date range (default to current month if not specified)
        const today = new Date();
        let startDate: string;
        let endDate: string;

        if (monthDate) {
            // If month date is provided, use the entire month
            const date = new Date(monthDate);
            const year = date.getFullYear();
            const month = date.getMonth();

            startDate = new Date(year, month, 1).toISOString().split('T')[0];
            endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
        } else {
            // Default to current month
            const year = today.getFullYear();
            const month = today.getMonth();

            startDate = new Date(year, month, 1).toISOString().split('T')[0];
            endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
        }

        const cacheKey = `calendar:${patientFhirId}:${startDate}-${endDate}`;

        // Try to get from cache first
        const cachedEvents = await this.cacheManager.get<CalendarEventDto[]>(cacheKey);
        if (cachedEvents) {
            this.logger.debug('Returning calendar events from cache');
            return cachedEvents;
        }

        try {
            // Fetch data from various sources in parallel
            const [appointments, carePlans, serviceRequests] = await Promise.all([
                this.fetchAppointments(patientFhirId, startDate, endDate),
                this.fetchCarePlans(patientFhirId),
                this.fetchServiceRequests(patientFhirId),
            ]);

            // Process each data type into calendar events
            const appointmentEvents = this.processAppointments(appointments);
            const carePlanEvents = this.processCarePlans(carePlans);
            const serviceRequestEvents = this.processServiceRequests(serviceRequests);

            // Combine all events
            const allEvents = [
                ...appointmentEvents,
                ...carePlanEvents,
                ...serviceRequestEvents,
            ];

            // Group events by date
            const groupedEvents = this.groupEventsByDate(allEvents);

            // Cache the results
            await this.cacheManager.set(cacheKey, groupedEvents, 60 * 1000); // 60 seconds TTL

            return groupedEvents;
        } catch (error) {
            this.logger.error(`Failed to fetch calendar events for patient ${patientFhirId}: ${error.message}`);
            throw error;
        }
    }

    private async fetchAppointments(patientId: string, startDate: string, endDate: string): Promise<any[]> {
        try {
            const searchParams = {
                patient: patientId,
                date: `ge${startDate}&date=le${endDate}`,
                _sort: 'date',
                _count: '100',
                _include: 'Appointment:practitioner,Appointment:location',
            };

            this.logger.debug(`Fetching appointments with params: ${JSON.stringify(searchParams)}`);
            const response = await this.fhirService.searchResources('Appointment', searchParams);

            // Extract appointments and included resources
            const appointments = [];
            const includedResources = {};

            if (response.entry && Array.isArray(response.entry)) {
                // First, collect all included resources by reference
                response.entry.forEach(entry => {
                    const resource = entry.resource;
                    if (resource && resource.resourceType && resource.id) {
                        if (resource.resourceType !== 'Appointment') {
                            const reference = `${resource.resourceType}/${resource.id}`;
                            includedResources[reference] = resource;
                        }
                    }
                });

                // Then extract appointments and enrich with included resources
                response.entry.forEach(entry => {
                    const resource = entry.resource;
                    if (resource && resource.resourceType === 'Appointment') {
                        // Enrich participants with included resources
                        if (resource.participant && Array.isArray(resource.participant)) {
                            resource.participant.forEach(participant => {
                                if (participant.actor && participant.actor.reference) {
                                    const ref = participant.actor.reference;
                                    if (includedResources[ref]) {
                                        participant.actor.resource = includedResources[ref];
                                    }
                                }
                            });
                        }
                        appointments.push(resource);
                    }
                });
            }

            return appointments;
        } catch (error) {
            this.logger.error(`Error fetching appointments: ${error.message}`);
            return [];
        }
    }

    private async fetchCarePlans(patientId: string): Promise<any[]> {
        try {
            const searchParams = {
                patient: patientId,
                status: 'active,draft',
                _count: '100',
            };

            const response = await this.fhirService.searchResources('CarePlan', searchParams);

            if (response.entry && Array.isArray(response.entry)) {
                return response.entry.map(entry => entry.resource);
            }

            return [];
        } catch (error) {
            this.logger.error(`Error fetching care plans: ${error.message}`);
            return [];
        }
    }

    private async fetchServiceRequests(patientId: string): Promise<any[]> {
        try {
            const searchParams = {
                patient: patientId,
                status: 'active,draft',
                _count: '100',
            };

            const response = await this.fhirService.searchResources('ServiceRequest', searchParams);

            if (response.entry && Array.isArray(response.entry)) {
                return response.entry.map(entry => entry.resource);
            }

            return [];
        } catch (error) {
            this.logger.error(`Error fetching service requests: ${error.message}`);
            return [];
        }
    }

    private processAppointments(appointments: any[]): any[] {
        if (!appointments || !appointments.length) {
            return [];
        }

        const events = [];

        for (const appointment of appointments) {
            try {
                // Skip appointments without a start date
                if (!appointment.start) {
                    continue;
                }

                const startDate = new Date(appointment.start);
                const formattedDate = startDate.toISOString().split('T')[0];
                const time = this.formatTime(startDate);

                // Extract practitioner name if available
                let practitionerName = '';
                if (appointment.participant) {
                    const practitionerParticipant = appointment.participant.find(p =>
                        p.actor?.reference?.startsWith('Practitioner/') ||
                        (p.actor?.resource?.resourceType === 'Practitioner')
                    );

                    if (practitionerParticipant?.actor?.resource) {
                        const practitioner = practitionerParticipant.actor.resource;
                        if (practitioner.name && practitioner.name.length > 0) {
                            practitionerName = this.formatHumanName(practitioner.name[0]);
                        } else if (practitionerParticipant.actor.display) {
                            practitionerName = practitionerParticipant.actor.display;
                        }
                    } else if (practitionerParticipant?.actor?.display) {
                        practitionerName = practitionerParticipant.actor.display;
                    }
                }

                // Extract location name if available
                let locationName = '';
                if (appointment.participant) {
                    const locationParticipant = appointment.participant.find(p =>
                        p.actor?.reference?.startsWith('Location/') ||
                        (p.actor?.resource?.resourceType === 'Location')
                    );

                    if (locationParticipant?.actor?.resource) {
                        locationName = locationParticipant.actor.resource.name || '';
                    } else if (locationParticipant?.actor?.display) {
                        locationName = locationParticipant.actor.display;
                    }
                }

                // Create a descriptive title
                let title = appointment.description ||
                    appointment.serviceType?.[0]?.text ||
                    'Appointment';

                if (practitionerName) {
                    title += ` with ${practitionerName}`;
                }

                if (locationName) {
                    title += ` at ${locationName}`;
                }

                events.push({
                    date: formattedDate,
                    id: appointment.id,
                    title: title,
                    time: time,
                    type: 'appointment',
                    originalResource: appointment
                });
            } catch (error) {
                this.logger.warn(`Error processing appointment ${appointment.id}: ${error.message}`);
                continue;
            }
        }

        return events;
    }

    private processCarePlans(carePlans: any[]): any[] {
        if (!carePlans || !carePlans.length) {
            return [];
        }

        const events = [];

        for (const carePlan of carePlans) {
            try {
                // Process activities that have a scheduled time
                if (carePlan.activity && Array.isArray(carePlan.activity)) {
                    for (const activity of carePlan.activity) {
                        if (!activity.detail?.scheduledTiming?.event) {
                            continue;
                        }

                        const eventDate = new Date(activity.detail.scheduledTiming.event);
                        const formattedDate = eventDate.toISOString().split('T')[0];

                        events.push({
                            date: formattedDate,
                            id: `${carePlan.id}-${events.length}`,
                            title: activity.detail.description || activity.detail.status || 'Care Plan Activity',
                            time: eventDate.toTimeString().substring(0, 5),
                            type: 'task',
                            originalResource: activity
                        });
                    }
                }
            } catch (error) {
                this.logger.warn(`Error processing care plan ${carePlan.id}: ${error.message}`);
                continue;
            }
        }

        return events;
    }

    private processServiceRequests(serviceRequests: any[]): any[] {
        if (!serviceRequests || !serviceRequests.length) {
            return [];
        }

        const events = [];

        for (const request of serviceRequests) {
            try {
                // Only process service requests with occurrenceDateTime
                if (!request.occurrenceDateTime) {
                    continue;
                }

                const eventDate = new Date(request.occurrenceDateTime);
                const formattedDate = eventDate.toISOString().split('T')[0];

                events.push({
                    date: formattedDate,
                    id: request.id,
                    title: request.code?.text || 'Medical Service',
                    time: eventDate.toTimeString().substring(0, 5),
                    type: 'reminder',
                    originalResource: request
                });
            } catch (error) {
                this.logger.warn(`Error processing service request ${request.id}: ${error.message}`);
                continue;
            }
        }

        return events;
    }

    private groupEventsByDate(events: any[]): CalendarEventDto[] {
        const eventsByDate = new Map<string, any[]>();

        // Group events by date
        for (const event of events) {
            if (!eventsByDate.has(event.date)) {
                eventsByDate.set(event.date, []);
            }

            // Remove the original resource to avoid bloating the response
            const { originalResource, ...cleanEvent } = event;

            eventsByDate.get(event.date).push(cleanEvent);
        }

        // Convert to CalendarEventDto array
        const result: CalendarEventDto[] = [];

        for (const [date, dateEvents] of eventsByDate.entries()) {
            result.push({
                date,
                events: dateEvents.sort((a, b) => a.time.localeCompare(b.time))
            });
        }

        // Sort by date
        return result.sort((a, b) => a.date.localeCompare(b.date));
    }

    private formatTime(date: Date): string {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    private formatHumanName(name: any): string {
        if (!name) return '';

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

        return '';
    }
} 
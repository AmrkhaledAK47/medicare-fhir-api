import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseResourceService } from '../base-resource.service';
import { Patient, PatientDocument } from '../schemas/patient.schema';
import { FhirService } from '../fhir.service';
import { ResourceRegistryService } from './resource-registry.service';
import { FhirResourceDocument } from '../schemas/fhir-resource.schema';

@Injectable()
export class PatientService extends BaseResourceService {
    constructor(
        @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
        private readonly fhirService: FhirService,
        resourceRegistryService: ResourceRegistryService,
    ) {
        super(patientModel as unknown as Model<FhirResourceDocument>, 'Patient', resourceRegistryService);
    }

    /**
     * Find patients by name - specialized search for patients
     */
    async findByName(name: string): Promise<PatientDocument[]> {
        return this.patientModel.find({
            $or: [
                { 'name.family': { $regex: name, $options: 'i' } },
                { 'name.given': { $regex: name, $options: 'i' } },
            ],
        }).exec();
    }

    /**
     * Find a patient by user ID (linking to auth system)
     */
    async findByUserId(userId: string): Promise<PatientDocument | null> {
        return this.patientModel.findOne({ userId }).exec();
    }

    /**
     * Create a patient and link to a user
     */
    async createWithUserId(userId: string, patientData: Partial<Patient>): Promise<PatientDocument> {
        const patient = new this.patientModel({
            ...patientData,
            userId,
            resourceType: 'Patient',
            active: true,
        });
        return patient.save();
    }

    /**
     * Get recent patient activity
     * This combines data from encounters and observations
     */
    async getRecentActivity(patientId: string, limit = 5) {
        // Get encounters for this patient
        const encounters = await this.fhirService.searchFhirResources(
            'Encounter',
            { 'subject': `Patient/${patientId}` },
            { page: 1, count: limit }
        );

        // Get observations for this patient
        const observations = await this.fhirService.searchFhirResources(
            'Observation',
            { 'subject': `Patient/${patientId}` },
            { page: 1, count: limit }
        );

        // Combine and sort by date
        const activities = [
            ...(encounters.entry?.map(entry => ({
                type: 'Encounter',
                date: entry.resource.period?.start || entry.resource.period?.end,
                resource: entry.resource
            })) || []),
            ...(observations.entry?.map(entry => ({
                type: 'Observation',
                date: entry.resource.effectiveDateTime || entry.resource.issued,
                resource: entry.resource
            })) || [])
        ];

        // Sort by date descending
        return activities
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limit);
    }

    /**
     * Get patient demographics for dashboard 
     */
    async getPatientDemographics() {
        const now = new Date();
        const [
            totalPatients,
            genderDistribution,
            ageGroups
        ] = await Promise.all([
            this.patientModel.countDocuments({ active: true }),
            this.patientModel.aggregate([
                { $group: { _id: '$gender', count: { $sum: 1 } } }
            ]),
            this.patientModel.aggregate([
                {
                    $project: {
                        ageGroup: {
                            $switch: {
                                branches: [
                                    {
                                        case: {
                                            $lt: [
                                                {
                                                    $divide: [
                                                        { $subtract: [now, { $toDate: '$birthDate' }] },
                                                        (1000 * 60 * 60 * 24 * 365)
                                                    ]
                                                },
                                                18
                                            ]
                                        },
                                        then: '0-17'
                                    },
                                    {
                                        case: {
                                            $lt: [
                                                {
                                                    $divide: [
                                                        { $subtract: [now, { $toDate: '$birthDate' }] },
                                                        (1000 * 60 * 60 * 24 * 365)
                                                    ]
                                                },
                                                30
                                            ]
                                        },
                                        then: '18-29'
                                    },
                                    {
                                        case: {
                                            $lt: [
                                                {
                                                    $divide: [
                                                        { $subtract: [now, { $toDate: '$birthDate' }] },
                                                        (1000 * 60 * 60 * 24 * 365)
                                                    ]
                                                },
                                                45
                                            ]
                                        },
                                        then: '30-44'
                                    },
                                    {
                                        case: {
                                            $lt: [
                                                {
                                                    $divide: [
                                                        { $subtract: [now, { $toDate: '$birthDate' }] },
                                                        (1000 * 60 * 60 * 24 * 365)
                                                    ]
                                                },
                                                65
                                            ]
                                        },
                                        then: '45-64'
                                    },
                                ],
                                default: '65+'
                            }
                        }
                    }
                },
                { $group: { _id: '$ageGroup', count: { $sum: 1 } } }
            ])
        ]);

        return {
            totalPatients,
            genderDistribution: genderDistribution.reduce((acc, item) => {
                acc[item._id || 'unknown'] = item.count;
                return acc;
            }, {}),
            ageGroups: ageGroups.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        };
    }
} 
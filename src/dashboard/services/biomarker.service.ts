import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../../fhir/fhir.service';
import { BiomarkerDto } from '../dto/dashboard.dto';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// LOINC codes for various biomarkers (reference: https://loinc.org/)
const BIOMARKER_CODES = {
    HEART: [
        '8867-4',   // Heart rate
        '8480-6',   // Systolic blood pressure
        '8462-4',   // Diastolic blood pressure
        '8478-0',   // Mean arterial pressure
        '8310-5',   // Body temperature
        '8716-3',   // Vital signs
        '8633-0',   // QTc interval
        '8634-8',   // QT interval
        '8636-3',   // QRS duration
        '8638-9',   // P wave duration
    ],
    KIDNEY: [
        '14958-3',  // Serum Creatinine
        '14959-1',  // Blood Urea Nitrogen (BUN)
        '32294-1',  // Glomerular filtration rate (GFR)
        '2160-0',   // Creatinine clearance
        '14957-5',  // Microalbumin
        '14956-7',  // Albumin/Creatinine ratio
        '2349-9',   // Urine protein
        '14959-1',  // BUN/Creatinine ratio
        '13362-9',  // Collection duration
        '30000-4',  // eGFR
    ],
    LIVER: [
        '1920-8',   // Aspartate aminotransferase (AST)
        '1742-6',   // Alanine aminotransferase (ALT)
        '1751-7',   // Albumin
        '1975-2',   // Total bilirubin
        '1968-7',   // Direct bilirubin
        '6768-6',   // Alkaline phosphatase
        '2324-2',   // Gamma-glutamyl transferase
        '2532-0',   // Lactate dehydrogenase
        '1834-1',   // Alpha-1 antitrypsin
        '4542-7',   // Ammonia
    ],
    SUGAR: [
        '41653-7',  // Glucose
        '2339-0',   // Glucose (fasting)
        '2345-7',   // Glucose (random)
        '4548-4',   // Hemoglobin A1c
        '4549-2',   // Hemoglobin A1c/Hemoglobin.total
        '43150-2',  // Insulin
        '2713-6',   // Oxygen saturation
        '14743-9',  // Glucose 1 hour post meal
        '14747-0',  // Glucose 2 hours post meal
        '14771-0',  // Glucose post meal
    ],
    BLOOD: [
        '718-7',    // Hemoglobin
        '731-0',    // Lymphocytes
        '4544-3',   // Hematocrit
        '787-2',    // Mean corpuscular volume (MCV)
        '785-6',    // Mean corpuscular hemoglobin (MCH)
        '786-4',    // Mean corpuscular hemoglobin concentration (MCHC)
        '777-3',    // Platelet count
        '6690-2',   // White blood cell count
        '789-8',    // Red blood cell count
        '788-0',    // Red cell distribution width
    ],
    THYROID: [
        '3016-3',   // Thyroid stimulating hormone (TSH)
        '11579-0',  // Thyroxine (T4) free
        '3026-2',   // Thyroxine (T4) total
        '3031-2',   // Triiodothyronine (T3) free
        '3050-2',   // Triiodothyronine (T3) total
        '3051-0',   // Thyroxine binding globulin
        '11580-8',  // Thyrotropin releasing hormone
        '14927-8',  // Thyroglobulin
        '14928-6',  // Thyroid peroxidase antibody
        '14929-4',  // Thyroglobulin antibody
    ],
    BONE: [
        '14635-7',  // Calcium
        '17865-7',  // Phosphorus
        '18281-6',  // Vitamin D
        '14633-2',  // Alkaline phosphatase bone isoenzyme
        '2465-3',   // Magnesium
        '2458-8',   // Ionized calcium
        '2798-7',   // Parathyroid hormone
        '14850-3',  // Osteocalcin
        '14803-2',  // C-telopeptide
        '33959-8',  // Bone mineral density
    ],
};

// Human-readable names for biomarker types
const BIOMARKER_NAMES = {
    HEART: 'Heart',
    KIDNEY: 'Kidney',
    LIVER: 'Liver',
    SUGAR: 'Sugar',
    BLOOD: 'Blood',
    THYROID: 'Thyroid',
    BONE: 'Bone',
};

// Common units for biomarker types
const DEFAULT_UNITS = {
    HEART: {
        '8867-4': 'bpm',     // Heart rate
        '8480-6': 'mmHg',    // Systolic blood pressure
        '8462-4': 'mmHg',    // Diastolic blood pressure
        '8478-0': 'mmHg',    // Mean arterial pressure
    },
    KIDNEY: {
        '14958-3': 'mg/dL',  // Serum Creatinine
        '14959-1': 'mg/dL',  // Blood Urea Nitrogen (BUN)
        '32294-1': 'mL/min', // Glomerular filtration rate (GFR)
    },
    LIVER: {
        '1920-8': 'U/L',     // AST
        '1742-6': 'U/L',     // ALT
        '1751-7': 'g/dL',    // Albumin
        '1975-2': 'mg/dL',   // Total bilirubin
    },
    SUGAR: {
        '41653-7': 'mg/dL',  // Glucose
        '2339-0': 'mg/dL',   // Glucose (fasting)
        '4548-4': '%',       // Hemoglobin A1c
    },
    BLOOD: {
        '718-7': 'g/dL',     // Hemoglobin
        '4544-3': '%',       // Hematocrit
        '777-3': 'K/µL',     // Platelet count
        '6690-2': 'K/µL',    // White blood cell count
    },
    THYROID: {
        '3016-3': 'mIU/L',   // TSH
        '11579-0': 'ng/dL',  // T4 free
        '3026-2': 'µg/dL',   // T4 total
    },
    BONE: {
        '14635-7': 'mg/dL',  // Calcium
        '17865-7': 'mg/dL',  // Phosphorus
        '18281-6': 'ng/mL',  // Vitamin D
    },
};

// Default reference ranges for common biomarkers
const DEFAULT_REFERENCE_RANGES = {
    '8867-4': '60-100',      // Heart rate
    '8480-6': '90-120',      // Systolic blood pressure
    '8462-4': '60-80',       // Diastolic blood pressure
    '14958-3': '0.7-1.3',    // Serum Creatinine
    '14959-1': '7-20',       // BUN
    '32294-1': '90-120',     // GFR
    '1920-8': '10-40',       // AST
    '1742-6': '7-56',        // ALT
    '41653-7': '70-100',     // Glucose
    '2339-0': '70-100',      // Glucose (fasting)
    '4548-4': '4.0-5.6',     // Hemoglobin A1c
    '718-7': '12-16',        // Hemoglobin
    '4544-3': '38-46',       // Hematocrit
    '3016-3': '0.4-4.0',     // TSH
    '14635-7': '8.5-10.5',   // Calcium
};

@Injectable()
export class BiomarkerService {
    private readonly logger = new Logger(BiomarkerService.name);

    constructor(
        private readonly fhirService: FhirService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async getBiomarkers(patientFhirId: string): Promise<BiomarkerDto[]> {
        this.logger.log(`Fetching biomarkers for patient ${patientFhirId}`);

        const cacheKey = `biomarker:${patientFhirId}`;

        // Try to get from cache first
        const cachedBiomarkers = await this.cacheManager.get<BiomarkerDto[]>(cacheKey);
        if (cachedBiomarkers) {
            this.logger.debug('Returning biomarkers from cache');
            return cachedBiomarkers;
        }

        // Flatten all LOINC codes for the query
        const allLoincCodes = Object.values(BIOMARKER_CODES).flat();

        try {
            // Fetch observations from FHIR server
            const observations = await this.fhirService.getLatestObservationsByLoinc(patientFhirId, allLoincCodes);

            // Map observations to biomarkers
            const biomarkers = this.mapObservationsToBiomarkers(observations);

            // Ensure we have at least one biomarker for each category shown in the UI
            const completeSet = this.ensureCompleteBiomarkerSet(biomarkers);

            // Cache the results
            await this.cacheManager.set(cacheKey, completeSet, 60 * 1000); // 60 seconds TTL

            return completeSet;
        } catch (error) {
            this.logger.error(`Failed to fetch biomarkers for patient ${patientFhirId}: ${error.message}`);
            throw error;
        }
    }

    private mapObservationsToBiomarkers(observations: any[]): BiomarkerDto[] {
        const biomarkers: BiomarkerDto[] = [];

        if (!observations || observations.length === 0) {
            return biomarkers;
        }

        // Process each observation
        for (const obs of observations) {
            try {
                // Skip if no coding information
                if (!obs.code?.coding || !obs.code.coding.length) {
                    continue;
                }

                const coding = obs.code.coding[0];
                const code = coding.code;
                const biomarkerType = this.getBiomarkerTypeFromCode(code);

                if (!biomarkerType) {
                    continue; // Skip if we don't recognize this code
                }

                // Get the value
                let value: string = 'N/A';
                let unit: string = '';

                if (obs.valueQuantity) {
                    value = obs.valueQuantity.value?.toString() || 'N/A';
                    unit = obs.valueQuantity.unit || this.getDefaultUnit(biomarkerType, code) || '';
                } else if (obs.valueString) {
                    value = obs.valueString;
                } else if (obs.valueCodeableConcept?.coding) {
                    value = obs.valueCodeableConcept.coding[0]?.display || 'N/A';
                }

                // Determine status
                let status: 'normal' | 'high' | 'low' | 'critical' | 'unknown' = 'unknown';

                if (obs.interpretation && obs.interpretation.length > 0) {
                    const interpretationCode = obs.interpretation[0].coding?.[0]?.code;

                    if (interpretationCode) {
                        switch (interpretationCode) {
                            case 'N':
                                status = 'normal';
                                break;
                            case 'H':
                            case 'HH':
                                status = 'high';
                                break;
                            case 'L':
                            case 'LL':
                                status = 'low';
                                break;
                            case 'A':
                            case 'AA':
                                status = 'critical';
                                break;
                            default:
                                status = 'unknown';
                        }
                    }
                } else {
                    // If no interpretation provided, try to determine based on reference range
                    if (obs.referenceRange && obs.referenceRange.length > 0 && obs.valueQuantity) {
                        const range = obs.referenceRange[0];
                        const numValue = parseFloat(value);

                        if (!isNaN(numValue)) {
                            if (range.low && range.high) {
                                if (numValue < range.low.value) {
                                    status = 'low';
                                } else if (numValue > range.high.value) {
                                    status = 'high';
                                } else {
                                    status = 'normal';
                                }
                            } else if (range.low && numValue < range.low.value) {
                                status = 'low';
                            } else if (range.high && numValue > range.high.value) {
                                status = 'high';
                            }
                        }
                    }
                }

                // Get reference range
                let referenceRange = undefined;
                if (obs.referenceRange && obs.referenceRange.length > 0) {
                    const low = obs.referenceRange[0].low?.value;
                    const high = obs.referenceRange[0].high?.value;

                    if (low !== undefined && high !== undefined) {
                        referenceRange = `${low}-${high}`;
                    } else if (low !== undefined) {
                        referenceRange = `>${low}`;
                    } else if (high !== undefined) {
                        referenceRange = `<${high}`;
                    }
                } else {
                    // Use default reference range if available
                    referenceRange = DEFAULT_REFERENCE_RANGES[code];
                }

                // Get performer name
                let performer = undefined;
                if (obs.performer && obs.performer.length > 0) {
                    if (obs.performer[0].display) {
                        performer = obs.performer[0].display;
                    }
                }

                biomarkers.push({
                    type: biomarkerType.toLowerCase(),
                    name: coding.display || this.getDisplayNameForCode(code) || biomarkerType,
                    value,
                    unit,
                    referenceRange,
                    status,
                    date: obs.effectiveDateTime || obs.issued,
                    performer,
                });
            } catch (error) {
                this.logger.warn(`Error processing observation: ${error.message}`);
                continue;
            }
        }

        return biomarkers;
    }

    private getBiomarkerTypeFromCode(code: string): string | null {
        for (const [type, codes] of Object.entries(BIOMARKER_CODES)) {
            if (codes.includes(code)) {
                return BIOMARKER_NAMES[type];
            }
        }
        return null;
    }

    private getDefaultUnit(biomarkerType: string, code: string): string | undefined {
        const typeKey = Object.keys(BIOMARKER_NAMES).find(
            key => BIOMARKER_NAMES[key] === biomarkerType
        );

        if (typeKey && DEFAULT_UNITS[typeKey] && DEFAULT_UNITS[typeKey][code]) {
            return DEFAULT_UNITS[typeKey][code];
        }

        return undefined;
    }

    private getDisplayNameForCode(code: string): string | undefined {
        // Map of common LOINC codes to user-friendly names
        const displayNames = {
            '8867-4': 'Heart Rate',
            '8480-6': 'Blood Pressure (Systolic)',
            '8462-4': 'Blood Pressure (Diastolic)',
            '14958-3': 'Creatinine',
            '14959-1': 'BUN',
            '32294-1': 'GFR',
            '1920-8': 'AST',
            '1742-6': 'ALT',
            '1751-7': 'Albumin',
            '1975-2': 'Bilirubin',
            '41653-7': 'Glucose',
            '2339-0': 'Fasting Glucose',
            '4548-4': 'HbA1c',
            '718-7': 'Hemoglobin',
            '4544-3': 'Hematocrit',
            '777-3': 'Platelet Count',
            '6690-2': 'White Blood Cell Count',
            '3016-3': 'TSH',
            '11579-0': 'Free T4',
            '3026-2': 'Total T4',
            '14635-7': 'Calcium',
            '17865-7': 'Phosphorus',
            '18281-6': 'Vitamin D',
        };

        return displayNames[code];
    }

    private ensureCompleteBiomarkerSet(biomarkers: BiomarkerDto[]): BiomarkerDto[] {
        // Create a set of biomarker types that we already have
        const existingTypes = new Set(biomarkers.map(b => b.type));

        // Create placeholder biomarkers for any missing types
        const result = [...biomarkers];

        for (const type of Object.values(BIOMARKER_NAMES)) {
            const lowerType = type.toLowerCase();

            if (!existingTypes.has(lowerType)) {
                // Add a placeholder biomarker
                result.push({
                    type: lowerType,
                    name: type,
                    value: 'No data',
                    unit: '',
                    status: 'unknown',
                    date: new Date().toISOString(),
                });
            }
        }

        return result;
    }
} 
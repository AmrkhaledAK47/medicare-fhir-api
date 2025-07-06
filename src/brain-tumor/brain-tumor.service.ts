import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrainScan, DetectionStatus, TumorType } from './schemas/brain-scan.schema';
import { FhirService } from '../fhir/fhir.service';
import { UploadsService } from '../uploads/uploads.service';
import { CacheService } from '../cache/cache.service';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import * as FormData from 'form-data';
import * as sharp from 'sharp';
import { Express } from 'express';

@Injectable()
export class BrainTumorService {
    private readonly logger = new Logger(BrainTumorService.name);
    private readonly roboflowApiKey: string;
    private readonly roboflowModelEndpoint: string;
    private readonly uploadDir: string;
    private readonly cacheTTL: number = 60 * 60; // 1 hour in seconds

    constructor(
        @InjectModel(BrainScan.name) private brainScanModel: Model<BrainScan>,
        private readonly httpService: HttpService,
        private readonly fhirService: FhirService,
        private readonly uploadsService: UploadsService,
        private readonly cacheService: CacheService,
        private readonly configService: ConfigService,
    ) {
        this.roboflowApiKey = this.configService.get<string>('ROBOFLOW_API_KEY') || 'YOUR_ROBOFLOW_API_KEY';
        this.roboflowModelEndpoint = this.configService.get<string>('ROBOFLOW_BRAIN_TUMOR_MODEL') || 'https://serverless.roboflow.com/brain-tumor-m4vom/1';
        this.uploadDir = path.join(process.cwd(), 'uploads', 'brain-scans');

        // Create upload directory if it doesn't exist
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Process a brain MRI scan image for tumor detection
     * @param patientId The FHIR Patient resource ID
     * @param file The uploaded MRI scan image file
     * @returns The brain scan record with detection results
     */
    async processBrainScan(patientId: string, file: any): Promise<BrainScan> {
        try {
            this.logger.log(`Processing brain scan for patient ${patientId}`);

            // Validate file
            if (!file) {
                throw new BadRequestException('No file uploaded');
            }

            if (!file.mimetype.includes('image')) {
                throw new BadRequestException('Uploaded file must be an image');
            }

            // Save the image to the uploads directory
            const fileName = `${Date.now()}-${file.originalname}`;
            const filePath = path.join(this.uploadDir, fileName);
            fs.writeFileSync(filePath, file.buffer);

            // Create a thumbnail for the image
            const thumbnailPath = await this.createThumbnail(filePath, fileName);

            // Create brain scan record in MongoDB
            const brainScan = await this.brainScanModel.create({
                patientId,
                scanImagePath: `/brain-scans/${fileName}`,
                thumbnailPath: `/brain-scans/thumbnails/${path.basename(thumbnailPath)}`,
                status: DetectionStatus.PENDING,
            });

            // Process the image asynchronously
            this.detectTumor(brainScan._id.toString(), filePath).catch(error => {
                this.logger.error(`Error in tumor detection: ${error.message}`, error.stack);
            });

            return brainScan;
        } catch (error) {
            this.logger.error(`Failed to process brain scan: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to process brain scan');
        }
    }

    /**
     * Create a thumbnail of the brain scan image
     * @param filePath Path to the original image
     * @param originalFileName Original file name
     * @returns Path to the created thumbnail
     */
    private async createThumbnail(filePath: string, originalFileName: string): Promise<string> {
        const thumbnailDir = path.join(this.uploadDir, 'thumbnails');

        if (!fs.existsSync(thumbnailDir)) {
            fs.mkdirSync(thumbnailDir, { recursive: true });
        }

        const thumbnailPath = path.join(thumbnailDir, `thumb-${originalFileName}`);

        await sharp(filePath)
            .resize(200, 200, { fit: 'inside' })
            .toFile(thumbnailPath);

        return thumbnailPath;
    }

    /**
     * Detect tumor in brain scan using Roboflow API
     * @param scanId The brain scan document ID
     * @param imagePath Path to the brain scan image
     */
    private async detectTumor(scanId: string, imagePath: string): Promise<void> {
        try {
            const brainScan = await this.brainScanModel.findById(scanId);
            if (!brainScan) {
                throw new Error(`Brain scan with ID ${scanId} not found`);
            }

            // Prepare form data for Roboflow API
            const formData = new FormData();
            formData.append('file', fs.createReadStream(imagePath));

            // Make request to Roboflow API
            this.logger.log(`Making request to Roboflow API at ${this.roboflowModelEndpoint}`);
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.roboflowModelEndpoint}?api_key=${this.roboflowApiKey}`,
                    formData,
                    {
                        headers: {
                            ...formData.getHeaders(),
                            'Content-Type': 'multipart/form-data',
                        },
                    }
                ).pipe(
                    catchError((error: AxiosError) => {
                        this.logger.error(`Roboflow API error: ${error.message}`, error.stack);
                        throw new InternalServerErrorException('Failed to analyze brain scan');
                    })
                )
            );

            // Process detection results
            const detectionResult = response.data;
            this.logger.log(`Roboflow API response: ${JSON.stringify(detectionResult)}`);

            // Handle different response formats from the Roboflow API
            let predictions = [];
            let bestPrediction = null;
            let tumorType = TumorType.NO_TUMOR;
            let confidence = 0;
            let tumorDetected = false;
            let tumorBoundingBox = [];

            // Check if predictions is an array or object (different model versions return different formats)
            if (Array.isArray(detectionResult.predictions)) {
                // Old format with array of predictions
                predictions = detectionResult.predictions || [];
                tumorDetected = predictions.length > 0 && predictions[0].class !== 'notumor';

                if (predictions.length > 0) {
                    // Get the prediction with highest confidence
                    bestPrediction = predictions.reduce((prev, current) =>
                        (prev.confidence > current.confidence) ? prev : current
                    );

                    confidence = bestPrediction.confidence;

                    // Map the class to tumor type
                    switch (bestPrediction.class.toLowerCase()) {
                        case 'glioma':
                            tumorType = TumorType.GLIOMA;
                            break;
                        case 'meningioma':
                            tumorType = TumorType.MENINGIOMA;
                            break;
                        case 'pituitary':
                            tumorType = TumorType.PITUITARY;
                            break;
                        case 'notumor':
                            tumorType = TumorType.NO_TUMOR;
                            break;
                        default:
                            tumorType = TumorType.OTHER;
                    }

                    // Extract bounding box coordinates
                    if (bestPrediction.x && bestPrediction.y && bestPrediction.width && bestPrediction.height) {
                        const { x, y, width, height } = bestPrediction;
                        tumorBoundingBox = [
                            { x, y },
                            { x: x + width, y },
                            { x: x + width, y: y + height },
                            { x, y: y + height }
                        ];
                    }
                }
            } else if (detectionResult.predictions && typeof detectionResult.predictions === 'object') {
                // New format with predictions as object and predicted_classes array
                const predictedClasses = detectionResult.predicted_classes || [];

                if (predictedClasses.length > 0) {
                    const predictedClass = predictedClasses[0].toLowerCase();

                    // Find the highest confidence class
                    let highestConfidence = 0;
                    let highestClass = '';

                    Object.keys(detectionResult.predictions).forEach(className => {
                        const classConfidence = detectionResult.predictions[className].confidence;
                        if (classConfidence > highestConfidence) {
                            highestConfidence = classConfidence;
                            highestClass = className;
                        }
                    });

                    confidence = highestConfidence;

                    // Check if the highest confidence class is not 'notumor'
                    tumorDetected = highestClass !== 'notumor';

                    // Map the class to tumor type
                    switch (highestClass.toLowerCase()) {
                        case 'glioma':
                            tumorType = TumorType.GLIOMA;
                            break;
                        case 'meningioma':
                            tumorType = TumorType.MENINGIOMA;
                            break;
                        case 'pituitary':
                            tumorType = TumorType.PITUITARY;
                            break;
                        case 'notumor':
                            tumorType = TumorType.NO_TUMOR;
                            break;
                        default:
                            tumorType = TumorType.OTHER;
                    }
                }
            }

            // Update brain scan record with detection results
            brainScan.status = DetectionStatus.COMPLETED;
            brainScan.detectedAt = new Date();
            brainScan.tumorDetected = tumorDetected;
            brainScan.tumorType = tumorType;
            brainScan.confidence = confidence;
            brainScan.detectionResult = detectionResult;
            brainScan.tumorBoundingBox = tumorBoundingBox;

            // Create FHIR resources for the detection result
            const fhirResources = await this.createFhirResources(brainScan);
            brainScan.fhirObservationId = fhirResources.observationId;
            brainScan.fhirDiagnosticReportId = fhirResources.diagnosticReportId;

            await brainScan.save();

            // Cache the results
            await this.cacheService.set(
                `brain-scan:${scanId}`,
                JSON.stringify(brainScan.toJSON()),
                this.cacheTTL
            );

            this.logger.log(`Successfully processed brain scan ${scanId} with tumor type: ${tumorType}`);
        } catch (error) {
            this.logger.error(`Error in tumor detection: ${error.message}`, error.stack);

            // Update brain scan record with error status
            await this.brainScanModel.findByIdAndUpdate(scanId, {
                status: DetectionStatus.FAILED,
                errorMessage: error.message,
            });
        }
    }

    /**
     * Create FHIR resources for the brain scan results
     * @param brainScan The brain scan document with detection results
     * @returns IDs of created FHIR resources
     */
    private async createFhirResources(brainScan: BrainScan): Promise<{ observationId: string; diagnosticReportId: string }> {
        try {
            const patientReference = `Patient/${brainScan.patientId}`;
            const appUrl = this.configService.get<string>('APP_EXTERNAL_URL') || 'http://localhost:3000/api';
            const imageUrl = `${appUrl}${brainScan.scanImagePath}`;

            // Create Observation resource for tumor detection
            const observationResource = {
                resourceType: 'Observation',
                status: 'final',
                category: [
                    {
                        coding: [
                            {
                                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                                code: 'imaging',
                                display: 'Imaging',
                            },
                        ],
                    },
                ],
                code: {
                    coding: [
                        {
                            system: 'http://loinc.org',
                            code: '59772-4',
                            display: 'Brain MRI Tumor Detection',
                        },
                    ],
                    text: 'Brain MRI Tumor Detection',
                },
                subject: {
                    reference: patientReference,
                },
                effectiveDateTime: brainScan.detectedAt.toISOString(),
                issued: new Date().toISOString(),
                performer: [
                    {
                        display: 'AI Tumor Detection System',
                    },
                ],
                valueBoolean: brainScan.tumorDetected,
                interpretation: [
                    {
                        coding: [
                            {
                                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                                code: brainScan.tumorDetected ? 'A' : 'N',
                                display: brainScan.tumorDetected ? 'Abnormal' : 'Normal',
                            },
                        ],
                        text: brainScan.tumorDetected ? 'Tumor detected' : 'No tumor detected',
                    },
                ],
                component: [
                    {
                        code: {
                            coding: [
                                {
                                    system: 'http://loinc.org',
                                    code: '59776-5',
                                    display: 'Tumor Type',
                                },
                            ],
                            text: 'Tumor Type',
                        },
                        valueString: brainScan.tumorType,
                    },
                    {
                        code: {
                            coding: [
                                {
                                    system: 'http://loinc.org',
                                    code: '59777-3',
                                    display: 'Detection Confidence',
                                },
                            ],
                            text: 'Detection Confidence',
                        },
                        valueQuantity: {
                            value: brainScan.confidence,
                            system: 'http://unitsofmeasure.org',
                            code: '1',
                            unit: 'score'
                        },
                    },
                ],
            };

            const observationResponse = await this.fhirService.create('Observation', observationResource);
            const observationId = observationResponse.id;

            // Create DiagnosticReport resource
            const diagnosticReportResource = {
                resourceType: 'DiagnosticReport',
                status: 'final',
                category: [
                    {
                        coding: [
                            {
                                system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
                                code: 'RAD',
                                display: 'Radiology',
                            },
                        ],
                    },
                ],
                code: {
                    coding: [
                        {
                            system: 'http://loinc.org',
                            code: '42273-0',
                            display: 'Brain MRI Diagnostic Report',
                        },
                    ],
                    text: 'Brain MRI Diagnostic Report',
                },
                subject: {
                    reference: patientReference,
                },
                effectiveDateTime: brainScan.detectedAt.toISOString(),
                issued: new Date().toISOString(),
                performer: [
                    {
                        display: 'AI Tumor Detection System',
                    },
                ],
                result: [
                    {
                        reference: `Observation/${observationId}`,
                    },
                ],
                conclusion: brainScan.tumorDetected
                    ? `Brain tumor detected with ${Math.round(brainScan.confidence * 100)}% confidence. Type: ${brainScan.tumorType}`
                    : 'No brain tumor detected',
                conclusionCode: [
                    {
                        coding: [
                            {
                                system: 'http://snomed.info/sct',
                                code: brainScan.tumorDetected ? '429040005' : '281900007',
                                display: brainScan.tumorDetected ? 'Brain tumor finding' : 'No abnormality detected',
                            },
                        ],
                    },
                ],
                media: [
                    {
                        comment: 'Brain MRI Scan',
                        link: {
                            contentType: 'image/jpeg',
                            url: imageUrl,
                        },
                    },
                ],
            };

            const diagnosticReportResponse = await this.fhirService.create('DiagnosticReport', diagnosticReportResource);
            const diagnosticReportId = diagnosticReportResponse.id;

            return { observationId, diagnosticReportId };
        } catch (error) {
            this.logger.error(`Failed to create FHIR resources: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get a brain scan by ID
     * @param scanId The brain scan ID
     * @returns The brain scan document
     */
    async getBrainScanById(scanId: string): Promise<BrainScan> {
        try {
            // Try to get from cache first
            const cachedScan = await this.cacheService.get(`brain-scan:${scanId}`);
            if (cachedScan) {
                return JSON.parse(cachedScan);
            }

            // If not in cache, get from database
            const brainScan = await this.brainScanModel.findById(scanId);
            if (!brainScan) {
                throw new BadRequestException(`Brain scan with ID ${scanId} not found`);
            }

            return brainScan;
        } catch (error) {
            this.logger.error(`Failed to get brain scan: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to retrieve brain scan');
        }
    }

    /**
     * Get all brain scans for a patient
     * @param patientId The FHIR Patient resource ID
     * @returns Array of brain scan documents
     */
    async getBrainScansByPatientId(patientId: string): Promise<BrainScan[]> {
        try {
            return this.brainScanModel.find({ patientId }).sort({ createdAt: -1 });
        } catch (error) {
            this.logger.error(`Failed to get brain scans: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to retrieve brain scans');
        }
    }

    /**
     * Delete a brain scan by ID
     * @param scanId The brain scan ID
     * @returns Success message
     */
    async deleteBrainScan(scanId: string): Promise<{ message: string }> {
        try {
            const brainScan = await this.brainScanModel.findById(scanId);
            if (!brainScan) {
                throw new BadRequestException(`Brain scan with ID ${scanId} not found`);
            }

            // Delete image files
            if (brainScan.scanImagePath) {
                const filePath = path.join(process.cwd(), 'uploads', brainScan.scanImagePath);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            if (brainScan.thumbnailPath) {
                const thumbnailPath = path.join(process.cwd(), 'uploads', brainScan.thumbnailPath);
                if (fs.existsSync(thumbnailPath)) {
                    fs.unlinkSync(thumbnailPath);
                }
            }

            // Delete FHIR resources
            if (brainScan.fhirObservationId) {
                await this.fhirService.delete('Observation', brainScan.fhirObservationId);
            }

            if (brainScan.fhirDiagnosticReportId) {
                await this.fhirService.delete('DiagnosticReport', brainScan.fhirDiagnosticReportId);
            }

            // Delete from database
            await this.brainScanModel.findByIdAndDelete(scanId);

            // Delete from cache
            await this.cacheService.del(`brain-scan:${scanId}`);

            return { message: 'Brain scan deleted successfully' };
        } catch (error) {
            this.logger.error(`Failed to delete brain scan: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to delete brain scan');
        }
    }
} 
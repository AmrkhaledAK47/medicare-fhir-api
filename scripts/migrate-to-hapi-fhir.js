#!/usr/bin/env node
/**
 * Migration script to transfer FHIR resources from MongoDB to HAPI FHIR server
 * 
 * Usage:
 *   node migrate-to-hapi-fhir.js --mongoUri=mongodb://localhost:27017/medicare --hapiFhirUrl=http://localhost:9090/fhir
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const axios = require('axios');
const commander = require('commander');
const program = new commander.Command();
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');

// Parse command line arguments
program
    .option('--mongoUri <uri>', 'MongoDB connection URI', process.env.MONGODB_URI || 'mongodb://localhost:27017/medicare')
    .option('--hapiFhirUrl <url>', 'HAPI FHIR server URL', process.env.HAPI_FHIR_URL || 'http://localhost:9090/fhir')
    .option('--batchSize <size>', 'Number of resources to process in one batch', '100')
    .option('--resourceTypes <types>', 'Comma-separated list of resource types to migrate', 'Patient,Practitioner,Organization,Encounter,Observation,DiagnosticReport,Medication,MedicationRequest,Condition')
    .option('--dryRun', 'Perform a dry run without sending data to HAPI FHIR', false)
    .option('--logLevel <level>', 'Log level (debug, info, warn, error)', 'info')
    .parse(process.argv);

const options = program.opts();

// Configure logging
const logLevels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const logLevel = logLevels[options.logLevel] || logLevels.info;

function log(level, message, data = null) {
    if (logLevels[level] >= logLevel) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        if (data && logLevels[level] === logLevels.debug) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
}

// Create MongoDB client
const mongoClient = new MongoClient(options.mongoUri);

// Create HAPI FHIR client
const hapiFhir = axios.create({
    baseURL: options.hapiFhirUrl,
    headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
    },
});

// Prompt for confirmation
function confirmContinue(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(`${message} (y/n): `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

// Convert MongoDB document to FHIR resource
function convertToFhirResource(doc) {
    // If it's already in FHIR format, just return the data
    if (doc.data && doc.data.resourceType) {
        return doc.data;
    }

    // If it's a custom format, convert it to FHIR
    // This is a simplified example - adjust based on your actual data structure
    if (doc.resourceType) {
        return {
            ...doc,
            id: doc._id.toString(),
            meta: {
                versionId: doc.version || '1',
                lastUpdated: doc.lastUpdated || new Date().toISOString(),
            },
        };
    }

    // If we can't determine the format, log an error and return null
    log('error', `Unable to convert document to FHIR resource: ${doc._id}`);
    return null;
}

// Migrate a batch of resources
async function migrateBatch(db, resourceType, skip, batchSize) {
    const collection = db.collection('fhir_resources');

    // Find resources of the given type
    const query = { resourceType };
    const resources = await collection
        .find(query)
        .skip(skip)
        .limit(parseInt(batchSize))
        .toArray();

    log('info', `Processing batch of ${resources.length} ${resourceType} resources`);

    const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        details: [],
    };

    for (const doc of resources) {
        try {
            const resource = convertToFhirResource(doc);

            if (!resource) {
                results.skipped++;
                continue;
            }

            // In dry run mode, just log the resource
            if (options.dryRun) {
                log('debug', `Would send ${resourceType}/${resource.id || 'new'} to HAPI FHIR`, resource);
                results.success++;
                continue;
            }

            // Send to HAPI FHIR
            const response = await hapiFhir.put(
                `/${resourceType}/${resource.id || uuidv4()}`,
                resource
            );

            log('debug', `Migrated ${resourceType}/${resource.id} to HAPI FHIR`);
            results.success++;
            results.details.push({
                id: resource.id,
                status: 'success',
                hapiFhirId: response.data.id,
            });
        } catch (error) {
            log('error', `Error migrating ${resourceType}/${doc._id}: ${error.message}`);
            results.failed++;
            results.details.push({
                id: doc._id,
                status: 'error',
                error: error.message,
            });
        }
    }

    return {
        count: resources.length,
        ...results,
    };
}

// Main migration function
async function migrateResources() {
    try {
        log('info', 'Starting migration from MongoDB to HAPI FHIR...');
        log('info', `MongoDB URI: ${options.mongoUri}`);
        log('info', `HAPI FHIR URL: ${options.hapiFhirUrl}`);
        log('info', `Resource types: ${options.resourceTypes}`);
        log('info', `Batch size: ${options.batchSize}`);
        log('info', `Dry run: ${options.dryRun}`);

        // Check HAPI FHIR server connectivity
        log('info', 'Checking HAPI FHIR server connectivity...');
        try {
            const response = await hapiFhir.get('/metadata');
            log('info', `Connected to HAPI FHIR server ${response.data.software?.name || 'Unknown'} version ${response.data.software?.version || 'Unknown'}`);
        } catch (error) {
            log('error', `Failed to connect to HAPI FHIR server: ${error.message}`);
            return;
        }

        // Connect to MongoDB
        log('info', 'Connecting to MongoDB...');
        await mongoClient.connect();
        log('info', 'Connected to MongoDB');

        const db = mongoClient.db();

        // Check if fhir_resources collection exists
        const collections = await db.listCollections({ name: 'fhir_resources' }).toArray();
        if (collections.length === 0) {
            log('error', 'Collection fhir_resources not found in the database');
            return;
        }

        // Get resource counts
        const collection = db.collection('fhir_resources');
        const resourceTypes = options.resourceTypes.split(',');
        const totalCounts = {};

        for (const resourceType of resourceTypes) {
            const count = await collection.countDocuments({ resourceType });
            totalCounts[resourceType] = count;
            log('info', `Found ${count} ${resourceType} resources`);
        }

        // Confirm migration
        const totalCount = Object.values(totalCounts).reduce((sum, count) => sum + count, 0);
        if (!options.dryRun) {
            const confirmed = await confirmContinue(
                `This will migrate ${totalCount} resources to HAPI FHIR. Continue?`
            );
            if (!confirmed) {
                log('info', 'Migration cancelled by user');
                return;
            }
        }

        // Migrate resources
        const results = {};
        for (const resourceType of resourceTypes) {
            const count = totalCounts[resourceType];
            if (count === 0) {
                continue;
            }

            log('info', `Migrating ${count} ${resourceType} resources...`);
            results[resourceType] = {
                total: count,
                migrated: 0,
                failed: 0,
                skipped: 0,
            };

            // Process in batches
            const batchSize = parseInt(options.batchSize);
            for (let skip = 0; skip < count; skip += batchSize) {
                const batchResult = await migrateBatch(db, resourceType, skip, batchSize);

                results[resourceType].migrated += batchResult.success;
                results[resourceType].failed += batchResult.failed;
                results[resourceType].skipped += batchResult.skipped;

                log('info', `Batch completed: ${batchResult.success} succeeded, ${batchResult.failed} failed, ${batchResult.skipped} skipped`);

                // Add a small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Print summary
        log('info', 'Migration completed:');
        for (const [resourceType, result] of Object.entries(results)) {
            log('info', `${resourceType}: ${result.migrated}/${result.total} migrated, ${result.failed} failed, ${result.skipped} skipped`);
        }

    } catch (error) {
        log('error', `Migration failed: ${error.message}`);
        log('error', error.stack);
    } finally {
        await mongoClient.close();
        log('info', 'MongoDB connection closed');
    }
}

// Run the migration
migrateResources().catch(console.error); 
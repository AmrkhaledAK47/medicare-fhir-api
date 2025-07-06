const axios = require('axios');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Configuration
const DARENA_API_URL = process.env.DARENA_API_URL || 'https://api.darenahealth.com';
const DARENA_API_KEY = process.env.DARENA_API_KEY || '';

// Load test data
const patientData = JSON.parse(fs.readFileSync('./patient_data.json', 'utf8'));
const observationData = JSON.parse(fs.readFileSync('./observation_data.json', 'utf8'));

// Headers for API calls
const headers = {
    'Authorization': `Bearer ${DARENA_API_KEY}`,
    'Content-Type': 'application/json',
};

// Test functions
async function syncPatientData() {
    try {
        console.log('Syncing patient data with DaRena Health...');
        const response = await axios.post(
            `${DARENA_API_URL}/patients/sync`,
            { fhirData: patientData },
            { headers }
        );
        console.log('Patient sync successful:', response.data);
        return response.data;
    } catch (error) {
        console.error('Failed to sync patient data:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        return null;
    }
}

async function syncObservationData() {
    try {
        console.log('Syncing observation data with DaRena Health...');
        const response = await axios.post(
            `${DARENA_API_URL}/patients/sync`,
            { fhirData: observationData },
            { headers }
        );
        console.log('Observation sync successful:', response.data);
        return response.data;
    } catch (error) {
        console.error('Failed to sync observation data:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        return null;
    }
}

async function getPatientAnalytics() {
    try {
        console.log('Getting patient analytics from DaRena Health...');
        const response = await axios.get(
            `${DARENA_API_URL}/analytics/patient/${patientData.id}`,
            { headers }
        );
        console.log('Patient analytics retrieved successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Failed to get patient analytics:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        return null;
    }
}

async function scheduleTelehealthAppointment() {
    try {
        console.log('Scheduling telehealth appointment...');
        const appointmentData = {
            practitionerId: '112',
            patientId: patientData.id,
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            duration: 30,
            type: 'follow-up',
            reason: 'Heart rate follow-up',
            notes: 'Review recent heart rate measurements',
            relatedResources: [observationData.id]
        };

        const response = await axios.post(
            `${DARENA_API_URL}/telehealth/appointments`,
            appointmentData,
            { headers }
        );
        console.log('Appointment scheduled successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Failed to schedule appointment:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        return null;
    }
}

// Run tests
async function runTests() {
    console.log('Starting DaRena Health integration tests...');
    console.log('API URL:', DARENA_API_URL);
    console.log('API Key:', DARENA_API_KEY ? '****' + DARENA_API_KEY.slice(-4) : 'Not configured');

    if (!DARENA_API_KEY) {
        console.error('ERROR: DaRena API key not configured. Please set DARENA_API_KEY in .env file.');
        return;
    }

    try {
        // Run tests in sequence
        await syncPatientData();
        await syncObservationData();
        await getPatientAnalytics();
        await scheduleTelehealthAppointment();

        console.log('All tests completed!');
    } catch (error) {
        console.error('Test execution failed:', error.message);
    }
}

// Run the tests
runTests(); 
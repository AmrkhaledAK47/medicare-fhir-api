# Third-Party FHIR Server Integration Guide

This guide provides instructions for integrating your MediCare application with third-party FHIR servers beyond the included HAPI FHIR reference implementation.

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Supported FHIR Servers](#supported-fhir-servers)
4. [Configuration Steps](#configuration-steps)
5. [Authentication Methods](#authentication-methods)
6. [Testing Your Integration](#testing-your-integration)
7. [Troubleshooting](#troubleshooting)

## Introduction

Our MediCare application is designed with a flexible architecture that enables integration with various FHIR-compliant servers. By default, we include a HAPI FHIR server for development and testing, but production implementations typically connect to enterprise-grade FHIR servers.

## Prerequisites

Before proceeding with third-party integration, ensure you have:

- A fully functional MediCare application
- Access credentials for your target FHIR server
- Network connectivity between your application and the target server
- Knowledge of the FHIR version supported by your target server

## Supported FHIR Servers

The MediCare application has been tested with the following FHIR servers:

| FHIR Server | Versions Supported | Notes |
|-------------|-------------------|-------|
| HAPI FHIR JPA Server | DSTU3, R4, R5 | Included in development setup |
| Microsoft FHIR Server | R4 | Requires Azure setup |
| IBM FHIR Server | R4 | Supports cloud or on-premises |
| Google Healthcare API | DSTU3, R4 | Requires GCP project |
| InterSystems IRIS for Health | DSTU2, DSTU3, R4 | Enterprise healthcare platform |

## Configuration Steps

### 1. Update Environment Variables

Create or edit your `.env` file to include the following variables:

```
# FHIR Server Configuration
FHIR_SERVER_URL=https://your-fhir-server.com/fhir
FHIR_VERSION=R4
FHIR_AUTH_TYPE=bearer|basic|none
FHIR_AUTH_TOKEN=your-token-or-credentials
FHIR_TIMEOUT=30000

# Optional - For secure connections
FHIR_TLS_REJECT_UNAUTHORIZED=true
FHIR_CLIENT_CERT=/path/to/cert.pem
FHIR_CLIENT_KEY=/path/to/key.pem
FHIR_CA=/path/to/ca.pem
```

### 2. Modify External FHIR Service Configuration

Edit the `src/fhir/services/external-fhir.service.ts` file to connect to your FHIR server:

```typescript
// Adjust the connection parameters according to your target server
this.fhirClient = new FhirClient({
  baseUrl: this.configService.get('FHIR_SERVER_URL'),
  auth: {
    type: this.configService.get('FHIR_AUTH_TYPE'),
    token: this.configService.get('FHIR_AUTH_TOKEN'),
  },
});
```

### 3. Update Resource Routing

In `src/fhir/fhir.module.ts`, update the resource routing strategy:

```typescript
@Module({
  imports: [
    ConfigModule,
    // Update resource routing based on environment configuration
    ExternalFhirResourcesModule.forRoot({
      serverUrl: process.env.FHIR_SERVER_URL,
      version: process.env.FHIR_VERSION,
      // Which resources to handle locally vs. route to external server
      localResources: ['Patient', 'Practitioner', 'Encounter'],
      externalResources: ['*'], // Route all other resources externally
    }),
  ],
})
export class FhirModule {}
```

## Authentication Methods

### Bearer Token Authentication

Most modern FHIR servers use OAuth 2.0 with Bearer tokens. Configure as follows:

```typescript
// In external-fhir.service.ts
private async getAccessToken(): Promise<string> {
  const response = await this.httpService.post(
    this.configService.get('OAUTH_TOKEN_URL'),
    {
      grant_type: 'client_credentials',
      client_id: this.configService.get('OAUTH_CLIENT_ID'),
      client_secret: this.configService.get('OAUTH_CLIENT_SECRET'),
      scope: 'system/*.read system/*.write',
    },
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  ).toPromise();
  
  return response.data.access_token;
}
```

### Basic Authentication

For servers using basic authentication:

```typescript
const auth = Buffer.from(`${username}:${password}`).toString('base64');
const headers = { Authorization: `Basic ${auth}` };
```

### SMART on FHIR

For SMART on FHIR authentication:

```typescript
// Follow the SMART app launch sequence
// 1. Redirect user to authorization endpoint
// 2. Exchange authorization code for access token
// 3. Use token for FHIR API access
```

## Testing Your Integration

Run the integration test script:

```bash
./test-fhir-integration.sh
```

This script will:
1. Test connectivity to your FHIR server
2. Verify authentication
3. Test CRUD operations on key resources
4. Verify search functionality

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check network connectivity and firewall rules
   - Verify server URL is correct including protocol (http vs https)

2. **Authentication Failures**
   - Ensure credentials are valid and not expired
   - Check if IP restrictions are in place

3. **Resource Not Found (404)**
   - Verify the resource endpoint path
   - Check if your server uses a different FHIR version

4. **CORS Issues**
   - Add your application's domain to the FHIR server's CORS allowed origins

### Logs and Diagnostics

To enable detailed logging:

```typescript
// In your app module
LoggerModule.forRoot({
  level: 'debug',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    new winston.transports.File({ filename: 'fhir-integration.log' }),
  ],
})
```

---

For additional support and guidance on integrating with specific FHIR servers, consult our [community forum](https://community.medicare.org) or contact the support team. 
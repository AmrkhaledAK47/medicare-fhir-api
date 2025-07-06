# Dashboard Module

## Overview

The Dashboard module provides a comprehensive API for retrieving user dashboard data, including profile information, biomarkers, appointments, calendar events, and quick actions. It's designed to aggregate data from multiple sources (MongoDB and FHIR) into a single, consistent response format.

## Module Structure

```
src/dashboard/
├── dashboard.controller.ts     # API controller for the dashboard endpoint
├── dashboard.module.ts         # Module definition and dependencies
├── dashboard.service.ts        # Service for building the dashboard data
├── dto/                        # Data Transfer Objects
│   └── dashboard.dto.ts        # DTO for the dashboard response
├── services/                   # Domain-specific services
│   ├── appointment.service.ts  # Service for retrieving appointment data
│   ├── biomarker.service.ts    # Service for retrieving biomarker data
│   ├── calendar.service.ts     # Service for retrieving calendar events
│   ├── patient-profile.service.ts # Service for retrieving patient profile data
│   └── quick-action.service.ts # Service for retrieving quick actions
├── BIOMARKER_CODES.md          # Documentation for biomarker LOINC codes
└── README.md                   # This file
```

## Caching Strategy

All dashboard components are cached for 60 seconds using Redis. This improves performance and reduces load on the FHIR server. The cache is invalidated when the TTL expires.

## Error Handling

The dashboard API is designed to be resilient to partial failures. If one component fails (e.g., biomarkers), the rest of the dashboard will still be returned with an `errors` array indicating which components failed.

## Dependencies

- **FhirModule**: For retrieving FHIR resources
- **UsersModule**: For retrieving user data from MongoDB
- **CacheModule**: For caching dashboard components
- **MetricsModule**: For recording performance metrics

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /dashboard | Get dashboard data for the authenticated user |

## Documentation

- See `BIOMARKER_CODES.md` for details on the biomarker LOINC codes
- See `DASHBOARD_API_DOCUMENTATION.md` for comprehensive API documentation 
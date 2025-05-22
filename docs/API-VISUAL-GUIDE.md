# MediCare FHIR API Visual Guide

## Architecture Overview

```
┌───────────────┐       ┌─────────────────┐       ┌────────────────┐
│  Client Apps  │ ──────▶ MediCare NestJS │ ──────▶ HAPI FHIR      │
│  (Frontend)   │       │ Backend API     │       │ Server         │
└───────────────┘       └─────────────────┘       └────────────────┘
                                │                         │
                                │                         │
                                ▼                         ▼
                         ┌─────────────┐          ┌─────────────┐
                         │ Auth DB     │          │ MongoDB     │
                         │ (MongoDB)   │          │ (FHIR Data) │
                         └─────────────┘          └─────────────┘
```

## Authentication Flow

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│  Client  │          │  API     │          │ Database │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │  Login Request      │                     │
     │ ───────────────────▶│                     │
     │                     │                     │
     │                     │  Validate User      │
     │                     │ ───────────────────▶│
     │                     │                     │
     │                     │◀───────────────────-│
     │                     │                     │
     │                     │  Generate JWT       │
     │                     │─────┐               │
     │                     │     │               │
     │                     │◀────┘               │
     │                     │                     │
     │  Return JWT Token   │                     │
     │◀───────────────────-│                     │
     │                     │                     │
     │  API Request + JWT  │                     │
     │ ───────────────────▶│                     │
     │                     │                     │
     │                     │  Verify JWT         │
     │                     │─────┐               │
     │                     │     │               │
     │                     │◀────┘               │
     │                     │                     │
     │  Return Response    │                     │
     │◀───────────────────-│                     │
     │                     │                     │
```

## Role-Based Access Control

### Admin Role

```
┌─────────────────┐
│     Admin       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Full Access:                            │
│ - All FHIR Resources                    │
│ - System Configuration                  │
│ - User Management                       │
│ - Audit Logs                            │
└─────────────────────────────────────────┘
```

### Practitioner Role

```
┌─────────────────┐
│  Practitioner   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Limited Access:                         │
│ - Assigned Patients                     │
│ - Clinical Resources                    │
│ - Medications & Prescriptions           │
│ - Diagnostic Reports                    │
└─────────────────────────────────────────┘
```

### Patient Role

```
┌─────────────────┐
│     Patient     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Restricted Access:                      │
│ - Own Medical Records                   │
│ - Own Appointments                      │
│ - Own Prescriptions                     │
│ - Limited Access to Diagnostic Reports  │
└─────────────────────────────────────────┘
```

## FHIR Resource Relationships

```
                   ┌───────────────┐
                   │  Patient      │
                   └───────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
┌───────────▼───┐ ┌────────▼─────┐ ┌──────▼───────┐
│ Encounter     │ │ Observation  │ │ Medication   │
└───────────┬───┘ └──────────────┘ └──────────────┘
            │
┌───────────▼───┐
│ Diagnostic    │
│ Report        │
└───────────────┘
```

## API Request Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Request │────▶│ Auth Guard  │────▶│ Controller   │────▶│ Service      │
└─────────┘     └─────────────┘     └──────────────┘     └──────┬───────┘
                                                                │
                       ┌───────────────────────────────────────┐│
                       │                                       ││
                 ┌─────▼─────┐                          ┌──────▼───────┐
                 │ Local DB  │                          │ HAPI FHIR    │
                 │ MongoDB   │                          │ Server       │
                 └───────────┘                          └──────────────┘
```

## FHIR Search Query Flow

```
┌───────────┐               ┌───────────────────┐               ┌───────────────┐
│           │               │                   │               │               │
│  Client   │───────────────▶  NestJS Backend   │───────────────▶  HAPI FHIR    │
│           │               │                   │               │               │
└───────────┘               └───────────────────┘               └───────────────┘
      │                              │                                 │
      │                              │                                 │
      │ GET /fhir/Patient?name=John  │                                 │
      │ &birthdate=gt2000-01-01      │                                 │
      │                              │                                 │
      │                              │ GET /fhir/Patient?name=John     │
      │                              │ &birthdate=gt2000-01-01         │
      │                              │                                 │
      │                              │                                 │
      │                              │                        Search MongoDB
      │                              │                                 │
      │                              │                                 │
      │                              │       Return FHIR Bundle        │
      │                              │◀────────────────────────────────┤
      │                              │                                 │
      │      Return FHIR Bundle      │                                 │
      │◀─────────────────────────────┤                                 │
      │                              │                                 │
```

## Database Schema Overview

### User Collection (Authentication DB)
```json
{
  "_id": "ObjectId",
  "email": "String",
  "password": "String (hashed)",
  "role": "String (admin|practitioner|patient)",
  "profileId": "String (reference to FHIR resource)",
  "active": "Boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### FHIR Resources (HAPI FHIR MongoDB)
Resources follow the standard FHIR schema (R4) with typical structure:

```json
{
  "resourceType": "String",
  "id": "String",
  "meta": {
    "versionId": "String",
    "lastUpdated": "Date"
  },
  // Resource-specific fields
}
```

## Error Handling

```
┌───────────┐          ┌────────────┐          ┌───────────────┐
│  Client   │          │  API       │          │  Error        │
└─────┬─────┘          └──────┬─────┘          │  Handler      │
      │                       │                └───────┬───────┘
      │                       │                        │
      │                       │                        │
      │  Invalid Request      │                        │
      │─────────────────────▶│                         │
      │                       │                        │
      │                       │ Exception              │
      │                       │────────────────────────▶
      │                       │                        │
      │                       │                        │ Format Error
      │                       │                        │ Response
      │                       │◀───────────────────────┤
      │                       │                        │
      │  HTTP 4XX/5XX +       │                        │
      │  Error Object         │                        │
      │◀──────────────────────┤                        │
      │                       │                        │
```

## Deployment Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     Production Environment                    │
└───────────────────────────────────────────────────────────────┘
┌─────────────┐      ┌─────────────┐      ┌─────────────────────┐
│ Load        │      │ NestJS API  │      │                     │
│ Balancer    │──────▶ Container   │──────▶                     │
│ (Nginx)     │      │ Cluster     │      │                     │
└─────────────┘      └─────────────┘      │  HAPI FHIR Server   │
                                          │                     │
                     ┌─────────────┐      │                     │
                     │ Admin       │──────▶                     │
                     │ Dashboard   │      └─────────────────────┘
                     └─────────────┘               │
                                                   │
                                          ┌────────▼────────┐
                                          │                 │
                                          │  MongoDB        │
                                          │  Cluster        │
                                          │                 │
                                          └─────────────────┘
``` 
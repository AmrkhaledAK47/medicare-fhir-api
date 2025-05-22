# MediCare FHIR API Architecture

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Client Apps    │────▶│  MediCare API   │────▶│   MongoDB       │
│  (Web/Mobile)   │     │  (NestJS)       │     │   Database      │
│                 │◀────│                 │◀────│                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                               │
                               │ Optional
                               ▼
                        ┌─────────────────┐
                        │                 │
                        │  External       │
                        │  FHIR Server    │
                        │  (HAPI FHIR)    │
                        │                 │
                        └─────────────────┘
```

## Application Layers

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Controllers (API Endpoints)                            │
│  - AuthController                                       │
│  - UsersController                                      │
│  - FhirController                                       │
│  - Resource-specific Controllers (Patient, etc.)        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Services (Business Logic)                              │
│  - AuthService                                          │
│  - UsersService                                         │
│  - FhirService                                          │
│  - Resource-specific Services                           │
│  - EmailService                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Data Access                                            │
│  - MongoDB Models/Schemas                               │
│  - External FHIR Server Integration                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Cross-Cutting Concerns                                 │
│  - Authentication (JWT)                                 │
│  - Authorization (Role-based)                           │
│  - Validation                                           │
│  - Error Handling                                       │
│  - Logging                                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│          │          │          │          │          │
│  Client  │          │   API    │          │ Database │
│          │          │          │          │          │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │  Login Request      │                     │
     │ ──────────────────> │                     │
     │                     │                     │
     │                     │  Verify Credentials │
     │                     │ ──────────────────> │
     │                     │                     │
     │                     │  User Data          │
     │                     │ <────────────────── │
     │                     │                     │
     │                     │  Generate JWT       │
     │                     │ ─────┐              │
     │                     │      │              │
     │                     │ <────┘              │
     │                     │                     │
     │  JWT Token          │                     │
     │ <────────────────── │                     │
     │                     │                     │
     │  Request + JWT      │                     │
     │ ──────────────────> │                     │
     │                     │                     │
     │                     │  Validate JWT       │
     │                     │ ─────┐              │
     │                     │      │              │
     │                     │ <────┘              │
     │                     │                     │
     │                     │  Check Permissions  │
     │                     │ ─────┐              │
     │                     │      │              │
     │                     │ <────┘              │
     │                     │                     │
     │  Response           │                     │
     │ <────────────────── │                     │
     │                     │                     │
```

## FHIR Resource Handling

```
┌─────────────────┐     ┌─────────────────────────────────────────┐
│                 │     │                                         │
│                 │     │            FhirController               │
│                 │     │                                         │
│                 │     └───────────────────┬─────────────────────┘
│                 │                         │
│                 │                         │
│                 │     ┌───────────────────▼─────────────────────┐
│                 │     │                                         │
│     Client      │     │            FhirService                  │
│                 │     │                                         │
│                 │     └───┬───────────────────────────────┬─────┘
│                 │         │                               │
│                 │         │                               │
│                 │     ┌───▼───────────────┐     ┌─────────▼─────┐
│                 │     │                   │     │               │
│                 │     │  Resource Services│     │External FHIR  │
│                 │     │  (MongoDB)        │     │Service        │
└─────────────────┘     └───────────────────┘     └───────────────┘
```

## Role-Based Access Control

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌──────────┐       ┌──────────┐        ┌──────────┐            │
│  │          │       │          │        │          │            │
│  │  Admin   │       │Practit-  │        │ Patient  │            │
│  │          │       │ioner     │        │          │            │
│  └────┬─────┘       └────┬─────┘        └────┬─────┘            │
│       │                  │                   │                   │
│       ▼                  ▼                   ▼                   │
│  ┌──────────┐       ┌──────────┐        ┌──────────┐            │
│  │ All      │       │ Assigned │        │ Own      │            │
│  │ Resources│       │ Patients │        │ Records  │            │
│  └──────────┘       └──────────┘        └──────────┘            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │                  RolesGuard                              │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
``` 
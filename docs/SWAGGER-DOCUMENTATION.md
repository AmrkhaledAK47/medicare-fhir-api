# Swagger API Documentation Guide

This guide explains how to generate, view, and deploy the Swagger API documentation for the MediCare FHIR API.

## Overview

The MediCare FHIR API uses OpenAPI/Swagger for comprehensive API documentation. This documentation is automatically generated from the code and can be:

1. Viewed directly in the application
2. Generated as static files
3. Deployed to various hosting platforms

## Viewing Documentation in Development

When running the application in development mode, the Swagger documentation is automatically available at:

```
http://localhost:3000/api/docs
```

This provides an interactive UI where you can:
- Browse all API endpoints
- View request/response schemas
- Test API calls directly (with authentication)
- View detailed descriptions and examples

## Generating Static Documentation

To generate static documentation files that can be shared with the frontend team or deployed to a static hosting service:

```bash
# Install dependencies if you haven't already
npm install

# Generate the Swagger documentation
npm run swagger:generate
```

This will:
1. Start the application temporarily
2. Fetch the complete Swagger documentation
3. Generate static files in the `swagger-static` directory
4. Create an HTML interface for viewing the documentation

The generated files include:
- `swagger.json` - The complete OpenAPI specification
- `index.html` - An HTML interface for viewing the documentation
- `README.md` - Instructions for using the API

## Serving Documentation Locally

To view the generated documentation locally:

```bash
npm run swagger:serve
```

This will start a local HTTP server and open the documentation in your browser at `http://localhost:8000`.

## Deploying Documentation

### Option 1: Deploy using the script

We provide a script to easily deploy the documentation to various platforms:

```bash
# Show available deployment options
npm run swagger:deploy

# Deploy to a specific platform (e.g., Netlify)
npm run swagger:deploy netlify
```

Supported platforms:
- Local (`local`)
- Netlify (`netlify`)
- GitHub Pages (`github`)
- Surge.sh (`surge`)
- AWS S3 (`s3`)
- Firebase Hosting (`firebase`)
- Vercel (`vercel`)

### Option 2: Manual deployment

You can also manually deploy the `swagger-static` directory to any static hosting service:

1. Generate the documentation: `npm run swagger:generate`
2. Copy the entire `swagger-static` directory to your hosting service
3. Configure your hosting service to serve the `index.html` file

## Customizing Documentation

### Adding Examples

To add more detailed examples to the documentation:

1. Use the `@ApiBody` decorator with examples in your controllers
2. Use the `@ApiResponse` decorator with examples for responses

Example:

```typescript
@Post()
@ApiOperation({ summary: 'Create a new patient' })
@ApiBody({
  description: 'Patient data',
  schema: {
    example: {
      resourceType: 'Patient',
      name: [{ 
        use: 'official',
        family: 'Smith',
        given: ['John']
      }],
      gender: 'male',
      birthDate: '1970-01-01'
    }
  }
})
@ApiResponse({
  status: 201,
  description: 'Patient created successfully',
  schema: {
    example: {
      id: '123',
      resourceType: 'Patient',
      name: [{ 
        use: 'official',
        family: 'Smith',
        given: ['John']
      }]
    }
  }
})
createPatient(@Body() data: any) {
  // ...
}
```

### Adding Descriptions

To improve the documentation with more detailed descriptions:

1. Use the `@ApiOperation` decorator with detailed summaries and descriptions
2. Use the `@ApiParam` and `@ApiQuery` decorators with descriptions for parameters

Example:

```typescript
@Get(':id')
@ApiOperation({ 
  summary: 'Get patient by ID',
  description: 'Retrieves a specific patient by their unique identifier. Returns the complete FHIR Patient resource.'
})
@ApiParam({ 
  name: 'id', 
  description: 'The unique identifier of the patient',
  example: '1234567890'
})
@ApiResponse({ 
  status: 200, 
  description: 'The patient resource was successfully retrieved'
})
@ApiResponse({ 
  status: 404, 
  description: 'The patient with the specified ID was not found'
})
getPatient(@Param('id') id: string) {
  // ...
}
```

## Enhancing Swagger Documentation

### Adding Response Examples

Response examples provide concrete examples of what your API returns. This helps frontend developers understand the structure of your responses.

```typescript
// Import example utilities
import { createFhirResponseExample, getCommonFhirErrorResponses } from '../dto/examples';

@Get(':id')
@ApiOperation({ 
    summary: 'Get a patient by ID',
    description: 'Detailed description of the endpoint'
})
@ApiParam({ name: 'id', description: 'Patient ID' })
@ApiResponse({ 
    status: 200, 
    description: 'Patient retrieved successfully',
    content: {
        'application/fhir+json': createFhirResponseExample('Patient', 'basicPatient')
    }
})
@ApiResponse(getCommonFhirErrorResponses()[404])
async findOne(@Param('id') id: string): Promise<any> {
    // Implementation
}
```

To add your own examples:
1. Create example files in `src/fhir/dto/examples/`
2. Export examples from the index file
3. Use the utility functions to add them to your API responses

### Using DTOs for Better Schema Documentation

DTOs (Data Transfer Objects) provide TypeScript interfaces that document the structure of your API requests and responses. This improves the Swagger documentation by showing the exact schema of your data.

```typescript
// Import DTOs
import { PatientDto, FhirBundleDto } from '../dto/fhir-response.dto';

@Get()
@ApiOperation({ summary: 'Get all patients' })
@ApiResponse({ 
    status: 200, 
    description: 'List of patients',
    type: FhirBundleDto
})
async findAll(): Promise<FhirBundleDto> {
    // Implementation
}

@Get(':id')
@ApiOperation({ summary: 'Get patient by ID' })
@ApiResponse({ 
    status: 200, 
    description: 'The patient',
    type: PatientDto
})
async findOne(@Param('id') id: string): Promise<PatientDto> {
    // Implementation
}
```

To add your own DTOs:
1. Create a DTO file in `src/fhir/dto/` directory
2. Define your class with `@ApiProperty` decorators
3. Use the DTO as the `type` in your `@ApiResponse` decorator

### Generating a Postman Collection

The API includes a script to generate a Postman collection from your Swagger documentation. This makes it easy for frontend developers to start testing your API right away.

To generate a Postman collection:

1. Generate the Swagger documentation first:
   ```bash
   npm run swagger:generate
   ```

2. Generate the Postman collection:
   ```bash
   npm run postman:generate
   ```

3. Import the generated files into Postman:
   - `postman/MediCare_FHIR_API.postman_collection.json`
   - `postman/MediCare_FHIR_API_Environment.postman_environment.json`

The collection includes:
- Folders organized by API tags
- Requests with examples
- Pre-configured authorization
- Environment variables
- Tests to automatically extract the JWT token

## Troubleshooting

### Missing Endpoints

If certain endpoints are missing from the documentation:

1. Ensure the controller and endpoints have the appropriate Swagger decorators
2. Check that the controller is properly imported in a module
3. Make sure the module is imported in the `AppModule`

### Authentication Issues

If you're having trouble authenticating in the Swagger UI:

1. Make sure you're using the correct authentication endpoint
2. Check that you're including the token in the correct format (Bearer TOKEN)
3. Verify that the token hasn't expired

### Deployment Issues

If you encounter issues deploying the documentation:

1. Ensure you've run `npm run swagger:generate` first
2. Check that the `swagger-static` directory contains all required files
3. Make sure your hosting platform is configured to serve static files correctly

## Getting Help

If you need assistance with the API documentation:

1. Check the existing documentation in the codebase
2. Contact the API development team
3. Refer to the [NestJS Swagger documentation](https://docs.nestjs.com/openapi/introduction) 
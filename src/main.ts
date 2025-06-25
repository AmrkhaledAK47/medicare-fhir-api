import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as morgan from 'morgan';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(morgan('dev'));
  app.use(helmet());
  app.enableCors();

  // Global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enhanced Swagger setup
  const config = new DocumentBuilder()
    .setTitle('MediCare FHIR API')
    .setDescription(`
      # MediCare FHIR-based Electronic Health Records API

      ## Overview
      This API provides comprehensive access to healthcare data using the HL7 FHIR R4 standard with role-based access control.
      The API enables secure, interoperable exchange of healthcare information for electronic health records (EHR) systems.

      ## User Roles
      - **Admin**: Full access to all resources and administrative functions
      - **Practitioner**: Access to patient data and medical records with authorization controls
      - **Patient**: Access to their own medical records only
      - **Pharmacist**: Access to medication-related resources (where implemented)

      ## Authentication
      All API endpoints (except login and registration) require authentication using JWT.
      1. Obtain a token by calling \`/api/auth/login\`
      2. Include the token in the Authorization header: \`Authorization: Bearer YOUR_TOKEN\`

      ## Common Parameters
      - **Pagination**: 
          - \`page\`: Page number (1-based)
          - \`limit\`: Items per page
          - \`sort\`: Field to sort by
          - \`sortDirection\`: Sort order ('asc' or 'desc')
      - **Resource IDs**: Most endpoints require a resource ID or type in the path
      - **Search Parameters**: FHIR standard search parameters are supported for resource types
      
      ## Important Notes
      - Resource types are case sensitive (e.g., use 'Patient', not 'patient')
      - Request and response bodies follow FHIR R4 specification
      - Successful requests return standard FHIR resources or Bundles
      - Errors return FHIR OperationOutcome resources

      ## HAPI FHIR Integration
      This API can integrate with a HAPI FHIR server for enhanced FHIR capabilities. 
      Configuration is managed through environment variables.
    `)
    .setVersion('1.0.0')
    .setContact('MediCare Support', 'https://medicare.example.com', 'support@medicare.example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter JWT token obtained from login'
    })
    // Authentication & User Management
    .addTag('auth', 'Authentication endpoints for login, registration, and password management')
    .addTag('users', 'User management endpoints for creating and managing user accounts')

    // Core FHIR Functionality
    .addTag('fhir', 'Generic FHIR resource operations and capabilities')
    .addTag('validation', 'FHIR resource validation endpoints')
    .addTag('terminology', 'Terminology services for code validation and lookup')

    // Clinical Resources
    .addTag('patients', 'Patient-specific endpoints and operations')
    .addTag('practitioners', 'Healthcare provider endpoints and operations')
    .addTag('encounters', 'Clinical encounter documentation and management')
    .addTag('observations', 'Clinical observations, measurements, and lab results')
    .addTag('procedures', 'Medical procedures documentation and tracking')
    .addTag('conditions', 'Patient conditions and diagnoses')
    .addTag('medications', 'Medication records and prescriptions')

    // Administrative Resources
    .addTag('organizations', 'Healthcare organization management')
    .addTag('questionnaires', 'Clinical questionnaires and forms')
    .addTag('diagnostic-reports', 'Diagnostic test results and reports')
    .addTag('payments', 'Payment and billing records')

    // System & Utilities
    .addTag('health', 'System health check endpoints')
    .addTag('documentation', 'API documentation resources')
    .addTag('pagination-examples', 'Examples of paginated resource endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Custom Swagger options for better display
  const customOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 3,
    },
    customSiteTitle: 'MediCare FHIR API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    customfavIcon: '/favicon.ico'
  };

  SwaggerModule.setup('api/docs', app, document, customOptions);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📝 API Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();


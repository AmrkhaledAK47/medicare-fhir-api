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
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enhanced Swagger setup
  const config = new DocumentBuilder()
    .setTitle('MediCare FHIR API')
    .setDescription(`
      # MediCare FHIR-based Electronic Health Records API

      ## Overview
      This API provides access to healthcare data using the FHIR standard with role-based access control.

      ## User Roles
      - **Admin**: Full access to all resources and administrative functions
      - **Practitioner**: Access to patient data and medical records
      - **Patient**: Access to their own medical records only

      ## Authentication
      All API endpoints (except login and registration) require authentication using JWT.
      1. Obtain a token by calling \`/api/auth/login\`
      2. Include the token in the Authorization header: \`Authorization: Bearer YOUR_TOKEN\`

      ## Common Parameters
      - **Pagination**: \`page\`, \`limit\`, \`sort\`, \`sortDirection\`
      - **Resource IDs**: Most endpoints require a resource ID or type in the path
      
      ## Important Notes
      - Resource types are case sensitive (e.g., use 'Patient', not 'patient')
      - Request and response bodies follow FHIR R4 specification
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
    .addTag('auth', 'Authentication endpoints for login, registration, and password management')
    .addTag('users', 'User management endpoints (Admin only)')
    .addTag('fhir', 'Generic FHIR resource operations')
    .addTag('patients', 'Patient-specific endpoints and operations')
    .addTag('practitioners', 'Practitioner endpoints and operations')
    .addTag('organizations', 'Organization management endpoints')
    .addTag('encounters', 'Clinical encounter documentation')
    .addTag('observations', 'Clinical observations and measurements')
    .addTag('diagnostics', 'Diagnostic reports and results')
    .addTag('medications', 'Medication records and prescriptions')
    .addTag('payments', 'Payment and billing records')
    .addTag('health', 'System health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Custom Swagger options for better display
  const customOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
    },
    customSiteTitle: 'MediCare API Documentation',
  };

  SwaggerModule.setup('api/docs', app, document, customOptions);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📝 API Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();

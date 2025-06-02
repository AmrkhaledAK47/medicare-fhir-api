const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const SwaggerParser = require('@apidevtools/swagger-parser');
const swaggerUiDist = require('swagger-ui-dist');
const { NestFactory } = require('@nestjs/core');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const copyFile = promisify(fs.copyFile);

// Configuration
const OUTPUT_DIR = path.join(process.cwd(), 'swagger-static');
const SWAGGER_JSON_PATH = path.join(OUTPUT_DIR, 'swagger.json');
const SWAGGER_HTML_PATH = path.join(OUTPUT_DIR, 'index.html');
const README_PATH = path.join(OUTPUT_DIR, 'README.md');

async function generateSwaggerDocumentation() {
    console.log('Starting Swagger documentation generation...');

    try {
        // Create output directory if it doesn't exist
        if (!fs.existsSync(OUTPUT_DIR)) {
            await mkdir(OUTPUT_DIR, { recursive: true });
            console.log(`Created directory: ${OUTPUT_DIR}`);
        }

        // Dynamically import the AppModule (this approach prevents TypeScript issues)
        console.log('Loading application module...');
        const { AppModule } = require('../dist/app.module');

        // Create a NestJS application instance
        const app = await NestFactory.create(AppModule);
        app.setGlobalPrefix('api');

        // Set up Swagger the same way as in main.ts
        console.log('Setting up Swagger configuration...');
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
            // Tags similar to main.ts
            .addTag('auth', 'Authentication endpoints for login, registration, and password management')
            .addTag('users', 'User management endpoints for creating and managing user accounts')
            .addTag('fhir', 'Generic FHIR resource operations and capabilities')
            .addTag('validation', 'FHIR resource validation endpoints')
            .addTag('terminology', 'Terminology services for code validation and lookup')
            .addTag('patients', 'Patient-specific endpoints and operations')
            .addTag('practitioners', 'Healthcare provider endpoints and operations')
            .addTag('encounters', 'Clinical encounter documentation and management')
            .addTag('observations', 'Clinical observations, measurements, and lab results')
            .addTag('procedures', 'Medical procedures documentation and tracking')
            .addTag('conditions', 'Patient conditions and diagnoses')
            .addTag('medications', 'Medication records and prescriptions')
            .addTag('organizations', 'Healthcare organization management')
            .addTag('questionnaires', 'Clinical questionnaires and forms')
            .addTag('diagnostic-reports', 'Diagnostic test results and reports')
            .addTag('payments', 'Payment and billing records')
            .addTag('health', 'System health check endpoints')
            .addTag('documentation', 'API documentation resources')
            .addTag('pagination-examples', 'Examples of paginated resource endpoints')
            .build();

        // Create Swagger document
        console.log('Generating Swagger document...');
        const document = SwaggerModule.createDocument(app, config);

        // Validate the Swagger document
        console.log('Validating Swagger document...');
        await SwaggerParser.validate(document);

        // Save the Swagger JSON
        console.log(`Saving Swagger JSON to ${SWAGGER_JSON_PATH}...`);
        await writeFile(SWAGGER_JSON_PATH, JSON.stringify(document, null, 2));

        // Generate the Swagger UI HTML
        console.log('Generating Swagger UI HTML...');
        await generateSwaggerUI();

        // Copy Swagger UI assets
        console.log('Copying Swagger UI assets...');
        await copySwaggerUIAssets();

        console.log('\nSwagger documentation generation complete!');
        console.log(`\nTo view the documentation, open: ${SWAGGER_HTML_PATH}`);
        console.log(`To deploy, copy the entire '${OUTPUT_DIR}' directory to your web server.`);

        // Close the application
        await app.close();

    } catch (error) {
        console.error('Error generating Swagger documentation:', error);
        process.exit(1);
    }
}

async function generateSwaggerUI() {
    // Get path to Swagger UI's index.html
    const swaggerUiPath = swaggerUiDist.getAbsoluteFSPath();
    const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>MediCare FHIR API Documentation</title>
  <link rel="stylesheet" type="text/css" href="./swagger-ui.css" />
  <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32" />
  <link rel="icon" type="image/png" href="./favicon-16x16.png" sizes="16x16" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
    .swagger-ui .topbar { background-color: #2c3e50; }
    .swagger-ui .topbar .download-url-wrapper .select-label select { border: 2px solid #5D9CEC; }
    .swagger-ui .info .title { color: #3c8dbc; }
    .swagger-ui .btn.authorize { background-color: #4caf50; color: #fff; }
    .swagger-ui .opblock.opblock-get { background: rgba(97, 175, 254, 0.1); }
    .swagger-ui .opblock.opblock-post { background: rgba(73, 204, 144, 0.1); }
    .swagger-ui .opblock.opblock-put { background: rgba(252, 161, 48, 0.1); }
    .swagger-ui .opblock.opblock-delete { background: rgba(249, 62, 62, 0.1); }
    .swagger-ui .opblock.opblock-patch { background: rgba(80, 227, 194, 0.1); }
    .swagger-ui .scheme-container { background-color: #f0f0f0; box-shadow: none; }
    .swagger-ui section.models { background-color: #f0f0f0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>

  <script src="./swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="./swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "./swagger.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 3,
        persistAuthorization: true
      });
      window.ui = ui;
    }
  </script>
</body>
</html>
  `;

    await writeFile(SWAGGER_HTML_PATH, indexHtml);
}

async function copySwaggerUIAssets() {
    const swaggerUiPath = swaggerUiDist.getAbsoluteFSPath();
    const files = fs.readdirSync(swaggerUiPath);

    for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.png')) {
            await copyFile(
                path.join(swaggerUiPath, file),
                path.join(OUTPUT_DIR, file)
            );
        }
    }
}

// Make sure the dist folder exists before running the script
if (!fs.existsSync(path.join(process.cwd(), 'dist'))) {
    console.error('Error: "dist" directory not found. Please build the application first with "npm run build"');
    console.log('Run: npm run build && npm run swagger:generate');
    process.exit(1);
}

// Run the script
generateSwaggerDocumentation(); 
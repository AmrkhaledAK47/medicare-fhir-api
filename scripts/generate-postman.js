const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const SwaggerParser = require('@apidevtools/swagger-parser');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Configuration
const SWAGGER_JSON_PATH = path.join(process.cwd(), 'swagger-static', 'swagger.json');
const OUTPUT_DIR = path.join(process.cwd(), 'postman');
const POSTMAN_COLLECTION_PATH = path.join(OUTPUT_DIR, 'MediCare_FHIR_API.postman_collection.json');
const POSTMAN_ENVIRONMENT_PATH = path.join(OUTPUT_DIR, 'MediCare_FHIR_API_Environment.postman_environment.json');

/**
 * Generate a Postman collection from Swagger/OpenAPI documentation
 */
async function generatePostmanCollection() {
  try {
    console.log('Starting Postman collection generation...');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      await mkdir(OUTPUT_DIR, { recursive: true });
      console.log(`Created directory: ${OUTPUT_DIR}`);
    }
    
    // Read and parse the Swagger JSON file
    console.log(`Reading Swagger JSON from ${SWAGGER_JSON_PATH}...`);
    let swaggerJson;
    
    try {
      const swaggerData = await readFile(SWAGGER_JSON_PATH, 'utf8');
      swaggerJson = JSON.parse(swaggerData);
    } catch (error) {
      console.error(`Error reading Swagger JSON: ${error.message}`);
      console.log('Make sure to generate Swagger documentation first with: npm run swagger:generate');
      process.exit(1);
    }
    
    // Validate the Swagger document
    console.log('Validating Swagger document...');
    await SwaggerParser.validate(swaggerJson);
    
    // Generate Postman collection
    console.log('Generating Postman collection...');
    const postmanCollection = createPostmanCollection(swaggerJson);
    
    // Save Postman collection
    await writeFile(
      POSTMAN_COLLECTION_PATH, 
      JSON.stringify(postmanCollection, null, 2)
    );
    console.log(`Postman collection saved to ${POSTMAN_COLLECTION_PATH}`);
    
    // Generate Postman environment
    console.log('Generating Postman environment...');
    const postmanEnvironment = createPostmanEnvironment(swaggerJson);
    
    // Save Postman environment
    await writeFile(
      POSTMAN_ENVIRONMENT_PATH,
      JSON.stringify(postmanEnvironment, null, 2)
    );
    console.log(`Postman environment saved to ${POSTMAN_ENVIRONMENT_PATH}`);
    
    console.log('\nPostman collection generation complete!');
    console.log('\nHow to use:');
    console.log('1. Import both files into Postman');
    console.log('2. Select the "MediCare_FHIR_API_Environment" environment');
    console.log('3. Update the environment variables as needed');
    console.log('4. Obtain a JWT token using the Authentication/Login request');
    
  } catch (error) {
    console.error('Error generating Postman collection:', error);
    process.exit(1);
  }
}

/**
 * Create a Postman collection from a Swagger/OpenAPI document
 */
function createPostmanCollection(swagger) {
  // Basic collection structure
  const collection = {
    info: {
      name: 'MediCare FHIR API',
      description: swagger.info.description || 'MediCare FHIR API Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      version: swagger.info.version || '1.0.0',
    },
    item: [],
    event: [
      {
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: [
            "// You can use this script for global pre-request logic",
            "console.log('Running pre-request script...');"
          ]
        }
      },
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            "// You can use this script for global test logic",
            "console.log('Running test script...');",
            "",
            "// Example: Extract JWT token from login response",
            "if (pm.response.code === 200 && pm.request.url.path.includes('/auth/login')) {",
            "    var jsonData = pm.response.json();",
            "    if (jsonData.access_token) {",
            "        pm.environment.set('jwt_token', jsonData.access_token);",
            "        console.log('JWT token extracted and stored in environment');",
            "    }",
            "}"
          ]
        }
      }
    ],
    variable: [
      {
        key: 'baseUrl',
        value: '{{base_url}}',
        type: 'string'
      }
    ]
  };
  
  // Group endpoints by tags
  const endpointsByTag = {};
  
  // Get all paths
  Object.keys(swagger.paths).forEach(path => {
    const pathData = swagger.paths[path];
    
    // Process each HTTP method
    Object.keys(pathData).forEach(method => {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        const operation = pathData[method];
        const tags = operation.tags || ['default'];
        
        // Add to the appropriate tag group
        tags.forEach(tag => {
          if (!endpointsByTag[tag]) {
            endpointsByTag[tag] = [];
          }
          
          endpointsByTag[tag].push({
            path,
            method,
            operation
          });
        });
      }
    });
  });
  
  // Create folder for each tag and add requests
  Object.keys(endpointsByTag).forEach(tag => {
    const folder = {
      name: tag,
      item: []
    };
    
    // Add description from swagger tags if available
    if (swagger.tags) {
      const tagInfo = swagger.tags.find(t => t.name === tag);
      if (tagInfo && tagInfo.description) {
        folder.description = tagInfo.description;
      }
    }
    
    // Add requests to folder
    endpointsByTag[tag].forEach(endpoint => {
      folder.item.push(createPostmanRequest(endpoint.path, endpoint.method, endpoint.operation, swagger));
    });
    
    collection.item.push(folder);
  });
  
  return collection;
}

/**
 * Create a single Postman request from a Swagger/OpenAPI operation
 */
function createPostmanRequest(path, method, operation, swagger) {
  // Replace path parameters with Postman variable format
  let postmanPath = path.replace(/{([^}]+)}/g, ':$1');
  
  // Build request object
  const request = {
    name: operation.summary || path,
    description: operation.description || '',
    request: {
      method: method.toUpperCase(),
      url: {
        raw: `{{base_url}}${postmanPath}`,
        host: ['{{base_url}}'],
        path: postmanPath.split('/').filter(p => p),
        query: [],
        variable: []
      },
      header: [
        {
          key: 'Content-Type',
          value: 'application/json'
        }
      ],
      auth: null
    },
    response: []
  };
  
  // Add detailed description
  if (operation.description) {
    request.description = operation.description;
  }
  
  // Add security/auth
  if (operation.security && operation.security.some(s => s.bearer)) {
    request.request.auth = {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{jwt_token}}',
          type: 'string'
        }
      ]
    };
    
    // Add Authorization header
    request.request.header.push({
      key: 'Authorization',
      value: 'Bearer {{jwt_token}}'
    });
  }
  
  // Add path parameters
  if (operation.parameters) {
    const pathParams = operation.parameters.filter(p => p.in === 'path');
    pathParams.forEach(param => {
      request.request.url.variable.push({
        key: param.name,
        value: '',
        description: param.description || ''
      });
    });
    
    // Add query parameters
    const queryParams = operation.parameters.filter(p => p.in === 'query');
    queryParams.forEach(param => {
      request.request.url.query.push({
        key: param.name,
        value: '',
        description: param.description || '',
        disabled: !param.required
      });
    });
  }
  
  // Add request body
  if (operation.requestBody) {
    const contentType = Object.keys(operation.requestBody.content)[0];
    if (contentType) {
      const schema = operation.requestBody.content[contentType].schema;
      const example = operation.requestBody.content[contentType].example;
      
      // Use example if available, otherwise generate from schema
      if (example) {
        request.request.body = {
          mode: 'raw',
          raw: JSON.stringify(example, null, 2),
          options: {
            raw: {
              language: 'json'
            }
          }
        };
      } else if (schema) {
        // Generate a sample request body based on the schema
        const sample = generateSampleFromSchema(schema, swagger);
        request.request.body = {
          mode: 'raw',
          raw: JSON.stringify(sample, null, 2),
          options: {
            raw: {
              language: 'json'
            }
          }
        };
      }
    }
  }
  
  // Add response examples
  if (operation.responses) {
    Object.keys(operation.responses).forEach(statusCode => {
      const response = operation.responses[statusCode];
      if (response.content) {
        const contentType = Object.keys(response.content)[0];
        if (contentType && response.content[contentType].examples) {
          Object.keys(response.content[contentType].examples).forEach(exampleName => {
            const example = response.content[contentType].examples[exampleName];
            request.response.push({
              name: `${statusCode} - ${exampleName}`,
              originalRequest: request.request,
              status: statusCode,
              code: parseInt(statusCode),
              _postman_previewlanguage: 'json',
              header: [
                {
                  key: 'Content-Type',
                  value: contentType
                }
              ],
              body: JSON.stringify(example.value, null, 2)
            });
          });
        } else if (contentType && response.content[contentType].example) {
          request.response.push({
            name: `${statusCode} - Example`,
            originalRequest: request.request,
            status: statusCode,
            code: parseInt(statusCode),
            _postman_previewlanguage: 'json',
            header: [
              {
                key: 'Content-Type',
                value: contentType
              }
            ],
            body: JSON.stringify(response.content[contentType].example, null, 2)
          });
        }
      }
    });
  }
  
  return request;
}

/**
 * Generate a sample object from a JSON Schema
 */
function generateSampleFromSchema(schema, swagger) {
  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/components/schemas/', '');
    if (swagger.components && swagger.components.schemas && swagger.components.schemas[refPath]) {
      return generateSampleFromSchema(swagger.components.schemas[refPath], swagger);
    }
    return {};
  }
  
  // Handle arrays
  if (schema.type === 'array' && schema.items) {
    return [generateSampleFromSchema(schema.items, swagger)];
  }
  
  // Handle objects
  if (schema.type === 'object' || schema.properties) {
    const result = {};
    if (schema.properties) {
      Object.keys(schema.properties).forEach(prop => {
        result[prop] = generateSampleFromSchema(schema.properties[prop], swagger);
      });
    }
    return result;
  }
  
  // Handle primitive types
  switch (schema.type) {
    case 'string':
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum[0];
      }
      if (schema.format === 'date') return '2023-01-01';
      if (schema.format === 'date-time') return '2023-01-01T00:00:00Z';
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
      return 'string';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    default:
      return null;
  }
}

/**
 * Create a Postman environment with variables
 */
function createPostmanEnvironment(swagger) {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'MediCare_FHIR_API_Environment',
    values: [
      {
        key: 'base_url',
        value: 'http://localhost:3000/api',
        type: 'default',
        enabled: true,
        description: 'Base URL for the MediCare FHIR API'
      },
      {
        key: 'jwt_token',
        value: '',
        type: 'secret',
        enabled: true,
        description: 'JWT authentication token (obtained from login)'
      },
      {
        key: 'example_patient_id',
        value: 'example-patient-id',
        type: 'default',
        enabled: true,
        description: 'Example patient ID for testing'
      },
      {
        key: 'example_practitioner_id',
        value: 'example-practitioner-id',
        type: 'default',
        enabled: true,
        description: 'Example practitioner ID for testing'
      },
      {
        key: 'example_observation_id',
        value: 'example-observation-id',
        type: 'default',
        enabled: true,
        description: 'Example observation ID for testing'
      },
      {
        key: 'example_encounter_id',
        value: 'example-encounter-id',
        type: 'default',
        enabled: true,
        description: 'Example encounter ID for testing'
      }
    ]
  };
}

// Run the script
generatePostmanCollection();
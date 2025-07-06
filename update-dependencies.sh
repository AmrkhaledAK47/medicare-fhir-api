#!/bin/bash

# Update dependencies for the brain tumor detection module

echo "Updating dependencies for brain tumor detection..."

# Stop the NestJS API container
docker-compose stop nest-api

# Install new dependencies
docker-compose exec -T nest-api npm install sharp@0.32.6 form-data@4.0.0 @nestjs/axios@3.0.1 axios@1.6.2

# Restart the NestJS API container
docker-compose restart nest-api

echo "Dependencies updated successfully!"
echo "Brain Tumor Detection module is now available at /api/brain-tumor" 
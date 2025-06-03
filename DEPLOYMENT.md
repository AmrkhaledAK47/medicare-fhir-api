# Medicare FHIR EHR Platform Deployment Guide

This document provides step-by-step instructions for deploying the Medicare FHIR EHR Platform to DigitalOcean's App Platform.

## Prerequisites

1. **GitHub Account**: Your code should be hosted on GitHub
2. **DigitalOcean Account**: You'll need a DigitalOcean account with billing enabled
3. **DigitalOcean CLI (doctl)**: Install the DigitalOcean command line tool

## Step 1: Prepare Your Repository

1. Fork or clone this repository to your GitHub account
2. Update the `.do/app.yaml` file:
   - Replace `YOUR_GITHUB_USERNAME/fhir-ehr-platform` with your actual GitHub repo path
   - Review and customize the environment variables in the `secrets` section

## Step 2: Configure MongoDB Integration

The platform requires MongoDB for data storage:

1. The `.do/app.yaml` file already includes configuration for a managed MongoDB database
2. Note that the MongoDB URL will be automatically connected to your NestJS application

## Step 3: Deploy Using the Web Interface

### Option 1: Using the DigitalOcean App Platform Web UI

1. Log in to your [DigitalOcean account](https://cloud.digitalocean.com/)
2. Navigate to "Apps" in the left sidebar
3. Click "Create App"
4. Select "GitHub" as the source
5. Connect to your GitHub account if not already connected
6. Select the repository where you've stored this project
7. Select the "main" branch
8. Click "Next"
9. In the "Resources" section:
   - App Platform should automatically detect the NestJS application
   - Set the "Environment" to "Node.js"
   - Ensure the build command is `npm install && npm run build`
   - Ensure the run command is `npm run start:prod`
10. Add the Dockerfile component for HAPI FHIR server:
    - Click "Add Component" → "Docker Hub"
    - Set Image Registry to "Docker Hub"
    - Set Image Repository to "hapiproject/hapi"
    - Set Image Tag to "latest"
    - Add the environment variables from `.do/app.yaml`
11. Click "Next"
12. Add MongoDB database:
    - Click "Add Resource" → "Database"
    - Select "MongoDB"
    - Choose a plan based on your needs (Basic MongoDB is fine for starting)
13. Click "Next" to review, and then "Create Resources"

### Option 2: Using the Automated Script

We've provided a script to automate deployment using the `doctl` CLI:

1. Install the DigitalOcean CLI if you haven't already:
   ```bash
   # macOS
   brew install doctl
   
   # Linux
   snap install doctl
   
   # Windows (with Chocolatey)
   choco install doctl
   ```

2. Authenticate with DigitalOcean:
   ```bash
   doctl auth init
   ```

3. Run our deployment script:
   ```bash
   ./scripts/deploy-do.sh
   ```

4. The script will:
   - Create the application on App Platform using `.do/app.yaml`
   - Monitor the deployment progress
   - Output the URL for your deployed application when complete

## Step 4: Configure Environment Variables

After deployment, you may need to update some environment variables:

1. Go to your application in the DigitalOcean App Platform dashboard
2. Click on the "Settings" tab, then "Environment Variables"
3. Verify and update any environment-specific values:
   - Update `JWT_SECRET` to a secure random string
   - Configure email settings (`EMAIL_USER`, `EMAIL_PASSWORD`, etc.)
   - Set `FHIR_SERVER_URL` to the correct internal URL for the HAPI FHIR service

## Step 5: Verify Deployment

1. Access the application at the URL provided by DigitalOcean
2. Verify the API is working by checking the health endpoint:
   ```
   https://your-app-url.ondigitalocean.app/api/health
   ```
3. Access the API documentation:
   ```
   https://your-app-url.ondigitalocean.app/api/docs
   ```

## Monitoring and Management

- **Logs**: Access logs from the DigitalOcean App Platform dashboard
- **Scaling**: Adjust resources in the Settings → Resources section
- **Metrics**: View performance metrics in the Insights tab
- **Deployments**: View deployment history in the Deployments tab

## Troubleshooting

1. **Deployment Failures**:
   - Check build logs in the DigitalOcean dashboard
   - Verify GitHub permissions are correct
   - Ensure all environment variables are properly configured

2. **Application Errors**:
   - Check the application logs in the DigitalOcean dashboard
   - Verify MongoDB connection is working
   - Check the HAPI FHIR server is accessible from the NestJS app

3. **Database Connection Issues**:
   - Verify the `MONGODB_URI` environment variable is correctly set
   - Check if the database service is running
   - Ensure network access between app components is properly configured

## Database Backups

DigitalOcean's managed MongoDB includes automated backups. To create manual backups:

1. Go to the Databases section in the DigitalOcean dashboard
2. Select your MongoDB cluster
3. Navigate to the Backups tab
4. Click "Create Backup"

## Security Considerations

1. **JWT Secret**: Ensure you're using a strong, unique JWT secret in production
2. **Email Credentials**: Use app-specific passwords for email services
3. **CORS Settings**: Review and restrict CORS settings in production
4. **Database Access**: Restrict database access to only the necessary components

## Continuous Deployment

The App Platform is configured to automatically deploy updates when you push to your GitHub repository's main branch. To make updates:

1. Make changes to your code locally
2. Commit and push to GitHub
3. DigitalOcean will automatically rebuild and redeploy your application 
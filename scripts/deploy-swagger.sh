#!/bin/bash

# Script to deploy Swagger documentation to various platforms
# Usage: ./deploy-swagger.sh [platform]

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SWAGGER_DIR="./swagger-static"

# Check if swagger directory exists
if [ ! -d "$SWAGGER_DIR" ]; then
    echo -e "${RED}Error: Swagger static directory not found.${NC}"
    echo -e "Please run ${YELLOW}npm run swagger:generate${NC} first."
    exit 1
fi

# Check if swagger.json exists
if [ ! -f "$SWAGGER_DIR/swagger.json" ]; then
    echo -e "${RED}Error: swagger.json not found.${NC}"
    echo -e "Please run ${YELLOW}npm run swagger:generate${NC} first."
    exit 1
fi

# Function to display help
function show_help {
    echo -e "${GREEN}MediCare FHIR API - Swagger Documentation Deployment Script${NC}"
    echo ""
    echo "This script helps deploy the Swagger documentation to various platforms."
    echo ""
    echo "Usage: ./deploy-swagger.sh [platform]"
    echo ""
    echo "Available platforms:"
    echo "  local     - Create a local deployment using Python's http.server"
    echo "  netlify   - Deploy to Netlify (requires Netlify CLI)"
    echo "  github    - Deploy to GitHub Pages (requires gh-pages branch)"
    echo "  surge     - Deploy to Surge.sh (requires Surge CLI)"
    echo "  s3        - Deploy to AWS S3 (requires AWS CLI)"
    echo "  firebase  - Deploy to Firebase Hosting (requires Firebase CLI)"
    echo "  vercel    - Deploy to Vercel (requires Vercel CLI)"
    echo ""
    echo "Examples:"
    echo "  ./deploy-swagger.sh local"
    echo "  ./deploy-swagger.sh netlify"
    echo ""
}

# Local deployment using Python's HTTP server
function deploy_local {
    echo -e "${GREEN}Starting local HTTP server...${NC}"
    echo -e "Documentation will be available at ${YELLOW}http://localhost:8000${NC}"
    echo -e "Press Ctrl+C to stop the server."
    cd "$SWAGGER_DIR" && python3 -m http.server 8000
}

# Deploy to Netlify
function deploy_netlify {
    if ! command -v netlify &> /dev/null; then
        echo -e "${RED}Error: Netlify CLI not found.${NC}"
        echo -e "Install it with: ${YELLOW}npm install -g netlify-cli${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Deploying to Netlify...${NC}"
    cd "$SWAGGER_DIR" && netlify deploy --prod
}

# Deploy to GitHub Pages
function deploy_github {
    if [ ! -d ".git" ]; then
        echo -e "${RED}Error: Not a git repository.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Deploying to GitHub Pages...${NC}"
    # Create a temporary branch
    git checkout -b temp-swagger
    
    # Copy swagger files to root for GitHub Pages
    cp -r "$SWAGGER_DIR"/* .
    
    # Commit and push
    git add swagger.json index.html
    git commit -m "Update Swagger documentation"
    git push -f origin temp-swagger:gh-pages
    
    # Cleanup
    git checkout -
    git branch -D temp-swagger
    
    echo -e "${GREEN}Deployed to GitHub Pages.${NC}"
    echo -e "Your documentation should be available at: ${YELLOW}https://[your-username].github.io/[your-repo]/${NC}"
}

# Deploy to Surge.sh
function deploy_surge {
    if ! command -v surge &> /dev/null; then
        echo -e "${RED}Error: Surge CLI not found.${NC}"
        echo -e "Install it with: ${YELLOW}npm install -g surge${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Deploying to Surge.sh...${NC}"
    cd "$SWAGGER_DIR" && surge
}

# Deploy to AWS S3
function deploy_s3 {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}Error: AWS CLI not found.${NC}"
        echo -e "Install it with: ${YELLOW}pip install awscli${NC}"
        exit 1
    fi
    
    read -p "Enter your S3 bucket name: " bucket_name
    
    echo -e "${GREEN}Deploying to AWS S3...${NC}"
    aws s3 sync "$SWAGGER_DIR" "s3://$bucket_name" --acl public-read
    
    echo -e "${GREEN}Deployed to AWS S3.${NC}"
    echo -e "Your documentation should be available at: ${YELLOW}http://$bucket_name.s3-website-[region].amazonaws.com/${NC}"
}

# Deploy to Firebase Hosting
function deploy_firebase {
    if ! command -v firebase &> /dev/null; then
        echo -e "${RED}Error: Firebase CLI not found.${NC}"
        echo -e "Install it with: ${YELLOW}npm install -g firebase-tools${NC}"
        exit 1
    fi
    
    # Check if firebase.json exists, if not create one
    if [ ! -f "firebase.json" ]; then
        echo '{
  "hosting": {
    "public": "swagger-static",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  }
}' > firebase.json
        echo -e "${YELLOW}Created firebase.json${NC}"
    fi
    
    echo -e "${GREEN}Deploying to Firebase Hosting...${NC}"
    firebase deploy --only hosting
}

# Deploy to Vercel
function deploy_vercel {
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}Error: Vercel CLI not found.${NC}"
        echo -e "Install it with: ${YELLOW}npm install -g vercel${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Deploying to Vercel...${NC}"
    cd "$SWAGGER_DIR" && vercel --prod
}

# Main execution
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

case "$1" in
    help|--help|-h)
        show_help
        ;;
    local)
        deploy_local
        ;;
    netlify)
        deploy_netlify
        ;;
    github)
        deploy_github
        ;;
    surge)
        deploy_surge
        ;;
    s3)
        deploy_s3
        ;;
    firebase)
        deploy_firebase
        ;;
    vercel)
        deploy_vercel
        ;;
    *)
        echo -e "${RED}Error: Unknown platform '$1'${NC}"
        show_help
        exit 1
        ;;
esac 
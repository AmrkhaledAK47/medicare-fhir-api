#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Creating fix for gender filtering and pagination issues...${NC}"

# Check if analysis report exists
if [ ! -f "test-results/analysis-report.md" ]; then
  echo -e "${RED}Analysis report not found. Please run the analysis script first.${NC}"
  exit 1
fi

# Create fixes based on issues reported in the analysis report
GENDER_ISSUE=$(grep -c "ISSUE CONFIRMED.*Gender" test-results/analysis-report.md)
PAGINATION_ISSUE=$(grep -c "ISSUE CONFIRMED.*Pagination" test-results/analysis-report.md)

# Create a directory for the fixes
mkdir -p test-results/fixes

# Create fix for gender filtering issue
if [ "$GENDER_ISSUE" -gt 0 ]; then
  echo -e "${YELLOW}Creating fix for gender filtering issue...${NC}"
  
  cat > test-results/fixes/patient-controller-gender-fix.js << EOL
/**
 * This is a fix for the gender filtering issue in the PatientController.
 * 
 * The issue is that the gender parameter is not being properly passed to the HAPI FHIR server.
 * This fix ensures that the gender parameter is properly handled in the transformQueryParams method.
 */

// In PatientController.ts - transformQueryParams method
protected transformQueryParams(params: any): Record<string, string> {
    const searchParams = super.transformQueryParams(params);

    // Handle name searches with modifiers
    if (params.name && !params['name:exact'] && !params['name:contains']) {
        searchParams['name:contains'] = params.name;
        delete searchParams.name;
    }

    // Handle birthdate range searches
    if (params.birthdate) {
        searchParams.birthdate = params.birthdate;
    } else {
        if (params.birthdate_start) {
            searchParams['birthdate'] = \`ge\${params.birthdate_start}\`;
        }
        if (params.birthdate_end) {
            if (searchParams['birthdate']) {
                searchParams['birthdate'] += \`,le\${params.birthdate_end}\`;
            } else {
                searchParams['birthdate'] = \`le\${params.birthdate_end}\`;
            }
        }
    }

    // Handle custom tags
    if (params.tag) {
        searchParams._tag = params.tag;
        delete searchParams.tag;
    }

    // FIX: Ensure gender is correctly passed if present
    // The issue was that the gender parameter might not have been correctly transformed
    // or might have been overridden somewhere else.
    if (params.gender) {
        // Override any previously set gender parameter to ensure it's correct
        searchParams.gender = params.gender.toLowerCase(); // ensure lowercase for consistency
        this.logger.debug(\`Gender parameter set to: \${params.gender}\`);
    }

    // Handle _count parameter explicitly
    if (params._count) {
        searchParams._count = params._count.toString();
    }

    // For debugging - log the final parameters
    this.logger.debug('Transformed search params:', searchParams);

    return searchParams;
}
EOL

  echo -e "${GREEN}Gender filtering fix created at test-results/fixes/patient-controller-gender-fix.js${NC}"
fi

# Create fix for pagination issue
if [ "$PAGINATION_ISSUE" -gt 0 ]; then
  echo -e "${YELLOW}Creating fix for pagination issue...${NC}"
  
  cat > test-results/fixes/base-resource-controller-pagination-fix.js << EOL
/**
 * This is a fix for the pagination issue in the BaseResourceController.
 * 
 * The issue is that the pagination parameters are not being properly passed to the HAPI FHIR server.
 * This fix ensures that the _count, page, and _getpagesoffset parameters are correctly converted and passed.
 */

// In BaseResourceController.ts - transformQueryParams method
protected transformQueryParams(params: any): Record<string, string> {
    // Create a new object for FHIR search parameters
    const searchParams: Record<string, string> = {};

    // FIX: Handle pagination parameters according to FHIR standard
    // The issue was likely in the conversion of parameters or they might have been overridden
    if (params._count) {
        // Use _count directly if provided - ensure it's a string value
        searchParams._count = params._count.toString();
        this.logger.debug(\`_count parameter set to: \${params._count}\`);
    } else if (params.limit) {
        // Map NestJS limit to FHIR _count
        searchParams._count = params.limit.toString();
        this.logger.debug(\`_count parameter set from limit: \${params.limit}\`);
    }

    // FIX: Handle page offset
    if (params.page !== undefined) {
        // Calculate offset based on page and limit/count
        const page = parseInt(params.page.toString());
        const limit = params._count 
            ? parseInt(params._count.toString()) 
            : (params.limit ? parseInt(params.limit.toString()) : 10);
        
        // HAPI FHIR server uses _getpagesoffset for pagination
        // Note that page is 1-based in our API but offset is 0-based
        const offset = Math.max(0, (page - 1) * limit); // Ensure no negative offset
        searchParams._getpagesoffset = offset.toString();
        this.logger.debug(\`_getpagesoffset set to: \${offset} (page: \${page}, limit: \${limit})\`);
    }

    // Handle sorting
    if (params._sort) {
        // Use _sort directly if provided
        searchParams._sort = params._sort;
    } else if (params.sort) {
        // Map NestJS sort to FHIR _sort
        let sortParam = params.sort;

        // Add direction if specified
        if (params.sortDirection && params.sortDirection.toLowerCase() === 'desc') {
            sortParam = \`-\${sortParam}\`;
        }

        searchParams._sort = sortParam;
    }

    // Handle _include parameters (include referenced resources)
    if (params._include) {
        if (Array.isArray(params._include)) {
            // If multiple _include parameters are provided, join them with commas
            searchParams._include = params._include.join(',');
        } else {
            searchParams._include = params._include.toString();
        }
    }

    // Handle _revinclude parameters (reverse include - resources that reference this one)
    if (params._revinclude) {
        if (Array.isArray(params._revinclude)) {
            // If multiple _revinclude parameters are provided, join them with commas
            searchParams._revinclude = params._revinclude.join(',');
        } else {
            searchParams._revinclude = params._revinclude.toString();
        }
    }

    // Handle _summary parameter (return only a subset of elements)
    if (params._summary) {
        searchParams._summary = params._summary.toString();
    }

    // Handle _elements parameter (return only specific elements)
    if (params._elements) {
        if (Array.isArray(params._elements)) {
            searchParams._elements = params._elements.join(',');
        } else {
            searchParams._elements = params._elements.toString();
        }
    }

    // Handle _contained and _containedType parameters
    if (params._contained) {
        searchParams._contained = params._contained.toString();
    }

    if (params._containedType) {
        searchParams._containedType = params._containedType.toString();
    }

    // Process all other parameters
    Object.entries(params).forEach(([key, value]) => {
        // Skip parameters we've already handled
        if ([
            'page', 'limit', 'sort', 'sortDirection',
            '_count', '_sort', '_include', '_revinclude',
            '_summary', '_elements', '_contained', '_containedType'
        ].includes(key)) {
            return;
        }

        // Skip NestJS-specific parameters
        if (['search'].includes(key)) {
            return;
        }

        // Handle array parameters
        if (Array.isArray(value)) {
            searchParams[key] = value.join(',');
        } else if (value !== undefined && value !== null) {
            searchParams[key] = value.toString();
        }
    });

    // Log transformed parameters for debugging
    this.logger.debug('Original params:', params);
    this.logger.debug('Transformed FHIR params:', searchParams);

    return searchParams;
}
EOL

  echo -e "${GREEN}Pagination fix created at test-results/fixes/base-resource-controller-pagination-fix.js${NC}"

  # Create fix for HAPI FHIR adapter search method
  cat > test-results/fixes/hapi-fhir-adapter-search-fix.js << EOL
/**
 * This is a fix for the HAPI FHIR adapter's search method.
 * 
 * The issue might be that the search parameters are not being properly passed to the FHIR server.
 * This fix adds enhanced logging and parameter checking to the search method.
 */

// In HapiFhirAdapter.ts - search method
async search(resourceType: string, params: Record<string, any> = {}): Promise<any> {
    this.logger.debug(\`Searching \${resourceType} with parameters:\`, params);
    
    return this.executeWithRetry(
        async () => {
            // FIX: Add enhanced logging for the request
            this.logger.debug(\`FHIR search request: \${this.baseUrl}/\${resourceType}\`);
            this.logger.debug('Query parameters:', JSON.stringify(params));
            
            // Ensure parameters are properly formatted for Axios
            const queryParams = Object.entries(params).reduce((acc, [key, value]) => {
                // Axios handles arrays automatically, but we want to ensure strings for simple values
                acc[key] = typeof value === 'object' && value !== null 
                    ? value 
                    : String(value);
                return acc;
            }, {});

            const requestConfig = {
                ...this.getRequestConfig(),
                params: queryParams,
            };
            
            // FIX: Log the full request URL with query parameters for debugging
            const url = \`\${this.baseUrl}/\${resourceType}\`;
            this.logger.debug(\`Full request URL: \${url} with params: \${JSON.stringify(queryParams)}\`);
            
            const response = await firstValueFrom(
                this.httpService.get(url, requestConfig),
            );
            
            // FIX: Log response data summary
            this.logger.debug(\`Search response received: resourceType=\${response.data?.resourceType}, total=\${response.data?.total}\`);
            
            return response.data;
        },
        \`search \${resourceType}\`,
    );
}
EOL

  echo -e "${GREEN}HAPI FHIR adapter search fix created at test-results/fixes/hapi-fhir-adapter-search-fix.js${NC}"
fi

# Create a verification script to test the fixes
echo -e "${YELLOW}Creating verification script...${NC}"

cat > test-results/05-verify-fixes.sh << EOL
#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\${BLUE}To verify the fixes, follow these steps:${NC}"
echo ""
echo -e "1. First, apply the fixes to the corresponding files:"
echo ""

if [ -f "test-results/fixes/patient-controller-gender-fix.js" ]; then
  echo -e "   \${BLUE}For gender filtering issue:${NC}"
  echo "   - Edit src/fhir/controllers/patient.controller.ts"
  echo "   - Replace the transformQueryParams method with the fixed version from test-results/fixes/patient-controller-gender-fix.js"
  echo ""
fi

if [ -f "test-results/fixes/base-resource-controller-pagination-fix.js" ]; then
  echo -e "   \${BLUE}For pagination issue:${NC}"
  echo "   - Edit src/fhir/controllers/base-resource.controller.ts"
  echo "   - Replace the transformQueryParams method with the fixed version from test-results/fixes/base-resource-controller-pagination-fix.js"
  echo ""
fi

if [ -f "test-results/fixes/hapi-fhir-adapter-search-fix.js" ]; then
  echo "   - Edit src/fhir/adapters/hapi-fhir.adapter.ts"
  echo "   - Replace the search method with the fixed version from test-results/fixes/hapi-fhir-adapter-search-fix.js"
  echo ""
fi

echo -e "2. Restart the API server to apply the changes."
echo ""
echo -e "3. Re-run the tests to verify the fixes:"
echo "   ./test-results/02-test-gender-filter.sh"
echo "   ./test-results/03-test-pagination.sh"
echo ""
echo -e "4. Run the analysis again to confirm the issues are fixed:"
echo "   ./test-results/04-analyze-results.sh"
echo ""
echo -e "\${GREEN}If the tests pass after applying the fixes, the issues have been resolved!${NC}"
EOL

chmod +x test-results/05-verify-fixes.sh

echo -e "${GREEN}Verification script created at test-results/05-verify-fixes.sh${NC}"

# Create master script to run all the test scripts
echo -e "${YELLOW}Creating master test script...${NC}"

cat > test-results/run-all-tests.sh << EOL
#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\${BLUE}Running all MediCare FHIR API tests...${NC}"
echo ""

# Make all scripts executable
chmod +x test-results/*.sh

# Step 1: Authenticate
echo -e "\${YELLOW}Step 1: Authenticating...${NC}"
./test-results/01-authenticate.sh
echo ""

# Step 2: Test gender filter
echo -e "\${YELLOW}Step 2: Testing gender filter...${NC}"
./test-results/02-test-gender-filter.sh
echo ""

# Step 3: Test pagination
echo -e "\${YELLOW}Step 3: Testing pagination...${NC}"
./test-results/03-test-pagination.sh
echo ""

# Step 4: Analyze results
echo -e "\${YELLOW}Step 4: Analyzing results...${NC}"
./test-results/04-analyze-results.sh
echo ""

# Step 5: Show verification steps
echo -e "\${YELLOW}Step 5: Verification steps...${NC}"
./test-results/05-verify-fixes.sh
echo ""

echo -e "\${GREEN}All tests completed!${NC}"
EOL

chmod +x test-results/run-all-tests.sh

echo -e "${GREEN}Master test script created at test-results/run-all-tests.sh${NC}"
echo -e "${BLUE}To run all tests and generate the analysis, run: ./test-results/run-all-tests.sh${NC}"

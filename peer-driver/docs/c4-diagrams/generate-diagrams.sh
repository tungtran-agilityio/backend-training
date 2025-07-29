#!/bin/bash

# C4 Diagrams Generator for Peer-to-Peer Car Sharing Platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
DOCS_DIR="$SCRIPT_DIR"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}🚗 Generating C4 Architecture Diagrams for Car Sharing Platform${NC}"
echo -e "${PURPLE}MVP Target: 100 cars, 1,000 trips, 3B VND in 90 days${NC}"
echo "================================================================="

# Check if D2 is installed
if ! command -v d2 &> /dev/null; then
    echo -e "${RED}❌ D2 is not installed. Please install it first:${NC}"
    echo "   curl -fsSL https://d2lang.com/install.sh | sh -"
    echo "   or visit: https://d2lang.com/tour/install"
    exit 1
fi

echo -e "${GREEN}✅ D2 found: $(d2 --version)${NC}"
echo ""

# Function to generate diagram
generate_diagram() {
    local input_file="$1"
    local output_file="$2"
    local description="$3"
    local business_context="$4"
    
    echo -e "${YELLOW}📊 Generating $description...${NC}"
    if [ ! -z "$business_context" ]; then
        echo -e "${PURPLE}   Business Context: $business_context${NC}"
    fi
    
    if [ ! -f "$input_file" ]; then
        echo -e "${RED}❌ Input file not found: $input_file${NC}"
        return 1
    fi
    
    # Generate PNG only with white background and ELK layout
    if d2 "$input_file" "$output_file" --layout=elk 2>/dev/null; then
        echo -e "${GREEN}✅ Generated: $output_file${NC}"
    else
        echo -e "${RED}❌ Failed to generate: $output_file${NC}"
        return 1
    fi
    
    echo ""
}

# Generate all diagrams
echo "Generating C4 diagrams based on MVP requirements..."
echo ""

# Level 1: Context Diagram
generate_diagram \
    "$DOCS_DIR/context-diagram.d2" \
    "$OUTPUT_DIR/01-context-diagram.png" \
    "Context Diagram (Level 1)" \
    "Platform ecosystem with zero hub operations"

# Level 2: Container Diagram
generate_diagram \
    "$DOCS_DIR/container-diagram.d2" \
    "$OUTPUT_DIR/02-container-diagram.png" \
    "Container Diagram (Level 2)" \
    "React Native + NestJS + PostgreSQL stack"

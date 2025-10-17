#!/bin/bash
# Helper script to run Anchor commands in Docker container

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Opti-Freight Anchor Development Helper${NC}"
echo "=========================================="
echo ""

# Check if container is running
if ! docker ps | grep -q opti-freight-anchor; then
    echo "Starting Anchor development container..."
    docker compose up -d
    sleep 2
fi

# If no arguments, show help
if [ $# -eq 0 ]; then
    echo "Usage: ./anchor-dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  shell        - Open interactive shell in container"
    echo "  build        - Build Anchor programs"
    echo "  test         - Run Anchor tests"
    echo "  deploy       - Deploy to Devnet"
    echo "  clean        - Clean build artifacts"
    echo "  init         - Initialize new Anchor workspace"
    echo "  stop         - Stop the container"
    echo "  logs         - Show container logs"
    echo ""
    echo "Examples:"
    echo "  ./anchor-dev.sh shell"
    echo "  ./anchor-dev.sh build"
    echo "  ./anchor-dev.sh test"
    exit 0
fi

case "$1" in
    shell)
        echo -e "${GREEN}Opening shell in Anchor container...${NC}"
        docker compose exec anchor-dev /bin/bash
        ;;
    build)
        echo -e "${GREEN}Building Anchor programs...${NC}"
        docker compose exec anchor-dev anchor build
        ;;
    test)
        echo -e "${GREEN}Running Anchor tests...${NC}"
        docker compose exec anchor-dev anchor test
        ;;
    deploy)
        echo -e "${GREEN}Deploying to Devnet...${NC}"
        docker compose exec anchor-dev anchor deploy
        ;;
    clean)
        echo -e "${GREEN}Cleaning build artifacts...${NC}"
        docker compose exec anchor-dev anchor clean
        ;;
    init)
        echo -e "${GREEN}Initializing Anchor workspace...${NC}"
        docker compose exec anchor-dev anchor init opti-freight --javascript
        ;;
    stop)
        echo -e "${GREEN}Stopping container...${NC}"
        docker compose down
        ;;
    logs)
        echo -e "${GREEN}Container logs:${NC}"
        docker compose logs -f
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run './anchor-dev.sh' without arguments for help"
        exit 1
        ;;
esac

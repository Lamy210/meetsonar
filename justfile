# MeetSonar Test Automation with Just
# Usage: just <command>

# Default recipe to display help
default:
    @just --list

# Setup test environment
setup:
    @echo "Setting up test environment..."
    docker compose up -d postgres
    sleep 3
    bun run db:push
    @echo "Test environment ready!"

# Run all tests
test: setup
    @echo "Running full test suite..."
    just test-unit
    just test-integration
    just test-e2e

# Run unit tests
test-unit:
    @echo "Running unit tests..."
    bun test tests/unit/

# Run integration tests  
test-integration:
    @echo "Running integration tests..."
    bun test tests/integration/

# Run end-to-end tests
test-e2e:
    @echo "Running E2E tests..."
    docker compose up -d
    sleep 5
    bunx playwright test
    docker compose down

# Test chat functionality specifically
test-chat: setup
    @echo "Testing chat functionality..."
    ./run-tests.sh

# Simple test runner
test-simple:
    @echo "Running simple tests..."
    ./run-tests.sh

# Manual chat test with browser opening
test-manual:
    @echo "Opening browser tabs for manual testing..."
    @echo "Open these URLs in separate browser tabs:"
    @echo "- http://localhost:5173/room/manual-test?name=Alice"
    @echo "- http://localhost:5173/room/manual-test?name=Bob"
    @echo "- http://localhost:5173/room/manual-test?name=Charlie"

# Test WebSocket connections
test-websocket: setup
    @echo "Testing WebSocket connections..."
    bun test tests/integration/websocket.test.ts --verbose

# Test API endpoints
test-api: setup
    @echo "Testing API endpoints..."
    bun test tests/integration/api.test.ts --verbose

# Clean test environment
clean:
    @echo "Cleaning test environment..."
    docker compose down
    rm -rf test-results/
    rm -rf playwright-report/

# Run tests with coverage
test-coverage: setup
    @echo "Running tests with coverage..."
    bun test --coverage

# Watch mode for development
test-watch:
    @echo "Running tests in watch mode..."
    bun test --watch

# Install Playwright browsers
playwright-install:
    @echo "Installing Playwright browsers..."
    bunx playwright install

# Generate test report
report:
    @echo "Generating test report..."
    bunx playwright show-report

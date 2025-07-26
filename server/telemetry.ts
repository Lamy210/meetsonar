// Telemetry configuration for MeetSonar (8GB environment - disabled)
// OpenTelemetry removed to reduce memory usage

console.log('📊 Telemetry disabled for 8GB environment optimization');

export function initTelemetry() {
  console.log('📊 Telemetry initialization skipped');
}

export function shutdownTelemetry() {
  console.log('📊 Telemetry shutdown skipped');
}

// No-op SDK for compatibility
export const sdk = {
  start: () => { },
  shutdown: () => Promise.resolve(),
};

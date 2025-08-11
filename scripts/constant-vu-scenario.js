import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// OTLP endpoint (default to localhost if not provided)
const OTEL_ENDPOINT = __ENV.OTEL_ENDPOINT || 'http://localhost:4318/v1/logs';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const throughput = new Rate('throughput');
const non200Responses = new Counter('non_200_responses');
const highLatencyResponses = new Counter('high_latency_responses');

// Test config
export const options = {
  scenarios: {
    custom_vu_test: {
      // The constant-vus executor executor will spin up a certain number of VUs and configure them to execute as many iterations as possible for a duration d.
      executor: 'constant-vus',
      vus: 200,
      duration: '20m',
    },
  },
  thresholds: {
    errors: ['rate<0.1'],  // <10% errors - technically not needed, as the current setup is very unlikely to trigger 503 responses
    request_duration: ['p(95)<50', 'p(99)<100'],  // 95% < 50ms, 99% < 100ms
  },
  discardResponseBodies: true,
};

// Log message config
const LOG_SIZE = 1024;
const LOGS_PER_REQUEST = 1;

export function setup() {
  console.log(`Starting load test with 10 constant VUs`);
  console.log(`Target OTEL endpoint: ${OTEL_ENDPOINT}`);
}

// Main function executed by each VU
export default function () {
  const timestamp = Date.now() * 1e6;  // nanoseconds

  // Create log records
  const logRecords = Array.from({ length: LOGS_PER_REQUEST }, (_, i) => ({
    timeUnixNano: `${timestamp}`,
    severityText: "INFO",
    body: { stringValue: `VU ${__VU} - Log ${i + 1}: ${'x'.repeat(LOG_SIZE)}` },
    attributes: [
      { key: "vu", value: { stringValue: `vu-${__VU}` } },
      { key: "stream_id", value: { stringValue: `stream-${i + 1}` } }
    ]
  }));

  // OTLP payload
  const payload = {
    resourceLogs: [{
      resource: {
        attributes: [
          { key: "service.name", value: { stringValue: "k6-load-test" } },
          { key: "host.name", value: { stringValue: "k6" } }
        ]
      },
      scopeLogs: [{
        scope: { name: "k6-logger" },
        logRecords
      }]
    }]
  };

  const start = Date.now();
  let success = false;

  try {
    // This is the HTTP endpoint for sending telemetry. We will hit /v1/logs to send logs. When setting the OTEL_ENDPOINT env var, ensure it includes the port e.g. export OTEL_ENDPOINT=http://OTEL_ADDRESS:4318
    const res = http.post(`${OTEL_ENDPOINT}/v1/logs`, JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
    });

    const duration = Date.now() - start;

    // Metrics
    requestDuration.add(duration);
    throughput.add(1);

    success = check(res, {
      'status is 200 or 204': (r) => r && (r.status === 200 || r.status === 204),
      'response time < 5s': () => duration < 5000
    });

    if (!success) {
      errorRate.add(1);
      console.error(`Failed: ${res.status} - ${res.body}`);
    }

    if (res.status !== 200 && res.status !== 204) {
      non200Responses.add(1);
    }

    if (duration > 50) {
      highLatencyResponses.add(1);
    }

  } catch (err) {
    errorRate.add(1);
    console.error(`Error: ${err.message}`);
  }
}



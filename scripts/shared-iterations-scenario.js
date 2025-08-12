import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// OTLP endpoint (e.g., OpenTelemetry Collector HTTP endpoint)
const OTEL_ENDPOINT = __ENV.OTEL_ENDPOINT || 'http://localhost:4318/v1/logs';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const throughput = new Rate('throughput');
const non200Responses = new Counter('non_200_responses');
const highLatencyResponses = new Counter('high_latency_responses');

// === CONFIG ===
const TOTAL_ITERATIONS = 10000000; 
const VUS = 200;
const MAX_DURATION = '1h';       // max to prevent test from goign on forever

export const options = {
  scenarios: {
    shared_load_test: {
      // This executor will allow the number of specified VUs to share the total_iterations between them
      executor: 'shared-iterations',
      vus: VUS,
      iterations: TOTAL_ITERATIONS,
      maxDuration: MAX_DURATION,
    },
  },
  thresholds: {
    errors: ['rate<0.1'],
    request_duration: ['p(95)<50', 'p(99)<100'],
  },
  discardResponseBodies: true,
};

// Log generation config
const LOG_SIZE_BYTES = 1024;
const LOGS_PER_REQUEST = 1;   // Number of log entries per HTTP POST

export function setup() {
  console.log(`Running shared-iterations test: ${TOTAL_ITERATIONS} iterations across ${VUS} VUs`);
  console.log(`Sending logs to: ${OTEL_ENDPOINT}`);
}

export default function () {
  const timestamp = Date.now() * 1e6;

  const logRecords = Array.from({ length: LOGS_PER_REQUEST }, (_, i) => ({
    timeUnixNano: `${timestamp}`,
    severityText: "INFO",
    body: { stringValue: `VU ${__VU} - Log ${i + 1}: ${'x'.repeat(LOG_SIZE_BYTES)}` },
    attributes: [
      { key: "vu", value: { stringValue: `vu-${__VU}` } },
      { key: "stream_id", value: { stringValue: `stream-${i + 1}` } }
    ]
  }));

  const logPayload = {
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
    const res = http.post(`${OTEL_ENDPOINT}/v1/logs`, JSON.stringify(logPayload), {
      headers: { 'Content-Type': 'application/json' },
    });

    const duration = Date.now() - start;

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
    console.error(`Request error: ${err.message}`);
  }
}

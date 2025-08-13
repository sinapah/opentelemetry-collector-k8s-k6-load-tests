import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import faker from "k6/x/faker"

// HTTP endpoint at 4318 (default to localhost if not provided)
const OTEL_ENDPOINT = __ENV.OTEL_ENDPOINT || 'http://localhost:4318/v1/logs';

// Custom metrics
// TODO: get the CPU and memory of OTelcol. Can possbile make req to Otel every 10s that queries for these from node exporter
// TODO: we also need to have the queue (should you collect telemetry from the workload under test from K6 or elsewhere)

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
      duration: '1h',
    },
  },
  thresholds: {
    // TODO: check that P(99) is less than 50ms
    errors: ['rate<0.01'],  // <1% errors - technically not needed, as the current setup is very unlikely to trigger 503 responses
    request_duration: ['p(99)<50'],  // 95% < 50ms, 99% < 100ms
  },
  discardResponseBodies: true,
};

// Log message config
// TODO: use Faker library instead of predefined LOG_SIZE so not all requests are the same size and also makes use of UTF-8
const LOG_SIZE = 1024;

// TODO: test with scaling up to 10 - what are interested in is not HTTP request count, but rather LOGS sent
// Get the total logs sent and divide by # of minutes to get /min avg
const LOGS_PER_REQUEST = 1;

function generateLogBody(minSize = 256, maxSize = 2048) {
  const targetLength = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
  let text = '';

  while (text.length < targetLength) {
    text += faker.language.language() + ' ';
  }

  return text.slice(0, targetLength);
}

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
    body: { stringValue: generateLogBody() },
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
    // TODO: compare performance between JSON and when using Proto (when sending payload serialized using Protos)
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



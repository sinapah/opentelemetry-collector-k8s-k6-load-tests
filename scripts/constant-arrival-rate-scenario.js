import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// OTLP endpoint
const OTEL_ENDPOINT = __ENV.OTEL_ENDPOINT || 'http://localhost:4318';

// Metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const throughput = new Rate('throughput');
const non200Responses = new Counter('non_200_responses');
const highLatencyResponses = new Counter('high_latency_responses');

// === TEST CONFIG ===

const DURATION_SEC = 120;  // 2 minutes

const VUS = 10;

export const options = {
  scenarios: {
    constant_rate_test: {
      // The constant-arrival-rate executor will keep the iterations constant and vary the number of VUs to ensure it meets the number of iterations to execute within time d.
      executor: 'constant-arrival-rate',
      rate: 900,               // iterations per second
      timeUnit: '1s',           // each rate is per second
      duration: `${DURATION_SEC}s`, // total test time - this derive
      preAllocatedVUs: VUS,     
    },
  },
  thresholds: {
    'errors': ['rate<0.1'],
    'request_duration': ['p(95)<50', 'p(99)<100'],
  },
  discardResponseBodies: true,
};

// Log config
const LOG_CONFIG = {
  minSize: 1024,
  maxSize: 2048,
};

export function setup() {
  console.log(`Target endpoint: ${OTEL_ENDPOINT}`);
  return { startTime: new Date().toISOString() };
}

export default function () {
  const logsPerRequest = 12;

  const timestamp = Date.now() * 1e6;

  const logRecords = Array.from({ length: logsPerRequest }, (_, i) => ({
    timeUnixNano: `${timestamp}`,
    severityText: "INFO",
    body: { stringValue: `VU ${__VU} - Log stream ${i + 1}: ${'x'.repeat(LOG_CONFIG.minSize)}` },
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
        logRecords: logRecords
      }]
    }]
  };

  const durationStart = Date.now();
  let success = false;

  try {
    const res = http.post(`${OTEL_ENDPOINT}/v1/logs`, JSON.stringify(logPayload), {
      headers: { 'Content-Type': 'application/json' },
    });

    const duration = Date.now() - durationStart;

    requestDuration.add(duration);
    throughput.add(1);

    success = check(res, {
      'status is 200 or 204': (r) => r && (r.status === 200 || r.status === 204),
      'response time < 5s': () => duration < 5000
    });

    if (!success) {
      errorRate.add(1);
      if (res) {
        console.error(`Request failed: ${res.status} - ${res.body}`);
      }
    }

    if (res.status !== 200 && res.status !== 204) {
      non200Responses.add(1);
    }

    if (duration > 50) {
      highLatencyResponses.add(1);
    }

    //console.log(`Req latency is: ${duration}, and the status code is ${res.status}` )

  } catch (error) {
    errorRate.add(1);
    console.error('Request error:', error.message);
  }
}

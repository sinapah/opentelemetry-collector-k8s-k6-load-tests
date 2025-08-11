import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Configuration - uses the latest version from 2/edge
const OTEL_ENDPOINT = __ENV.OTEL_ENDPOINT || 'http://localhost:4318';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const throughput = new Rate('throughput');
const bytesSent = new Counter('bytes_sent');

export const options = {
  scenarios: {
    constant_load_test: {
      executor: 'constant-arrival-rate',
      rate: 8000,               
      timeUnit: '1s',
      duration: '50s',          
      preAllocatedVUs: 300,  
      maxVUs: 600,
    },
  },
  thresholds: {
    'errors': ['rate<0.1'],
    'request_duration': ['p(95)<50', 'p(99)<100'],
    'bytes_sent': ['count>10000000'],
  },
  discardResponseBodies: true,
};

export function setup() {
  console.log(`Starting breakdown test`);
  console.log(`Target endpoint: ${OTEL_ENDPOINT}`);
  return { startTime: new Date().toISOString() };
}

const LOG_CONFIG = {
  streams: 4,        // Log streams per client
  minSize: 1024,     // 1KB
  maxSize: 2048,     // 2KB
  thinkTime: {       // Random think time between operations
    min: 1,
    max: 3
  }
};

export default function () {
  const start = Date.now();
  let success = false;

  const timestamp = Date.now() * 1e6; // nanoseconds

  const logRecords = Array.from({ length: LOG_CONFIG.streams }, (_, i) => ({
    timeUnixNano: `${timestamp}`,
    severityText: "INFO",
    body: { stringValue: `Log stream ${i + 1}: ${'x'.repeat(LOG_CONFIG.minSize)}` },
    attributes: [
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
        scope: {
          name: "k6-logger"
        },
        logRecords: logRecords
      }]
    }]
  };

  try {
    const res = http.post(`${OTEL_ENDPOINT}/v1/logs`, JSON.stringify(logPayload), {
      headers: {
        'Content-Type': 'application/json'
      },
    });

    const duration = Date.now() - start;

    // Record metrics
    requestDuration.add(duration);
    throughput.add(1);
    const estimatedBytes = (LOG_CONFIG.minSize + LOG_CONFIG.maxSize) / 2 * LOG_CONFIG.streams;
    bytesSent.add(estimatedBytes);

    // Validate response
    success = check(res, {
      'status is 200 or 204': (r) => r && (r.status === 200 || r.status === 204),
      'response time < 5s': () => duration < 5000
    });

    if (!success) {
      errorRate.add(1);
      console.error(`Request failed: ${res.status} - ${res.body}`);
    } 

    //console.log("Result is ", res)

  } catch (error) {
    errorRate.add(1);
    console.error('Request failed with error:', error.message);
  }

  console.log("Status: ", success)

}

export function teardown(data) {
  const endTime = new Date().toISOString();
  console.log(`Test completed. Duration: ${data.startTime} to ${endTime}`);
}

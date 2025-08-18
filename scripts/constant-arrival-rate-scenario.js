import http from "k6/http";
import { check } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import {
  errorRate,
  requestDuration,
  throughput,
  non200Responses,
  highLatencyResponses,
  totalLogs,
  total503errors,
  generateLogBody,
} from "./helpers.js";
// OTLP endpoint
const OTEL_ENDPOINT = __ENV.OTEL_ENDPOINT || "http://localhost:4318";

// === TEST CONFIG ===

const DURATION_SEC = 120; // 2 minutes

const VUS = 10;

export const options = {
  scenarios: {
    constant_rate_test: {
      // The constant-arrival-rate executor will keep the iterations constant and vary the number of VUs to ensure it meets the number of iterations to execute within time d.
      executor: "constant-arrival-rate",
      rate: 900, // iterations per second
      timeUnit: "1s", // each rate is per second
      duration: `${DURATION_SEC}s`, // total test time - this derive
      preAllocatedVUs: VUS,
    },
  },
  thresholds: {
    errors: ["rate<0.1"],
    request_duration: ["p(95)<50", "p(99)<100"],
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
    body: { stringValue: generateLogBody() },
    attributes: [
      { key: "vu", value: { stringValue: `vu-${__VU}` } },
      { key: "stream_id", value: { stringValue: `stream-${i + 1}` } },
    ],
  }));

  const start = Date.now();
  let success = false;

  const payload = {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "k6-load-test" } },
            { key: "host.name", value: { stringValue: "k6" } },
          ],
        },
        scopeLogs: [
          {
            scope: { name: "k6-logger" },
            logRecords,
          },
        ],
      },
    ],
  };

  try {
    // This is the HTTP endpoint for sending telemetry. We will hit /v1/logs to send logs. When setting the OTEL_ENDPOINT env var, ensure it includes the port e.g. export OTEL_ENDPOINT=http://OTEL_ADDRESS:4318
    // TODO: compare performance between JSON and when using Proto (when sending payload serialized using Protos)
    const res = http.post(`${OTEL_ENDPOINT}/v1/logs`, JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });

    const duration = Date.now() - start;

    // Metrics
    requestDuration.add(duration);
    throughput.add(1);

    success = check(res, {
      "status is 200 or 204": (r) =>
        r && (r.status === 200 || r.status === 204),
      "response time < 5s": () => duration < 5000,
    });

    if (!success) {
      errorRate.add(1);
      console.error(`Failed: ${res.status} - ${JSON.stringify(res)}`);
      console.error(`Failed: ${res.status}`);
    }

    if (res.status !== 200 && res.status !== 204) {
      non200Responses.add(1);
      if (res.status === 503) {
        total503errors.add(1);
      }
    }

    if (duration > 50) {
      highLatencyResponses.add(1);
    }
  } catch (err) {
    errorRate.add(1);
    console.error(`Error: ${err.message}`);
  }
}

import http from "k6/http";
import { check } from "k6";
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
// HTTP endpoint at 4318 (default to localhost if not provided)
const OTEL_ENDPOINT = __ENV.OTEL_ENDPOINT || "http://localhost:4318/v1/logs";

// Custom metrics
// TODO: get the CPU and memory of OTelcol. Can possbile make req to Otel every 10s that queries for these from node exporter
// TODO: we also need to have the queue (question: should we collect telemetry from the workload under test from K6 or elsewhere?)

// Test config
export const options = {
  scenarios: {
    custom_vu_test: {
      // The constant-vus executor executor will spin up a certain number of VUs and configure them to execute as many iterations as possible for a duration d.
      executor: "constant-vus",
      vus: 3,
      duration: "10m",
    },
  },
  thresholds: {
    // TODO: check that P(99) is less than 50ms
    errors: ["rate<0.01"],
    request_duration: ["p(99)<100"],
  },
  discardResponseBodies: true,
};

// Log message config
// TODO: use Faker library instead of predefined LOG_SIZE so not all requests are the same size and also makes use of UTF-8

// TODO: test with scaling up to 10 - what are interested in is not HTTP request count, but rather LOGS sent
// Get the total logs sent and divide by # of minutes to get /min avg

export function setup() {
  console.log(`Starting load test with 10 constant VUs`);
  console.log(`Target OTEL endpoint: ${OTEL_ENDPOINT}`);
}

// Main function executed by each VU
export default function () {
  const timestamp = Date.now() * 1e6;

  // Randomize the number of logs per this request (between 1-10) and increment the totalLogs counter
  const logs_per_request = 5; //Math.floor(Math.random() * 10) + 1;
  totalLogs.add(logs_per_request);

  // Create log records
  const logRecords = Array.from({ length: logs_per_request }, (_, i) => ({
    timeUnixNano: `${timestamp}`,
    severityText: "INFO",
    body: { stringValue: generateLogBody() },
    attributes: [
      { key: "vu", value: { stringValue: `vu-${__VU}` } },
      { key: "stream_id", value: { stringValue: `stream-${i + 1}` } },
    ],
  }));

  // OTLP payload
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

  const start = Date.now();
  let success = false;

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

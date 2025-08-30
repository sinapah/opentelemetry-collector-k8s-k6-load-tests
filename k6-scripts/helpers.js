import { Faker } from "k6/x/faker";
import { Rate, Trend, Counter } from "k6/metrics";

const errorRate = new Rate("errors");
const requestDuration = new Trend("request_duration");
const throughput = new Rate("throughput");
const non200Responses = new Counter("non_200_responses");
const highLatencyResponses = new Counter("high_latency_responses");
const totalLogs = new Counter("total_logs");
const total503errors = new Counter("total_503_errors");

export {
  errorRate,
  requestDuration,
  throughput,
  non200Responses,
  highLatencyResponses,
  totalLogs,
  total503errors,
};
const faker = new Faker("de");
export function generateLogBody(minSize = 256, maxSize = 2048) {
  const targetLength =
    Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
  let text = "";

  while (text.length < targetLength) {
    //text += faker.word.loremIpsumSentence() + " ";
    text += faker.word.verb() + " ";
  }
  console.log(text);
  return text.slice(0, targetLength);
}

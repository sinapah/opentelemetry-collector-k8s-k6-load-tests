# Using the Shared Iterations Executor
The `Shared Iterations` executor executes a total of _i_ iterations. There needs to a max duration parameter, at which point the test stops, and a VUs parameter, which determines how many VUs will be involved in executing all iterations.

All tests were run on `4cpu8gb`. Each request to the /v1/logs endpoint on Opentelemetry Collector will contain 1 log of size 1024 bytes.

## 10,000,000 Iterations Across 10 VUs

Summary: all responses returned 200, but 0.00026% (26 of 10,000,000) of all responses were over the 50 ms threshold. The average response took 662.74µs. About 12.1K requests were sent per second. This executor was configured to take at most 1h. However, in this scenario, only ~14 minutes were needed to complete this test. While this test was going on, all four CPU cores were at 82-93% capacity.

```
TOTAL RESULTS 

    checks_total: 20000000 24202.454382/s
    checks_succeeded: 100.00%  20000000 out of 20000000
    checks_failed: 0.00%    0 out of 20000000

    ✓ status is 200 or 204
    ✓ response time < 5s

    CUSTOM
    errors: 0.00%    0 out of 0
    high_latency_responses: 26       0.031463/s
    request_duration: avg=0.748322 min=0        med=1        max=118      p(90)=2      p(95)=2     
    throughput: 100.00%  10000000 out of 10000000

    HTTP
    http_req_duration.: avg=662.74µs min=57.91µs  med=487.9µs  max=117.6ms  p(90)=1.33ms p(95)=1.78ms
      { expected_response:true }: avg=662.74µs min=57.91µs  med=487.9µs  max=117.6ms  p(90)=1.33ms p(95)=1.78ms
    http_req_failed: 0.00%    0 out of 10000000
    http_reqs: 10000000 12101.227191/s

    EXECUTION
    iteration_duration: avg=816.93µs min=119.11µs med=622.67µs max=120.63ms p(90)=1.56ms p(95)=2.08ms
    iterations: 10000000 12101.227191/s
    vus: 10       min=10                   max=10
    vus_max: 10       min=10                   max=10

    NETWORK
    data_received: 1.3 GB   1.6 MB/s
    data_sent: 16 GB    19 MB/s

    running (0h13m46.4s), 00/10 VUs, 10000000 complete and 0 interrupted iterations
    shared_load_test ✓ [======================================] 10 VUs  0h13m46.4s/1h0m0s  10000000/10000000 shared iters

```

## Shared Iterations Across 10 VUs for 20 minutes - 10 VUs
Summary: all responses returned 200, but ~0.98% (98,420 of 10,000,000) of all responses were over the 50 ms threshold. The average response took 11.94ms. About 12.5K requests were sent per second.
```
_succeeded.: 100.00%  20000000 out of 20000000
    checks_failed: 0.00%    0 out of 20000000

    ✓ status is 200 or 204
    ✓ response time < 5s

    CUSTOM
    errors: 0.00%    0 out of 0
    high_latency_responses: 98420    123.56201/s
    request_duration: avg=14.52324 min=0        med=12      max=228      p(90)=28      p(95)=35     
    throughput: 100.00%  10000000 out of 10000000

    HTTP
    http_req_duration.: avg=11.94ms  min=67.81µs  med=9.78ms  max=228.15ms p(90)=24.26ms p(95)=29.77ms
      { expected_response:true }: avg=11.94ms  min=67.81µs  med=9.78ms  max=228.15ms p(90)=24.26ms p(95)=29.77ms
    http_req_failed: 0.00%    0 out of 10000000
    http_reqs: 10000000 12554.563097/s

    EXECUTION
    iteration_duration: avg=15.88ms  min=134.22µs med=12.64ms max=228.25ms p(90)=31.96ms p(95)=41.31ms
    iterations: 10000000 12554.563097/s
    vus: 200      min=200                  max=200
    vus_max: 200      min=200                  max=200

    NETWORK
    data_received: 1.3 GB   1.6 MB/s
    data_sent: 16 GB    20 MB/s




running (0h13m16.5s), 000/200 VUs, 10000000 complete and 0 interrupted iterations
shared_load_test ✓ [======================================] 200 VUs  0h13m16.5s/1h0m0s  10000000/10000000 shared iters


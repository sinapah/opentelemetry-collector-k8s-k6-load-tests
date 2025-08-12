# Using Constant VUs
The `Per Vu Iterations` executor takes in the number of VUs and a max duration and attempts to run the specified number of iterations per VU. The test will continue until each VU has completed all iterations or until the max duration is reached.

All tests were run on `4cpu8gb`

## 1,500,000 Iterations Per 10 VUs
Summary: all responses returned 200, but 9 of 1,500,000 responses were over the 50 ms threshold. The average response took 1.1 ms. About 8K requests were sent per second.
```
TOTAL RESULTS 

    checks_total.: 30000000 16378.986609/s
    checks_succeeded.: 100.00%  30000000 out of 30000000
    checks_failed: 0.00%    0 out of 30000000

    ✓ status is 200 or 204
    ✓ response time < 5s

    CUSTOM
    errors: 0.00%    0 out of 0
    high_latency_responses: 9        0.004914/s
    request_duration: avg=1.103414 min=0        med=1        max=77      p(90)=2      p(95)=3     
    throughput: 100.00%  15000000 out of 15000000

    HTTP
    http_req_duration.: avg=935.35µs min=76.41µs  med=714.95µs max=73.75ms p(90)=1.9ms  p(95)=2.52ms
      { expected_response:true }: avg=935.35µs min=76.41µs  med=714.95µs max=73.75ms p(90)=1.9ms  p(95)=2.52ms
    http_req_failed: 0.00%    0 out of 15000000
    http_reqs: 15000000 8189.493305/s

    EXECUTION
    iteration_duration: avg=1.21ms   min=225.88µs med=962.12µs max=77.14ms p(90)=2.31ms p(95)=2.99ms
    iterations: 15000000 8189.493305/s
    vus: 4        min=4                    max=10
    vus_max: 10       min=10                   max=10

    NETWORK
    data_received: 1.9 GB   1.1 MB/s
    data_sent: 141 GB   77 MB/s



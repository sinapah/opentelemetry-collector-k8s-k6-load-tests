# Using Constant VUs
The constant VUs executor takes in the number of VUs and a max duration and attempts to run as many iterations as possible per VU for the select timeframe. In the previous statement, "as many iterations as possible" translates to "as many iterations as the physical hardware allows for".

All tests were run on `4cpu8gb`
## Constant VUs for 20 minutes - 200 VUs

Summary: all responses returned 200, but approximately 0.27% (52,652 of 19,391,991) of all responses were over the 50 ms threshold. The average response took 9 ms. About 16K requests were sent per second.

```
CUSTOM
    errors: 0.00%    0 out of 0
    high_latency_responses: 52652    43.874617/s
    throughput: 100.00%  19391991 out of 19391991

    HTTP
    http_req_duration: avg=9.2ms     min=56.89µs  med=7.22ms max=339.91ms p(90)=19.43ms p(95)=24.07ms
      { expected_response:true }: avg=9.2ms     min=56.89µs  med=7.22ms max=339.91ms p(90)=19.43ms p(95)=24.07ms
    http_req_failed: 0.00%    0 out of 19391991
    http_reqs: 19391991 16159.237655/s

    EXECUTION
    iteration_duration: avg=12.34ms   min=114.09µs med=9.58ms max=433.74ms p(90)=25.64ms p(95)=32.95ms
    iterations: 19391991 16159.237655/s
    vus: 200      min=200                  max=200
    vus_max: 200      min=200                  max=200

    NETWORK
    data_received: 2.5 GB   2.1 MB/s
    data_sent: 31 GB    26 MB/s
```

## Constant VUs for 20 minutes - 10 VUs
Summary: all responses returned 200, but 24 of 18,663,293 of all responses were over the 50 ms threshold. The average response took 518 µs. About 11.6K requests were sent per second.
```
CUSTOM
    errors: 0.00%    0 out of 0
    high_latency_responses: 24       0.02/s
    throughput: 100.00%  18663293 out of 18663293

    HTTP
    http_req_duration: avg=518.74µs min=49.39µs med=363.53µs max=75.56ms p(90)=1.04ms p(95)=1.45ms
      { expected_response:true }: avg=518.74µs min=49.39µs med=363.53µs max=75.56ms p(90)=1.04ms p(95)=1.45ms
    http_req_failed: 0.00%    0 out of 18663293
    http_reqs: 18663293 15552.629069/s

    EXECUTION
    iteration_duration: avg=637.01µs min=99.21µs med=463.89µs max=75.63ms p(90)=1.23ms p(95)=1.71ms
    iterations : 18663293 15552.629069/s
    vus : 10       min=10                   max=10
    vus_max : 10       min=10                   max=10

    NETWORK
    data_received : 2.4 GB   2.0 MB/s
    data_sent : 30 GB    25 MB/s


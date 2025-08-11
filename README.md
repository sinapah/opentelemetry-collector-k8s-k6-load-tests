# opentelemetry-collector-k8s-k6-load-tests
This repo holds a collection of K6 JavaScript scripts written in order to load test the [charmed Opentelmetry Collector Operator for K8s](https://github.com/canonical/opentelemetry-collector-k8s-operator).

To run a script, please first do `export OTEL_ENDPOINT=http://OTEL_ADDRESS:4318` and then `./k6 run FILE_NAME`.
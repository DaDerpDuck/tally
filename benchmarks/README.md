# Benchmarks

Run every suite with:

```sh
npm run bench
```

Run an individual suite with `npm run bench:<suite>`, where `<suite>` is
`duplication`, `lifecycle`, `resolution`, or `replication`.

The harness uses fixed iteration counts instead of time-based sampling. This keeps
fast tasks from accumulating millions of timing samples and makes the suite's
runtime and memory usage predictable. Setup and cleanup hooks are outside the timed
region. Compare results from the same runtime, machine, power mode, and workload
size rather than treating a single run as an absolute performance guarantee.
Benchmarks are intentionally not performance gates in CI; CI only typechecks and
formats them.

# Benchmarks

Run every suite with:

```sh
npm run bench
```

Run an individual suite with `npm run bench:<suite>`, where `<suite>` is
`duplication`, `lifecycle`, `resolution`, or `replication`.

Control console output with `--log-level`:

```sh
npm run bench -- --log-level warn
npm run bench -- --log-level silent --output benchmark-results.json
```

Use `info` for tables, `warn` for diagnostic warnings only, or `silent` for no
benchmark output. To reduce run-to-run noise, aggregate the median result from an
odd number of complete runs:

```sh
npm run bench:repeat -- --runs 5 --log-level warn --output benchmark-results.json
```

Without `--output`, repeated results are written to
`benchmarks/results/benchmark-<commit>.json`. The ignored results directory is
created automatically. An explicit output path still overrides the default.

Compare two result files with:

```sh
node --import tsx benchmarks/compare.ts baseline.json candidate.json
```

The default comparison path is
`benchmarks/results/comparison-<baseline>-vs-<candidate>.md`. Pass a third path to
override it.

The harness combines short time-based runs with minimum iteration counts. Extremely
fast, stable operations are batched and reported as normalized per-operation
latencies so that timer quantization does not produce `zero-mad` warnings. Setup and
cleanup hooks remain outside the timed region where doing so preserves the workload.
The JSON report records each task's batch size and warnings, and repeated reports
also include their min-to-max spread. Comparisons call out warnings and spreads of
20% or more instead of presenting noisy changes as trustworthy regressions.

Tinybench warnings mean a result is not precise enough for small percentage
comparisons:

- `zero-mad`: at least half of the measured deviations collapsed to the same timer
  value. Increase the work performed per sample.
- `zero-dominated`: most measurements collapsed to zero. Batch substantially more
  work per sample.
- `low-distinct`: too few unique timings were observed. Increase the work per sample
  or use a larger workload.

Compare results from the same runtime, machine, power mode, and workload size rather
than treating a single run as an absolute performance guarantee. Benchmarks are
intentionally not performance gates in CI; CI only typechecks and formats them.

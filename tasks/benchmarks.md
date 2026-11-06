# Production navigation frame measurements

Measured 2026-11-05T17:36:46.984Z for DD-23, on source base f68c3b2582d834720d63e7d0215770ed0478f95a.
DD-17 can use these observations to design later benchmark checks.

## Results

Main-thread work per ArrowDown press, in milliseconds. Median is the mean of
the two middle sorted samples. Max includes every measured press.
Load columns are the host's 1 / 5 / 15 minute averages.

| Scenario                             | Presses | Median ms | Max ms | Load before           | Load after            |
| ------------------------------------ | ------: | --------: | -----: | --------------------- | --------------------- |
| Tree, 5,000 rows, default viewport   |      60 |    25.251 | 41.852 | 13.38 / 13.77 / 13.51 | 13.11 / 13.71 / 13.49 |
| Tree, 50,000 rows, virtualized       |      60 |     8.967 | 11.272 | 13.02 / 13.68 / 13.48 | 13.02 / 13.68 / 13.48 |
| Table, 5,000 × 10, virtualized, flat |      60 |     8.045 | 10.095 | 13.02 / 13.68 / 13.48 | 12.78 / 13.62 / 13.46 |

At a nominal 60 Hz, one frame is 16.667 ms. The default Tree median exceeds
that allowance, as does its maximum. The virtualized Tree and Table samples
are all below that allowance. These results do not
establish a one-frame guarantee. They measure main-thread task time, not
input-to-paint latency or compositor/GPU time.

## Machine and build

- Host: `debian`, Linux `6.12.107+deb13-amd64`, x86_64.
- CPU: AMD Ryzen 9 9950X 16-Core Processor, 32 logical CPUs.
- RAM: 249.1 GiB. Node v22.20.0, pnpm 12.3.4.
- Browser: HeadlessChrome/156.0.8078.4, Playwright-cached
  `chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`.
- Flags: `--no-sandbox --no-zygote --disable-gpu --disable-dev-shm-usage`,
  `--allow-file-access-from-files --disable-background-networking`,
  `--remote-debugging-port=0`, a fresh task-owned user-data directory, and
  `about:blank`. No CPU throttling.
- Browser viewport: 1280 × 720 CSS pixels, device scale factor 1.
- Production artifacts: `pnpm build`, including the existing Vite React Compiler
  configuration. All builds and typechecks finished before sampling. No build
  or typecheck ran in this worktree during the measurements.
- Host load remained elevated as shown above. The sandbox process list cannot
  certify that no other host user was building. Treat these as shared-host
  measurements, not a certified idle-machine baseline; repeat on an idle host
  before setting a hard CI threshold.

## Reproduction method

1. Build first. Start the cached headless shell with an ephemeral CDP port and
   read its `DevToolsActivePort`; use a task-owned browser so another session
   cannot affect the sample. Connect to its page WebSocket using CDP.
2. Loading the production output through a local static HTTP server did not
   finish browser navigation in this sandbox. Use the allowed `file://` fallback:
   copy each built `index.html` to a scratch HTML file, rewrite only its
   `/assets/` script and stylesheet URLs to absolute `file://` URLs in that
   example's `dist/assets`, and load it with file access enabled. Do not alter
   the JS/CSS bundles or use a development build.
3. Enable `Page`, `Runtime`, and `Performance` with
   `timeDomain: "timeTicks"`; set the viewport with
   `Emulation.setDeviceMetricsOverride`. Navigate and wait for
   `Page.loadEventFired`, then two `requestAnimationFrame` callbacks.
4. Change the real Rows/Viewport selects by setting their values and dispatching
   bubbling `change` events. Tree: 5,000/all and 50,000/virtualized, with all
   default parents expanded. Table: 5,000/flat/virtualized, ten columns, no sort.
   (The Table no longer pre-sorts its rows with `getSortedRows`: since DD-30,
   TanStack's sorting state orders them, and with no sort they keep data order.)
   Keep live feeds off and the Tree example's Watchlist pane present. Wait two
   frames after each change. Status text confirmed exactly 5,000/50,000/5,000
   logical rows; virtualized rendering mounted only a small visible range.
5. Focus `[data-slot="tree-root"]` or `[data-slot="table-root"]`. Send ten
   unmeasured warmup ArrowDown presses. Inspect a screenshot for each scenario.
6. For each of 60 measured presses, read `Performance.getMetrics`' cumulative
   `TaskDuration`, dispatch CDP `Input.dispatchKeyEvent` keyDown and keyUp with
   `key/code: "ArrowDown"` and virtual/native key code 40, then await two nested
   animation frames and read `TaskDuration` again. Multiply the difference by
   1,000. The frame waits allow commits and rendering work to settle; their
   elapsed waiting time is not counted as task work.
7. Outside each timed interval, check that `aria-activedescendant` changed and
   resolves to a mounted element. All 60 presses in each scenario advanced to
   distinct highlights. Capture `Runtime.exceptionThrown`; none occurred.
8. Record `os.loadavg()` immediately before and after the sample block. Then
   run ten no-key, two-frame control intervals using the same metric reads.
   Close the browser and remove scratch files.

The task-duration interval includes CDP evaluation/frame callback overhead
and any other renderer task work in those frames. No overhead was subtracted.
It excludes keyboard transport delay, waiting for vsync, and work after the
settling boundary; it is not an end-to-end latency measurement.

No-key control intervals:

- tree-5000-default: median 4.360 ms, max 8.079 ms.
- tree-50000-virtual: median 0.822 ms, max 1.969 ms.
- table-5000x10-virtual: median 0.991 ms, max 2.338 ms.

## Raw per-press task durations

Milliseconds, in press order, rounded to three decimals.

### tree-5000-default

```text
14.261, 14.986, 17.127, 22.221, 30.804, 26.203, 27.037, 27.754, 24.802, 24.013
20.378, 28.549, 23.646, 25.530, 22.797, 25.825, 29.175, 35.147, 22.702, 20.001
21.822, 24.520, 32.386, 24.763, 26.073, 33.259, 24.340, 29.735, 20.569, 22.687
23.952, 26.694, 29.652, 23.853, 25.069, 25.432, 23.812, 19.688, 22.908, 22.437
25.853, 23.505, 23.575, 30.875, 29.577, 24.871, 26.497, 23.441, 33.960, 23.038
29.306, 30.548, 41.489, 40.145, 24.337, 41.852, 37.537, 38.995, 30.580, 28.674
```

### tree-50000-virtual

```text
9.207, 10.488, 8.487, 8.856, 9.901, 9.244, 10.427, 9.714, 9.764, 9.337
7.721, 9.325, 8.657, 8.984, 10.622, 8.015, 7.917, 8.378, 9.441, 8.932
9.386, 8.339, 9.632, 10.017, 8.527, 7.877, 8.386, 10.681, 8.556, 9.032
9.847, 10.912, 10.649, 8.705, 8.049, 9.438, 7.739, 9.181, 8.318, 9.542
11.272, 9.208, 8.427, 9.653, 9.554, 7.906, 7.827, 8.467, 8.063, 8.372
8.668, 7.674, 7.950, 9.269, 7.474, 7.564, 7.536, 11.270, 10.147, 8.949
```

### table-5000x10-virtual

```text
5.351, 4.603, 5.077, 3.947, 4.534, 8.744, 9.267, 8.509, 8.162, 8.227
6.437, 7.247, 8.632, 8.172, 7.835, 7.777, 9.755, 8.450, 8.192, 8.577
8.262, 8.221, 7.700, 8.739, 8.285, 7.798, 8.793, 7.623, 8.248, 7.037
7.837, 10.095, 8.510, 7.347, 8.796, 6.767, 7.915, 7.888, 8.333, 8.885
8.932, 8.222, 8.767, 8.984, 9.238, 7.408, 8.001, 7.524, 8.641, 7.339
7.798, 6.948, 7.918, 7.753, 7.795, 8.468, 7.988, 7.809, 6.890, 8.088
```

## DD-22: row containment and position-only updates

Measured 2026-11-05 on the DD-23 host, browser and flags, with the DD-23 method
above. Each batch alternated a production build of `main` (b0f6d30, "before")
and of the DD-22 branch ("after") in fresh browsers, so both saw the same host
load. The insert scenario clicks the Tree example's real "Add fill" button 30
times (one row at the top of 5,000, after five unmeasured ArrowDown presses
and three unmeasured fills), reading `TaskDuration` around each click and two
frames, as for key presses.

Root cause: a CPU profile showed 3.8 ms of script per default-viewport key
press; React already re-rendered only the two rows whose highlight changed. A
trace attributed about 9 ms per press to
`IntersectionObserverController::computeIntersections`: `content-visibility:
auto` on every row makes the browser check each mounted row's visibility
every frame. Rows now use `contain: layout style`. Insertions re-rendered every
row because each row's index changed; rows no longer re-render for a
position-only change, and `Table.Row` subscribes to its own index.

Median / max milliseconds per action:

| Scenario                         | Batch, host load (1 min) | Before          | After       |
| -------------------------------- | ------------------------ | --------------- | ----------- |
| Tree, 5,000 rows, ArrowDown      | 1, 20–22                 | 31.7 / 64.6     | 8.9 / 20.6  |
| Tree, 5,000 rows, ArrowDown      | 2, 20–22                 | 26.0 / 40.9     | 6.9 / 13.9  |
| Tree, 5,000 rows, ArrowDown      | 3, 17–19                 | 32.2 / 57.8     | 12.5 / 21.9 |
| Tree, 5,000 rows, ArrowDown      | 4, 19                    | 36.4 / 62.1     | 11.0 / 21.7 |
| Tree, 5,000 rows, ArrowDown      | 5, 20–23                 | 42.3 / 65.4     | 12.3 / 15.3 |
| Tree, 5,000 rows, insert one row | 1, 20–22                 | 140.5 / 292.8   | 19.4 / 39.3 |
| Tree, 5,000 rows, insert one row | 2, 20–22                 | 146.2 / 185.0   | 17.0 / 21.5 |
| Tree, 5,000 rows, insert one row | 3, 17–19                 | 164.7 / 323.5   | 20.2 / 27.1 |
| Tree, 5,000 rows, insert one row | 4, 19                    | 152.3 / 261.5   | 29.0 / 41.1 |
| Tree, 5,000 rows, insert one row | 5, 20–23                 | 163.7 / 324.0   | 29.7 / 38.8 |
| Tree, 50,000 rows, virtualized   | 3–5, 17–23               | 7.5–9.7 medians | 7.1–9.4     |
| Table, 5,000 × 10, flat, all     | 6–7, 18–20               | 31.3–32.0       | 12.3–17.9   |
| Table, 5,000 × 10, flat, virtual | 6–7, 18–20               | 5.2–6.9         | 5.0–5.5     |

After review, `Tree.Row` also subscribes to its own set position, so flat
lists keep row content out of insertions too (every sibling's `aria-setsize`
changes). Two more alternating batches on that head, host load 12–13: ArrowDown
26.1 / 23.6 ms before and 12.1 / 9.9 ms after; insert 146.0 / 139.8 ms before
and 21.8 / 19.9 ms after. After four fills, all 11 top-level rows had
consecutive `aria-posinset` and `aria-setsize` 11.

Every press advanced to a distinct mounted highlight and no exception was
thrown. Default-viewport key presses are now under one 60 Hz frame (16.7 ms)
at the median in every batch. One insertion still costs about one to two
frames under this load: a profile attributes the rest to the browser laying
out 5,000 shifted rows, React reconciling 5,000 keyed children, and 5,000
per-row store subscriptions being notified. Virtualize collections of
thousands of rows that change often.

Trade-off: without `content-visibility`, the browser lays out every mounted
row up front. Switching the Tree example from 100 to 5,000 rows took a median
of 159 ms before and 275–282 ms after (six switches each); 50,000 rows without
a virtualizer took 3.6 s before and 4.3–4.9 s after.

## DD-32: built-in `virtual` viewport

Type budget (`pnpm type-budget`): 1,746 instantiations before and 1,746 after,
under the 1,800 budget. The workload does not pass `virtual`; the prop is a
plain `boolean | VirtualOptions` union.

Mounted rows with `virtual` and no options (headless Chromium, docs `/table`
example at 10,000 rows, viewport capped at 12 row heights): compact
(`--dd-row-height` 1.75rem = 28 px) mounts 19 rows at the top and 28 mid-list,
with `scrollHeight` 280,028 px (header plus 10,000 × 28); comfortable
(2.25rem = 36 px) mounts 19 at the top and 29 mid-list, with `scrollHeight`
360,036 px. The estimate followed each density switch without a remount.

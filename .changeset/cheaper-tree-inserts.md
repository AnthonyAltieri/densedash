---
"@densedash/react": patch
---

Make inserting a row into a Tree or List with thousands of mounted rows cheaper. Rows share one subscription per tree that notifies only the rows whose highlight, selection, expansion, tab stop or set position changed, instead of one subscription per row. Unchanged rows keep their element, so React skips them without comparing props, and scroll anchoring finds the highlighted row by id instead of computing every row's element id. At 5,000 rows an insertion takes about 14 ms instead of 17 to 22 ms on a loaded host, and a key press about 4 ms instead of 7 to 10 ms.

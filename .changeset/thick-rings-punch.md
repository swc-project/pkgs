---
"@swc/cli": patch
---

Skip the write when emitted output is byte-identical, and write through a temp file plus rename so watch consumers never read a partially written file

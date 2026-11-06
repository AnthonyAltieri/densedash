---
"@densedash/core": patch
---

Let page commands run from focused Trees and Lists when the widget does not bind their keys. Commands now default to skipping editable controls instead of reserving every widget typeahead character. A command sequence prefix takes priority over typeahead. Check native key prevention after bubbling, and keep the active legend aligned with widget ownership and editable focus.

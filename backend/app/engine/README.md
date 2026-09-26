# Engine

The single deterministic queue engine shared by all departments: wait-time estimation, slot/overbooking limits, counter load-balancing, and the `recompute(provider, now)` step run after every lifecycle event (book, walk-in, check-in, start, delay, complete, cancel, no-show). Pure logic, no database or HTTP concerns.

# Services

Application/use-case logic that orchestrates models and the engine: booking an appointment, issuing a walk-in token, checking a patient in, marking a delay or no-show. Services call into `engine/` for queue math and never talk to FastAPI directly.

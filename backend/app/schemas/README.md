# Schemas

Pydantic request/response models used at the API boundary. Kept separate from `models/` so the database shape can evolve without breaking the public contract, and so internal fields are never accidentally exposed.

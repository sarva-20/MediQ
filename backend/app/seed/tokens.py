class TokenSequencer:
    """Generates human-facing token numbers like "GM-A012" (department + source
    letter + zero-padded sequence). Sequenced per (department, source) — not per
    provider — matching how a patient reads a physical token board."""

    def __init__(self) -> None:
        self._counters: dict[tuple[str, str], int] = {}

    def next(self, department_code: str, source_letter: str) -> str:
        key = (department_code, source_letter)
        self._counters[key] = self._counters.get(key, 0) + 1
        return f"{department_code}-{source_letter}{self._counters[key]:03d}"

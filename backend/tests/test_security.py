from app.core.security import hash_password, verify_password


def test_hash_and_verify_roundtrip() -> None:
    hashed = hash_password("MediQ@2026")

    assert verify_password("MediQ@2026", hashed)
    assert not verify_password("wrong-password", hashed)


def test_hash_is_not_plaintext_and_is_salted() -> None:
    first = hash_password("MediQ@2026")
    second = hash_password("MediQ@2026")

    assert first != "MediQ@2026"
    assert first != second  # bcrypt salts each hash differently

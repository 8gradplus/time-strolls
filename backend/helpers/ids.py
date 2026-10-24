import os
import time
import uuid


def uuid7() -> uuid.UUID:
    """A UUID version 7: 48 bits of Unix time in milliseconds, then random
    bits, so ids sort by creation time (as timestrolls.uuid_generate_v7())."""
    ms = time.time_ns() // 1_000_000
    b = bytearray(ms.to_bytes(6, "big") + os.urandom(10))
    b[6] = (b[6] & 0x0F) | 0x70  # version 7
    b[8] = (b[8] & 0x3F) | 0x80  # variant RFC 4122
    return uuid.UUID(bytes=bytes(b))

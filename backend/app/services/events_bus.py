"""Tiny in-process pub/sub. Lifecycle actions publish here after each change;
Module M7's SSE stream will subscribe here instead of polling the database.
Synchronous and unbounded on purpose — there are no subscribers yet, and this
is a single-process app."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

Subscriber = Callable[["QueueEventMessage"], None]


@dataclass(frozen=True)
class QueueEventMessage:
    provider_id: int
    event_type: str
    payload: dict[str, Any]


_subscribers: list[Subscriber] = []


def subscribe(callback: Subscriber) -> None:
    _subscribers.append(callback)


def clear_subscribers() -> None:
    """For test isolation — subscriber lists are module-level state."""
    _subscribers.clear()


def publish(message: QueueEventMessage) -> None:
    for callback in _subscribers:
        callback(message)

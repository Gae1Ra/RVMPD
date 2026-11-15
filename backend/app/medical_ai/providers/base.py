from abc import ABC, abstractmethod

from ..models import MedicalInsight, VitalsSnapshot


class MedicalAiProvider(ABC):
    """Bedrock-shaped interface: one method that turns filtered vitals into an insight."""

    name: str = "base"

    @abstractmethod
    def analyze(self, snap: VitalsSnapshot, context: str) -> MedicalInsight:
        """Return a structured insight. Must not raise for demo paths; callers catch."""

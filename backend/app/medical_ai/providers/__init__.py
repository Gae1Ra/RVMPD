"""Provider registry for the medical AI client."""
from .base import MedicalAiProvider
from .bedrock import BedrockMedicalAiProvider
from .mock import MockMedicalAiProvider

__all__ = ["MedicalAiProvider", "MockMedicalAiProvider", "BedrockMedicalAiProvider"]

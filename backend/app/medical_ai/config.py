"""Feature flags and Bedrock-shaped env vars. Defaults keep demos offline and free."""
import os


def medical_ai_enabled() -> bool:
    """Opt-in. Off by default so existing flows never call an external model."""
    return os.environ.get("VITALIS_MEDICAL_AI", "").strip().lower() in ("1", "true", "yes", "on")


def provider_name() -> str:
    """`mock` (default when enabled) or `bedrock`."""
    raw = (os.environ.get("VITALIS_MEDICAL_AI_PROVIDER") or "mock").strip().lower()
    return raw if raw in ("mock", "bedrock") else "mock"


def aws_region() -> str:
    return (
        os.environ.get("AWS_REGION")
        or os.environ.get("AWS_DEFAULT_REGION")
        or "us-east-1"
    )


def knowledge_base_id() -> str | None:
    return os.environ.get("VITALIS_KNOWLEDGE_BASE_ID") or os.environ.get("KNOWLEDGE_BASE_ID")


def guardrail_id() -> str | None:
    return os.environ.get("VITALIS_GUARDRAIL_ID") or os.environ.get("GUARDRAIL_ID")


def guardrail_version() -> str:
    return os.environ.get("VITALIS_GUARDRAIL_VERSION") or os.environ.get("GUARDRAIL_VERSION") or "1"


def model_arn() -> str:
    """Bedrock foundation-model ARN used by RetrieveAndGenerate."""
    explicit = os.environ.get("VITALIS_MODEL_ARN") or os.environ.get("MODEL_ARN")
    if explicit:
        return explicit
    region = aws_region()
    model_id = os.environ.get("VITALIS_BEDROCK_MODEL", "amazon.nova-pro-v1:0")
    return f"arn:aws:bedrock:{region}::foundation-model/{model_id}"

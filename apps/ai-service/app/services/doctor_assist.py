"""Doctor-side drafting. Output is always a labelled draft for professional review."""

from __future__ import annotations

import time

from app.metrics import metrics
from app.prompts import policies
from app.providers.base import LLMProvider
from app.safety import decision
from app.safety.injection import sanitise_user_text
from app.safety.output_guard import check_output
from app.schemas import AiMeta, DoctorAssistRequest, DoctorAssistResponse

_STANDARD_WARNINGS = [
    "AI-generated draft. Review, edit and approve before it becomes part of any record.",
    "Does not diagnose, assess suicide risk or recommend medication.",
]


class DoctorAssistService:
    def __init__(self, provider: LLMProvider) -> None:
        self.provider = provider

    async def assist(self, req: DoctorAssistRequest) -> DoctorAssistResponse:
        started = time.monotonic()
        system = policies.DOCTOR_SYSTEM.format(category=sanitise_user_text(req.professional_category)[:40])
        context = "\n\n".join(f"## {k}\n{sanitise_user_text(v)[:6000]}" for k, v in req.context.items())
        task = policies.DOCTOR_TASKS[req.task.value]
        instructions = (
            f"\nProfessional's instructions: {sanitise_user_text(req.instructions)}"
            if req.instructions
            else ""
        )
        result = await self.provider.generate(
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": f"Task: {task}{instructions}\n\n<<<CONTEXT\n{context or 'None provided.'}\nCONTEXT>>>",
                }
            ],
            max_tokens=900,
            temperature=0.2,
        )
        guard = check_output(result.text, [], [])
        warnings = list(_STANDARD_WARNINGS)
        if guard.actions:
            warnings.append(
                "Some generated content was removed by safety checks: " + ", ".join(guard.actions)
            )
        latency = int((time.monotonic() - started) * 1000)
        metrics.observe("doctor_assist", latency, result.input_tokens, result.output_tokens)
        return DoctorAssistResponse(
            draft=guard.text or "No usable draft could be produced. Please write this section yourself.",
            warnings=warnings,
            meta=AiMeta(
                provider=self.provider.name,
                model=result.model,
                prompt_version=policies.DOCTOR_PROMPT_VERSION,
                policy_version=decision.POLICY_VERSION,
                input_tokens=result.input_tokens,
                output_tokens=result.output_tokens,
                latency_ms=latency,
                is_mock=result.is_mock,
                output_guard_actions=guard.actions,
            ),
        )

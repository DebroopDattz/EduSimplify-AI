"""
EduSimplify AI – Translation agent.

Translates educational text into one of six supported languages while:
1. Preserving technical / domain-specific terms in their original English form.
2. Adapting register and vocabulary for educational contexts.
3. Maintaining structural elements (lists, headings, formulas).

Supported target languages: English, Hindi, Bengali, Tamil, Telugu, Marathi.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List

from loguru import logger


# ── Language-specific guidance ────────────────────────────────────────────────

_LANGUAGE_GUIDANCE: Dict[str, str] = {
    "English": (
        "Produce clear, standard academic English. "
        "If the input is already in English, paraphrase for improved clarity and readability."
    ),
    "Hindi": (
        "Translate to modern standard Hindi (Devanagari script). "
        "Use Khariboli Hindi. Preserve English technical terms in parentheses "
        "after their Hindi equivalent, e.g. 'गुरुत्वाकर्षण (Gravity)'."
    ),
    "Bengali": (
        "Translate to standard Bengali (বাংলা). "
        "Use formal educational register. Preserve English technical terms "
        "in parentheses after the Bengali equivalent."
    ),
    "Tamil": (
        "Translate to standard Tamil (தமிழ்). "
        "Use formal educational register. Preserve English technical terms "
        "in parentheses after the Tamil equivalent."
    ),
    "Telugu": (
        "Translate to standard Telugu (తెలుగు). "
        "Use formal educational register. Preserve English technical terms "
        "in parentheses after the Telugu equivalent."
    ),
    "Marathi": (
        "Translate to standard Marathi (मराठी). "
        "Use formal educational register. Preserve English technical terms "
        "in parentheses after the Marathi equivalent."
    ),
}

# Scientific / technical terms that must ALWAYS be preserved in English
_PRESERVE_TERMS: List[str] = [
    "algorithm", "function", "variable", "constant", "equation", "theorem",
    "hypothesis", "DNA", "RNA", "ATP", "protein", "catalyst", "entropy",
    "derivative", "integral", "matrix", "vector", "probability", "statistics",
    "photosynthesis", "mitosis", "meiosis", "Newton", "Einstein", "Planck",
    "gravity", "quantum", "relativity", "momentum", "velocity", "acceleration",
    "machine learning", "deep learning", "neural network", "API", "database",
    "CPU", "RAM", "HTTP", "SQL", "Python", "Java", "JavaScript",
    "osmosis", "diffusion", "evaporation", "condensation", "oxidation",
]

_TRANSLATION_SYSTEM_TEMPLATE = """\
You are an expert multilingual educational translator for EduSimplify AI.

TARGET LANGUAGE: {target_language}
LANGUAGE GUIDANCE: {language_guidance}

PRESERVATION LIST (keep these terms in English, do not translate them):
{preserve_list}

ADDITIONAL RULES:
1. Translate only the meaning – do not add explanations or commentary.
2. Preserve ALL mathematical expressions, formulas, and equations exactly as-is.
3. Preserve ALL code snippets, variable names, and file paths exactly as-is.
4. Preserve ALL proper nouns (names of scientists, places, institutions).
5. Preserve structural formatting: if the input uses bullet points, keep them.
6. Return ONLY the translated text. No preamble, no "Translation:", no meta-text.
"""


class TranslationAgent:
    """
    Agent that translates educational content into supported Indian languages
    or produces a clarified English paraphrase.

    Args:
        watsonx_service: Initialised WatsonxService.
    """

    def __init__(self, watsonx_service) -> None:
        self._watsonx = watsonx_service

    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Translate text to the target language.

        Expected payload keys:
        - ``text``                    (str)  – Source text to translate.
        - ``target_language``         (str)  – One of the supported languages.
        - ``preserve_technical_terms`` (bool) – Whether to enforce term preservation.

        Returns:
            Dict with keys:
            - ``translated_text``  (str)
            - ``preserved_terms``  (list[str])
            - ``target_language``  (str)
        """
        text: str = payload["text"]
        target_language: str = payload.get("target_language", "English")
        preserve_terms: bool = payload.get("preserve_technical_terms", True)

        # Detect terms present in the source text
        preserved: List[str] = []
        if preserve_terms:
            text_lower = text.lower()
            for term in _PRESERVE_TERMS:
                if term.lower() in text_lower:
                    preserved.append(term)
            # Also pick up ACRONYMS
            acronyms = re.findall(r"\b[A-Z]{2,}\b", text)
            for acr in acronyms:
                if acr not in preserved:
                    preserved.append(acr)

        language_guidance = _LANGUAGE_GUIDANCE.get(
            target_language, _LANGUAGE_GUIDANCE["English"]
        )

        preserve_list = (
            ", ".join(preserved) if preserved else "None detected (translate all terms)"
        )

        system = _TRANSLATION_SYSTEM_TEMPLATE.format(
            target_language=target_language,
            language_guidance=language_guidance,
            preserve_list=preserve_list,
        )

        prompt = (
            "<|begin_of_text|>"
            f"<|start_header_id|>system<|end_header_id|>\n{system}<|eot_id|>"
            "<|start_header_id|>user<|end_header_id|>\n"
            f"Translate the following text to {target_language}:\n\n{text}"
            "<|eot_id|>"
            "<|start_header_id|>assistant<|end_header_id|>"
        )

        translated = self._watsonx.generate(
            prompt=prompt,
            max_tokens=1024,
            temperature=0.1,  # Very low temperature for accuracy
        )

        logger.info(
            f"[TranslationAgent] Translated {len(text)} chars → {target_language}. "
            f"Preserved {len(preserved)} term(s)."
        )

        return {
            "original_text": text,
            "translated_text": translated.strip(),
            "target_language": target_language,
            "preserved_terms": preserved,
        }

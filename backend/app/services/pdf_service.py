"""
EduSimplify AI – PDF processing service.

Provides all document-level text-extraction and pre-processing utilities:
- ``extract_text_from_pdf``  – byte-level extraction using pdfplumber
- ``clean_text``             – normalise whitespace, strip headers/footers
- ``detect_sections``        – identify section / chapter headings
- ``detect_equations``       – find LaTeX / inline-math patterns
- ``detect_tables_and_figures`` – identify tabular regions
- ``chunk_document``         – split text into overlapping chunks for RAG
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from typing import List, Optional

import pdfplumber
from loguru import logger


# ─── Data structures ──────────────────────────────────────────────────────────


@dataclass
class DocumentSection:
    """A detected heading / section inside a document."""
    heading: str
    start_char: int
    level: int = 1  # 1 = top-level, 2 = sub-section, etc.


@dataclass
class TextChunk:
    """A piece of document text ready for embedding."""
    chunk_id: str
    text: str
    start_char: int
    end_char: int
    page_hint: Optional[int] = None
    metadata: dict = field(default_factory=dict)


# ─── Constants ────────────────────────────────────────────────────────────────

# Common academic heading patterns (numbered, Roman, plain uppercase).
_HEADING_PATTERNS: List[re.Pattern] = [
    re.compile(r"^\s*(?:Chapter|CHAPTER)\s+\d+[\.\:]?\s+\S+", re.MULTILINE),
    re.compile(r"^\s*\d{1,2}\.\s+[A-Z][A-Za-z\s]{3,60}$", re.MULTILINE),
    re.compile(r"^\s*\d{1,2}\.\d{1,2}\s+[A-Z][A-Za-z\s]{3,60}$", re.MULTILINE),
    re.compile(r"^\s*[IVXLC]+\.\s+[A-Z][A-Za-z\s]{3,60}$", re.MULTILINE),
    re.compile(r"^\s*[A-Z][A-Z\s]{4,60}$", re.MULTILINE),  # ALL-CAPS lines
]

_EQUATION_PATTERNS: List[re.Pattern] = [
    re.compile(r"\$\$.+?\$\$", re.DOTALL),           # display math
    re.compile(r"\$.+?\$"),                            # inline math
    re.compile(r"\\begin\{(?:equation|align|math)\}.+?\\end\{(?:equation|align|math)\}", re.DOTALL),
    re.compile(r"[a-zA-Z]\s*=\s*[\d\w\s\+\-\*\/\(\)\^]+"),  # simple assignments
]

_TABLE_PATTERNS: List[re.Pattern] = [
    re.compile(r"(?:Table|TABLE|Fig\.?|Figure|FIGURE)\s+\d+[\.\:]"),
    re.compile(r"\|[-\|]+\|"),  # Markdown-style separator rows
    re.compile(r"^\s*\d+\s+\d+\s+\d+", re.MULTILINE),  # numeric grid rows
]

_NOISE_PATTERNS: List[re.Pattern] = [
    re.compile(r"^\s*\d+\s*$", re.MULTILINE),              # lone page numbers
    re.compile(r"(?:www\.|https?://)\S+"),                  # URLs
    re.compile(r"[\u200b\u200c\u200d\ufeff]"),              # zero-width chars
    re.compile(r"\n{3,}", re.MULTILINE),                    # excessive blank lines
]


# ─── Public API ───────────────────────────────────────────────────────────────


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract all text from a PDF given its raw bytes.

    Uses pdfplumber which handles complex multi-column layouts, tables and
    scanned PDFs (with embedded text) well.

    Args:
        file_bytes: Raw bytes of the PDF file.

    Returns:
        Concatenated plain text across all pages, separated by form-feed
        characters so page boundaries are preserved for downstream processing.

    Raises:
        ValueError: If ``file_bytes`` cannot be parsed as a PDF.
    """
    logger.debug(f"Extracting text from PDF ({len(file_bytes):,} bytes).")
    try:
        pages_text: List[str] = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append(f"[PAGE {page_num}]\n{text}")
                logger.debug(f"  Page {page_num}: {len(text)} chars extracted.")
        full_text = "\n\f\n".join(pages_text)
        logger.info(f"PDF extraction complete – {len(pages_text)} pages, {len(full_text):,} total chars.")
        return full_text
    except Exception as exc:
        logger.error(f"pdfplumber extraction failed: {exc}")
        raise ValueError(f"Could not extract text from PDF: {exc}") from exc


def clean_text(text: str) -> str:
    """
    Remove noise from extracted PDF text.

    Steps applied in order:
    1. Strip lone page-number lines.
    2. Remove URLs.
    3. Remove zero-width Unicode characters.
    4. Collapse runs of 3+ newlines down to 2.
    5. Normalise whitespace on each line (trim trailing spaces).
    6. Strip leading/trailing whitespace from the entire document.

    Args:
        text: Raw extracted text.

    Returns:
        Cleaned text string.
    """
    # 1-4: Regex noise removal
    result = text
    result = _NOISE_PATTERNS[0].sub("", result)        # lone page numbers
    result = _NOISE_PATTERNS[1].sub("", result)        # URLs
    result = _NOISE_PATTERNS[2].sub("", result)        # zero-width chars
    result = _NOISE_PATTERNS[3].sub("\n\n", result)    # excessive blanks

    # 5: Trim trailing spaces from each line
    lines = [line.rstrip() for line in result.splitlines()]
    result = "\n".join(lines)

    # 6: Overall strip
    return result.strip()


def detect_sections(text: str) -> List[DocumentSection]:
    """
    Detect section headings within a document.

    Iterates through predefined heading regex patterns and collects all
    matches, de-duplicating overlapping detections by character offset.

    Args:
        text: Cleaned document text.

    Returns:
        List of :class:`DocumentSection` objects, sorted by ``start_char``.
    """
    seen_offsets: set[int] = set()
    sections: List[DocumentSection] = []

    for level, pattern in enumerate(_HEADING_PATTERNS, start=1):
        for match in pattern.finditer(text):
            start = match.start()
            if start in seen_offsets:
                continue
            seen_offsets.add(start)
            heading = match.group().strip()
            sections.append(DocumentSection(heading=heading, start_char=start, level=level))

    sections.sort(key=lambda s: s.start_char)
    logger.debug(f"Detected {len(sections)} sections.")
    return sections


def detect_equations(text: str) -> List[str]:
    """
    Find all LaTeX / mathematical expressions in the text.

    Args:
        text: Document text (cleaned or raw).

    Returns:
        List of matched equation strings (de-duplicated).
    """
    found: List[str] = []
    seen: set[str] = set()
    for pattern in _EQUATION_PATTERNS:
        for match in pattern.finditer(text):
            expr = match.group().strip()
            if expr and expr not in seen:
                seen.add(expr)
                found.append(expr)
    logger.debug(f"Detected {len(found)} equation(s).")
    return found


def detect_tables_and_figures(text: str) -> List[str]:
    """
    Identify table / figure references and inline ASCII tables.

    Args:
        text: Document text.

    Returns:
        List of matched strings describing tables or figures.
    """
    found: List[str] = []
    seen: set[str] = set()
    for pattern in _TABLE_PATTERNS:
        for match in pattern.finditer(text):
            item = match.group().strip()
            if item and item not in seen:
                seen.add(item)
                found.append(item)
    logger.debug(f"Detected {len(found)} table/figure reference(s).")
    return found


def chunk_document(
    text: str,
    chunk_size: int = 500,
    overlap: int = 50,
) -> List[TextChunk]:
    """
    Split a document into overlapping chunks suitable for embedding.

    The algorithm:
    1. Prefer splitting at paragraph boundaries (double newline).
    2. If a paragraph exceeds ``chunk_size``, split at sentence boundaries.
    3. Accumulate words/sentences until the chunk reaches ``chunk_size``
       characters, then start a new chunk with ``overlap`` characters of
       carry-over from the previous chunk.

    Args:
        text: The full (cleaned) document text.
        chunk_size: Target character length for each chunk.
        overlap: Number of characters to carry over into the next chunk.

    Returns:
        List of :class:`TextChunk` objects ordered by position in the document.
    """
    if not text.strip():
        return []

    # Split into sentences (rough heuristic – handles '.', '!', '?')
    sentence_re = re.compile(r"(?<=[.!?])\s+")

    # First split on paragraphs, then on sentences within paragraphs.
    paragraphs = re.split(r"\n\s*\n", text)
    sentences: List[str] = []
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        parts = sentence_re.split(para)
        sentences.extend(p.strip() for p in parts if p.strip())

    chunks: List[TextChunk] = []
    current_text = ""
    current_start = 0
    char_cursor = 0

    for sentence in sentences:
        candidate = (current_text + " " + sentence).strip() if current_text else sentence

        if len(candidate) <= chunk_size:
            current_text = candidate
        else:
            # Flush current chunk
            if current_text:
                end_char = current_start + len(current_text)
                chunks.append(
                    TextChunk(
                        chunk_id=f"chunk_{len(chunks):04d}",
                        text=current_text,
                        start_char=current_start,
                        end_char=end_char,
                    )
                )
                # Carry over the tail of the last chunk as overlap
                overlap_text = current_text[-overlap:] if len(current_text) > overlap else current_text
                current_text = (overlap_text + " " + sentence).strip()
                current_start = end_char - len(overlap_text)
            else:
                # Single sentence exceeds chunk_size – force-split by characters
                for i in range(0, len(sentence), chunk_size - overlap):
                    piece = sentence[i : i + chunk_size]
                    chunks.append(
                        TextChunk(
                            chunk_id=f"chunk_{len(chunks):04d}",
                            text=piece,
                            start_char=char_cursor + i,
                            end_char=char_cursor + i + len(piece),
                        )
                    )
                current_text = ""
                current_start = char_cursor + len(sentence)

        char_cursor += len(sentence) + 1  # +1 for the space separator

    # Flush the last chunk
    if current_text.strip():
        chunks.append(
            TextChunk(
                chunk_id=f"chunk_{len(chunks):04d}",
                text=current_text.strip(),
                start_char=current_start,
                end_char=current_start + len(current_text),
            )
        )

    logger.info(
        f"Chunked document into {len(chunks)} chunk(s) "
        f"(target size={chunk_size}, overlap={overlap})."
    )
    return chunks

"""
OCR Service for STS Clearance system
Extracts text from PDFs and images for searchability and indexing
"""

import io
import logging
from pathlib import Path
from typing import Optional

try:
    import pytesseract
    from pdf2image import convert_from_bytes
    from pypdf import PdfReader
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

logger = logging.getLogger(__name__)


class OCRService:
    """
    Service for extracting text from documents using OCR
    Supports PDFs and images
    """

    def __init__(self, enable_ocr: bool = True):
        """
        Initialize OCR service

        Args:
            enable_ocr: Whether to enable OCR features
        """
        self.enable_ocr = enable_ocr and PYTESSERACT_AVAILABLE
        if not PYTESSERACT_AVAILABLE:
            logger.warning("pytesseract not installed. OCR features disabled.")

    async def extract_text_from_file(
        self, file_content: bytes, file_type: str
    ) -> Optional[str]:
        """
        Extract text from file content

        Args:
            file_content: File bytes
            file_type: File extension (e.g., .pdf, .jpg, .png)

        Returns:
            Extracted text or None if extraction fails
        """
        if not self.enable_ocr:
            return None

        try:
            file_type = file_type.lower()

            if file_type == ".pdf":
                return await self._extract_from_pdf(file_content)
            elif file_type in [".jpg", ".jpeg", ".png", ".gif", ".tiff"]:
                return await self._extract_from_image(file_content)
            else:
                return None

        except Exception as e:
            logger.error(f"Error extracting text from {file_type} file: {e}")
            return None

    async def _extract_from_pdf(self, file_content: bytes) -> Optional[str]:
        """
        Extract text from PDF using PyPDF (first try) + OCR (fallback)

        Args:
            file_content: PDF file bytes

        Returns:
            Extracted text or None
        """
        try:
            # First try: Use PyPDF for text extraction (fast, no OCR needed)
            pdf_reader = PdfReader(io.BytesIO(file_content))
            text = ""

            for page in pdf_reader.pages:
                text += page.extract_text()

            if text.strip():
                logger.info(f"Extracted {len(text)} characters from PDF using PyPDF")
                return text

            # Fallback: Use OCR on PDF images
            logger.info("No text found in PDF, attempting OCR...")
            return await self._ocr_pdf_images(file_content)

        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return None

    async def _ocr_pdf_images(self, file_content: bytes) -> Optional[str]:
        """
        Use OCR on PDF converted to images

        Args:
            file_content: PDF file bytes

        Returns:
            Extracted text or None
        """
        try:
            if not PYTESSERACT_AVAILABLE:
                return None

            # Convert PDF to images
            images = convert_from_bytes(file_content)
            text = ""

            for i, image in enumerate(images):
                logger.info(f"Processing page {i + 1}/{len(images)} with OCR...")
                page_text = pytesseract.image_to_string(image)
                text += page_text + "\n"

            if text.strip():
                logger.info(
                    f"Extracted {len(text)} characters from PDF using OCR on {len(images)} pages"
                )
                return text

            return None

        except Exception as e:
            logger.error(f"Error performing OCR on PDF: {e}")
            return None

    async def _extract_from_image(self, file_content: bytes) -> Optional[str]:
        """
        Extract text from image using OCR

        Args:
            file_content: Image file bytes

        Returns:
            Extracted text or None
        """
        try:
            if not PYTESSERACT_AVAILABLE:
                return None

            from PIL import Image

            # Load image
            image = Image.open(io.BytesIO(file_content))

            # Extract text
            text = pytesseract.image_to_string(image)

            if text.strip():
                logger.info(f"Extracted {len(text)} characters from image using OCR")
                return text

            return None

        except Exception as e:
            logger.error(f"Error extracting text from image: {e}")
            return None

    async def extract_and_index(
        self, file_content: bytes, file_type: str, document_id: str, session
    ) -> bool:
        """
        Extract text from file and store in document searchable text field

        Args:
            file_content: File bytes
            file_type: File extension
            document_id: Document ID to associate text with
            session: AsyncSession for database

        Returns:
            True if successful, False otherwise
        """
        try:
            text = await self.extract_text_from_file(file_content, file_type)

            if text:
                from app.models import Document
                from sqlalchemy import select, update

                # Update document with extracted text
                result = await session.execute(
                    update(Document)
                    .where(Document.id == document_id)
                    .values(searchable_text=text)
                )
                await session.commit()

                logger.info(f"Indexed {len(text)} characters for document {document_id}")
                return True

            return False

        except Exception as e:
            logger.error(f"Error indexing document text: {e}")
            return False

    def get_text_summary(self, text: str, max_length: int = 200) -> str:
        """
        Generate a summary of extracted text

        Args:
            text: Full extracted text
            max_length: Maximum summary length

        Returns:
            Text summary
        """
        if not text:
            return ""

        # Remove extra whitespace
        cleaned = " ".join(text.split())

        # Truncate to max length
        if len(cleaned) > max_length:
            return cleaned[:max_length] + "..."

        return cleaned


# Global OCR service instance
ocr_service = OCRService(enable_ocr=True)
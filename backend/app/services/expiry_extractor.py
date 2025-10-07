"""
Expiry extraction micro-service for STS clearance documents
Uses regex patterns to detect common date formats in PDFs
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class ExpiryExtractor:
    """Extracts expiry dates from document content using regex patterns"""

    # Common date patterns found in maritime documents
    DATE_PATTERNS = [
        # DD MMM YYYY (e.g., "15 Aug 2025", "15 AUG 2025")
        r"\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})\b",
        # YYYY-MM-DD (e.g., "2025-08-15")
        r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b",
        # DD/MM/YYYY (e.g., "15/08/2025")
        r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b",
        # MM/DD/YYYY (e.g., "08/15/2025")
        r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b",
        # DD-MM-YYYY (e.g., "15-08-2025")
        r"\b(\d{1,2})-(\d{1,2})-(\d{4})\b",
        # YYYY/MM/DD (e.g., "2025/08/15")
        r"\b(\d{4})/(\d{1,2})/(\d{1,2})\b",
    ]

    # Keywords that suggest expiry dates
    EXPIRY_KEYWORDS = [
        "expires",
        "expiry",
        "expiration",
        "valid until",
        "valid until:",
        "validity",
        "expires on",
        "expires:",
        "expiry date",
        "expiration date",
        "valid from",
        "issue date",
        "issued on",
        "renewal date",
        "next renewal",
    ]

    def __init__(self):
        self.compiled_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in self.DATE_PATTERNS
        ]

    def extract_expiry_date(self, content: str) -> Tuple[Optional[datetime], float]:
        """
        Extract expiry date from document content

        Args:
            content: Text content from PDF or document

        Returns:
            Tuple of (extracted_date, confidence_score)
        """
        if not content:
            return None, 0.0

        # Convert to lowercase for keyword matching
        content_lower = content.lower()

        # Look for dates near expiry keywords (higher confidence)
        high_confidence_dates = self._find_dates_near_keywords(content_lower)
        if high_confidence_dates:
            return high_confidence_dates[0], 0.9

        # Look for any dates in the content (lower confidence)
        all_dates = self._extract_all_dates(content)
        if all_dates:
            # Return the most recent date as potential expiry
            most_recent = max(all_dates)
            return most_recent, 0.6

        return None, 0.0

    def _find_dates_near_keywords(self, content: str) -> list:
        """Find dates that appear near expiry-related keywords"""
        dates = []

        for keyword in self.EXPIRY_KEYWORDS:
            keyword_pos = content.find(keyword)
            if keyword_pos == -1:
                continue

            # Look for dates within 100 characters of the keyword
            start_pos = max(0, keyword_pos - 100)
            end_pos = min(len(content), keyword_pos + 100)
            context = content[start_pos:end_pos]

            context_dates = self._extract_all_dates(context)
            dates.extend(context_dates)

        return dates

    def _extract_all_dates(self, content: str) -> list:
        """Extract all dates from content using regex patterns"""
        dates = []

        for pattern in self.compiled_patterns:
            matches = pattern.finditer(content)
            for match in matches:
                try:
                    if len(match.groups()) == 3:
                        date_obj = self._parse_date_match(match)
                        if date_obj:
                            dates.append(date_obj)
                except Exception as e:
                    logger.debug(
                        f"Failed to parse date match: {match.group()}, error: {e}"
                    )
                    continue

        return dates

    def _parse_date_match(self, match) -> Optional[datetime]:
        """Parse a regex match into a datetime object"""
        try:
            groups = match.groups()

            if len(groups) == 3:
                # Handle DD MMM YYYY format
                if groups[1].upper() in [
                    "JAN",
                    "FEB",
                    "MAR",
                    "APR",
                    "MAY",
                    "JUN",
                    "JUL",
                    "AUG",
                    "SEP",
                    "OCT",
                    "NOV",
                    "DEC",
                ]:
                    day = int(groups[0])
                    month = self._month_to_number(groups[1])
                    year = int(groups[2])

                    if month and 1 <= day <= 31 and 1900 <= year <= 2100:
                        return datetime(year, month, day)

                # Handle YYYY-MM-DD format
                elif len(groups[0]) == 4:  # First group is year
                    year = int(groups[0])
                    month = int(groups[1])
                    day = int(groups[2])

                    if 1 <= month <= 12 and 1 <= day <= 31 and 1900 <= year <= 2100:
                        return datetime(year, month, day)

                # Handle DD/MM/YYYY or MM/DD/YYYY (ambiguous, assume DD/MM/YYYY)
                else:
                    day = int(groups[0])
                    month = int(groups[1])
                    year = int(groups[2])

                    if 1 <= month <= 12 and 1 <= day <= 31 and 1900 <= year <= 2100:
                        return datetime(year, month, day)

        except (ValueError, TypeError) as e:
            logger.debug(f"Date parsing error: {e}")
            return None

        return None

    def _month_to_number(self, month_str: str) -> Optional[int]:
        """Convert month abbreviation to number"""
        month_map = {
            "jan": 1,
            "feb": 2,
            "mar": 3,
            "apr": 4,
            "may": 5,
            "jun": 6,
            "jul": 7,
            "aug": 8,
            "sep": 9,
            "oct": 10,
            "nov": 11,
            "dec": 12,
        }
        return month_map.get(month_str.lower())

    def validate_manual_date(self, date_str: str) -> Optional[datetime]:
        """
        Validate manually entered expiry date

        Args:
            date_str: Date string from user input

        Returns:
            Parsed datetime or None if invalid
        """
        try:
            # Try common formats
            for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"]:
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue

            return None
        except Exception:
            return None


# Global instance
expiry_extractor = ExpiryExtractor()

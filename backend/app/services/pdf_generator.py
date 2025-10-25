"""
PDF Generator service for STS Clearance system
Generates professional PDFs for room snapshots with ReportLab
"""

import io
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
    KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

logger = logging.getLogger(__name__)


class PDFGenerator:
    """
    Professional PDF Generator for room snapshots using ReportLab
    """

    def __init__(self, page_size=A4):
        self.page_size = page_size
        self.margin = 0.5 * inch
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the PDF"""
        # Title style
        self.styles.add(
            ParagraphStyle(
                name="CustomTitle",
                parent=self.styles["Heading1"],
                fontSize=24,
                textColor=colors.HexColor("#003d82"),
                spaceAfter=30,
                alignment=TA_CENTER,
                fontName="Helvetica-Bold",
            )
        )

        # Heading style
        self.styles.add(
            ParagraphStyle(
                name="CustomHeading",
                parent=self.styles["Heading2"],
                fontSize=14,
                textColor=colors.HexColor("#003d82"),
                spaceAfter=12,
                spaceBefore=12,
                fontName="Helvetica-Bold",
            )
        )

        # Body style
        self.styles.add(
            ParagraphStyle(
                name="CustomBody",
                parent=self.styles["BodyText"],
                fontSize=10,
                spaceAfter=6,
                alignment=TA_LEFT,
            )
        )

        # Meta style (for dates, etc)
        self.styles.add(
            ParagraphStyle(
                name="Meta",
                parent=self.styles["Normal"],
                fontSize=9,
                textColor=colors.grey,
                alignment=TA_RIGHT,
            )
        )

    def generate_room_snapshot(
        self,
        room_data: Dict[str, Any],
        include_documents: bool = True,
        include_activity: bool = True,
        include_approvals: bool = True,
    ) -> bytes:
        """
        Generate a professional PDF snapshot of room status

        Args:
            room_data: Dictionary containing room information
            include_documents: Include documents section
            include_activity: Include activity log section
            include_approvals: Include approvals section

        Returns:
            PDF content as bytes
        """
        try:
            pdf_buffer = io.BytesIO()
            doc = SimpleDocTemplate(
                pdf_buffer,
                pagesize=self.page_size,
                rightMargin=self.margin,
                leftMargin=self.margin,
                topMargin=self.margin,
                bottomMargin=self.margin,
            )

            # Build story (content elements)
            story = []

            # Title page
            story.extend(self._build_title_section(room_data))

            # Room information
            story.extend(self._build_room_info_section(room_data))

            # Parties information
            story.extend(self._build_parties_section(room_data))

            # Vessels information
            if room_data.get("vessels"):
                story.extend(self._build_vessels_section(room_data))

            # Documents section
            if include_documents and room_data.get("documents"):
                story.append(PageBreak())
                story.extend(self._build_documents_section(room_data))

            # Approvals section
            if include_approvals and room_data.get("approvals"):
                story.extend(self._build_approvals_section(room_data))

            # Activity log section
            if include_activity and room_data.get("activities"):
                story.extend(self._build_activity_section(room_data))

            # Footer with metadata
            story.extend(self._build_footer_section(room_data))

            # Generate PDF
            doc.build(story)
            pdf_content = pdf_buffer.getvalue()
            pdf_buffer.close()

            logger.info(
                f"Generated PDF snapshot for room {room_data.get('id')} - "
                f"Size: {len(pdf_content)} bytes"
            )

            return pdf_content

        except Exception as e:
            logger.error(f"Error generating PDF snapshot: {e}", exc_info=True)
            raise

    def _build_title_section(self, room_data: Dict[str, Any]) -> List:
        """Build title and header section"""
        elements = []

        # Company/System header
        elements.append(
            Paragraph(
                "STS CLEARANCE SYSTEM",
                self.styles["CustomTitle"],
            )
        )

        # Room title
        room_title = room_data.get("title", "Unnamed Room")
        elements.append(
            Paragraph(
                f"<b>{room_title}</b>",
                self.styles["CustomHeading"],
            )
        )

        # Generation metadata
        generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        generated_by = room_data.get("generated_by", "System")
        elements.append(
            Paragraph(
                f"<i>Snapshot generated: {generated_at} by {generated_by}</i>",
                self.styles["Meta"],
            )
        )

        elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _build_room_info_section(self, room_data: Dict[str, Any]) -> List:
        """Build room information section"""
        elements = []

        elements.append(Paragraph("Room Information", self.styles["CustomHeading"]))

        # Room details table
        room_details = [
            ["Field", "Value"],
            ["Location", room_data.get("location", "N/A")],
            ["Status", room_data.get("status", "Active").upper()],
            ["STS ETA", str(room_data.get("sts_eta", "N/A"))],
            ["Created", str(room_data.get("created_at", "N/A"))],
            ["Created By", room_data.get("created_by", "N/A")],
        ]

        # Add description if available
        if room_data.get("description"):
            room_details.append(["Description", room_data.get("description")])

        table = Table(room_details, colWidths=[1.5 * inch, 4.5 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003d82")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 11),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                    ("FONTSIZE", (0, 1), (-1, -1), 10),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )

        elements.append(table)
        elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _build_parties_section(self, room_data: Dict[str, Any]) -> List:
        """Build parties/participants section"""
        elements = []

        elements.append(Paragraph("Parties & Participants", self.styles["CustomHeading"]))

        parties = room_data.get("parties", [])

        if not parties:
            elements.append(Paragraph("No parties assigned", self.styles["CustomBody"]))
            elements.append(Spacer(1, 0.2 * inch))
            return elements

        # Parties table
        party_data = [["Name", "Role", "Email", "Company"]]

        for party in parties:
            party_data.append(
                [
                    party.get("name", "N/A"),
                    party.get("role", "N/A").upper(),
                    party.get("email", "N/A"),
                    party.get("company", "N/A"),
                ]
            )

        table = Table(party_data, colWidths=[1.2 * inch, 1 * inch, 1.8 * inch, 1.5 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003d82")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )

        elements.append(table)
        elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _build_vessels_section(self, room_data: Dict[str, Any]) -> List:
        """Build vessels information section"""
        elements = []

        elements.append(Paragraph("Vessels Information", self.styles["CustomHeading"]))

        vessels = room_data.get("vessels", [])

        if not vessels:
            elements.append(Paragraph("No vessels assigned", self.styles["CustomBody"]))
            elements.append(Spacer(1, 0.2 * inch))
            return elements

        # Vessels table
        vessel_data = [
            ["Vessel Name", "Type", "Flag", "IMO", "Status", "Tonnage"]
        ]

        for vessel in vessels:
            vessel_data.append(
                [
                    vessel.get("name", "N/A"),
                    vessel.get("vessel_type", "N/A"),
                    vessel.get("flag", "N/A"),
                    vessel.get("imo", "N/A"),
                    vessel.get("status", "Active").upper(),
                    str(vessel.get("gross_tonnage", "N/A")),
                ]
            )

        table = Table(vessel_data, colWidths=[1.5 * inch, 0.9 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003d82")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )

        elements.append(table)
        elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _build_documents_section(self, room_data: Dict[str, Any]) -> List:
        """Build documents section with status indicators"""
        elements = []

        elements.append(Paragraph("Documents Status", self.styles["CustomHeading"]))

        documents = room_data.get("documents", [])

        if not documents:
            elements.append(Paragraph("No documents assigned", self.styles["CustomBody"]))
            elements.append(Spacer(1, 0.2 * inch))
            return elements

        # Documents table
        doc_data = [["Document Type", "Status", "Uploaded By", "Expires On", "Notes"]]

        for doc in documents:
            doc_data.append(
                [
                    doc.get("type_name", "N/A"),
                    doc.get("status", "missing").upper(),
                    doc.get("uploaded_by", "—"),
                    str(doc.get("expires_on", "—")),
                    doc.get("notes", "")[:50] + ("..." if len(doc.get("notes", "")) > 50 else ""),
                ]
            )

        table = Table(doc_data, colWidths=[1.5 * inch, 1 * inch, 1.2 * inch, 1.2 * inch, 1 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003d82")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )

        elements.append(table)
        elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _build_approvals_section(self, room_data: Dict[str, Any]) -> List:
        """Build approvals section"""
        elements = []

        elements.append(Paragraph("Approvals Status", self.styles["CustomHeading"]))

        approvals = room_data.get("approvals", [])

        if not approvals:
            elements.append(Paragraph("No approvals required", self.styles["CustomBody"]))
            elements.append(Spacer(1, 0.2 * inch))
            return elements

        # Approvals table
        approval_data = [["Party", "Role", "Status", "Updated"]]

        for approval in approvals:
            approval_data.append(
                [
                    approval.get("party_name", "N/A"),
                    approval.get("party_role", "N/A").upper(),
                    approval.get("status", "pending").upper(),
                    str(approval.get("updated_at", "N/A")),
                ]
            )

        table = Table(approval_data, colWidths=[1.5 * inch, 1.2 * inch, 1.2 * inch, 1.5 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003d82")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )

        elements.append(table)
        elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _build_activity_section(self, room_data: Dict[str, Any]) -> List:
        """Build activity log section"""
        elements = []

        elements.append(Paragraph("Recent Activity", self.styles["CustomHeading"]))

        activities = room_data.get("activities", [])

        if not activities:
            elements.append(Paragraph("No activities recorded", self.styles["CustomBody"]))
            elements.append(Spacer(1, 0.2 * inch))
            return elements

        # Activity table (limited to last 20)
        activity_data = [["Timestamp", "Actor", "Action", "Details"]]

        for activity in activities[:20]:
            activity_data.append(
                [
                    str(activity.get("ts", "N/A"))[:16],  # Truncate timestamp
                    activity.get("actor", "N/A"),
                    activity.get("action", "N/A").replace("_", " ").upper(),
                    activity.get("meta_json", "")[:50] + ("..." if len(activity.get("meta_json", "")) > 50 else ""),
                ]
            )

        table = Table(activity_data, colWidths=[1.2 * inch, 1.2 * inch, 1.2 * inch, 2 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003d82")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                    ("FONTSIZE", (0, 1), (-1, -1), 7),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )

        elements.append(table)
        elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _build_footer_section(self, room_data: Dict[str, Any]) -> List:
        """Build footer section with metadata"""
        elements = []

        elements.append(Spacer(1, 0.3 * inch))
        elements.append(
            Paragraph(
                "—" * 80,
                self.styles["Normal"],
            )
        )

        footer_text = (
            "This document is an automated snapshot of the STS Clearance System. "
            "It contains confidential information and should be handled accordingly. "
            f"Snapshot ID: {room_data.get('snapshot_id', 'N/A')}"
        )

        elements.append(
            Paragraph(
                footer_text,
                self.styles["Meta"],
            )
        )

        return elements


# Global PDF generator instance
pdf_generator = PDFGenerator()
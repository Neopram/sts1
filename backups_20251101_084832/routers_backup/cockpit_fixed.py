@router.post("/rooms/{room_id}/documents/upload")
async def upload_document(
    room_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    notes: Optional[str] = Form(None),
    expires_on: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Upload a new document to a room
    """
    try:
        user_email = current_user.email

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Validate file type
        if not file.filename or not file.content_type:
            raise HTTPException(status_code=400, detail="Invalid file")

        # Get document type
        doc_type_result = await session.execute(
            select(DocumentType).where(DocumentType.code == document_type)
        )
        doc_type = doc_type_result.scalar_one_or_none()

        if not doc_type:
            raise HTTPException(status_code=400, detail="Invalid document type")

        # Parse expiry date if provided
        expiry_date = None
        if expires_on:
            try:
                expiry_date = datetime.fromisoformat(expires_on.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(
                    status_code=400, detail="Invalid expiry date format"
                )

        # Store file
        file_url = await storage_service.store_file(file, room_id)

        # Create document record
        document = Document(
            room_id=room_id,
            type_id=doc_type.id,
            status="under_review",
            expires_on=expiry_date,
            uploaded_by=user_email,
            uploaded_at=datetime.utcnow(),
            notes=notes,
        )

        session.add(document)
        await session.flush()  # Get the document ID

        # Create document version
        version = DocumentVersion(
            document_id=document.id,
            file_url=file_url,
            sha256=await storage_service.calculate_sha256(file),
            size_bytes=file.size,
            mime=file.content_type,
        )

        session.add(version)
        await session.commit()

        # Log activity
        await log_activity(
            room_id,
            user_email,
            "document_uploaded",
            {"document_type": document_type, "filename": file.filename},
        )

        return {
            "message": "Document uploaded successfully",
            "document_id": str(document.id),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        await session.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

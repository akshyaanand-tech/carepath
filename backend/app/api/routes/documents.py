import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.core.security import get_current_patient, get_supabase_admin
from app.services.storage_service import storage_service
from app.services.openai_service import openai_service
from app.repositories.clinical_records import clinical_records_repo
from app.schemas.extraction import ProcessDocumentResponse, MedicalDocumentExtraction

logger = logging.getLogger("carepath.routes.documents")

router = APIRouter(prefix="/api/documents", tags=["Medical Documents"])


@router.post("/{document_id}/process", response_model=ProcessDocumentResponse)
async def process_document(
    document_id: str,
    patient: Dict[str, Any] = Depends(get_current_patient),
):
    """
    Triggers multimodal AI document understanding and structured entity extraction for an uploaded document.
    Enforces deterministic authentication, patient profile ownership, and atomic state transitions.
    """
    admin_client = get_supabase_admin()
    patient_id = patient["id"]
    logger.info(f"Process request received for document {document_id} by patient {patient_id}")

    # 1. Fetch document and verify patient ownership
    doc_res = (
        admin_client.from_("documents")
        .select("*")
        .eq("id", document_id)
        .eq("patient_id", patient_id)
        .maybe_single()
        .execute()
    )

    document = doc_res.data
    if not document:
        # Do not leak whether another patient's document exists
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access unauthorized.",
        )

    # 2. Prevent duplicate simultaneous processing
    if document.get("processing_status") == "processing":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This document is currently being processed. Please wait for completion.",
        )

    # 3. Transition document to 'processing' state
    admin_client.from_("documents").update({"processing_status": "processing"}).eq("id", document_id).execute()

    try:
        # 4. Securely download document binary from private Supabase Storage
        file_bytes = storage_service.download_document(
            client=admin_client,
            storage_path=document["storage_path"],
        )

        # 5. Execute multimodal AI extraction with OpenAI Structured Outputs
        extraction: MedicalDocumentExtraction = openai_service.extract_from_document(
            file_bytes=file_bytes,
            file_name=document["file_name"],
            file_type=document["file_type"],
            document_id=document_id,
            document_type=document.get("document_type", "general"),
        )

        # 6. Persist structured clinical records to database
        clinical_records_repo.persist_extraction(
            client=admin_client,
            patient_id=patient_id,
            document_id=document_id,
            extraction=extraction,
        )

        # 7. Transition document to 'completed' state
        admin_client.from_("documents").update({"processing_status": "completed"}).eq("id", document_id).execute()

        return ProcessDocumentResponse(
            document_id=document_id,
            patient_id=patient_id,
            processing_status="completed",
            message="Document successfully processed and structured clinical records persisted.",
            extraction=extraction,
        )

    except Exception as e:
        logger.error(f"Processing failed for document {document_id}: {str(e)}")
        # Fail gracefully and update processing_status = 'failed'
        try:
            admin_client.from_("documents").update({"processing_status": "failed"}).eq("id", document_id).execute()
        except Exception as update_err:
            logger.error(f"Failed to reset document status to failed: {str(update_err)}")

        # Return a clean sanitized error to the client without exposing credentials or stack traces
        error_msg = str(e)
        if "API key" in error_msg or "OpenAI" in error_msg:
            detail = "AI extraction service encountered an error while analyzing document. Please verify OpenAI API configuration."
        else:
            detail = f"Failed to process medical document: {error_msg}"

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
        )


@router.get("/{document_id}/extraction")
async def get_document_extraction(
    document_id: str,
    patient: Dict[str, Any] = Depends(get_current_patient),
):
    """
    Retrieves the structured extraction and clinical records for an analyzed document.
    """
    admin_client = get_supabase_admin()
    patient_id = patient["id"]

    # Verify document ownership
    doc_res = (
        admin_client.from_("documents")
        .select("id, patient_id, file_name, file_type, processing_status, uploaded_at")
        .eq("id", document_id)
        .eq("patient_id", patient_id)
        .maybe_single()
        .execute()
    )

    if not doc_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access unauthorized.",
        )

    extraction_record = clinical_records_repo.get_extraction(
        client=admin_client,
        document_id=document_id,
        patient_id=patient_id,
    )

    if not extraction_record:
        return {
            "document_id": document_id,
            "processing_status": doc_res.data.get("processing_status"),
            "extracted": False,
            "extraction": None,
        }

    return {
        "document_id": document_id,
        "processing_status": doc_res.data.get("processing_status"),
        "extracted": True,
        "extraction": extraction_record.get("raw_extraction"),
        "created_at": extraction_record.get("created_at"),
    }

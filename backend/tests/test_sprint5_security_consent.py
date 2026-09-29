import sys
import os
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from app.services.consent_service import consent_service
from app.services.family_service import family_service
from app.schemas.consent import CreateConsentRequest


class TestSprint5SecurityAndConsent(unittest.TestCase):
    """
    Automated security and authorization tests for Sprint 5:
    Family permissions, Temporary QR Doctor Consent, Expiration, Revocation, and Scope filtering.
    """

    def setUp(self):
        self.mock_client = MagicMock()
        self.patient_a_id = "patient-uuid-1111"
        self.patient_b_id = "patient-uuid-2222"
        self.user_a_id = "user-auth-1111"
        self.user_b_id = "user-auth-2222"

    def test_family_permission_own_data_allowed(self):
        """TEST 1: Patient A accessing own data is ALLOWED."""
        is_allowed = family_service.verify_family_view_permission(
            client=self.mock_client,
            requester_user_id=self.user_a_id,
            requester_patient_id=self.patient_a_id,
            target_patient_id=self.patient_a_id,
        )
        self.assertTrue(is_allowed)

    def test_family_permission_unauthorized_member_denied(self):
        """TEST 2 & 11: Patient A tries to access Patient B's records without permission -> DENIED."""
        # Mock membership query returning no active permission
        mock_res = MagicMock()
        mock_res.data = []
        self.mock_client.from_().select().eq().eq().eq().execute.return_value = mock_res

        is_allowed = family_service.verify_family_view_permission(
            client=self.mock_client,
            requester_user_id=self.user_a_id,
            requester_patient_id=self.patient_a_id,
            target_patient_id=self.patient_b_id,
        )
        self.assertFalse(is_allowed)

    def test_family_permission_authorized_member_allowed(self):
        """Patient A tries to access Patient B's records with valid can_view_records=True -> ALLOWED."""
        # 1. Target patient has can_view_records=True in family_group-123
        mock_target = MagicMock()
        mock_target.data = [{"id": "mem-1", "family_group_id": "family-grp-123", "can_view_records": True, "access_status": "active"}]

        # 2. Requester also belongs to family-grp-123
        mock_requester = MagicMock()
        mock_requester.data = [{"id": "mem-2"}]

        self.mock_client.from_().select().eq().eq().eq().execute.return_value = mock_target
        self.mock_client.from_().select().in_().eq().eq().execute.return_value = mock_requester

        is_allowed = family_service.verify_family_view_permission(
            client=self.mock_client,
            requester_user_id=self.user_a_id,
            requester_patient_id=self.patient_a_id,
            target_patient_id=self.patient_b_id,
        )
        self.assertTrue(is_allowed)

    def test_doctor_access_valid_active_token(self):
        """TEST 3: Doctor uses valid active QR token -> ALLOWED within granted scope."""
        valid_token = "valid_opaque_token_32chars_long"
        future_exp = (datetime.now(timezone.utc) + timedelta(minutes=45)).isoformat()

        session_record = {
            "id": "session-1",
            "patient_id": self.patient_a_id,
            "recipient_name": "Dr. Sarah Jenkins",
            "access_token": valid_token,
            "scope": ["medications", "investigations"],  # NOT diagnoses or documents
            "expires_at": future_exp,
            "status": "active",
            "revoked_at": None,
            "patients": {"full_name": "Akshya Anand", "date_of_birth": "1995-05-12"},
        }

        mock_query = MagicMock()
        mock_query.data = session_record
        self.mock_client.from_().select().eq().maybe_single().execute.return_value = mock_query

        # Mock clinical queries
        self.mock_client.from_().select().eq().order().execute.return_value = MagicMock(data=[{"name": "Metformin", "dose": "500 mg"}])

        response = consent_service.validate_doctor_access(
            client=self.mock_client,
            token=valid_token,
        )

        self.assertTrue(response.is_active)
        self.assertEqual(response.patient_name, "Akshya Anand")
        self.assertIn("medications", response.scope)
        self.assertIsNotNone(response.medications)
        # TEST 4: Unconsented scopes are NOT returned (strictly None)
        self.assertIsNone(response.diagnoses)
        self.assertIsNone(response.documents)

    def test_doctor_access_expired_token(self):
        """TEST 5: Doctor uses expired QR token -> DENIED (403 Expired)."""
        expired_token = "expired_token_abc"
        past_exp = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()

        session_record = {
            "id": "session-expired",
            "patient_id": self.patient_a_id,
            "recipient_name": "Dr. Smith",
            "access_token": expired_token,
            "scope": ["timeline"],
            "expires_at": past_exp,
            "status": "active",
            "revoked_at": None,
            "patients": {"full_name": "Test Patient"},
        }

        mock_query = MagicMock()
        mock_query.data = session_record
        self.mock_client.from_().select().eq().maybe_single().execute.return_value = mock_query

        with self.assertRaises(HTTPException) as ctx:
            consent_service.validate_doctor_access(
                client=self.mock_client,
                token=expired_token,
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("expired", ctx.exception.detail.lower())

    def test_doctor_access_revoked_token(self):
        """TEST 6: Doctor uses revoked QR token -> DENIED (403 Revoked)."""
        revoked_token = "revoked_token_xyz"
        future_exp = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()

        session_record = {
            "id": "session-revoked",
            "patient_id": self.patient_a_id,
            "recipient_name": "Dr. Smith",
            "access_token": revoked_token,
            "scope": ["timeline"],
            "expires_at": future_exp,
            "status": "revoked",
            "revoked_at": datetime.now(timezone.utc).isoformat(),
            "patients": {"full_name": "Test Patient"},
        }

        mock_query = MagicMock()
        mock_query.data = session_record
        self.mock_client.from_().select().eq().maybe_single().execute.return_value = mock_query

        with self.assertRaises(HTTPException) as ctx:
            consent_service.validate_doctor_access(
                client=self.mock_client,
                token=revoked_token,
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("revoked", ctx.exception.detail.lower())

    def test_doctor_access_invalid_or_tampered_token(self):
        """TEST 7 & 8: Invalid or tampered token -> DENIED (404/403)."""
        mock_query = MagicMock()
        mock_query.data = None
        self.mock_client.from_().select().eq().maybe_single().execute.return_value = mock_query

        with self.assertRaises(HTTPException) as ctx:
            consent_service.validate_doctor_access(
                client=self.mock_client,
                token="tampered_fake_token_random",
            )
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("invalid or unknown", ctx.exception.detail.lower())


if __name__ == "__main__":
    unittest.main()

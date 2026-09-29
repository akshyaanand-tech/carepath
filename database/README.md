# Database & Row Level Security (Supabase / PostgreSQL)

CarePath's database layer uses Supabase PostgreSQL with strict Row Level Security (RLS) and cryptographic tenant isolation.

---

## Migration Scripts

### 1. `01_patients.sql` (Sprint 1: Foundation & Identity)
- Initializes foundational `public.patients` table.
- Enforces cryptographic reference to `auth.users(id) ON DELETE CASCADE`.
- RLS policies ensuring patients can view, insert, and update only their own profile (`auth.uid() = user_id`).

### 2. `02_documents.sql` (Sprint 2: Document Vault & Storage)
- Initializes `public.documents` table with processing status constraints (`pending`, `processing`, `completed`, `failed`).
- Enforces foreign key `patient_id` linked to `public.patients(id)`.
- Configures private Supabase Storage bucket `medical-documents` (`public = false`).
- Storage object RLS isolating files to folder path `{patient_id}/*`.

### 3. `03_clinical_records.sql` (Sprint 3: AI Clinical Extraction)
- Initializes normalized relational clinical entities:
  - `public.diagnoses` (name, status, date, source_page, source_text, confidence_note)
  - `public.medications` (name, dose, route, frequency, duration, instructions, start_date, end_date, source_page, source_text, confidence_note)
  - `public.investigations` (name, date, result, unit, reference_range, abnormal_flag, source_page, source_text, confidence_note)
  - `public.procedures` (name, date, details, source_page, source_text, confidence_note)
  - `public.allergies` (substance, reaction, severity, source_page, source_text, confidence_note)
  - `public.follow_ups` (description, confirmed_date, relative_time, source_page, source_text, confidence_note)
  - `public.document_extractions` (document_id, document_type, provider_name, raw_extraction JSONB)
- Strict Row Level Security on all clinical tables isolating access by `patient_id` matching authenticated `auth.uid()`.

---

## How to Apply Migrations

1. Open your **Supabase Project Dashboard** (`https://supabase.com/dashboard/project/<your-ref>`).
2. Navigate to **SQL Editor** &rarr; **New query**.
3. Copy and run the SQL migration scripts in order:
   - `database/migrations/01_patients.sql`
   - `database/migrations/02_documents.sql`
   - `database/migrations/03_clinical_records.sql`

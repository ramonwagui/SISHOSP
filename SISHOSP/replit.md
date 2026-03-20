# Overview

This project is a hospital appointment booking system designed for Exu Saúde - Sistema de Agendamento. It features a patient portal for booking and an administrative dashboard for managing appointments and hospital operations. The system automates scheduling with Google Calendar, sends email and WhatsApp notifications, and provides robust patient management tools. Its purpose is to streamline hospital workflows, improve patient engagement, and efficiently manage healthcare resources. The project has evolved to include comprehensive security, WhatsApp Business API integration for reminders, a rapid medical record system, patient triage, medical document sending, a walk-in queue management system with a public display panel, and automated Google Drive database backups.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Design System
The client is built with React 18, TypeScript, and Vite. It uses a component-based architecture with shadcn/ui components (built on Radix UI) and Tailwind CSS for styling. React Router (wouter) handles routing. The application features a modern healthcare-themed UI, responsive design, and Portuguese language support. A public display panel is implemented for the walk-in queue system, showing real-time patient calls with visual animations and auto-refresh.

## Backend Architecture
The server uses Express.js with TypeScript in an ESM module setup, following a layered architecture with clear separation of concerns. It includes comprehensive error handling and request logging. PostgreSQL with Drizzle ORM is used for type-safe database operations and schema evolution via drizzle-kit. Authentication is session-based with Replit Auth integration, providing secure login and protecting API routes. The system incorporates role-based access control (RBAC) with eight tiers (admin/staff/viewer/doctor/triage/farmacia/laboratorio) and comprehensive security hardening, including bcrypt password hashing, CSRF protection, audit logging, and advanced input validation for LGPD compliance.

## Technical Implementations
- **Appointment Management**: Full CRUD operations for appointments, Google Calendar integration with event ID saving and updating, professional email confirmations, and WhatsApp reminders (24h, today, 2h before).
- **Patient Management**: Brazilian data validation (CPF, SUS, WhatsApp), comprehensive security hardening, and LGPD compliance.
- **WhatsApp Business API**: Integration for automated and manual reminders, professional templates, rate limiting, error handling, and a verified production setup with delivery diagnosis.
- **WhatsApp Queue Notifications System**: Automated notification system using Meta Cloud API v23.0 with scheduled message processing. Features include:
  - Immediate queue entry confirmation with protocol number
  - Satisfaction survey for receptionist (10 minutes after queue entry)
  - Satisfaction survey for doctor (30 minutes after consultation completion)
  - Scheduler service processing messages every 60 seconds
  - Database tables: scheduled_messages (tracks pending/sent/error status) and satisfaction_surveys (tracks survey responses with whatsappMessageSent tracking)
  - Automatic retry and error handling with status tracking
  - **Status Normalization (Nov 2025)**: All status values standardized to English (pending, sent, error, cancelled, completed, expired) with centralized constants in shared/schema.ts. Duplicate message prevention implemented via whatsappMessageSent flag.
- **Quick Notes / Prontuário Rápido**: Optimized medical record creation for doctors with auto-save, keyboard shortcuts, and prescription templates.
- **Triage System**: Dedicated exclusive area for triage professionals with role-based access control. Patient severity assessment (Baixa, Média, Alta, Emergência) with vital signs tracking, clinical information capture, and real-time history. Triage users are automatically redirected to the triage module upon login.
- **Medical Documents Sending**: System for sending medical documents via WhatsApp notifications and email attachments (PDFs).
- **Walk-in Queue System**: Full API and frontend for managing walk-in patient queues. Features atomic number generation, concurrency protection, priority system based on triage, and multiple statuses. Includes receptionist, doctor, and public display interfaces.
- **Companion Registration**: Simple system for registering patient companions at queue entry. Optional fields include companion name, document (CPF/RG), relationship (Mãe, Pai, Filho, Cônjuge, Cuidador, etc.), and phone. Companion info is displayed in triage and doctor consultation screens.
- **Newborn Registration (RN)**: Specialized patient registration for newborns with toggle activation. Fields include: situação do RN (status), cor (skin color), gemelar (twin), peso ao nascer (birth weight), prematuro (premature), idade gestacional (gestational age), leite materno (breastfeeding), outra alimentação (other feeding), antibiótico (antibiotic given), transfusão (transfusion with date), data de referência, and observações. Pink-themed UI section in patient form with RN badge displayed in patient management table.
- **Call Panel**: Full-screen TV display system for waiting rooms, showing current and recent calls with visual animations and auto-refresh. Secured with a dedicated immutable user ID-based access control.
- **Radiology Module (/radiologia)**: Dedicated module for imaging exams only (X-ray, CT, MRI, Ultrasound, Mammography, Bone Densitometry). Features:
  - Server-side image upload using multer (resolves CORS issues)
  - Automatic medical document creation when images are added
  - Loading/error states in medical history display
  - Cache invalidation for immediate visibility of new images
  - Images stored in Google Cloud Storage and automatically added to patient medical history (type: radiology_images)
- **Laboratory Module (/laboratorio)**: Dedicated exclusive module for laboratory exams with role-based access control. Features:
  - Dedicated 'laboratorio' role with exclusive access (automatic redirect upon login)
  - requireLaboratorioOrAdmin middleware protects all laboratory routes
  - Lab exam types: Hemograma, Glicemia, Urina, Fezes, TSH/T4, Colesterol, Triglicerides, Creatinina, TGO/TGP, PSA, HbA1c, Beta-HCG, COVID-19
  - Exam request management with status tracking (pendente, em_andamento, concluido, cancelado)
  - Results entry with reference values and observations
  - PDF report generation for completed exams
  - Emerald-themed UI to distinguish from radiology module
- **Medical Specialties**: 16 specialties available including Cardiologia, Clínico Geral, Generalista, Medicina da Familia e Comunidade, Saude da Familia e Comunidade, Ultrassonografia, Nefrologista, Neuropediatra, and others.
- **Pharmacy Inventory Management**: Complete medication inventory management module with dedicated role-based access control:
  - Dedicated 'farmacia' role with exclusive access to pharmacy module (automatic redirect upon login)
  - requireFarmaciaOrAdmin middleware protects all pharmacy routes
  - Medications catalog with name, generic name, form, concentration, manufacturer, and stock thresholds
  - Batch-level inventory tracking with expiration dates and storage locations
  - Movement tracking (receipt, dispense, adjustment, loss) with full audit trail
  - Structured prescriptions linked to medical documents from quick-notes
  - Dispensing queue for pharmacy staff with automatic stock deduction
  - Low stock and expiring medication alerts displayed on admin home dashboard only
  - One-click medication import from built-in database (42 medications with example data)
  - Database tables: medications_catalog, inventory_batches, inventory_movements, prescriptions, prescription_items, dispensing_events
- **Hospitalization / Inpatient Management**: Complete hospitalization management module for tracking patient admissions, bed occupancy, and daily evolutions:
  - Ward and bed management with real-time occupancy tracking (UTI, Enfermaria, Pediatria, Maternidade, Cardiologia, etc.)
  - Patient admission workflow with diagnosis, CID code, severity classification, and estimated discharge date
  - Bed status tracking (available, occupied, maintenance, reserved) with automatic updates on admission/discharge
  - Daily medical evolutions with SOAP format (Subjective, Objective, Assessment, Plan) plus medications, procedures, and diet
  - Discharge management with discharge types (medical, requested, transfer, death) and summary
  - Role-based access control: doctors and admins can admit/discharge/evolve; read access for all authenticated users
  - Occupancy dashboard showing total/occupied/available beds with per-ward statistics
  - Database tables: hospital_wards, hospital_beds, hospitalizations, hospitalization_evolutions
  - Zod validation for all create/update operations ensuring data integrity
- **Procedure Request System (Dec 2025)**: Flexible system for doctors to request medications, materials, or both during patient care. Exclusive to Internação (hospitalization), Observação (observation), and Sala Vermelha (red room) contexts:
  - Dual request modes: Kit mode (pre-configured kits for specific clinical situations) and Custom mode (doctor selects individual items)
  - Polymorphic item support: Each procedure can include medications (from pharmacy catalog), materials (from almoxarifado), or both
  - Automatic fulfillment channel routing: Pharmacy queue (medications only), Materials queue (materials only), or Mixed queue (both)
  - Item-level tracking: Individual items can be completed separately, allowing partial fulfillment
  - Clinical context: Kits can be categorized by clinical situation (e.g., "Sutura Simples", "Acesso Venoso Central")
  - Database tables: procedure_kits (kit definitions with clinical context), procedure_kit_items (medications/materials in kit), procedure_request_items (tracks each item's status)
  - Context restriction: Procedure menu only visible in hospitalization, observation, and red room contexts (not outpatient/ambulatorial)
- **Unified Dispensing System (Dec 2025)**: Centralized dispensing queue that consolidates all dispensing operations into a single tab:
  - Unified API endpoint `/api/dispensing/queue` aggregates prescriptions and procedure requests
  - Filter by type: All, Prescriptions only, or Procedures only
  - Visual badges differentiate request types (Prescrição vs Procedimento) and origin (Prontuário, Internação, Observação, Sala Vermelha)
  - Item-level dispensing with individual completion and automatic parent request completion
  - FIFO stock deduction from materials_batches/inventory_batches when items are dispensed
  - Removed separate Procedures tab - all dispensing now unified under "Dispensação" tab
  - UnifiedDispensingQueue component replaces separate PrescriptionsQueue and ProceduresQueue views

# External Dependencies

## Google Services Integration
- Google Calendar API: Automatic appointment scheduling, event creation, management, and OAuth2 authentication.

## Email Services
- Nodemailer with Gmail: Automated email notifications, configurable HTML templates for confirmations and reminders.

## Database Services
- Neon Database: Serverless PostgreSQL for production data storage.
- Drizzle ORM: Type-safe database operations.

## Messaging Services
- WhatsApp Business API: For automated and manual patient reminders and medical document notifications.

## UI and Styling Libraries
- Radix UI & shadcn/ui: Accessible and customizable interface components.
- Tailwind CSS: Utility-first styling.
- Lucide React: Iconography.

## Development Tools
- Vite: Fast development and optimized builds.
- TypeScript: Type safety.
- ESBuild: Server-side bundling.
- PostCSS and Autoprefixer: CSS processing.

## Third-party Utilities
- date-fns: Brazilian locale date formatting.
- Class-variance-authority, CLSX, Tailwind-merge: Component styling and class handling.
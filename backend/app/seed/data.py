"""Static reference data for the demo clinic. Kept separate from run.py so the
"what" of the demo scenario is easy to review without reading the seeding
mechanics."""

from datetime import time

from app.models.enums import DepartmentKind, ProviderKind

DEPARTMENTS = [
    {"code": "GM", "name": "General Medicine", "kind": DepartmentKind.CLINIC},
    {"code": "OPH", "name": "Ophthalmology", "kind": DepartmentKind.CLINIC},
    {"code": "PED", "name": "Paediatrics", "kind": DepartmentKind.CLINIC},
    {"code": "RAD", "name": "Radiology", "kind": DepartmentKind.RADIOLOGY},
]

# service_key lets seed visits pick "the right kind of service" for a provider
# (e.g. only the X-Ray scanner gets X-Ray visits) without a formal
# provider<->service link table, which is out of scope for Module M1.
SERVICES = [
    {
        "key": "gm_consult",
        "department": "GM",
        "name": "General Consultation",
        "default_duration_min": 15,
        "prep_time_min": 0,
    },
    {
        "key": "gm_followup",
        "department": "GM",
        "name": "Follow-up Consultation",
        "default_duration_min": 10,
        "prep_time_min": 0,
    },
    {
        "key": "oph_consult",
        "department": "OPH",
        "name": "Eye Consultation",
        "default_duration_min": 20,
        "prep_time_min": 0,
    },
    {
        "key": "oph_pressure",
        "department": "OPH",
        "name": "Eye Pressure Test",
        "default_duration_min": 10,
        "prep_time_min": 5,
    },
    {
        "key": "ped_consult",
        "department": "PED",
        "name": "Paediatric Consultation",
        "default_duration_min": 15,
        "prep_time_min": 0,
    },
    {
        "key": "ped_vaccination",
        "department": "PED",
        "name": "Vaccination",
        "default_duration_min": 10,
        "prep_time_min": 5,
    },
    {
        "key": "rad_xray",
        "department": "RAD",
        "name": "X-Ray - Chest",
        "default_duration_min": 10,
        "prep_time_min": 5,
    },
    {
        "key": "rad_ultrasound",
        "department": "RAD",
        "name": "Ultrasound - Abdomen",
        "default_duration_min": 20,
        "prep_time_min": 10,
    },
    {
        "key": "rad_ct",
        "department": "RAD",
        "name": "CT - Head",
        "default_duration_min": 30,
        "prep_time_min": 15,
    },
]

PROVIDERS = [
    {
        "key": "gm_doc_1",
        "department": "GM",
        "name": "Dr. Ananya Iyer",
        "kind": ProviderKind.DOCTOR,
        "room_label": "GM-1",
        "default_service": "gm_consult",
    },
    {
        "key": "gm_doc_2",
        "department": "GM",
        "name": "Dr. Vikram Nair",
        "kind": ProviderKind.DOCTOR,
        "room_label": "GM-2",
        "default_service": "gm_consult",
    },
    {
        "key": "oph_doc_1",
        "department": "OPH",
        "name": "Dr. Meera Pillai",
        "kind": ProviderKind.DOCTOR,
        "room_label": "OPH-1",
        "default_service": "oph_consult",
    },
    {
        "key": "ped_doc_1",
        "department": "PED",
        "name": "Dr. Karthik Raman",
        "kind": ProviderKind.DOCTOR,
        "room_label": "PED-1",
        "default_service": "ped_consult",
    },
    {
        "key": "rad_xray_1",
        "department": "RAD",
        "name": "X-Ray Unit 1",
        "kind": ProviderKind.SCANNER,
        "room_label": "RAD-X1",
        "default_service": "rad_xray",
    },
    {
        "key": "rad_us_1",
        "department": "RAD",
        "name": "Ultrasound Unit 1",
        "kind": ProviderKind.SCANNER,
        "room_label": "RAD-U1",
        "default_service": "rad_ultrasound",
    },
    {
        "key": "rad_ct_1",
        "department": "RAD",
        "name": "CT Unit 1",
        "kind": ProviderKind.SCANNER,
        "room_label": "RAD-C1",
        "default_service": "rad_ct",
    },
]

# Clinic doctors: shorter slots, allow modest overbooking. Scanners: longer slots
# (service + prep time), tighter overbooking since a missed scanner slot is costly.
PROVIDER_SLOT_CONFIG = {
    ProviderKind.DOCTOR: {
        "shift_start": time(9, 0),
        "shift_end": time(17, 0),
        "slot_length_min": 15,
        "slot_capacity": 1,
        # 0, not 1: a slot must lock after its single booking — no overbooking
        # past capacity=1, so once taken it's unclickable for every other user.
        "overbook_limit": 0,
    },
    ProviderKind.SCANNER: {
        "shift_start": time(9, 0),
        "shift_end": time(17, 0),
        "slot_length_min": 30,
        "slot_capacity": 1,
        "overbook_limit": 0,
    },
}

PATIENT_FIRST_NAMES = [
    "Aarav",
    "Vivaan",
    "Aditya",
    "Vihaan",
    "Arjun",
    "Sai",
    "Reyansh",
    "Ayaan",
    "Krishna",
    "Ishaan",
    "Ananya",
    "Diya",
    "Saanvi",
    "Aadhya",
    "Kiara",
    "Myra",
    "Anika",
    "Navya",
    "Riya",
    "Pari",
]
PATIENT_LAST_NAMES = [
    "Sharma",
    "Iyer",
    "Nair",
    "Reddy",
    "Pillai",
    "Menon",
    "Rao",
    "Gupta",
    "Verma",
    "Kumar",
    "Patel",
    "Singh",
    "Das",
    "Bose",
    "Chatterjee",
    "Mukherjee",
    "Krishnan",
    "Subramanian",
    "Raman",
    "Pandey",
]

DEMO_PASSWORD = "MediQ@2026"  # hackathon-only, see demo/README.md

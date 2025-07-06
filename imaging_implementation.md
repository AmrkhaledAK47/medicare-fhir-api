**Integrating DICOM imaging and an AI brain‑tumour‑detection model into your Nest + MongoDB ↔ HAPI‑FHIR (PostgreSQL) stack requires four big building blocks: a DICOM store, an inference micro‑service, a FHIR mapping layer, and an orchestration workflow in NestJS.** Below is a **Cursor‑ready, phase‑by‑phase task brief** (no code) that tells the model exactly *what* to generate and *in which order* so that the dashboard can ingest DICOM, run AI, and persist results as FHIR resources.

---

## 0  Prerequisites & Landscape

* **Containers already running:**
  `nest‑gateway:3000`, `mongodb:27017`, `hapi‑fhir:8080`.
  **Add two more**:

  1. `orthanc-dicom:8042` (with DICOMweb plugin) ([hub.docker.com][1], [orthanc.uclouvain.be][2])
  2. `tumour‑ai:8500` – FastAPI or Roboflow endpoint for inference ([inference.roboflow.com][3], [github.com][4])

* **Env vars to define**
  `ORTHANC_URL, ORTHANC_USER, ORTHANC_PASS`
  `AI_ENDPOINT_URL, AI_API_KEY`
  `FHIR_BASE_URL` (already set)

---

## 1  Infrastructure Phase

1. **Docker compose**: connect all services on `imaging_net`; expose Orthanc port 8042 for REST/DICOMweb and 4242 for DICOM C‑STORE.
2. **GPU (optional)**: if running the GitHub CNN model, add runtime `nvidia`. ([github.com][4])
3. **Orthanc plugins**: enable *DICOMweb* so Nest can fetch pixel data over WADO‑RS instead of raw sockets. ([orthanc.uclouvain.be][2])

---

## 2  Module Layout in NestJS

| Module             | Purpose                                                          | Depends on             |
| ------------------ | ---------------------------------------------------------------- | ---------------------- |
| `ImagingModule`    | REST endpoints `/imaging/upload`, `/imaging/analyse/:studyUid`   | AuthModule, FhirModule |
| `DicomService`     | Wrap Orthanc API (QIDO‑RS, WADO‑RS, STOW‑RS)                     | AxiosModule            |
| `InferenceService` | Push pixel data → AI model; parse JSON boxes/scores              | none                   |
| `FhirMappingSvc`   | Create/patch ImagingStudy, Observation, DiagnosticReport, Binary | FhirModule             |
| `WebhookModule`    | Receives Orthanc `NewStudy` callbacks; starts analysis pipeline  | DicomService           |

*Keep each service focused so Cursor can generate concise methods.*

---

## 3  DICOM → FHIR Mapping Rules

1. **Study ingestion**

   * When Orthanc gets a new Study, post JSON (StudyInstanceUID, PatientID, Series) to Nest.
   * `FhirMappingSvc` creates a **FHIR ImagingStudy** resource with identical UID/series hierarchy. ([build.fhir.org][5], [confluence.hl7.org][6])

2. **AI result**

   * After inference, create an **Observation** (`code = 69549‑1 "Brain mass detection"`) containing:

     * `valueCodeableConcept`: *Present* | *Absent*
     * `component[]`: bounding‑box coords as `Observation.component` slices.
   * Wrap all in a **DiagnosticReport** pointing to the ImagingStudy and Observation. ([build.fhir.org][7], [confluence.hl7.org][8])

3. **Derived images**

   * Overlay or mask written back to Orthanc via STOW‑RS; store Orthanc object UID in **Binary**; reference it from DiagnosticReport as `presentedForm`. ([discourse.orthanc-server.org][9], [orthanc.uclouvain.be][2])

---

## 4  End‑to‑End Workflow

| Step | Actor                   | Action                                                                   | FHIR artefact                             |
| ---- | ----------------------- | ------------------------------------------------------------------------ | ----------------------------------------- |
| 1    | PACS / MRI              | C‑STORE DICOM to Orthanc                                                 | –                                         |
| 2    | Orthanc                 | Fires webhook `NewStudy`                                                 | –                                         |
| 3    | Nest (WebhookModule)    | Records ImagingStudy in HAPI‑FHIR                                        | **ImagingStudy**                          |
| 4    | Nest (InferenceService) | Downloads pixel data via WADO‑RS, converts to PNG, POSTs to AI\_ENDPOINT | –                                         |
| 5    | AI service              | Returns JSON `{classification, boxes[]}`                                 | –                                         |
| 6    | Nest (FhirMappingSvc)   | Creates Observation + DiagnosticReport; optional derived Binary          | **Observation, DiagnosticReport, Binary** |
| 7    | UI                      | Calls `/dashboard` → now shows “Brain tumour: Present/Absent” tile       | –                                         |

*Cursor should create sequence diagrams in docs to visualise this.*

---

## 5  Security & Audit

* Use existing JWT guard; only **practitioner/admin** roles may call `/imaging/*`.
* Log every inference request with `studyUid`, user, latency; store in Mongo `ai_audit` collection.
* Propagate a `Correlation‑Id` header into Orthanc and AI requests for traceability.

---

## 6  Error‑Handling Contract

| Stage               | Failure | Return to caller              |
| ------------------- | ------- | ----------------------------- |
| Orthanc unreachable | 503     | `"dicom_service_unavailable"` |
| AI timeout          | 504     | `"ai_inference_timeout"`      |
| Mapping fails       | 500     | `"fhir_mapping_error"`        |

All errors captured by Nest *global filter* and logged through Winston to stdout + Prometheus counter.

---

## 7  Testing Plan

1. **Unit** – mock Orthanc + AI; assert correct FHIR JSON.
2. **Integration** – Docker–compose up; run Jest to upload sample DICOM, wait for DiagnosticReport, verify Observation status.
3. **Performance** – 50 parallel studies, expect P95 < 2 s AI latency (Roboflow SaaS) ([github.com][10])

---

## 8  Documentation Deliverables

* `docs/imaging_workflow.md` – diagrams, env table, API examples.
* Swagger updates:

  * `POST /imaging/analyse/{studyUid}` – returns DiagnosticReport.id
  * `GET  /fhir/ImagingStudy/{id}` – proxied helper for UI viewer.

---

### References

* FHIR *ImagingStudy* definition with DICOM tag mapping ([build.fhir.org][5])
* Orthanc DICOMweb plugin docs ([orthanc.uclouvain.be][2])
* Orthanc Docker image details ([hub.docker.com][1])
* WADO‑RS usage discussion (latency/logging) ([discourse.orthanc-server.org][9])
* DICOM‑SR → FHIR Observation mapping guide ([build.fhir.org][7])
* HL7 imaging + AI scenario notes (FHIRcast) ([confluence.hl7.org][8])
* Large‑scale DICOM‑to‑FHIR pipeline paper (best practice) ([pmc.ncbi.nlm.nih.gov][11])
* Roboflow hosted inference API docs ([inference.roboflow.com][3])
* Roboflow open‑source inference runner ([github.com][10])
* Brain‑Tumour‑Detection‑API repo (FastAPI + CNN) ([github.com][4])
* HL7 DICOM‑FHIR track guidance ([confluence.hl7.org][6])
* Orthanc Docker (alternative image) ([hub.docker.com][12])
* Mapping discussion on HL7 Confluence ([confluence.hl7.org][13])

---

### How to use this brief in Cursor

1. **Create a new workspace** titled *imaging-pipeline*.
2. **Paste each phase** as separate high‑level TODO comments; let Cursor generate the NestJS files/services in the order given.
3. Ask Cursor to write ADRs (Architecture Decision Records) for storage choice (Orthanc vs dcm4che) and AI deployment (Roboflow SaaS vs self‑host).

Follow the phases sequentially and you’ll have a fully containerised, FHIR‑compliant imaging pipeline that detects brain tumours and surfaces them to your EHR dashboard.

[1]: https://hub.docker.com/r/osimis/orthanc?utm_source=chatgpt.com "osimis/orthanc - Docker Image"
[2]: https://orthanc.uclouvain.be/book/plugins/dicomweb.html?highlight=dicomweb&utm_source=chatgpt.com "DICOMweb plugin — Orthanc Book documentation"
[3]: https://inference.roboflow.com/?utm_source=chatgpt.com "Roboflow Inference"
[4]: https://github.com/Islam-hady9/BrainTumorDetection-API?utm_source=chatgpt.com "Islam-hady9/BrainTumorDetection-API: Brain Tumor Detection using ..."
[5]: https://build.fhir.org/imagingstudy.html?utm_source=chatgpt.com "ImagingStudy - FHIR v6.0.0-ballot2"
[6]: https://confluence.hl7.org/display/HIN/DICOM%2Band%2BFHIR%2BTrack?utm_source=chatgpt.com "DICOM and FHIR Track - Confluence - HL7.org"
[7]: https://build.fhir.org/ig/HL7/dicom-sr/?utm_source=chatgpt.com "Home - DICOM® SR to FHIR Resource Mapping IG v1.0.0"
[8]: https://confluence.hl7.org/plugins/viewsource/viewpagesrc.action?pageId=91991388&utm_source=chatgpt.com "FHIRcast imaging use cases - View Source - HL7.org"
[9]: https://discourse.orthanc-server.org/t/logging-of-dicomweb-job-wado-rs/5541?utm_source=chatgpt.com "Logging of DicomWeb Job WADO-RS - General - Orthanc Users"
[10]: https://github.com/roboflow/inference?utm_source=chatgpt.com "roboflow/inference: Turn any computer or edge device into ... - GitHub"
[11]: https://pmc.ncbi.nlm.nih.gov/articles/PMC12133321/?utm_source=chatgpt.com "Large-Scale Integration of DICOM Metadata into HL7-FHIR for ..."
[12]: https://hub.docker.com/r/jodogne/orthanc?utm_source=chatgpt.com "jodogne/orthanc - Docker Image"
[13]: https://confluence.hl7.org/display/IMIN/Mapping%2Bof%2BDICOM%2BSR%2Bto%2BFHIR?utm_source=chatgpt.com "Mapping of DICOM SR to FHIR - Confluence"

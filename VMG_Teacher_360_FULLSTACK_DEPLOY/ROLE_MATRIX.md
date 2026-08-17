# Role matrix

| Capability | Teacher | CMO | Centre Director | CSR | R&D | BOD | Academic Supervisor | PTNS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Own portfolio | ✓ | | | | | | | |
| Same-region teacher view | | ✓ | ✓ | | | | | |
| Organisation teacher view | | | | ✓ | ✓ | ✓ | ✓ | ✓ |
| Log teacher case | | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| Approve centre case | | | ✓ | | ✓ | ✓ | | |
| Observation / rubric | view own | view | view | view | ✓ | ✓ | ✓ | view |
| Propose upgrade | | | | | ✓ | ✓ | ✓ | |
| Approve upgrade | | | | | ✓ | ✓ | | |
| Schedule training | | | | | ✓ | ✓ | ✓ | |
| Request training | | ✓ | ✓ | ✓ | | | | |
| Book catch-up / meeting | | ✓ | ✓ | | ✓ | ✓ | ✓ | |
| Teacher HR documents | own status | view | view | view | ✓ | ✓ | view | ✓ |
| Bulletin publish | view | view | view | view | ✓ | ✓ | view | ✓ |
| Resource Center | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create users | | | | | ✓ | ✓ | | |
| Delete governed records | | | | | ✓ | ✓ | | |

### Region model

- Region 1: PVT · VTS · NKN · TBM
- Region 2: LDN · HVG · TPU · NTI · PTA
- Region 3: BPC

CMO and Centre Director can cross-view teachers within their own region. This is enforced in Supabase RLS rather than only hidden in the interface.

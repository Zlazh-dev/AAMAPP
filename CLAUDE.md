# AAMAPP — aturan kerja asisten

## Graphify — tambahan di atas aturan resmi (bagian `## graphify` di bawah)
- `graphify update .` WAJIB tiap siklus fix→build→commit (perintah pemilik
  produk: "SELALU"); sertakan baris kesehatan (jumlah simpul + import cycles)
  di laporan.
- Penamaan komunitas (`graphify label . --backend tailscale`) butuh env
  `MY_TAILSCALE_KEY`; tanpa itu nama jatuh ke placeholder — jangan jalankan.

## Konteks proyek
- Ekosistem sekolah SMP IT Asy-Syadzili: NestJS + React + PostgreSQL, Docker
  (dev: `docker compose up -d --build`; prod: `docker-compose.prod.yml`).
- Kontrak desain & keputusan produk ada di `briefs/` (CARD-DESIGN-STANDARD,
  IA-HIERARCHY-V2, RBAC-AUDIT-FIX, BANDING-PENILAIAN-RADIG). Ikuti persis;
  jangan improvisasi ulang keputusan yang sudah dikunci.
- Peran asisten utama = PLANNER: delegasikan eksekusi ke agent (AG-1
  Antigravity, dsb.), verifikasi hasil terhadap kode, jangan percaya klaim
  laporan tanpa bukti.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

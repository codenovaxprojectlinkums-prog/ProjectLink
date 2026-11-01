# PROJECTLINKUMS — MULAKAN CODING DARI KOSONG (FULL ERD)

## Kenapa folder ini bukan tiga projek berasingan?

Sistem ProjectLinkUMS terdiri daripada **satu aplikasi Next.js**, satu **Supabase backend** (Auth + database + RLS + RPC), satu repository GitHub dan satu URL demo. Developer A, B dan C mempunyai peranan berbeza dalam sistem yang sama.

### Developer A: database & backend owner

1. Buka Supabase → SQL Editor. Jalankan **`supabase/00_SCHEMA_AUDIT_READ_ONLY.sql`** terlebih dahulu.
2. Semak semua 15 jadual `public` dan `auth.users`, nama kolum, foreign keys, default UUID/timestamp, dan RLS policies. Paparkan hasil kepada Developer C.
3. Backup database. Jika ada `policies` lama, semak bersama pasukan. **Jangan jalankan fail 10 sebelum konflik polisi diselesaikan.**
4. Setelah sesuai, jalankan `10_RLS_AND_GRANTS_REVIEW_FIRST.sql` dan `20_ATOMIC_BACKEND_FUNCTIONS.sql` dalam SQL Editor secara berasingan.
5. Jalankan `30_SEED_PUBLIC_CATALOGS.sql`, kemudian `40_POST_INSTALL_READ_ONLY_CHECKS.sql`.
6. Buka Authentication → Users, wujudkan dua atau tiga akaun ujian terkawal. Pastikan e-mel disahkan melalui kaedah yang dibenarkan dashboard, dan jangan guna data peserta sebenar tanpa izin.
7. Uji sendiri satu permohonan menggunakan dua akaun. Jangan gunakan SQL Editor sebagai satu-satunya ujian keselamatan, kerana SQL Editor ialah privileged.

### Developer B: frontend owner

1. Buka VS Code, buka folder yang diekstrak.
2. Gunakan `npm install`, `npm run dev`. Semua halaman sedia ada sudah ada UI minimum.
3. Ubah `src/app/globals.css`, `src/app/page.tsx`, dan komponen di `src/components/` supaya ikut rekaan Figma/identiti CodeNovaX1.
4. Jangan ubah nama jadual/kolum sesuka hati; ubah UI sahaja. Jika UI perlukan maklumat baharu, bincang dengan Developer A/C.
5. Uji flow di telefon dan browser desktop.

### Kamu (Developer C): matching, integration & QA

1. Pastikan Node.js 22 atau lebih baharu dan Git telah dipasang.
2. Salin `.env.example` menjadi `.env.local` dan isi Supabase URL serta publishable key yang Developer A beri melalui saluran selamat.
3. Run `npm run test:matching` — mesti **7 ujian lulus** sebelum ubah matching algorithm.
4. Baca `src/lib/matching.ts`: `scoreCandidate()` menapis eligibility dahulu, kemudian mengira weighted score. Jangan anggap 90% ialah AI prediction.
5. Baca `src/lib/database.ts`: fungsi `matchMyProject()` mengambil project requirements dan candidate records daripada **join tables**.
6. Buka `/matches` sebagai pemilik projek, tekan Find Candidates, dan lihat skor; beri jemputan jika calon setuju muncul dalam carian.
7. Buka `/requests` pada akaun pelajar lain. Accept/decline invitation; kemudian semak `project_members` sudah berubah.
8. Uji satu kes `Student B apply` → `Project owner A accept` → `Student B` lihat status Accepted. Uji pula permohonan tidak sah, capai maksimum slot dan akses tanpa izin.
9. Catat isu dengan severity P0/P1/P2/P3 di `docs/BUG_LOG.csv`. Integrasi hanya dianggap lulus jika fungsi benar-benar berjalan selepas browser refresh.
10. Rakam demo 2–3 minit menggunakan akaun rekaan. Pastikan video tidak mendakwa AI sudah berfungsi.

## Perintah lengkap

```bash
# Windows: pasang Node.js, Git dan VS Code dahulu.
# Dalam terminal VS Code (PowerShell):
cd C:\\path\\to\\ProjectLinkUMS_Full_Backend
npm install
Copy-Item .env.example .env.local
# Buka .env.local dan masukkan URL + publishable key
npm run test:matching
npm run typecheck
npm run dev
```

Buka `http://localhost:3000` → Login. Untuk macOS/Linux, gunakan `cp .env.example .env.local`.

## 5 soalan sebelum semua orang mula coding

1. Full 15 jadual public betul-betul sudah wujud, bukan hanya fail ERD dimuat naik?
2. Nama kolum betul-betul sama dengan `docs/SCHEMA_CONTRACT.md`?
3. Semua polisi lama sudah disemak; RLS sudah aktif?
4. Adakah URL + publishable key Supabase diperoleh daripada projek sama?
5. Siapa pemilik GitHub repo utama dan siapa boleh merge ke `main`?

## Ujian sebenar yang mesti kamu buat

**Dengan Akaun A:** login → Profile → create project → Match search → semak calon yang memberi kebenaran.  
**Dengan Akaun B:** login → Profile → Browse → Apply kepada projek A.  
**Dengan Akaun A:** Requests → Accept.  
**Dengan Akaun B:** Refresh → Requests = Accepted.  
**Dengan Akaun C:** opt-in pada profile → terima jemputan melalui Matching owner → accept invitation → masuk ke project_members.

### Bila error berlaku

- `function does not exist`: fail 20 belum dijalankan atau nama parameter berbeza.
- `permission denied for table`: RLS/grant atau login bermasalah. Minta Developer A semak policies.
- `relation ... does not exist`: database tidak sepadan dengan full ERD.
- `null value in column id`: column UUID belum ada default di schema rakan kamu.
- `duplicate key`: borang diproses lebih sekali; application unique per student/project.
- `No candidates`: semua calon belum opt-in, tiada profil, atau sukar memenuhi syarat wajib.
- `cannot find module`: `npm install` belum selesai atau dependencies berbeza.
- `invalid API key`: jangan cipta semula kunci; minta URL + publishable key tepat daripada Developer A.

## Pembahagian kerja selepas backend berjalan

Developer A semak data integrity dan RLS; Developer B kemaskan UI Figma dan responsive; kamu lakukan matching tests, integration/QA serta susun keperluan video. Jangan tunggu semua sempurna sebelum uji satu aliran penuh.

## Important

Setiap modul masih memerlukan **pengujian laptop pasukan terhadap database sebenar**. Fail ZIP bukan bukti deployment berjaya; jangan beri akses kepada beta testers sebelum hak akses disahkan.

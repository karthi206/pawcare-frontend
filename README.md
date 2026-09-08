PawCare AI 🐕
AI-powered street dog disease detection & outbreak tracking system

Live Demo Backend API Python React License

Overview
PawCare AI is a full-stack machine learning application that detects skin diseases in street dogs from photos. It combines computer vision with real-time outbreak detection to help NGOs, veterinarians, and animal rescue organizations identify and track disease patterns in vulnerable dog populations.

Problem: Street dogs suffer from untreated skin diseases. Manual diagnosis requires a vet visit, which is impractical at scale.
Solution: Instant AI-powered preliminary diagnosis from a photo, with built-in vet verification for accuracy, plus a safety layer that refuses to guess on images it isn't confident about.

✨ Features
🔍 Disease Detection
Upload dog photos (JPG/PNG)
AI predicts disease from 6 classes: Dermatitis, Fungal infections, Healthy, Hypersensitivity, Demodicosis, Ringworm
Calibrated confidence scoring (temperature scaling) with a 70% safety threshold — below threshold, the app returns "unable to classify" instead of a guess
Out-of-distribution (OOD) detection via Mahalanobis distance on the model's feature space — catches non-dog/garbage images even when the classifier itself is confidently wrong
Dog detection gate (ImageNet-based, rejects non-dog photos before the disease model runs)
👥 Multi-Role Authentication
User: Report cases, view results, request adoptions
Vet: Approve registrations, verify diagnoses, provide corrections
Admin: Manage users, approve vets, export training data, add pets, manage NGO directory
JWT-based auth stored in httpOnly cookies (not browser storage) with CSRF double-submit protection; persisted in Neon Postgres
📋 Case Management
Complete case history with photo viewing
Vet confirmation/correction workflow
Status tracking: pending → vet_confirmed → resolved
Human-in-the-loop data pipeline (vet corrections become training data)
🗺️ Outbreak Detection
GPS-based clustering using single-linkage grouping (not simple radius matching) over a rolling 14-day window
Evidence-weighted scoring per case (vet-confirmed cases weighted higher than AI-only, uncertain predictions weighted lowest, "Healthy" cases excluded) — a cluster only fires once weighted score crosses a threshold
Real-time cluster visualization (Leaflet maps)
Auto-notifies NGOs
📱 Offline Support
Case uploads queue in browser (localStorage)
Auto-syncs when connection returns
Smart retry logic (distinguishes permanent vs transient failures)
🐾 Pet Adoption Portal
Admin adds dogs to adoption database
Users browse and request adoption
NGOs notified and contact adopters directly
🌍 NGO Locator & Management
Admin-curated Verified Partners directory
Live discovery of nearby shelters/vets/NGOs via OpenStreetMap Overpass API (no API key needed, 10-minute in-memory cache)
Tabbed view separating verified partners from live discoveries
Automatic outbreak notifications
✉️ Vet Registration Emails
Vet sign-ups trigger an admin notification email; admin approval/rejection is meant to trigger a decision email to the vet (Resend API) — currently broken, see Known Limitations

🏗️ Tech Stack
Layer	Technology	Details
Frontend	React 18 + TypeScript	Vite build, Shadcn UI, Leaflet maps, TanStack Query, wouter routing
Backend	Flask (Python)	httpOnly-cookie JWT auth + CSRF, CORS, REST API
ML Model	MobileNetV2 ONNX	Transfer learning, 6 disease classes, 96.77% test accuracy, temperature-calibrated
Database	Neon Postgres	Persistent, free tier
Image Storage	Cloudinary	Persistent cloud storage, no local disk fallback
| Deployment | Render + Vercel | Backend on Render, frontend on Vercel, connected via a Vercel rewrite proxy so auth cookies stay first-party |

🚀 Live Demo
Try it now:

Frontend: https://pawcare-frontend-five.vercel.app
Backend API: https://pawcare-backend-eimp.onrender.com
Demo Credentials
Admin: admin / admin123 (or set your own)
Test User: Create a new account
Quick Test Flow
Sign up as a user
Upload a dog photo → see AI prediction (or an "unable to classify" / "not recognized" response if the image is unclear or not a dog)
Sign up as a vet → wait for admin approval
As vet, confirm/correct diagnoses
As admin, export vet corrections
Request pet adoption as user
🏃 Quick Start (Local Development)
Note: Frontend and backend are in separate GitHub repositories. You need to clone and run both.

Prerequisites
Python 3.8+
Node.js 16+
Git
Backend Setup (Separate Repo)
# Clone backend repo
git clone <backend-repo-url>
cd pawcare-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download pre-trained model files (in model/ folder)
# Required: pawcare_mobilenetv2_with_features.onnx + pawcare_mobilenetv2_with_features.onnx.data,
#           class_means.npy, cov_inv.npy, general_imagenet_model.onnx
# (Download from your training Colab or cloud storage)

# Set environment variables
export FLASK_ENV=development
export JWT_SECRET_KEY=your-secret-key-here
export DATABASE_URL=sqlite:///cases.db  # Local SQLite for dev

# Run Flask
python app.py
Backend runs at: http://localhost:5000

Frontend Setup (Separate Repo)
# Clone frontend repo (in a new terminal/folder)
git clone <frontend-repo-url>
cd pawcare-frontend

# Install dependencies
npm install

# Run dev server
npm run dev
Frontend runs at: http://localhost:5173

By default the frontend calls the API at the relative path /api, routed through the local dev server; in production this is routed through Vercel's rewrite proxy to Render, which keeps the auth cookie first-party. You generally don't need to set VITE_API_URL unless pointing at a non-default backend.

📦 Deployment
Backend Deployment (Render)
Push pawcare-backend repo to GitHub
In Render dashboard: Connect GitHub repo
Set environment variables:
DATABASE_URL=postgresql://user:pass@host/dbname  # From Neon
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
JWT_SECRET_KEY=<generate-strong-random-key>
FIXED_ADMIN_USERNAME=admin
FIXED_ADMIN_PASSWORD=<set-password>
RESEND_API_KEY=<resend-api-key>
ADMIN_EMAIL=<admin-inbox-for-vet-notifications>
Deploy
Backend live at: https://pawcare-backend-eimp.onrender.com

Frontend Deployment (Vercel)
Push pawcare-frontend repo to GitHub
In Vercel dashboard: Connect GitHub repo
vercel.json handles the /api/:path* rewrite proxy to the backend — confirm the target matches your Render URL
Deploy
Frontend live at: https://pawcare-frontend-five.vercel.app

📊 Model Performance
Architecture: MobileNetV2 transfer learning, exported to ONNX
Dataset: 4,315 images across 6 disease classes (Kaggle), predefined 3022/860/433 train/valid/test split
Test accuracy: 96.77% on the held-out 433-image test set (per-class F1: 0.93–0.995)
Calibration: Temperature scaling (T=1.5525) corrects raw model overconfidence — mean confidence moved from 0.974 (overconfident) to 0.948 (slightly underconfident, a safer direction to err)
Confidence threshold: 70% — accuracy is 98%+ above this threshold vs. ~75% below it
OOD detection: Mahalanobis distance on 1280-dim penultimate features catches inputs (blurry, non-dog, noise) that don't resemble the training distribution, before classification even runs
Inference time: <100ms per image (ONNX)
Limitations
Confusion between visually similar classes (Dermatitis ↔ Ringworm) accounts for most remaining errors
Model has not yet been benchmarked against an external/independent dataset — current accuracy is measured on a held-out split of the same source dataset
Not suitable for real-time triage without veterinary oversight; every result is explicitly labeled a possible condition, not a diagnosis
🔐 Security Considerations
✅ JWT authentication stored in httpOnly cookies (not localStorage), with CSRF double-submit protection
✅ Role-based access control (user/vet/admin), enforced both in frontend routing and backend route decorators
✅ Secure password hashing (bcrypt)
✅ CORS configured for trusted origins only
✅ SQL injection protection via SQLAlchemy ORM
✅ Image upload validation: extension allowlist, MIME check, Pillow integrity check, dimension bounds
✅ Rate limiting on the NGO notification endpoint
✅ GPS coordinates used for NGO search are never persisted to disk or DB
⚠️ Rate limiting not yet applied broadly across the API (recommended for production)
🛠️ API Endpoints
Authentication
POST /auth/register — Create new user/vet account
POST /auth/login — Login
GET /auth/me — Get current user
POST /auth/logout — Logout
Cases
POST /upload — Upload dog photo & get diagnosis (returns possible_condition, unable_to_classify, or not_recognized)
GET /cases — List cases (authenticated users only; own cases unless vet/admin)
GET /cases/<id> — Get case details (authenticated only)
PATCH /cases/<id>/status — Vet confirms/corrects diagnosis
GET /clusters — Get outbreak clusters
Pets (Adoption)
GET /pets — List available pets
POST /pets — Admin adds pet (requires auth)
POST /pets/<id>/adopt — User requests adoption
Admin
GET /admin/pending-vets — List pending vet applications
POST /admin/vets/<id>/approve — Approve vet
POST /admin/vets/<id>/reject — Reject vet
GET /admin/export-corrections — Export vet-corrected cases (for retraining)
NGOs
GET /ngos — List verified partner NGOs
POST /ngos — Admin creates NGO (admin-only)
POST /ngos/<id>/notify — Notify NGO of outbreak
GET /ngos/nearby — Verified partners near a location (Haversine)
GET /api/ngos/live-nearby — Live shelters/vets/NGOs via OpenStreetMap Overpass
📁 Project Structure
Backend Repo (pawcare-backend)
pawcare-backend/
├── app.py                     # Flask app & all routes
├── models.py                  # SQLAlchemy models (Case, User, NGO, NGONotification, Pet, AdoptionRequest)
├── clustering.py              # Outbreak detection (single-linkage, weighted scoring)
├── email_service.py           # Resend-based vet registration/decision emails
├── clean_duplicate_cases.py   # Case dedup utility (dry-run by default, --execute to apply)
├── requirements.txt           # Python dependencies
├── model/
│   ├── pawcare_mobilenetv2_with_features.onnx        # Trained disease detector
│   ├── pawcare_mobilenetv2_with_features.onnx.data
│   ├── class_means.npy / cov_inv.npy                 # OOD reference stats
│   ├── general_imagenet_model.onnx                   # Dog detection gate
│   └── cnn_model.py            # Model loading, calibration, OOD + inference logic
├── scripts/archive/            # Legacy one-off scripts, kept out of active code
└── README.md
Frontend Repo (pawcare-frontend)
pawcare-frontend/
├── client/src/
│   ├── components/
│   │   ├── CaseMap.tsx             # Outbreak clustering map (Leaflet)
│   │   ├── ErrorState.tsx          # Reusable error UI
│   │   ├── RequireAuth.tsx         # Route guard for logged-in-only pages
│   │   ├── layout/AppLayout.tsx    # Nav/header/footer
│   │   └── ui/                     # shadcn components
│   ├── hooks/
│   │   ├── use-auth.tsx            # Auth context (cookie-based)
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── api-client.ts           # Cookie/CSRF-aware fetch wrapper, retries, single-flight dedup
│   │   ├── config.ts                # API_URL resolution
│   │   └── queryClient.ts / utils.ts
│   ├── pages/                       # Landing, DiseaseDetection, NgoLocator, CaseTracker,
│   │                                 # AdoptionPortal, Login, Register, AdminPanel, not-found
│   ├── App.tsx
│   └── main.tsx
├── vercel.json                # Rewrite proxy config (/api/:path*)
├── package.json / vite.config.ts / tailwind.config.ts
└── README.md
🚧 Known Limitations
Issue	Status	Workaround
Vet approval/rejection emails not sent	Bug — email call is placed after the route's return statement (dead code)	Vets are notified manually for now; fix planned
No password reset	Not implemented	Contact admin
No email verification	Not implemented	Manual approval workflow
Rate limiting incomplete	Only applied to NGO notification endpoint	Monitor API usage
Mobile app not available	Out of scope	Responsive web design works well
Model retraining manual	Not automated	Export vet corrections, retrain in Colab
External validation not yet run	Accuracy measured on held-out split of source dataset only	Planned: benchmark against an independent dataset
🚀 Future Enhancements
Mobile app (React Native) with camera integration
Automated model retraining pipeline
Real-time push notifications
Vet clinic dashboard for bulk case management
Donation integration to fund NGO work
Multi-language support
PDF report generation
Fix vet decision email dead-code bug
Run external validation on an independent dataset
💡 How the ML Pipeline Works
User uploads dog photo
Dog detection gate (ImageNet ONNX) → rejects non-dogs with 422 error
Out-of-distribution check (Mahalanobis distance on feature space) → rejects images too far from the training distribution ("not recognized"), catching cases the confidence score alone would miss
Disease detector (MobileNetV2 ONNX) → predicts disease + calibrated confidence (temperature scaling)
Confidence threshold (70%) → predictions below threshold are returned as "unable to classify" rather than a guess
Case saved to Neon database with Cloudinary photo URL
Vet verification → vet confirms/corrects the AI prediction
Human-in-the-loop → vet corrections exported as training data
Model improves → retrain on vet-corrected cases in Colab
📝 License
MIT License — see LICENSE file

👤 Author
Karthi — 3rd year CS student
Built: August 2026

🙏 Acknowledgments
MobileNetV2 transfer learning architecture
ONNX Runtime for optimized inference
Neon for free Postgres hosting
Cloudinary for free image CDN
Render for free backend hosting
Vercel for free frontend hosting
OpenStreetMap Overpass API for live NGO/shelter discovery
Street dog rescue organizations for inspiration
📧 Questions or Issues?
Open an issue on GitHub or reach out directly.

The app is live and fully functional — try it now!

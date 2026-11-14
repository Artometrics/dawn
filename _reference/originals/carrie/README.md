# Carrie — Web Suite

A creative dual-application web suite created by **Carrie**, hosted on **Firebase Multi-Site Hosting** and part of the **Artometrics** ecosystem.

---

## 🌐 Live Web Deployments

| Site | Description | Live Production URL |
| :--- | :--- | :--- |
| **PageMatch** | Curated Book Quiz & Personalized Recommendation Engine (Amazon Affiliate ready) | [https://carrie-books.web.app](https://carrie-books.web.app) |
| **PawCert Studio** | Official Pet Birth, Birthday & Gotcha Day Certificate Generator | [https://carrie-pets.web.app](https://carrie-pets.web.app) |
| **Carrie Studio Portal** | Unified Suite Landing Page connecting both applications | [https://carrie-510519.web.app](https://carrie-510519.web.app) |

---

## 📚 App 1: PageMatch (Book Recommendations)
An intuitive, modern reading matchmaker:
- **5-Question Quiz**: Discovers reading vibe, genre lean, ideal pacing/length, favorite tropes (e.g. found family, unreliable narrator), and reading objectives (slump buster, escapism).
- **Intelligent Scoring Engine**: Matches users against a curated library of 35+ acclaimed bestsellers with tailored match percentages and customized match reasons.
- **Amazon Affiliate Integration**: Pre-wired with Amazon buy buttons (`carrie-20` default tag, configurable in-app via settings).
- **Personal Reading Shelf**: Bookmark books to local storage with badge counters.
- **Curated Library Browser**: Instant search and genre filters.
- **Dark/Light Mode**: Smooth theme toggling with literary aesthetic.

## 🐾 App 2: PawCert Studio (Pet Certificates)
A commemorative certificate generator for beloved pets:
- **Multiple Certificate Purposes**:
  - Official Birth Certificate
  - Gotcha Day / Official Adoption Certificate
  - Milestone Birthday Celebration Certificate
  - Certified 100% Good Pet Honor
  - Royal Companion & Sovereign Citizen
- **Customization**:
  - Pet name, species, breed, birth/adoption date, pronouns.
  - Proud parent / guardian names, hometown, custom registration number.
  - Personalized devotion/vow motto.
  - Pet photo upload framed in gold circular portrait (or species silhouette).
- **4 Design Themes**:
  - Classic Gold Foil Elegance
  - Sage Botanical Ivy
  - Birthday Confetti
  - Royal Midnight & Blue
- **Export & Print**:
  - High-Resolution 2400×1700 PNG image export generated with HTML5 Canvas.
  - 1-Click Print formatted for US Letter / A4 landscape framing (`@media print`).
  - One-click sample pet presets (Golden Retriever, Calico Cat, French Bulldog, Beagle).

---

## 🛠️ Project Structure

```
carrie/
├── apps/
│   ├── books/              # PageMatch Book Recommendation App
│   │   ├── index.html
│   │   ├── main.js
│   │   └── style.css
│   └── pets/               # PawCert Pet Certificate Generator
│       ├── index.html
│       ├── main.js
│       └── style.css
├── portal/                 # Carrie Studio Hub Portal
│   ├── index.html
│   └── style.css
├── .firebaserc             # Firebase project configuration & multi-site targets
├── firebase.json           # Firebase Hosting routing rules
├── package.json            # Scripts & dependencies
└── README.md
```

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run PageMatch (Book Quiz) locally on port 3000
npm run dev:books

# Run PawCert Studio (Pet Certificates) locally on port 3001
npm run dev:pets

# Run Portal locally on port 3002
npm run dev:portal
```

---

## 🚀 Building & Deploying to Firebase

```bash
# Build all 3 apps
npm run build

# Deploy all 3 sites to Firebase Hosting simultaneously
npm run deploy

# Or deploy individual sites
npm run deploy:books
npm run deploy:pets
npm run deploy:portal
```

---

&copy; 2026 Carrie &bull; Artometrics Web Suite

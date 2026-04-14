# SIRER — Système Intégré de Recensement des Retraités et Rentiers

Application nationale de gestion des retraités, rentiers et ayants droit (veufs, veuves, orphelins) pour un Ministère de la Fonction Publique.

## Fonctionnalités

- **Recensement** : retraités, rentiers, ayants droit (veuf, veuve, orphelin)
- **Base nationale sécurisée** : données sensibles chiffrées (AES-256-GCM), rôles (admin central, agent provincial, agent de recensement)
- **Règles métiers orphelins** :
  - À **18 ans** : alerte automatique ; si pas de poursuite d’études → suspension après validation administrative ; si poursuite d’études → attestation enregistrée, alerte programmée à **25 ans**
  - À **25 ans** : coupure automatique des avantages, historisation et traçabilité
- **Cartes officielles** : génération de cartes avec QR Code et date d’expiration (5 ans)
- **Tableau de bord** : statistiques par province, type, statut, alertes ouvertes
- **Rapports** : statistiques (par province, type, statut), export bénéficiaires
- **Journal d’audit** : traçabilité des actions (admin central)

## Stack technique

- **Backend** : Node.js, Express, Prisma
- **Base de données** : **MySQL** (données des bénéficiaires et du système)
- **Frontend** : React 18, Vite, React Router
- **Sécurité** : JWT, bcrypt, chiffrement des données sensibles

## Prérequis

- Node.js 18+
- npm
- **MySQL** 8+ (serveur local ou distant)

## Installation

```bash
# À la racine
npm install
cd frontend && npm install && cd ..

# Créer la base MySQL (exemple en ligne de commande MySQL)
# CREATE DATABASE sirer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Backend : configuration et base de données
cd backend
cp .env.example .env
# Éditer .env : DATABASE_URL (mysql://utilisateur:mot_de_passe@localhost:3306/sirer), JWT_SECRET, ENCRYPTION_KEY
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
```

## Lancement

```bash
# Terminal 1 — API
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- **Frontend** : http://localhost:5173  
- **API** : http://localhost:3001  

## Comptes de démonstration (après seed)

| Rôle              | E-mail                      | Mot de passe |
|-------------------|-----------------------------|--------------|
| Admin central     | admin@sirer.gov             | Admin123!    |
| Agent provincial  | agent.centre@sirer.gov      | Admin123!    |
| Agent recensement | recensement.centre@sirer.gov| Admin123!    |

## Planificateur (règles orphelins)

Pour exécuter les alertes 18/25 ans automatiquement au quotidien :

```bash
cd backend && node src/jobs/scheduler.js
```

Par défaut : exécution à 00:05 chaque jour. En production, déployer ce script (systemd, cron, ou worker) et configurer `TZ` si besoin.

L’admin central peut aussi déclencher manuellement les règles via l’API : `POST /api/jobs/run-orphan-rules` (après connexion).

## Structure

```
sirer/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── server.js
│   │   ├── config.js
│   │   ├── routes/       # auth, beneficiaries, alerts, dashboard, cards, audit, reports, orphans, jobs
│   │   ├── middleware/   # auth, audit
│   │   ├── services/    # orphanRules
│   │   ├── jobs/         # scheduler
│   │   └── utils/        # crypto
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── AuthContext.jsx
│   │   ├── pages/        # Login, Dashboard, Beneficiaries, Alerts, Reports, Audit
│   │   └── components/
│   └── package.json
└── README.md
```

## Production

- Remplacer SQLite par **PostgreSQL** : dans `backend/.env`, `DATABASE_URL="postgresql://..."`.
- Utiliser des secrets forts pour `JWT_SECRET` et `ENCRYPTION_KEY` (32 octets pour la clé de chiffrement).
- Configurer `FRONTEND_URL` et CORS.
- Servir le frontend buildé (`npm run build` dans `frontend`) via un reverse proxy (Nginx, etc.) avec l’API en `/api`.

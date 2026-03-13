# Portfolio Antoine Smeets

Portfolio personnel présentant mes projets en valorisation de données, automatisation et solutions no-code.

## 🚀 Aperçu

Site statique généré automatiquement à partir de fichiers Markdown, avec :
- **SEO optimisé** : sitemap XML, structured data, Open Graph
- **Déploiement automatique** via GitHub Actions
- **Gestion dynamique** des projets et catégories
- **Performance** : lazy loading, fichiers optimisés

## 📁 Structure du projet

```
.
├── build-system/           # Système de build automatisé
│   ├── build.js           # Script principal
│   ├── lib/               # Modules (markdown, SEO, tags...)
│   ├── templates/         # Templates Handlebars
│   └── README.md          # Documentation complète
│
├── projets/               # Projets du portfolio
│   └── [slug]/
│       └── index.md       # Contenu + frontmatter
│
├── css/                   # Styles
├── js/                    # Scripts front-end
├── images/                # Images
├── index.html             # Page d'accueil
└── .github/
    └── workflows/
        └── deploy.yml     # CI/CD GitHub Actions
```

## 🛠️ Installation

### Prérequis
- Node.js 18+
- npm ou yarn

### Configuration
```bash
# 1. Cloner le repo
git clone https://github.com/votre-username/portfolio.git
cd portfolio

# 2. Installer les dépendances
cd build-system
npm install
```

## 💻 Utilisation

### Créer un nouveau projet

1. **Créer le dossier projet** :
```bash
mkdir projets/nom-du-projet
```

2. **Créer le fichier `index.md`** avec ce frontmatter :
```yaml
---
title: "Titre du projet"
description: "Description SEO (120-160 caractères)"
hero_image: "images/hero.png"
date: "2025-01-15"
status: "published"
categories: ["Automatisation", "Python"]
tags: ["API", "IA"]
github_url: "https://github.com/..."  # optionnel
---

# Contenu du projet

Votre contenu en Markdown...
```

3. **Builder le site** :
```bash
cd build-system
npm run build
```

### Commandes disponibles

```bash
# Build complet
npm run build

# Mode développement (watch)
npm run dev

# Valider les projets
npm run validate

# Nettoyer les fichiers générés
npm run clean

# Migrer anciens projets (une fois)
npm run migrate
```

## 🚢 Déploiement

### Déploiement automatique (GitHub Pages)

Le site est buildé et publié automatiquement sur GitHub Pages à chaque push sur `main`.

**Configuration GitHub** :
1. Aller dans `Settings` → `Pages`
2. Dans `Build and deployment`, sélectionner `GitHub Actions`
3. Optionnel : ajouter dans `Settings` → `Secrets and variables` → `Actions` les variables suivantes :
    - `SITE_URL` : URL publique finale du site, par exemple `https://smeets.dev`
    - `CNAME_DOMAIN` : domaine personnalisé à écrire dans le fichier `CNAME`, par exemple `smeets.dev`

Si `SITE_URL` n'est pas définie, le workflow utilise automatiquement l'URL GitHub Pages par défaut du dépôt.

### Déploiement manuel

```bash
# 1. Installer les dépendances du build system
cd build-system
npm install
cd ..

# 2. Générer le build de production complet
NODE_ENV=production node .github/scripts/build-production.js

# 3. Le site prêt à publier est dans _site/
```

## 📝 Frontmatter complet

Tous les champs disponibles pour `index.md` :

```yaml
---
# Obligatoire
title: "Titre du projet"
description: "Description (SEO optimal: 120-160 chars)"
date: "2025-01-15"

# Images
hero_image: "images/hero.png"          # Image principale

# Organisation
status: "published"                     # draft | published | archived
featured: true                          # Mettre en avant
categories: ["Cat1", "Cat2"]           # Catégories principales
tags: ["tag1", "tag2"]                 # Tags secondaires
tech_stack: ["Python", "Docker"]       # Technologies utilisées

# Liens
github_url: "https://github.com/..."
demo_url: "https://demo.com"

# SEO (auto-généré si omis)
seo_title: "Titre SEO personnalisé"
seo_description: "Description personnalisée"
keywords: ["mot-clé1", "mot-clé2"]

# Métadonnées
duration: "2 semaines"
client: "Personnel"
---
```

## 🔧 Personnalisation

### Modifier le design
- **Styles** : éditer [`css/style.css`](css/style.css)
- **Template projet** : éditer [`build-system/templates/project.hbs`](build-system/templates/project.hbs)
- **Page d'accueil** : éditer [`index.html`](index.html)

### Ajouter une fonctionnalité
Consulter la [documentation complète du build system](build-system/README.md)

## 📊 Fichiers générés automatiquement

Le build génère :
- `projets/index.json` - Index des projets
- `projets/*/index.html` - Pages HTML des projets
- `sitemap.xml` - Sitemap XML
- `robots.txt` - Directives pour robots
- `structured-data.json` - Schema.org
- `seo-report.json` - Rapport SEO


## 🔗 Liens utiles

- [Documentation du build system](build-system/README.md)
- [Guide de migration](build-system/QUICK-START.md)

---
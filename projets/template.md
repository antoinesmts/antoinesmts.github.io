# Template de Projet Portfolio

Ce fichier sert de guide pour créer de nouveaux projets dans le portfolio. Chaque projet doit être dans son propre dossier `/projets/{nom-du-projet}/index.md` avec cette structure.

## Structure des dossiers

```
projets/
├── mon-nouveau-projet/
│   └── index.md                    # Ce fichier
└── template.md                     # Ce template (à la racine de projets)
```

## Images

Les images doivent être placées dans `/images/projets/{nom-du-projet}/` et référencées avec le chemin relatif `../../images/projets/{nom-du-projet}/nom-image.png`

---

## Frontmatter (Métadonnées)

Le frontmatter est la section YAML au début du fichier délimitée par `---`. Voici tous les champs disponibles :

```yaml
---
# === CHAMPS OBLIGATOIRES ===

title: "Titre de votre projet"
# Description : Le titre principal affiché partout
# Exemple : "Automatisation de la veille des offres d'emploi"
# Règles : Max 60 caractères recommandé pour le SEO

description: >-
  Description détaillée du projet sur plusieurs lignes.
  Elle apparaît dans les résumés et métadonnées SEO.
# Description : Description complète du projet (150-300 caractères recommandé)
# Format : Peut être multilignes avec >- pour préserver les sauts de ligne
# Utilisation : Résumés de cartes, métadonnées SEO, OpenGraph

date: 2025-01-15
# Description : Date de création/publication du projet
# Format : YYYY-MM-DD (format requis strict)
# Exemple : 2025-07-23 (PAS de timestamp, juste la date)

# === CHAMPS RECOMMANDÉS ===

slug: mon-nouveau-projet
# Description : Identifiant URL unique du projet
# Format : kebab-case (minuscules, tirets)
# Génération auto : Si absent, généré depuis le titre
# URL finale : /projets/{slug}

excerpt: >-
  Version courte de la description pour les cartes et aperçus.
  Environ 100-150 caractères...
# Description : Résumé court pour les cartes de projets
# Format : Texte simple, environ 100-150 caractères
# Auto-génération : Si absent, tronqué depuis description

hero_image: ../images/projets/mon-nouveau-projet/preview.png
# Description : Image principale du projet
# Format : Chemin relatif depuis le fichier index.md
# Exemple : ../images/projets/mon-projet/hero.png
# Utilisation : Hero de la page, vignettes, partages sociaux

status: published
# Description : État de publication du projet
# Valeurs possibles : "draft", "published", "archived"
# Défaut : "published"
# Note : Les drafts ne sont pas affichés en production

featured: false
# Description : Met en avant le projet sur la page d'accueil
# Valeurs : true/false
# Utilisation : Projets mis en évidence

categories:
  - Automatisation
  - Python
  - IA
# Description : Catégories principales du projet
# Format : Liste YAML (tableau)
# Utilisation : Filtres, navigation, SEO
# Recommandation : 1-5 catégories maximum

# === CHAMPS OPTIONNELS ===

tags: []
# Description : Tags spécifiques (actuellement non utilisé dans le build)
# Format : Liste YAML
# Usage futur : Navigation fine, recherche

tech_stack: []
# Description : Stack technique utilisée (actuellement non utilisé)
# Format : Liste YAML
# Exemples : ["Python", "FastAPI", "PostgreSQL"]

# CHAMP SUPPRIMÉ - priority: Le tri se fait maintenant automatiquement par date

last_updated: 2025-01-15
# Description : Date de dernière modification
# Format : YYYY-MM-DD
# Utilisation : Métadonnées, tri

# === MÉTADONNÉES PROJET ===
# Les champs suivants ont été supprimés car non utilisés :
# - duration: Durée du projet
# - team_size: Taille de l'équipe
# - client: Type de client

github_url: "https://github.com/username/repo"
# Description : Lien vers le repository GitHub
# Format : URL complète ou null
# Affichage : Bouton "Voir le code"

# CHAMPS SUPPRIMÉS :
# - demo_url: Lien vers une démo en ligne (non utilisé)
# - case_study: Indicateur d'étude de cas (non utilisé)

# === SEO ET MÉTADONNÉES ===

seo_title: "Titre SEO personnalisé - Antoine Smeets"
# Description : Titre pour les moteurs de recherche
# Défaut : Utilise title + " - Antoine Smeets Portfolio"
# Recommandation : Max 60 caractères

seo_description: "Description personnalisée pour SEO et réseaux sociaux"
# Description : Description pour métadonnées SEO
# Défaut : Utilise description
# Recommandation : 150-160 caractères

canonical_url: "https://votre-domaine.fr/projets/mon-nouveau-projet"
# Description : URL canonique du projet
# Format : URL complète
# Auto-génération : Basé sur slug si absent

schema_type: SoftwareApplication
# Description : Type de schema.org pour SEO
# Valeurs possibles :
#   - "SoftwareApplication" (applications, scripts)
#   - "CreativeWork" (designs, analyses)
#   - "Dataset" (analyses de données)
# Défaut : "CreativeWork"

# === MÉTADONNÉES AVANCÉES (optionnelles) ===

language: fr
# Description : Langue du contenu
# Format : Code ISO (fr, en, etc.)
# Défaut : "fr"

keywords: ["automation", "python", "ai"]
# Description : Mots-clés additionnels pour SEO
# Format : Liste de strings
# Auto-génération : Depuis categories et tech_stack

hero_alt: "Capture d'écran du tableau de bord du projet"
# Description : Texte alternatif pour l'image hero
# Auto-génération : "Aperçu du projet: {title}"

og_image: ../images/projets/mon-nouveau-projet/social.png
# Description : Image spécifique pour OpenGraph (Facebook, LinkedIn)
# Défaut : Utilise hero_image
# Format : Chemin relatif

twitter_image: ../images/projets/mon-nouveau-projet/twitter.png
# Description : Image spécifique pour Twitter Card
# Défaut : Utilise hero_image ou og_image
# Format : Chemin relatif
---

# Contenu Markdown

Après le frontmatter, rédigez le contenu de votre projet en Markdown standard.

## Structure recommandée

```markdown
![Image hero](../../images/projets/mon-nouveau-projet/preview.png)

## Présentation du projet

Description générale, contexte, objectifs...

## Stack technique et fonctionnement

### Technologies utilisées
- Technology 1
- Technology 2

### Architecture
Description de l'architecture...

## Résultats et apprentissages

Ce que le projet a apporté...

## Améliorations possibles

Pistes d'évolution...
```

## Validation automatique

Le système valide automatiquement :

✅ **Champs obligatoires** : title, description, date
✅ **Format de date** : YYYY-MM-DD strict
✅ **Status** : draft/published/archived uniquement
✅ **Categories** : Doit être un tableau non vide
✅ **Images** : Vérification de l'existence des fichiers
✅ **Longueurs** : Title < 60 chars, description 150-300 chars

## Conseils

1. **Images** : Utilisez des formats web optimisés (PNG, JPG, WebP)
2. **SEO** : Remplissez seo_title et seo_description pour un meilleur référencement
3. **Categories** : Restez cohérent avec les catégories existantes
4. **Slug** : Utilisez des mots-clés pertinents pour l'URL
5. **Description** : Soyez précis et vendez votre projet en quelques phrases

## Génération automatique

Le système génère automatiquement :
- Index JSON des projets
- Pages HTML individuelles
- Sitemap XML
- Métadonnées SEO structurées
- Données pour réseaux sociaux
- Filtres et tags dynamiques
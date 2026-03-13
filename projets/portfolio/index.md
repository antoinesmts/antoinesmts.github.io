---
title: Vibe coding d'un portfolio automatisé avec markdown et GitHub Actions
slug: portfolio
description: >
  Portfolio web automatisé développé avec HTML/CSS/JS, synchronisant automatiquement les projets via fichiers markdown et GitHub Actions pour une publication GitHub Pages sans CMS.
excerpt: >
  Portfolio web automatisé avec synchronisation markdown et GitHub Actions pour publication GitHub Pages sans CMS...
hero_image: ../images/projets/portfolio/0_portfolio.png
date: 2025-08-01
status: published
featured: true
categories:
  - IA
tags: []
tech_stack:
  - HTML
  - CSS
  - JavaScript
  - GitHub Actions
  - Markdown
  - GitHub Pages
  - Trae IDE
  - Claude Sonnet 3.7
  - VS Code
  - Claude Code
seo_title: Portfolio automatisé markdown GitHub Actions maintenance minimale
canonical_url: https://smeets.dev/projets/portfolio
schema_type: SoftwareApplication
github_url: https://github.com/antoinesmts/Portfolio
demo_url: null
---

## Contexte et enjeux

La gestion traditionnelle de portfolio avec des CMS comme Wordpress présente des limitations significatives : maintenance lourde, dépendance à des plugins, et complexité de mise à jour. Je souhaitais avoir une solution plus légère et automatisée pour présenter mes projets tout en minimisant le travail manuel. Le défi était de concevoir un portfolio performant qui s'actualise automatiquement à partir de fichiers markdown sur GitHub.

## Solution développée

J'ai développé une architecture portfolio statique combinant HTML, CSS et JavaScript avec une automatisation complète via GitHub Actions. La solution élimine toute dépendance aux CMS traditionnels en utilisant des fichiers markdown pour le contenu des projets. Chaque push vers le dépôt GitHub déclenche automatiquement la reconstruction du site et la publication sur GitHub Pages, créant un workflow de maintenance minimale tout en garantissant des mises à jour instantanées.

L'avantage réside dans l'intégration fluide entre la simplicité du markdown, la puissance de GitHub Actions, et l'hébergement statique natif de GitHub Pages, surpassant les solutions CMS plus lourdes et moins flexibles.

## Architecture et technologies

**Frontend** : HTML5, CSS, JavaScript.

**Gestion de contenu** : Fichiers markdown structurés avec métadonnées YAML pour chaque projet, permettant une organisation claire et une maintenance simplifiée.

**Automatisation** : GitHub Actions avec workflow YAML personnalisé pour la conversion markdown → HTML, le build du site et la publication GitHub Pages automatisée.

**Environnements de développement** : Trae IDE avec Claude Sonnet 3.7 pour le vibe coding initial, puis migration vers VS Code avec Claude Code pour le debugging avancé et l'optimisation.

**Déploiement** : Publication statique sur GitHub Pages via GitHub Actions, permettant un déploiement instantané sans intervention manuelle.

## Résultats et bénéfices

Le portfolio final offre une maintenance réduite comparé aux solutions CMS traditionnelles. Les mises à jour de projets deviennent aussi simples qu'éditer un fichier markdown et pousser les modifications sur GitHub. L'automatisation via GitHub Actions garantit un déploiement fiable et instantané.

## Évolution envisagée

Une extension majeure envisagée est l'intégration de n8n et de modèles LLM pour automatiser la rédaction des fiches projets markdown. Cette évolution créerait un pipeline complet de génération de contenu automatisé, depuis la création du texte jusqu'au déploiement final.

[Voir le projet sur GitHub](https://github.com/antoinesmts/Portfolio)

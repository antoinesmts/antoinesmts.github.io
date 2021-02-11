---
name: Tableau de bord - Gestion de la qualité au sein de restaurants
tools: [Tableau, Python, WebHarvy]
image: https://raw.githubusercontent.com/antoinesmts/antoinesmts.github.io/main/_projects/Images/Tableau%20de%20bord%20-%20Gestion%20de%20la%20qualit%C3%A9%20au%20sein%20de%20restaurants.png
description: Réalisation d'un tableau de bord de gestion de la qualité de restaurants. Ce projet a été mené dans le cadre du cours MET8417 (Gestion des opérations) de l'UQAM à l'hiver 2020.
---

# Tableau de bord - Gestion de la qualité au sein de restaurants

Le projet a été mené dans le cadre du cours MET8417 (Gestion des opérations) de l'UQAM à l'hiver 2020. Il fût réalisé au sujet d'une chaîne de restaurants montréalaise. Il a été anonymisé lors de sa publication en ligne afin de ne pas publier les données internes de l'entreprise utilisées. Le résultat final est disponible en bas de la page.

![preview](https://raw.githubusercontent.com/antoinesmts/antoinesmts.github.io/main/_projects/Images/Tableau%20de%20bord%20-%20Gestion%20de%20la%20qualit%C3%A9%20au%20sein%20de%20restaurants.png)

## Méthode

Le logiciel de récupération des données WebHarvy a été utilisé afin de récolter les commentaires laissés sur la plateforme Google Maps au sujet des restaurants analysés. Les données ont ensuite été traitées par un script codé en langage Python à l’aide de différentes librairies (principalement la librairie Vader NLTK pour la réalisation de l’analyse d’opinion):

* Nettoyage des données afin de retirer toute donnée superflue.
* Réalisation d’une analyse d’opinion avec l’algorithme Vader. Chaque commentaire se voit attribuer un score sur une échelle de -1 à 1. Afin de faciliter l’analyse, ils ont été organisés en trois catégories : négatif (-1 ≤ score < -0.2), neutre (-0.2 ≤ score ≤ 0.2), positif (0.2 < score ≤ 1).
* Enregistrement des données dans une base de données MySQL.

Le tableau de bord a ensuite été créé en connectant le logiciel Tableau à la base de données:

Le tableau de bord de gestion de la qualité met en avant plusieurs indicateurs: score sur Google Maps, score NPS et résultats de l’invité mystère (données internes à l'entreprise supprimées lors de la mise en ligne du projet). Ce tableau de bord intéractif pourrait permettre aux gestionnaires d'une entreprise de réaliser une veille des commentaires publiés sur les réseaux sociaux et permet une analyse plus approfondie des raisons derrières les notes des clients.

<p class="text-center">
{% include elements/button.html link="https://public.tableau.com/views/MET8417-2/Qualit?:language=en&:display_count=y&:toolbar=n&:origin=viz_share_link" text="Voir le projet" %}
</p>

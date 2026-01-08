# Calculateur de réduction des primes d’assurance-maladie (LAMal)

## Contexte général

En Suisse, l’assurance-maladie de base selon la **LAMal** est obligatoire pour l’ensemble de la population.  
Les primes étant indépendantes du revenu, un mécanisme public de **réduction des primes d’assurance-maladie** (*RPI – Réduction des Primes Individuelles*) a été mis en place afin de soutenir les personnes et les familles disposant de moyens financiers modestes.

Ce mécanisme est prévu par le droit fédéral, mais sa mise en œuvre concrète relève des **cantons**, qui définissent :
- les critères d’éligibilité,
- les seuils de revenu,
- les méthodes de calcul,
- les primes de référence,
- ainsi que les modalités administratives.

Ces règles varient donc selon le canton et selon l’année de référence.

---

## Cadre légal de référence

Ce calculateur est basé sur le cadre juridique applicable dans le **canton de Fribourg**, notamment :

- La **Loi fédérale sur l’assurance-maladie (LAMal)**, qui établit le principe d’une réduction des primes pour les personnes de condition économique modeste.
- La **Loi cantonale d’application de la LAMal (LALAMal)**, qui précise :
  - les conditions d’octroi,
  - la notion de *revenu déterminant*,
  - les exclusions (revenu ou fortune élevés, taxation d’office, etc.),
  - le rôle de la Caisse cantonale de compensation.
- Le **mémento cantonal officiel pour l’année 2026**, qui détaille :
  - les limites de revenu selon la composition du ménage,
  - les règles de calcul du revenu déterminant,
  - les primes moyennes régionales par âge,
  - les taux de réduction applicables, y compris les minimums garantis pour les enfants et les jeunes adultes en formation.

Seules les autorités compétentes peuvent rendre des décisions juridiquement contraignantes.  
Ce calculateur a une **finalité informative**.

---

## Objectif du calculateur

Le système de réduction des primes repose sur des règles publiques, mais souvent **complexes et dispersées** entre textes légaux, ordonnances et documents explicatifs annuels.

Ce calculateur a été conçu pour :

- fournir une **estimation claire et compréhensible** du droit potentiel à une réduction de primes ;
- permettre à l’utilisateur de savoir s’il est **susceptible d’être éligible** ;
- expliquer **la logique du calcul**, et pas uniquement le résultat final ;
- réduire l’incertitude avant le dépôt d’une demande officielle.

Il s’agit d’un **outil d’aide à la décision et de compréhension**, et non d’un substitut aux procédures administratives officielles.

---

## Principe de calcul (vue d’ensemble)

Le calculateur applique, de manière simplifiée mais fidèle, la méthodologie cantonale officielle :

- prise en compte de la **situation du ménage** (personne seule, couple, nombre d’enfants à charge) ;
- détermination du **revenu déterminant**, basée sur :
  - le revenu fiscal net de l’année *N–2*,
  - des ajustements selon le statut fiscal (imposition ordinaire, indépendant, impôt à la source),
  - l’ajout d’une fraction de la fortune imposable ;
- comparaison avec les **seuils légaux** applicables ;
- application des **taux de réduction** définis par les barèmes cantonaux ;
- utilisation des **primes moyennes régionales officielles** selon l’âge (adulte, jeune adulte, enfant).

L’ensemble des calculs est effectué **côté client**, au moyen de **HTML, CSS et JavaScript**, sans transmission de données à un serveur.

---

## Portée et limites

Ce calculateur :

- s’applique à **un canton et une année de référence donnés** ;
- repose exclusivement sur des **sources légales et administratives publiques** ;
- fournit des **estimations**, non des décisions officielles ;
- ne remplace pas l’examen effectué par la Caisse cantonale de compensation ;
- ne collecte ni ne conserve aucune donnée personnelle.

Le droit effectif à une réduction de primes et son montant final sont toujours déterminés par l’autorité compétente.

---

## Pourquoi ce projet

La réduction des primes est un mécanisme social essentiel. Pourtant, de nombreuses personnes :
- ne déposent pas de demande par manque de compréhension,
- sous-estiment leur droit,
- découvrent trop tard qu’elles étaient éligibles.

Ce projet vise à **abaisser la barrière de compréhension**, en rendant les règles lisibles, testables et explicables au moyen d’un outil web simple, ouvert et transparent.

---

## Aspects techniques

- Application web statique
- Technologies : HTML / CSS / JavaScript
- Hébergement : GitHub Pages
- Code source : open source
- Aucune dépendance serveur

---

## Avertissement

Ce calculateur est fourni à titre informatif.  
En cas de divergence, **les dispositions légales et les décisions des autorités cantonales font foi**.
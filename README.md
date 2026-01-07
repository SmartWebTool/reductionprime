# Calculateur de Réduction des Primes - Canton de Fribourg

## Objectif de l'outil

Ce projet est une application web monopage (Single Page Application) qui permet aux citoyens du canton de Fribourg d'estimer leur droit à une réduction des primes d'assurance-maladie pour l'année 2026.

Le calcul est basé sur les directives officielles de la Caisse de compensation du canton de Fribourg (ECAS), telles que décrites dans le mémento RPI 2026.

**Lien vers le calculateur :** [Accéder au calculateur](https://[votre-nom-utilisateur-github].github.io/primereduction/docs/index.html) *(Note: remplacez `[votre-nom-utilisateur-github]` par votre nom d'utilisateur pour que le lien fonctionne après déploiement sur GitHub Pages).*

## Comment ça marche ?

Ce calculateur a été conçu pour être simple, transparent et sécurisé.

*   **100% Côté Client :** Toutes les opérations sont effectuées directement dans votre navigateur web. Aucune donnée personnelle n'est envoyée, stockée ou partagée sur un serveur. Votre vie privée est entièrement respectée.
*   **Transparence des Calculs :** Pour chaque valeur que vous entrez, l'application vous montre immédiatement la "valeur déterminante" — c'est-à-dire la valeur qui est réellement utilisée dans le calcul final du revenu déterminant. Cela vous permet de comprendre précisément comment le résultat est obtenu.
*   **Technologie :** L'application est développée en utilisant uniquement des technologies web standard : HTML, CSS et JavaScript (vanilla), sans dépendre de frameworks complexes.

## Comment utiliser le calculateur

1.  **Ouvrez le fichier `docs/index.html`** dans votre navigateur ou accédez au lien GitHub Pages.
2.  **Remplissez les champs** en vous basant sur les informations de votre **avis de taxation fiscale de 2024**.
3.  Utilisez les icônes d'aide (`?`) à côté de chaque champ pour obtenir des explications sur la valeur à saisir.
4.  **Les résultats sont mis à jour automatiquement** à chaque modification. La section "Résultats Estimés" vous indiquera :
    *   La limite de revenu pour votre situation.
    *   Votre revenu déterminant calculé.
    *   Une estimation de votre droit à la réduction (Oui/Non).
    *   Le montant annuel estimé de la réduction.

## Avertissement

Ce calculateur fournit une **estimation** et n'a aucune valeur légale. Le résultat peut différer de la décision officielle. La demande de réduction de primes doit être déposée auprès de la Caisse de compensation du canton de Fribourg, qui est la seule entité habilitée à rendre une décision officielle.

Pour plus d'informations ou pour faire votre demande officielle, veuillez consulter le site de l'[ECAS](https://www.ecasfr.ch/).

## Structure du Projet

*   `/docs` : Contient les fichiers de l'application web (`index.html`, `style.css`, `script.js`) et les données CSV. Ce dossier est utilisé pour le déploiement sur GitHub Pages.
*   `/sources` : Contient les documents de référence PDF qui ont servi à l'élaboration du calculateur.

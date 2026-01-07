# Project: PrimeReduction
**Role:** Senior Developer & Mathematical Assistant
**Context:** This project is located on a Samsung Galaxy S8 Ultra tablet using Termux/Ubuntu.

## Project Goal
- The main objective is to create a Single Web Page application using javascript to calculate if a citizen could get a prime reduction for health care based on earnings, debts and some calculation parameters. The user enter values based on the tax declaration 2 years before the current year, the calculator calculates if a prime reduction could apply and how much this reduction could be based on reference values stored in a csv file and user values. The user's entered values should be stored locally in his browser. The web page should be loaded on github Pages and made accissible by anyone.
- Focus on clean, modular code (HTML/CSS and Javascript are required).
- Ensure all outputs are optimized for mobile processing power.
- Ensure the user could enter / modify / delete values on the web page
- Ensure the reference values could be read out of a CSV file located under /docs
- Ensure the Single Web Page could be loaded on github repository under /docs
- Ensure a readme.md explain the goal and the use of the tool in french langage
- Ensure the GUI is in french (labels, tips, explanations, etc)
- Ensure the javascript and comments are written in english

## Coding Standards
- Use HTML / CSS and Javascript (Vanilla Javascript preferred)
- Follow PEP 8 style guidelines.
- Always include brief docstrings for functions.
- If creating UI elements, make them simple and touch-friendly.
- The web page should run locally on the client browser and does not requires server-side scripting.
- If possible use Fetch to read files (CSV file with reference values)
- The page should present a first table Données with structure including the following columns: Operation, Rubrique, Code, Valeur, Valeur seuil, Valeur déterminante
- The first table rows should be visually grouped together depending on their group: Revenu, Primes et Cotisations d'assuranceIntérêts hypothécaires et Frais d'entretien, Fortune
- The second table Calculs contains 2 columns: Rubrique, Valeur


## Instructions for Gemini
- Before writing code, always propose a brief plan.
- Use the `@search` tool if you need to find the latest mathematical libraries.
- When I ask to "generate a report," format it in Markdown as we discussed.

## Script Workflow
### 1. Surname and Givenname
User enters Surname and Givenname


# Project: PrimeReduction Calculator

**Role:** Senior Software Developer

**Context:** This project is a single-page web application designed to help citizens in the canton of Fribourg, Switzerland, estimate their eligibility for a health insurance prime reduction.

## 1. Project Goal

The primary objective is to provide a client-side, easy-to-use calculator that estimates the potential for a health insurance prime reduction based on the user's financial data from their tax declaration. The application must be accessible via GitHub Pages and function entirely within the user's browser without a server-side backend.

## 2. Core Features

### 2.1. User Input & Configuration
-   **Personal Situation:** The user must be able to input their civil status, region, and the number of adults, young adults (in training), and children in their household.
-   **Calculation Year:** The user can select the year for which the calculation is performed. This determines which set of parameters (CSV files) is loaded.
-   **Financial Data:** The user can input values from their tax declaration (from two years prior to the calculation year) into a structured table. This includes income, deductions, assets, and other relevant financial details.

### 2.2. Calculation & Logic
-   **Dynamic Data Loading:** The application loads all calculation parameters, income limits, and reduction rates from CSV files corresponding to the selected calculation year using the `fetch` API.
-   **"Revenu Déterminant" Calculation:** The application calculates the "Revenu Déterminant" (determinant income) by summing and subtracting the user's financial data according to official rules. Each input field in the financial table displays its calculated "Valeur Déterminante" (determinant value).
-   **Eligibility Check:** The calculated "Revenu Déterminant" is compared against official income limits (from a CSV file) based on the user's personal situation to determine eligibility.
-   **Reduction Estimation:** If the user is eligible, the application calculates the estimated annual reduction amount. It uses a rate grid (from a CSV file) to find the applicable reduction percentage and provides a detailed breakdown for adults, young adults, and children.

### 2.3. User Interface & Experience
-   **Language:** The entire user interface, including labels, tooltips, buttons, and results, must be in **French**.
-   **Real-time Updates:** The "Revenu Déterminant" total is updated automatically as the user types in the financial data fields.
-   **Results Display:** The results are presented clearly, showing the income limit, the user's calculated determinant income, the difference, and the final estimated reduction amount.
-   **Tooltips:** Help icons (`?`) provide explanations for various input fields and results.
-   **Data Persistence:** The user can save their entered data to the browser's local storage and load it back later.
-   **Print Functionality:** The user can print the page to keep a record of the estimation.

## 3. Technical Architecture
-   **Platform:** Static Single Page Application (SPA).
-   **Technologies:** Vanilla JavaScript (ES6+), HTML5, and CSS3. No external frameworks or libraries.
-   **Deployment:** The application is hosted on GitHub Pages. All necessary files (`index.html`, `script.js`, `style.css`, and `.csv` data files) must be located in the `/docs` directory.
-   **Data Source:** All parameters are stored in and loaded from CSV files named with the corresponding year (e.g., `parametres_generaux_2026.csv`).

## 4. Coding Standards & Conventions
-   **Code Language:** All JavaScript code, including variable names, function names, and comments, must be in **English**.
-   **Modularity:** The code should be clean, well-organized, and modular.
-   **Asynchronous Operations:** Use modern `async/await` syntax for handling `fetch` calls.
-   **Clarity:** The code should be easy to read and maintain.

## 5. Workflow Instructions for Gemini
-   **Propose a Plan:** Before writing any code, briefly outline your plan.
-   **Automatic Commits:** After successfully applying any code changes, corrections, or new features, you **must** commit them to the local git repository. The commit message should be descriptive and written in **French**.
-   **Adherence to Standards:** Rigorously follow all the standards and conventions defined in this document.
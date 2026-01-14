document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const DEFAULT_YEAR = '2026';
    const LOCAL_STORAGE_KEY = 'primeReductionData';

    // A configuration object for all inputs that need to be validated.
    const formInputs = [
        'annee-calcul', 'statut-civil', 'region', 'nombre-adultes', 
        'nombre-jeunes', 'nombre-enfants', 'revenu-net', 'caisse-maladie',
        'reduction-prime', 'autres-primes', 'prevoyance-conjoint',
        'prevoyance-conjointe', 'rachat-assurance', 'interets-passifs',
        'frais-immeubles', 'fortune-imposable'
    ];

    // --- STATE ---
    let csvData = {
        config: {},
        incomeLimits: [],
        rateGrid: []
    };
    let areListenersActive = true; // Prevents clearing results when programmatically loading data

    // --- DOM Element Cache ---
    // Caching all elements on startup for performance
    const elements = {};
    const allElementIds = [
        'annee-calcul', 'statut-civil', 'region', 'nombre-adultes', 'nombre-jeunes', 'nombre-enfants',
        'revenu-net', 'caisse-maladie', 'reduction-prime', 'autres-primes', 'prevoyance-conjoint',
        'prevoyance-conjointe', 'rachat-assurance', 'interets-passifs', 'frais-immeubles', 'fortune-imposable',
        'determinant-revenu-net', 'determinant-caisse-maladie', 'determinant-reduction-prime',
        'determinant-autres-primes', 'determinant-prevoyance-conjoint', 'determinant-prevoyance-conjointe',
        'determinant-rachat-assurance', 'determinant-interets-passifs', 'determinant-frais-immeubles',
        'determinant-fortune-imposable', 'total-determinant-sum',
        'limite-revenu', 'revenu-determinant-calcule', 'diff-valeur', 'diff-percent',
        'taux-reduction-applicable', 'droit-reduction', 'breakdown-body', 'breakdown-foot',
        'calculate-btn', 'print-btn', 'save-btn',
        'toast-notification', 'toast-load-yes', 'toast-load-no',
        'start-assistant-btn', 'close-assistant-btn', 'assistant-modal',
        'validation-error-banner' // Placeholder for new banner
    ];

    // Add a banner to the top of section 2 for validation errors
    const validationBanner = document.createElement('div');
    validationBanner.id = 'validation-error-banner';
    validationBanner.className = 'validation-error';
    validationBanner.style.display = 'none';
    const section2 = document.querySelector('h2:nth-child(1) + .input-section, .input-section:nth-child(2)'); // Find section 2
    if(section2) {
       const h2 = section2.querySelector('h2');
       if(h2) h2.parentNode.insertBefore(validationBanner, h2.nextSibling);
    }
    
    allElementIds.forEach(id => {
        elements[id] = document.getElementById(id);
    });
    elements.validationErrorBanner = validationBanner;


    // --- CORE UI FUNCTIONS ---

    const clearResults = () => {
        console.log("Clearing results display.");
        const resultIds = ['limite-revenu', 'revenu-determinant-calcule', 'diff-valeur', 'diff-percent', 'taux-reduction-applicable', 'droit-reduction'];
        resultIds.forEach(id => {
            if (elements[id]) {
                elements[id].textContent = '...';
                elements[id].classList.remove('negative-value');
            }
        });
        if (elements.breakdownBody) elements.breakdownBody.innerHTML = '';
        if (elements.breakdownFoot) elements.breakdownFoot.innerHTML = '';
    };

    const clearValidationErrors = () => {
        formInputs.forEach(id => {
            elements[id]?.classList.remove('input-error');
        });
        if(elements.validationErrorBanner) elements.validationErrorBanner.style.display = 'none';
    };

    const showValidationError = (message) => {
        if(elements.validationErrorBanner){
            elements.validationErrorBanner.textContent = message;
            elements.validationErrorBanner.style.display = 'block';
        }
    };


    // --- VALIDATION ---

    const validateInputs = () => {
        let allValid = true;
        clearValidationErrors();

        formInputs.forEach(id => {
            const el = elements[id];
            if (el && el.value.trim() === '') {
                el.classList.add('input-error');
                allValid = false;
            }
        });
        
        if (!allValid) {
            showValidationError("Veuillez remplir tous les champs marqués en rouge.");
        }
        return allValid;
    };


    // --- DATA & CALCULATION ---

    const parseInput = (id) => {
        const el = elements[id];
        if (!el) return 0;
        const value = parseFloat(String(el.value).replace(/['\s]/g, ''));
        return isNaN(value) ? 0 : value;
    };

    const loadDataForYear = async (year) => {
        try {
            const [paramsRes, limitsRes, ratesRes] = await Promise.all([
                fetch(`parametres_generaux_${year}.csv`),
                fetch(`limites_revenu_determinant_${year}.csv`),
                fetch(`grille_lissage_des_taux_paliers_f_${year}.csv`)
            ]);

            if (!paramsRes.ok || !limitsRes.ok || !ratesRes.ok) throw new Error(`Could not fetch data for year ${year}`);

            const [paramsText, limitsText, ratesText] = await Promise.all([paramsRes.text(), limitsRes.text(), ratesRes.text()]);

            csvData.config = parseKeyValueCSV(paramsText);
            csvData.incomeLimits = parseDataCSV(limitsText);
            csvData.rateGrid = parseDataCSV(ratesText);
            return true;

        } catch (error) {
            console.warn(error);
            return false;
        }
    };
    
    const parseKeyValueCSV = (text) => text.trim().split('\n').slice(1).reduce((acc, line) => {
        const [key, value] = line.split(',');
        acc[key.trim()] = isNaN(Number(value)) ? value : Number(value);
        return acc;
    }, {});

    const parseDataCSV = (text) => {
        const lines = text.trim().split('\n');
        const header = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',');
            return header.reduce((obj, nextKey, index) => {
                const val = values[index];
                obj[nextKey] = isNaN(Number(val)) ? val.trim() : Number(val);
                return obj;
            }, {});
        });
    };

    const calculateAndDisplayResults = () => {
        // Plausibility Check
        if (parseInput('revenu-net') < 0) {
            showValidationError("Le revenu net ne peut pas être négatif.");
            elements['revenu-net'].classList.add('input-error');
            return;
        }

        const situation = {
            statut: elements['statut-civil'].value,
            region: parseInt(elements.region.value, 10),
            adultes: parseInput('nombre-adultes'),
            jeunes: parseInput('nombre-jeunes'),
            enfants: parseInput('nombre-enfants'),
        };
        const nbEnfantsTotal = situation.jeunes + situation.enfants;
        
        const limitEntry = csvData.incomeLimits.find(l => l.situation === situation.statut && l.children === nbEnfantsTotal);
        if (!limitEntry) {
            showValidationError("Impossible de trouver une limite de revenu pour la situation familiale spécifiée.");
            return;
        }
        
        // Calculate determinant income
        const totalDeterminant = calculateDeterminantIncome();
        
        const incomeLimit = limitEntry.limit_revenu_determinant;
        const diffValeur = incomeLimit - totalDeterminant;
        const diffPercent = incomeLimit > 0 ? (diffValeur / incomeLimit) * 100 : 0;

        // Display results
        elements.limiteRevenu.textContent = formatCurrency(incomeLimit);
        elements.revenuDeterminantCalcule.textContent = formatCurrency(totalDeterminant);
        elements.diffValeur.textContent = formatCurrency(diffValeur);
        elements.diffPercent.textContent = `${diffPercent.toFixed(2)} %`;
        elements.diffValeur.classList.toggle('negative-value', diffValeur < 0);
        elements.diffPercent.classList.toggle('negative-value', diffValeur < 0);

        if (diffValeur < 0) {
            elements.droitReduction.textContent = "Non";
            elements.tauxReductionApplicable.textContent = 'Non applicable';
            elements.breakdownBody.innerHTML = '';
            elements.breakdownFoot.innerHTML = '';
            return;
        }

        elements.droitReduction.textContent = "Oui";
        
        const rateEntry = csvData.rateGrid.find(r => diffPercent >= r.revenu_min_percent && diffPercent <= r.revenu_max_percent);
        const reductionRatePercent = rateEntry ? rateEntry.taux_applique_prime_moyenne_percent : 0;
        elements.tauxReductionApplicable.textContent = `${reductionRatePercent.toFixed(2)} %`;

        // Display breakdown
        calculateAndDisplayBreakdown(situation, reductionRatePercent);
    };

    const calculateDeterminantIncome = () => {
        const inputs = {
            revenuNet: parseInput('revenu-net'),
            caisseMaladie: parseInput('caisse-maladie'),
            reductionPrime: parseInput('reduction-prime'),
            autresPrimes: parseInput('autres-primes'),
            prevoyanceConjoint: parseInput('prevoyance-conjoint'),
            prevoyanceConjointe: parseInput('prevoyance-conjointe'),
            rachatAssurance: parseInput('rachat-assurance'),
            interetsPassifs: parseInput('interets-passifs'),
            fraisImmeubles: parseInput('frais-immeubles'),
            fortuneImposable: parseInput('fortune-imposable'),
        };

        const determinants = {
            revenuNet: inputs.revenuNet, // Already checked for > 0
            caisseMaladie: Math.max(0, inputs.caisseMaladie),
            reductionPrime: -Math.max(0, inputs.reductionPrime),
            autresPrimes: Math.max(0, inputs.autresPrimes),
            prevoyanceConjoint: Math.max(0, inputs.prevoyanceConjoint),
            prevoyanceConjointe: Math.max(0, inputs.prevoyanceConjointe),
            rachatAssurance: Math.max(0, inputs.rachatAssurance - (csvData.config.franchise_rachat_lpp || 0)),
            interetsPassifs: Math.max(0, inputs.interetsPassifs - (csvData.config.franchise_interets_passifs || 0)),
            fraisImmeubles: Math.max(0, inputs.fraisImmeubles - (csvData.config.franchise_frais_immeubles || 0)),
            fortuneImposable: Math.max(0, inputs.fortuneImposable) / 20,
        };

        // Update determinant column in UI
        Object.keys(determinants).forEach(key => {
            const elId = `determinant-${key.charAt(0).toLowerCase() + key.slice(1)}`;
            if (elements[elId]) elements[elId].textContent = formatCurrency(determinants[key]);
        });

        const total = Object.values(determinants).reduce((sum, val) => sum + val, 0);
        elements.totalDeterminantSum.textContent = formatCurrency(total);
        return total;
    };
    
    const calculateAndDisplayBreakdown = (situation, reductionRatePercent) => {
        const { config } = csvData;
        const premiums = {
            adult: situation.region === 1 ? config.pm_adulte_reg1 : config.pm_adulte_reg2,
            young: situation.region === 1 ? config.pm_jeune_reg1 : config.pm_jeune_reg2,
            child: situation.region === 1 ? config.pm_enfant_reg1 : config.pm_enfant_reg2,
        };
        
        let totalAnnualReduction = 0;
        let breakdownHTML = '';

        if (situation.adultes > 0) {
            const reduction = (situation.adultes * premiums.adult) * (reductionRatePercent / 100) * 12;
            breakdownHTML += `<tr><td>Adultes</td><td>${formatCurrency(premiums.adult)}</td><td>${reductionRatePercent.toFixed(2)} %</td><td>${formatCurrency(reduction)}</td></tr>`;
            totalAnnualReduction += reduction;
        }
        if (situation.jeunes > 0) {
            const reduction = (situation.jeunes * premiums.young) * ((config.taux_reduction_jeune || 0) / 100) * 12;
            breakdownHTML += `<tr><td>Jeunes (19-25 ans)</td><td>${formatCurrency(premiums.young)}</td><td>${(config.taux_reduction_jeune || 0).toFixed(2)} %</td><td>${formatCurrency(reduction)}</td></tr>`;
            totalAnnualReduction += reduction;
        }
        if (situation.enfants > 0) {
            const reduction = (situation.enfants * premiums.child) * ((config.taux_reduction_enfant || 0) / 100) * 12;
            breakdownHTML += `<tr><td>Enfants (0-18 ans)</td><td>${formatCurrency(premiums.child)}</td><td>${(config.taux_reduction_enfant || 0).toFixed(2)} %</td><td>${formatCurrency(reduction)}</td></tr>`;
            totalAnnualReduction += reduction;
        }

        elements.breakdownBody.innerHTML = breakdownHTML;
        elements.breakdownFoot.innerHTML = `<tr><td colspan="3">Total Réductions</td><td>${formatCurrency(totalAnnualReduction)}</td></tr>`;
    };

    const formatCurrency = (value) => `${Math.round(value).toLocaleString('fr-CH')} CHF`;


    // --- LOCAL STORAGE ---

    const saveData = () => {
        const data = formInputs.reduce((acc, id) => {
            acc[id] = elements[id]?.value || '';
            return acc;
        }, {});
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        alert('Vos données ont été sauvegardées localement.');
    };
    
    const loadData = () => {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            const data = JSON.parse(savedData);
            areListenersActive = false; // Disable listeners
            formInputs.forEach(id => {
                if (elements[id] && data[id] !== undefined) {
                    elements[id].value = data[id];
                }
            });
            areListenersActive = true; // Re-enable listeners
            clearValidationErrors();
            calculateDeterminantIncome(); // Update determinant table after loading
            alert('Les données sauvegardées ont été chargées.');
        }
    };

    const deleteData = () => {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        console.log("Saved data deleted.");
    };

    const handleStorageBanner = () => {
        if (localStorage.getItem(LOCAL_STORAGE_KEY)) {
            elements['toast-notification'].style.display = 'flex';
        }
        elements['toast-load-yes'].addEventListener('click', () => {
            loadData();
            elements['toast-notification'].style.display = 'none';
        });
        elements['toast-load-no'].addEventListener('click', () => {
            deleteData();
            elements['toast-notification'].style.display = 'none';
        });
    };


    // --- EVENT HANDLERS ---

    const handleCalculateClick = () => {
        if (validateInputs()) {
            calculateAndDisplayResults();
        }
    };

    const handleInputChange = (event) => {
        if (!areListenersActive) return;
        
        // When user types, clear errors and results
        clearResults();
        if (event.target) {
            event.target.classList.remove('input-error');
        }
        // Live update determinant table
        calculateDeterminantIncome();
    };

    const handleYearChange = async () => {
        const year = elements['annee-calcul'].value;
        const success = await loadDataForYear(year);
        if (!success) {
            alert(`Les données pour l'année ${year} n'ont pas pu être trouvées. Retour à l'année de référence ${DEFAULT_YEAR}.`);
            elements['annee-calcul'].value = DEFAULT_YEAR;
            await loadDataForYear(DEFAULT_YEAR);
        }
        handleInputChange({ target: null }); // Clear results after year change
    };

    const handlePrint = () => window.print();

    // --- INITIALIZATION ---
    
    const init = async () => {
        elements['calculate-btn'].addEventListener('click', handleCalculateClick);
        elements.saveBtn.addEventListener('click', saveData);
        elements.printBtn.addEventListener('click', handlePrint);
        elements['annee-calcul'].addEventListener('change', handleYearChange);
        
        // Use event delegation for input changes
        const inputSections = document.querySelectorAll('.input-section');
        inputSections.forEach(section => {
            section.addEventListener('input', handleInputChange);
        });

        handleStorageBanner();
        clearResults();
        await handleYearChange(); // Load data for initial year
    };

    init();
});
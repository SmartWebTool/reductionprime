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
    const elements = {};
    const allElementIds = [
        // Form inputs
        'annee-calcul', 'statut-civil', 'region', 'nombre-adultes', 'nombre-jeunes', 'nombre-enfants',
        'revenu-net', 'caisse-maladie', 'reduction-prime', 'autres-primes', 'prevoyance-conjoint',
        'prevoyance-conjointe', 'rachat-assurance', 'interets-passifs', 'frais-immeubles', 'fortune-imposable',
        // Determinant value displays
        'determinant-revenu-net', 'determinant-caisse-maladie', 'determinant-reduction-prime',
        'determinant-autres-primes', 'determinant-prevoyance-conjoint', 'determinant-prevoyance-conjointe',
        'determinant-rachat-assurance', 'determinant-interets-passifs', 'determinant-frais-immeubles',
        'determinant-fortune-imposable', 'total-determinant-sum',
        // Result displays
        'limite-revenu', 'revenu-determinant-calcule', 'diff-valeur', 'diff-percent',
        'taux-reduction-applicable', 'droit-reduction', 'breakdown-body', 'breakdown-foot',
        // Buttons and UI elements
        'calculate-btn', 'print-btn', 'save-btn',
        'toast-notification', 'toast-load-yes', 'toast-load-no',
        'start-assistant-btn', 
        // Assistant Modal elements
        'assistant-modal', 'assistant-title', 'assistant-help-text', 'assistant-input-container',
        'assistant-validation-error', 'assistant-progress-bar', 'assistant-prev-btn', 
        'assistant-next-btn', 'assistant-skip-btn', 'close-assistant-btn'
    ];
    
    allElementIds.forEach(id => {
        elements[id] = document.getElementById(id);
    });

    const validationBanner = document.createElement('div');
    validationBanner.id = 'validation-error-banner';
    validationBanner.className = 'validation-error';
    validationBanner.style.display = 'none';
    const section1 = document.querySelector('.input-section'); // First section
    if (section1) {
        const h2 = section1.querySelector('h2');
        if (h2) h2.parentNode.insertBefore(validationBanner, h2.nextSibling);
    }
    elements.validationErrorBanner = validationBanner;


    // --- CORE UI FUNCTIONS ---
    const clearResults = () => {
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

        for (const id of formInputs) {
            const el = elements[id];
            if (el && el.value.trim() === '') {
                el.classList.add('input-error');
                allValid = false;
            }
        }
        
        if (!allValid) {
            showValidationError("Veuillez remplir tous les champs marqués en rouge.");
            window.scrollTo(0, 0);
        }
        return allValid;
    };

    // --- DATA & CALCULATION (existing functions - condensed for brevity) ---
    const parseInput = (id) => {
        const el = elements[id];
        if (!el) return 0;
        const value = parseFloat(String(el.value).replace(/['\s]/g, ''));
        return isNaN(value) ? 0 : value;
    };
    const loadDataForYear = async (year) => {
        try {
            const [paramsRes, limitsRes, ratesRes] = await Promise.all([
                fetch(`parametres_generaux_${year}.csv`), fetch(`limites_revenu_determinant_${year}.csv`), fetch(`grille_lissage_des_taux_paliers_f_${year}.csv`)
            ]);
            if (!paramsRes.ok || !limitsRes.ok || !ratesRes.ok) throw new Error(`Could not fetch data for year ${year}`);
            const [paramsText, limitsText, ratesText] = await Promise.all([paramsRes.text(), limitsRes.text(), ratesRes.text()]);
            csvData.config = parseKeyValueCSV(paramsText);
            csvData.incomeLimits = parseDataCSV(limitsText);
            csvData.rateGrid = parseDataCSV(ratesText);
            return true;
        } catch (error) { console.warn(error); return false; }
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
        if (parseInput('revenu-net') < 0) {
            showValidationError("Le revenu net ne peut pas être négatif.");
            elements['revenu-net'].classList.add('input-error');
            return;
        }
        const situation = {
            statut: elements['statut-civil'].value, region: parseInt(elements.region.value, 10),
            adultes: parseInput('nombre-adultes'), jeunes: parseInput('nombre-jeunes'), enfants: parseInput('nombre-enfants'),
        };
        const nbEnfantsTotal = situation.jeunes + situation.enfants;
        const limitEntry = csvData.incomeLimits.find(l => l.situation === situation.statut && l.children === nbEnfantsTotal);
        if (!limitEntry) { showValidationError("Impossible de trouver une limite de revenu pour la situation familiale spécifiée."); return; }
        const totalDeterminant = calculateDeterminantIncome();
        const incomeLimit = limitEntry.limit_revenu_determinant;
        const diffValeur = incomeLimit - totalDeterminant;
        const diffPercent = incomeLimit > 0 ? (diffValeur / incomeLimit) * 100 : 0;
        elements.limiteRevenu.textContent = formatCurrency(incomeLimit);
        elements.revenuDeterminantCalcule.textContent = formatCurrency(totalDeterminant);
        elements.diffValeur.textContent = formatCurrency(diffValeur);
        elements.diffPercent.textContent = `${diffPercent.toFixed(2)} %`;
        elements.diffValeur.classList.toggle('negative-value', diffValeur < 0);
        elements.diffPercent.classList.toggle('negative-value', diffValeur < 0);
        if (diffValeur < 0) {
            elements.droitReduction.textContent = "Non";
            elements.tauxReductionApplicable.textContent = 'Non applicable';
            elements.breakdownBody.innerHTML = ''; elements.breakdownFoot.innerHTML = ''; return;
        }
        elements.droitReduction.textContent = "Oui";
        const rateEntry = csvData.rateGrid.find(r => diffPercent >= r.revenu_min_percent && diffPercent <= r.revenu_max_percent);
        const reductionRatePercent = rateEntry ? rateEntry.taux_applique_prime_moyenne_percent : 0;
        elements.tauxReductionApplicable.textContent = `${reductionRatePercent.toFixed(2)} %`;
        calculateAndDisplayBreakdown(situation, reductionRatePercent);
    };
    const calculateDeterminantIncome = () => {
        const inputs = formInputs.slice(6).reduce((acc, id) => { acc[id.replace(/-/g, '_')] = parseInput(id); return acc; }, {});
        const determinants = {
            revenuNet: inputs.revenu_net, caisseMaladie: Math.max(0, inputs.caisse_maladie),
            reductionPrime: -Math.max(0, inputs.reduction_prime), autresPrimes: Math.max(0, inputs.autres_primes),
            prevoyanceConjoint: Math.max(0, inputs.prevoyance_conjoint), prevoyanceConjointe: Math.max(0, inputs.prevoyance_conjointe),
            rachatAssurance: Math.max(0, inputs.rachat_assurance - (csvData.config.franchise_rachat_lpp || 0)),
            interetsPassifs: Math.max(0, inputs.interets_passifs - (csvData.config.franchise_interets_passifs || 0)),
            fraisImmeubles: Math.max(0, inputs.frais_immeubles - (csvData.config.franchise_frais_immeubles || 0)),
            fortuneImposable: Math.max(0, inputs.fortune_imposable) / 20,
        };
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
        let totalAnnualReduction = 0; let breakdownHTML = '';
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

    // --- LOCAL STORAGE (existing functions) ---
    const saveData = () => {
        const data = formInputs.reduce((acc, id) => { acc[id] = elements[id]?.value || ''; return acc; }, {});
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        alert('Vos données ont été sauvegardées localement.');
    };
    const loadData = () => {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            const data = JSON.parse(savedData);
            areListenersActive = false;
            formInputs.forEach(id => { if (elements[id] && data[id] !== undefined) elements[id].value = data[id]; });
            areListenersActive = true;
            clearValidationErrors();
            calculateDeterminantIncome();
            alert('Les données sauvegardées ont été chargées.');
        }
    };
    const deleteData = () => { localStorage.removeItem(LOCAL_STORAGE_KEY); };
    const handleStorageBanner = () => {
        if (localStorage.getItem(LOCAL_STORAGE_KEY)) elements['toast-notification'].style.display = 'flex';
        elements['toast-load-yes'].addEventListener('click', () => { loadData(); elements['toast-notification'].style.display = 'none'; });
        elements['toast-load-no'].addEventListener('click', () => { deleteData(); elements['toast-notification'].style.display = 'none'; });
    };

    // --- ASSISTANT LOGIC ---
    const assistant = {
        steps: [],
        currentStepIndex: 0,
        placeholders: new Map(),

        init() {
            this.defineSteps();
            elements.startAssistantBtn.addEventListener('click', () => this.start());
            elements.closeAssistantBtn.addEventListener('click', () => this.close());
            elements.assistantPrevBtn.addEventListener('click', () => this.prevStep());
            elements.assistantNextBtn.addEventListener('click', () => this.nextStep());
            elements.assistantSkipBtn.style.display = 'none'; // Skipping is disabled
        },

        defineSteps() {
            this.steps = formInputs.map(id => {
                const el = elements[id];
                const container = el.closest('.form-row, tr');
                const labelEl = container?.querySelector('label, td:first-child');
                const helpEl = container?.querySelector('.help-tooltip');
                return {
                    id, 
                    element: el,
                    wrapper: el.closest('.input-wrapper'),
                    title: labelEl?.textContent.trim() || id,
                    help: helpEl?.dataset.tooltip || "Veuillez saisir la valeur pour ce champ."
                };
            });
        },

        start() {
            if (this.steps.length === 0) return;
            this.currentStepIndex = 0;
            document.body.classList.add('assistant-active');

            // Swap real inputs with placeholders
            this.steps.forEach(step => {
                if (step.wrapper) {
                    const placeholder = document.createElement('div');
                    placeholder.className = step.wrapper.className;
                    this.placeholders.set(step.id, { placeholder, originalParent: step.wrapper.parentNode });
                    step.wrapper.parentNode.replaceChild(placeholder, step.wrapper);
                }
            });

            elements.assistantModal.style.display = 'flex';
            this.renderStep();
        },

        close() {
            document.body.classList.remove('assistant-active');
            elements.assistantModal.style.display = 'none';

            // Restore the current input to the main form
            const currentStep = this.steps[this.currentStepIndex];
            if (currentStep && currentStep.wrapper) {
                 const { placeholder, originalParent } = this.placeholders.get(currentStep.id) || {};
                 if(placeholder && originalParent) originalParent.replaceChild(currentStep.wrapper, placeholder);
            }
            // Update the live table
            calculateDeterminantIncome();
        },
        
        renderStep() {
            const step = this.steps[this.currentStepIndex];
            if (!step) return;

            // Before moving, restore previous step's input to its placeholder
            if (this.currentStepIndex > 0) {
                const prevStep = this.steps[this.currentStepIndex - 1];
                const { placeholder, originalParent } = this.placeholders.get(prevStep.id) || {};
                if(prevStep.wrapper && placeholder && originalParent) {
                    originalParent.replaceChild(placeholder, prevStep.wrapper);
                }
            }

            elements.assistantTitle.textContent = `${step.title} (${this.currentStepIndex + 1}/${this.steps.length})`;
            elements.assistantHelpText.textContent = step.help;
            elements.assistantValidationError.style.display = 'none';
            elements.assistantInputContainer.innerHTML = '';
            elements.assistantInputContainer.appendChild(step.wrapper);
            step.element.focus();

            elements.assistantPrevBtn.style.display = this.currentStepIndex > 0 ? 'inline-block' : 'none';

            if (this.currentStepIndex === this.steps.length - 1) {
                elements.assistantNextBtn.textContent = "Terminer";
            } else {
                elements.assistantNextBtn.textContent = "Suivant";
            }
        },

        nextStep() {
            const step = this.steps[this.currentStepIndex];
            const value = step.element.value.trim();
            if (value === '') {
                elements.assistantValidationError.textContent = "Veuillez entrer une valeur pour continuer.";
                elements.assistantValidationError.style.display = 'block';
                return;
            }

            if (this.currentStepIndex === this.steps.length - 1) {
                // Final step completed
                elements.assistantHelpText.textContent = "La saisie est maintenant terminée. Vous pouvez fermer cette fenêtre et cliquer sur 'Calculer' pour obtenir votre estimation.";
                elements.assistantInputContainer.innerHTML = '';
                elements.assistantNextBtn.disabled = true;
                elements.assistantPrevBtn.disabled = true;
            } else {
                this.currentStepIndex++;
                this.renderStep();
            }
        },

        prevStep() {
            if (this.currentStepIndex > 0) {
                // Before moving, restore current step's input
                const currentStep = this.steps[this.currentStepIndex];
                const { placeholder, originalParent } = this.placeholders.get(currentStep.id) || {};
                if (currentStep.wrapper && placeholder && originalParent) {
                     originalParent.replaceChild(placeholder, currentStep.wrapper);
                }

                this.currentStepIndex--;
                this.renderStep();
            }
        }
    };


    // --- EVENT HANDLERS ---
    const handleCalculateClick = () => { if (validateInputs()) calculateAndDisplayResults(); };
    const handleInputChange = (event) => {
        if (!areListenersActive) return;
        clearResults();
        if (event.target) event.target.classList.remove('input-error');
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
        handleInputChange({ target: null });
    };

    // --- INITIALIZATION ---
    const init = async () => {
        elements.calculateBtn.addEventListener('click', handleCalculateClick);
        elements.saveBtn.addEventListener('click', saveData);
        elements.printBtn.addEventListener('click', () => window.print());
        elements['annee-calcul'].addEventListener('change', handleYearChange);
        
        document.querySelector('.container').addEventListener('input', handleInputChange);

        assistant.init();
        handleStorageBanner();
        clearResults();
        await handleYearChange();
        calculateDeterminantIncome(); // Initial determinant calculation
    };

    init();
});

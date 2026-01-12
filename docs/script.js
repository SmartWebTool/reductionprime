document.addEventListener('DOMContentLoaded', () => {
    // --- Global Configuration and Data ---
    let config = {};
    let incomeLimits = [];
    let rateGrid = [];
    const DEFAULT_YEAR = 2026;

    // --- DOM Element References ---
    const elements = {
        anneeCalcul: document.getElementById('annee-calcul'),
        statutCivil: document.getElementById('statut-civil'),
        region: document.getElementById('region'),
        nombreAdultes: document.getElementById('nombre-adultes'),
        nombreJeunes: document.getElementById('nombre-jeunes'),
        nombreEnfants: document.getElementById('nombre-enfants'),
        revenuNet: document.getElementById('revenu-net'),
        caisseMaladie: document.getElementById('caisse-maladie'),
        autresPrimes: document.getElementById('autres-primes'),
        prevoyanceConjoint: document.getElementById('prevoyance-conjoint'),
        prevoyanceConjointe: document.getElementById('prevoyance-conjointe'),
        reductionPrime: document.getElementById('reduction-prime'),
        rachatAssurance: document.getElementById('rachat-assurance'),
        interetsPassifs: document.getElementById('interets-passifs'),
        fraisImmeubles: document.getElementById('frais-immeubles'),
        fortuneImposable: document.getElementById('fortune-imposable'),
        calculateBtn: document.getElementById('calculate-btn'),
        printBtn: document.getElementById('print-btn'),
        saveBtn: document.getElementById('save-btn'),
        loadBtn: document.getElementById('load-btn'),
    };

    const determinantElements = {
        revenuNet: document.getElementById('determinant-revenu-net'),
        caisseMaladie: document.getElementById('determinant-caisse-maladie'),
        autresPrimes: document.getElementById('determinant-autres-primes'),
        prevoyanceConjoint: document.getElementById('determinant-prevoyance-conjoint'),
        prevoyanceConjointe: document.getElementById('determinant-prevoyance-conjointe'),
        reductionPrime: document.getElementById('determinant-reduction-prime'),
        rachatAssurance: document.getElementById('determinant-rachat-assurance'),
        interetsPassifs: document.getElementById('determinant-interets-passifs'),
        fraisImmeubles: document.getElementById('determinant-frais-immeubles'),
        fortuneImposable: document.getElementById('determinant-fortune-imposable'),
    };

    const resultElements = {
        limiteRevenu: document.getElementById('limite-revenu'),
        revenuDeterminantCalcule: document.getElementById('revenu-determinant-calcule'),
        droitReduction: document.getElementById('droit-reduction'),
        totalDeterminantSum: document.getElementById('total-determinant-sum'),
        diffValeur: document.getElementById('diff-valeur'),
        diffPercent: document.getElementById('diff-percent'),
        tauxReductionApplicable: document.getElementById('taux-reduction-applicable'),
        breakdownBody: document.getElementById('breakdown-body'),
        breakdownFoot: document.getElementById('breakdown-foot'),
    };

    // --- Helper Functions ---
    const formatCurrency = (value) => `${Math.round(value).toLocaleString('fr-CH')} CHF`;
    const parseInput = (input) => {
        if (!input) return 0;
        const value = parseFloat(String(input.value).replace(',', '.'));
        return isNaN(value) ? 0 : value;
    };

    // --- Data Loading ---
    const parseKeyValueCSV = (text) => {
        const lines = text.trim().split('\n').slice(1);
        const newConfig = {};
        lines.forEach(line => {
            const [key, value] = line.split(',');
            newConfig[key.trim()] = isNaN(Number(value)) ? value : Number(value);
        });
        return newConfig;
    };

    const parseDataCSV = (text) => {
        const lines = text.trim().split('\n');
        const header = lines[0].split(',');
        return lines.slice(1).map(line => {
            const values = line.split(',');
            return header.reduce((obj, nextKey, index) => {
                const value = values[index];
                obj[nextKey.trim()] = isNaN(Number(value)) ? value.trim() : Number(value);
                return obj;
            }, {});
        });
    };

    const loadDataForYear = async (year) => {
        const urls = {
            params: `parametres_generaux_${year}.csv`,
            limits: `limites_revenu_determinant_${year}.csv`,
            rates: `grille_lissage_des_taux_paliers_f_${year}.csv`,
        };

        try {
            const [paramsText, limitsText, ratesText] = await Promise.all([
                fetch(urls.params).then(res => { if (!res.ok) throw new Error(res.statusText); return res.text(); }),
                fetch(urls.limits).then(res => { if (!res.ok) throw new Error(res.statusText); return res.text(); }),
                fetch(urls.rates).then(res => { if (!res.ok) throw new Error(res.statusText); return res.text(); }),
            ]);
            
            config = parseKeyValueCSV(paramsText);
            incomeLimits = parseDataCSV(limitsText);
            rateGrid = parseDataCSV(ratesText);

            return true; // Success
        } catch (error) {
            console.warn(`Could not load data for year ${year}. Error:`, error);
            return false; // Failure
        }
    };

    // --- Core Functions ---
    const resetResults = () => {
        Object.values(resultElements).forEach(el => {
            if (el.tagName === 'TBODY' || el.tagName === 'TFOOT') el.innerHTML = '';
            else if(el) {
                el.textContent = '...';
                el.classList.remove('negative-value');
            }
        });
        if (resultElements.totalDeterminantSum) {
            resultElements.totalDeterminantSum.textContent = '0 CHF';
        }
    };

    const updateDeterminantTable = () => {
        if (!config || Object.keys(config).length === 0) return 0; // Don't calculate if config isn't loaded

        const inputs = {
            revenuNet: parseInput(elements.revenuNet),
            caisseMaladie: parseInput(elements.caisseMaladie),
            autresPrimes: parseInput(elements.autresPrimes),
            prevoyanceConjoint: parseInput(elements.prevoyanceConjoint),
            prevoyanceConjointe: parseInput(elements.prevoyanceConjointe),
            reductionPrime: parseInput(elements.reductionPrime),
            rachatAssurance: parseInput(elements.rachatAssurance),
            interetsPassifs: parseInput(elements.interetsPassifs),
            fraisImmeubles: parseInput(elements.fraisImmeubles),
            fortune: parseInput(elements.fortuneImposable),
        };

        const determinants = {
            revenuNet: Math.max(0, inputs.revenuNet),
            caisseMaladie: Math.max(0, inputs.caisseMaladie),
            autresPrimes: Math.max(0, inputs.autresPrimes),
            prevoyanceConjoint: Math.max(0, inputs.prevoyanceConjoint),
            prevoyanceConjointe: Math.max(0, inputs.prevoyanceConjointe),
            reductionPrime: Math.max(0, inputs.reductionPrime),
            rachatAssurance: Math.max(0, inputs.rachatAssurance - config.franchise_rachat_lpp),
            interetsPassifs: Math.max(0, inputs.interetsPassifs - config.franchise_interets_passifs),
            fraisImmeubles: Math.max(0, inputs.fraisImmeubles - config.franchise_frais_immeubles),
            fortuneImposable: Math.max(0, inputs.fortune) / 20, // FIX: Fortune can't be negative for determinant value
        };

        Object.keys(determinantElements).forEach(key => {
            if (determinantElements[key]) {
                 determinantElements[key].textContent = formatCurrency(determinants[key] || 0);
            }
        });

        // FIX: The reductionPrime was being subtracted twice. It's already in the sum as a negative.
        const totalDeterminant = Object.values(determinants).reduce((sum, value) => sum + value, 0); 
        resultElements.totalDeterminantSum.textContent = formatCurrency(totalDeterminant);
        return totalDeterminant;
    };
    
    const calculateResults = () => {
        const totalDeterminant = updateDeterminantTable();
        if (!config || Object.keys(config).length === 0) return;

        const inputs = {
            statut: elements.statutCivil.value,
            region: parseInt(elements.region.value, 10),
            adultes: parseInput(elements.nombreAdultes),
            jeunes: parseInput(elements.nombreJeunes),
            enfantsNb: parseInput(elements.nombreEnfants),
        };

        if (inputs.adultes === 0) {
            alert("Le nombre d'adultes doit être d'au moins 1 pour un calcul valide.");
            return;
        }

        const enfants = inputs.jeunes + inputs.enfantsNb;

        const limitEntry = incomeLimits.find(l => l.situation === inputs.statut && l.children === enfants);
        const incomeLimit = limitEntry ? limitEntry.limit_revenu_determinant : 0;
        resultElements.limiteRevenu.textContent = formatCurrency(incomeLimit);
        resultElements.revenuDeterminantCalcule.textContent = formatCurrency(totalDeterminant);
        
        const diffValeur = incomeLimit - totalDeterminant;
        const diffPercent = incomeLimit > 0 ? (diffValeur / incomeLimit) * 100 : 0;

        resultElements.diffValeur.textContent = formatCurrency(diffValeur);
        resultElements.diffPercent.textContent = `${diffPercent.toFixed(2)} %`;
        [resultElements.diffValeur, resultElements.diffPercent].forEach(el => el.classList.toggle('negative-value', diffValeur < 0));
        
        resultElements.breakdownBody.innerHTML = '';
        resultElements.breakdownFoot.innerHTML = '';
        resultElements.tauxReductionApplicable.textContent = '...';

        if (diffValeur < 0) {
            resultElements.droitReduction.textContent = "Non";
            resultElements.tauxReductionApplicable.textContent = 'Non applicable';
            return;
        }

        resultElements.droitReduction.textContent = "Oui";
        
        let reductionRatePercent = 0;
        const rateEntry = rateGrid.find(r => diffPercent >= r.revenu_min_percent && diffPercent <= r.revenu_max_percent);
        if (rateEntry) reductionRatePercent = rateEntry.taux_applique_prime_moyenne_percent;
        resultElements.tauxReductionApplicable.textContent = `${reductionRatePercent.toFixed(2)} %`;

        const premiums = {
            adult: inputs.region === 1 ? config.pm_adulte_reg1 : config.pm_adulte_reg2,
            young: inputs.region === 1 ? config.pm_jeune_reg1 : config.pm_jeune_reg2,
            child: inputs.region === 1 ? config.pm_enfant_reg1 : config.pm_enfant_reg2,
        };

        const adultAnnualReduction = (inputs.adultes * premiums.adult) * (reductionRatePercent / 100) * 12;
        const youngAnnualReduction = (inputs.jeunes * premiums.young) * (config.taux_reduction_jeune / 100) * 12;
        const childAnnualReduction = (inputs.enfantsNb * premiums.child) * (config.taux_reduction_enfant / 100) * 12;
        
        let totalAnnualReduction = 0;
        if (inputs.adultes > 0) {
            resultElements.breakdownBody.innerHTML += `<tr><td>Adultes</td><td>${formatCurrency(premiums.adult)}</td><td>${reductionRatePercent.toFixed(2)} %</td><td>${formatCurrency(adultAnnualReduction)}</td></tr>`;
            totalAnnualReduction += adultAnnualReduction;
        }
        if (inputs.jeunes > 0) {
            resultElements.breakdownBody.innerHTML += `<tr><td>Jeunes (19-25 ans)</td><td>${formatCurrency(premiums.young)}</td><td>${config.taux_reduction_jeune.toFixed(2)} %</td><td>${formatCurrency(youngAnnualReduction)}</td></tr>`;
            totalAnnualReduction += youngAnnualReduction;
        }
        if (inputs.enfantsNb > 0) {
            resultElements.breakdownBody.innerHTML += `<tr><td>Enfants (0-18 ans)</td><td>${formatCurrency(premiums.child)}</td><td>${config.taux_reduction_enfant.toFixed(2)} %</td><td>${formatCurrency(childAnnualReduction)}</td></tr>`;
            totalAnnualReduction += childAnnualReduction;
        }

        resultElements.breakdownFoot.innerHTML = `<tr><td colspan="3">Total Réductions</td><td>${formatCurrency(totalAnnualReduction)}</td></tr>`;
    };

    // --- Local Storage ---
    const saveData = () => {
        const dataToSave = {};
        Object.keys(elements).forEach(key => {
            const el = elements[key];
            if (el && el.id && el.value !== undefined) {
                 dataToSave[el.id] = el.value;
            }
        });
        localStorage.setItem('primeReductionData', JSON.stringify(dataToSave));
        // alert('Vos données ont été sauvegardées localement.');
    };

    const loadData = () => {
        const savedData = localStorage.getItem('primeReductionData');
        if (savedData) {
            const data = JSON.parse(savedData);
            Object.keys(data).forEach(key => {
                const el = document.getElementById(key);
                if (el) el.value = data[key];
            });
            return true;
        }
        return false;
    };
    
    const clearData = () => {
        localStorage.removeItem('primeReductionData');
        // This is a soft reset, consider a hard reset by reloading the page
        Object.values(elements).forEach(el => {
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                if(el.type !== 'submit' && el.type !== 'button') {
                     // Maybe reset to default values instead of blank
                     if (el.id === 'annee-calcul') el.value = DEFAULT_YEAR;
                     else if (el.matches('select')) el.selectedIndex = 0;
                     else el.value = el.id.includes('nombre') ? '0' : '';
                }
            }
        });
        updateDeterminantTable();
        resetResults();
    }

    // --- Event Handlers ---
    const printHandler = () => window.print();

    const handleDataLoadingAndRecalculate = async () => {
        const year = parseInput(elements.anneeCalcul);
        let success = await loadDataForYear(year);
        let fallbackUsed = false;

        if (!success) {
            fallbackUsed = true;
            success = await loadDataForYear(DEFAULT_YEAR);
            if(success) {
                elements.anneeCalcul.value = DEFAULT_YEAR;
                 alert(`Les données pour l'année ${year} n'ont pas pu être trouvées. Utilisation des données de l'année de référence ${DEFAULT_YEAR}.`);
            }
        }
        
        if(success) {
            calculateResults();
        } else {
             alert(`Erreur critique: Impossible de charger les données de base, même pour l'année de référence ${DEFAULT_YEAR}. Le calculateur ne peut pas fonctionner.`);
             resetResults();
        }
    };


    // --- ASSISTANT (WIZARD) LOGIC ---
    const assistant = {
        modal: document.getElementById('assistant-modal'),
        title: document.getElementById('assistant-title'),
        helpText: document.getElementById('assistant-help-text'),
        inputContainer: document.getElementById('assistant-input-container'),
        validationError: document.getElementById('assistant-validation-error'),
        progressBar: document.getElementById('assistant-progress-bar'),
        prevBtn: document.getElementById('assistant-prev-btn'),
        nextBtn: document.getElementById('assistant-next-btn'),
        skipBtn: document.getElementById('assistant-skip-btn'),
        
        steps: [],
        currentStepIndex: 0,
        skippedSteps: new Set(),
        isActive: false,
        originalParents: new Map(), // Stores {wrapperElement: originalParentNode}

        init() {
            this.defineSteps();
            document.getElementById('start-assistant-btn').addEventListener('click', () => this.start());
            document.getElementById('close-assistant-btn').addEventListener('click', () => this.close());
            this.prevBtn.addEventListener('click', () => this.prevStep());
            this.nextBtn.addEventListener('click', () => this.nextStep());
            this.skipBtn.addEventListener('click', () => this.skipStep());
            
            // Toast notification logic
            const toast = document.getElementById('toast-notification');
            if (localStorage.getItem('primeReductionData')) {
                toast.style.display = 'flex';
            }
            document.getElementById('toast-load-yes').addEventListener('click', () => {
                loadData();
                updateDeterminantTable();
                toast.style.display = 'none';
            });
            document.getElementById('toast-load-no').addEventListener('click', () => {
                clearData();
                toast.style.display = 'none';
            });
        },
        
        defineSteps() {
            const isPositiveNumber = (value) => {
                const num = parseFloat(value);
                return !isNaN(num) && num >= 0;
            };

            const stepElements = Array.from(document.querySelectorAll('[data-step-id]'));
            this.steps = stepElements.map(container => {
                const stepId = container.dataset.stepId;
                const inputEl = document.getElementById(stepId);
                const helpEl = container.querySelector('.help-tooltip');
                
                let titleText;
                let wrapperEl;

                if (container.tagName === 'TR') { // Section 2 table row
                    const rubrique = container.querySelector('td:nth-child(1)').textContent.trim();
                    const code = container.querySelector('td:nth-child(2)').textContent.trim();
                    titleText = `${rubrique} (code ${code})`;
                    wrapperEl = container.querySelector('td.input-wrapper');
                } else { // Section 1 form-row
                    const labelEl = container.querySelector('label');
                    titleText = labelEl ? labelEl.textContent.trim() : stepId;
                    wrapperEl = container.querySelector('.input-wrapper');
                }
                
                let validationFn = (value) => value !== ''; // Default validation
                let validationMsg = "Ce champ ne peut pas être vide.";

                if (inputEl.id.startsWith('nombre-')) {
                    validationFn = isPositiveNumber;
                    validationMsg = "Veuillez entrer un nombre positif (0 ou plus).";
                }
                if (inputEl.id === 'nombre-adultes') {
                    validationFn = (value) => parseFloat(value) >= 1;
                    validationMsg = "Le nombre d'adultes doit être d'au moins 1.";
                }
                // Check if it's a financial input that should be positive, excluding fortune (which can be negative)
                if (inputEl.type === 'text' && !inputEl.id.startsWith('nombre') && inputEl.id !== 'fortune-imposable') {
                    validationFn = isPositiveNumber;
                    validationMsg = "Veuillez entrer un montant positif.";
                }
                // For fortune, it can be negative but must be a number
                if (inputEl.id === 'fortune-imposable') {
                    validationFn = (value) => !isNaN(parseFloat(value));
                    validationMsg = "Veuillez entrer un nombre valide pour la fortune.";
                }


                return {
                    id: stepId,
                    element: inputEl,
                    wrapper: wrapperEl,
                    title: titleText,
                    help: helpEl ? helpEl.dataset.tooltip : "Aucune aide disponible pour ce champ.",
                    validate: validationFn,
                    validationMessage: validationMsg,
                    isCritical: inputEl.id === 'nombre-adultes'
                };
            });
        },

        start() {
            if (this.steps.length === 0) return;
            this.isActive = true;
            this.currentStepIndex = 0;
            this.skippedSteps.clear();
            
            // Store original parents for all wrappers when starting the assistant
            this.steps.forEach(step => {
                if (step.wrapper && step.wrapper.parentNode) {
                    this.originalParents.set(step.wrapper, step.wrapper.parentNode);
                }
            });

            this.modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent scrolling body
            this.renderStep();
        },

        close() {
            this.isActive = false;
            this.modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Restore scrolling body

            // Restore ALL elements to their original places
            this.originalParents.forEach((originalParent, wrapper) => {
                // Find the correct insertion point in the original parent
                const originalContainer = document.querySelector(`[data-step-id="${wrapper.closest('[data-step-id]').dataset.stepId}"]`);
                if (originalContainer) {
                    // Assuming wrapper is either .input-wrapper or td.input-wrapper inside a form-row or tr
                    // We need to re-insert it where it was originally.
                    // For form-row, wrapper is a div.input-wrapper, its original parent is the form-row.
                    // For table, wrapper is a td.input-wrapper, its original parent is the tr.
                    if (originalParent.querySelector(`#${wrapper.id}`)) { // Check if the element already exists
                        // If the element is already there, don't re-append. This might happen if 'close' is called
                        // multiple times or if there's a specific interaction.
                        // However, based on the logic, the element should always be in the inputContainer
                        // and needs to be moved back.
                    } else {
                        // Re-insert the wrapper
                        originalParent.appendChild(wrapper);
                    }
                }
            });
            this.originalParents.clear(); // Clear the map after restoring all elements
            updateDeterminantTable();
        },

        renderStep() {
            const step = this.steps[this.currentStepIndex];
            if (!step) return;

            // First, ensure the previously moved element is returned to its original place
            // before moving the new one. This prevents elements from being permanently removed.
            if (this.inputContainer.children.length > 0) {
                const previousWrapper = this.inputContainer.children[0];
                const previousStepId = previousWrapper.querySelector('input, select').id;
                const previousStep = this.steps.find(s => s.id === previousStepId);

                if (previousStep && this.originalParents.has(previousStep.wrapper)) {
                    this.originalParents.get(previousStep.wrapper).appendChild(previousStep.wrapper);
                }
            }
            
            this.title.textContent = `${step.title} (${this.currentStepIndex + 1}/${this.steps.length})`;
            this.helpText.textContent = step.help;
            this.validationError.style.display = 'none';

            // Move the input wrapper into the modal
            this.inputContainer.innerHTML = ''; // Clear previous content
            this.inputContainer.appendChild(step.wrapper);
            step.element.focus();

            // Update buttons
            this.prevBtn.style.display = this.currentStepIndex > 0 ? 'block' : 'none';
            this.skipBtn.style.display = step.isCritical ? 'none' : 'block';
            this.nextBtn.textContent = (this.currentStepIndex === this.steps.length - 1 && this.skippedSteps.size === 0) ? "Terminer" : "Suivant";

            this.renderProgressBar();
        },
        
        renderProgressBar() {
            this.progressBar.innerHTML = '';
            this.steps.forEach((step, index) => {
                const dot = document.createElement('div');
                dot.className = 'progress-dot';
                dot.title = step.title; // Add title for hover info
                if (index === this.currentStepIndex) {
                    dot.classList.add('current');
                } else if (this.skippedSteps.has(index)) {
                    dot.classList.add('skipped');
                } else if (step.element && step.validate(step.element.value) && step.element.value !== '') { // Check if value is not empty
                    dot.classList.add('answered');
                }
                this.progressBar.appendChild(dot);
            });
        },

        nextStep() {
            const step = this.steps[this.currentStepIndex];
            if (!step.validate(step.element.value)) {
                this.validationError.textContent = step.validationMessage;
                this.validationError.style.display = 'block';
                return;
            }

            this.skippedSteps.delete(this.currentStepIndex); // Mark as answered
            saveData(); // Save after each successful step

            if (this.currentStepIndex < this.steps.length - 1) {
                this.currentStepIndex++;
            } else {
                // End of the line, check for skipped steps
                const nextSkippedIndex = Array.from(this.skippedSteps).sort((a, b) => a - b).find(index => index >= 0); // Get smallest skipped index
                if (nextSkippedIndex !== undefined) {
                    this.currentStepIndex = nextSkippedIndex;
                } else {
                    this.close();
                    calculateResults(); // All questions answered
                    return;
                }
            }
            this.renderStep();
        },

        prevStep() {
            if (this.currentStepIndex > 0) {
                // Before moving back, put the current element back to its original parent
                const currentStep = this.steps[this.currentStepIndex];
                if (currentStep && this.originalParents.has(currentStep.wrapper)) {
                    this.originalParents.get(currentStep.wrapper).appendChild(currentStep.wrapper);
                }

                this.currentStepIndex--;
                this.renderStep();
            }
        },

        skipStep() {
            const step = this.steps[this.currentStepIndex];
            if (step.isCritical) return; // Critical steps cannot be skipped

            this.skippedSteps.add(this.currentStepIndex);
            
            // Move current element back to its original parent before skipping
            if (step && this.originalParents.has(step.wrapper)) {
                this.originalParents.get(step.wrapper).appendChild(step.wrapper);
            }

            if (this.currentStepIndex < this.steps.length - 1) {
                this.currentStepIndex++;
            } else {
                 // If at the end, find the next skipped question from the beginning
                 const nextSkippedIndex = Array.from(this.skippedSteps).sort((a, b) => a - b).find(index => index >= 0);
                 if (nextSkippedIndex !== undefined) {
                    this.currentStepIndex = nextSkippedIndex;
                 } else {
                    this.close(); // No more skipped questions
                    return;
                 }
            }
            this.renderStep();
        }
    };

    // --- Initialization ---
    const init = async () => {
        await handleDataLoadingAndRecalculate();
        assistant.init();

        // Attach event listeners
        // Need to ensure event listeners are attached only once, or handle potential duplicates if elements are moved
        Object.values(elements).forEach(el => {
            if (!el) return;
            // Remove existing listeners to prevent duplicates if init is called multiple times (e.g. from loadData)
            // This is a safety measure; ideally init() is called once.
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                if(el.id === 'annee-calcul') {
                    el.removeEventListener('change', handleDataLoadingAndRecalculate); // Remove existing
                    el.addEventListener('change', handleDataLoadingAndRecalculate); // Add new
                } else {
                    el.removeEventListener('input', updateDeterminantTable); // Remove existing
                    el.addEventListener('input', updateDeterminantTable); // Add new
                }
            }
        });

        elements.calculateBtn.addEventListener('click', calculateResults);
        elements.printBtn.addEventListener('click', printHandler);
        elements.saveBtn.addEventListener('click', () => {
            saveData();
            alert('Vos données ont été sauvegardées localement.');
        });
        elements.loadBtn.addEventListener('click', async () => {
            if(loadData()){
                await handleDataLoadingAndRecalculate();
                alert('Les données sauvegardées ont été chargées.');
            } else {
                alert('Aucune donnée sauvegardée trouvée.');
            }
        });
    };

    init();
});

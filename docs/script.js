document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const DEFAULT_YEAR = '2026';
    const LOCAL_STORAGE_KEY = 'primeReductionData';
    const formInputIds = [
        'annee-calcul', 'statut-civil', 'region', 'nombre-adultes', 'nombre-jeunes', 'nombre-enfants',
        'revenu-net', 'caisse-maladie', 'reduction-prime', 'autres-primes', 'prevoyance-conjoint',
        'prevoyance-conjointe', 'rachat-assurance', 'interets-passifs', 'frais-immeubles', 'fortune-imposable'
    ];

    // --- STATE ---
    let csvData = { config: {}, incomeLimits: [], rateGrid: [] };
    let areListenersActive = true;

    // --- DOM ELEMENT CACHE ---
    const elements = {};
    const allElementIds = [
        ...formInputIds,
        'determinant-revenu-net', 'determinant-caisse-maladie', 'determinant-reduction-prime',
        'determinant-autres-primes', 'determinant-prevoyance-conjoint', 'determinant-prevoyance-conjointe',
        'determinant-rachat-assurance', 'determinant-interets-passifs', 'determinant-frais-immeubles',
        'determinant-fortune-imposable', 'total-determinant-sum',
        'limite-revenu', 'revenu-determinant-calcule', 'diff-valeur', 'diff-percent',
        'taux-reduction-applicable', 'droit-reduction', 'breakdown-body', 'breakdown-foot',
        'calculate-btn', 'print-btn', 'save-btn', 'toast-notification', 'toast-load-yes', 'toast-load-no',
        'start-assistant-btn', 'assistant-modal', 'assistant-title', 'assistant-help-text', 'assistant-input-container',
        'assistant-validation-error', 'assistant-prev-btn', 'assistant-next-btn', 'close-assistant-btn'
    ];
    allElementIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            elements[id] = el;
        } else {
            console.warn(`Element with ID '${id}' not found.`);
        }
    });

    const validationBanner = document.createElement('div');
    validationBanner.id = 'validation-error-banner';
    validationBanner.className = 'validation-error';
    validationBanner.style.display = 'none';
    const firstSectionH2 = document.querySelector('.input-section > h2');
    if (firstSectionH2) {
        firstSectionH2.after(validationBanner);
    }
    elements.validationErrorBanner = validationBanner;


    // --- CORE UI & VALIDATION ---
    const clearResults = () => {
        ['limite-revenu', 'revenu-determinant-calcule', 'diff-valeur', 'diff-percent', 'taux-reduction-applicable', 'droit-reduction'].forEach(id => {
            if (elements[id]) {
                elements[id].textContent = '...';
                elements[id].classList.remove('negative-value');
            }
        });
        if (elements.breakdownBody) elements.breakdownBody.innerHTML = '';
        if (elements.breakdownFoot) elements.breakdownFoot.innerHTML = '';
    };

    const clearValidationErrors = () => {
        formInputIds.forEach(id => elements[id]?.classList.remove('input-error'));
        if (elements.validationErrorBanner) elements.validationErrorBanner.style.display = 'none';
    };

    const showValidationError = (message) => {
        if (elements.validationErrorBanner) {
            elements.validationErrorBanner.textContent = message;
            elements.validationErrorBanner.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const validateInputs = () => {
        clearValidationErrors();
        const invalidInputs = formInputIds.filter(id => elements[id] && elements[id].value.trim() === '');
        if (invalidInputs.length > 0) {
            invalidInputs.forEach(id => elements[id].classList.add('input-error'));
            showValidationError("Veuillez remplir tous les champs marqués en rouge.");
            return false;
        }
        return true;
    };


    // --- DATA & CALCULATION ---
    const parseInput = id => {
        const value = String(elements[id]?.value || '0').replace(/['\s]/g, '');
        return parseFloat(value) || 0;
    };

    const formatCurrency = value => `${Math.round(value).toLocaleString('fr-CH')} CHF`;

    const calculateDeterminantIncome = () => {
        const determinants = {
            revenuNet: parseInput('revenu-net'),
            caisseMaladie: parseInput('caisse-maladie'),
            reductionPrime: -parseInput('reduction-prime'),
            autresPrimes: parseInput('autres-primes'),
            prevoyanceConjoint: parseInput('prevoyance-conjoint'),
            prevoyanceConjointe: parseInput('prevoyance-conjointe'),
            rachatAssurance: Math.max(0, parseInput('rachat-assurance') - (csvData.config.franchise_rachat_lpp || 0)),
            interetsPassifs: Math.max(0, parseInput('interets-passifs') - (csvData.config.franchise_interets_passifs || 0)),
            fraisImmeubles: Math.max(0, parseInput('frais-immeubles') - (csvData.config.franchise_frais_immeubles || 0)),
            fortuneImposable: Math.max(0, parseInput('fortune-imposable')) / 20,
        };

        Object.entries(determinants).forEach(([key, value]) => {
            const elId = `determinant-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
            if (elements[elId]) elements[elId].textContent = formatCurrency(value);
        });

        const total = Object.values(determinants).reduce((sum, val) => sum + val, 0);
        if (elements.totalDeterminantSum) elements.totalDeterminantSum.textContent = formatCurrency(total);
        return total;
    };
    
    const calculateAndDisplayResults = () => {
        if (!validateInputs()) return;
        if (parseInput('revenu-net') < 0) {
            showValidationError("Le revenu net ne peut pas être négatif.");
            elements['revenu-net'].classList.add('input-error');
            return;
        }

        const totalDeterminant = calculateDeterminantIncome();
        const situation = {
            statut: elements['statut-civil'].value,
            enfants: parseInput('nombre-jeunes') + parseInput('nombre-enfants'),
            adultes: parseInput('nombre-adultes'),
            jeunes: parseInput('nombre-jeunes'),
            enfantsNb: parseInput('nombre-enfants'),
            region: parseInt(elements.region.value, 10)
        };

        const limitEntry = csvData.incomeLimits.find(l => l.situation === situation.statut && l.children === situation.enfants);
        if (!limitEntry) {
            showValidationError("Impossible de trouver les paramètres pour la situation familiale spécifiée.");
            return;
        }

        const { limit_revenu_determinant: incomeLimit } = limitEntry;
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
            elements.breakdownBody.innerHTML = '';
            elements.breakdownFoot.innerHTML = '';
            return;
        }

        elements.droitReduction.textContent = "Oui";
        const rateEntry = csvData.rateGrid.find(r => diffPercent >= r.revenu_min_percent && diffPercent <= r.revenu_max_percent);
        const reductionRatePercent = rateEntry ? rateEntry.taux_applique_prime_moyenne_percent : 0;
        elements.tauxReductionApplicable.textContent = `${reductionRatePercent.toFixed(2)} %`;

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
        if (situation.enfantsNb > 0) {
            const reduction = (situation.enfantsNb * premiums.child) * ((config.taux_reduction_enfant || 0) / 100) * 12;
            breakdownHTML += `<tr><td>Enfants (0-18 ans)</td><td>${formatCurrency(premiums.child)}</td><td>${(config.taux_reduction_enfant || 0).toFixed(2)} %</td><td>${formatCurrency(reduction)}</td></tr>`;
            totalAnnualReduction += reduction;
        }
        elements.breakdownBody.innerHTML = breakdownHTML;
        elements.breakdownFoot.innerHTML = `<tr><td colspan="3">Total Réductions</td><td>${formatCurrency(totalAnnualReduction)}</td></tr>`;
    };


    // --- DATA LOADING & STORAGE ---
    const loadDataForYear = async (year) => {
        try {
            const [p, l, r] = await Promise.all([
                fetch(`parametres_generaux_${year}.csv`).then(res => res.ok ? res.text() : Promise.reject(res.statusText)),
                fetch(`limites_revenu_determinant_${year}.csv`).then(res => res.ok ? res.text() : Promise.reject(res.statusText)),
                fetch(`grille_lissage_des_taux_paliers_f_${year}.csv`).then(res => res.ok ? res.text() : Promise.reject(res.statusText))
            ]);
            const parseKeyValueCSV = t => t.trim().split('\n').slice(1).reduce((a, ln) => (([k, v]) => (a[k.trim()] = isNaN(Number(v)) ? v : Number(v), a))(ln.split(',')), {});
            const parseDataCSV = t => {
                const [h, ...d] = t.trim().split('\n');
                const k = h.split(',').map(s => s.trim());
                return d.map(ln => ln.split(',').reduce((o, v, i) => (o[k[i]] = isNaN(Number(v)) ? v.trim() : Number(v), o), {}));
            };
            csvData = { config: parseKeyValueCSV(p), incomeLimits: parseDataCSV(l), rateGrid: parseDataCSV(r) };
            return true;
        } catch (e) { console.error(`Failed to load data for year ${year}:`, e); return false; }
    };
    
    const saveData = () => {
        const data = formInputIds.reduce((acc, id) => ({ ...acc, [id]: elements[id]?.value || '' }), {});
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        alert('Vos données ont été sauvegardées localement.');
    };

    const loadData = () => {
        const data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        if (Object.keys(data).length > 0) {
            areListenersActive = false;
            formInputIds.forEach(id => { if (elements[id] && data[id] !== undefined) elements[id].value = data[id]; });
            areListenersActive = true;
            clearValidationErrors();
            calculateDeterminantIncome();
            alert('Les données sauvegardées ont été chargées.');
        }
    };
    
    const handleStorageBanner = () => {
        if (!localStorage.getItem(LOCAL_STORAGE_KEY) || !elements['toast-notification']) return;
        elements['toast-notification'].style.display = 'flex';
        elements['toast-load-yes'].addEventListener('click', () => { loadData(); elements['toast-notification'].style.display = 'none'; }, { once: true });
        elements['toast-load-no'].addEventListener('click', () => { localStorage.removeItem(LOCAL_STORAGE_KEY); elements['toast-notification'].style.display = 'none'; }, { once: true });
    };


    // --- ASSISTANT LOGIC (REFACTORED & ROBUST) ---
    const assistant = {
        steps: [],
        currentStepIndex: 0,
        clone: null,
        
        init() {
            this.steps = formInputIds.map(id => {
                const el = elements[id];
                if (!el) return null;
                const container = el.closest('.form-row, tr');
                return {
                    id,
                    title: container?.querySelector('label, td:first-child')?.textContent.trim() || id,
                    help: container?.querySelector('.help-tooltip')?.dataset.tooltip || "Veuillez saisir la valeur pour ce champ."
                };
            }).filter(Boolean); // Filter out null steps if element not found

            if (elements.startAssistantBtn) elements.startAssistantBtn.addEventListener('click', () => this.start());
            if (elements.closeAssistantBtn) elements.closeAssistantBtn.addEventListener('click', () => this.close());
            if (elements.assistantPrevBtn) elements.assistantPrevBtn.addEventListener('click', () => this.prevStep());
            if (elements.assistantNextBtn) elements.assistantNextBtn.addEventListener('click', () => this.nextStep());
        },

        start() {
            if (this.steps.length === 0) return;
            this.currentStepIndex = 0;
            document.body.classList.add('assistant-active');
            elements.assistantNextBtn.disabled = false;
            elements.assistantPrevBtn.disabled = false;
            elements.assistantModal.style.display = 'flex';
            this.renderStep();
        },

        close() {
            if (this.clone) {
                const lastStepId = this.steps[this.currentStepIndex].id;
                elements[lastStepId].value = this.clone.value;
            }
            document.body.classList.remove('assistant-active');
            elements.assistantModal.style.display = 'none';
            if (elements.assistantInputContainer) elements.assistantInputContainer.innerHTML = '';
            calculateDeterminantIncome();
        },
        
        renderStep() {
            const step = this.steps[this.currentStepIndex];
            const originalElement = elements[step.id];

            this.clone = originalElement.cloneNode(true);
            this.clone.addEventListener('input', () => {
                if (elements.assistantValidationError) elements.assistantValidationError.style.display = 'none';
            });

            elements.assistantTitle.textContent = `${step.title} (${this.currentStepIndex + 1}/${this.steps.length})`;
            elements.assistantHelpText.textContent = step.help;
            elements.assistantValidationError.style.display = 'none';
            elements.assistantInputContainer.innerHTML = '';
            elements.assistantInputContainer.appendChild(this.clone);
            this.clone.focus();

            elements.assistantPrevBtn.style.display = this.currentStepIndex > 0 ? 'inline-block' : 'none';
            elements.assistantNextBtn.textContent = this.currentStepIndex === this.steps.length - 1 ? "Terminer" : "Suivant";
        },

        nextStep() {
            if (this.clone.value.trim() === '') {
                elements.assistantValidationError.textContent = "Veuillez entrer une valeur pour continuer.";
                elements.assistantValidationError.style.display = 'block';
                return;
            }
            elements[this.steps[this.currentStepIndex].id].value = this.clone.value;

            if (this.currentStepIndex === this.steps.length - 1) {
                elements.assistantHelpText.textContent = "La saisie est maintenant terminée. Vous pouvez fermer cette fenêtre et cliquer sur 'Calculer' pour obtenir votre estimation.";
                elements.assistantInputContainer.innerHTML = '';
                elements.assistantNextBtn.disabled = true;
            } else {
                this.currentStepIndex++;
                this.renderStep();
            }
        },

        prevStep() {
            if (this.currentStepIndex > 0) {
                elements[this.steps[this.currentStepIndex].id].value = this.clone.value;
                this.currentStepIndex--;
                this.renderStep();
            }
        }
    };


    // --- INITIALIZATION ---
    const init = async () => {
        // Ensure all critical elements exist before adding listeners
        if (elements.calculateBtn) elements.calculateBtn.addEventListener('click', calculateAndDisplayResults);
        if (elements.saveBtn) elements.saveBtn.addEventListener('click', saveData);
        if (elements.printBtn) elements.printBtn.addEventListener('click', () => window.print());
        
        const container = document.querySelector('.container');
        if (container) {
            container.addEventListener('input', e => {
                if (areListenersActive && e.target.id !== 'annee-calcul') {
                    if (document.body.classList.contains('assistant-active')) return;
                    clearResults();
                    calculateDeterminantIncome();
                    if (e.target.classList.contains('input-error')) {
                        e.target.classList.remove('input-error');
                    }
                }
            });
        }
        
        if (elements['annee-calcul']) {
            elements['annee-calcul'].addEventListener('change', async () => {
                clearValidationErrors();
                const year = elements['annee-calcul'].value;
                if (!await loadDataForYear(year)) {
                    alert(`Données non trouvées pour l'année ${year}. Retour à ${DEFAULT_YEAR}.`);
                    elements['annee-calcul'].value = DEFAULT_YEAR;
                    await loadDataForYear(DEFAULT_YEAR);
                }
                clearResults();
                calculateDeterminantIncome();
            });
        }

        assistant.init();
        handleStorageBanner();
        await loadDataForYear(DEFAULT_YEAR);
        clearResults();
        calculateDeterminantIncome();
    };

    init().catch(error => {
        console.error("An error occurred during initialization:", error);
        alert("Une erreur critique est survenue lors du chargement de l'application. Veuillez rafraîchir la page.");
    });
});
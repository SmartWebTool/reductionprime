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
        'assistant-validation-error', 'assistant-prev-btn', 'assistant-next-btn', 'assistant-skip-btn', 'close-assistant-btn',
        'assistant-progress-bar',
        'show-help-btn', 'help-modal', 'close-help-btn', 'help-modal-body'
    ];
    allElementIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) elements[id] = el;
    });
    
    const validationBanner = document.createElement('div');
    validationBanner.id = 'validation-error-banner';
    validationBanner.className = 'validation-error';
    validationBanner.style.display = 'none';
    const firstSectionH2 = document.querySelector('.input-section > h2');
    if (firstSectionH2) firstSectionH2.after(validationBanner);
    elements.validationErrorBanner = validationBanner;
    
    // --- CORE UI & VALIDATION ---
    const clearResults = () => {
        ['limite-revenu', 'revenu-determinant-calcule', 'diff-valeur', 'diff-percent', 'taux-reduction-applicable', 'droit-reduction'].forEach(id => {
            if (elements[id]) {
                elements[id].textContent = '...';
                elements[id].classList.remove('negative-value');
            }
        });
        if (elements['breakdown-body']) elements['breakdown-body'].innerHTML = '';
        if (elements['breakdown-foot']) elements['breakdown-foot'].innerHTML = '';
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
            caisseMaladie: Math.abs(parseInput('caisse-maladie')),
            reductionPrime: -parseInput('reduction-prime'),
            autresPrimes: Math.abs(parseInput('autres-primes')),
            prevoyanceConjoint: Math.abs(parseInput('prevoyance-conjoint')),
            prevoyanceConjointe: Math.abs(parseInput('prevoyance-conjointe')),
            rachatAssurance: Math.max(0, Math.abs(parseInput('rachat-assurance')) - (csvData.config.franchise_rachat_lpp || 0)),
            interetsPassifs: Math.max(0, Math.abs(parseInput('interets-passifs')) - (csvData.config.franchise_interets_passifs || 0)),
            fraisImmeubles: Math.max(0, Math.abs(parseInput('frais-immeubles')) - (csvData.config.franchise_frais_immeubles || 0)),
            fortuneImposable: Math.max(0, parseInput('fortune-imposable')) / 20,
        };

        Object.entries(determinants).forEach(([key, value]) => {
            const elId = `determinant-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
            if (elements[elId]) elements[elId].textContent = formatCurrency(value);
        });

        const total = Object.values(determinants).reduce((sum, val) => sum + val, 0);
        if (elements['total-determinant-sum']) elements['total-determinant-sum'].textContent = formatCurrency(total);
        return total;
    };
    
    const calculateAndDisplayResults = () => {
        if (!validateInputs()) return;
        clearValidationErrors();

        const revenuNet = parseInput('revenu-net');
        const fortuneImposable = parseInput('fortune-imposable');

        // --- EXCEPTION & VALIDATION CHECKS ---
        if (revenuNet < 0) {
            showValidationError("Le revenu net ne peut pas être négatif.");
            elements['revenu-net'].classList.add('input-error');
            return;
        }

        if (revenuNet > 150000) {
            clearResults();
            elements['droit-reduction'].textContent = "Non";
            elements['droit-reduction'].classList.add('negative-value');
            showValidationError(`Exclusion: Votre revenu net (${formatCurrency(revenuNet)}) dépasse la limite de CHF 150'000.`);
            return;
        }

        if (fortuneImposable > 250000) {
            clearResults();
            elements['droit-reduction'].textContent = "Non";
            elements['droit-reduction'].classList.add('negative-value');
            showValidationError(`Exclusion: Votre fortune imposable (${formatCurrency(fortuneImposable)}) dépasse la limite de CHF 250'000.`);
            return;
        }
        // --- END OF CHECKS ---

        const totalDeterminant = calculateDeterminantIncome();
        const situation = {
            statut: elements['statut-civil'].value,
            enfants: parseInput('nombre-jeunes') + parseInput('nombre-enfants'),
            adultes: parseInput('nombre-adultes'),
            jeunes: parseInput('nombre-jeunes'),
            enfantsNb: parseInput('nombre-enfants'),
            region: parseInt(elements['region'].value, 10)
        };

        const limitEntry = csvData.incomeLimits.find(l => l.situation === situation.statut && l.children === situation.enfants);
        if (!limitEntry) {
            showValidationError("Impossible de trouver les paramètres pour la situation familiale spécifiée.");
            return;
        }

        const { limit_revenu_determinant: incomeLimit } = limitEntry;
        const diffValeur = incomeLimit - totalDeterminant;
        const diffPercent = incomeLimit > 0 ? (diffValeur / incomeLimit) * 100 : 0;

        elements['limite-revenu'].textContent = formatCurrency(incomeLimit);
        elements['revenu-determinant-calcule'].textContent = formatCurrency(totalDeterminant);
        elements['diff-valeur'].textContent = formatCurrency(diffValeur);
        elements['diff-percent'].textContent = `${diffPercent.toFixed(2)} %`;
        elements['diff-valeur'].classList.toggle('negative-value', diffValeur < 0);
        elements['diff-percent'].classList.toggle('negative-value', diffValeur < 0);

        if (diffValeur < 0) {
            elements['droit-reduction'].textContent = "Non";
            elements['taux-reduction-applicable'].textContent = 'Non applicable';
            elements['breakdown-body'].innerHTML = '';
            elements['breakdown-foot'].innerHTML = '';
            return;
        }

        elements['droit-reduction'].textContent = "Oui";
        const rateEntry = csvData.rateGrid.find(r => diffPercent >= r.revenu_min_percent && diffPercent <= r.revenu_max_percent);
        const reductionRatePercent = rateEntry ? rateEntry.taux_applique_prime_moyenne_percent : 0;
        elements['taux-reduction-applicable'].textContent = `${reductionRatePercent.toFixed(2)} %`;

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
        elements['breakdown-body'].innerHTML = breakdownHTML;
        elements['breakdown-foot'].innerHTML = `<tr><td colspan="3">Total Réductions</td><td>${formatCurrency(totalAnnualReduction)}</td></tr>`;
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

        // --- HELP MODAL LOGIC ---
    const helpModal = {
        readmeContent: null, // Cache for the fetched content
        
        init() {
            if (elements['show-help-btn']) {
                elements['show-help-btn'].addEventListener('click', () => this.show());
            }
            if (elements['close-help-btn']) {
                elements['close-help-btn'].addEventListener('click', () => this.hide());
            }
        },

        show() {
            elements['help-modal'].style.display = 'flex';
            if (this.readmeContent) {
                elements['help-modal-body'].innerHTML = this.readmeContent;
            } else {
                this.fetchAndRenderReadme();
            }
        },

        hide() {
            elements['help-modal'].style.display = 'none';
        },

        parseMarkdown(markdown) {
            // A very simple parser
            let html = markdown
                .split('\n')
                .map(line => {
                    // Links (simple inline) must be first to avoid conflicts with other patterns
                    line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
                    // Images (simple inline)
                    line = line.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">');

                    // Headings
                    if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
                    if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
                    if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
                    
                    // Lists
                    if (line.startsWith('* ') || line.startsWith('- ')) return `<li>${line.substring(2)}</li>`;
                    
                    return `<p>${line}</p>`;
                })
                .join('');
            
            // Post-process to group list items
            html = html.replace(/<\/p><li>/g, '<li>'); // Fix for p tags around li
            html = html.replace(/<li><p>/g, '<li>'); // Fix for p tags around li

            // Convert consecutive <li> into <ul>
            html = html.replace(/(<li>.*?<\/li>)\s*(<li>.*?<\/li>)+/gs, (match, p1, p2) => {
                let listItems = [p1];
                let rest = p2;
                while (rest.startsWith('<li>')) {
                    const nextLiMatch = rest.match(/(<li>.*?<\/li>)/);
                    if (nextLiMatch) {
                        listItems.push(nextLiMatch[0]);
                        rest = rest.substring(nextLiMatch[0].length).trim();
                    } else {
                        break;
                    }
                }
                return `<ul>${listItems.join('')}</ul>` + rest;
            });

            // Handle lone <li>
            html = html.replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>');

            // Remove empty paragraphs
            html = html.replace(/<p><\/p>/g, '');
            // Convert multiple newlines to single paragraph breaks
            html = html.replace(/\n\s*\n/g, '</p><p>');

            return html;
        },

        async fetchAndRenderReadme() {
            const url = 'https://raw.githubusercontent.com/SmartWebTool/reductionprime/main/README.md';
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                let markdown = await response.text();

                // Remove the GitHub-only section using a regular expression
                const githubOnlyRegex = /<!--\s*GITHUB_ONLY_START\s*-->[\s\S]*?<!--\s*GITHUB_ONLY_END\s*-->/g;
                const cleanedMarkdown = markdown.replace(githubOnlyRegex, '');

                this.readmeContent = this.parseMarkdown(cleanedMarkdown);
                elements['help-modal-body'].innerHTML = this.readmeContent;
            } catch (error) {
                console.error("Error fetching README:", error);
                elements['help-modal-body'].innerHTML = '<p>Impossible de charger le contenu de l\'aide. Veuillez réessayer plus tard.</p>';
            }
        }
    };

    // --- ASSISTANT LOGIC (REFACTORED & ROBUST) ---
    const assistant = {
        steps: [],
        currentStepIndex: 0,
        currentClonedInput: null,

        init() {
            this.steps = formInputIds.map(id => {
                const el = elements[id];
                if (!el) return null;
                const container = el.closest('.form-row, tr');
                let title = id;
                if (container) {
                    if (container.tagName === 'TR') { // Section 2 table row
                        const cells = container.querySelectorAll('td');
                        if (cells.length > 1 && cells[1].textContent.trim()) {
                            title = `${cells[0].textContent.trim()} - ${cells[1].textContent.trim()}`;
                        } else {
                            title = cells[0].textContent.trim();
                        }
                    } else { // Section 1 form row
                        const label = container.querySelector('label');
                        if (label) {
                            title = label.textContent.trim();
                        }
                    }
                }

                return {
                    id,
                    title,
                    help: container?.querySelector('.help-tooltip')?.dataset.tooltip || "Veuillez saisir la valeur pour ce champ.",
                    status: 'pending' // Initial status
                };
            }).filter(Boolean);

            if (elements['start-assistant-btn']) elements['start-assistant-btn'].addEventListener('click', () => this.start());
            if (elements['close-assistant-btn']) elements['close-assistant-btn'].addEventListener('click', () => this.close());
            if (elements['assistant-prev-btn']) elements['assistant-prev-btn'].addEventListener('click', () => this.prevStep());
            if (elements['assistant-next-btn']) elements['assistant-next-btn'].addEventListener('click', () => this.nextStep());
            if (elements['assistant-skip-btn']) elements['assistant-skip-btn'].addEventListener('click', () => this.skipStep());
        },

        start() {
            if (this.steps.length === 0 || !elements['assistant-modal']) return;

            // Initialize status for each step based on current form values
            this.steps.forEach(step => {
                const element = elements[step.id];
                step.status = (element && element.value.trim() !== '') ? 'answered' : 'pending';
            });

            // Always start from the first question for review
            this.currentStepIndex = 0;

            this.currentClonedInput = null;
            elements['assistant-modal'].style.display = 'flex';
            this.renderStep();
        },

        close() {
            this.updateOriginalInput();
            if (elements['assistant-modal']) elements['assistant-modal'].style.display = 'none';
            this.currentClonedInput = null;
        },

        updateOriginalInput() {
            if (this.currentClonedInput && this.currentStepIndex < this.steps.length) {
                const step = this.steps[this.currentStepIndex];
                const originalElement = elements[step.id];
                if (originalElement && originalElement.value !== this.currentClonedInput.value) {
                    originalElement.value = this.currentClonedInput.value;
                    originalElement.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        },

        renderProgressBar() {
            const progressBar = elements['assistant-progress-bar'];
            if (!progressBar) return;

            progressBar.innerHTML = '';
            this.steps.forEach((step, index) => {
                const dot = document.createElement('div');
                dot.className = `progress-dot ${step.status}`;
                dot.title = step.title;
                if (index === this.currentStepIndex) {
                    dot.classList.add('current');
                }
                dot.addEventListener('click', () => {
                    this.updateOriginalInput(); // Save current work before jumping
                    this.currentStepIndex = index;
                    this.renderStep();
                });
                progressBar.appendChild(dot);
            });
        },
        
        renderStep() {
            this.renderProgressBar();
            
            const step = this.steps[this.currentStepIndex];
            const originalElement = elements[step.id];
            
            elements['assistant-title'].textContent = `${step.title} (${this.currentStepIndex + 1}/${this.steps.length})`;
            elements['assistant-help-text'].textContent = step.help;
            elements['assistant-validation-error'].style.display = 'none';
            
            const container = elements['assistant-input-container'];
            container.innerHTML = '';

            const clonedElement = originalElement.cloneNode(true);
            clonedElement.id = `assistant-${step.id}`;
            clonedElement.classList.remove('input-error');
            if (clonedElement.tagName === 'SELECT') {
                clonedElement.value = originalElement.value;
            }
            
            container.appendChild(clonedElement);
            this.currentClonedInput = clonedElement;
            clonedElement.focus();

            elements['assistant-prev-btn'].style.display = this.currentStepIndex > 0 ? 'inline-block' : 'none';
            elements['assistant-next-btn'].textContent = this.currentStepIndex === this.steps.length - 1 ? "Terminer" : "Suivant";
        },

        nextStep() {
            if (!this.currentClonedInput) return;
            const currentElement = this.currentClonedInput;

            if (currentElement.value.trim() === '') {
                elements['assistant-validation-error'].textContent = "Veuillez entrer une valeur pour continuer.";
                elements['assistant-validation-error'].style.display = 'block';
                currentElement.classList.add('input-error');
                return;
            }
            
            currentElement.classList.remove('input-error');
            this.steps[this.currentStepIndex].status = 'answered';
            this.updateOriginalInput();

            if (this.currentStepIndex < this.steps.length - 1) {
                this.currentStepIndex++;
                this.renderStep();
            } else {
                this.close();
                alert("La saisie est maintenant terminée. Vous pouvez cliquer sur 'Calculer' pour obtenir votre estimation.");
            }
        },

        skipStep() {
            this.updateOriginalInput(); // Save any partial input
            
            // Update status based on whether there's a value
            const currentStep = this.steps[this.currentStepIndex];
            const originalElement = elements[currentStep.id];
            if (originalElement.value.trim() === '') {
                if (currentStep.status !== 'answered') {
                     currentStep.status = 'skipped';
                }
            } else {
                currentStep.status = 'answered';
            }

            if (this.currentStepIndex < this.steps.length - 1) {
                this.currentStepIndex++;
                this.renderStep();
            } else {
                this.close(); // At the end, skip behaves like finish
            }
        },

        prevStep() {
            if (this.currentStepIndex > 0) {
                this.updateOriginalInput();
                this.currentStepIndex--;
                this.renderStep();
            }
        }
    };

    // --- INITIALIZATION ---
    const init = async () => {
        try {
            if (elements['calculate-btn']) elements['calculate-btn'].addEventListener('click', calculateAndDisplayResults);
            if (elements['save-btn']) elements['save-btn'].addEventListener('click', saveData);
            if (elements['print-btn']) elements['print-btn'].addEventListener('click', () => window.print());
            
            const container = document.querySelector('.container');
            if (container) {
                container.addEventListener('input', e => {
                    if (areListenersActive && e.target.id !== 'annee-calcul') {
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
                        alert(`Données non trouvées pour l'année ${year}. Le calcul sera effectué avec les données de base de ${DEFAULT_YEAR}.`);
                        await loadDataForYear(DEFAULT_YEAR);
                    }
                    clearResults();
                    calculateDeterminantIncome();
                });
            }

            helpModal.init();
            assistant.init();
            handleStorageBanner();
            await loadDataForYear(DEFAULT_YEAR);
            clearResults();
            calculateDeterminantIncome();
        } catch (error) {
            console.error("An error occurred during initialization:", error);
            alert("Une erreur critique est survenue lors du chargement de l'application. Veuillez rafraîchir la page.");
        }
    };

    init();
});

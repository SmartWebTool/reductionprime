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
            revenuNet: inputs.revenuNet,
            caisseMaladie: inputs.caisseMaladie,
            autresPrimes: inputs.autresPrimes,
            prevoyance: inputs.prevoyanceConjoint + inputs.prevoyanceConjointe,
            reductionPrime: inputs.reductionPrime,
            rachat: Math.max(0, inputs.rachatAssurance - config.franchise_rachat_lpp),
            interets: Math.max(0, inputs.interetsPassifs - config.franchise_interets_passifs),
            frais: Math.max(0, inputs.fraisImmeubles - config.franchise_frais_immeubles),
            fortune: Math.max(0, inputs.fortune) / 20,
        };

        Object.keys(determinantElements).forEach(key => {
            if (determinantElements[key]) {
                 determinantElements[key].textContent = formatCurrency(determinants[key] || 0);
            }
        });
        determinantElements.prevoyanceConjoint.textContent = formatCurrency(inputs.prevoyanceConjoint);
        determinantElements.prevoyanceConjointe.textContent = formatCurrency(inputs.prevoyanceConjointe);


        const totalDeterminant = Object.values(determinants).reduce((sum, value) => sum + value, 0) - determinants.reductionPrime;
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
            if (elements[key].id && elements[key].value !== undefined) {
                 dataToSave[key] = elements[key].value;
            }
        });
        localStorage.setItem('primeReductionData', JSON.stringify(dataToSave));
        alert('Vos données ont été sauvegardées localement.');
    };

    const loadData = () => {
        const savedData = localStorage.getItem('primeReductionData');
        if (savedData) {
            const data = JSON.parse(savedData);
            Object.keys(data).forEach(key => {
                if (elements[key]) elements[key].value = data[key];
            });
            alert('Les données sauvegardées ont été chargées.');
            return true;
        }
        return false;
    };
    
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

    // --- Initialization ---
    const init = async () => {
        await handleDataLoadingAndRecalculate();

        // Attach event listeners
        Object.values(elements).forEach(el => {
            if (!el) return;
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                if(el.id === 'annee-calcul') {
                    el.addEventListener('change', handleDataLoadingAndRecalculate);
                } else {
                    el.addEventListener('input', updateDeterminantTable);
                }
            }
        });

        elements.calculateBtn.addEventListener('click', calculateResults);
        elements.printBtn.addEventListener('click', printHandler);
        elements.saveBtn.addEventListener('click', saveData);
        elements.loadBtn.addEventListener('click', async () => {
            loadData();
            await handleDataLoadingAndRecalculate(); // Reload data for the year now in the input
        });
    };

    init();
});

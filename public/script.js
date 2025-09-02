document.addEventListener('DOMContentLoaded', function() {

    // --- Fonctions de gestion des sections conditionnelles ---
    function setupRadioToggle(radioName, targetId, showValue) {
        document.querySelectorAll(`input[name="${radioName}"]`).forEach(radio => {
            radio.addEventListener('change', function() {
                const target = document.getElementById(targetId);
                if (this.checked && this.value === showValue) {
                    target.classList.remove('hidden');
                } else {
                    target.classList.add('hidden');
                }
            });
        });
    }

    // --- Application de la logique ---
    // 1. Catégorie de l'outil
    setupRadioToggle('tool_category', 'conditional-tool-unknown', 'unknown');

    // 2. Traitement des données personnelles
    document.querySelectorAll('input[name="personal_data"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('conditional-personal-data').classList.toggle('hidden', this.value !== 'yes');
        });
    });
    
    // 3. Acteurs du projet
    setupRadioToggle('external_provider', 'conditional-provider-details', 'yes');
    
    // 4. Base légale (si non référencé au registre)
    setupRadioToggle('registry', 'conditional-legal-basis', 'no');

    // 5. Logique pour la section "Haut Risque"
    const highRiskTriggers = document.querySelectorAll('input[name="risk"]');
    const highRiskSection = document.getElementById('conditional-high-risk-section');
    function checkHighRisk() {
        const isHighRisk = Array.from(highRiskTriggers).some(checkbox => checkbox.checked);
        highRiskSection.classList.toggle('hidden', !isHighRisk);
    }
    highRiskTriggers.forEach(checkbox => checkbox.addEventListener('change', checkHighRisk));
    
    // 6. Logique pour les zones de texte des détails de données
    document.querySelectorAll('.data-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const textarea = item.querySelector('textarea');
        if (checkbox && textarea) {
            checkbox.addEventListener('change', () => {
                textarea.classList.toggle('hidden', !checkbox.checked);
                // Si on coche une donnée sensible, on met à jour la section risque
                if (checkbox.name === 'data_type_sensitive' && checkbox.checked) {
                    const riskSensitiveCheckbox = document.getElementById('risk-sensitive-data');
                    if(riskSensitiveCheckbox) {
                        riskSensitiveCheckbox.checked = true;
                        riskSensitiveCheckbox.dispatchEvent(new Event('change'));
                    }
                }
            });
        }
    });

    // --- Gestion de la soumission du formulaire (MODIFIÉ) ---
    document.getElementById('conformity-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.textContent = 'Analyse en cours...';
        submitButton.disabled = true;

        const formData = new FormData(this);
        const data = {};
        formData.forEach((value, key) => {
            if (!data[key]) {
                data[key] = value;
            } else {
                if (!Array.isArray(data[key])) data[key] = [data[key]];
                data[key].push(value);
            }
        });
        
        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Erreur du serveur: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Affichez la réponse du LLM !
            alert("Analyse de conformité :\n\n" + result.analysis);

        } catch (error) {
            console.error("Erreur lors de la soumission:", error);
            alert("Impossible d'obtenir une analyse. Veuillez réessayer.");
        } finally {
            submitButton.textContent = 'Soumettre pour analyse';
            submitButton.disabled = false;
        }
    });
});
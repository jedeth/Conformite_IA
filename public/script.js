document.addEventListener('DOMContentLoaded', function() {

    // --- Fonctions de gestion des sections conditionnelles ---
    function setupRadioToggle(radioName, targetId, showValue, isExclusive = true) {
        document.querySelectorAll(`input[name="${radioName}"]`).forEach(radio => {
            radio.addEventListener('change', function() {
                const target = document.getElementById(targetId);
                if (this.checked && this.value === showValue) {
                    target.classList.remove('hidden');
                } else if (isExclusive) {
                    target.classList.add('hidden');
                }
            });
        });
    }

    function setupCheckboxToggle(checkboxId, targetId) {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                document.getElementById(targetId).classList.toggle('hidden', !this.checked);
            });
        }
    }

    function setupMultiCheckboxToggle(checkboxGroupName, targetId) {
        const triggers = document.querySelectorAll(`input[name="${checkboxGroupName}"]`);
        const target = document.getElementById(targetId);
        if (target) {
            const check = () => {
                const isTriggered = Array.from(triggers).some(c => c.checked);
                target.classList.toggle('hidden', !isTriggered);
            };
            triggers.forEach(checkbox => checkbox.addEventListener('change', check));
        }
    }

    // --- Application de la logique ---

    // 1.3. Afficher les détails si "Je ne sais pas" pour la catégorie de l'outil
    setupRadioToggle('tool_category', 'conditional-tool-unknown', 'unknown');

    // 2.1. Afficher champ pour référence de traitement
    setupRadioToggle('registry', 'conditional-registry-ref', 'yes');
    // 4.2. Afficher la section sur la base légale si le traitement n'est pas au registre
    setupRadioToggle('registry', 'conditional-legal-basis', 'no');

    // 2.2. Afficher les sections sur les données personnelles si "Oui" ou "Je ne sais pas"
    document.querySelectorAll('input[name="personal_data"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const show = this.value === 'yes' || this.value === 'unknown';
            document.getElementById('conditional-personal-data').classList.toggle('hidden', !show);
            document.getElementById('conditional-privacy-by-design').classList.toggle('hidden', !show);
        });
    });
    
    // 3.2. Logique pour le prestataire externe
    setupRadioToggle('external_provider', 'conditional-provider-yes', 'yes');
    setupRadioToggle('external_provider', 'conditional-provider-no', 'no');
    setupRadioToggle('provider_role', 'conditional-provider-role-other', 'other');
    
    // 3.4. Logique pour la formation du personnel
    setupRadioToggle('staff_training', 'conditional-training-yes', 'yes');

    // 4.1. Logique pour la phase de développement
    setupRadioToggle('project_phase', 'conditional-phase-dev', 'dev');
    setupCheckboxToggle('dev-qualification', 'conditional-dev-qualification');

    // 4.3. Logique pour sous-traitants et contrats
    setupRadioToggle('sub_subcontractor', 'conditional-sub-subcontractor', 'yes');
    setupRadioToggle('contract_exists', 'conditional-contract-exists', 'yes');

    // 5. Logique pour les sections de conformité IA
    setupCheckboxToggle('risk-scoring', 'conditional-high-risk-ai');
    setupMultiCheckboxToggle('hr_purpose', 'conditional-high-risk-ai'); // Also show if any high-risk purpose is checked
    
    const systemicRiskFeatures = ['general_purpose_compute'];
    document.querySelectorAll('input[name="ia_feature"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // General Purpose AI
            const isGp = document.querySelector('input[name="ia_feature"][value="general_purpose_tasks"]').checked;
            document.getElementById('conditional-general-purpose-ai').classList.toggle('hidden', !isGp);

            // Systemic Risk AI
            const isSystemic = systemicRiskFeatures.some(f => document.querySelector(`input[name="ia_feature"][value="${f}"]`).checked);
            document.getElementById('conditional-systemic-risk-ai').classList.toggle('hidden', !isSystemic);

            // Transparency
            const isTransparency = ['emotion_recognition', 'deepfake_generation', 'generates_text_for_public'].some(f => document.querySelector(`input[name="ia_feature"][value="${f}"]`).checked);
            document.getElementById('conditional-transparency').classList.toggle('hidden', !isTransparency);
        });
    });

    // Logique pour les zones de texte des détails (data-item)
    document.querySelectorAll('.data-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"], input[type="radio"]');
        const textarea = item.querySelector('textarea');
        if (checkbox && textarea) {
            checkbox.addEventListener('change', () => {
                textarea.classList.toggle('hidden', !checkbox.checked);
                // Auto-check la case de risque si on coche une donnée sensible
                if (checkbox.name === 'data_type_sensitive' && checkbox.checked) {
                    const riskSensitiveCheckbox = document.getElementById('risk-sensitive-data');
                    if(riskSensitiveCheckbox) {
                        riskSensitiveCheckbox.checked = true;
                        riskSensitiveCheckbox.dispatchEvent(new Event('change')); // Pour déclencher la logique de risque
                    }
                }
            });
        }
    });

    // --- Gestion de la soumission du formulaire ---
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
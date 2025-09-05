// server.js

import express from 'express';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { createVectorStore, checkVectorStoreExists, performSimilaritySearch } from './rag-service.js';

const QUESTION_MAP = {
    "project_name": "Nom du Projet",
    "project_objective": "1.1. Le projet nécessitant l’utilisation d’une IA a pour objectif",
    "project_activity": "1.2. Activité/service et finalité(s) de l'IA",
    "project_role_ia": "1.2. Rôle de l’IA dans l’activité ou le service rendu",
    "tool_category": "1.3. Catégorie de l’outil utilisé",
    "tool_feature": "1.3. [Si 'Je ne sais pas'] Caractéristiques de l'outil",
    "tool_usage": "1.4. Utilisation de l’outil",
    "registry": "2.1. L’activité est-elle référencée dans le registre des traitements ?",
    "registry_ref_text": "2.1. Référence du traitement",
    "personal_data": "2.2. Des données à caractère personnel alimentent-elles le système d’IA ?",
    "data_type": "2.3. Catégories de données traitées",
    "data_type_sensitive": "2.3. Catégories de données sensibles traitées",
    "data_special": "2.4. Le projet traite-t-il des données relevant de secrets protégés ou nécessaires aux missions de l'État ?",
    "project_actor": "3.1. Le projet est mis en œuvre par",
    "external_provider": "3.2. Recours à un prestataire externe ?",
    "provider_name": "3.2. Nom du prestataire externe",
    "provider_role": "3.2. Rôle du prestataire externe",
    "provider_role_other_details": "3.2. Précision sur le rôle 'Autre' du prestataire",
    "internal_developer": "3.2. [Si non] Organisme développeur interne",
    "project_owner_role": "3.3. Rôle du porteur de projet",
    "staff_training": "3.4. Le personnel a-t-il été formé ?",
    "training_details": "3.4. Description des actions de formation",
    "project_phase": "4.1. Phase du projet",
    "dev_action": "4.1. Actions menées en phase de développement",
    "qualification_acteurs": "4.1. Qualification juridique des acteurs",
    "legal_basis": "4.2. Base légale du projet",
    "provider_nationality": "4.3. Nationalité de l’entreprise prestataire",
    "sub_subcontractor": "4.3. Le prestataire a-t-il des sous-traitants ?",
    "sub_subcontractor_details": "4.3. Nom/nationalité des sous-traitants",
    "server_location": "4.3. Lieu de stockage des données (serveurs)",
    "data_processing_country": "4.3. Pays de traitement des données",
    "contract_exists": "4.3. Existence d'un contrat avec le sous-traitant ?",
    "contract_type": "4.3. Type de contrat",
    "contract_signer": "4.3. Qualité du signataire du contrat",
    "data_recipients": "4.3. Destinataires / Partage des données",
    "risk": "4.4. Qualification du risque (le projet a pour but ou pour effet)",
    "ia_feature": "5.1. Caractéristiques / fonctionnalités de l'IA",
    "hr_purpose": "5.1. Finalités d'utilisation de l'IA (peut indiquer un haut risque)",
    "ia_destiny": "5.1. L'IA est-elle destinée à",
    "gp_provider_obligations": "5.2. Obligations du fournisseur (IA à usage général)",
    "gp_systemic_provider_obligations": "5.2. Obligations du fournisseur (IA à usage général à risque systémique)",
    "hr_provider_obligations": "5.3. Obligations du fournisseur (IA à haut risque)",
    "hr_deployer_obligations": "5.3. Obligations du déployeur (IA à haut risque)",
    "transparency_provider": "5.4. Obligations de transparence (Fournisseur)",
    "transparency_deployer": "5.4. Obligations de transparence (Déployeur)",
};


import 'dotenv/config';

// 1. Initialiser le serveur
const app = express();
const port = process.env.PORT || 3000;

// 2. Configurer l'API du LLM
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

let availableModels = [];
let defaultModel = '';

async function fetchModels() {
    try {
        console.log("Tentative de récupération des modèles d'IA via la bibliothèque OpenAI...");
        const modelsList = await openai.models.list();

        if (modelsList.data && modelsList.data.length > 0) {
            availableModels = modelsList.data.map(model => ({ id: model.id, owner: model.owned_by }));
            console.log(`${availableModels.length} modèles d'IA trouvés.`);

            // On cherche un modèle par défaut qui n'est pas destiné à l'embedding, si possible.
            const suitableModel = availableModels.find(model => !model.id.includes('embed') && model.id.includes('instruct'));

            if (suitableModel) {
                 defaultModel = suitableModel.id;
            } else {
                 // Sinon, on prend le premier de la liste
                 defaultModel = availableModels[0].id;
            }
            console.log(`Modèle d'IA par défaut configuré : ${defaultModel}`);
        } else {
            console.error("Aucun modèle d'IA trouvé dans la réponse de l'API. Le serveur ne peut pas continuer.");
            throw new Error("Aucun modèle d'IA trouvé.");
        }
    } catch (error) {
        console.error("ERREUR CRITIQUE: Impossible de récupérer la liste des modèles d'IA. Le serveur ne peut pas fonctionner sans modèle.", error);
        process.exit(1);
    }
}


// 3. Configurer le serveur
app.use(express.static('public'));
app.use(express.json());

// 4. Créer le "pont" pour l'analyse
// Endpoint pour récupérer les modèles disponibles
app.get('/api/models', (req, res) => {
    if (availableModels.length > 0) {
        res.json(availableModels);
    } else {
        res.status(503).json({ error: "La liste des modèles n'est pas encore disponible ou a échoué à charger." });
    }
});

// Endpoint pour lister les documents disponibles pour le RAG
app.get('/api/documents', async (req, res) => {
    const documentsDir = path.join(process.cwd(), 'documents');
    try {
        const allFiles = await fs.readdir(documentsDir);
        const compatibleFiles = allFiles.filter(file => {
            const extension = path.extname(file).toLowerCase();
            return ['.txt', '.md', '.pdf'].includes(extension);
        });
        res.json(compatibleFiles);
    } catch (error) {
        console.error(`Erreur lors de la lecture du répertoire des documents: ${documentsDir}`, error);
        res.status(500).json({ error: "Impossible de lister les documents." });
    }
});

// Endpoint pour créer la base vectorielle RAG
app.post('/api/rag/create', async (req, res) => {
    const { documents, embeddingModel } = req.body;

    if (!documents || !embeddingModel || !Array.isArray(documents) || documents.length === 0) {
        return res.status(400).json({ error: "La liste des documents et le modèle d'embedding sont requis." });
    }

    try {
        const ollamaBaseUrl = process.env.OPENAI_BASE_URL;
        if (!ollamaBaseUrl) {
            throw new Error("L'URL de base d'Ollama (OPENAI_BASE_URL) n'est pas configurée dans le fichier .env");
        }
        await createVectorStore(documents, embeddingModel, ollamaBaseUrl);
        res.json({ message: "La base de données vectorielle a été créée avec succès." });
    } catch (error) {
        console.error("Erreur lors de la création de la base vectorielle:", error);
        res.status(500).json({ error: `Une erreur est survenue: ${error.message}` });
    }
});

// Endpoint pour vérifier le statut de la base RAG
app.get('/api/rag/status', async (req, res) => {
    try {
        const exists = await checkVectorStoreExists();
        res.json({ exists });
    } catch (error) {
        console.error("Erreur lors de la vérification du statut de la base RAG:", error);
        res.status(500).json({ error: "Impossible de vérifier le statut de la base de données." });
    }
});

// Endpoint pour générer le rapport textuel seul
app.post('/api/generate-report', (req, res) => {
    try {
        const formData = req.body;
        let textReport = "Voici les réponses au questionnaire de conformité IA :\n\n";

        for (const key in formData) {
            if (Object.hasOwnProperty.call(formData, key)) {
                const value = formData[key];

                if (key.startsWith('details_') && !value) {
                    continue;
                }

                const question = QUESTION_MAP[key] || key;
                let answer = Array.isArray(value) ? value.join(', ') : value;

                if(key.startsWith('details_')) {
                    const parentKey = key.replace('details_', '');
                    const parentQuestion = Object.entries(QUESTION_MAP).find(([qKey, qValue]) => qValue.toLowerCase().includes(parentKey));
                    textReport += `Précisions pour la question "${parentQuestion ? parentQuestion[1] : parentKey}" : ${answer}\n\n`;
                } else {
                    textReport += `Question : ${question}\nRéponse : ${answer}\n\n`;
                }
            }
        }
        res.json({ report: textReport });
    } catch (error) {
        console.error("Erreur lors de la génération du rapport textuel seul:", error);
        res.status(500).json({ error: "Une erreur est survenue lors de la génération du rapport." });
    }
});

app.post('/analyze', async (req, res) => {
  try {
    const { model: selectedModel, ...formData } = req.body;

    // --- Générer le rapport textuel ---
    let textReport = "Voici les réponses au questionnaire de conformité IA :\n\n";

    for (const key in formData) {
        if (Object.hasOwnProperty.call(formData, key)) {
            const value = formData[key];

            if (key.startsWith('details_') && !value) {
                continue;
            }

            const question = QUESTION_MAP[key] || key;
            let answer = Array.isArray(value) ? value.join(', ') : value;

            if(key.startsWith('details_')) {
                const parentKey = key.replace('details_', '');
                const parentQuestion = Object.entries(QUESTION_MAP).find(([qKey, qValue]) => qValue.toLowerCase().includes(parentKey));
                textReport += `Précisions pour la question "${parentQuestion ? parentQuestion[1] : parentKey}" : ${answer}\n\n`;
            } else {
                textReport += `Question : ${question}\nRéponse : ${answer}\n\n`;
            }
        }
    }

    // --- INTÉGRATION RAG ---
    let ragContext = "";
    try {
        const ollamaBaseUrl = process.env.OPENAI_BASE_URL;
        const searchResults = await performSimilaritySearch(textReport, ollamaBaseUrl);

        if (searchResults && searchResults.length > 0) {
            ragContext = "Contexte pertinent extrait de la base de connaissances (à utiliser pour l'analyse) :\n\n---\n" +
                         searchResults.map(r => r.pageContent).join("\n\n---\n") +
                         "\n\n---\n\n";
            console.log("Contexte RAG ajouté au prompt.");
        }
    } catch (ragError) {
        console.error("Erreur durant la recherche RAG, l'analyse continuera sans contexte.", ragError);
    }
    // --- FIN RAG ---

    // --- Code pour appeler le LLM ---
    const prompt = `
      En te basant sur le contexte suivant issu de la base de connaissance (si pertinent), analyse le questionnaire de conformité ci-dessous.

      ${ragContext}
      Questionnaire à analyser :

      Fournis une réponse circonstanciée sur les points de vigilance principaux, 
      les risques potentiels (notamment s'il est à haut risque), et les obligations à respecter pour ce projet d'IA.

      Voici les données du formulaire :
      ${textReport}
    `;

    // 5. Appeler le LLM
    const modelToUse = selectedModel || defaultModel;
    if (!modelToUse) {
        return res.status(500).json({ error: "Le modèle d'IA n'est pas configuré. Vérifiez les logs du serveur." });
    }
    console.log(`Utilisation du modèle : ${modelToUse} pour l'analyse.`);
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [{ role: "user", content: prompt }],
    });

    // 6. Renvoyer la réponse du LLM au formulaire
    res.json({ analysis: completion.choices[0].message.content });

  } catch (error) {
    console.error("Erreur lors de la génération du rapport:", error);
    res.status(500).json({ error: "Une erreur est survenue lors de la génération du rapport." });
  }
});

// 7. Démarrer le serveur
async function startServer() {
    await fetchModels();
    app.listen(port, () => {
        console.log(`Serveur démarré sur http://localhost:${port}`);
    });
}

startServer();
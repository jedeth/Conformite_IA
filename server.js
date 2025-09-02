// server.js

// 1. Importer les outils
import express from 'express';
import OpenAI from 'openai';
import path from 'path';

// 2. Initialiser le serveur
const app = express();
const port = process.env.PORT || 3000; // Render fournira le port

// 3. Configurer l'API du LLM
const openai = new OpenAI({
  apiKey: process.env.VOTRE_CLE_API, // La clé sera stockée sur Render, pas dans le code !
  baseURL: "https://api.pawan.krd/v1", // Remplacez par l'URL de base de votre LLM si besoin
});

// 4. Configurer le serveur pour qu'il serve nos fichiers statiques et lise le JSON
app.use(express.static('public'));
app.use(express.json());

// 5. Créer le "pont" pour l'analyse
app.post('/analyze', async (req, res) => {
  try {
    const formData = req.body;

    // Préparer la question pour le LLM
    const prompt = `
      Analyse ce questionnaire de conformité pour un projet utilisant l'IA. 
      Fournis une réponse circonstanciée sur les points de vigilance principaux, 
      les risques potentiels (notamment s'il est à haut risque), et les obligations à respecter.
      Voici les données du formulaire :
      ${JSON.stringify(formData, null, 2)}
    `;

    // Appeler le LLM
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Adaptez le modèle à celui que vous utilisez
      messages: [{ role: "user", content: prompt }],
    });

    // Renvoyer la réponse du LLM au formulaire
    res.json({ analysis: completion.choices[0].message.content });

  } catch (error) {
    console.error("Erreur lors de l'appel à l'API du LLM:", error);
    res.status(500).json({ error: "Une erreur est survenue lors de l'analyse." });
  }
});

// 6. Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
import { TextLoader } from "@langchain/community/document_loaders/fs/text";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import path from "path";
import fs from "fs/promises";

const documentsPath = path.join(process.cwd(), 'documents');
const vectorStorePath = path.join(process.cwd(), 'vector_store');

// Charge les documents en fonction de leur extension
async function loadDocuments(fileNames) {
    const docs = [];
    for (const fileName of fileNames) {
        const filePath = path.join(documentsPath, fileName);
        const extension = path.extname(fileName).toLowerCase();

        let loader;
        if (extension === '.pdf') {
            // Pour les PDF, on utilise PDFLoader
            loader = new PDFLoader(filePath);
        } else if (['.txt', '.md'].includes(extension)) {
            // Pour les fichiers texte, TextLoader
            loader = new TextLoader(filePath);
        } else {
            console.warn(`Type de fichier non supporté : ${fileName}, ignoré.`);
            continue;
        }

        try {
            const loadedDocs = await loader.load();
            docs.push(...loadedDocs);
        } catch (error) {
            console.error(`Erreur lors du chargement du document ${fileName}:`, error);
            throw new Error(`Impossible de charger le document ${fileName}.`);
        }
    }
    return docs;
}

// Fonction principale pour créer et sauvegarder la base vectorielle
export async function createVectorStore(fileNames, embeddingModel, ollamaBaseUrl) {
    console.log("Démarrage de la création de la base vectorielle RAG...");
    console.log("Documents sélectionnés :", fileNames);
    console.log("Modèle d'embedding utilisé :", embeddingModel);

    // 1. Charger les documents
    const docs = await loadDocuments(fileNames);
    if (docs.length === 0) {
        throw new Error("Aucun document compatible n'a pu être chargé.");
    }
    console.log(`${docs.length} document(s) chargé(s).`);

    // 2. Découper les documents en morceaux (chunks)
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    const splits = await textSplitter.splitDocuments(docs);
    console.log(`${splits.length} morceaux de documents créés.`);

    // 3. Initialiser les embeddings avec le modèle Ollama
    const embeddings = new OllamaEmbeddings({
        model: embeddingModel,
        baseUrl: ollamaBaseUrl,
    });

    // 4. S'assurer que le répertoire de la base existe, et le vider s'il existe déjà
    await fs.mkdir(vectorStorePath, { recursive: true });

    // 5. Créer et sauvegarder la nouvelle base vectorielle
    console.log("Création de la nouvelle base vectorielle...");
    const vectorStore = await HNSWLib.fromDocuments(splits, embeddings);
    await vectorStore.save(vectorStorePath);
    console.log("Base vectorielle sauvegardée avec succès.");

    // 6. Sauvegarder les métadonnées
    const metadata = {
        embeddingModel: embeddingModel,
        createdAt: new Date().toISOString(),
        documentCount: fileNames.length,
        documents: fileNames
    };
    await fs.writeFile(path.join(vectorStorePath, 'metadata.json'), JSON.stringify(metadata, null, 2));

    console.log("Métadonnées de la base vectorielle sauvegardées avec succès.");
}

// Fonction pour vérifier si la base vectorielle existe déjà
export async function checkVectorStoreExists() {
    const metadataPath = path.join(vectorStorePath, 'metadata.json');
    try {
        await fs.access(metadataPath);
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        return { exists: true, ...metadata };
    } catch (error) {
        // Si le fichier metadata.json n'existe pas, on considère que la base n'est pas valide/complète
        return { exists: false };
    }
}

export async function performSimilaritySearch(query, ollamaBaseUrl) {
    console.log("Lancement de la recherche par similarité...");

    // 1. Vérifier si la base existe et récupérer le nom du modèle d'embedding
    const storeInfo = await checkVectorStoreExists();
    if (!storeInfo.exists) {
        console.log("Aucune base vectorielle trouvée, recherche impossible.");
        return []; // Retourner un tableau vide si pas de base
    }

    // 2. Initialiser les embeddings avec le modèle stocké dans les métadonnées
    const embeddings = new OllamaEmbeddings({
        model: storeInfo.embeddingModel,
        baseUrl: ollamaBaseUrl,
    });

    // 3. Charger la base vectorielle depuis le disque
    const vectorStore = await HNSWLib.load(vectorStorePath, embeddings);
    console.log("Base vectorielle chargée pour la recherche.");

    // 4. Effectuer la recherche et retourner les résultats
    const results = await vectorStore.similaritySearch(query, 4); // 4 résultats les plus pertinents
    console.log(`${results.length} documents pertinents trouvés.`);

    return results;
}

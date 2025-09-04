# Questionnaire de Conformité IA

Cet outil est une application web conçue pour aider les utilisateurs à évaluer la conformité de leurs projets d'intelligence artificielle en remplissant un questionnaire détaillé. Les réponses sont ensuite envoyées à une IA externe pour une analyse approfondie, fournissant des points de vigilance, les risques potentiels et les obligations à respecter.

## Guide de l'utilisateur

1.  **Accès à l'outil** : Lancez l'application en suivant les instructions techniques ci-dessous, puis ouvrez votre navigateur à l'adresse `http://localhost:3000`.
2.  **Remplir le questionnaire** : Répondez aux questions du formulaire du mieux que vous pouvez. Certaines sections peuvent apparaître ou disparaître en fonction de vos réponses précédentes.
3.  **Soumettre pour analyse** : Une fois le formulaire complété, cliquez sur le bouton "Soumettre pour analyse".
4.  **Choisir un modèle d'IA** : Une fenêtre modale apparaîtra, vous présentant une liste de modèles d'IA disponibles. Sélectionnez celui que vous souhaitez utiliser pour l'analyse.
5.  **Lancer l'analyse** : Cliquez sur "Lancer l'analyse" dans la modale.
6.  **Consulter les résultats** : L'analyse de l'IA apparaîtra directement sur la page web, sous le formulaire.

## Lancement technique

Instructions pour installer et lancer le projet en local sur votre machine.

### Prérequis

-   [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
-   `npm` (généralement inclus avec Node.js)

### 1. Cloner le dépôt

Si vous ne l'avez pas déjà fait, clonez le dépôt sur votre machine locale :

```bash
git clone [URL_DU_DEPOT]
cd [NOM_DU_DOSSIER]
```

### 2. Installer les dépendances

Exécutez la commande suivante à la racine du projet pour installer toutes les dépendances nécessaires (Express, OpenAI, etc.) :

```bash
npm install
```

### 3. Configurer les variables d'environnement

Ce projet nécessite une connexion à une API d'IA externe compatible avec OpenAI. Vous devez fournir une clé API et une URL de base.

1.  À la racine du projet, créez un fichier nommé `.env`.
2.  Ouvrez ce fichier et ajoutez les lignes suivantes, en remplaçant les valeurs par vos propres informations d'identification :

```
OPENAI_API_KEY="votre_cle_api_ici"
OPENAI_BASE_URL="https://adresse_de_base_de_votre_api/v1"
```

**Note importante** : Le fichier `.env` est ignoré par Git pour des raisons de sécurité. Il ne doit jamais être partagé ou rendu public.

### 4. Démarrer le serveur

Une fois les dépendances installées et le fichier `.env` configuré, vous pouvez démarrer le serveur avec la commande :

```bash
npm start
```

Vous devriez voir un message dans votre terminal confirmant que le serveur a démarré et qu'il a réussi à récupérer la liste des modèles d'IA :

```
Tentative de récupération des modèles d'IA...
X modèles d'IA trouvés.
Modèle d'IA par défaut configuré : [nom-du-modele-par-defaut]
Serveur démarré sur http://localhost:3000
```

L'application est maintenant accessible à l'adresse `http://localhost:3000`.

# Planning Binaire — iPhone / GitHub Pages

## Publication depuis Windows
1. Connectez-vous à https://github.com/new avec Juju55100.
2. Repository name : planning-binaire. Choisissez Public, cochez Add a README file, puis Create repository.
3. Décompressez Planning-Binaire-iPhone-GitHub.zip sur votre PC.
4. Dans le dépôt : Add file → Upload files. Déposez le contenu du dossier extrait (index.html, core.js, app.js, style.css, iphone.css, pwa.js, sw.js, manifest.webmanifest et les trois icon-*.png) directement à la racine. Commit changes.
5. Settings → Pages → Build and deployment : Deploy from a branch ; branche main ; dossier / (root) ; Save.
6. Attendez que GitHub affiche le lien publié. Adresse attendue si ce nom de dépôt est conservé : https://juju55100.github.io/planning-binaire/

## Sur l’iPhone
Ouvrez le lien dans Safari avec Internet. Partager → Sur l’écran d’accueil (activez Ouvrir comme app si proposé) → Ajouter. Lancez ensuite l’icône avec Internet et attendez Disponible hors connexion. Fermez, activez le mode avion et rouvrez pour vérifier.

## Données et fichiers
Chaque appareil garde ses propres données. Pour récupérer celles de l’Android : exportez la sauvegarde JSON depuis Android puis importez-la dans Sauvegarde sur iPhone. Exportez régulièrement une sauvegarde : la suppression des données du site peut effacer le stockage local.
Pour les PDF : Télécharger puis, si nécessaire, Ouvrir le PDF → Partager → Enregistrer dans Fichiers. L’affichage intégré des PDF Brigade et son zoom doivent être vérifiés sur votre version d’iOS.
Le site est public, mais ce dossier ne contient aucune sauvegarde personnelle. Ne publiez jamais les autres dossiers du projet, les clés, les données de congés ni les PDF de brigade.

## Mise à jour
Remplacez les fichiers du site et changez le suffixe de version CACHE dans sw.js à chaque publication. Dans l’app : Sauvegarde → Vérifier les mises à jour, puis fermez toutes les fenêtres de l’application avant de la relancer. Les données ne sont pas effacées par la mise à jour du cache.

## Vérification effectuée
Syntaxe JavaScript, présence des ressources, installation du cache, réponse hors connexion simulée et isolation des caches vérifiées. Les fichiers de calcul et de gestion sont identiques à la version existante. Cette livraison n’a pas encore été testée sur un iPhone physique et n’est pas encore publiée.

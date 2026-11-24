# Prime Cars — site vitrine statique (Netlify)

Un seul fichier à publier : `index.html`. Il est autonome : les données des véhicules
et des réseaux sociaux sont intégrées dans la page, sans backend. Le formulaire de
réservation (acompte) est masqué.

## Back-office et vue statique

Avec le serveur local (`npm start`), <http://localhost:3000/allani> est le back-office
Prime Cars connecté aux mêmes données que `/admin`. Connectez-vous avec le mot de passe
administrateur configuré pour ajouter des véhicules et des photos, modifier les réseaux
sociaux et utiliser les autres formulaires. Copier `.env.example` vers `.env` et définir
`ADMIN_PASSWORD` avec au moins 12 caractères avant de démarrer le serveur.

### Utiliser PostgreSQL

Avec Node.js 22 ou plus récent, renseigner `DATABASE_URL` (connexion directe) et
`DATABASE_URL_POOLED` (connexion de l'application) dans `.env`, puis exécuter :

```
npm install
npm run db:seed
npm start
```

Le premier import copie les données locales et les photos référencées uniquement si
les tables de l'application sont vides ; une base déjà initialisée n'est pas écrasée.
Les véhicules, réseaux sociaux, réglages, rendez-vous, réservations et photos sont
ensuite stockés dans PostgreSQL. Sans URL de base de données, l'application conserve
le stockage local en fichiers. `.env` est ignoré par Git : ne pas publier les URL ni
les intégrer dans une page HTML.

Le serveur doit être redémarré après un changement de configuration. L'export
statique et sa démo ne se connectent pas à la base : leur contenu est une copie
prise lors de la génération.

Le fichier généré `allani/index.html` est une **démo publique interactive**, sans API.
Son écran de connexion est fictif : tout texte non vide est accepté, sans vérification
ni protection. Ne saisissez pas de vrai mot de passe. La déconnexion revient à l'écran
de connexion ; l'actualisation efface les modifications de la démo.
Il contient une copie du catalogue et des réseaux sociaux, mais aucun
rendez-vous ni réservation réels. Les formulaires permettent d'ajouter, modifier et supprimer
des véhicules, de sélectionner des photos avec aperçu, de gérer les rendez-vous et de tester
les réglages des réseaux sociaux, du site vitrine et de Google Analytics. Les photos sont
facultatives dans la démo ; les autres contrôles de saisie restent actifs.
Toutes les modifications restent en mémoire et sont effacées à l'actualisation :
aucun fichier, suivi Analytics, publication ou backend n'est modifié. Les boutons de génération
simulent uniquement l'action. Les réservations conservent leur bouton de données fictives.
L'adaptateur en mémoire est dans `demo-admin.js`, intégré à la page par `sync.js`.
Pour publier cette démo sur un hébergement statique,
déployer le dossier `front-office` entier : la page sera accessible à `/allani/` sur cet
hébergement. Elle n'est pas protégée par mot de passe et ne modifie pas les données réelles.
Régénérer avec `node front-office/sync.js` après modification des données.
Le sélecteur FR / EN / عربي partage la langue mémorisée avec le site ; les traductions
propres au back-office sont dans `admin-i18n.js`.
L'en-tête et le menu restent visibles pendant le défilement du contenu. Sur ordinateur,
la barre latérale occupe toute la hauteur disponible ; ses liens défilent indépendamment
sur les petits écrans. Le bouton du menu permet de le fermer et de le rouvrir.
Le tableau de bord (indicateurs clés, activité sur 6 mois, points d'attention, prochains
rendez-vous, dernières réservations, répartitions du catalogue) est calculé dans `admin.html`
à partir des données réelles ; sans rendez-vous ni réservation, le graphique d'activité affiche
des valeurs d'exemple signalées « Données démo ».

## Déployer sur Netlify

Ouvrir <https://app.netlify.com/drop> et déposer `index.html`.

## Modifier les données

Depuis le back-office (`npm start`, puis <http://localhost:3000/admin?section=static-site>) :
la section **Site vitrine** permet de modifier le téléphone, WhatsApp, l'e-mail, l'adresse publique,
le titre, la description et l'image de fond de l'accueil. Pour changer l'image, choisissez
un fichier JPG, PNG ou WebP (8 Mo maximum), vérifiez l'aperçu puis cliquez sur
**Enregistrer et régénérer**. Le bouton **Rétablir l’image par défaut** permet de revenir
à l'image d'origine après enregistrement. L'image enregistrée apparaît sur le site servi
par Node et est intégrée à `front-office/index.html` lors de la génération ; une image
volumineuse augmente donc la taille du fichier publié. L'aperçu des liens partagés reste
configuré séparément. Les anciennes images téléversées restent stockées lorsqu'elles sont
remplacées ou que l'image par défaut est rétablie.
Après une modification des véhicules ou des réseaux sociaux, cliquer sur
« Régénérer avec les données actuelles », puis republier le dossier `front-office`.
Les réglages sont enregistrés dans PostgreSQL si la base est configurée, sinon dans
`data/static-site.json`.

### Réseaux sociaux et véhicules

La page **Réseaux sociaux** propose des cartes Instagram, Facebook et TikTok avec un
lien de vérification du profil. Instagram et TikTok acceptent un nom d'utilisateur,
`@compte` ou un lien de profil complet. Ajoutez jusqu'à 24 publications, vérifiez les
liens et utilisez les flèches pour les réordonner. Les vidéos TikTok utilisent le
lecteur officiel ; collez une URL complète `https://www.tiktok.com/@compte/video/ID`
(les liens courts ne sont pas pris en charge). Les lives Instagram et TikTok
s'ouvrent sur leur plateforme ; Facebook conserve son lecteur intégré.
Le bouton d'enregistrement et l'annulation indiquent les changements non enregistrés.

La page **Ajouter un véhicule** regroupe identité, caractéristiques/prix et photos.
Le champ facultatif **Couleur** propose des suggestions illustrées dans la langue choisie,
filtrables en saisissant un nom en français, anglais ou arabe. Il accepte aussi une teinte
personnalisée. La couleur apparaît dans le catalogue et sur la fiche du véhicule ; les annonces
sans couleur indiquent « À confirmer ». Les teintes personnalisées restent affichées telles
qu'elles ont été saisies, sans pastille de couleur.
Les photos peuvent être ajoutées en plusieurs sélections ou par glisser-déposer :
10 maximum, 8 Mo chacune, JPG/PNG/WebP. Choisissez la photo principale ou retirez
une photo avant d'enregistrer. En modification, les photos actuelles restent
conservées tant qu'aucune nouvelle sélection n'est enregistrée ; une nouvelle
sélection remplace toute la galerie. L'aperçu de l'annonce est visible sur ordinateur.
Le bouton **Modifier** de la liste ouvre directement le formulaire prérempli.

Sans base de données, on peut modifier `data/cars.json`, `data/social.json`,
`data/static-site.json` ou `index.html` à la racine, puis régénérer. Lorsque
PostgreSQL est configuré, le générateur lit la base et non les fichiers JSON :

```
node front-office/sync.js
```

(On peut aussi éditer directement le bloc `window.SITE_DATA` en haut de `front-office/index.html`.)
## SEO et aperçu des liens

`index.html` contient : titre, description, balises Open Graph / Twitter (aperçu avec image
quand le lien est partagé sur WhatsApp, Facebook, Messenger, LinkedIn…), favicon et données
structurées schema.org (concessionnaire + véhicules). Titre, description et adresse du site :
section **Site vitrine** du back-office (ou `data/static-site.json`) ; image : en haut de `sync.js`.

Une fois l'adresse Netlify connue, la renseigner dans le back-office, ou en ligne de commande
(prioritaire sur le réglage enregistré) :

```
node front-office/sync.js https://votre-site.netlify.app
```

Tester l'aperçu : <https://developers.facebook.com/tools/debug/> (bouton « Scrape Again »
pour vider le cache de Facebook/WhatsApp).
## Google Analytics

Page **Google Analytics** du back-office (<http://localhost:3000/admin?section=analytics>) :
les statistiques affichées sont pour l'instant **fictives** (données démo), en attendant la connexion
à l'API Google Analytics. Le champ « ID de mesure » (format `G-XXXXXXXXXX`, enregistré dans
PostgreSQL ou `data/analytics.json`) active le suivi sur le site vitrine statique uniquement : un bandeau de
consentement (FR / EN / AR) s'affiche, et Google Analytics n'est chargé qu'après « Accepter ».
Le lien « Cookies » en pied de page permet de changer d'avis. Code du bandeau : `front-office/analytics.js`.
ID vide = aucun suivi, aucun script ajouté. Republier le dossier après modification.

## Langues (FR / EN / عربي)

Sélecteur en haut de page ; le choix est mémorisé, et un lien peut forcer la langue avec
`?lang=en` ou `?lang=ar` (l'arabe passe la page en droite-à-gauche).
Les traductions sont dans `i18n.js` (à la racine, partagé avec la version serveur) (dictionnaire `DICT` : texte français -> [anglais, arabe]).
Si un texte est ajouté ou modifié dans la page, ajouter sa traduction dans `DICT` puis régénérer.

## Description des véhicules

Champ `description` de chaque véhicule dans le stockage utilisé, en trois langues :
`"description": { "fr": "...", "en": "...", "ar": "..." }` — puis régénérer.
## Page liens et QR code

La génération produit aussi :

- `info/index.html` : page « liens » (logo, accès au catalogue, Instagram, Facebook, TikTok,
  WhatsApp, appel, e-mail), en FR / EN / عربي. Un réseau sans compte renseigné affiche
  « Bientôt disponible » ; les comptes se règlent dans la page **Réseaux sociaux** du back-office.
- `qr/qr-code.svg` : QR code vers `<adresse du site>/info/` (logo au centre, correction d'erreur H).
- `qr/index.html` : carte A6 prête à imprimer avec le QR code et un lien de téléchargement du SVG.
- `qrcode/index.html` et `qrcode/qr-code.svg` : la même carte et son QR code, accessibles
  à `/qrcode/` sur le site statique. Sur le site Node, `/qrcode` et `/qrcode/`
  affichent la carte à jour ; `/qrcode/qr-code.svg` permet de télécharger le QR code.

Le QR code dépend de l'adresse publique du site (section **Site vitrine** ou
`node front-office/sync.js https://votre-site`). Sans adresse, il pointe vers
`https://example.com/info/` et la carte affiche un avertissement : ne pas l'imprimer.
Sur le site Node, l'adresse du back-office est prioritaire ; à défaut, le QR code utilise
`BASE_URL`. Pour Railway, configurez l'adresse publique `https://primec-dev.up.railway.app`
dans **Site vitrine** (sans `/info`) ou comme `BASE_URL`.
Pour publier ces pages, déployer le dossier `front-office` entier. Code : `info-page.js`.

## Logo et thème

Logo : `front-office/assets/logo.jpg` (intégré en base64 dans la page, pas besoin de l'envoyer).
Palette noir / rouge / argent : variables `COLOR_MAP` et `THEME_CSS` en haut de `sync.js`.
Pour changer de logo, remplacer `assets/logo.jpg` (fond noir, ~400×128 px) puis régénérer.
## Contact (appel, WhatsApp, SMS, e-mail)

Numéros et e-mail : section **Site vitrine** du back-office (enregistrés dans PostgreSQL ou `data/static-site.json` ;
l'e-mail `contact@example.com` est provisoire).
Boutons sur la fiche véhicule (message pré-rempli avec la voiture), la page Importation et le pied de page ;
messages pré-remplis dans `front-office/contact.js` (FR / EN / AR).
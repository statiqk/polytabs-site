# Site de présentation de PolyTabs

Un site statique : une seule page, sans cookie, sans outil de suivi, sans serveur. Les polices et les images sont hébergées avec la page.

## Mettre le site en ligne (GitHub Pages)

1. Sur GitHub, crée un dépôt **public** nommé `polytabs-site` dans ton compte `statiqk`.
2. Dépose dans ce dépôt **le contenu** de ce dossier (pas le dossier lui-même) : `index.html`, `404.html`, `.nojekyll`, `assets/`, `fonts/` et ce fichier.
   Si tu glisses les fichiers dans le navigateur, vérifie que `.nojekyll` (fichier caché) est bien envoyé.
3. Dans le dépôt : **Settings → Pages → Build and deployment**. Source : *Deploy from a branch*. Branche : `main`, dossier : `/ (root)`. Clique sur **Save**.
4. Après une à deux minutes, le site est à l'adresse **https://statiqk.github.io/polytabs-site/**.

### Si l'adresse est différente (autre nom de dépôt, domaine personnalisé)
Remplace `https://statiqk.github.io/polytabs-site/` aux endroits suivants, pour que l'aperçu de lien (réseaux sociaux, messageries) fonctionne :
- `index.html` : les balises `og:url` et `og:image` (début du fichier) ;
- `404.html` : le lien « Retour à l'accueil ».

Pour un domaine personnalisé : ajoute un fichier `CNAME` contenant le nom de domaine, puis configure-le dans Settings → Pages.

## La version automatique

À chaque visite, la page lit la dernière publication de `statiqk/polytabs-releases` (API GitHub) et met à jour toute seule :
- le numéro de version (pastille, bouton final, pied de page) ;
- le lien de téléchargement, qui pointe directement vers l'installeur `PolyTabs-Setup-….exe` ;
- la ligne « Version … · installeur de … Mo · publiée le … » ;
- la section **Nouveautés**, construite à partir des notes de la publication.

La réponse est gardée une heure dans le navigateur du visiteur (GitHub limite à 60 requêtes par heure et par visiteur). Si GitHub ne répond pas, la page garde les textes écrits dans `index.html` : le site ne casse jamais.

**Pour désactiver** : dans `assets/site.js`, mets `const AUTO_UPDATE = false;`. Aucune requête n'est alors envoyée.

### Quelle publication le site retient-il ?
Le site lit la liste des 100 dernières publications (une seule requête) et retient celle dont le **numéro de version est le plus élevé** (brouillons et préversions ignorés). Il ne se fie donc pas à l'ordre renvoyé par GitHub.

Le numéro est lu à la fin de l'étiquette, ou à défaut dans le titre de la publication. Ces écritures sont toutes comprises : `v1.0.20`, `v.1.0.20` (point en trop), `V1.0.20`, `1.0.20`, ou un titre « PolyTabs 1.0.20 ». Une étiquette sans numéro (« nightly ») est ignorée.
Pour la lisibilité des liens, je recommande l'écriture `v1.0.20`.

### Si le site n'affiche pas la dernière version
1. **La publication est-elle publiée ?** Un brouillon (draft) ou une préversion (pre-release) n'est jamais retenu.
2. **Contient-elle l'installeur ?** Un fichier nommé `PolyTabs-Setup-….exe` doit être joint. Sans lui, la version s'affiche mais le bouton garde le lien vers la page des versions.
3. **Délai.** Chaque visiteur garde la réponse de GitHub pendant une heure. Pour forcer la mise à jour dans ton navigateur : supprime la clé `polytabs-site:release:v1` du stockage local (outils de développement → Application), ou ouvre le site en navigation privée.
4. **Limite de GitHub.** GitHub accepte 60 requêtes par heure et par adresse IP. Derrière un même réseau (entreprise, école), la limite peut être atteinte : le site affiche alors son texte écrit dans `index.html`. Pense à retoucher ce texte de secours de temps en temps (version et cartes de la section *Nouveautés*).
5. **Les notes.** La version et le lien se mettent à jour même si les notes n'ont pas le bon format ; seules les cartes restent celles de secours (voir plus bas).

### Écrire les notes de version pour que le site les affiche
La description de la publication GitHub doit suivre cette forme (c'est celle des fichiers `patch-notes-….md`) :

```
## PolyTabs 1.0.18

Une phrase d'introduction (affichée sous le titre de la section).

### Nouveautés
- **Titre court.** Une ou deux phrases qui expliquent.

### Corrections
- **Autre titre.** Explication.

### Technique
- ce bloc n'est pas affiché sur le site
```

- Chaque ligne `- **Titre.** texte` devient une carte (8 cartes au maximum, texte raccourci à environ 230 caractères).
- Seules les sections dont le titre contient *Nouveautés*, *Corrections*, *Améliorations* ou *Fonctionnalités* sont affichées. Les sections *Technique*, *À retenir* et *Connu* sont ignorées.
- Seuls le **gras**, le `code` et le texte des liens sont gardés. Aucun HTML des notes n'est jamais injecté dans la page.
- Si les notes n'ont pas ce format, ou si elles sont vides, les cartes écrites dans `index.html` restent affichées.

## Ce qui reste à la main
Le contenu des sections *Fonctionnalités*, *Outils*, *Prise en main* et *Questions*, ainsi que les cartes de secours de *Nouveautés*, est écrit dans `index.html`. Quand l'application gagne une grande fonctionnalité, ajoute-la à la main (un bloc `<div class="card">` suffit).

## Tester le site chez toi
Dans ce dossier : `python -m http.server 8000`, puis ouvre http://localhost:8000. (Ouvrir `index.html` directement par double-clic marche aussi pour le contenu, mais pas pour la lecture de GitHub dans certains navigateurs.)

## Accessibilité, adaptation aux écrans et impression
Le site a été vérifié de 320 px de large (petit téléphone) à 2560 px, en portrait et en paysage :
- aucun défilement horizontal, y compris avec un texte agrandi à 200 % dans le navigateur (la taille de texte choisie par le visiteur est respectée) ;
- zones de clic d'au moins 44 px, parcours complet au clavier avec cadre de focus visible, lien « Aller au contenu » ;
- outil d'accessibilité axe-core (WCAG 2.0, 2.1 et 2.2, niveaux A et AA) : aucun problème ;
- mode contraste élevé de Windows, réduction des animations, et impression (fond blanc, sans la maquette ni les boutons) pris en charge ;
- aucun décalage de mise en page au chargement.

Un mot trop long pour l'écran est coupé plutôt que de faire défiler la page. Si tu ajoutes du contenu, garde les liens et les boutons à 44 px de haut au minimum.

## Sécurité et confidentialité
- Une politique de sécurité (`Content-Security-Policy`, dans `index.html`) n'autorise que les fichiers du site et les requêtes vers `api.github.com`.
- Une mention en bas de page explique à tes visiteurs que leur navigateur contacte GitHub et garde une réponse une heure.

## Licences
- Polices : Bricolage Grotesque, Instrument Sans et IBM Plex Mono, sous licence SIL Open Font License 1.1 (textes dans `fonts/`).
- Le logo, l'image d'aperçu et les textes sont ceux de PolyTabs (JL Assist).

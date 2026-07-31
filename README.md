# improvguit

Entraîneur d'improvisation à la guitare, organisé en grades : à chaque grade, une seule variable est libre. Fichier HTML unique, hors ligne, pensé pour cinq minutes par jour sur téléphone.

**En ligne** : https://nmulongo-sys.github.io/improvguit/
**Statut** : révision du 2026-07-31 (v5) • fichier unique `index.html`, aucune dépendance externe.

## Principe

Improviser, c'est choisir sous contrainte. Libérer toutes les variables d'un coup (notes, rythme, registre, articulation) ne produit pas de l'improvisation mais de l'errance. Chaque grade ajoute **exactement une** variable.

| Grade | Nom | Variable libérée | Ce que montre le manche |
|---|---|---|---|
| G0 | Ancrage | aucune — repérage dans la boucle | une note |
| G1 | Rythme | placement, durée, silence, attaque | une note |
| G2 | Cellule | ordre et contour mélodique | trois notes |
| G3 | Cibles | ancrage harmonique vertical | arpège + notes mobiles |
| G4 | Réservoir | matériau mélodique horizontal | gamme + notes d'accord |
| G5 | Couplage | les deux à la fois | gamme + cibles + notes hors gamme |
| G6 | Ornementation | tension locale | arpège + approches chromatiques |
| G7 | Discours | forme du chorus | arpège + position dans la forme |
| G8 | Réinterprétation | l'harmonie elle-même | arpège + substitut tritonique |
| G9 | Interaction | les autres | arpège, repère seul |
| G10 | Voix | plus rien | arpège |

## Utilisation

Ouvrir la page. Aucune installation, fonctionne hors ligne une fois chargée.

1. **Réglages** → charger un répertoire, choisir un modèle harmonique, ou saisir la boucle à la main.
2. Choisir le grade. Consigne, manche et grille s'adaptent.
3. Lancer. La barre du bas donne le tempo et le décompte de séance.

### Notation de la boucle

| Écriture | Sens |
|---|---|
| `Am7 \| D7` | une mesure par accord |
| `Bbm7 Eb7 \| Abmaj7` | deux accords dans la même mesure, à parts égales |
| `C _ _ G` | `_` prolonge l'emplacement précédent : Do sur trois temps, Sol sur un |
| `C _ _ _ \| _ _ _ G` | la tenue franchit la barre de mesure |
| `F7 *4` | la mesure est tenue quatre fois (accord tenu, pas relancé) |
| `Am \| %` | la mesure précédente est répétée |

Maximum 64 mesures. **Une mesure ne peut pas porter plus d'emplacements que de temps** : quatre en 4/4, trois en 3/4. Au-delà, la saisie est refusée — la correspondance emplacement → temps perdrait silencieusement les derniers accords. Changer le nombre de temps par mesure relit la boucle et refuse le réglage, avec message, si elle ne tient plus.

`.` est accepté comme synonyme de `_`. Séparateurs de mesure : `|` et retour à la ligne.

Suffixes reconnus : `m(maj7) maj7 m7b5 dim7 dim aug maj9 m9 m11 m7 m6 m 7sus4 sus4 sus2 13 9 7 6 5` et la triade majeure (suffixe vide). Les extensions entre parenthèses sont retirées si le suffixe n'est pas reconnu tel quel : `A7(9)` est lu comme `A7`.

La barre d'espace démarre et arrête. La lecture s'arrête si l'onglet passe en arrière-plan.

### Subdivision du temps

Réglage indépendant du nombre de temps : **aucune**, **binaire** (÷2) ou **ternaire** (÷3). Seul le clic se divise ; la grille et le calcul harmonique restent à la granularité du temps. C'est ce qui permet de rendre exactement les mesures composées :

- **12/8** → 4 temps par mesure, subdivision ternaire ;
- **6/8** → 2 temps par mesure, subdivision ternaire.

### Répertoire

**Le répertoire n'est pas dans ce dépôt** et `.gitignore` l'exclut mécaniquement. L'app le charge de trois façons, dans cet ordre :

1. `repertoire.json` servi à côté de `index.html` (absent de GitHub Pages ; destiné à l'hébergement Cloudflare) ;
2. import d'un fichier local via le bouton des réglages ;
3. saisie manuelle.

Schéma attendu :

```json
{ "version": 2,
  "morceaux": [
    { "code":"G3-3", "titre":"…", "artiste":"…", "grade":3, "diff":1,
      "tonalite":"…", "tempo":78, "battues":4, "subdivision":1, "gamme":"mineur",
      "longueur":4, "mesures":"Am | Em7 | G | Am", "remarque":"…" }
  ] }
```

Seuls `titre` et `mesures` sont obligatoires. `grade`, `tempo`, `battues`, `subdivision` et `gamme` sont appliqués à la sélection ; `longueur` sert à la validation. `subdivision` vaut 1, 2 ou 3 et par défaut 1.

## Architecture & conventions

Fichier unique, sections numérotées dans le `<script>` :

1. **Théorie** — `NOMS`/`FR`/`DEGRE` (12 classes de hauteur), table `QUALITES` (alias → intervalles), `ALIAS` trié par longueur décroissante pour apparier d'abord le suffixe le plus long. `lireAccord()` renvoie `{sym, pc, iv, notes}` ou `null`, avec un repli qui retire les parenthèses. `lireBoucle(texte, battues)` renvoie `{mesures}` ou `{erreur}` : jamais d'exception, toute saisie illisible remonte un message. Le second argument sert au plafond d'emplacements.
2. **Modèle de données** — une boucle est un **tableau de mesures**, chaque mesure un tableau d'emplacements. Les accords tenus — sur plusieurs mesures (`*4`, `%`) comme à l'intérieur d'une mesure (`_`) — partagent **la même référence d'objet** : c'est cette identité qui distingue un accord tenu d'un accord rejoué, pour l'affichage comme pour la nappe audio. Trois fonctions en dépendent (`construireTimeline`, `dureeAccord`, `poidsNotes`) et aucune n'a besoin de connaître la notation.
3. **Persistance** — `localStorage`, clé `improvguit.v2`, schéma `{grade, saisie, battues, tempo, zone, duree, gamme, toniqueModele, subdivision, pad, bourdon, clic, miroir, morceau, modeleActif}`. Lecture et écriture sous `try/catch`. Une clé absente d'une sauvegarde ancienne garde sa valeur par défaut.
4. **Ligne de temps** — `construireTimeline()` produit un temps par battue avec `{mesure, temps, fort, accord, debutAccord, zoneAtterrissage}`. Dans une mesure à plusieurs emplacements, l'accord d'un temps est `floor(temps × nEmplacements / battues)` ; quand il y a autant d'emplacements que de temps, la correspondance est l'identité — c'est ce qui rend `_` exact. `debutAccord` compare les références. `zoneAtterrissage` marque le dernier temps avant un changement : c'est la cible visuelle des grades ≥ 3.
5. **Audio** — `AudioContext` partagé, ordonnanceur à anticipation (`setInterval` 25 ms, fenêtre 120 ms). Clic carré à quatre hauteurs (1760 Hz changement d'accord, 1320 Hz temps fort, 880 Hz autres, 660 Hz subdivision) ; les subdivisions sont générées dans l'ordonnanceur, la ligne de temps les ignore. Nappe en ondes triangulaires dont la durée vient de `dureeAccord()`, plafonnée à 12 s. **Bourdon** facultatif : fondamentale et octave sur la tonique modale, une octave sous la nappe, programmé une seule fois par tour de boucle et non par accord ; son extinction déborde sur l'attaque du tour suivant, qui la recouvre. `arreter()` ferme le gain maître sur 20 ms : sans cela, clics et nappes déjà programmés continuent de sonner après l'arrêt, jusqu'à deux tiers de temps avec les subdivisions. La synchro visuelle dépile une file `{i, t}` en `requestAnimationFrame` contre `ctx.currentTime` — jamais `setTimeout`.
6. **Calcul d'affichage** — `marques()` retourne `classe de hauteur → {couleur, étiquette, halo, petit}` selon le mode du grade. Point unique où la pédagogie touche le rendu ; ajouter un grade = ajouter un mode ici et une branche dans `rendreConsigne()`. La tonique dont dépendent la gamme dessinée, le texte de la consigne et le bourdon vient d'une source unique, `toniqueModale()` : la fondamentale du premier accord de la boucle.
7. **Bulles pédagogiques** — un clic sur une pastille du manche ouvre une explication adaptée au grade. **Deux couches, séparées.** `analyserNote(pc)` est purement **analytique** : elle dérive de la boucle des faits vérifiables — degré dans chaque accord, note commune à toute la boucle, double fonction (deux degrés différents selon l'accord), approche à un demi-ton d'une note de l'accord courant, appartenance à la gamme et à la cellule. Aucun texte. `CORPUS` est la couche **éditoriale** : un texte par grade et par situation, indexé `rel:N` (intervalle depuis la tonique modale), `cellule`, `double`, `commune`, `role:…`, `approche`, `accord`, `gamme`, `hors`, `*`. `cleCorpus()` résout dans cet ordre de priorité ; un garde-fou `si:"min"/"maj"` réserve une entrée aux boucles mineures ou majeures. **Le grade ne change pas les faits, il choisit lequel mérite d'être dit** — même principe que `marques()`, un seul point de branchement. Le filet `"*"` de chaque grade garantit qu'aucune combinaison ne reste muette. **Renvois bidirectionnels** : une entrée du corpus porte `e:"<nom de modèle>"` et affiche un bouton qui charge l'exercice ; réciproquement chaque `MODELES` porte `p:{deg, t}`, dont le texte s'affiche dans la consigne avec un lien qui rouvre la bulle sur la note concernée. `etat.modeleActif` est persisté, posé par `appliquerModele()` **après** `appliquerSaisie()` qui l'efface — toute saisie manuelle ou choix de morceau libère le modèle.
8. **Manche** — SVG **vertical**, sillet en haut, cordes en colonnes, **grave à gauche** par défaut (convention des diagrammes d'accords) ; bascule miroir dans les réglages. Cordes à vide de gauche à droite : `[4,9,2,7,11,4]`. Repères aux cases 3, 5, 7, 9, double au 12. `viewBox` recalculé selon la zone, conteneur défilant au-delà de 52 vh.
9. **Grille** — un bloc par mesure, une cellule par temps, défilement automatique sur la mesure courante (utile sur les formes de 32 mesures). Les symboles consécutifs identiques sont fusionnés : `C _ _ G` s'affiche « C G ».
10. **Consigne** — texte généré depuis la boucle réelle, jamais codé en dur. G1 et G2 tirent une contrainte au sort, rejouable par `↺`.
11. **Répertoire** — `poserRepertoire()` construit le sélecteur groupé par grade ; `chargerRepertoireDistant()` tente `repertoire.json` et échoue en silence.
12. **Interface** — délégation d'événements, aucun cadre externe.

Conventions de couleur, appliquées partout : **laiton** = fondamentale ou note d'ancrage, **indigo** = autres notes d'accord, **vert** = septième, halo des notes mobiles et approches chromatiques, **gris** = notes de passage. Manche en bois sombre et frettes laiton, chrome en ardoise froide : l'instrument se distingue de l'interface.

Notions calculées, à ne pas confondre : les **notes communes** le sont à *tous* les accords de la boucle (intersection globale, pas deux à deux) ; à défaut, la **note d'ancrage** est la classe de hauteur la plus présente, pondérée par la durée — un accord tenu trois temps pèse trois fois plus qu'un accord d'un temps.

Accessibilité : `aria-pressed` sur les commutateurs, focus visible, `prefers-reduced-motion` respecté. `navigator.wakeLock` demandé au lancement, sous `try/catch`.

## Validation

```sh
npm install     # jsdom, seule dépendance, de développement uniquement
npm test
```

`test.js` charge `index.html` dans un DOM et le pilote comme un utilisateur. Couverture : parseur et plafond d'emplacements aux quatre métriques, token de prolongation et identité par référence, tenue par-dessus la barre, ligne de temps et durées d'accord, notes communes et mobiles, ancrage pondéré, substitut tritonique, ordonnanceur audio sur `AudioContext` factice (comptage et placement des clics, tenue et hauteur du bourdon, coupure du maître à l'arrêt), rendu des onze grades, modèles, réglages, saisie invalide, persistance, bulles pédagogiques (analyse, couverture des 132 combinaisons grade × note, renvois théorie ↔ exercice non orphelins, clics réels dans le DOM), absence de dépendance externe et de contenu pédagogique dans `index.html`.

**Le répertoire étant hors dépôt, les séries qui en dépendent sont ignorées s'il est absent** : un clone nu valide le moteur et l'interface (260 assertions) ; avec `repertoire.json` posé à côté, la vérification fiche par fiche s'ajoute, pour un total qui dépend du nombre de fiches. Le test annonce lequel des deux régimes il a suivi.

## Journal de développement

### 2026-07-31 — v5, bulles pédagogiques sur le manche

Un clic sur une pastille ouvre une explication adaptée au grade. L'architecture sépare
strictement ce qui se calcule de ce qui s'écrit : `analyserNote()` ne produit que des
faits dérivés de la boucle, `CORPUS` ne contient que du texte. Trente-sept entrées
réparties sur les onze grades, plus un filet par grade — les 132 combinaisons
grade × note sont couvertes, un test le vérifie.

Le corpus s'appuie sur les ouvrages de référence du projet : taxonomie des notes
étrangères et période antécédent/conséquent (Stone), enclosures au demi-ton (Fret Dojo),
ciblage des notes d'accord (*Arpeggios Building Blocks*).

Les renvois vont dans les deux sens. La théorie propose l'exercice : une entrée du corpus
peut afficher un bouton qui charge le modèle correspondant. L'exercice explique sa théorie :
chaque modèle embarqué porte désormais un texte et une note à aller voir sur le manche.
`etat.modeleActif` suit le modèle en cours et se libère dès qu'une saisie manuelle ou un
morceau du répertoire prend la main.

Bourdon retravaillé : dent de scie filtrée en passe-bas (1100 Hz, Q 0.7) et quatre
oscillateurs — deux hauteurs doublées à ±5 centièmes — au lieu des deux triangles de la
v4. Le battement lent remplace la fixité de synthèse ; la v4 sonnait comme un test auditif.

260 assertions.

### 2026-07-30 — v4, bourdon de tonique

- **Bourdon** : tenue sur la tonique modale, sous la boucle entière, indépendante des changements d'accord. Coupé par défaut, troisième interrupteur des réglages, persisté. Fondamentale à `36+pc` et son octave, ondes triangulaires à 0.085, même amplitude que la nappe : sonnant une octave plus bas, où l'oreille est moins sensible, il reste perçu légèrement en dessous — ce qu'on attend d'un socle. **Pas de quinte** : sur un premier accord demi-diminué elle formerait une seconde mineure tenue contre le ♭5. Programmé une seule fois par tour de boucle (`pointeur === 0`) sur `parTemps × timeline.length` ; l'extinction déborde de 0,12 s sur l'attaque du tour suivant, les deux se croisent et la couture ne s'entend pas.
- **Pourquoi** : la nappe seule ne fixe aucun centre tonal. `Cm7 | F7` — le modèle « i–IV (dorien) » — s'entend tout aussi bien comme un ii–V vers Si♭, et pour cause : ce sont les deux premières mesures d'*Autumn Leaves*, et Do dorien n'est que la gamme de Si♭ lue depuis son second degré. Rien dans le matériau ne les sépare ; seule la tonique le fait. Dans la musique réelle la mélodie et le groove la désignent — un vamp `Am7 | D7` en mesures égales ne s'entend jamais comme un ii–V en Sol. L'app supprimant les deux, le bourdon rend cette fonction explicite.
- **`toniqueModale(mesures, secours)`** : source unique de la tonique, la fondamentale du premier accord de la boucle. Corrige une contradiction interne : `marques()` dessinait la gamme depuis ce premier accord tandis que les consignes des grades 4 et 5 l'annonçaient depuis l'accord **courant**. Sur la mesure de F7 dans `Cm7 | F7`, le manche montrait Do dorien pendant que le texte affichait « Fa dorien ». Manche, consigne et bourdon partagent désormais la même définition. Limite assumée : sur une grille fonctionnelle dont le premier accord est un ii, ce n'est pas la tonique réelle — l'œil et l'oreille se trompent alors ensemble, ce qui reste diagnosticable.
- **Consigne de G4** : nomme le bouclage comme fabricant du mode et renvoie au bourdon.
- **Modèles inchangés** : pondérer la tonique (`Cm7 *2 | F7`) aurait éloigné le vamp dorien de sa forme canonique, qui est en mesures égales. Le bourdon traite la cause, la pondération n'aurait masqué que le symptôme.
- 215 assertions jsdom au vert sur clone nu (183 + 32). Le bourdon est couvert par le banc `AudioContext` factice déjà présent dans la suite : une tenue par tour de boucle et non par mesure, hauteur prise sur le premier accord, rapport d'octave exact, aucune tierce, niveau plafonné à celui de la nappe, silence complet quand le réglage est coupé. `jouerUnTour()` prend désormais explicitement l'état des trois sources sonores, faute de quoi un test antérieur laissant le bourdon actif fausserait le comptage des clics.

### 2026-07-29 — v3, rythme intra-mesure et subdivisions

- **Token de prolongation `_`** : une mesure peut porter un rythme harmonique inégal (`C _ _ G` = trois temps puis un). L'emplacement reçoit la même référence d'objet que le précédent, ce qui suffit à en faire un accord tenu. `construireTimeline()`, `dureeAccord()` et `poidsNotes()` itérant déjà par emplacement et comparant par référence, aucune n'a été modifiée : le changement tient dans `lireBoucle()`. `_` peut ouvrir une mesure, la tenue franchit alors la barre.
- **Plafond strict** : le nombre d'emplacements d'une mesure ne peut plus dépasser le nombre de temps. `lireBoucle()` prend les battues en second argument. Corrige un bug silencieux — le plafond était figé à quatre sans regarder les battues, si bien qu'une mesure à quatre accords en 3/4 passait la validation et perdait le quatrième, jamais atteint par la correspondance emplacement → temps.
- **Subdivisions** : nouveau réglage (aucune / binaire / ternaire), persisté, et champ `subdivision` dans les fiches. Rendu dans l'ordonnanceur seul ; la ligne de temps reste à la granularité du temps. Clic de subdivision à 660 Hz.
- **Traîne audio supprimée** : `arreter()` ferme le gain maître sur 20 ms. Les événements sont programmés à l'avance ; avec les subdivisions, jusqu'à une seconde de clics pouvait sonner après l'arrêt à 40 BPM. Corrige aussi la traîne préexistante de 120 ms.
- **Réglages réorganisés** : temps par mesure et subdivision sur une ligne, séance et zone du manche sur la suivante, gamme seule — masquée par `display` plutôt que `visibility`, n'ayant plus de voisine dont préserver la largeur.
- **`test.js` entre dans le dépôt**, avec `package.json`. Les séries dépendant du répertoire sont ignorées si le fichier privé est absent, de sorte qu'un clone nu valide quand même le moteur et l'interface.
- 1248 assertions jsdom au vert (183 sur clone nu).

### 2026-07-29 — v2, modèle par mesure
- **Rupture de modèle** : la boucle n'est plus « N accords × durée fixe » mais une liste de mesures portant chacune un à quatre accords. Débloque les grilles à rythme harmonique irrégulier (deux accords dans une mesure, accord tenu 16 mesures).
- Notation `*N` (mesure tenue) et `%` (répétition), plafond porté à 64 mesures.
- Parseur : ajout de `m(maj7)`, `7sus4`, `m11`, `13`, et repli sur retrait des parenthèses.
- Note d'ancrage : repli sur la classe de hauteur la plus présente au lieu de la fondamentale du premier accord, pour les boucles sans note commune globale.
- Grades 5 à 10 implémentés : couplage (gamme + cibles + notes hors gamme), ornementation (approches chromatiques), discours (position dans la forme), réinterprétation (substitut tritonique), interaction, voix.
- Répertoire externe : chargement de `repertoire.json`, import de fichier local, sélecteur groupé par grade. `.gitignore` exclut le répertoire du dépôt.
- Grille défilante avec suivi automatique de la mesure courante.
- 540 assertions jsdom au vert.

### 2026-07-29 — Révision initiale
- Moteur harmonique : analyse d'accords (17 qualités), notes communes, notes mobiles, cellule de trois notes.
- Manche SVG vertical, cinq zones, bascule miroir, étiquetage par note ou par degré selon le grade.
- Grades 0 à 4 avec consignes générées et tirage de contraintes pour G1 et G2.
- Métronome à anticipation, nappe d'accords optionnelle, minuteur de séance (3/5/10 min ou libre), verrou d'écran.
- Huit modèles harmoniques transposables, saisie libre de boucle avec message d'erreur.
- Persistance `localStorage`, 104 tests jsdom au vert.

## Licence

Aucun fichier `LICENSE` dans le dépôt à ce jour : tous droits réservés par défaut. Ajouter une licence MIT si le partage est souhaité.

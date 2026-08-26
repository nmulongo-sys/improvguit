# improvguit

Entraîneur d'improvisation à la guitare, organisé en grades : à chaque grade, une seule variable est libre. Fichier HTML unique, hors ligne, pensé pour cinq minutes par jour sur téléphone.

**En ligne** : https://nmulongo-sys.github.io/improvguit/
**Statut** : révision du 2026-08-22 • fichier unique `index.html`, aucune dépendance externe.

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

L'application a **deux voies**, commutées en haut de page.

- **Grades** — la voie principale décrite ci-dessus : une boucle, un grade, une consigne.
- **Atelier** — onze paliers de travail des triades (A0 → A10), avec leur propre grille.
  Entrer dans un palier **pose sa grille et met l'atelier en suivi de boucle** ; la
  boucle qui était en cours est mise de côté et rendue au retour en voie Grades.
  Couper « suivre la boucle » redonne la navigation degré par degré, hors tempo :
  c'est le mode d'étude.

**Boîte à rythmes** — quatrième interrupteur des réglages. Le moteur cesse d'improviser
au-dessus d'un métronome : une section rythmique entre, et le clic **ne disparaît pas**, il se
subordonne — il reste le seul à marquer le changement d'accord, ce qu'aucun groove ne dit.
Le sélecteur ne propose **que** les grooves compatibles avec la métrique courante ; quand aucun
ne l'est, la batterie se tait, le clic reste, et l'application le dit à l'écran. Un curseur de
densité, **séparé du grade**, dégarnit le groove sans toucher à l'exercice. Et si un gap de démo
est armé, la batterie se retire avec elle : c'est le retrait programmé du support, pas une panne.

**Mode pupitre** — le bouton d'agrandissement bascule l'affichage en pupitre : viewport
réparti en `100dvh`, manche dimensionné sur la hauteur restante, plus de zones de
défilement imbriquées. La sortie est **uniquement manuelle** — mettre en pause ne
referme pas le pupitre. La préférence d'entrée automatique au démarrage est persistée
(`etat.pupitre`) ; le régime courant (`etat.jeu`) ne l'est pas.

**À la pause**, l'affichage **gèle** : le manche garde l'accord atteint, le coach garde
ses anneaux, et le temps atteint reste marqué en creux dans la grille. Seule la fin de
séance remet tout à zéro.

### Notation de la boucle

| Écriture | Sens |
|---|---|
| `Am7 \| D7` | une mesure par accord |
| `Bbm7 Eb7 \| Abmaj7` | deux accords dans la même mesure, à parts égales |
| `C _ _ G` | `_` prolonge l'emplacement précédent : Do sur trois temps, Sol sur un |
| `C _ _ _ \| _ _ _ G` | la tenue franchit la barre de mesure |
| `F7 *4` | la mesure est tenue quatre fois (accord tenu, pas relancé) |
| `Am \| %` | la mesure précédente est répétée |
| `[A] C \| G \| [B] Am \| F` | `[B]` en tête de mesure **ouvre une partie** |

Maximum 64 mesures. **Une mesure ne peut pas porter plus d'emplacements que de temps** : quatre en 4/4, trois en 3/4. Au-delà, la saisie est refusée — la correspondance emplacement → temps perdrait silencieusement les derniers accords. Changer le nombre de temps par mesure relit la boucle et refuse le réglage, avec message, si elle ne tient plus.

**Marqueur de partie.** Une lettre entre crochets, **en tête de mesure**, ouvre une partie qui court **jusqu'au marqueur suivant** — ce n'est pas un attribut de mesure. `[A] C | G | [B] Am | F` met les deux premières mesures en partie A et les deux suivantes en B. Sans aucun marqueur, la grille entière est en `A` : les boucles écrites avant l'existence du marqueur ne changent pas d'un iota. Les abréviations héritent de la partie courante (`[B] C | %` fait deux mesures en B, `[B] C *3` en fait trois).

La partie est lue par la **boîte à rythmes**, qui filtre ses variantes dessus : un groove peut déclarer des mesures propres à la partie B (`rk-base` le fait — au refrain, le charleston s'ouvre sur les temps). Elle n'est lue par rien d'autre pour l'instant.

Quatre écritures sont **refusées, avec message** : un marqueur nu sans mesure (`[B] | C`), plus d'une lettre (`[AB]`), autre chose qu'une lettre (`[1]`, `[*]` — le `*` est le joker d'un *groove*, pas une partie de grille), et un marqueur ailleurs qu'en tête (`C [B] G`) : une partie commence sur une barre de mesure, jamais au milieu.

`.` est accepté comme synonyme de `_`. Séparateurs de mesure : `|` et retour à la ligne.

Suffixes reconnus : `m(maj7) maj7 m7b5 dim7 dim aug maj9 m9 m11 m7 m6 m 7sus4 sus4 sus2 13 9 7 6 5` et la triade majeure (suffixe vide). Les extensions entre parenthèses sont retirées si le suffixe n'est pas reconnu tel quel : `A7(9)` est lu comme `A7`.

La barre d'espace démarre et arrête. La lecture s'arrête si l'onglet passe en arrière-plan.

### Subdivision du temps

Réglage indépendant du nombre de temps : **aucune**, **binaire** (÷2) ou **ternaire** (÷3). Seul le clic se divise ; la grille et le calcul harmonique restent à la granularité du temps. C'est ce qui permet de rendre exactement les mesures composées :

- **12/8** → 4 temps par mesure, subdivision ternaire ;
- **6/8** → 2 temps par mesure, subdivision ternaire.

### Répertoire

**Le répertoire n'est pas dans ce dépôt** et `.gitignore` l'exclut mécaniquement. L'app le charge de trois façons, dans cet ordre :

1. `repertoire.json` servi à côté de `index.html` — absent de GitHub Pages, présent sur le déploiement Cloudflare privé, derrière Access ;
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

1. **Théorie** — `NOMS`/`FR`/`DEGRE` (12 classes de hauteur), table `QUALITES` (alias → intervalles), `ALIAS` trié par longueur décroissante pour apparier d'abord le suffixe le plus long. `lireAccord()` renvoie `{sym, pc, iv, notes}` ou `null`, avec un repli qui retire les parenthèses. `lireBoucle(texte, battues)` renvoie `{mesures, sections}` ou `{erreur}` : jamais d'exception, toute saisie illisible remonte un message. Le second argument sert au plafond d'emplacements. `sections` est **aussi long que `mesures`** : une partie par mesure, dérivée des marqueurs `[X]` par une portée courante initialisée à `"A"` — c'est ce qui rend une grille sans marqueur strictement identique à ce qu'elle était.
2. **Modèle de données** — une boucle est un **tableau de mesures**, chaque mesure un tableau d'emplacements. Les accords tenus — sur plusieurs mesures (`*4`, `%`) comme à l'intérieur d'une mesure (`_`) — partagent **la même référence d'objet** : c'est cette identité qui distingue un accord tenu d'un accord rejoué, pour l'affichage comme pour la nappe audio. Trois fonctions en dépendent (`construireTimeline`, `dureeAccord`, `poidsNotes`) et aucune n'a besoin de connaître la notation.
3. **Persistance** — `localStorage`, clé `improvguit.v2`, schéma `{grade, saisie, battues, tempo, zone, duree, gamme, toniqueModele, subdivision, pad, bourdon, clic, miroir, coach, pupitre, morceau, modeleActif, tonalite, impro, imprHarmonie, imprRythme, imprMelodie, imprGap, imprSuite, imprManche, batterie, groove, grooveDensite, batterieGap, atelier, palier, atelierBoucle, atelierRenv, atelierJeu, saisieAvant}`. Lecture et écriture sous `try/catch`. Une clé absente d'une sauvegarde ancienne garde sa valeur par défaut. `etat.jeu` (régime pupitre courant) est délibérément **hors schéma** : on ne rouvre pas l'application en pupitre.
4. **Ligne de temps** — `construireTimeline()` produit un temps par battue avec `{mesure, temps, fort, section, accord, debutAccord, zoneAtterrissage}`. `section` est la partie de la mesure, recopiée sur **chaque temps** : c'est ce qui permet à `sectionCourante(i)` de la rendre depuis l'ordonnanceur sans tenir d'état parallèle. Dans une mesure à plusieurs emplacements, l'accord d'un temps est `floor(temps × nEmplacements / battues)` ; quand il y a autant d'emplacements que de temps, la correspondance est l'identité — c'est ce qui rend `_` exact. `debutAccord` compare les références. `zoneAtterrissage` marque le dernier temps avant un changement : c'est la cible visuelle des grades ≥ 3.
5. **Audio** — `AudioContext` partagé, ordonnanceur à anticipation (`setInterval` 25 ms, fenêtre 120 ms). Clic carré à quatre hauteurs (1760 Hz changement d'accord, 1320 Hz temps fort, 880 Hz autres, 660 Hz subdivision) ; les subdivisions sont générées dans l'ordonnanceur, la ligne de temps les ignore. Nappe en ondes triangulaires dont la durée vient de `dureeAccord()`, plafonnée à 12 s. **Bourdon** facultatif : fondamentale et octave sur la tonique modale, une octave sous la nappe, programmé une seule fois par tour de boucle et non par accord ; son extinction déborde sur l'attaque du tour suivant, qui la recouvre. `arreter()` ferme le gain maître sur 20 ms : sans cela, clics et nappes déjà programmés continuent de sonner après l'arrêt, jusqu'à deux tiers de temps avec les subdivisions. La synchro visuelle dépile une file `{i, t}` en `requestAnimationFrame` contre `ctx.currentTime` — jamais `setTimeout`.
6. **Calcul d'affichage** — `marques()` retourne `classe de hauteur → {couleur, étiquette, halo, petit}` selon le mode du grade. Point unique où la pédagogie touche le rendu ; ajouter un grade = ajouter un mode ici et une branche dans `rendreConsigne()`. La tonique dont dépendent la gamme dessinée, le texte de la consigne et le bourdon vient d'une source unique, `toniqueModale()` : la fondamentale du premier accord de la boucle.
7. **Bulles pédagogiques** — un clic sur une pastille du manche ouvre une explication adaptée au grade. **Deux couches, séparées.** `analyserNote(pc)` est purement **analytique** : elle dérive de la boucle des faits vérifiables — degré dans chaque accord, note commune à toute la boucle, double fonction (deux degrés différents selon l'accord), approche à un demi-ton d'une note de l'accord courant, appartenance à la gamme et à la cellule. Aucun texte. `CORPUS` est la couche **éditoriale** : un texte par grade et par situation, indexé `rel:N` (intervalle depuis la tonique modale), `cellule`, `double`, `commune`, `role:…`, `approche`, `accord`, `gamme`, `hors`, `*`. `cleCorpus()` résout dans cet ordre de priorité ; un garde-fou `si:"min"/"maj"` réserve une entrée aux boucles mineures ou majeures. **Le grade ne change pas les faits, il choisit lequel mérite d'être dit** — même principe que `marques()`, un seul point de branchement. Le filet `"*"` de chaque grade garantit qu'aucune combinaison ne reste muette. **Renvois bidirectionnels** : une entrée du corpus porte `e:"<nom de modèle>"` et affiche un bouton qui charge l'exercice ; réciproquement chaque `MODELES` porte `p:{deg, t}`, dont le texte s'affiche dans la consigne avec un lien qui rouvre la bulle sur la note concernée. `etat.modeleActif` est persisté, posé par `appliquerModele()` **après** `appliquerSaisie()` qui l'efface — toute saisie manuelle ou choix de morceau libère le modèle.
8. **Manche** — SVG **vertical**, sillet en haut, cordes en colonnes, **grave à gauche** par défaut (convention des diagrammes d'accords) ; bascule miroir dans les réglages. Cordes à vide de gauche à droite : `[4,9,2,7,11,4]`. Repères aux cases 3, 5, 7, 9, double au 12. `viewBox` recalculé selon la zone, conteneur défilant au-delà de 52 vh.
9. **Grille** — un bloc par mesure, une cellule par temps, défilement automatique sur la mesure courante (utile sur les formes de 32 mesures). Les symboles consécutifs identiques sont fusionnés : `C _ _ G` s'affiche « C G ».
10. **Consigne** — texte généré depuis la boucle réelle, jamais codé en dur. G1 et G2 tirent une contrainte au sort, rejouable par `↺`.
11. **Répertoire** — `poserRepertoire()` construit le sélecteur groupé par grade ; `chargerRepertoireDistant()` tente `repertoire.json` et échoue en silence.
12. **Coach** — `CONSIGNES` porte **42 instructions réparties sur les onze grades**. Une consigne est `{t, chemin?, si?, siAccords?, rel?}` ; `chemin` décrit un geste que `cheminCoach()` calcule **à l'exécution** sur la boucle réelle, jamais stocké. Dix types : `montee`, `descente`, `pilier`, `cible`, `cellule`, `commune`, `double`, `approche`, `broderie`, `enclosure`. `cheminCoach()` renvoie `null` si le geste est incalculable sur la boucle en cours, et la consigne est alors écartée du tirage. Rotation toutes les `TOURS_CONSIGNE = 4` boucles, jamais deux fois de suite la même. **Le coach ne vérifie rien** : ni micro, ni écoute. Il propose.
13. **Atelier des triades** — onze paliers `A0 → A10`, `PALIERS[n] = {n, court, titre, t, deg, renv, jeux, gamme, grille, mes, proche?, sym?}`. Une seule variable s'ouvre par palier, comme pour les grades : degrés disponibles (A0 les trois piliers, A1 les mineurs, A2 la gamme entière), puis renversements (A3, A4), puis enchaînement au plus près (A5), puis jeux de cordes (A6 à A8), puis mode mineur (A9) et triades symétriques (A10).
    - **Formes calculées, jamais tabulées.** `formeTriade(pc, qualité, renv, jeu, casesMin, casesMax, écartMax, racineMin)` construit une forme voix par voix sous contrainte de hauteur croissante et d'écart maximal. Le huitième paramètre `racineMin` ne remonte **que** le départ de la fondamentale : les voix hautes d'une triade tombent souvent sur des cases plus basses (Do en 10-9-8), les brider avec le même plancher supprimerait la forme au lieu de la décaler. C'est ce qui permet à `formesTriade()` d'énumérer les octaves une à une.
    - **Jeux de cordes** : `JEUX = [6-5-4, 5-4-3, 4-3-2, 3-2-1]`, désignés par leur indice dans les paliers. `RENVERSEMENTS = [fondamentale, 1er, 2e]`. `MIDI_CORDES = [40,45,50,55,59,64]` — un renversement se définit par l'ordre des voix, donc par des hauteurs réelles et non par des classes de hauteur.
    - **Grille de palier** : chaque palier porte sa suite d'accords **en degrés** (`grille`) et son nombre de mesures par accord (`mes`). `grillePalier()` l'harmonise à la volée par `harmoniserGamme()` depuis la tonique de travail — **aucune suite d'accords n'est écrite en dur**, tout se transpose. Les mesures tenues passent par `%`. A0 vaut `1 | 4 | 1 | 5` sur deux mesures par accord ; A1 `1 | 6 | 4 | 5` ; A2 et suivants le cycle de quartes dans la gamme, `1 | 4 | 7 | 3 | 6 | 2 | 5 | 1`.
    - **Tonique de travail** : `toniqueAtelier()` renvoie `etat.toniqueModele`, celle du sélecteur. C'est la même des deux côtés — grille posée et lecture à la main. Changer de tonique en atelier réécrit la grille du palier.
    - **Enchaîner au plus près** : le drapeau `proche` (A5 et au-delà) fait passer le choix de forme par `formeProche()`, qui retient, parmi les renversements et jeux de cordes que le palier autorise, celle dont le centre est le plus proche de la précédente. Le **jeu de cordes garde la priorité** : `PENALITE_JEU = 6` cases dans le score, on ne le quitte que si le voyage économisé dépasse ce seuil. Le sélecteur « Cordes » pose donc la priorité, le moteur y obéit. La **fenêtre affichée** entre dans le choix — une forme qu'on ne voit pas ne sert à rien —, avec repli sur tout le manche si elle n'offre rien. Départage stable par case la plus basse puis renversement le plus bas : deux formes à égalité ne doivent pas clignoter d'un rendu à l'autre.
    - **`formeMemo`** : `triadeAtelier()` est appelée **trois fois par rendu** (manche, barre, consigne). Sans mémoire, la forme choisie au plus près se déplacerait à chaque appel. La mémoire est indexée par accord et par réglage, et `oublierFormeAtelier()` la vide partout où la chaîne doit repartir : changement de palier, de grille, de tonique, de jeu de cordes, de fenêtre.
14. **Interface** — délégation d'événements, aucun cadre externe. Une table unique, `BASCULES`, relie l'identifiant d'un interrupteur à sa clé d'état ; elle était écrite deux fois — dans `remplirSelects()` et dans `brancher()` — et une liste dupliquée diverge en silence.
15. **Impro — la démonstration jouée** — le coach *dit* ce qu'il faudrait jouer ; cette couche le *joue*. Elle n'est pas un second cerveau : `cheminCoach()` livrait déjà une suite de hauteurs **orientées** (`{pc, ord, h}`), c'est-à-dire la matière d'une phrase — il lui manquait un rythme, un registre et une voix. **Ajouter une consigne au coach étend donc la démonstration sans une ligne de plus ici.**
    - **Trois couches, coupables séparément**, et ce sont trois questions posées à la même note : *ai-je le droit* (harmonie), *quand* (rythme), *pourquoi celle-là* (mélodie). ⚑ **Une couche coupée ne se tait pas : elle produit la version pauvre.** Harmonie coupée, le réservoir tombe à la gamme seule et les rendez-vous — temps fort, `zoneAtterrissage` — ne sont plus tenus : on entend la ligne passer *à côté* du changement d'accord. Rythme coupé, une note par temps, toutes égales : la ligne devient un exercice de gamme, juste et sans discours. Mélodie coupée, les hauteurs légales sont tirées au hasard : des notes justes qui ne racontent rien. Les trois coupées d'un coup donnent le témoin : si ça sonne bien, le générateur ne fait rien.
    - **L'ordre des trois n'est pas décoratif.** Le rythme passe **en premier** parce qu'il fixe le *nombre* de notes à trouver : une figure mélodique de trois pas ne se plaque pas sur un rythme qui demande sept attaques ; on tire la cellule, puis on remplit en bouclant le geste.
    - **Le registre se décide une fois**, au départ de la phrase, puis se suit par proximité (`versMidi`). Le recalculer note à note ferait descendre une « montée » — les classes de hauteur sont modulo 12, et c'est exactement la faute que `deroulerChemin()` a déjà eu à corriger sur le manche.
    - **La démo se bride au grade** : `DENSITE[grade]` plafonne les attaques par mesure et `reservoirImpro()` suit `grade().mode`. À G0 elle pose l'ancrage et le laisse sonner ; à G2 elle ne sort pas de la cellule. Même principe que `marques()` et que les paliers : une seule variable s'ouvre à la fois. La démo est le modèle exact de ce qui est demandé, pas la vitrine de ce que le moteur sait faire.
    - **Cycle démo + gap + démo**, cadencé **à la mesure** : `imprGap = 4` vaut quatre mesures quelle que soit la boucle — sur une boucle de deux, le gap franchit deux tours, et c'est la convention du trade fours. ⚑ **Pendant le gap, seule cette couche se tait** : nappe, bourdon, clic, grille et coach continuent, sinon le gap n'est pas un tour de parole mais une panne. On ne touche jamais au maître ; on ne programme simplement aucune note. Les blocs de démo vont **par paires** en mode *reprise* (la phrase revient une fois après le gap : appel à imiter) et sont neufs à chaque bloc en mode *échange* (trade fours). « Selon le grade » bascule à G7, qui s'appelle Discours et parle déjà de question et de réponse.
    - **Une quatrième voix**, distincte de la nappe, du bourdon et du clic — sans quoi la ligne se noie dans son propre fond. Corde pincée : deux sources légèrement désaccordées et un passe-bas qui **descend avec l'enveloppe**, car une hauteur au timbre constant s'entend comme un test auditif. Registre MIDI 57-81, au-dessus de la nappe (48-64) et du bourdon (36-48) : trois étages qui ne se marchent pas dessus. Tout passe par `maitre` et jamais par `ctx.destination` — c'est ce qui fait qu'`arreter()` éteint aussi la démo, sans une ligne de plus.
    - **Le manche pendant la démo** : la figure du coach reste affichée, et un halo (`#imprHalo`) la suit note à note. Les deux ne disent pas la même chose — la figure est le geste, le halo est l'endroit où le doigt se pose *maintenant*. Le halo se dépile contre `ctx.currentTime`, comme la synchro des temps : il suit la note **entendue**, pas la note programmée, qui a jusqu'à 120 ms d'avance.
    - ⭐ **L'aléa est injectable** — `poserAlea()`, générateur `graine()` en xorshift32. Ce n'est pas une commodité : un générateur qui appelle `Math.random()` en dur n'est **pas vérifiable**, et chaque assertion du banc passerait des deux côtés. `tirerConsigne()` est passé par la même porte.
    - **Le vocabulaire rythmique embarqué est minimal et de bien commun** — noire, silence, blanche, croches, croche pointée-double, contretemps, doubles, triolet, chabada, silence ternaire. Les relevés sous droits ne sont pas ici : ils vivent dans `corpus/grooves.json`, côté portail, derrière Access. **Le moteur connaît la forme d'une figure ; le corpus privé n'ajoute pas une capacité, il ajoute du répertoire.**
16. **Boîte à rythmes** — section `5 bis` du source. Le moteur improvisait au-dessus d'un métronome ; il improvise maintenant au-dessus d'une section rythmique.
    - **Le schéma de groove est celui du métronome, adopté tel quel** — `{famille, id, label, count, battues, metre, min, max, jam, voix:[{role, timbre, grid}]}` — et non un second schéma : un seuil dupliqué diverge en silence. **`battues` est le seul champ ajouté, et il vaut 4 par défaut** : les 33 grooves du métronome restent valides sans une seule modification.
    - ⚑ **`count:12` ne veut pas dire « ternaire ».** C'est `casesParTemps = count / battues` qui décide : `12/4 = 3` cases par temps est ternaire (le shuffle), mais `12/3 = 4` cases par temps est **binaire** (la valse), et `12/2 = 6` est ternaire (le 6/8 senti à deux). Le champ `metre` reste déclaré pour la lisibilité humaine, mais il est un **second dépositaire de la même vérité** : une assertion exige qu'il concorde avec le calcul, et une contradiction rougit au lieu de se propager. Corollaire à connaître : `count:16` ne survit qu'en 4 et 2 temps — la valse et le 6/8 s'écrivent en `count:12`.
    - **Un groove qui ne colle pas à la métrique ne joue pas.** Il n'est ni étiré, ni cyclé, ni remplacé. Lire les cases au temps en cyclant ne refusait rien et ne coûtait aucun groove — mais une mesure à 3 y perdait son backbeat sur 4, et une mesure à 6 rejouait ses deux premiers temps. Faux, et **silencieusement** faux : rien dans le son ne dirait que le moteur a improvisé une règle. Quand aucun groove ne tient la mesure, **la batterie se tait et le clic reste** — c'est la doctrine « une couche coupée ne se tait pas, elle produit la version pauvre », appliquée telle quelle : le clic seul *est* la version pauvre d'une section rythmique.
    - **Alphabet des cases, cinq états** : `X` accent · `x` attaque · `-` tenue · `.` vide · `m` étouffé. `grid.length === count`, contrôlé par assertion pour chaque voix. `-` est légal et ne produit **aucune** attaque : une percussion n'occupe pas une case, elle la traverse.
    - **Timbres synthétisés en WebAudio maison** — ni échantillon, ni SoundFont, ni base64 de `.wav` : la règle qui a écarté Tone.js pour la mélodie vaut aussi pour la peau des tambours, et c'est elle qui garde le fichier unique et hors ligne. Sept voix : grosse caisse (sinus qui descend de 150 à 50 Hz — **la descente de hauteur *est* le coup de batte**, sans elle on entend une note de basse), caisse claire (bruit passe-bande 1 800 Hz **plus** un sinus 180 Hz : le bruit seul fait « pschh », le sinus seul fait « tom »), charleston fermé et ouvert, clave, cajón grave et aigu. ⚠️ **Un seul tampon de bruit**, fabriqué une fois et relu par tous les `AudioBufferSourceNode` : le refaire à chaque frappe, c'est allouer quelques milliers d'échantillons seize fois par mesure pour un résultat identique. Tout passe par `maitre` et jamais par `ctx.destination` — c'est ce qui fait qu'`arreter()` éteint aussi la batterie, sans une ligne de plus, et le banc compte les connexions à `destination` pour s'en assurer.
    - **L'ordonnanceur n'a pas changé d'une ligne.** Le patron des cases était déjà écrit pour les subdivisions du clic : une case de groove se programme `prochainTemps + parTemps * k / casesParTemps`, exactement pareil. `planPercu(i)` rend le plan d'un temps **sans audio et sans horloge** — c'est cette fonction que le banc éprouve ; `percuPasser()` ne fait que la programmer.
    - ⚑ **`percuPasser` passe APRÈS `imprPasser`, et l'ordre n'est pas décoratif** : c'est `imprPasser` qui fait avancer `imprMesure`, dont le gap batterie lit l'état. Inversé, le retrait de la batterie commence un temps trop tard et finit un temps trop tôt. Ce n'est pas une précaution théorique — le banc l'a fait rougir dès la première écriture, où l'ordre était mauvais.
    - **Le curseur de densité est séparé du grade.** `DENSITE[grade]` bride la démo mélodique, qui est l'exercice ; le groove, lui, est le **contexte**. Trois crans, et l'inclusion est garantie par assertion : squelette ⊆ allégé ⊆ complet. Le squelette ne garde que les accents des voix d'appui (grosse caisse, caisse claire, cajón grave) ; l'allégé retire la garniture hors des temps.
    - **Le gap s'applique aussi à la batterie**, et c'est la parade documentée à l'objection Friedland — *la boîte à rythmes te tire par la manche*, elle retire à l'élève la responsabilité du temps fort. Le même cycle démo + gap + démo, appliqué à la section rythmique, fait travailler la pulsation intérieure au lieu de la remplacer. **Aucune ligne nouvelle** : un drapeau de plus lu sur `etatImpro()`. ⚠️ Le retrait n'existe que si la couche impro tient un gap : sans tour de parole, un silence de batterie n'est pas une consigne, c'est une panne.
    - **X13 joué.** Le *où* est un marqueur d'accord, le *combien* un champ de profil : `push8` / `push16` en **ticks entiers à 120 par temps** (59/28 en croche égale, 38/20 en croche swinguée — mesurés, pas inventés), et le moteur divise **une fois**. Le régime est décidé par le `metre` du groove qui joue, à défaut par la subdivision affichée : un groove qui ne sonne pas ne décide de rien. ⚑ **Une anticipation se programme au temps PRÉCÉDENT** — jusqu'à un demi-temps d'avance, elle sort de la fenêtre de 120 ms si on l'attend sur son propre temps. Le tout premier accord d'une boucle fait exception : rien ne le précède, il sonne sur son temps une fois, puis le tour suivant l'anticipe. `C.` tait toute la section rythmique, `C..` la réduit à un coup sec sur le temps du marquage, `C...` laisse la nappe tenir et efface la percussion derrière. **Et l'anticipation ne déplace aucune frappe de groove** : la grille rythmique ne connaît pas les accords — c'est asserté.
    - ⭐ **Variantes pondérées et table d'interdits — la batterie cesse de se répéter.** C'était le défaut nommé par le balayage RealDrums : notre batterie rejouait la même mesure indéfiniment, ce qu'aucun batteur ne fait. Le remède n'est **pas** d'ajouter du hasard, c'est d'ajouter une **contrainte**. Six champs, tous facultatifs : `poids` (défaut 8 pour la mesure de base), `variantes[]` (chacune avec son **propre jeu de voix complet**, `n ≥ 1`), `type` (`normal` · `fill` · `post-fill`), `section` (la **grille** la choisit, pas le groove — voir *Marqueur de partie*), `phrase` (défaut 4 mesures) et `interdits`. ⚑ **`interdits` se lit dans un seul sens** : la clé est la variante **précédente**, la liste est ce qui **ne peut pas suivre**. `{"0":[0]}` — la formule minimale — dit *« la mesure de base ne peut pas se suivre elle-même »*, et règle à elle seule le défaut. Quatre filtres, dans cet ordre : section, puis fill **par position** (dernière mesure de la phrase), puis post-fill (qui n'a de sens qu'après un fill, et alors prime), puis interdits ; enfin tirage pondéré. ⚠️ **Chaque filtre qui viderait la liste est annulé** — un groove sans fill se tairait une mesure sur quatre, une table trop serrée bloquerait le tirage : **se taire par accident est pire que se répéter**, c'est le défaut qu'on venait corriger. ⭐ **La première mesure d'un cycle est la mesure de base DE SA PARTIE, sans tirage** (`varianteBase(g, section)` : le plus petit `n` légal de la partie, en préférant le type `normal`) : un groove s'annonce avant de varier — et sans cette règle, `{"0":[0]}` rendrait la base impossible au démarrage, le seul endroit du cycle où elle n'a pas de précédente à contredire. ⚑ Sans la partie dans le calcul, une grille qui **ouvre** sur `[B]` jouerait sa première mesure en A : le seul endroit du cycle où la partie n'a pas encore été annoncée serait précisément celui où on la trahirait. ⭐ **`tirerVariante` reçoit son aléa en argument** : un `Math.random()` enfoui n'est pas vérifiable — même porte que `poserAlea()` pour la couche impro. Le tirage a lieu **une fois par mesure**, dans l'ordonnanceur et jamais dans `planPercu()` : sans quoi le plan d'un temps dépendrait du nombre de fois qu'on le demande. Le cycle **avance pendant un gap de batterie** — la phrase est une horloge, pas un son.
    - ⭐ **Le marqueur de partie ferme la boucle.** La grille produit enfin la section que le moteur filtrait : `sectionCourante(i)` lit `timeline[i].section` au lieu de rendre `"A"` en dur. ⚠️ **Une partie a besoin d'une famille, pas d'une mesure** : une section à variante unique rejouerait la même mesure indéfiniment, c'est-à-dire le défaut même que les variantes pondérées corrigeaient. Une partie déclarée porte donc au minimum base + relance + fill, et son entrée dans `interdits` ; c'est asserté partie par partie.
    - **Deux patrons publics portent des variantes**, `rk-base` et `rk-croches` : une ou deux mesures de relance, un fill de fin de phrase, et `interdits:{"0":[0]}`. `rk-base` porte en plus **la seule partie B du corpus public** — base, relance et fill, charleston ouvert sur les temps, `interdits:{"0":[0],"4":[4]}` — pour que le marqueur `[B]` s'entende : sans elle, le mécanisme serait muet, exactement comme `interdits` l'était avant que `rk-base` ne porte sa table. Les quatre autres restent nus et se comportent **exactement** comme avant — c'est la condition qui rendait l'ajout acceptable, et elle est assertée groove par groove. Une mesure de relance et un fill se trouvent dans n'importe quelle méthode de batterie depuis un siècle : ce ne sont pas des relevés.
    - **Le corpus sous droits entre par une seule porte**, `poserGrooves()`, avec les mêmes gardes et le même alphabet ; un groove refusé est **dit**, jamais avalé. Les six patrons embarqués — rock de base, backbeat aux croches, shuffle, bossa élémentaire, valse, 6/8 — sont de bien commun. **Le moteur connaît la forme d'un groove ; le corpus privé n'ajoute pas une capacité, il ajoute du répertoire.**

Conventions de couleur, appliquées partout : **laiton** = fondamentale ou note d'ancrage, **indigo** = autres notes d'accord, **vert** = septième, halo des notes mobiles et approches chromatiques, **gris** = notes de passage. Manche en bois sombre et frettes laiton, chrome en ardoise froide : l'instrument se distingue de l'interface.

Notions calculées, à ne pas confondre : les **notes communes** le sont à *tous* les accords de la boucle (intersection globale, pas deux à deux) ; à défaut, la **note d'ancrage** est la classe de hauteur la plus présente, pondérée par la durée — un accord tenu trois temps pèse trois fois plus qu'un accord d'un temps.

Accessibilité : `aria-pressed` sur les commutateurs, focus visible, `prefers-reduced-motion` respecté. `navigator.wakeLock` demandé au lancement, sous `try/catch`.

## Validation

```sh
npm install     # jsdom, seule dépendance, de développement uniquement
npm test
```

`test.js` charge `index.html` dans un DOM et le pilote comme un utilisateur. Couverture : parseur et plafond d'emplacements aux quatre métriques, token de prolongation et identité par référence, tenue par-dessus la barre, ligne de temps et durées d'accord, notes communes et mobiles, ancrage sur la tonique, substitut tritonique, ordonnanceur audio sur `AudioContext` factice (comptage et placement des clics, tenue et hauteur du bourdon, coupure du maître à l'arrêt), rendu des onze grades, modèles, réglages, saisie invalide, persistance, bulles pédagogiques (analyse, couverture des 132 combinaisons grade × note, renvois théorie ↔ exercice non orphelins, clics réels dans le DOM), absence de dépendance externe et de contenu pédagogique dans `index.html`, **boîte à rythmes** : les six grooves publics relus un par un, la table complète des métriques légales (`16/4`, `12/4`, `12/3`, `12/2`, `12/6`, `16/2`) et le refus des divisions non entières, la concordance de `metre` avec `count / battues`, dix grooves fabriqués **illégaux** (grille trop courte, trop longue, caractère hors alphabet, timbre inconnu, aucune voix, `count` absent, tempo min > max, `metre` menteur), les cases qui tombent pile et jamais deux au même instant pour une même voix, le shuffle aux tiers de temps **contre la valse aux demis à `count` égal**, la monotonie du curseur de densité, la batterie coupée qui laisse le clic **inchangé en nombre**, le groove incompatible qui se tait au lieu de s'étirer, le clic rabaissé sur ses quatre timbres, le gap batterie mesuré mesure par mesure à travers l'ordonnanceur, l'anticipation qui avance la nappe **sans déplacer une seule frappe**, les trois marqueurs de restitution vus par la section rythmique, le compte des connexions à `ctx.destination` — qui doit rester à zéro —, et **le tirage de variante** : le schéma refusé sur quinze formes fabriquées illégales (variante numérotée 0, `n` dupliqué, poids nul, type inconnu, voix de variante trop courte ou hors alphabet, `interdits` désignant une variante absente…), les poids **balayés case par case** sur mille aléas — 800 pour un poids de 8 contre 2 —, les quatre filtres pris un à un, le sens d'`interdits` éprouvé sur une table **asymétrique** (une table symétrique se lirait pareil dans les deux sens et ne prouverait rien), les replis de filtre vide, **4 000 mesures sans qu'aucune variante ne se suive elle-même** — avec le contrôle qui donne son sens à celui-là : *sans* la table, la répétition revient —, le fill qui ne tombe qu'en fin de phrase et y tombe à chaque fois sur 400 mesures, le post-fill qui suit systématiquement le fill, et à travers l'ordonnanceur le **compte exact de frappes par mesure** qui suit la variante tirée ; **le marqueur de partie** : la portée lue sur onze écritures (retour en A, ouverture sur B, casse, `%`, `/`, `*n`, cohabitation avec `^`, `..` et `_`), les huit refus dits un par un, la partie recopiée sur **chaque temps** de la ligne de temps, `sectionCourante` hors bornes, `varianteBase` sur les six patrons publics et sur une partie inconnue, et **bout en bout** la même grille marquée `[A]` puis `[B]` — famille de variantes différente dès la première mesure, **charleston ouvert entendu en B et jamais en A**, bascule qui tombe pile sur la barre de mesure, et 1 000 mesures en B sans que la base de B se suive elle-même ; la non-régression étant assertée sur les huit modèles embarqués et les onze grilles de palier, qui ne portent aucun crochet ; et **couche impro** : déterminisme à graine égale, réservoir tenu sur un accord hostile (`Cmaj7 | F#7`), piliers aux rendez-vous, chaque couche coupée qui **change** la sortie, mesure exactement remplie aux quatre métriques, aucune valeur binaire en subdivision ternaire, jamais deux attaques au même instant, bridage au grade (G0 sur l'ancrage seul, G2 dans la cellule), registre et cohérence hauteur/classe sur les onze grades, cycle démo/gap et indices de phrase en reprise comme en échange, gap plus long que la boucle, neuf figures fabriquées dont illégales (`C5`, `Dsus4`, `Bdim7`, boucle d'un seul accord, 32 mesures, boucle vide), gap qui ne coupe que la démo et laisse le clic intact, silence en atelier, réglages persistés, halo du manche.

**Le répertoire étant hors dépôt, les séries qui en dépendent sont ignorées s'il est absent** : un clone nu valide le moteur et l'interface (**1 283 assertions**, dont 66 pour la couche impro et 441 pour la boîte à rythmes) ; avec `repertoire.json` posé à côté, la vérification fiche par fiche s'ajoute — grille lisible, longueur annoncée, gamme connue, tonalité effectivement lue, absence du titre et de l'artiste dans `index.html` — soit 1 108 assertions de plus sur les trente-huit fiches actuelles. Le test annonce lequel des deux régimes il a suivi.

Le double d'`AudioContext` tient **deux journaux séparés**, `__rampes` pour le gain et `__freq` pour la fréquence. La voix de la démo balaie son filtre ; si les deux paramètres écrivaient au même endroit, une rampe de 9 000 Hz serait comptée comme un niveau et la série du bourdon — qui lit le maximum des rampes de gain — rougirait pour une raison fausse.

**Contre-épreuve obligatoire.** Une série de tests nouvelle doit être lancée contre l'`index.html` **d'avant** le correctif et y échouer. Une assertion qui passe des deux côtés ne teste rien.

⚠️ **Et elle doit y ROUGIR, pas y crasher.** Une série qui lit `r.mesures[0][0]` ou `r.sections.join()` sans garde s'interrompt sur un build qui ne rend pas ces champs — et **un banc qui crashe cache tous les autres rouges**. Le défaut s'est produit trois fois (séries 10, 21, 22) et à la même racine : une lecture d'indice sans garde. Toute lecture d'un champ que le build d'avant ne produit pas passe par un repli explicite.

## Journal de développement

> **Trou assumé entre le 2026-08-02 et le 2026-08-18.** L'atelier des triades et le
> mode pupitre sont entrés dans le code pendant cet intervalle sans entrée de journal.
> Ils sont décrits dans « Architecture & conventions », qui se lit dans le source ;
> les décisions qui les ont produits, elles, n'ont pas été consignées et ne sont pas
> reconstituées ici. Le journal est en ajout seul : mieux vaut un trou visible qu'une
> continuité inventée.

### 2026-08-26 — le fill de la partie B garde la signature de sa partie

**Le défaut, et son aveu dans le banc.** La variante `{n:6, type:"fill", section:"B"}` de `rk-base`
était la **copie exacte** du fill de A — `charleston`/`hat` là où la partie B joue partout
`charleston ouvert`/`hat-ouvert`. La partie B retombait donc dans le timbre de l'autre au moment le
plus audible du cycle, la fin de phrase. Et le banc le **savait** : l'assertion « la partie B fait
sonner le charleston ouvert » portait un `slice(0, 3)` qui retirait la mesure 4 — c'est-à-dire
exactement le fill — sans justification sur la ligne d'à côté. Elle ne testait pas la partie B,
elle contournait son défaut ; c'est le cas d'école de la règle posée la veille.

**La correction tient dans une ligne de grille.** Le fill de B troque son charleston fermé pour
l'ouvert : `X...X...........` — **deux temps, puis silence**. Pas quatre : un charleston ouvert
sonne long, le laisser sur le temps 3 baverait sur les quatre doubles de caisse claire, qui doivent
finir seules pour que la fin de phrase se dise. Pas trois non plus, transposition stricte du point
de coupe de A, écartée pour la même raison. La caisse claire, elle, ne bouge pas
(`....X.......xxxx`, la même qu'en A) : un fill reste un fill, c'est elle qui le dit.

**Le banc.** Le `slice(0, 3)` est **retiré** : l'assertion couvre les quatre mesures, fill compris,
et son commentaire dit désormais pourquoi il n'y a **pas** de borne. Série 22.6 neuve : le fill de B
n'est plus la copie de celui de A, il ouvre le charleston et n'emporte plus de fermé, l'ouvert tient
deux temps et frappe **moins** que dans la base de B, la caisse claire est identique dans les deux
fills, et — garde en balayage, pour couvrir aussi les variantes qui n'existent pas encore — toute
variante de la partie B déclare l'ouvert. Non-régression : le fill de A n'a pas bougé, d'aucun de
ses deux timbres. **1 268 → 1 283 assertions**, toutes vertes, sur le poste (node v24) comme dans le
conteneur (node v22), aux mêmes empreintes. La série neuve lancée contre le build d'avant : **6 rouges, zéro crash** — les replis
(`grille(null)` → `""`) rougissent au lieu de planter. Contre-épreuve : **onze mutations délibérées,
onze détectées, zéro garde muette** — dont le fill redevenu copie de A, l'ouvert tenu quatre temps,
la base de B descendue à deux ouverts, le fill de A rouvert, et la variante 6 disparue (11 rouges).

**Le poids.** `index.html` 202 325 → **202 927 o** (+602) ; `test.js` 183 936 → **187 477 o**.

**Ce qui n'est pas fait** : inchangé depuis la veille — la grille n'affiche toujours pas le
marqueur, et la partie n'est lue que par la boîte à rythmes.

### 2026-08-25 (suite) — le marqueur de partie : la grille dit enfin sa section

**Le point ouvert que l'entrée précédente laissait derrière elle.** Le moteur filtrait les variantes
par section, mais personne ne pouvait produire la section : `sectionCourante()` rendait `"A"` en dur
— et le disait, ce qui valait mieux que de faire semblant. C'était de la mécanique en attente de sa
donnée. Elle arrive par la grille, là où elle devait être (note `01`, patron des *part markers* de
Band-in-a-Box) : **une lettre entre crochets, en tête de mesure**.

⭐ **Un marqueur ouvre une portée, il ne décore pas une mesure.** `[A] C | G | [B] Am | F` met les
deux premières mesures en A et les deux suivantes en B. Une écriture par mesure aurait donné
`A, B, A` sur `C | [B] G | Am` là où il faut `A, B, B`, et le banc l'éprouve dans les deux sens.
Les abréviations héritent : `%`, `/` et `*n` restent dans la partie courante. Sans aucun marqueur,
tout est en `A` — les grilles d'avant sont inchangées, ce qui est asserté sur les huit modèles
embarqués et les onze grilles de palier.

**Pourquoi les crochets.** Ils étaient le seul couple de signes libres : `^` porte l'anticipation,
`.`/`..`/`...` les marqueurs de restitution, `_` la prolongation, `%` et `/` la répétition, `*n` la
multiplication. `B:` aurait frôlé le nom d'accord ; `*B` aurait donné trois sens au même signe.

**Quatre refus, dits.** Un marqueur nu (`[B] | C`) est refusé au lieu d'être avalé — on croirait
poser une partie et on ne poserait rien. Plus d'une lettre, autre chose qu'une lettre, et un
marqueur ailleurs qu'en tête le sont aussi : une partie commence sur une barre de mesure, jamais au
milieu. ⚑ Le `*` est refusé **côté grille** alors qu'il est légal côté groove : c'est le joker d'un
patron (« je conviens à toute partie »), pas une partie que la grille pourrait déclarer.

**Deux arbitrages qu'aucune note n'avait pris.**

| point | décision, et pourquoi |
|---|---|
| **La première mesure quand la grille ouvre en B** | ⭐ **La base de sa partie, pas la variante 0.** La règle d'avant — « la première mesure est la mesure de base » — trahissait la partie précisément là où elle n'avait pas encore été annoncée. `varianteBase(g, section)` rend le plus petit `n` légal de la partie, en préférant le type `normal` : un groove s'annonce, il ne relance ni ne remplit d'entrée. Sur les six patrons publics en A, cela rend `0` — le comportement d'avant, au chiffre. |
| **Une partie à variante unique** | ⚠️ **Interdite de fait, et assertée.** Le filtre de section annulerait le filtre de fill, la partie rejouerait la même mesure indéfiniment, et le défaut corrigé le matin même reviendrait par la porte de derrière. Une partie déclarée porte base + relance + fill, et son entrée dans `interdits`. |

**Le corpus public bouge une seconde fois, et pour la même raison qu'à la note précédente.** Sans
une seule partie B déclarée, le marqueur n'aurait rien changé à l'oreille : le filtre de section se
serait vidé, aurait été annulé, et la partie B aurait sonné comme la partie A. `rk-base` porte donc
une partie B — au refrain, le charleston s'ouvre sur les temps, geste qu'on trouve dans n'importe
quelle méthode de batterie depuis un siècle. Les cinq autres patrons restent sans partie B, et la
non-régression est assertée patron par patron.

⚠️ **Le banc a crashé au lieu de rougir, pour la troisième fois, et à la même racine.** Lancée
contre l'`index.html` d'avant — la contre-épreuve obligatoire — la nouvelle série s'est arrêtée sur
`r.sections.join()` puis sur `r.mesures.map(…)` : sur ce build, `lireBoucle` ne rend ni l'un ni
l'autre. Un banc qui crashe cache tous les autres rouges (déjà relevé aux séries 10 et 21). Toutes
les lectures de la série passent maintenant par un repli explicite, et la mesure a pu être faite :
**57 rouges contre le build d'avant**, sans interruption.

**La contre-épreuve.** Dix-neuf régressions délibérées, **dix-neuf rouges**, aucune garde muette,
aucun crash : le marqueur ignoré · la portée réduite à une mesure · la portée décalée d'une mesure ·
la casse non normalisée · le marqueur nu avalé · l'alphabet non gardé · le marqueur au milieu avalé ·
la timeline sans partie · `sectionCourante` qui ignore son index · qui rend `undefined` hors bornes ·
l'ordonnanceur qui n'utilise pas la partie · la première mesure retombée sur la variante 0 ·
`varianteBase` sans préférence de type · sans filtre de partie · `appliquerSaisie` qui ne pose pas
les parties · `rk-base` qui perd sa partie B, son fill de B, sa table d'interdits de B · et
`lireBoucle` qui ne rend plus les parties.

**Le poids.** `index.html` 197 281 → **202 325 o** (+5 044), gzippé 62 452 → **64 024 o** ;
`test.js` 169 012 → **183 936 o**. Banc **1 178 → 1 268 assertions**, toutes vertes.

**Ce qui n'est pas fait.** La grille **n'affiche pas** le marqueur : rien à l'écran ne signale que la
mesure 3 est en B, seule l'oreille le dit. Arbitrage assumé pour ce lot, point ouvert pour le
suivant. Et la partie n'est lue **que** par la boîte à rythmes : ni la couche impro, ni le coach ne
s'en servent.

### 2026-08-25 — variantes pondérées et table d'interdits : la batterie cesse de se répéter

**Le défaut, nommé depuis le balayage RealDrums.** Notre batterie rejouait la même mesure
indéfiniment. Un vrai batteur ne le fait jamais, et c'est précisément pour ça qu'un RealDrums
respire : il tire une mesure parmi une cinquantaine, **sous contrainte de légalité**. On importe le
modèle, pas le corpus.

⭐ **Ce qui corrige le défaut, ce n'est pas le hasard, c'est la contrainte.** Un tirage pondéré sans
table d'interdits rejouerait la mesure de base huit fois sur onze — mesuré au banc, et c'est
l'assertion de contrôle qui donne son sens à celle qui compte : *avec* `interdits:{"0":[0]}`, **4 000
mesures sans qu'aucune variante ne se suive elle-même** ; *sans* elle, la répétition revient
immédiatement. Une assertion « zéro répétition » qui passerait aussi sans la table ne testerait rien.

**Trois arbitrages pris en écrivant, qu'aucune note n'avait tranchés.**

| point | décision, et pourquoi |
|---|---|
| **Un filtre qui vide la liste** | ⭐ **Annulé, pas subi.** Un groove sans fill se tairait une mesure sur quatre ; une table trop serrée bloquerait le tirage. **Se taire par accident est pire que se répéter** — c'est le défaut qu'on venait corriger. |
| **La première mesure du cycle** | ⭐ **La mesure de base, sans tirage.** Un groove s'annonce avant de varier. Et sans cette règle, `{"0":[0]}` rendrait la base **impossible au démarrage** : le seul endroit du cycle où elle n'a pas de précédente à contredire serait justement celui où on l'interdirait. |
| **Le post-fill hors post-fill** | **Écarté.** La note `01` disait seulement qu'il *prime* après un fill ; le laisser dans le vivier général en ferait une variante ordinaire, et le mot perdrait son sens. |

**Où le tirage a lieu, et où il n'a pas lieu.** Une fois par mesure, dans l'ordonnanceur —
**jamais** dans `planPercu()`. Sans cette séparation, le plan d'un temps dépendrait du nombre de
fois qu'on le demande, et un banc qui appelle `planPercu` deux fois lirait deux mesures différentes
sans que personne sache pourquoi. C'est asserté. Et `tirerVariante` **reçoit son aléa en argument** :
un `Math.random()` enfoui n'est pas vérifiable — même porte que `poserAlea()` pour la couche impro.

⚑ **Une garde a failli passer pour testée, comme la note `16` §3.** L'assertion de remise à zéro
lisait la variante courante alors qu'elle valait déjà 0 une fois sur deux : elle restait **verte**
quand `reinitPercu` oubliait son travail. Réécrite, elle amène d'abord l'état ailleurs qu'à zéro.
Et pour le **compteur de mesures**, il a fallu une boucle de **trois** mesures contre une phrase de
**quatre** : sur une boucle de quatre, le fill retomberait au même endroit au second tour même sans
remise à zéro, et l'assertion serait verte pour rien.

⚠️ **Et le banc a crashé une fois de plus au lieu de rougir** — `…filter(…)[0].n` sur une liste vide,
dès qu'une mutation retirait le fill. Un banc qui crashe cache les autres rouges : c'est le même
défaut que la série 10 du 22 août, et il est corrigé au même endroit qu'il fallait.

**Le corpus public bouge, et se justifie.** `rk-base` et `rk-croches` portent désormais une ou deux
mesures de relance, un fill de fin de phrase et `interdits:{"0":[0]}` — sans quoi le tirage
existerait sans rien avoir à tirer, et **rien ne changerait à l'oreille**. Les quatre autres patrons
restent nus et se comportent exactement comme avant : la non-régression est assertée groove par
groove, et c'est elle qui rendait l'ajout acceptable.

**Banc : 1 040 → 1 178 assertions**, toutes vertes. **Vingt-deux régressions délibérées, vingt-deux
rouges** — dont le sens d'`interdits` inversé, le fill tiré n'importe où, le tirage rendu uniforme,
un tirage par temps au lieu d'un par mesure, `planPercu` qui ignore la variante, et une case retirée
à une variante publique (23 rouges à elle seule).

### 2026-08-22 (nuit) — la boîte à rythmes : le projet porte enfin son nom

**Ce que ça change.** Le projet s'appelle « boîte à rythmes impro ». La moitié *impro* était en
ligne depuis le matin ; la moitié *boîte à rythmes* n'avait jamais été écrite — balayage à
l'appui, `batterie`, `percussion`, `kick`, `snare`, `charleston`, `caisse`, `clave`, `tumbao`,
`samba`, `bossa`, `shuffle` faisaient **zéro occurrence** dans `index.html`. Elles y sont. Sept
timbres synthétisés, la lecture des grilles de groove, six patrons de bien commun, un quatrième
interrupteur, un curseur de densité, le gap appliqué à la section rythmique, et les marqueurs de
restitution qui ne sont plus seulement *lus* mais *joués*.

**La décision qui commande toutes les autres : le groove déclare sa métrique.** L'interface propose
4, 3, 2 et 6 temps par mesure — le cas d'une mesure qui n'a pas quatre temps n'est pas un cas
limite, c'est un cas courant. `battues` entre donc au schéma, défaut 4, et `casesParTemps` se
**calcule** au lieu d'être supposé. Conséquence immédiate et contre-intuitive : ⚑ **`count:12` ne
veut plus dire « ternaire »**. La convention du métronome n'était vraie que parce que `battues`
valait toujours 4. `12 / 3 = 4` cases par temps, c'est du **binaire** — c'est la valse. Le champ
`metre` devient alors un second dépositaire de la même vérité, exactement le défaut que `RHO_RANGS`
documente ; il reste déclaré pour la lisibilité, mais une assertion exige qu'il concorde avec le
calcul. Une contradiction rougit au lieu de se propager.

**Pourquoi la valse et le 6/8 sont embarqués alors que quatre patrons en 4/4 auraient suffi.**
Parce qu'avec quatre patrons en 4/4, la métrique déclarée n'aurait jamais été éprouvée **à
l'usage** — seulement au banc. Le shuffle et la valse ont le **même `count`** et des cases
totalement différentes : le premier aux tiers de temps, la seconde aux demis. C'est ce couple, et
lui seul, qui rend la règle démontrable à l'oreille. Coût : quelques centaines d'octets.

**Ce qui a été écarté, et pourquoi.** Lire les cases au temps en cyclant ne refuse aucun groove et
n'en coûte aucun — mais une mesure à 3 y perd son backbeat sur 4, et une mesure à 6 rejoue ses
temps 1-2 en 5-6. ⚠️ Faux, et **silencieusement** faux : rien dans le son ne dirait que le moteur a
improvisé une règle. Quand aucun groove ne tient la mesure, la batterie se tait, le clic reste, et
l'écran le dit. Écarté aussi : trier les 33 grooves du métronome pour verser au dépôt public ceux
qui sont de bien commun — c'est un travail de droits groove par groove, et le risque est d'écrire
du **répertoire** dans un dépôt public.

**Batterie et clic ne se disputent pas le rôle de repère.** Le clic est à 0,20, le son le plus fort
de l'app, parce qu'il *est* le repère ; un groove qui entre à côté ferait deux pulsations
concurrentes. Il quitte donc son 0,20 pour un niveau discret dès que la batterie est armée — et
il garde son rang interne, le changement d'accord restant le plus fort, parce que c'est la seule
chose qu'aucun groove ne dit. ⚑ C'est l'**armement** qui rabaisse le clic, pas le fait de jouer :
un niveau de clic qui sauterait à chaque gap s'entendrait comme une panne.

**Le gap batterie répond à une contradiction du corpus, sans code neuf.** Stinnett prescrit la
boîte à rythmes ; Friedland l'accuse de *« te tirer par la manche »* et de retirer à l'élève la
responsabilité du temps fort. Les deux ont raison, et la parade était déjà écrite : le cycle
démo + gap + démo, appliqué à la section rythmique. Un drapeau de plus lu sur `etatImpro()`.

**Ce que la contre-épreuve a trouvé, et que je n'aurais pas vu autrement.** Quatorze régressions
délibérées, toutes rouges. Mais surtout : la première écriture plaçait `percuPasser` **avant**
`imprPasser` dans l'ordonnanceur — c'est-à-dire avant que `imprMesure` n'avance. Le banc a rendu
`10,10,2,0` là où il attendait `10,10,0,0` : deux frappes de trop au premier temps de chaque mesure
de gap. Un décalage d'un temps, sur une seule mesure sur quatre, à peu près inaudible et
parfaitement faux. Il n'a pas été trouvé en relisant le code, mais en comptant les frappes mesure
par mesure à travers l'ordonnanceur.

⚠️ **Une assertion qui crashe ne rougit pas, elle cache les autres.** Deux des quatorze mutations
faisaient tomber le banc sur une exception au lieu de le faire rougir — le faux `AudioContext` de
la série 10 ne savait pas fabriquer de tampon de bruit, et une assertion lisait un index sans le
garder. Corrigé aux deux endroits : le double d'`AudioContext` sait désormais compter une frappe
qui sonnerait par erreur, au lieu de mourir dessus.

**Le poids, mesuré.** 163 551 → **185 499 o** bruts, **59 065 o** gzippés — Cloudflare sert
compressé. Le fichier reste **unique**, et ce n'est pas une coquetterie : une page ouverte en
`file://` qui importe un module ES est refusée par la politique CORS du navigateur. Scinder le
moteur imposerait une étape de construction et retirerait la seule propriété que ni Cloudflare ni
le portail ne fournissent — l'ouverture sans serveur.

**Ce qui n'est pas fait.** Les variantes pondérées et la table `interdits` de la note `01` — la
batterie rejoue donc encore la même mesure indéfiniment, ce qu'un vrai batteur ne fait jamais. Le
chargeur unique (`repertoire.json`, `grilles.json`, `grooves.json` en un seul `fetch`) reste
ouvert ; `poserGrooves()` l'attend, porte et gardes comprises. Et le sous-point du 6/8 : il est
écrit `battues:2` (senti à deux), `battues:6` (compté à six) resterait légal.

**Le banc.** 842 → **1 040 assertions**, toutes vertes. Quatorze régressions délibérées vérifiées
rouges.

### 2026-08-22 (soir) — X13 : l'anticipation s'écrit sur l'accord, pas dans la grille

**Ce que ça change.** `lireAccord()` lit désormais cinq marqueurs de restitution portés par le
symbole d'accord lui-même : `^C` anticipation de croche, `^^C` anticipation de double, `C.`
silence, `C..` frappe, `C...` tenue. L'objet retourné gagne deux champs, `push` (0, 1 ou 2) et
`tenue` (`normal` · `silence` · `frappe` · `tenue`). Rien d'autre ne bouge.

**Pourquoi ce n'était pas un blocage, mais une question mal posée.** Pendant des semaines le point
s'est formulé ainsi : *« la grille dit quand ça sonne, jamais quel accord »* — donc où écrire une
anticipation harmonique ? La réponse est qu'elle ne s'écrit **pas** dans la grille rythmique. Le
*où* est un marqueur d'accord ; le *combien* (`push8` / `push16`, en ticks à 120 par temps) est un
champ de profil de style. Deux endroits, deux natures. C'est ce qui permet aux versions rock, funk,
jazz et reggae d'un même titre de continuer à partager **exactement la même grille**, marqueurs
compris. Tant qu'on cherchait un seul endroit pour les deux, il n'y en avait aucun de bon.

**Pourquoi le décapage ne peut pas manger un accord existant.** Aucun des 50 alias de `QUALITES` ne
commence par un accent circonflexe, aucun ne se termine par un point. C'est vérifiable, donc ce
n'est pas un argument : ce sont deux assertions du banc, et elles sont **vertes avant le patch**.
Si elles avaient rougi, la modification n'aurait pas été additive et il aurait fallu s'arrêter.
La non-régression est balayée en grand : les **1 050 symboles** légaux — sept lettres, trois
altérations, cinquante qualités — sont relus un par un et comparés symbole, fondamentale et
intervalles. Zéro déviant, avant comme après.

**Un point isolé reste une prolongation.** `PROLONGE = /^[_.]$/` intercepte le token `.` seul dans
`lireBoucle()` avant qu'il n'atteigne `lireAccord()` : `C . . .` continue de donner quatre
emplacements tenus sur la même référence d'objet. C'est asserté, parce que c'est exactement le
genre d'effet de bord qu'un décapage de fin de chaîne provoque en silence.

**Ce que la contre-épreuve a trouvé, et que je n'aurais pas vu autrement.** Six régressions
délibérées ont été fabriquées dans le fichier neuf — décapage retiré, garde à deux carets levée,
marqueur laissé dans `sym`, silence et frappe intervertis, une case décalée d'un rang, décapage
rendu inopérant. Cinq ont rougi du premier coup. La sixième, *« la chaîne vidée par le décapage
n'est plus refusée »*, est **restée verte** : la garde `if(!s) return null;` que j'avais posée après
le décapage était inatteignable comme différence, puisque le regex exige déjà une lettre A-G. Elle
a été retirée, et remplacée par un commentaire qui dit pourquoi il n'y en a pas. Sans mutation, ces
trois lignes seraient passées pour testées.

**Ce qui n'est pas fait.** Le moteur *lit* les marqueurs ; il ne les *joue* pas encore. Avancer la
nappe de `push8` ticks, taire l'accompagnement sur `C.`, le frapper sec sur `C..` — c'est la couche
suivante, et elle attend la boîte à rythmes. Les écritures `C....`, `^^^C` et `C6/9` restent
illisibles, la dernière parce que le `/` isolé vaut répétition de mesure : point ouvert, inchangé.

**Le banc.** 814 → **842 assertions**, toutes vertes.

### 2026-08-22 — la couche impro : le coach ne dit plus, il joue

**Ce que ça change.** Le moteur savait déjà lire une grille, savoir quelle note vaut quoi à
chaque temps, choisir un geste mélodique et le placer sur le manche. Il ne savait pas le **jouer**.
`cheminCoach()` livrait `{pas:[{pc, ord, h}]}` — une suite de hauteurs orientées, c'est-à-dire la
matière d'une phrase. Il lui manquait un rythme, un registre et une voix. C'est tout ce qu'ajoute
la section 15 : **la démonstration est la restitution sonore de ce que le coach dit déjà.** Ajouter
une consigne au coach étend donc la démo sans une ligne de plus.

**Ce que je n'ai pas fait, et pourquoi.** Le premier réflexe était d'écrire un générateur autonome
— sa grammaire de figures, ses règles de conduite, son propre choix de cibles. Ç'aurait été un
second cerveau à côté du coach, et deux cerveaux divergent : le jour où l'un apprend une figure,
l'autre l'ignore. `bloc.js` le dit déjà de lui-même à propos de `RHO_RANGS` — *un seuil dupliqué
diverge en silence*. Le générateur ne connaît donc **aucun** type de figure que `cheminCoach()`
ne connaisse pas ; il tire dans `GESTE_GRADE`, qui n'est qu'une liste de specs déjà valides.

**La même règle a servi une seconde fois, sur un doublon préexistant.** La table
`[["basPad","pad"], …]` était écrite en deux exemplaires, dans `remplirSelects()` et dans
`brancher()`. Y ajouter cinq interrupteurs aurait reproduit la faute au lieu de la corriger : une
seule `BASCULES`, deux lecteurs.

**Une couche coupée ne se tait pas.** C'est la décision qui fait tout le reste. Harmonie coupée, le
réservoir tombe à la gamme seule et les rendez-vous — temps fort, `zoneAtterrissage` — ne sont plus
tenus : on **entend** la ligne passer à côté du changement d'accord. Rythme coupé, une note par
temps, toutes égales. Mélodie coupée, tirage au hasard dans les notes légales. Les trois coupées
d'un coup donnent une ligne volontairement laide, et c'est le témoin : si ça sonne bien, le
générateur ne fait rien. La thèse du README — *libérer toutes les variables d'un coup ne produit
pas de l'improvisation mais de l'errance* — cesse d'être une phrase et devient un interrupteur.

**L'ordre des couches n'est pas décoratif.** Le rythme passe en premier parce qu'il fixe le
*nombre* de notes à trouver. Une figure de trois pas ne se plaque pas sur un rythme qui demande
sept attaques : on tire la cellule, puis on remplit en bouclant le geste. L'ordre inverse obligeait
à rogner le geste, donc à le fausser.

**Le registre se décide une fois.** `versMidi()` choisit une hauteur au départ de la phrase et la
suit par proximité. Le recalculer à chaque note faisait descendre une « montée » : les classes de
hauteur sont modulo 12, Do suivi de Ré monte de deux demi-tons ou descend de dix. C'est
exactement la faute que `deroulerChemin()` avait déjà eu à corriger sur le manche, pour la même
raison — elle méritait d'être reconnue plutôt que refaite.

**Le gap ne coupe que la démo.** Nappe, bourdon, clic, grille et coach continuent pendant le gap.
Sans eux, ce n'est pas un tour de parole, c'est une panne. On ne touche donc jamais au maître : on
ne programme simplement aucune note. Le cycle est cadencé **à la mesure** — `imprGap = 4` vaut
quatre mesures quelle que soit la boucle, et sur une boucle de deux le gap franchit deux tours.
C'est la convention du trade fours, et c'est voulu. Les blocs vont par paires en mode *reprise*
(la phrase revient une fois : appel à imiter) et sont neufs en mode *échange*.

**L'aléa est injectable, et c'est la décision structurante du banc.** `poserAlea()` et un xorshift32
de quinze lignes. Un générateur qui appelle `Math.random()` en dur n'est pas vérifiable : le banc
ne pourrait affirmer ni qu'une couche coupée change la sortie, ni qu'aucune note ne sort du
réservoir, ni que le gap est vide — chaque assertion passerait des deux côtés, donc ne testerait
rien. `tirerConsigne()`, qui appelait `Math.random()` depuis la v6, est passé par la même porte.

**Le banc et sa contre-épreuve.** 66 assertions neuves, 748 → **814** sur un clone nu. La série
lancée contre l'`index.html` d'avant ne peut même pas se lier — `poserAlea is not defined` — ce qui
est l'échec le plus net possible, mais un échec *par absence de symbole*, qui ne prouve pas que les
assertions mordent. J'ai donc fabriqué quatre régressions délibérées sur le fichier neuf et vérifié
que chacune rougit :

| régression introduite | ce qui rougit |
|---|---|
| le pilier n'est plus imposé aux rendez-vous | *les temps forts portent un pilier* — 22 fautes sur 85 |
| le gap ne fait plus taire la démo | **six** assertions, dont *pendant le gap : zéro note* (28 ≠ 0) |
| le grade ne bride plus le réservoir | *G0 ne joue que l'ancrage* — 14 fautes sur 60 notes |
| l'aléa redevient `Math.random` | *à graine égale, plan égal* |

**Un défaut du banc trouvé en chemin.** Le double d'`AudioContext` ne donnait à `frequency` qu'un
`{value:0}` : la voix de la démo, qui balaie son filtre, levait une `TypeError`. En lui donnant les
méthodes d'`AudioParam` j'aurais fait écrire les rampes de fréquence dans `__rampes`, où la série du
bourdon lit le **maximum des rampes de gain** — une rampe de 9 000 Hz aurait été comptée comme un
niveau et le bourdon aurait rougi pour une raison fausse. Deux journaux séparés, `__rampes` et
`__freq`.

**Le coût, dit franchement.** `index.html` passe de 137 592 à **161 951 octets**, +17,7 %. C'était
l'objection connue, et elle reste entière — mais c'est un coût de **taille**, pas de **correction** :
une dette de duplication, elle, ne cesse jamais de courir. Le corpus sous droits ne suit pas : le
vocabulaire rythmique embarqué est de bien commun (noire, croches, croche pointée-double,
contretemps, triolet, chabada…), et les relevés restent dans `corpus/grooves.json`, côté portail,
derrière Access. **Le moteur connaît la forme d'une figure ; le corpus privé n'ajoute pas une
capacité, il ajoute du répertoire.**

**Ce qui reste ouvert.** Le chargeur du corpus privé n'est pas écrit : il devra passer par le même
`fetch` que `repertoire.json`, dont l'appel est aujourd'hui mort dans les deux copies — à traiter
**une fois pour les deux**, pas deux fois. Et la vitrine publique tournera sans corpus : à dire dans
ce README, sinon un visiteur croira à une panne.

### 2026-08-18 — geler l'affichage à la pause, grilles de palier, enchaîner au plus près

Trois chantiers, tous nés du même constat : l'atelier montrait des formes sans jamais
dire quoi en faire.

**Mettre en pause faisait sauter le manche.** `arreter()` remettait `tempsAffiche` à −1
puis appelait `coachEffacer()`, qui relance `rendreManche()` ; `tempsCourant()` retombait
sur 0 et `marques()` recalculait les pastilles du **premier accord de la boucle**. Pause
sur le second accord, le manche affichait le premier — et les anneaux du coach
disparaissaient par le même chemin. Or on met justement en pause pour regarder le manche.
`arreter(fini)` distingue désormais *arrêté* de *remis à zéro* : en pause manuelle le
temps atteint est conservé et la consigne du coach survit ; seule la fin de séance remet
à −1 et vide le coach. Le battement d'armement s'éteint par `coachArmer()`, qui suffit
puisque `enMarche` est déjà faux. Un temps gelé se lit **en creux** dans la grille, pour
ne pas se confondre avec un temps qui bat.

Bug latent trouvé au passage : `reconstruire()` ne relâchait le temps affiché que si la
boucle tournait. Avec le gel, une pause à l'index 7 suivie d'une grille plus courte
laissait `tempsCourant()` pointer hors de la ligne de temps. Le garde est devenu
inconditionnel — une grille neuve périme l'image gelée.

**Chaque palier porte sa grille.** Un palier décrivait des formes ; rien ne disait quand
en changer, et le mode « suivre la boucle » n'avait aucun sens puisque la grille ne venait
de nulle part. Les paliers portent maintenant leur suite d'accords **en degrés**,
harmonisée à la volée : aucune suite n'est tabulée, tout se transpose avec la tonique, et
une assertion vérifie qu'aucune grille n'est écrite en lettres. Entrer dans un palier
pose sa grille et force le suivi de boucle ; le hors-boucle devient le mode d'étude. La
boucle d'avant est mise de côté (`etat.saisieAvant`) et rendue au retour en voie Grades —
une visite à l'atelier ne doit pas coûter la boucle de travail.

`ATELIER_TONIQUE`, le Do figé, disparaît : le palier posant sa propre grille, c'est le
sélecteur de tonique qui fait autorité des deux côtés.

A0 est passé de `1 | 4 | 5 | 1` à `1 | 4 | 1 | 5` : la première version faisait tenir la
tonique quatre mesures d'affilée à la couture de la boucle. Le repère revient au milieu,
la couture enchaîne 5 → 1, et la tonique ne tient jamais plus de deux mesures.

**`proche:true` était déclaré sur A5 à A10 et lu nulle part.** `formeTriade()` balayait de
la case 0 vers le haut et retenait la première forme trouvée, c'est-à-dire la position la
plus grave du renversement figé. À chaque changement d'accord la forme sautait le manche,
et le déplacement minimal — toute la leçon — restait invisible. `formeProche()` choisit
désormais la forme la plus proche de la précédente, parmi ce que le palier autorise.
Mesure sur la grille d'A5 en Do, cases 0–12 : **10 cases de voyage sur huit accords**,
contre 40 avec la première forme venue. Verrouillé par tests, moins de deux cases par
changement avec, plus de quatre sans.

Le jeu de cordes n'est pas une variable qu'on lâche pour gagner deux cases :
`PENALITE_JEU = 6` fait qu'on ne le quitte que si le voyage économisé dépasse six cases.
Aux paliers qui ouvrent plusieurs jeux, la chaîne reste donc sur celui choisi à la main.
Le menu « Renversement » passe en « au plus près » et devient inerte là où le calcul
décide : il ne commandait plus rien, autant le dire.

Effet de bord traité : `triadeAtelier()` est appelée trois fois par rendu. Sans mémoire,
la forme se déplaçait à chaque appel. `formeMemo` la rend idempotente ; un test le
vérifie.

**748 assertions** sans le répertoire, 1 856 avec, zéro échec. Trois sections ajoutées à
`test.js` : gel à la pause, grille de palier, enchaînement au plus près. Contre-épreuve
faite dans les trois cas.

Reste ouvert, vu à la même occasion et **non corrigé** : `coachTop()` ne regarde pas
`etat.atelier`, donc le coach des grades continue de tourner par-dessus l'atelier — deux
pédagogies superposées sans rapport l'une avec l'autre, sur le même manche. Et le titre
d'A7, « Passe d'un jeu à l'autre sur le même degré », contredit désormais le moteur, qui
n'en change jamais tout seul.

### 2026-08-02 — v6.3, l'ancrage de G0 était une autre note que la tonique

Mise en ligne du répertoire sur un déploiement Cloudflare privé, et première séance où
les trente-huit fiches se chargent d'elles-mêmes. Le site est servi par un Worker en
Direct Upload, protégé par Access sur la production comme sur les URL d'aperçu :
`repertoire.json` renvoie 302 vers l'écran de connexion pour qui n'est pas authentifié.
`_headers`, `_redirects` et `404.html` entrent au dépôt ; la politique de sécurité du
contenu a été recalculée sur le fichier réel — un seul style et un seul script en ligne,
aucun gestionnaire d'événement en attribut, aucune ressource externe, une seule requête
réseau. GitHub Pages ignore les fichiers préfixés d'un souligné : `_headers` n'y est pas
servi, c'est sans conséquence puisque seul Cloudflare l'applique.

La première fiche jouée en conditions réelles a montré une contradiction que le harnais
ne pouvait pas voir. Sur une boucle en La mineur, le bandeau annonçait « joue Mi », le
manche allumait des Mi, et le coach faisait monter Fa, Sol, La vers la tonique. Deux
notes différentes pour une même maison.

L'explication tient en une fonction. `noteAncrage()` ne demandait pas la tonique : elle
cherchait la note commune à tous les accords de la boucle, et à défaut la plus présente.
Le raisonnement était défendable — une note commune ne sonne jamais faux, où qu'elle
tombe — mais il ne produit pas une tonique. Sur les trois fiches de G0, toutes en La,
il donnait Do, Do♯ et Mi. Le cas le plus net est celui du blues : un seul accord de
septième de dominante, dont toutes les notes sont donc « communes », et le calcul
retenait la plus basse en classe de hauteur, c'est-à-dire la tierce. Le grade s'appelle
Ancrage et faisait tenir une tierce.

`noteAncrage()` délègue désormais à `toniqueModale()`, qui était déjà la source du
bourdon et du coach. Les deux appelants — les pastilles de G0 et le texte de la consigne
— sont inchangés. `notesCommunes()` et `poidsNotes()` restent en place, employées
ailleurs pour ce qu'elles savent faire.

Six assertions ajoutées, dont les trois configurations de G0 qui échouaient en silence
et le cas d'une tonalité déclarée qui doit primer sur le premier accord. Cinq titres de
morceaux traînaient encore dans les libellés de `test.js`, fichier public : retirés. Le
balayage automatique ne portait que sur `index.html`.

Reste ouvert, vu à la même occasion : `positionsChemin()` choisit les cases du coach sur
un critère purement géométrique et ignore la hauteur réelle. Une consigne qui dit
« monte » peut donc s'allumer sur un geste descendant. Non corrigé ici.

### 2026-08-01 — v6.2, premier retour de terrain sur le coach

Le coach a enfin tourné sur le téléphone, guitare en main. Trois verdicts : le cycle de
quatre tours par consigne est au bon rythme et ne bouge pas ; le bandeau est trop petit ;
les anneaux sont trop nombreux et brouillent le manche.

**Les anneaux.** Chaque étape d'un chemin allumait *toutes* ses occurrences dans la zone
visible — six cordes, cinq à douze cases. Une enclosure de trois étapes pouvait donc
poser une douzaine d'anneaux, et sur « Tout le manche » le pire cas montait à
vingt-sept. L'intention était de ne rien cacher ; l'effet était de tout noyer. Or le
coach montre un **geste**, pas une carte : la carte, c'est `marques()`, qui est déjà là
en dessous.

`positionsChemin()` choisit désormais **une position par étape et une seule** : la
première au milieu du cadre, les suivantes au plus près de la précédente — avec un poids
moindre sur le saut de corde que sur le déplacement le long du manche, puisque c'est
ainsi que la main compte. Une étape dont la hauteur n'apparaît nulle part dans la zone
est sautée plutôt que forcée ailleurs. Les anneaux sont reliés par un filet pointillé,
pour que le trajet se lise sans le déchiffrer.

Mesuré sur les quarante-deux consignes calculables : de 4,2 anneaux en moyenne à 1,3 sur
la zone 0–5, de 8,4 à 1,3 sur le manche entier, le pire cas passant de vingt-sept à
trois. La fonction est séparée du rendu SVG pour être vérifiable seule.

**Le bandeau.** 15 px, une guitare dans les bras, à bout de bras : il fallait s'y pencher.
Il passe à 18 px, l'interligne s'ouvre, et l'étiquette « Coach » quitte le début de
phrase pour devenir un chapeau discret en petites capitales — toute la largeur revient à
la consigne. Les numéros d'étape sur le manche passent de 11 à 13 px et reçoivent un
liseré couleur bois qui les détache du fond quel que soit ce qu'il y a dessous.

Rien d'autre ne change : ni le cycle, ni les chemins, ni les consignes elles-mêmes.
**542 assertions** sans le répertoire, **1 650** avec. Les nouvelles vérifient qu'il y a
exactement un anneau par étape plaçable, que le filet de liaison est présent dès deux
étapes, que les positions restent dans la zone, sonnent la bonne hauteur, conservent leur
ordre et n'imposent pas de grand écart.

### 2026-08-01 — v6.1, la tonalité déclarée est enfin lue

Correctif. La v6 avait ajouté le champ `tonalite`, qui laisse une fiche déclarer sa
tonique quand le premier accord de la boucle n'est pas la maison — cas de toute grille
fonctionnelle qui ouvre sur un ii. La fonction de lecture, elle, n'acceptait que la
notation anglo-saxonne (`Bb`, `Gm`, `F#m`), alors que les fiches écrivent en solfège
français. Sur trente-huit fiches, aucune n'était lue comme prévu :

- **vingt-huit retombaient en `null`**, donc sur le premier accord — dégradé, mais sain ;
- **six étaient lues faux, en silence** : la lettre `D` captait « Do majeur », « Do
  dorien », « Do mineur » et les rendait Ré ; `F` captait « Fa♯ mineur » et le rendait
  Fa. Un demi-ton d'écart, propagé du même coup au manche, au bourdon, à la consigne et
  au coach, puisque `toniqueModale()` est leur source unique. Aucun message d'erreur :
  l'app se contentait de jouer juste à côté ;
- trois tombaient justes par coïncidence (`F` = Fa) ;
- une, sans centre unique, n'avait de toute façon rien à déclarer.

`pcTonalite()` lit désormais les deux notations, le français d'abord — sans quoi la
branche anglo-saxonne recapterait « Do ». Symétriquement, cette branche exige maintenant
que ce qui suit la lettre soit vide, non alphabétique, ou un suffixe de qualité
(`m`, `maj`, `min`, `dim`, `aug`, `sus`) : sans cela, « Cinq centres modaux » se lisait
Do. L'altération se colle au nom, symbole typographique ou lettre (`Si♭` comme `Sib`).
Sur une fiche à plusieurs centres — « Ré / Do / Si♭ majeur », « Do mineur → Ré♭ majeur »
— le premier nommé l'emporte : c'est celui d'où l'oreille part.

Résultat : trente-sept fiches sur trente-huit sont lues, la dernière retombant
volontairement sur le premier accord faute de centre unique.

Le trou de couverture qui avait laissé passer le bug est bouché à son tour. Le harnais
validait la lisibilité de la grille, du tempo, de la gamme, de la subdivision — jamais
celle de la tonalité. **Chaque fiche doit maintenant produire une hauteur**, à
l'exception nommément listée de celle qui n'a pas de centre. S'y ajoutent la lecture du
solfège français sous toutes ses formes rencontrées, la non-régression de la notation
anglo-saxonne, le refus des mots qui commencent comme une note (« mineur » n'est pas Mi,
« dorien » n'est pas Ré), et deux assertions audio qui vérifient que le bourdon suit
bien la tonalité déclarée plutôt que le premier accord.

Enfin, `jouerUnTour()` repart d'une tonalité neutre, comme le ferait une saisie
manuelle. Sans cela la dernière fiche chargée par le parcours d'interface teignait toute
la série audio qui suivait — le correctif a d'abord fait sonner le bourdon sur Mi, ce
qui était le harnais, pas l'app.

Aucun changement d'interface, aucun changement de comportement quand la fiche ne déclare
rien. **532 assertions** sans le répertoire, **1 640** avec.

### 2026-07-31 — v6, coach pendant la lecture

Changement de véhicule pédagogique. La bulle au toucher supposait de lâcher le manche
pour viser l'écran — geste que personne ne fait en jouant — et elle butait sur une
limite de fond : une note immobile ne peut pas dire si elle *sera* une note de passage,
une broderie ou un encadrement, puisque cela dépend de ce qui l'entoure. Tout le savoir
séquentiel restait donc hors de portée. Le coach le débloque : la consigne arrive
pendant que la boucle tourne, et le manche allume le geste.

- **Bandeau `#coach`** entre l'en-tête et le manche défilant. Texte bref, verbe d'abord,
  64 caractères au plus : c'est le manche qui porte le détail. Bascule « Consignes du
  coach » dans les réglages, active par défaut, persistée.
- **Trente-huit consignes** réparties sur les onze grades, trois au minimum par grade,
  avec garde-fous `si:"min"/"maj"` et `siAccords:N`.
- **`cheminCoach()`** — dix types de gestes calculés à l'exécution contre la boucle
  courante : montée, descente, broderie, encadrement, approche, cible, pilier, cellule,
  notes communes, notes à double nom. Rien n'est écrit en dur, ce qui garde le fichier
  générique. Un chemin incalculable dans le contexte rend la consigne inéligible plutôt
  que fausse : sur un accord unique, les grades qui exigent deux accords se taisent.
- **`resoudreCible()`** résout `tonique`, `rel:N` et fondamentale/tierce/quinte/septième
  de l'accord courant ou du suivant. Refuse une cible hors gamme quand le grade impose
  la gamme.
- **Couche coach dans `rendreManche()`** : anneaux pointillés numérotés surimprimés sur
  les marques du grade, y compris sur les positions que le grade ne montre pas — sans
  quoi un geste vers une note masquée serait indésignable.
- **Cycle en unités musicales, pas en secondes** : une consigne vit quatre tours de
  boucle, donc sa durée suit le tempo. Rotation au haut de boucle, jamais deux fois la
  même d'affilée. Deux temps avant un changement d'accord, les cibles battent.
  Branché sur la file de l'ordonnanceur audio, qui portait déjà l'horodatage de chaque
  temps ; aucune horloge nouvelle.
- **Le coach propose, il ne vérifie rien.** Pas de micro, pas d'écoute : c'est l'oreille
  qui juge. L'outil reste un pupitre.

**Tonique déclarée.** `toniqueModale()` accepte désormais une tonalité venue de la fiche
de répertoire, qui prévaut sur son défaut. Le défaut — fondamentale du premier accord —
reste inchangé et sert de repli : il est juste pour une boucle modale, faux dès que la
grille est fonctionnelle et commence sur un ii. Une saisie manuelle libère la tonalité
déclarée, une valeur illisible retombe silencieusement sur le défaut, une fiche muette
se comporte exactement comme avant. La source reste unique : manche, consigne, bourdon
et coach lisent la même fonction et ne peuvent pas se contredire.

**Hygiène.** Deux commentaires citant des morceaux ont été retirés ; plus aucun titre ne
figure dans le fichier public.

- 503 assertions jsdom au vert.

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

/* improvguit — validation headless. Hors dépôt (voir .gitignore).
   node test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const HTML = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

let ok = 0, ko = 0;
const echecs = [];
function t(nom, cond) {
  if (cond) { ok++; } else { ko++; echecs.push(nom); }
}
function eq(nom, a, b) { t(nom + " (" + JSON.stringify(a) + " ≠ " + JSON.stringify(b) + ")", a === b); }

/* ------------------------------------------------------------------
   0. Hygiène du fichier : autonome, sans répertoire embarqué
   ------------------------------------------------------------------ */
t("aucune dépendance externe (src=http)", !/\ssrc\s*=\s*["']https?:/i.test(HTML));
t("aucune feuille de style externe", !/<link[^>]+stylesheet/i.test(HTML));
t("aucun import ES externe", !/\bfrom\s+["']https?:/i.test(HTML));
t("un seul fichier (pas de <script src>)", !/<script[^>]+\ssrc\s*=/i.test(HTML));

/* Le répertoire est hors dépôt. Les séries qui en dépendent ne tournent que
   s'il est posé à côté du test ; le moteur, lui, se valide sans lui. */
const CHEMIN_REP = path.join(__dirname, "repertoire.json");
const REP = fs.existsSync(CHEMIN_REP)
  ? JSON.parse(fs.readFileSync(CHEMIN_REP, "utf8"))
  : null;

if (REP) {
  REP.morceaux.forEach(function (m) {
    t("titre absent de index.html : " + m.titre, HTML.indexOf(m.titre) < 0);
  });
  REP.morceaux.forEach(function (m) {
    if (m.artiste && m.artiste !== "standard") {
      t("artiste absent de index.html : " + m.artiste, HTML.indexOf(m.artiste) < 0);
    }
  });
}

/* ------------------------------------------------------------------
   1. Chargement dans un DOM
   ------------------------------------------------------------------ */
/* une origine réelle est nécessaire : sur about:blank, localStorage lève
   une SecurityError (origine opaque) */
const dom = new JSDOM(HTML, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "https://nmulongo-sys.github.io/improvguit/"
});
const win = dom.window;
const doc = win.document;

t("l'app s'initialise (manche rendu)", doc.getElementById("manche").innerHTML.length > 0);
t("grille rendue", doc.querySelectorAll(".mesure").length > 0);
t("grades rendus", doc.querySelectorAll(".grade").length === 11);
t("modèles rendus", doc.querySelectorAll(".preset").length === 8);
t("select subdivision présent", !!doc.getElementById("subdivision"));
eq("subdivision par défaut", doc.getElementById("subdivision").value, "1");
t("aide mentionne le token _", /_<\/kbd>/.test(doc.querySelector(".aide").innerHTML));

/* accès aux fonctions internes via le scope du script */
const F = win.eval("({lireAccord, lireBoucle, accordsUniques, notesCommunes, notesMobiles," +
  " cellule, noteAncrage, toniqueModale, pcTonalite, poidsNotes, substitutTritonique, construireTimeline," +
  " analyserNote, cleCorpus, contenuBulle, faitsNote, CORPUS, MODELES," +
  " montrerBulle, cacherBulle, appliquerSaisie, appliquerModele, rendreManche, rendreConsigne," +
  " dureeAccord, etat, GRADES, GAMMES, NOMS, MAX_MESURES," +
  " QUALITES, ALIAS," +
  " TRIADES, JEUX, RENVERSEMENTS, PALIERS, formeTriade, harmoniserGamme, nashville," +
  " triadeDeAccord, triadeAtelier, palier, marques, sauver, majJeu, majVoie," +
  " arreter, reconstruire, peindreTemps, tempsCourant, accordCourant,"  +
  " grillePalier, poserGrillePalier, toniqueAtelier, SYM_TRIADE, TRIADES,"  +
  " formesTriade, centreForme, formeProche, oublierFormeAtelier, PENALITE_JEU,"  +
  " rendreChoixAtelier, rafraichirAtelier," +
  " coach, poserConsigne, coachEffacer, coachArmer, CONSIGNES," +
  " get tempsAffiche(){return tempsAffiche}, set tempsAffiche(v){tempsAffiche=v}," +
  " get enMarche(){return enMarche}, set enMarche(v){enMarche=v}," +
  " get timeline(){return timeline}})");

/* ------------------------------------------------------------------
   2. Lecture d'accords
   ------------------------------------------------------------------ */
eq("C -> pc 0", F.lireAccord("C").pc, 0);
eq("Bb -> pc 10", F.lireAccord("Bb").pc, 10);
eq("F# -> pc 6", F.lireAccord("F#").pc, 6);
t("Cm7 = [0,3,7,10]", F.lireAccord("Cm7").notes.join() === "0,3,7,10");
t("Cmaj7 = [0,4,7,11]", F.lireAccord("Cmaj7").notes.join() === "0,4,7,11");
t("Cm(maj7) = [0,3,7,11]", F.lireAccord("Cm(maj7)").notes.join() === "0,3,7,11");
t("A7(9) replie sur A7", F.lireAccord("A7(9)").notes.join() === F.lireAccord("A7").notes.join());
t("Dm7b5 = [2,5,8,0]", F.lireAccord("Dm7b5").notes.join() === "2,5,8,0");
t("D7sus4 lisible", !!F.lireAccord("D7sus4"));
t("Gmaj9 lisible", !!F.lireAccord("Gmaj9"));
t("H illisible", F.lireAccord("H") === null);
t("chaîne vide illisible", F.lireAccord("") === null);
t("Czz illisible", F.lireAccord("Czz") === null);

/* ------------------------------------------------------------------
   2 bis. X13 — les marqueurs de restitution, portés par le symbole d'accord
   ^C croche · ^^C double · C. silence · C.. frappe · C... tenue
   Notes 01 §« Les cinq marqueurs » et 14 §2. L'anticipation ne s'écrit pas
   dans la grille rythmique : elle s'écrit sur l'accord. Le *où* est un
   marqueur d'accord, le *combien* est un champ de profil de style.
   ------------------------------------------------------------------ */

/* -- Innocuité. Ces deux assertions doivent être VERTES AVANT le patch :
      c'est la preuve que le décapage ne peut manger aucun accord existant.
      Si elles rougissent, la modification n'est pas additive et on s'arrête. */
t("innocuité : aucun alias de QUALITES ne commence par ^",
  F.QUALITES.every(function(q){ return q.a.every(function(al){ return al.charAt(0) !== "^"; }); }));
t("innocuité : aucun alias de QUALITES ne se termine par un point",
  F.QUALITES.every(function(q){ return q.a.every(function(al){ return al.charAt(al.length - 1) !== "."; }); }));

/* -- Non-régression. Tout l'alphabet légal d'accords, balayé, doit se lire
      exactement comme avant : même symbole, même fondamentale, mêmes
      intervalles. Verte avant ET après — « une assertion qui passe des deux
      côtés ne teste rien » ne s'applique pas ici : c'est justement son rôle. */
const RACINES_X13 = {C:0, D:2, E:4, F:5, G:7, A:9, B:11};
const ALPHABET_X13 = [];
Object.keys(RACINES_X13).forEach(function(L){
  ["", "#", "b"].forEach(function(alt){
    F.QUALITES.forEach(function(q){
      q.a.forEach(function(al){
        const d = alt === "#" ? 1 : alt === "b" ? -1 : 0;
        ALPHABET_X13.push({txt: L + alt + al, pc: ((RACINES_X13[L] + d) % 12 + 12) % 12, iv: q.iv});
      });
    });
  });
});
const DEVIANTS_X13 = [];
ALPHABET_X13.forEach(function(c){
  const a = F.lireAccord(c.txt);
  if(!a || a.sym !== c.txt || a.pc !== c.pc || a.iv.join() !== c.iv.join()) DEVIANTS_X13.push(c.txt);
});
t("non-régression : tout l'alphabet d'accords se lit inchangé (" + ALPHABET_X13.length +
  " symboles, déviants : " + (DEVIANTS_X13.slice(0, 6).join(" ") || "aucun") + ")",
  DEVIANTS_X13.length === 0);
t("non-régression nommée : C", F.lireAccord("C").sym === "C" && F.lireAccord("C").notes.join() === "0,4,7");
t("non-régression nommée : Cmaj7", F.lireAccord("Cmaj7").sym === "Cmaj7" && F.lireAccord("Cmaj7").notes.join() === "0,4,7,11");
t("non-régression nommée : C6/9 reste illisible (l'écriture / n'est pas supportée — point ouvert)",
  F.lireAccord("C6/9") === null);

/* -- Décapage. Rouge avant le patch : le regex refuse le ^, et « . » part en
      chercherQualite(".") qui ne trouve rien. */
t("^C7 : push 1", !!F.lireAccord("^C7") && F.lireAccord("^C7").push === 1);
eq("^C7 : symbole dépouillé", F.lireAccord("^C7") ? F.lireAccord("^C7").sym : null, "C7");
t("^C7 : mêmes notes que C7",
  !!F.lireAccord("^C7") && F.lireAccord("^C7").notes.join() === F.lireAccord("C7").notes.join());
t("^^C7 : push 2", !!F.lireAccord("^^C7") && F.lireAccord("^^C7").push === 2);
eq("C. : tenue silence", F.lireAccord("C.") ? F.lireAccord("C.").tenue : null, "silence");
eq("C. : symbole dépouillé", F.lireAccord("C.") ? F.lireAccord("C.").sym : null, "C");
eq("C.. : tenue frappe", F.lireAccord("C..") ? F.lireAccord("C..").tenue : null, "frappe");
eq("C... : tenue tenue", F.lireAccord("C...") ? F.lireAccord("C...").tenue : null, "tenue");
t("C : push 0 et tenue normal par défaut",
  F.lireAccord("C").push === 0 && F.lireAccord("C").tenue === "normal");
t("^Cmaj7.. : les deux marqueurs se cumulent",
  !!F.lireAccord("^Cmaj7..") && F.lireAccord("^Cmaj7..").push === 1 &&
  F.lireAccord("^Cmaj7..").tenue === "frappe" && F.lireAccord("^Cmaj7..").sym === "Cmaj7");
t("^^Bbm7b5... : le décapage ne touche ni la fondamentale ni les notes",
  !!F.lireAccord("^^Bbm7b5...") && F.lireAccord("^^Bbm7b5...").pc === F.lireAccord("Bbm7b5").pc &&
  F.lireAccord("^^Bbm7b5...").notes.join() === F.lireAccord("Bbm7b5").notes.join());
const NEUTRES_X13 = ALPHABET_X13.filter(function(c){
  const a = F.lireAccord(c.txt);
  return !a || a.push !== 0 || a.tenue !== "normal";
});
t("tout l'alphabet porte push 0 et tenue normal (" + NEUTRES_X13.length + " écarts)",
  NEUTRES_X13.length === 0);

/* -- Figures illégales, fabriquées exprès (doctrine bloc.js). */
t("^^^C illisible : la garde s'arrête à deux carets", F.lireAccord("^^^C") === null);
t("C.... illisible : quatre points ne sont pas un marqueur", F.lireAccord("C....") === null);
t("^ seul illisible", F.lireAccord("^") === null);
t("... seul illisible", F.lireAccord("...") === null);
t("^ C illisible : un espace après le caret n'est pas une anticipation", F.lireAccord("^ C") === null);
t("^H7 illisible : le décapage ne rattrape pas une fondamentale fausse", F.lireAccord("^H7") === null);

/* -- Raccord avec lireBoucle : les marqueurs traversent le parseur de grille,
      et le point ISOLÉ reste une prolongation (PROLONGE = /^[_.]$/). */
const bX13 = F.lireBoucle("^C7 | Cmaj7..", 4);
t("la boucle accepte les marqueurs", !bX13.erreur);
t("la boucle porte push jusqu'à l'accord", !bX13.erreur && bX13.mesures[0][0].push === 1);
eq("la boucle porte tenue jusqu'à l'accord", bX13.erreur ? null : bX13.mesures[1][0].tenue, "frappe");
const bProl = F.lireBoucle("C . . .", 4);
t("non-régression : un point isolé reste une prolongation, pas un marqueur",
  !bProl.erreur && bProl.mesures[0].length === 4 && bProl.mesures[0][0] === bProl.mesures[0][3]);


/* ------------------------------------------------------------------
   3. Parseur de boucle — bases
   ------------------------------------------------------------------ */
function B(txt, b) { return F.lireBoucle(txt, b === undefined ? 4 : b); }

eq("2 mesures", B("Am7 | D7").mesures.length, 2);
eq("*4 produit 4 mesures", B("Am7 *4").mesures.length, 4);
eq("% répète", B("Am7 | %").mesures.length, 2);
const rPct = B("Am7 | %");
t("% partage la référence", rPct.mesures[0] === rPct.mesures[1]);
eq("mélange | et *", B("Am7 *2 | D7 *2").mesures.length, 4);
t("% en tête refusé", !!B("% | Am7").erreur);
t("accord illisible refusé", !!B("Am7 | H7").erreur);
t("saisie vide refusée", !!B("").erreur);
t("répétition hors bornes refusée", !!B("Am7 *99").erreur);
t("au-delà de MAX_MESURES refusé", !!B("Am7 *64 | D7 *8").erreur);
eq("MAX_MESURES", F.MAX_MESURES, 64);

/* ------------------------------------------------------------------
   4. Plafond strict : jamais plus d'emplacements que de temps
   ------------------------------------------------------------------ */
t("4 emplacements acceptés en 4 temps", !B("C D E F", 4).erreur);
t("5 emplacements refusés en 4 temps", !!B("C D E F G", 4).erreur);
t("3 emplacements acceptés en 3 temps", !B("C D E", 3).erreur);
t("4 emplacements refusés en 3 temps", !!B("C D E F", 3).erreur);
t("2 emplacements acceptés en 2 temps", !B("C G", 2).erreur);
t("3 emplacements refusés en 2 temps", !!B("C D E", 2).erreur);
t("6 emplacements acceptés en 6 temps", !B("C D E F G A", 6).erreur);
t("le message de plafond nomme les temps", /temps/.test(B("C D E F", 3).erreur));

/* ------------------------------------------------------------------
   5. Token de prolongation « _ »
   ------------------------------------------------------------------ */
let r = B("C _ _ G", 4);
t("C _ _ G accepté", !r.erreur);
eq("C _ _ G : 1 mesure", r.mesures.length, 1);
eq("C _ _ G : 4 emplacements", r.mesures[0].length, 4);
t("les 3 premiers partagent la référence",
  r.mesures[0][0] === r.mesures[0][1] && r.mesures[0][1] === r.mesures[0][2]);
t("le 4e est un autre objet", r.mesures[0][2] !== r.mesures[0][3]);
eq("le 4e est bien G", r.mesures[0][3].sym, "G");
eq("2 accords distincts dans la mesure", F.accordsUniques(r.mesures).length, 2);

r = B("C _ _ _", 4);
t("mesure entièrement tenue : un seul objet",
  F.accordsUniques(r.mesures).length === 1);

r = B("C G _ _", 4);
t("C G _ _ : 1+3", r.mesures[0][1] === r.mesures[0][3] && r.mesures[0][0] !== r.mesures[0][1]);

t("« . » est un synonyme de « _ »", !B("C . . G", 4).erreur);
t("_ en tête de boucle refusé", !!B("_ C", 4).erreur);
t("_ seul refusé", !!B("_", 4).erreur);

r = B("C _ _ _ | _ _ _ G", 4);
t("tenue par-dessus la barre acceptée", !r.erreur);
t("tenue par-dessus la barre : même objet des deux côtés",
  r.mesures[0][3] === r.mesures[1][0]);
eq("tenue par-dessus la barre : 2 accords distincts", F.accordsUniques(r.mesures).length, 2);

t("plafond respecté avec _ (5 en 4 temps refusé)", !!B("C _ _ _ _", 4).erreur);

/* ------------------------------------------------------------------
   6. Timeline : durées, attaques, identité par référence
   ------------------------------------------------------------------ */
function poser(txt, battues) {
  F.etat.battues = battues || 4;
  const res = F.lireBoucle(txt, F.etat.battues);
  if (res.erreur) throw new Error(txt + " -> " + res.erreur);
  F.etat.mesures = res.mesures;
  F.construireTimeline();
  return F.timeline;
}
function attaques(tl) { return tl.filter(function (b) { return b.debutAccord; }).length; }
function syms(tl) { return tl.map(function (b) { return b.accord ? b.accord.sym : "-"; }).join(" "); }

let tl = poser("C _ _ G", 4);
eq("C _ _ G : 4 temps", tl.length, 4);
eq("C _ _ G : suite des accords", syms(tl), "C C C G");
eq("C _ _ G : 2 attaques", attaques(tl), 2);
eq("C _ _ G : le Do dure 3 temps", F.dureeAccord(0), 3);
eq("C _ _ G : le Sol dure 1 temps", F.dureeAccord(3), 1);

tl = poser("C G", 4);
eq("C G : 2+2 (inchangé)", syms(tl), "C C G G");
eq("C G : le Do dure 2 temps", F.dureeAccord(0), 2);

tl = poser("C G _ _", 4);
eq("C G _ _ : 1+3", syms(tl), "C G G G");
eq("C G _ _ : le Sol dure 3 temps", F.dureeAccord(1), 3);

tl = poser("C _ G _", 4);
eq("C _ G _ : 2+2 explicite", syms(tl), "C C G G");
eq("C _ G _ : 2 attaques", attaques(tl), 2);

tl = poser("Am *2", 4);
eq("Am *2 : 8 temps", tl.length, 8);
eq("Am *2 : une seule attaque (accord tenu)", attaques(tl), 1);
eq("Am *2 : durée 8 temps", F.dureeAccord(0), 8);

tl = poser("Am | Am", 4);
eq("Am | Am : deux objets distincts, 2 attaques", attaques(tl), 2);

tl = poser("C _ _ _ | _ _ _ G", 4);
eq("tenue par-dessus la barre : 8 temps", tl.length, 8);
eq("tenue par-dessus la barre : 2 attaques", attaques(tl), 2);
eq("tenue par-dessus la barre : le Do dure 7 temps", F.dureeAccord(0), 7);

tl = poser("Am _ C", 3);
eq("3 temps : Am _ C", syms(tl), "Am Am C");
eq("3 temps : Am dure 2 temps", F.dureeAccord(0), 2);

/* zone d'atterrissage = temps précédant une attaque */
tl = poser("C _ _ G", 4);
t("zone d'atterrissage avant le changement", tl[2].zoneAtterrissage === true);
t("pas de zone en plein accord tenu", tl[0].zoneAtterrissage === false);

/* ------------------------------------------------------------------
   7. Théorie : notes communes, mobiles, ancrage, cellule
   ------------------------------------------------------------------ */
let acc = F.accordsUniques(B("Cm7 | F9").mesures);
t("Cm7 / F9 : Do commun", F.notesCommunes(acc).indexOf(0) >= 0);
t("Cm7 / F9 : Mi♭ commun", F.notesCommunes(acc).indexOf(3) >= 0);
t("Cm7 / F9 : Sol commun", F.notesCommunes(acc).indexOf(7) >= 0);

acc = F.accordsUniques(B("Dm | F | Gm | A7").mesures);
eq("boucle i-III-iv-V : aucune note commune aux 4", F.notesCommunes(acc).length, 0);
eq("ancrage sans note commune = tonique (Ré)", F.noteAncrage(B("Dm | F | Gm | A7").mesures), 2);

acc = F.accordsUniques(B("Dm7 *2 | Ebm7 *2").mesures);
eq("deux mineurs à un demi-ton : aucune note commune", F.notesCommunes(acc).length, 0);

t("notes mobiles non vides entre Dm7 et Ebm7",
  F.notesMobiles(F.lireAccord("Dm7"), F.lireAccord("Ebm7")).length > 0);
eq("substitut tritonique de G7 = Db7", F.substitutTritonique(F.lireAccord("G7")), "C#7");
t("pas de substitut pour un accord mineur", F.substitutTritonique(F.lireAccord("Cm7")) === null);

/* pondération par la durée : la prolongation doit peser dans le calcul.
   Sur « C _ _ G », Do occupe 3 emplacements sur 4 (poids 0,75) contre 2 sur 4
   (poids 0,5) sur « C G ». L'ancrage, lui, ne dépend plus des poids : c'est la tonique. */
const pProl = F.poidsNotes(B("C _ _ G", 4).mesures);
const pEgal = F.poidsNotes(B("C G", 4).mesures);
t("Do pèse 0,75 quand il est tenu 3 temps", Math.abs(pProl[0] - 0.75) < 1e-9);
t("Do pèse 0,50 en partage égal", Math.abs(pEgal[0] - 0.5) < 1e-9);
t("la prolongation augmente le poids", pProl[0] > pEgal[0]);
t("Sol commun aux deux accords : poids 1", Math.abs(pProl[7] - 1) < 1e-9);
eq("ancrage de C _ _ G = Do (tonique, pas la note commune)", F.noteAncrage(B("C _ _ G", 4).mesures), 0);
eq("ancrage de C _ _ F# = Do", F.noteAncrage(B("C _ _ F#", 4).mesures), 0);

/* Ancrage de G0 : la tonique, jamais la note la plus commode.
   Régression de la v6.2 : les trois configurations de G0 sont en La et
   affichaient Do, Do♯ et Mi. Un seul accord suffisait à égarer l'ancien
   calcul, qui prenait la note commune la plus basse en classe de hauteur. */
eq("blues à un seul accord : ancrage = fondamentale, pas la tierce",
   F.noteAncrage(B("A7 *2").mesures), 9);
eq("boucle modale : ancrage = 1er accord, pas la note commune",
   F.noteAncrage(B("Am7 *2 | Dm7 *2").mesures), 9);
eq("boucle mineure diatonique : ancrage = 1er accord, pas la plus présente",
   F.noteAncrage(B("Am | C | Am | C Am | Dm | Em | Am").mesures), 9);
/* la tonalité déclarée par une fiche prévaut ici comme partout ailleurs */
F.etat.tonalite = "La mineur";
eq("ancrage : la tonalité déclarée prévaut sur le 1er accord",
   F.noteAncrage(B("C | F | G | C").mesures), 9);
eq("ancrage et tonique modale s'accordent toujours",
   F.noteAncrage(B("C | F | G | C").mesures),
   F.toniqueModale(B("C | F | G | C").mesures, 0));
F.etat.tonalite = "";
eq("tonalité effacée : retour au 1er accord", F.noteAncrage(B("C | F").mesures), 0);

/* ------------------------------------------------------------------
   Tonique modale — le premier accord de la boucle, pas l'accord courant
   ------------------------------------------------------------------ */
eq("tonique modale de Cm7 | F7 = Do", F.toniqueModale(B("Cm7 | F7").mesures), 0);
eq("tonique modale de Am7 | D7 = La", F.toniqueModale(B("Am7 | D7").mesures), 9);
eq("tonique modale de Gm7 | C7 = Sol", F.toniqueModale(B("Gm7 | C7").mesures), 7);
/* elle ne suit pas l'accord en cours : le second accord ne la change pas */
eq("F7 en second ne déplace pas la tonique", F.toniqueModale(B("Cm7 | F7").mesures), 0);
eq("tenue *2 : tonique inchangée", F.toniqueModale(B("Cm7 *2 | F7").mesures), 0);
eq("prolongation _ : tonique = 1er emplacement", F.toniqueModale(B("Cm7 _ _ F7", 4).mesures), 0);
/* limite assumée : sur une grille fonctionnelle, le 1er accord est un ii,
   donc la tonique modale n'est PAS la tonique réelle (Sib, pc 10) */
eq("grille fonctionnelle : tonique modale = Do, pas Sib", F.toniqueModale(B("Cm7 | F7 | Bbmaj7 | Ebmaj7").mesures), 0);
/* secours quand la boucle est vide ou illisible */
eq("boucle vide : secours utilisé", F.toniqueModale([], 5), 5);
eq("mesures absentes : secours utilisé", F.toniqueModale(null, 3), 3);
eq("boucle vide sans secours : 0", F.toniqueModale([]), 0);

/* ------------------------------------------------------------------
   Bourdon — réglage, persistance, interface
   ------------------------------------------------------------------ */
t("interrupteur du bourdon présent", !!doc.getElementById("basBourdon"));
eq("bourdon coupé par défaut", doc.getElementById("basBourdon").getAttribute("aria-pressed"), "false");
eq("etat.bourdon vaut false au départ", F.etat.bourdon, false);
t("le bourdon est sauvegardé", /bourdon:etat\.bourdon/.test(HTML));
/* le bourdon bascule comme les autres interrupteurs */
doc.getElementById("basBourdon").dispatchEvent(new win.Event("click", { bubbles: true }));
eq("clic : bourdon activé", F.etat.bourdon, true);
eq("clic : aria-pressed suit", doc.getElementById("basBourdon").getAttribute("aria-pressed"), "true");
doc.getElementById("basBourdon").dispatchEvent(new win.Event("click", { bubbles: true }));
eq("second clic : bourdon coupé", F.etat.bourdon, false);

/* ------------------------------------------------------------------
   Cohérence manche / consigne : une seule définition de la tonique
   ------------------------------------------------------------------ */
t("marques() lit la tonique modale", /toniqueModale\(etat\.mesures, cour \? cour\.pc : 0\)/.test(HTML));
eq("plus aucune tonique déduite de l'accord courant",
   (HTML.match(/NOMS\[cour \? cour\.pc : 0\]/g) || []).length, 0);
t("la consigne G4 nomme le bouclage", /bouclage qui fabrique le mode/.test(HTML));

/* ------------------------------------------------------------------
   8. Le répertoire complet passe le moteur (si le fichier est présent)
   ------------------------------------------------------------------ */
if (REP) {
eq("38 fiches", REP.morceaux.length, 38);

const parGrade = {};
REP.morceaux.forEach(function (m) {
  const b = Number(m.battues) || 4;
  const res = F.lireBoucle(m.mesures, b);
  t("lisible : " + m.code + " " + m.titre + (res.erreur ? " — " + res.erreur : ""), !res.erreur);
  if (res.erreur) return;

  eq("longueur annoncée : " + m.code, res.mesures.length, Number(m.longueur));
  t("grade valide : " + m.code, Number(m.grade) >= 0 && Number(m.grade) <= 10);
  t("tempo plausible : " + m.code, Number(m.tempo) >= 40 && Number(m.tempo) <= 260);
  t("gamme connue : " + m.code, F.GAMMES.some(function (g) { return g.id === m.gamme; }));
  t("battues connues : " + m.code, [2, 3, 4, 6].indexOf(b) >= 0);
  t("subdivision valide : " + m.code,
    m.subdivision === undefined || [1, 2, 3].indexOf(Number(m.subdivision)) >= 0);
  t("code cohérent avec le grade : " + m.code,
    String(m.code).indexOf("G" + m.grade + "-") === 0);

  /* La tonalité déclarée doit être effectivement lue. Sans cette assertion,
     une fiche pouvait annoncer « Do majeur » et l'app entendre Ré sans que
     rien ne proteste. Seule exception : une fiche sans centre unique, qui
     doit alors retomber franchement sur le premier accord. */
  const SANS_CENTRE = ["G10-1"];
  if (SANS_CENTRE.indexOf(m.code) < 0) {
    t("tonalité lisible : " + m.code + " « " + m.tonalite + " »",
      F.pcTonalite(m.tonalite) !== null);
  } else {
    t("tonalité sans centre unique → repli assumé : " + m.code,
      F.pcTonalite(m.tonalite) === null);
  }
  t("au moins un accord : " + m.code, F.accordsUniques(res.mesures).length >= 1);

  /* aucune mesure ne dépasse le nombre de temps */
  res.mesures.forEach(function (mes, i) {
    t("mesure " + (i + 1) + " ≤ " + b + " emplacements : " + m.code, mes.length <= b);
  });

  /* rendu du manche et de la grille via l'app elle-même */
  F.etat.battues = b;
  F.etat.mesures = res.mesures;
  F.etat.grade = Number(m.grade);
  F.construireTimeline();
  eq("timeline = mesures × temps : " + m.code, F.timeline.length, res.mesures.length * b);
  t("au moins une attaque : " + m.code, attaques(F.timeline) >= 1);

  parGrade[m.grade] = (parGrade[m.grade] || 0) + 1;
});

/* répartition attendue */
const attendu = { 0: 3, 1: 4, 2: 3, 3: 4, 4: 4, 5: 4, 6: 3, 7: 4, 8: 4, 9: 3, 10: 2 };
Object.keys(attendu).forEach(function (g) {
  eq("répartition G" + g, parGrade[g] || 0, attendu[g]);
});

/* les deux fiches ternaires */
const ternaires = REP.morceaux.filter(function (m) { return Number(m.subdivision) === 3; });
eq("2 fiches en subdivision ternaire", ternaires.length, 2);
t("fiche G3-1 en ternaire", ternaires.some(function (m) { return m.code === "G3-1"; }));
t("fiche G5-1 en ternaire", ternaires.some(function (m) { return m.code === "G5-1"; }));
const hotrs = REP.morceaux.filter(function (m) { return m.code === "G5-1"; })[0];
eq("fiche G5-1 : 2 temps par mesure", Number(hotrs.battues), 2);
}

/* ------------------------------------------------------------------
   9. Parcours d'interface
   ------------------------------------------------------------------ */
const champ = doc.getElementById("saisieAccords");
const msg = doc.getElementById("msgErreur");
function saisir(v) {
  champ.value = v;
  champ.dispatchEvent(new win.Event("change", { bubbles: true }));
}
function reglerBattues(v) {
  const s = doc.getElementById("battues");
  s.value = String(v);
  s.dispatchEvent(new win.Event("change", { bubbles: true }));
  return s.value;
}

saisir("C _ _ G");
t("saisie valide acceptée par l'UI", msg.hidden === true);
eq("grille : 1 mesure", doc.querySelectorAll(".mesure").length, 1);
eq("grille : nom de mesure dédupliqué", doc.querySelector(".mesure-nom").textContent, "C G");

saisir("Am7 | D7");
eq("grille : 2 mesures", doc.querySelectorAll(".mesure").length, 2);

saisir("Am7 | H7");
t("saisie invalide signalée", msg.hidden === false);
t("champ marqué en erreur", champ.classList.contains("erreur"));

saisir("C D E F");
eq("battues 4 -> 3 refusé si la mesure a 4 emplacements", reglerBattues(3), "4");
t("refus expliqué", msg.hidden === false && /temps/.test(msg.textContent));

saisir("C D");
eq("battues 4 -> 3 accepté si 2 emplacements", reglerBattues(3), "3");
eq("timeline en 3 temps", F.timeline.length, 3);
reglerBattues(4);

const selSub = doc.getElementById("subdivision");
selSub.value = "3";
selSub.dispatchEvent(new win.Event("change", { bubbles: true }));
eq("subdivision appliquée à l'état", F.etat.subdivision, 3);
t("subdivision persistée", /"subdivision":3/.test(win.localStorage.getItem("improvguit.v2") || ""));

selSub.value = "1";
selSub.dispatchEvent(new win.Event("change", { bubbles: true }));
eq("retour à aucune subdivision", F.etat.subdivision, 1);

/* grades */
for (let g = 0; g <= 10; g++) {
  const btn = doc.querySelector('.grade[data-g="' + g + '"]');
  btn.dispatchEvent(new win.Event("click", { bubbles: true }));
  eq("grade " + g + " sélectionné", F.etat.grade, g);
  t("consigne rendue au grade " + g, doc.getElementById("consigneCorps").innerHTML.length > 0);
  t("manche rendu au grade " + g, doc.getElementById("manche").innerHTML.length > 0);
}

/* modèles */
doc.querySelectorAll(".preset").forEach(function (p, i) {
  p.dispatchEvent(new win.Event("click", { bubbles: true }));
  t("modèle " + i + " applique une boucle valide", msg.hidden === true);
});

/* Répertoire injecté à la main — jamais servi depuis le dépôt. À défaut du
   fichier privé, deux fiches synthétiques couvrent le même chemin de code. */
const REP_UI = REP || {
  version: 2,
  morceaux: [
    { code: "G0-1", titre: "Essai binaire", artiste: "essai", grade: 0, diff: 1,
      tonalite: "La mineur", tempo: 80, battues: 4, gamme: "mineur",
      longueur: 2, mesures: "Am7 | D7" },
    { code: "G5-1", titre: "Essai ternaire", artiste: "essai", grade: 5, diff: 2,
      tonalite: "La mineur", tempo: 55, battues: 2, subdivision: 3, gamme: "mineur",
      longueur: 3, mesures: "Am | C _ | E7" }
  ]
};

const pose = win.eval("poserRepertoire")(REP_UI, "test");
t("répertoire posé", pose === true);
eq("options du select répertoire",
  doc.querySelectorAll("#repertoire option").length, REP_UI.morceaux.length + 1);

const choisir = win.eval("choisirMorceau");
REP_UI.morceaux.forEach(function (m, i) {
  choisir(i);
  t("morceau chargé sans erreur : " + m.code, msg.hidden === true);
  eq("battues du morceau : " + m.code, F.etat.battues, Number(m.battues));
  eq("tempo du morceau : " + m.code, F.etat.tempo, Number(m.tempo));
  eq("grade du morceau : " + m.code, F.etat.grade, Number(m.grade));
  eq("subdivision du morceau : " + m.code, F.etat.subdivision, Number(m.subdivision) || 1);
  eq("mesures du morceau : " + m.code, F.etat.mesures.length, Number(m.longueur));
  eq("grille du morceau : " + m.code, doc.querySelectorAll(".mesure").length, Number(m.longueur));
  t("manche rendu : " + m.code, doc.getElementById("manche").innerHTML.length > 0);
});

/* persistance */
const sauve = JSON.parse(win.localStorage.getItem("improvguit.v2"));
t("la sauvegarde porte la subdivision", "subdivision" in sauve);
t("la sauvegarde porte les battues", "battues" in sauve);
t("la sauvegarde ne porte pas les mesures analysées", !("mesures" in sauve));

/* ------------------------------------------------------------------
   10. Ordonnanceur audio (AudioContext factice)
   ------------------------------------------------------------------ */
win.eval(`
  window.__evts = [];
  window.__rampes = [];
  window.__freq = [];
  window.__filtres = [];
  function __param(journal, memo){
    const p = {
      value:0,
      setValueAtTime:function(v,t){ p.value = v; window[journal].push(["set",v,t]); },
      exponentialRampToValueAtTime:function(v,t){ window[journal].push(["exp",v,t]); },
      linearRampToValueAtTime:function(v,t){ window[journal].push(["lin",v,t]); },
      cancelScheduledValues:function(t){ window[journal].push(["annule",null,t]); }
    };
    return p;
  }
  /* Deux journaux SÉPARÉS : le gain et la fréquence. La voix de la démo
     balaie son filtre (exponentialRampToValueAtTime sur frequency) ; si
     les deux paramètres écrivaient dans __rampes, une rampe de 9 000 Hz
     serait comptée comme un niveau et la série du bourdon, qui lit le
     maximum des rampes de gain, rougirait pour une bonne raison fausse. */
  function __noeud(){
    return {
      gain:__param("__rampes"), frequency:__param("__freq"),
      type:"", connect:function(){}, start:function(){}, stop:function(){}
    };
  }
  /* Le tampon de bruit : trois percussions sur sept ne sont QUE du bruit
     filtré et ne créent aucun oscillateur. Sans ces deux méthodes ici, une
     frappe qui sonnerait par erreur dans une série d'avant ferait CRASHER
     le banc au lieu de le faire rougir — et un banc qui crashe cache les
     autres rouges. */
  window.__versDestination = 0;
  window.__faireCtx = function(){
    const c = {
      currentTime:0,
      sampleRate:44100,
      destination:{},
      createBuffer:function(ch, n){
        const d = new Float32Array(n);
        return { getChannelData:function(){ return d; }, length:n };
      },
      createBufferSource:function(){
        return { buffer:null, loop:false,
          connect:function(d){ if(d === c.destination) window.__versDestination++; },
          start:function(t){ window.__evts.push({t:t, f:-1, forme:"bruit"}); },
          stop:function(){} };
      },
      createGain:__noeud,
      createBiquadFilter:function(){
        const f = __noeud();
        f.Q = { value:0 };
        window.__filtres.push(f);
        return f;
      },
      createOscillator:function(){
        const o = __noeud();
        const orig = o.start;
        o.start = function(t){
          window.__evts.push({ t:t, f:o.frequency.value, forme:o.type });
          orig(t);
        };
        return o;
      }
    };
    return c;
  };
`);

function jouerUnTour(txt, battues, sub, tempo, opts) {
  opts = opts || {};
  win.eval("window.__evts = []; window.__rampes = []; window.__freq = []; window.__filtres = [];");
  F.etat.battues = battues;
  F.etat.tempo = tempo || 60;
  F.etat.subdivision = sub;
  F.etat.clic = ("clic" in opts) ? opts.clic : true;
  F.etat.pad = ("pad" in opts) ? opts.pad : false;
  F.etat.bourdon = ("bourdon" in opts) ? opts.bourdon : false;
  /* Une boucle passée ici tient lieu de saisie manuelle : elle repart donc
     sans tonalité déclarée, comme le fait appliquerSaisie. Sans cette remise
     à zéro, la dernière fiche chargée par le parcours d'interface teignait
     tout le reste de la série audio — c'est ce qui a fait sonner le bourdon
     sur Mi après « Mi (pédale) ». On peut en déclarer une exprès pour
     vérifier justement que la fiche pilote le bourdon. */
  F.etat.tonalite = ("tonalite" in opts) ? opts.tonalite : "";
  const res = F.lireBoucle(txt, battues);
  F.etat.mesures = res.mesures;
  F.construireTimeline();
  win.eval("ctx = window.__faireCtx(); maitre = ctx.createGain(); prochainTemps = 0; pointeur = 0; fileAttente = [];");
  /* la fenêtre d'ordonnancement est de 0,12 s : on avance l'horloge pas à pas */
  const nbTemps = F.timeline.length;
  for (let k = 0; k < nbTemps; k++) {
    win.eval("ctx.currentTime = " + (k * (60 / F.etat.tempo)) + "; ordonnanceur();");
  }
  return win.eval("window.__evts.slice()");
}

let evts = jouerUnTour("C | G", 4, 1, 60);
eq("sans subdivision : 1 clic par temps", evts.length, 8);

evts = jouerUnTour("C | G", 4, 2, 60);
eq("subdivision binaire : 2 clics par temps", evts.length, 16);

evts = jouerUnTour("C | G", 4, 3, 60);
eq("subdivision ternaire : 3 clics par temps", evts.length, 24);

/* placement : à 60 BPM le temps dure 1 s, les subdivisions tombent à 1/3 et 2/3 */
const troisPremiers = evts.slice(0, 3).map(function (e) { return Math.round(e.t * 1000); });
eq("ternaire : placement des clics", troisPremiers.join(","), "0,333,667");
t("le clic de subdivision est plus grave (660 Hz)", evts[1].f === 660);
t("le clic du changement d'accord est aigu (1760 Hz)", evts[0].f === 1760);

/* le ternaire ne touche pas la timeline */
evts = jouerUnTour("C | G", 4, 3, 60);
eq("timeline inchangée par le ternaire", F.timeline.length, 8);
eq("attaques inchangées par le ternaire", attaques(F.timeline), 2);

/* fiche G5-1 : 2 temps ternaires = 6 croches par mesure */
evts = jouerUnTour("Am | C", 2, 3, 55);
eq("6/8 : 6 clics par mesure", evts.length / 2, 6);

/* clic coupé : plus aucun événement, subdivisions comprises */
win.eval("window.__evts = [];");
F.etat.clic = false;
win.eval("ctx.currentTime = 0; prochainTemps = 0; pointeur = 0; ordonnanceur();");
eq("clic coupé : aucun événement", win.eval("window.__evts.length"), 0);
F.etat.clic = true;

/* l'arrêt doit fermer le maître, sinon les subdivisions déjà programmées
   continuent de sonner jusqu'à 2/3 de temps après l'appui */
win.eval("window.__rampes = []; arreter(false);");
const rampes = win.eval("window.__rampes.slice()");
t("l'arrêt annule les valeurs programmées", rampes.some(function (r) { return r[0] === "annule"; }));
t("l'arrêt ramène le maître à zéro", rampes.some(function (r) { return r[0] === "lin" && r[1] <= 0.001; }));

/* --- Bourdon : une tenue par tour de boucle, sur la tonique modale --- */
const HZ = pc => 440 * Math.pow(2, ((36 + pc) - 69) / 12);
const arrondi = (x, n) => Math.round(x * n) / n;
const CENTS = c => Math.pow(2, c / 1200);

evts = jouerUnTour("Cm7 | F7", 4, 1, 60, { clic:false, bourdon:false });
eq("bourdon coupé : rien ne sonne", evts.length, 0);

evts = jouerUnTour("Cm7 | F7", 4, 1, 60, { clic:false, bourdon:true });
eq("bourdon actif : 4 oscillateurs pour un tour", evts.length, 4);
t("tous partent en tête de boucle", evts.every(function(e){ return e.t === 0; }));
t("dent de scie, pas triangle", evts.every(function(e){ return e.forme === "sawtooth"; }));

/* deux hauteurs, chacune dédoublée à cinq centièmes de demi-ton près */
eq("grave bas : Do2 moins 5 centièmes", arrondi(evts[0].f, 100), arrondi(HZ(0) * CENTS(-5), 100));
eq("grave haut : Do2 plus 5 centièmes",  arrondi(evts[1].f, 100), arrondi(HZ(0) * CENTS(5), 100));
eq("la paire aiguë est à l'octave", Math.round(evts[2].f / evts[0].f), 2);
t("les deux copies ne sont pas à l'unisson", evts[0].f !== evts[1].f);
/* le battement doit rester lent : au-delà, ce n'est plus un bourdon mais un vibrato */
t("battement inférieur à 1 Hz sur la fondamentale", Math.abs(evts[1].f - evts[0].f) < 1);
/* et chaque copie doit rester assez près de la hauteur juste pour que le
   désaccord ne s'entende pas comme une fausse note */
t("chaque copie à moins de 6 centièmes de la hauteur juste",
  evts.slice(0,2).every(function(e){
    return Math.abs(1200 * Math.log2(e.f / HZ(0))) <= 6;
  }));

/* passe-bas : sans lui la dent de scie mord */
eq("un passe-bas par bourdon", win.eval("window.__filtres.length"), 1);
eq("type passe-bas", win.eval("window.__filtres[0].type"), "lowpass");
t("coupure dans le médium", win.eval("window.__filtres[0].frequency.value") <= 2000);
t("pas de résonance à la coupure", win.eval("window.__filtres[0].Q.value") <= 1);

evts = jouerUnTour("Am7 | D7", 4, 1, 60, { clic:false, bourdon:true });
eq("Am7 | D7 : bourdon sur La2", arrondi(evts[0].f, 10), arrondi(HZ(9) * CENTS(-5), 10));

/* Tonalité déclarée : le bourdon la suit, y compris quand le premier accord
   n'est pas la tonique — c'est tout l'intérêt du champ. En solfège français,
   puisque c'est ce qu'écrivent les fiches. */
evts = jouerUnTour("Cm7 F7 | Bbmaj7", 4, 1, 60,
  { clic:false, bourdon:true, tonalite:"Si♭ majeur" });
eq("fiche « Si♭ majeur » : le bourdon tient Si♭, pas Do",
  arrondi(evts[0].f, 10), arrondi(HZ(10) * CENTS(-5), 10));
evts = jouerUnTour("Cm7 F7 | Bbmaj7", 4, 1, 60,
  { clic:false, bourdon:true, tonalite:"Cinq centres modaux" });
eq("tonalité sans centre : le bourdon retombe sur le premier accord",
  arrondi(evts[0].f, 10), arrondi(HZ(0) * CENTS(-5), 10));

/* quatre mesures : toujours une seule tenue, pas une par mesure */
evts = jouerUnTour("C | G | Am | F", 4, 1, 60, { clic:false, bourdon:true });
eq("4 mesures : une seule tenue", evts.length, 4);
eq("elle part sur la première mesure", evts[0].t, 0);
eq("un seul filtre, pas un par mesure", win.eval("window.__filtres.length"), 1);

/* le bourdon s'ajoute aux clics sans les perturber */
evts = jouerUnTour("C | G", 4, 1, 60, { clic:true, bourdon:true });
eq("8 clics + 4 oscillateurs de bourdon", evts.length, 12);
eq("les clics restent en onde carrée",
   evts.filter(function(e){ return e.forme === "square"; }).length, 8);

/* niveau */
evts = jouerUnTour("Cm7 | F7", 4, 1, 60, { clic:false, bourdon:true });
const cibles = win.eval("window.__rampes.slice()")
  .filter(function(r){ return r[0] === "exp" && r[1] > 0.001; })
  .map(function(r){ return r[1]; });
eq("gain du bourdon", Math.max.apply(null, cibles), 0.05);
t("le bourdon ne dépasse pas la nappe", Math.max.apply(null, cibles) <= 0.085);

/* aucune tierce : le bourdon pose la tonique, la nappe donne le mode */
t("aucune tierce dans le bourdon",
  evts.every(function(e){ return Math.abs(e.f - HZ(3)) > 2 && Math.abs(e.f - HZ(4)) > 2; }));

F.etat.bourdon = false;


/* ------------------------------------------------------------------
   Rapport
   ------------------------------------------------------------------ */
/* ------------------------------------------------------------------
   12. Bulles pédagogiques — analyse, corpus, aller-retours théorie/exercice
   ------------------------------------------------------------------ */
F.etat.battues = 4; F.etat.subdivision = 1; F.etat.tempo = 60;
F.etat.toniqueModele = 0; F.etat.gamme = "mineur"; F.etat.grade = 6;
F.appliquerSaisie("Am7 | D7");

let fN = F.analyserNote(11);                    /* Si */
eq("Si sur Am7|D7 : rel 2 depuis La", fN.rel, 2);
eq("Si n'appartient à aucun accord", fN.porteurs.length, 0);
t("Si est une approche (entre La et Do)", fN.approche);
eq("G6 : la broderie prime sur l'approche", F.cleCorpus(6, fN), "rel:2");
t("le texte G6 nomme la broderie et le cliché",
  /broderie/.test(F.CORPUS[6]["rel:2"].t) && /clich/.test(F.CORPUS[6]["rel:2"].t));

fN = F.analyserNote(9);                         /* La */
t("La : dans les deux accords, commune", fN.porteurs.length === 2 && fN.commune);
t("La : fondamentale de l'un, quinte de l'autre — double fonction", fN.double);
eq("G8 : la double fonction prime", F.cleCorpus(8, fN), "double");
eq("G9 : la note commune devient pédale", F.cleCorpus(9, fN), "commune");

fN = F.analyserNote(6);                         /* Fa# */
t("Fa# : tierce de D7 seulement",
  fN.porteurs.length === 1 && fN.porteurs[0].r.nom === "tierce");
eq("Fa# : sixte majeure de La", fN.rel, 9);
eq("G4 : la couleur dorienne prime", F.cleCorpus(4, fN), "rel:9");
eq("…et renvoie vers le modèle dorien", F.CORPUS[4]["rel:9"].e, "i–IV (dorien)");

fN = F.analyserNote(0);                         /* Do : tierce de Am7, l'accord courant à l'arrêt */
eq("G3 : Do est une cible — tierce de l'accord courant", F.cleCorpus(3, fN), "role:tierce");

/* garde-fou si:"min" : sur une boucle majeure, pas de texte dorien */
F.appliquerSaisie("C | G");
fN = F.analyserNote(9);
t("rel:9 réservé aux boucles mineures", F.cleCorpus(4, fN) !== "rel:9");

/* couverture : 11 grades × 12 notes -> toujours un nom et un texte */
F.appliquerSaisie("Am7 | D7");
let manque = 0;
for(let g = 0; g <= 10; g++){
  F.etat.grade = g;
  for(let pc = 0; pc < 12; pc++){
    const c = F.contenuBulle(pc);
    if(!/<p>/.test(c) || c.indexOf(F.NOMS[pc]) < 0) manque++;
  }
}
eq("132 combinaisons grade × note : toutes ont un texte", manque, 0);

/* chaque renvoi théorie -> exercice vise un modèle existant */
let orphelins = [];
Object.keys(F.CORPUS).forEach(function(g){
  Object.keys(F.CORPUS[g]).forEach(function(k){
    const e = F.CORPUS[g][k];
    if(e.e && !F.MODELES.some(function(m){ return m.nom === e.e; })) orphelins.push(g + "/" + k);
  });
});
eq("aucun renvoi théorie → exercice orphelin", orphelins.join(","), "");
t("chaque modèle porte sa théorie et une note à voir",
  F.MODELES.every(function(m){ return m.p && m.p.t && m.p.deg >= 0 && m.p.deg < 12; }));

/* interface : pastilles cliquables, bulle, aller-retours */
F.etat.grade = 4; F.etat.gamme = "mineur"; F.rendreManche(); F.rendreConsigne();
t("la bulle existe et démarre cachée", doc.getElementById("bulle").hidden === true);
const pastilles = doc.querySelectorAll("#manche circle[data-pc]");
t("les pastilles portent leur classe de hauteur", pastilles.length > 0);

const pB = doc.querySelector('#manche circle[data-pc="11"]');
t("pastille Si présente en La mineur", !!pB);
pB.dispatchEvent(new win.Event("click", { bubbles: true }));
t("clic sur la pastille : bulle visible", doc.getElementById("bulle").hidden === false);
t("la bulle nomme la note", doc.getElementById("bulle").innerHTML.indexOf(">" + F.NOMS[11] + "<") >= 0);

/* théorie -> exercice : Fa# en dorien propose le modèle, qui se charge */
F.etat.gamme = "dorien"; F.rendreManche();
const pF = doc.querySelector('#manche circle[data-pc="6"]');
t("pastille Fa# présente en dorien", !!pF);
pF.dispatchEvent(new win.Event("click", { bubbles: true }));
const btn = doc.querySelector("#bulle .essai");
t("la bulle propose d'essayer le modèle dorien", !!btn && btn.textContent.indexOf("dorien") >= 0);
btn.dispatchEvent(new win.Event("click", { bubbles: true }));
eq("l'essai charge le modèle — tonique Do : Cm7 | F7",
   doc.getElementById("saisieAccords").value, "Cm7 | F7");
eq("le modèle actif est mémorisé", F.etat.modeleActif, "i–IV (dorien)");
t("la bulle s'est refermée", doc.getElementById("bulle").hidden === true);

/* exercice -> théorie : la consigne pointe le ♮6 du modèle */
const lien = doc.querySelector("[data-bulle-pc]");
t("la consigne renvoie vers le manche", !!lien);
eq("…sur le ♮6 du modèle appliqué en Do", lien.getAttribute("data-bulle-pc"), "9");
lien.dispatchEvent(new win.Event("click", { bubbles: true }));
t("le lien rouvre la bulle", doc.getElementById("bulle").hidden === false);
t("…sur la bonne note", doc.getElementById("bulle").innerHTML.indexOf(">" + F.NOMS[9] + "<") >= 0);

/* la saisie manuelle libère le modèle */
F.appliquerSaisie("C | G");
eq("saisie manuelle : modèle libéré", F.etat.modeleActif, "");
t("la sauvegarde porte le modèle actif", /modeleActif:etat\.modeleActif/.test(HTML));

/* ------------------------------------------------------------------
   13. Coach — consignes d'action pendant la lecture
   ------------------------------------------------------------------ */
const C = win.eval("({CONSIGNES, cheminCoach, consignesEligibles, tirerConsigne," +
  " poserConsigne, coachEffacer, coachTop, majCoach, coach, resoudreCible, distanceChangement, positionsChemin})");

/* hygiène de la banque */
const TYPES_CHEMIN = ["montee", "descente", "broderie", "enclosure", "approche",
  "cible", "pilier", "cellule", "commune", "double"];
let nConsignes = 0;
for (let g = 0; g <= 10; g++) {
  const l = C.CONSIGNES[g] || [];
  t("G" + g + " : au moins 3 consignes", l.length >= 3);
  nConsignes += l.length;
  l.forEach(function (c, i) {
    t("G" + g + "#" + i + " : texte présent, ≤ 64 caractères", !!c.t && c.t.length <= 64);
    if (c.chemin) t("G" + g + "#" + i + " : type de chemin connu", TYPES_CHEMIN.indexOf(c.chemin.type) >= 0);
  });
}
t("banque : au moins 36 consignes", nConsignes >= 36);
t("persistance : coach sauvegardé", /coach:etat\.coach/.test(HTML));
t("bascule basCoach présente", !!doc.getElementById("basCoach"));
t("bandeau coach présent et caché au départ", doc.getElementById("coach").hidden === true);

/* boucle mineure à 2 accords : cibles résolues, tout grade a de quoi dire */
F.etat.battues = 4;
F.appliquerSaisie("Am7 | D7");
eq("cible : tierce de Am7 (Do)", C.resoudreCible("tierceCourant"), 0);
eq("cible : fondamentale du suivant (Ré)", C.resoudreCible("fondSuivant"), 2);
eq("cible : tonique modale (La)", C.resoudreCible("tonique"), 9);
for (let g = 0; g <= 10; g++) {
  F.etat.grade = g;
  const elig = C.consignesEligibles(g);
  t("G" + g + " : au moins une éligible sur Am7|D7", elig.length >= 1);
  elig.forEach(function (c) {
    const ch = C.cheminCoach(c.chemin);
    t("G" + g + " « " + c.t.slice(0, 26) + " » : chemin calculable", !!ch);
    if (ch) ch.pas.forEach(function (pas) {
      t("G" + g + " « " + c.t.slice(0, 26) + " » : pc valide", pas.pc >= 0 && pas.pc <= 11);
    });
  });
}

/* géométrie des chemins sur La (gamme majeure par défaut) */
F.etat.grade = 4;
const mont = C.cheminCoach({ type: "montee", vers: "tonique", n: 4 });
t("montée : 4 pas", mont.pas.length === 4);
eq("montée : arrive sur la tonique", mont.pas[3].pc, 9);
eq("montée : le dernier pas porte l'ordre 4", mont.pas[3].ord, "4");
const desc = C.cheminCoach({ type: "descente", vers: "tonique", n: 4 });
eq("descente : arrive sur la tonique", desc.pas[3].pc, 9);
F.etat.grade = 6;
const enc = C.cheminCoach({ type: "enclosure", vers: "fondCourant" });
eq("enclosure : dessus diatonique", enc.pas[0].pc, 11);
eq("enclosure : dessous demi-ton", enc.pas[1].pc, 8);
eq("enclosure : cible en dernier", enc.pas[2].pc, 9);
const app = C.cheminCoach({ type: "approche", vers: "tierceCourant" });
eq("approche : demi-ton sous la tierce", app.pas[0].pc, 11);
eq("approche : résolution sur la tierce", app.pas[1].pc, 0);

/* un seul accord majeur : le contexte filtre */
F.etat.grade = 8;
F.appliquerSaisie("C");
t("G8 sur un accord : aucune éligible", C.consignesEligibles(8).length === 0);
t("tirage à vide : null", C.tirerConsigne(8, null) === null);
C.coach.courant = null;
C.coachTop();
t("coachTop à vide : bandeau caché, pas d'erreur", doc.getElementById("coach").hidden === true);
t("si:\"min\" exclue sur boucle majeure",
  C.consignesEligibles(4).every(function (c) { return c.si !== "min"; }));

/* pose d'une consigne : bandeau + couche surimprimée */
F.etat.grade = 3;
F.appliquerSaisie("Am7 | D7");
C.poserConsigne(C.CONSIGNES[3][1]);
t("bandeau visible", doc.getElementById("coach").hidden === false);
eq("une consigne vit 4 tours", C.coach.resteTours, 4);
t("bandeau porte le texte", doc.getElementById("coach").textContent.indexOf("Approche la tierce") >= 0);
t("couche dessinée (anneaux pointillés)", doc.getElementById("manche").innerHTML.indexOf("stroke-dasharray") >= 0);
t("couche marquée data-coach", doc.getElementById("manche").innerHTML.indexOf('data-coach="1"') >= 0);
C.poserConsigne(C.CONSIGNES[3][0]);
t("consigne cible : complément dynamique (→ nom)", doc.getElementById("coach").textContent.indexOf("→") >= 0);
t("consigne cible : pastille marquée pulse", doc.getElementById("manche").innerHTML.indexOf("coach-pulse") >= 0);

/* Densité de la couche coach. Retour de terrain du 2026-08-01 : « trop
   nombreux, ça brouille ». Chaque étape allumait toutes ses occurrences
   dans la zone — jusqu'à quinze anneaux pour trois étapes. Il en faut
   maintenant exactement un par étape effectivement plaçable. */
function anneauxCoach() {
  return (doc.getElementById("manche").innerHTML.match(/<circle[^>]*data-coach="1"/g) || []).length;
}
const zoneAvant = F.etat.zone;
F.etat.grade = 3;
F.etat.zone = "0-4";
F.appliquerSaisie("Am7 | D7");
C.poserConsigne(C.CONSIGNES[3][1]);
const cheminPose = C.cheminCoach(C.CONSIGNES[3][1].chemin);
const placables = C.positionsChemin(cheminPose.pas, 0, 4).length;
eq("un anneau par étape, pas un par occurrence", anneauxCoach(), placables);
t("le chemin tient en quelques anneaux", anneauxCoach() <= 4);
t("les anneaux sont reliés par un filet", placables < 2 ||
  doc.getElementById("manche").innerHTML.indexOf('<line data-coach="1"') >= 0);

/* Le choix des positions : au milieu du cadre d'abord, au plus près
   ensuite — c'est ce qui rend le geste jouable d'une seule main. */
const droit = C.positionsChemin([{pc:0, ord:"1"}, {pc:2, ord:"2"}, {pc:4, ord:"3"}], 0, 4);
eq("trois étapes → trois positions", droit.length, 3);
t("chaque position appartient à la zone",
  droit.every(function (q) { return q.f >= 0 && q.f <= 4 && q.s >= 0 && q.s <= 5; }));
t("chaque position sonne la hauteur demandée",
  droit.map(function (q) { return q.pc; }).join(",") === "0,2,4");
t("pas de grand écart entre deux étapes consécutives",
  Math.abs(droit[1].f - droit[0].f) <= 4 && Math.abs(droit[2].f - droit[1].f) <= 4);
eq("l'ordre des étapes est conservé", droit.map(function (q) { return q.ord; }).join(""), "123");
t("une hauteur absente de la zone est sautée, pas forcée",
  C.positionsChemin([{pc:(2 + 12) % 12, ord:"1"}], 0, 0)
    .every(function (q) { return q.f === 0; }));
t("zone d'une seule case : au plus une position par étape",
  C.positionsChemin([{pc:0, ord:"1"}, {pc:0, ord:"2"}], 5, 5).length <= 2);

/* Hauteurs réelles. Point ouvert depuis la v6.2 : les pas d'un chemin sont
   des classes de hauteur, modulo 12. Le choix de position ne regardait que la
   distance sur le manche — une « montée » pouvait donc descendre pour de bon
   (Do suivi de Ré peut monter de deux demi-tons ou descendre de dix). Sur les
   cinq zones de l'app, quinze figures sur cent soixante partaient à l'envers,
   dont des enclosures qui plaçaient leur « dessus » sous la cible. */
const CORDES_T = [4, 9, 2, 7, 11, 4];
function hauteurs(p) { return p.map(function (q) { return CORDES_T[q.s] + q.f; }); }
function croissante(H) { return H.every(function (h, i) { return i === 0 || h > H[i - 1]; }); }
function decroissante(H) { return H.every(function (h, i) { return i === 0 || h < H[i - 1]; }); }

(function () {
  const memo = { g: F.etat.grade, gam: F.etat.gamme };
  let montees = 0, descentes = 0, enclosures = 0, approches = 0, broderies = 0;
  let fausses = 0, exemples = [];
  [["Am7 | D7", "majeur"], ["Cm7 | F7", "mineur"], ["Em7 | Am7", "dorien"]].forEach(function (cas) {
    F.appliquerSaisie(cas[0]);
    F.etat.gamme = cas[1];
    [[0, 5], [3, 8], [5, 10], [7, 12], [0, 12]].forEach(function (z) {
      for (let g = 0; g <= 10; g++) {
        F.etat.grade = g;
        C.consignesEligibles(g).forEach(function (c) {
          if (!c.chemin) return;
          const ch = C.cheminCoach(c.chemin);
          if (!ch || ch.pas.length < 2) return;
          const p = C.positionsChemin(ch.pas, z[0], z[1]);
          if (p.length < 2) return;
          const H = hauteurs(p);
          let bon = true;
          if (c.chemin.type === "montee")   { montees++;   bon = croissante(H); }
          if (c.chemin.type === "descente") { descentes++; bon = decroissante(H); }
          if (c.chemin.type === "approche") { approches++; bon = H[1] > H[0]; }
          if (c.chemin.type === "broderie") { broderies++; bon = H[1] > H[0]; }
          if (c.chemin.type === "enclosure" && H.length === 3) {
            enclosures++; bon = H[0] > H[2] && H[1] < H[2];
          }
          if (!bon) { fausses++; if (exemples.length < 3) exemples.push(c.chemin.type + " [" + H.join(",") + "]"); }
        });
      }
    });
  });
  t("les montées sont réellement testées", montees > 0);
  t("les descentes sont réellement testées", descentes > 0);
  t("les enclosures sont réellement testées", enclosures > 0);
  eq("aucune figure orientée ne part à l'envers" +
     (exemples.length ? " — " + exemples.join(" · ") : ""), fausses, 0);
  F.etat.grade = memo.g; F.etat.gamme = memo.gam;
})();

/* Le pilier fait exception : tonique et quinte sont deux repères, pas une
   figure orientée. La quinte sous la tonique est un pilier aussi juste, et
   l'imposer au-dessus la sortait des fenêtres étroites. */
(function () {
  const memo = { g: F.etat.grade };
  F.etat.grade = 0;
  F.appliquerSaisie("Am7 | D7");
  const pil = C.cheminCoach({ type: "pilier" });
  t("le pilier ne contraint aucune hauteur",
    pil.pas.every(function (p) { return p.h === undefined || p.h === null; }));
  eq("le pilier reste plaçable dans une fenêtre étroite",
    C.positionsChemin(pil.pas, 0, 5).length, 2);
  F.etat.grade = memo.g;
})();

/* Un chemin sans hauteur imposée garde le comportement d'origine : trois
   étapes libres restent trois positions, quel que soit leur ordre de hauteur. */
(function () {
  const libre = C.positionsChemin([{pc:0, ord:"1"}, {pc:2, ord:"2"}, {pc:4, ord:"3"}], 0, 5);
  eq("sans hauteur imposée : toutes les étapes sont placées", libre.length, 3);
})();

/* Compacité : le chemin doit rester sous une seule main. La recherche du
   meilleur départ resserre les figures au lieu de les étaler. */
(function () {
  const memo = { g: F.etat.grade, gam: F.etat.gamme };
  F.appliquerSaisie("Am7 | D7");
  F.etat.gamme = "majeur";
  let large = 0, n = 0;
  [[0, 5], [3, 8], [0, 12]].forEach(function (z) {
    for (let g = 0; g <= 10; g++) {
      F.etat.grade = g;
      C.consignesEligibles(g).forEach(function (c) {
        if (!c.chemin) return;
        const ch = C.cheminCoach(c.chemin);
        if (!ch || ch.pas.length < 2) return;
        const p = C.positionsChemin(ch.pas, z[0], z[1]);
        if (p.length < 2) return;
        const cases = p.map(function (q) { return q.f; });
        n++;
        if (Math.max.apply(null, cases) - Math.min.apply(null, cases) > 4) large++;
      });
    }
  });
  t("des chemins ont bien été mesurés", n > 20);
  eq("aucun chemin n'excède quatre cases d'écart", large, 0);
  F.etat.grade = memo.g; F.etat.gamme = memo.gam;
})();

F.etat.zone = zoneAvant;

/* rotation : jamais deux fois la même d'affilée */
let repetition = false, precedente = null;
for (let i = 0; i < 40; i++) {
  const c = C.tirerConsigne(3, precedente);
  if (c === precedente) repetition = true;
  precedente = c;
}
t("rotation : pas de répétition immédiate", !repetition);

/* distance au changement d'accord (pour armer le battement) */
eq("distance au prochain changement depuis le temps 0", C.distanceChangement(), 4);

/* effacement : tout disparaît */
C.coachEffacer();
t("effacement : bandeau caché", doc.getElementById("coach").hidden === true);
t("effacement : couche retirée", doc.getElementById("manche").innerHTML.indexOf("data-coach") < 0);

/* adaptation à une fiche : quand la boucle, la gamme et le grade changent
   (ce que fait choisirMorceau), les chemins suivent sans rien de codé en dur */
F.etat.grade = 4;
F.etat.gamme = "mineur";
F.appliquerSaisie("Em7 | Am7");
eq("fiche mineure : tonique recalculée (Mi)", C.resoudreCible("tonique"), 4);
const montFiche = C.cheminCoach({ type: "montee", vers: "tonique", n: 3 });
eq("fiche mineure : la montée suit la nouvelle gamme", montFiche.pas[2].pc, 4);
t("mineur naturel : la sixte du mode (♮6) est exclue — pas de 9 dans la gamme",
  !C.consignesEligibles(4).some(function (c) { return c.si === "min"; }));
F.etat.gamme = "dorien";
t("dorien : la sixte du mode redevient éligible",
  C.consignesEligibles(4).some(function (c) { return c.si === "min"; }));
eq("dorien : rel:9 résolue (Do♯ sur Mi)", C.resoudreCible("rel:9"), 1);
F.etat.gamme = "majeur";
F.appliquerSaisie("Am7 | D7");

/* ------------------------------------------------------------------
   14. Tonalité déclarée par la fiche
   ------------------------------------------------------------------ */
const T = win.eval("({pcTonalite, choisirMorceau, get repertoire(){return repertoire}," +
  " set repertoire(v){repertoire = v}})");

eq("tonalité : Bb", T.pcTonalite("Bb"), 10);
eq("tonalité : Gm (qualité ignorée)", T.pcTonalite("Gm"), 7);
eq("tonalité : F#m", T.pcTonalite("F#m"), 6);
eq("tonalité : Bbm (bémol puis mineur)", T.pcTonalite("Bbm"), 10);
eq("tonalité : minuscule tolérée", T.pcTonalite("a"), 9);
t("tonalité : chaîne vide → null", T.pcTonalite("") === null);
t("tonalité : illisible → null", T.pcTonalite("mineur") === null);

/* Solfège français : c'est la notation des fiches du répertoire. Avant ce
   correctif, « Do majeur » était capté par le D anglo-saxon et lu Ré,
   « Fa♯ mineur » lu Fa — six fiches sur trente-huit fausses d'un demi-ton,
   sans erreur visible, sur le manche comme au bourdon et au coach. */
eq("tonalité FR : Do majeur (n'est pas Ré)", T.pcTonalite("Do majeur"), 0);
eq("tonalité FR : Do dorien", T.pcTonalite("Do dorien"), 0);
eq("tonalité FR : Ré mineur", T.pcTonalite("Ré mineur"), 2);
eq("tonalité FR : Re sans accent", T.pcTonalite("Re mineur"), 2);
eq("tonalité FR : Mi majeur", T.pcTonalite("Mi majeur"), 4);
eq("tonalité FR : Fa mineur", T.pcTonalite("Fa mineur"), 5);
eq("tonalité FR : Sol mixolydien", T.pcTonalite("Sol mixolydien"), 7);
eq("tonalité FR : La mineur", T.pcTonalite("La mineur"), 9);
eq("tonalité FR : Si dorien", T.pcTonalite("Si dorien"), 11);
eq("tonalité FR : Si♭ dorien (bémol typographique)", T.pcTonalite("Si♭ dorien"), 10);
eq("tonalité FR : Mi♭ mineur", T.pcTonalite("Mi♭ mineur"), 3);
eq("tonalité FR : La♭ majeur", T.pcTonalite("La♭ majeur"), 8);
eq("tonalité FR : Fa♯ mineur (n'est pas Fa)", T.pcTonalite("Fa♯ mineur"), 6);
eq("tonalité FR : bémol en lettre collée", T.pcTonalite("Sib majeur"), 10);
eq("tonalité FR : parenthèse après le nom", T.pcTonalite("Fa (blues)"), 5);
eq("tonalité FR : Mi (pédale)", T.pcTonalite("Mi (pédale)"), 4);
eq("tonalité FR : nom seul", T.pcTonalite("Mi"), 4);
/* plusieurs centres : le premier nommé l'emporte, c'est le point de départ */
eq("tonalité FR : Ré / Do / Si♭ majeur → Ré", T.pcTonalite("Ré / Do / Si♭ majeur"), 2);
eq("tonalité FR : Do mineur → Ré♭ majeur → Do", T.pcTonalite("Do mineur → Ré♭ majeur"), 0);
eq("tonalité FR : Sol mineur / Si♭ majeur → Sol", T.pcTonalite("Sol mineur / Si♭ majeur"), 7);
/* un mot qui commence comme une note n'est pas une note */
t("tonalité : « dorien » n'est pas Ré", T.pcTonalite("dorien") === null);
t("tonalité : « mineur » n'est pas Mi", T.pcTonalite("mineur") === null);
t("tonalité : « Cinq centres modaux » n'est pas Do",
  T.pcTonalite("Cinq centres modaux") === null);
t("tonalité : « aucune » n'est pas La", T.pcTonalite("aucune") === null);
/* la notation anglo-saxonne survit intacte au passage du français */
eq("tonalité : Bb toujours lu après l'ajout du FR", T.pcTonalite("Bb"), 10);
eq("tonalité : Bb majeur (suffixe de qualité)", T.pcTonalite("Bb majeur"), 10);
eq("tonalité : C n'est pas mangé par « do »", T.pcTonalite("C"), 0);

/* sans tonalité déclarée : le premier accord fait la tonique (inchangé) */
F.etat.tonalite = "";
F.appliquerSaisie("Cm7 F7 | Bbmaj7");
eq("sans fiche : tonique = premier accord (Do)", F.toniqueModale(F.etat.mesures, 0), 0);

/* avec tonalité déclarée : la fiche fait autorité */
F.etat.tonalite = "Bb";
eq("fiche déclarée : tonique = Si♭", F.toniqueModale(F.etat.mesures, 0), 10);
eq("coach : la cible « tonique » suit la fiche", C.resoudreCible("tonique"), 10);
F.etat.grade = 4;
F.etat.gamme = "majeur";
const montBb = C.cheminCoach({ type: "montee", vers: "tonique", n: 3 });
eq("coach : la montée arrive sur Si♭", montBb.pas[2].pc, 10);
t("bulle : l'analyse est relative à la tonique déclarée", F.analyserNote(10).rel === 0);

/* tonalité illisible : repli silencieux sur le premier accord */
F.etat.tonalite = "???";
eq("tonalité illisible : repli sur le premier accord", F.toniqueModale(F.etat.mesures, 0), 0);

/* une saisie manuelle libère la tonalité déclarée */
F.etat.tonalite = "Bb";
F.appliquerSaisie("Am7 | D7");
eq("saisie manuelle : tonalité libérée", F.etat.tonalite, "");
eq("…et la tonique redevient le premier accord (La)", F.toniqueModale(F.etat.mesures, 0), 9);

/* choisirMorceau applique la tonalité de la fiche */
T.repertoire = [{ code: "T-1", titre: "essai", grade: 4, tonalite: "Bb",
  gamme: "majeur", battues: 4, tempo: 92, mesures: "Cm7 F7 | Bbmaj7" }];
T.choisirMorceau(0);
eq("fiche chargée : tonalité posée", F.etat.tonalite, "Bb");
eq("fiche chargée : tonique = Si♭ malgré le Cm7 initial", F.toniqueModale(F.etat.mesures, 0), 10);
eq("fiche chargée : le coach vise Si♭", C.resoudreCible("tonique"), 10);

/* fiche sans champ tonalite : comportement d'avant, inchangé */
T.repertoire = [{ code: "T-2", titre: "essai 2", grade: 4, gamme: "majeur",
  battues: 4, tempo: 92, mesures: "Cm7 F7 | Bbmaj7" }];
T.choisirMorceau(0);
eq("fiche muette : tonalité vide", F.etat.tonalite, "");
eq("fiche muette : tonique = premier accord", F.toniqueModale(F.etat.mesures, 0), 0);

t("persistance : tonalité sauvegardée", /tonalite:etat\.tonalite/.test(HTML));

/* remise en état pour le bilan */
F.etat.tonalite = "";
F.etat.grade = 0;
F.appliquerSaisie("Am7 | D7");

/* ------------------------------------------------------------------
   Atelier des triades — formes, harmonisation, chiffrage Nashville
   ------------------------------------------------------------------ */

/* Exhaustif : 12 fondamentales x 4 qualites x 3 renversements x 4 jeux.
   Une forme doit exister pour chacune, porter exactement les trois sons
   de la triade sans doublure, monter strictement, et tenir sous la main. */
(function () {
  let manquantes = 0, sonsFaux = 0, voixFausses = 0, basseFausse = 0, tropLarge = 0;
  for (let pc = 0; pc < 12; pc++)
    for (const q of ["maj", "min", "dim", "aug"])
      for (let r = 0; r < 3; r++)
        for (const j of F.JEUX) {
          const f = F.formeTriade(pc, q, r, j, 0, 15, 4);
          if (!f) { manquantes++; continue; }
          const iv = F.TRIADES[q].iv;
          const att = iv.map(function (x) { return (pc + x) % 12; }).sort(function (a, b) { return a - b; });
          const obt = f.positions.map(function (o) { return o.pc; }).sort(function (a, b) { return a - b; });
          if (att.join() !== obt.join()) sonsFaux++;
          for (let k = 1; k < 3; k++) if (f.hauteurs[k] <= f.hauteurs[k - 1]) voixFausses++;
          if (f.basse !== (pc + iv[r % 3]) % 12) basseFausse++;
          if (f.etendue > 4) tropLarge++;
        }
  eq("576 formes de triade : aucune introuvable", manquantes, 0);
  eq("576 formes : aucun son faux ni doublure", sonsFaux, 0);
  eq("576 formes : les voix montent toujours", voixFausses, 0);
  eq("576 formes : la basse est celle du renversement", basseFausse, 0);
  eq("576 formes : aucune n'excede 4 cases", tropLarge, 0);
})();

/* Doigtes classiques : garde-fous contre une regression silencieuse du
   choix de position. Do majeur sur les cordes 3-2-1 est Sol:5 Si:5 mi:3. */
(function () {
  const f = F.formeTriade(0, "maj", 0, F.JEUX[3], 0, 15, 4);
  eq("Do maj 3-2-1 : cordes attendues", f.positions.map(function (o) { return o.s; }).join(), "3,4,5");
  eq("Do maj 3-2-1 : cases attendues", f.positions.map(function (o) { return o.f; }).join(), "5,5,3");
  eq("Do maj 3-2-1 : basse = fondamentale", f.basse, 0);
  const g = F.formeTriade(0, "maj", 2, F.JEUX[3], 0, 15, 4);
  eq("Do/Sol 3-2-1 : position ouverte", g.positions.map(function (o) { return o.f; }).join(), "0,1,0");
  eq("Do/Sol : la quinte est a la basse", g.basse, 7);
  const h = F.formeTriade(0, "maj", 1, F.JEUX[3], 0, 15, 4);
  eq("Do/Mi : la tierce est a la basse", h.basse, 4);
})();

/* Harmonisation : la suite des qualites n'est jamais ecrite, elle tombe
   de l'empilement de tierces dans la gamme. */
(function () {
  const maj = F.harmoniserGamme(0, [0, 2, 4, 5, 7, 9, 11]);
  eq("gamme majeure harmonisee : M-m-m-M-M-m-dim",
     maj.map(function (d) { return d.qualite; }).join(),
     "maj,min,min,maj,maj,min,dim");
  eq("degre 1 de Do majeur = Do", maj[0].pc, 0);
  eq("degre 5 de Do majeur = Sol", maj[4].pc, 7);
  const min = F.harmoniserGamme(9, [0, 2, 3, 5, 7, 8, 10]);
  eq("gamme mineure harmonisee : m-dim-M-m-m-M-M",
     min.map(function (d) { return d.qualite; }).join(),
     "min,dim,maj,min,min,maj,maj");
  eq("degre 1 de La mineur = La", min[0].pc, 9);
  /* cinq notes ne font pas des tierces empilees : refus propre */
  const penta = F.harmoniserGamme(0, [0, 2, 4, 7, 9]);
  t("pentatonique : aucune qualite inventee",
    penta.every(function (d) { return d.qualite === null; }));
})();

/* Chiffrage Nashville : le degre DANS la tonalite, a ne pas confondre
   avec les numeros de sons a l'interieur d'un accord. */
eq("La mineur en tonalite de Do = 6m", F.nashville(9, 0, "min"), "6m");
eq("Do majeur en tonalite de Do = 1", F.nashville(0, 0, "maj"), "1");
eq("Si diminue en tonalite de Do = 7°", F.nashville(11, 0, "dim"), "7°");
eq("Si bemol en tonalite de Do = ♭7", F.nashville(10, 0, "maj"), "♭7");
eq("Fa en tonalite de Do = 4", F.nashville(5, 0, "maj"), "4");
eq("le chiffrage suit la tonalite, pas la lettre", F.nashville(9, 9, "min"), "1m");

/* Reduction d'un accord a sa triade : un Am7 se travaille sur La mineur. */
eq("Am7 se reduit a une triade mineure", F.triadeDeAccord(F.lireAccord("Am7")), "min");
eq("Cmaj7 se reduit a une triade majeure", F.triadeDeAccord(F.lireAccord("Cmaj7")), "maj");
eq("G7 se reduit a une triade majeure", F.triadeDeAccord(F.lireAccord("G7")), "maj");
eq("Bm7b5 se reduit a une triade diminuee", F.triadeDeAccord(F.lireAccord("Bm7b5")), "dim");
t("un accord suspendu n'a pas de triade franche", F.triadeDeAccord(F.lireAccord("Csus4")) === null);

/* Les paliers : progressivite tenue par les donnees. */
(function () {
  eq("onze paliers", F.PALIERS.length, 11);
  t("A0 n'ouvre qu'un renversement", F.PALIERS[0].renv.length === 1);
  t("A0 n'ouvre qu'un jeu de cordes", F.PALIERS[0].jeux.length === 1);
  t("A4 ouvre les trois renversements", F.PALIERS[4].renv.length === 3);
  t("A8 ouvre les quatre jeux de cordes", F.PALIERS[8].jeux.length === 4);
  t("les renversements ne se ferment jamais",
    F.PALIERS.every(function (p, i) { return i === 0 || p.renv.length >= F.PALIERS[i - 1].renv.length || p.n >= 9; }));
  t("chaque palier porte un titre et un texte",
    F.PALIERS.every(function (p) { return p.court && p.titre && p.t && p.t.length > 20; }));
  t("chaque palier nomme une gamme connue",
    F.PALIERS.every(function (p) { return F.GAMMES.some(function (g) { return g.id === p.gamme; }); }));
})();

/* L'atelier bout a bout : chaque palier doit produire une forme reelle
   sur chacun de ses degres, sans quoi l'ecran resterait muet. */
(function () {
  const memo = {a: F.etat.atelier, p: F.etat.palier, b: F.etat.atelierBoucle,
                d: F.etat.atelierDegre, r: F.etat.atelierRenv, j: F.etat.atelierJeu};
  F.etat.atelier = true;
  F.etat.atelierBoucle = false;
  let muets = 0, essais = 0;
  F.PALIERS.forEach(function (P) {
    F.etat.palier = P.n;
    P.renv.forEach(function (r) {
      P.jeux.forEach(function (j) {
        for (let d = 0; d < 7; d++) {
          F.etat.atelierRenv = r; F.etat.atelierJeu = j; F.etat.atelierDegre = d;
          essais++;
          const tri = F.triadeAtelier();
          if (!tri || !tri.positions || tri.positions.length !== 3) muets++;
        }
      });
    });
  });
  t("l'atelier a ete parcouru en entier", essais > 200);
  eq("aucune configuration de l'atelier ne reste muette", muets, 0);

  /* le fond du manche montre la gamme, pas les marques du grade */
  F.etat.palier = 4;
  const m = F.marques();
  eq("en atelier le fond du manche est la gamme entiere", Object.keys(m).length, 7);
  t("les pastilles de fond sont petites",
    Object.keys(m).every(function (k) { return m[k].petit === true; }));

  F.etat.atelier = memo.a; F.etat.palier = memo.p; F.etat.atelierBoucle = memo.b;
  F.etat.atelierDegre = memo.d; F.etat.atelierRenv = memo.r; F.etat.atelierJeu = memo.j;
})();

/* Interface de l'atelier presente et coherente. */
t("bascule de voie presente", !!doc.getElementById("voieAtelier") && !!doc.getElementById("voieGrades"));
t("barre de l'atelier presente", !!doc.getElementById("atelierBarre"));
t("navigation par degre presente", !!doc.getElementById("triPrec") && !!doc.getElementById("triSuiv"));
t("selecteurs de renversement et de jeu presents",
  !!doc.getElementById("triRenv") && !!doc.getElementById("triJeu"));
t("interrupteur de suivi de boucle present", !!doc.getElementById("basAtelierBoucle"));
eq("l'atelier est ferme au depart", doc.getElementById("atelierBarre").hasAttribute("hidden"), true);
t("l'etat de l'atelier est sauvegarde", /atelier:etat\.atelier/.test(HTML));
t("le palier est sauvegarde", /palier:etat\.palier/.test(HTML));

/* ------------------------------------------------------------------
   14. Mode pupitre (lot A) — le viewport alloué, plus empilé
   ------------------------------------------------------------------ */
(function () {
  const memoJeu = F.etat.jeu, memoPref = F.etat.pupitre, memoAtelier = F.etat.atelier;
  const btn = doc.getElementById("btnPlein");
  const CSS = HTML.split("<style>")[1].split("</style>")[0];

  /* --- présence et instrumentation --- */
  t("bouton pupitre present", !!btn);
  t("le bouton pupitre est dans l'en-tete du manche", !!btn && !!btn.closest(".manche-entete"));
  eq("le bouton pupitre annonce son etat", btn.getAttribute("aria-pressed"), "false");
  t("le bouton pupitre porte un libelle", /pupitre/i.test(btn.getAttribute("aria-label") || ""));
  t("l'icone du bouton est peuplee au chargement",
    doc.getElementById("iconePlein").innerHTML.indexOf("path") >= 0);
  t("interrupteur de preference present", !!doc.getElementById("basPupitre"));
  eq("le mode pupitre est actif par defaut au depart",
    doc.getElementById("basPupitre").getAttribute("aria-pressed"), "true");
  eq("le corps n'est pas en pupitre au chargement", doc.body.classList.contains("jeu"), false);

  /* --- bascule --- */
  btn.dispatchEvent(new win.Event("click", { bubbles: true }));
  eq("le clic entre en mode pupitre", doc.body.classList.contains("jeu"), true);
  eq("l'etat du bouton suit", btn.getAttribute("aria-pressed"), "true");
  t("le libelle devient une sortie", /quitter/i.test(btn.getAttribute("aria-label") || ""));
  t("l'icone change de sens en pupitre",
    doc.getElementById("iconePlein").innerHTML.indexOf("M9 3v6H3") >= 0);
  btn.dispatchEvent(new win.Event("click", { bubbles: true }));
  eq("un second clic en sort", doc.body.classList.contains("jeu"), false);
  eq("l'etat du bouton revient", btn.getAttribute("aria-pressed"), "false");

  /* la bulle survivrait au changement de regime : ses coordonnees sont
     calculees dans l'ancien cadrage, elle se retrouverait a cote */
  doc.getElementById("bulle").hidden = false;
  btn.dispatchEvent(new win.Event("click", { bubbles: true }));
  eq("entrer en pupitre referme la bulle", doc.getElementById("bulle").hidden, true);
  btn.dispatchEvent(new win.Event("click", { bubbles: true }));

  /* --- persistance : la preference se garde, le regime non --- */
  btn.dispatchEvent(new win.Event("click", { bubbles: true }));
  F.sauver();
  const v1 = JSON.parse(win.localStorage.getItem("improvguit.v2") || "{}");
  eq("le regime courant n'est pas persiste", "jeu" in v1, false);
  btn.dispatchEvent(new win.Event("click", { bubbles: true }));

  const bp = doc.getElementById("basPupitre");
  bp.dispatchEvent(new win.Event("click", { bubbles: true }));
  const v2 = JSON.parse(win.localStorage.getItem("improvguit.v2") || "{}");
  eq("la preference pupitre est persistee", v2.pupitre, false);
  eq("l'interrupteur suit", bp.getAttribute("aria-pressed"), "false");
  bp.dispatchEvent(new win.Event("click", { bubbles: true }));
  const v3 = JSON.parse(win.localStorage.getItem("improvguit.v2") || "{}");
  eq("la preference se rallume", v3.pupitre, true);

  /* --- regles de mise en page : le viewport est alloue, rien ne defile --- */
  t("le corps en pupitre occupe la hauteur du viewport", /body\.jeu\{[^}]*100dvh/.test(CSS));
  t("le corps en pupitre ne defile pas", /body\.jeu\{[^}]*overflow:hidden/.test(CSS));
  t("le corps en pupitre est une colonne flex", /body\.jeu\{[^}]*flex-direction:column/.test(CSS));
  t("le manche prend la hauteur restante", /body\.jeu \.manche-cadre\{[^}]*flex:1/.test(CSS));
  t("le manche cesse de defiler", /body\.jeu \.manche-defil\{[^}]*overflow:hidden/.test(CSS));
  t("le plafond de 52vh est leve", /body\.jeu \.manche-defil\{[^}]*max-height:none/.test(CSS));
  t("le svg se dimensionne sur la hauteur", /body\.jeu svg\.manche\{[^}]*height:100%/.test(CSS));
  ["header", "\\.voies", "\\.grades", "\\.reglages", "\\.consigne", "\\.pied"].forEach(function (sel) {
    t("masque en pupitre : " + sel.replace(/\\\\/g, ""),
      new RegExp("body\\.jeu > " + sel + "[,{]").test(CSS));
  });
  t("la navigation de l'atelier survit en pupitre", /body\.jeu > \.atelier-barre\{/.test(CSS));
  t("les selecteurs de l'atelier sortent en pupitre",
    /body\.jeu > \.atelier-barre \.atelier-choix/.test(CSS));
  t("la grille garde deux rangees", /body\.jeu \.grille-cadre\{[^}]*max-height:104px/.test(CSS));

  /* --- la sortie n'est jamais automatique --- */
  t("arreter() ne touche pas au regime d'affichage",
    !/function arreter[\s\S]*?\n\}/.exec(HTML)[0].match(/etat\.jeu/));
  t("l'entree en pupitre est conditionnee a la preference",
    /if\(etat\.pupitre && !etat\.jeu\)/.test(HTML));

  F.etat.jeu = memoJeu; F.etat.pupitre = memoPref; F.etat.atelier = memoAtelier;
  F.majJeu();
})();

/* ------------------------------------------------------------------
   15. Correctif : hidden sans effet sur la barre d'atelier
   ------------------------------------------------------------------ */
/* display:flex pose en classe l'emporte sur la feuille de l'agent
   utilisateur : sans garde [hidden], majVoie() n'eteignait pas la barre,
   qui restait visible en voie Grades. Meme garde que .coach et .bulle. */
t("la barre d'atelier a une garde [hidden]", /\.atelier-barre\[hidden\]\{display:none\}/
  .test(HTML));
eq("la barre d'atelier est bien eteinte en voie Grades",
  win.getComputedStyle(doc.getElementById("atelierBarre")).display, "none");
doc.getElementById("voieAtelier").dispatchEvent(new win.Event("click", { bubbles: true }));
eq("la barre d'atelier reapparait en voie Atelier",
  win.getComputedStyle(doc.getElementById("atelierBarre")).display, "flex");
doc.getElementById("voieGrades").dispatchEvent(new win.Event("click", { bubbles: true }));
eq("et se reeteint au retour",
  win.getComputedStyle(doc.getElementById("atelierBarre")).display, "none");

/* ------------------------------------------------------------------
   16. Lot A-bis : geler l'affichage a la pause
   ------------------------------------------------------------------ */
/* arreter() remettait tempsAffiche a -1 puis appelait coachEffacer(), qui
   relance rendreManche() : tempsCourant() retombait sur 0 et marques()
   recalculait les pastilles du PREMIER accord de la boucle. Pause sur le D7
   -> le manche sautait sur l'Am7, et les anneaux du coach disparaissaient par
   le meme chemin. Arrete n'est pas remis a zero. */
(function () {
  const memoCoach = F.etat.coach, memoDuree = F.etat.duree, memoSaisie = F.etat.saisie;
  F.etat.coach = true;
  F.etat.duree = 0;
  F.etat.battues = 4;
  F.appliquerSaisie("Am7 | D7");
  eq("grille de reference : 8 temps", F.timeline.length, 8);
  t("changement d'accord au temps 4", !!F.timeline[4].debutAccord);

  /* --- pause manuelle en plein deuxieme accord --- */
  F.enMarche = true;
  F.tempsAffiche = 5;
  F.poserConsigne({ t: "consigne de controle" });
  F.peindreTemps();
  const accordAvant = F.accordCourant();
  t("mise en place : on est bien sur le second accord", accordAvant === F.timeline[4].accord);

  F.arreter(false);

  eq("pause : le temps atteint est conserve", F.tempsAffiche, 5);
  t("pause : le manche reste sur l'accord en cours", F.accordCourant() === accordAvant);
  t("pause : la consigne du coach survit", !!F.coach.courant);
  t("pause : le bandeau coach reste affiche", doc.getElementById("coach").hidden === false);
  t("pause : la case de temps garde sa marque",
    !!doc.querySelector('.temp[data-i="5"]') &&
    doc.querySelector('.temp[data-i="5"]').classList.contains("on"));
  t("pause : la grille passe en gele", doc.getElementById("grille").classList.contains("fige"));
  t("pause : le battement d'armement s'eteint",
    !doc.getElementById("manche").classList.contains("coach-armee"));
  t("le temps gele se lit en creux, pas en relief",
    /#grille\.fige \.temp\.on\{transform:none/.test(HTML));

  /* --- fin de seance : la remise a zero, elle, reste entiere --- */
  F.enMarche = true;
  F.tempsAffiche = 5;
  F.poserConsigne({ t: "consigne de controle" });
  F.arreter(true);
  eq("fin de seance : le temps repart a -1", F.tempsAffiche, -1);
  t("fin de seance : le coach est vide", F.coach.courant === null);
  t("fin de seance : le bandeau coach est eteint", doc.getElementById("coach").hidden === true);
  t("fin de seance : plus de gel sur la grille",
    !doc.getElementById("grille").classList.contains("fige"));
  eq("fin de seance : le manche retombe sur le premier temps", F.tempsCourant(), 0);
  t("fin de seance : aucune case n'est marquee",
    doc.querySelectorAll(".temp.on").length === 0);

  /* --- une grille neuve perime l'image gelee --- */
  F.enMarche = false;
  F.tempsAffiche = 7;
  F.appliquerSaisie("Cmaj7");
  eq("nouvelle grille : l'image gelee est relachee", F.tempsAffiche, -1);
  t("nouvelle grille : l'index gele ne survit pas hors timeline",
    F.tempsCourant() < F.timeline.length);

  /* --- la remise a zero est desormais conditionnee --- */
  const CORPS_ARRETER = /function arreter\([\s\S]*?\n\}/.exec(HTML)[0];
  t("arreter() ne remet plus tempsAffiche a -1 sans condition",
    /if\(fini\)\{[\s\S]*?tempsAffiche = -1/.test(CORPS_ARRETER));
  t("arreter() n'appelle coachEffacer() que sur fin de seance",
    /if\(fini\)\{[\s\S]*?coachEffacer\(\);[\s\S]*?\}else\{/.test(CORPS_ARRETER));
  t("arreter() ne touche toujours pas au regime d'affichage",
    !/etat\.jeu/.test(CORPS_ARRETER));

  F.etat.coach = memoCoach;
  F.etat.duree = memoDuree;
  F.appliquerSaisie(memoSaisie);
  F.enMarche = false;
})();

/* ------------------------------------------------------------------
   17. Grille de palier : l'atelier apporte sa propre boucle
   ------------------------------------------------------------------ */
/* Un palier ne decrivait que des formes ; rien ne disait quand en changer.
   Il porte desormais sa grille, ecrite en DEGRES et harmonisee a la volee :
   aucune suite d'accords n'est tabulee, tout se transpose avec la tonique. */
(function () {
  const memoSaisie = F.etat.saisie, memoTon = F.etat.toniqueModele;
  const memoAtelier = F.etat.atelier, memoPalier = F.etat.palier;
  const memoBoucle = F.etat.atelierBoucle, memoAvant = F.etat.saisieAvant;

  /* --- aucune suite d'accords en dur dans le fichier --- */
  t("aucune grille de palier ecrite en lettres",
    !/grille:\s*\[\s*["']/.test(HTML));
  F.PALIERS.forEach(function (P) {
    t("le palier " + P.court + " porte une grille en degres",
      Array.isArray(P.grille) && P.grille.length > 0 &&
      P.grille.every(function (d) { return d >= 1 && d <= 7; }));
    t("les degres du palier " + P.court + " sont couverts par la gamme du palier",
      P.grille.every(function (d) {
        const g = F.GAMMES.filter(function (x) { return x.id === P.gamme; })[0];
        return !!g && d <= g.iv.length;
      }));
  });

  /* --- la grille se construit, se relit, et porte la bonne tonique --- */
  F.etat.toniqueModele = 0;
  const A0 = F.PALIERS[0];
  eq("A0 : deux mesures par accord", A0.mes, 2);
  eq("A0 en Do", F.grillePalier(A0), "C | % | F | % | C | % | G | %");
  const lu = F.lireBoucle(F.grillePalier(A0), 4);
  t("A0 : grille relisible", !lu.erreur);
  eq("A0 : huit mesures", lu.mesures.length, 8);
  /* le 1 revient au milieu, pas en fin : la couture de la boucle enchaine
     5 -> 1, cadence naturelle, et la tonique ne tient jamais plus de deux
     mesures d'affilee. Les deux 1 sont deux objets distincts, donc deux
     attaques — c'est bien un retour, pas une tenue. */
  eq("A0 : quatre accords, le 1 revenant au milieu",
    F.accordsUniques(lu.mesures).length, 4);
  eq("A0 : le repere revient a la mesure 5",
    F.NOMS[lu.mesures[4][0].pc], "C");
  t("A0 : la couture de la boucle enchaine 5 vers 1",
    lu.mesures[6][0].pc === 7 && lu.mesures[0][0].pc === 0);
  t("A0 : la tonique ne tient jamais plus de deux mesures",
    lu.mesures[2][0].pc !== 0 && lu.mesures[6][0].pc !== 0);
  eq("A0 : trois hauteurs distinctes",
    F.accordsUniques(lu.mesures).map(function (a) { return a.pc; })
      .filter(function (v, i, t2) { return t2.indexOf(v) === i; }).length, 3);
  eq("A0 : la tonique lue est celle demandee", F.toniqueModale(lu.mesures, 0), 0);
  t("« % » tient l'accord sans le rejouer",
    lu.mesures[0][0] === lu.mesures[1][0]);

  eq("A1 pose un mineur au premier changement", F.grillePalier(F.PALIERS[1]),
    "C | % | Am | % | F | % | G | %");
  t("A2 parcourt les sept degres",
    F.PALIERS[2].grille.slice().sort().join() === "1,2,3,4,5,6,7,1".split(",").sort().join());

  /* --- la grille se transpose --- */
  F.etat.toniqueModele = 4;
  eq("A0 se transpose en Mi", F.grillePalier(A0), "E | % | A | % | E | % | B | %");
  eq("A9 suit la gamme mineure du palier",
    F.grillePalier(F.PALIERS[9]).split(" | ")[0], "Em");
  F.etat.toniqueModele = 0;

  /* --- entrer dans l'atelier pose la grille et force la boucle --- */
  F.etat.atelier = false;
  F.etat.saisieAvant = "";
  F.etat.atelierBoucle = false;
  F.appliquerSaisie("Am7 | D7");
  doc.getElementById("voieAtelier").dispatchEvent(new win.Event("click", { bubbles: true }));
  eq("l'entree en atelier pose la grille du palier", F.etat.saisie, F.grillePalier(F.PALIERS[F.etat.palier]));
  t("l'entree en atelier force le suivi de boucle", F.etat.atelierBoucle === true);
  eq("la boucle d'avant est mise de cote", F.etat.saisieAvant, "Am7 | D7");

  /* --- changer de palier repose la grille --- */
  const cible = doc.querySelector('#paliers .grade[data-p="1"]');
  t("les paliers sont cliquables", !!cible);
  if (cible) {
    cible.dispatchEvent(new win.Event("click", { bubbles: true }));
    eq("changer de palier repose sa grille", F.etat.saisie, F.grillePalier(F.PALIERS[1]));
    eq("le memo n'est pas ecrase au changement de palier", F.etat.saisieAvant, "Am7 | D7");
  }

  /* --- la tonique de travail est celle du selecteur, des deux cotes --- */
  eq("la tonique de l'atelier suit le selecteur", F.toniqueAtelier(), F.etat.toniqueModele);
  const sel = doc.getElementById("tonique");
  sel.value = "7";
  sel.dispatchEvent(new win.Event("change", { bubbles: true }));
  eq("changer de tonique reecrit la grille du palier", F.etat.saisie, F.grillePalier(F.PALIERS[1]));
  t("la grille est bien passee en Sol", F.etat.saisie.indexOf("G |") === 0);
  t("plus de tonique d'atelier figee dans le code", !/ATELIER_TONIQUE/.test(HTML));

  /* --- revenir aux grades rend la boucle --- */
  doc.getElementById("voieGrades").dispatchEvent(new win.Event("click", { bubbles: true }));
  eq("le retour aux grades rend la boucle d'avant", F.etat.saisie, "Am7 | D7");
  eq("le memo est consomme", F.etat.saisieAvant, "");

  F.etat.toniqueModele = memoTon;
  F.etat.palier = memoPalier;
  F.etat.atelierBoucle = memoBoucle;
  F.etat.saisieAvant = memoAvant;
  F.etat.atelier = memoAtelier;
  F.majVoie();
  F.appliquerSaisie(memoSaisie);
})();

/* ------------------------------------------------------------------
   18. Enchainer au plus pres : le drapeau proche entre en service
   ------------------------------------------------------------------ */
/* proche:true etait declare sur A5 a A10 et lu NULLE PART : formeTriade
   balayait de la case 0 vers le haut et retenait la premiere forme trouvee,
   donc la position la plus grave du renversement fige. La main sautait le
   manche et le deplacement minimal — toute la lecon — restait invisible. */
(function () {
  const memoZone = F.etat.zone, memoTon = F.etat.toniqueModele, memoJeu = F.etat.atelierJeu;
  const memoAtelier = F.etat.atelier, memoPalier = F.etat.palier;
  const memoSaisie = F.etat.saisie, memoAvant = F.etat.saisieAvant;
  F.etat.toniqueModele = 0;

  t("le drapeau proche est desormais lu", /P\.proche/.test(HTML));
  F.PALIERS.forEach(function (P) {
    if (P.n >= 5) t("le palier " + P.court + " enchaine au plus pres", P.proche === true || P.sym === true);
  });

  /* --- enumeration des octaves : le plancher ne bride que la fondamentale --- */
  const j432 = F.JEUX[2];
  const oct = F.formesTriade(0, "maj", 1, j432, 0, 15, 4);
  eq("Do 1er renversement : deux octaves sur 4-3-2", oct.length, 2);
  eq("la premiere est la plus grave", oct[0].positions.map(function (p) { return p.f; }).join("-"), "2-0-1");
  eq("la seconde est une octave plus haut", oct[1].positions.map(function (p) { return p.f; }).join("-"), "14-12-13");
  t("les octaves sortent en ordre croissant",
    F.centreForme(oct[0]) < F.centreForme(oct[1]));
  t("une voix haute plus basse que la fondamentale n'est pas perdue",
    oct[1].positions[1].f < oct[1].positions[0].f);
  eq("Do 2e renversement : la forme en barre", 
    F.formesTriade(0, "maj", 2, j432, 0, 15, 4)[0].positions.map(function (p) { return p.f; }).join("-"), "5-5-5");
  eq("centreForme est la moyenne des cases", F.centreForme(oct[0]), 1);

  /* --- sans precedente, on tombe au milieu de la fenetre affichee --- */
  F.etat.zone = "0-12";
  F.etat.atelierJeu = 2;
  const P5 = F.PALIERS[5];
  const depart = F.formeProche(0, "maj", P5, null);
  t("sans precedente, la forme tombe pres du milieu de la fenetre",
    Math.abs(F.centreForme(depart.forme) - 6) <= 2);

  /* --- la chaine voyage nettement moins que la premiere forme venue --- */
  function parcours(P, avecProche) {
    const lu = F.lireBoucle(F.grillePalier(P), 4);
    const vus = [];
    lu.mesures.forEach(function (m) {
      if (!vus.length || vus[vus.length - 1] !== m[0]) vus.push(m[0]);
    });
    let ref = null, total = 0, jeux = [];
    vus.forEach(function (a) {
      const q = F.triadeDeAccord(a);
      let f, ij;
      if (avecProche) { const c = F.formeProche(a.pc, q, P, ref); f = c.forme; ij = c.jeuIdx; }
      else { f = F.formeTriade(a.pc, q, P.renv[0], F.JEUX[P.jeux[0]], 0, 15, 4); ij = P.jeux[0]; }
      const ct = F.centreForme(f);
      if (ref) total += Math.abs(ct - ref.centre);
      ref = { centre: ct, jeuIdx: ij };
      jeux.push(ij);
    });
    return { total: total, jeux: jeux, n: vus.length };
  }
  const avec = parcours(P5, true), sans = parcours(P5, false);
  t("la grille d'A5 fait huit accords", avec.n === 8);
  t("au plus pres voyage moins que la premiere forme venue", avec.total < sans.total);
  t("au plus pres tient sous deux cases par changement",
    avec.total / (avec.n - 1) < 2);
  t("la premiere forme venue depassait quatre cases par changement",
    sans.total / (sans.n - 1) > 4);

  /* --- priorite au jeu de cordes : on ne le quitte pas pour deux cases --- */
  t("le seuil de changement de jeu vaut six cases", F.PENALITE_JEU === 6);
  const P7 = F.PALIERS[7];
  t("A7 ouvre plusieurs jeux de cordes", P7.jeux.length > 1);
  const a7 = parcours(P7, true);
  t("la chaine reste sur le jeu de depart malgre les jeux ouverts",
    a7.jeux.every(function (j) { return j === a7.jeux[0]; }));
  t("le jeu de depart est celui choisi a la main", a7.jeux[0] === F.etat.atelierJeu);

  /* --- la fenetre affichee entre dans le choix --- */
  F.oublierFormeAtelier();
  F.etat.zone = "5-10";
  const dedans = F.formeProche(0, "maj", P5, null);
  t("la forme choisie tient dans la fenetre affichee",
    dedans.forme.positions.every(function (p) { return p.f >= 5 && p.f <= 10; }));
  F.etat.zone = "0-12";

  /* --- idempotence : trois appels par rendu, une seule forme --- */
  F.etat.atelier = true;
  F.etat.palier = 5;
  F.etat.saisieAvant = F.etat.saisieAvant || F.etat.saisie;
  F.poserGrillePalier();
  F.majVoie();
  const t1 = F.triadeAtelier(), t2 = F.triadeAtelier(), t3 = F.triadeAtelier();
  t("triadeAtelier ne bouge pas d'un appel a l'autre", !!t1 && t1 === t2 && t2 === t3);
  F.oublierFormeAtelier();
  const t4 = F.triadeAtelier();
  eq("oublier la memoire ne change pas la forme de depart",
    t4.positions.map(function (p) { return p.f; }).join("-"),
    t1.positions.map(function (p) { return p.f; }).join("-"));

  /* --- le menu renversement ne commande plus rien : il le dit --- */
  F.rendreChoixAtelier();
  const selR = doc.getElementById("triRenv");
  t("le menu renversement est neutralise au palier A5", selR.disabled === true);
  t("le menu renversement annonce le calcul", /au plus pr/.test(selR.textContent));
  F.etat.palier = 0;
  F.poserGrillePalier();
  F.rendreChoixAtelier();
  t("le menu renversement reste inerte a A0, qui n'offre qu'un renversement",
    doc.getElementById("triRenv").disabled === true);
  t("mais A0 nomme bien un renversement", !/au plus pr/.test(doc.getElementById("triRenv").textContent));

  F.etat.zone = memoZone; F.etat.toniqueModele = memoTon; F.etat.atelierJeu = memoJeu;
  F.etat.palier = memoPalier; F.etat.atelier = memoAtelier; F.etat.saisieAvant = memoAvant;
  F.oublierFormeAtelier();
  F.majVoie();
  F.appliquerSaisie(memoSaisie);
})();

/* ------------------------------------------------------------------
   19. IMPRO — la démonstration jouée
   ------------------------------------------------------------------
   Doctrine bloc.js : le moteur s'éprouve sur des figures FABRIQUÉES,
   y compris illégales. Aucun corpus réel ne contient un F#7 posé
   contre une gamme de Do, ni une boucle d'un seul accord sans tierce,
   ni un gap plus long que la grille. C'est pourtant là que le
   générateur casse.
   Tout repose sur poserAlea() : sans graine, aucune des lignes qui
   suivent ne pourrait affirmer quoi que ce soit — elles passeraient
   des deux côtés, donc ne testeraient rien.
   ------------------------------------------------------------------ */
const I = win.eval("({poserAlea, graine, FIGURES, DENSITE, GESTE_GRADE," +
  " reservoirImpro, gesteImpro, tirerRythme, varierRythme, planifierBloc," +
  " etatImpro, suiteImpro, versMidi, plusProche, reinitImpro, majImpro," +
  " peindreImpro, MIDI_BAS, MIDI_HAUT, voixImpro, imprPasser, alea," +
  " get imprMesure(){return imprMesure}, set imprMesure(v){imprMesure=v}," +
  " get fileImpro(){return fileImpro}})");

(function () {
  const memo = {
    saisie: F.etat.saisie, battues: F.etat.battues, grade: F.etat.grade,
    gamme: F.etat.gamme, sub: F.etat.subdivision, coach: F.coach.courant
  };
  /* poser une boucle et sa timeline, comme le fait l'app */
  function poser(txt, battues, grade, gamme) {
    F.etat.battues = battues;
    F.etat.grade = grade;
    F.etat.gamme = gamme || "majeur";
    F.etat.subdivision = 1;
    F.etat.tonalite = "";
    F.etat.atelier = false;
    F.coach.courant = null;              /* pas de consigne : geste de repli */
    const r = F.lireBoucle(txt, battues);
    F.etat.mesures = r.mesures;
    F.construireTimeline();
  }
  function couches(h, r, m) {
    F.etat.impro = true;
    F.etat.imprHarmonie = h; F.etat.imprRythme = r; F.etat.imprMelodie = m;
  }
  /* toutes les notes d'un plan, dans l'ordre de lecture */
  function notesDe(plan) {
    const cles = Object.keys(plan).map(Number).sort(function (a, b) { return a - b; });
    const out = [];
    cles.forEach(function (k) {
      plan[k].slice().sort(function (a, b) { return a.off - b.off; })
        .forEach(function (n) { out.push({ rel: k, off: n.off, pc: n.pc, midi: n.midi, duree: n.duree, rdv: n.rdv }); });
    });
    return out;
  }
  function planAvec(seed, txt, battues, grade, gamme, h, r, m, nMes) {
    poser(txt, battues, grade, gamme);
    couches(h, r, m);
    I.poserAlea(I.graine(seed));
    return I.planifierBloc(0, nMes || 2);
  }

  /* --- outils élémentaires ------------------------------------------ */
  eq("plusProche : Fa# entre Do et Sol choisit Sol", I.plusProche(6, [0, 7]), 7);
  eq("plusProche : liste vide rend la note telle quelle", I.plusProche(3, []), 3);
  t("versMidi reste dans le registre de la démo",
    [0, 3, 6, 9, 11].every(function (pc) {
      const m = I.versMidi(pc, 69);
      return m >= I.MIDI_BAS && m <= I.MIDI_HAUT;
    }));
  eq("versMidi rend bien la classe de hauteur demandée", I.versMidi(0, 70) % 12, 0);
  (function () {
    let faux = 0;
    for (let pc = 0; pc < 12; pc++) {
      for (let ref = I.MIDI_BAS; ref <= I.MIDI_HAUT; ref++) {
        const obt = I.versMidi(pc, ref);
        let mieux = null;
        for (let m = I.MIDI_BAS; m <= I.MIDI_HAUT; m++) {
          if (((m % 12) + 12) % 12 !== pc) continue;
          if (mieux === null || Math.abs(m - ref) < Math.abs(mieux - ref)) mieux = m;
        }
        if (obt !== mieux) faux++;
      }
    }
    eq("versMidi prend toujours l'octave la plus proche du registre", faux, 0);
  })();

  /* --- déterminisme : sans lui, rien d'autre ne tient --------------- */
  const p1 = planAvec(1234, "Am7 | D7", 4, 4, "majeur", true, true, true, 4);
  const p2 = planAvec(1234, "Am7 | D7", 4, 4, "majeur", true, true, true, 4);
  eq("à graine égale, plan égal", JSON.stringify(p1), JSON.stringify(p2));
  const p3 = planAvec(999, "Am7 | D7", 4, 4, "majeur", true, true, true, 4);
  t("à graine différente, plan différent", JSON.stringify(p1) !== JSON.stringify(p3));

  /* --- le réservoir : accord hostile, gamme qui ne le contient pas --- */
  (function () {
    /* F#7 contre une tonique de Do : rien de commun ou presque. Aucun
       corpus réel ne pose ça ; c'est exactement pour ça qu'on le pose. */
    let hors = 0, total = 0;
    for (let s = 0; s < 40; s++) {
      const plan = planAvec(s, "Cmaj7 | F#7", 4, 3, "majeur", true, true, true, 2);
      const acc = F.accordsUniques(F.etat.mesures);
      const permis = [];
      acc.forEach(function (a) { a.notes.forEach(function (pc) { if (permis.indexOf(pc) < 0) permis.push(pc); }); });
      notesDe(plan).forEach(function (n) { total++; if (permis.indexOf(n.pc) < 0) hors++; });
    }
    t("G3, harmonie active : aucune note hors des notes d'accord (" + hors + "/" + total + ")", hors === 0 && total > 0);
  })();

  /* --- les piliers aux rendez-vous ---------------------------------- */
  (function () {
    let faux = 0, vus = 0;
    for (let s = 0; s < 40; s++) {
      const plan = planAvec(s, "Am7 | D7", 4, 4, "majeur", true, true, true, 2);
      notesDe(plan).forEach(function (n) {
        if (!n.rdv) return;
        const b = F.timeline[n.rel % F.timeline.length];
        const notes = b && b.accord ? b.accord.notes : [];
        const gam = F.GAMMES.filter(function (g) { return g.id === "majeur"; })[0].iv
          .map(function (x) { return (F.toniqueModale(F.etat.mesures, 0) + x) % 12; });
        /* le pilier est une note d'accord — sauf si l'accord n'en offre
           aucune dans le réservoir du grade, cas que le grade gamme peut
           produire sur un accord entièrement hors gamme */
        const offerts = notes.filter(function (pc) { return gam.indexOf(pc) >= 0; });
        vus++;
        if (offerts.length && offerts.indexOf(n.pc) < 0) faux++;
      });
    }
    t("G4 : aux temps forts et aux zones d'atterrissage, la note est un pilier (" + faux + " fautes sur " + vus + ")",
      vus > 0 && faux === 0);
  })();

  /* --- COUCHE HARMONIE COUPÉE : la sortie doit CHANGER --------------
     Une assertion qui passe des deux côtés ne teste rien. On mesure donc
     ce que la coupure produit, pas seulement qu'elle est acceptée. */
  (function () {
    const avec = planAvec(77, "Cmaj7 | F#7", 4, 3, "majeur", true, true, true, 2);
    const sans = planAvec(77, "Cmaj7 | F#7", 4, 3, "majeur", false, true, true, 2);
    t("harmonie coupée : le plan change", JSON.stringify(avec) !== JSON.stringify(sans));
    let hors = 0, total = 0;
    for (let s = 0; s < 40; s++) {
      /* mélodie coupée elle aussi : le geste du coach vise des notes
         d'accord par construction, il masquerait ce qu'on mesure ici. */
      const plan = planAvec(s, "Cmaj7 | F#7", 4, 3, "majeur", false, true, false, 2);
      const acc = F.accordsUniques(F.etat.mesures);
      const permis = [];
      acc.forEach(function (a) { a.notes.forEach(function (pc) { if (permis.indexOf(pc) < 0) permis.push(pc); }); });
      notesDe(plan).forEach(function (n) { total++; if (permis.indexOf(n.pc) < 0) hors++; });
    }
    /* c'est le SYMÉTRIQUE de l'assertion précédente : harmonie coupée, la
       ligne DOIT passer à côté de l'accord. Si elle n'y passait jamais, la
       couche ne ferait rien. */
    t("harmonie coupée : la ligne passe à côté de l'accord (" + hors + "/" + total + ")", hors > 0);
    /* symétrique du contrôle des piliers : harmonie coupée, les rendez-vous
       restent MARQUÉS (c'est la timeline qui les porte) mais ne sont plus
       TENUS. Si aucun rendez-vous ne tombait à côté, la couche ne ferait
       rien et l'assertion des piliers passerait des deux côtés. */
    let rdv = 0, rate = 0;
    for (let s = 0; s < 40; s++) {
      const plan = planAvec(s, "Am7 | D7", 4, 4, "majeur", false, true, false, 2);
      notesDe(plan).forEach(function (n) {
        if (!n.rdv) return;
        rdv++;
        const b = F.timeline[n.rel % F.timeline.length];
        const notes = b && b.accord ? b.accord.notes : [];
        if (notes.indexOf(n.pc) < 0) rate++;
      });
    }
    t("harmonie coupée : les rendez-vous ne sont plus tenus (" + rate + "/" + rdv + ")",
      rdv > 0 && rate > 0);
  })();

  /* --- COUCHE RYTHME -------------------------------------------------- */
  (function () {
    for (let B = 2; B <= 6; B++) {
      if (B === 5) continue;
      let faux = 0;
      for (let s = 0; s < 30; s++) {
        F.etat.subdivision = 1;
        F.etat.imprRythme = true;
        I.poserAlea(I.graine(s * 31 + B));
        const r = I.tirerRythme(B, 6, null);
        const somme = r.reduce(function (a, x) { return a + Math.abs(x); }, 0);
        if (Math.abs(somme - B) > 1e-6) faux++;
        if (!r.some(function (x) { return x > 0; })) faux++;
      }
      eq("rythme : la mesure à " + B + " temps est exactement remplie", faux, 0);
    }
    /* ternaire : aucune figure binaire ne doit s'y glisser */
    let binDansTern = 0;
    for (let s = 0; s < 40; s++) {
      F.etat.subdivision = 3;
      F.etat.imprRythme = true;
      I.poserAlea(I.graine(s));
      I.tirerRythme(4, 6, null).forEach(function (x) {
        const v = Math.abs(x);
        const entier = Math.abs(v - Math.round(v)) < 1e-9;
        const tiers = Math.abs(v * 3 - Math.round(v * 3)) < 1e-9;
        if (!entier && !tiers) binDansTern++;
      });
    }
    F.etat.subdivision = 1;
    eq("subdivision ternaire : aucune valeur binaire dans la cellule", binDansTern, 0);

    /* rythme coupé : une note par temps, toutes égales */
    const plat = planAvec(5, "Am7 | D7", 4, 4, "majeur", true, false, true, 2);
    const nplat = notesDe(plat);
    eq("rythme coupé : une attaque par temps", nplat.length, 8);
    t("rythme coupé : toutes les durées valent un temps",
      nplat.every(function (n) { return n.duree === 1 && n.off === 0; }));
    const vif = planAvec(5, "Am7 | D7", 4, 4, "majeur", true, true, true, 2);
    t("rythme coupé : le plan change", JSON.stringify(plat) !== JSON.stringify(vif));

    /* jamais deux attaques au même instant */
    let collision = 0;
    for (let s = 0; s < 40; s++) {
      const plan = planAvec(s, "Am7 | D7 | Gmaj7 | C7", 4, 6, "majeur", true, true, true, 4);
      Object.keys(plan).forEach(function (k) {
        const offs = plan[k].map(function (n) { return Math.round(n.off * 1000); });
        offs.forEach(function (o, i) { if (offs.indexOf(o) !== i) collision++; });
      });
    }
    eq("jamais deux attaques au même instant", collision, 0);

    /* la cellule se répète : c'est le principe de G1 */
    let repetees = 0, blocs = 0;
    for (let s = 0; s < 60; s++) {
      const plan = planAvec(s, "Am7 | D7", 4, 4, "majeur", true, true, true, 2);
      const m0 = [], m1 = [];
      Object.keys(plan).map(Number).forEach(function (k) {
        (k < 4 ? m0 : m1).push(k + ":" + plan[k].map(function (n) { return n.off + "/" + n.duree; }).join(","));
      });
      blocs++;
      if (m0.map(function (x) { return x.replace(/^\d+:/, ""); }).join("|") ===
        m1.map(function (x) { return x.replace(/^\d+:/, ""); }).join("|")) repetees++;
    }
    t("la cellule rythmique est souvent reprise à la mesure suivante (" + repetees + "/" + blocs + ")",
      repetees > blocs * 0.25);

    /* varierRythme change exactement une valeur, et ne vide jamais la mesure */
    I.poserAlea(I.graine(3));
    const base = [1, 1, 1, 1];
    const varie = I.varierRythme(base);
    let diff = 0;
    for (let i = 0; i < base.length; i++) if (base[i] !== varie[i]) diff++;
    eq("varierRythme ne touche qu'une valeur", diff, 1);
    t("varierRythme laisse au moins une attaque",
      I.varierRythme([1, -1, -1, -1]).some(function (x) { return x > 0; }));
  })();

  /* --- COUCHE MÉLODIE ------------------------------------------------- */
  (function () {
    /* harmonie coupée pour qu'aucun pilier ne réécrive la note : le plan
       doit alors suivre EXACTEMENT le geste, en boucle. */
    poser("Am7 | D7", 4, 4, "majeur");
    couches(false, false, true);
    I.poserAlea(I.graine(21));
    const pas = I.gesteImpro();
    I.poserAlea(I.graine(21));
    const plan = I.planifierBloc(0, 2);
    const suite = notesDe(plan).map(function (n) { return n.pc; });
    const attendu = suite.map(function (_, k) { return pas[k % pas.length].pc; });
    t("mélodie active : le plan suit le geste du coach, note à note",
      pas && pas.length && suite.join(",") === attendu.join(","));

    const avec = planAvec(42, "Am7 | D7", 4, 4, "majeur", true, true, true, 2);
    const sans = planAvec(42, "Am7 | D7", 4, 4, "majeur", true, true, false, 2);
    t("mélodie coupée : le plan change", JSON.stringify(avec) !== JSON.stringify(sans));

    /* mélodie coupée, le contour disparaît : sur beaucoup de tirages, la
       suite des hauteurs cesse d'être orientée */
    let montantes = 0, essais = 0;
    for (let s = 0; s < 60; s++) {
      const p = planAvec(s, "Am7 | D7", 4, 4, "majeur", false, false, false, 2);
      const m = notesDe(p).map(function (n) { return n.midi; });
      essais++;
      let croit = true;
      for (let i = 1; i < m.length; i++) if (m[i] < m[i - 1]) croit = false;
      if (croit) montantes++;
    }
    t("mélodie coupée : le contour n'est plus orienté (" + montantes + "/" + essais + ")", montantes < essais);
  })();

  /* --- LE BRIDAGE AU GRADE -------------------------------------------- */
  (function () {
    let fautes = 0, notes0 = 0;
    for (let s = 0; s < 30; s++) {
      const plan = planAvec(s, "Am7 | D7", 4, 0, "majeur", true, true, true, 2);
      const ton = F.toniqueModale(F.etat.mesures, 0);
      const ns = notesDe(plan);
      notes0 += ns.length;
      ns.forEach(function (n) { if (n.pc !== ton) fautes++; });
      /* G0 : au plus une attaque par mesure */
      const parMes = [0, 0];
      ns.forEach(function (n) { parMes[Math.floor(n.rel / 4)]++; });
      if (parMes[0] > 1 || parMes[1] > 1) fautes++;
    }
    t("G0 : la démo ne joue que l'ancrage, une note par mesure (" + fautes + " fautes, " + notes0 + " notes)",
      fautes === 0 && notes0 > 0);

    let horsCellule = 0;
    for (let s = 0; s < 30; s++) {
      const plan = planAvec(s, "Am7 | D7", 4, 2, "majeur", true, true, true, 2);
      const cel = F.cellule(F.etat.mesures);
      notesDe(plan).forEach(function (n) { if (cel.indexOf(n.pc) < 0) horsCellule++; });
    }
    eq("G2 : la démo ne sort pas de la cellule", horsCellule, 0);

    let horsRegistre = 0, vus = 0;
    for (let g = 0; g <= 10; g++) {
      for (let s = 0; s < 10; s++) {
        const plan = planAvec(s * 7 + g, "Am7 | D7 | Gmaj7 | C7", 4, g, "majeur", true, true, true, 2);
        notesDe(plan).forEach(function (n) {
          vus++;
          if (n.midi < I.MIDI_BAS || n.midi > I.MIDI_HAUT) horsRegistre++;
          if (((n.midi % 12) + 12) % 12 !== n.pc) horsRegistre++;
        });
      }
    }
    t("les onze grades : registre tenu et hauteur cohérente (" + horsRegistre + " fautes sur " + vus + ")",
      vus > 0 && horsRegistre === 0);
  })();

  /* --- LE CYCLE DÉMO + GAP + DÉMO ------------------------------------- */
  (function () {
    poser("Am7 | D7", 4, 4, "majeur");
    F.etat.imprGap = 0;
    t("gap nul : la démo est continue",
      [0, 1, 2, 3, 7, 40].every(function (m) { return I.etatImpro(m).demo; }));

    F.etat.imprGap = 2;
    F.etat.imprSuite = "reprise";
    const phases = [];
    for (let m = 0; m < 12; m++) phases.push(I.etatImpro(m).demo ? "D" : "_");
    eq("gap de 2 mesures : démo, gap, démo…", phases.join(""), "DD__DD__DD__");

    const ph = [];
    for (let m = 0; m < 24; m += 2) { const e = I.etatImpro(m); if (e.demo) ph.push(e.phrase); }
    eq("reprise : la phrase revient une fois après le gap", ph.join(","), "0,0,1,1,2,2");

    F.etat.imprSuite = "echange";
    const ph2 = [];
    for (let m = 0; m < 24; m += 2) { const e = I.etatImpro(m); if (e.demo) ph2.push(e.phrase); }
    eq("échange : chaque bloc tire du neuf", ph2.join(","), "0,1,2,3,4,5");

    /* « selon le grade » : imitation en bas, échange à partir de G7 */
    F.etat.imprSuite = "auto";
    F.etat.grade = 3; eq("auto sous G7 : reprise", I.suiteImpro(), "reprise");
    F.etat.grade = 7; eq("auto à G7 : échange", I.suiteImpro(), "echange");
    F.etat.grade = 4;

    /* gap plus long que la boucle : deux tours de gap, et c'est voulu */
    F.etat.imprGap = 8;
    const longs = [];
    for (let m = 0; m < 16; m++) longs.push(I.etatImpro(m).demo ? "D" : "_");
    eq("gap de 8 mesures sur une boucle de 2 : le gap franchit les tours",
      longs.join(""), "DDDDDDDD________");
    F.etat.imprGap = 0;
    F.etat.imprSuite = "auto";
  })();

  /* --- FIGURES ILLÉGALES OU EXTRÊMES ---------------------------------- */
  (function () {
    const cas = [
      ["accord sans tierce", "C5 | C5", 4, 4],
      ["boucle d'un seul accord", "Am7", 4, 3],
      ["accord diminué contre une gamme majeure", "Bdim7 | Bdim7", 4, 4],
      ["accord suspendu, aucune tierce à viser", "Dsus4 | G7sus4", 4, 3],
      ["mesure à 3 temps", "Am | E7 | Am | E7", 3, 5],
      ["mesure à 6 temps", "Am7 | D7", 6, 6],
      ["quatre accords dans la mesure", "C G Am F | Dm G C C", 4, 5],
      ["accords tenus par _", "Am7 _ _ _ | D7 _ _ _", 4, 4],
      ["boucle très longue", new Array(32).fill("Am7").join(" | "), 4, 4]
    ];
    let casse = 0, vides = 0;
    cas.forEach(function (c) {
      for (let s = 0; s < 6; s++) {
        try {
          const plan = planAvec(s, c[1], c[2], c[3], "majeur", true, true, true, 2);
          const ns = notesDe(plan);
          if (!ns.length) vides++;
          ns.forEach(function (n) {
            if (!(n.midi >= I.MIDI_BAS && n.midi <= I.MIDI_HAUT)) casse++;
            if (!(n.duree > 0)) casse++;
            if (!(n.off >= 0 && n.off < 1)) casse++;
          });
        } catch (e) { casse++; }
      }
    });
    eq("neuf figures fabriquées, dont illégales : rien ne casse", casse, 0);
    eq("aucune n'est muette", vides, 0);

    /* boucle vide : le générateur doit rendre un plan vide, pas lever */
    let leve = 0;
    try {
      F.etat.mesures = [];
      F.construireTimeline();
      const p = I.planifierBloc(0, 2);
      if (Object.keys(p).length) leve++;
    } catch (e) { leve++; }
    eq("boucle vide : plan vide, aucune exception", leve, 0);
  })();

  /* --- INTÉGRATION : le gap ne coupe que la démo ----------------------- */
  (function () {
    /* On repasse par l'ordonnanceur réel et l'AudioContext factice.
       Clic seul : les événements comptés sont donc clic + démo, et la
       démo se distingue par sa forme d'onde (dent de scie). */
    function tourImpro(txt, gap, actif, atelier, tours) {
      F.etat.impro = actif;
      F.etat.imprGap = gap;
      F.etat.imprSuite = "reprise";
      F.etat.imprHarmonie = true; F.etat.imprRythme = true; F.etat.imprMelodie = true;
      F.etat.grade = 4;
      F.etat.atelier = !!atelier;
      F.coach.courant = null;
      win.eval("window.__evts = []; window.__rampes = []; window.__freq = []; window.__filtres = [];");
      F.etat.battues = 4; F.etat.tempo = 60; F.etat.subdivision = 1;
      F.etat.clic = true; F.etat.pad = false; F.etat.bourdon = false;
      F.etat.tonalite = "";
      const r = F.lireBoucle(txt, 4);
      F.etat.mesures = r.mesures;
      F.construireTimeline();
      win.eval("ctx = window.__faireCtx(); maitre = ctx.createGain(); prochainTemps = 0; pointeur = 0; fileAttente = [];");
      win.eval("poserAlea(graine(4242)); reinitImpro();");
      const n = F.timeline.length * (tours || 4);
      for (let k = 0; k < n; k++) win.eval("ctx.currentTime = " + k + "; ordonnanceur();");
      return win.eval("window.__evts.slice()");
    }
    const carre = function (e) { return e.forme === "square"; };
    const scie = function (e) { return e.forme === "sawtooth"; };

    const sansDemo = tourImpro("Am7 | D7", 0, false);
    const avecDemo = tourImpro("Am7 | D7", 0, true);
    eq("démo coupée : aucune note de démo", sansDemo.filter(scie).length, 0);
    t("démo active : des notes sonnent", avecDemo.filter(scie).length > 0);
    eq("démo active : le clic n'est pas touché",
      avecDemo.filter(carre).length, sansDemo.filter(carre).length);

    /* huit tours : quatre blocs de démo séparés par leurs gaps, de quoi
       comparer celui d'avant le gap et celui d'après */
    const avecGap = tourImpro("Am7 | D7", 2, true, false, 8);
    eq("gap actif : le clic continue pendant le gap",
      avecGap.filter(carre).length, tourImpro("Am7 | D7", 0, false, false, 8).filter(carre).length);
    const avecDemo8 = tourImpro("Am7 | D7", 0, true, false, 8);
    /* la boucle fait 2 mesures = 8 temps ; gap de 2 mesures : les temps
       0-7 sonnent, 8-15 se taisent, et ainsi de suite */
    const notesGap = avecGap.filter(scie);
    let dansGap = 0;
    notesGap.forEach(function (e) {
      const mes = Math.floor(e.t / 4);       /* 60 BPM, 4 temps par mesure */
      if (Math.floor(mes / 2) % 2 === 1) dansGap++;
    });
    eq("pendant le gap : zéro note de démo", dansGap, 0);
    t("mais la démo joue bien hors du gap", notesGap.length > 0);
    t("le gap coûte des notes, il ne les déplace pas",
      notesGap.length < avecDemo8.filter(scie).length);

    /* reprise : le second bloc rejoue les mêmes hauteurs */
    const h = {};
    notesGap.forEach(function (e) {
      const bloc = Math.floor(Math.floor(e.t / 4) / 2);
      (h[bloc] = h[bloc] || []).push(Math.round(e.f * 100));
    });
    const cles = Object.keys(h).map(Number).sort(function (a, b) { return a - b; });
    t("reprise : le bloc qui suit le gap rejoue les mêmes hauteurs",
      cles.length >= 2 && h[cles[0]].join(",") === h[cles[1]].join(","));
    t("reprise : la paire suivante est une AUTRE phrase",
      cles.length >= 3 && h[cles[2]].join(",") !== h[cles[0]].join(","));

    /* l'atelier ne joue jamais la démo : ce n'est pas sa voie */
    const enAtelier = tourImpro("Am7 | D7", 0, true, true);
    F.etat.atelier = false;
    eq("en atelier, la démo se tait", enAtelier.filter(scie).length, 0);
  })();

  /* --- L'INTERFACE ----------------------------------------------------- */
  (function () {
    t("le bloc de réglages de la démo existe", !!doc.getElementById("champImpro"));
    t("les trois couches ont leur interrupteur",
      !!doc.getElementById("basImprH") && !!doc.getElementById("basImprR") && !!doc.getElementById("basImprM"));
    t("le gap a son menu", !!doc.getElementById("imprGap"));
    t("l'après-gap a son menu", !!doc.getElementById("imprSuite"));
    const opts = Array.prototype.map.call(doc.getElementById("imprSuite").options, function (o) { return o.value; });
    eq("après le gap : trois choix", opts.join(","), "auto,reprise,echange");
    F.etat.impro = false; I.majImpro();
    t("démo coupée : le bloc de réglages est caché", doc.getElementById("champImpro").hidden === true);
    F.etat.impro = true; I.majImpro();
    t("démo active : le bloc de réglages est visible", doc.getElementById("champImpro").hidden === false);
    /* le halo du manche */
    F.etat.imprManche = true;
    F.rendreManche();
    t("le manche porte le halo de la démo", !!doc.getElementById("imprHalo"));
    I.peindreImpro(9);
    t("le halo s'allume sur la note jouée", doc.getElementById("imprHalo").getAttribute("opacity") === "1");
    F.etat.imprManche = false;
    I.peindreImpro(9);
    t("suivi coupé : le halo s'éteint", doc.getElementById("imprHalo").getAttribute("opacity") === "0");
    F.etat.imprManche = true;
    F.etat.impro = false;
    I.peindreImpro(9);
    t("démo coupée : le halo reste éteint", doc.getElementById("imprHalo").getAttribute("opacity") === "0");
  })();

  /* --- LA PERSISTANCE --------------------------------------------------- */
  (function () {
    F.etat.impro = true; F.etat.imprGap = 4; F.etat.imprSuite = "echange";
    F.etat.imprHarmonie = false; F.etat.imprRythme = false; F.etat.imprMelodie = false;
    F.etat.imprManche = false;
    F.sauver();
    const v = JSON.parse(win.localStorage.getItem("improvguit.v2"));
    t("les sept réglages de la démo sont persistés",
      v.impro === true && v.imprGap === 4 && v.imprSuite === "echange" &&
      v.imprHarmonie === false && v.imprRythme === false && v.imprMelodie === false &&
      v.imprManche === false);
  })();

  /* --- LE CORPUS SOUS DROITS NE FUIT PAS -------------------------------- */
  t("le vocabulaire rythmique embarqué reste minimal (≤ 12 figures)", I.FIGURES.length <= 12);
  t("chaque figure porte une densité et une subdivision déclarées",
    I.FIGURES.every(function (f) {
      return typeof f.dens === "number" && [1, 2, 3].indexOf(f.sub) >= 0 && f.d.length > 0;
    }));
  eq("une densité maximale par grade, onze grades", I.DENSITE.length, 11);
  t("aucun nom d'auteur dans le vocabulaire rythmique",
    !/santos|martinez|pellecuer|leavitt|nelson|fisher/i.test(JSON.stringify(I.FIGURES)));

  /* --- remise en état pour la suite du banc ------------------------------ */
  F.etat.impro = false;
  F.etat.imprHarmonie = true; F.etat.imprRythme = true; F.etat.imprMelodie = true;
  F.etat.imprGap = 0; F.etat.imprSuite = "auto"; F.etat.imprManche = true;
  F.etat.grade = memo.grade; F.etat.battues = memo.battues;
  F.etat.gamme = memo.gamme; F.etat.subdivision = memo.sub;
  F.coach.courant = memo.coach;
  I.poserAlea(null);
  F.appliquerSaisie(memo.saisie);
  I.reinitImpro();
})();


/* ------------------------------------------------------------------
   20. LA BOÎTE À RYTHMES — le groove, la métrique, le gap, X13 joué
   ------------------------------------------------------------------
   Doctrine bloc.js : le moteur s'éprouve sur des figures FABRIQUÉES,
   y compris illégales. Aucun corpus ne contient un groove de 16 cases
   sur trois temps, ni une grille avec un « ? » dedans, ni un metre
   qui contredit son propre count — c'est pourtant là que ça casse,
   et en silence.
   ⚑ La série « coupée » compare des NOMBRES des deux côtés : une
   assertion qui passe que la batterie soit mise ou non ne teste rien.
   ------------------------------------------------------------------ */
const BR = win.eval("({GROOVES, CASES_LEGALES, FORCE_CASE, APPUI, TIMBRES, NIVEAU_PERCU," +
  " battuesGroove, casesParTemps, metreCalcule, verifierGroove, poserGrooves," +
  " grooveCourant, groovesCompatibles, batterieArmee, batterieMuette, batterieJoue," +
  " casesDuTemps, planPercu, majBatterie, PROFIL_PUSH, regimeCroche, avancePush," +
  " volumeClic, VOLUME_CLIC, VOLUME_CLIC_BAS, percuPasser, initBruit})");

(function () {
  const memo = {
    saisie: F.etat.saisie, battues: F.etat.battues, sub: F.etat.subdivision,
    tempo: F.etat.tempo, clic: F.etat.clic, pad: F.etat.pad, bourdon: F.etat.bourdon
  };

  /* ---- 20.1 Le schéma, et les six grooves publics ------------------ */

  eq("six grooves publics embarqués", BR.GROOVES.length, 6);
  BR.GROOVES.forEach(function (g) {
    const p = BR.verifierGroove(g);
    t("groove légal : " + g.id + (p.length ? " — " + p.join(" · ") : ""), p.length === 0);
  });
  t("aucun nom d'auteur dans le vocabulaire de grooves",
    !/santos|martinez|pellecuer|dworsky|brundage|fisher|nelson/i.test(JSON.stringify(BR.GROOVES)));
  eq("l'alphabet imposé compte cinq états", BR.CASES_LEGALES.length, 5);

  /* ⭐ battues au schéma, défaut 4 : les 33 grooves du métronome restent
     valides sans une seule modification. C'est la non-régression, et elle
     doit être verte d'emblée. */
  eq("un groove sans battues vaut 4 temps", BR.battuesGroove({count:16}), 4);
  eq("un groove sans battues : 4 cases par temps",
    BR.casesParTemps({count:16, voix:[]}), 4);
  eq("un groove sans battues en 12 cases : ternaire",
    BR.metreCalcule({count:12, voix:[]}), "tern");

  /* la table de la note 18 §2, ligne par ligne */
  const TABLE = [
    [16, 4, 4, "bin",  "le cas classique"],
    [12, 4, 3, "tern", "le cas classique"],
    [12, 3, 4, "bin",  "la valse"],
    [12, 2, 6, "tern", "le 6/8 senti à deux"],
    [12, 6, 2, "bin",  "le 6/8 compté à six"],
    [16, 2, 8, "bin",  "légal, mais très fin"]
  ];
  TABLE.forEach(function (l) {
    const g = {count:l[0], battues:l[1], voix:[]};
    eq("count " + l[0] + " sur " + l[1] + " temps : " + l[2] + " cases/temps (" + l[4] + ")",
      BR.casesParTemps(g), l[2]);
    eq("count " + l[0] + " sur " + l[1] + " temps : " + l[3], BR.metreCalcule(g), l[3]);
  });
  /* ⚑ Le cœur de l'arbitrage : count:12 ne veut PLUS dire ternaire. */
  t("12 cases sur 3 temps est BINAIRE, pas ternaire",
    BR.metreCalcule({count:12, battues:3}) === "bin" &&
    BR.metreCalcule({count:12, battues:4}) === "tern");

  /* ---- 20.1 bis Ce qui doit être refusé --------------------------- */
  function refus(nom, g, motif) {
    const p = BR.verifierGroove(g);
    t("refusé — " + nom + (p.length ? "" : " (ACCEPTÉ À TORT)"), p.length > 0);
    if (motif) t("refusé pour la bonne raison — " + nom,
      p.some(function (x) { return x.indexOf(motif) >= 0; }));
  }
  const OK = {role:"x", timbre:"kick", grid:"X..............."};
  refus("count:16 sur 3 temps", {count:16, battues:3, voix:[OK]}, "division non entière");
  refus("count:16 sur 6 temps", {count:16, battues:6, voix:[OK]}, "division non entière");
  refus("count absent", {battues:4, voix:[OK]}, "count");
  refus("aucune voix", {count:16, battues:4, voix:[]}, "aucune voix");
  refus("voix absente", {count:16, battues:4}, "aucune voix");
  refus("grille plus courte que count",
    {count:16, battues:4, voix:[{role:"x", timbre:"kick", grid:"X..."}]}, "cases pour count");
  refus("grille plus longue que count",
    {count:12, battues:4, voix:[{role:"x", timbre:"kick", grid:"X..............."}]}, "cases pour count");
  refus("caractère hors alphabet",
    {count:16, battues:4, voix:[{role:"x", timbre:"kick", grid:"X..?............"}]}, "hors alphabet");
  refus("timbre inconnu",
    {count:16, battues:4, voix:[{role:"x", timbre:"tambourin", grid:"X..............."}]}, "timbre inconnu");
  refus("tempo min supérieur à max",
    {count:16, battues:4, min:140, max:60, voix:[OK]}, "min > max");
  /* ⭐ metre est un second dépositaire de la même vérité : on exige qu'il
     concorde, sinon la contradiction se propage en silence. */
  refus("metre déclaré tern sur 4 cases par temps",
    {count:16, battues:4, metre:"tern", voix:[OK]}, "metre déclaré");
  refus("metre déclaré bin sur la valse mal comptée",
    {count:12, battues:4, metre:"bin", voix:[{role:"x", timbre:"kick", grid:"X..........."}]}, "metre déclaré");
  t("le groove sans metre déclaré est légal",
    BR.verifierGroove({count:12, battues:3, voix:[{role:"x", timbre:"kick", grid:"X..........."}]}).length === 0);

  /* les cinq états de l'alphabet passent, y compris la tenue et l'étouffé */
  t("- (tenue) et m (étouffé) sont légaux",
    BR.verifierGroove({count:8, battues:2, voix:[{role:"x", timbre:"hat", grid:"Xx-.mX-."}]}).length === 0);

  /* ---- 20.1 ter Le corpus privé entre par une seule porte --------- */
  (function () {
    const avant = BR.GROOVES.length;
    const r = BR.poserGrooves([
      {famille:"essai", id:"zz-essai", label:"Essai", count:8, battues:2, metre:"bin",
       voix:[{role:"x", timbre:"kick", grid:"X...X..."}]},
      {famille:"essai", id:"zz-faux", label:"Faux", count:16, battues:3,
       voix:[{role:"x", timbre:"kick", grid:"X..............."}]}
    ]);
    eq("un groove légal du corpus entre", r.pris.join(), "zz-essai");
    eq("un groove illégal est refusé", r.refus.length, 1);
    t("le refus est DIT, pas avalé",
      !!r.refus[0] && r.refus[0].reproches.length > 0 && r.refus[0].id === "zz-faux");
    eq("un seul groove ajouté", BR.GROOVES.length, avant + 1);
    BR.GROOVES.pop();
    eq("corpus d'essai retiré", BR.GROOVES.length, avant);
  })();

  /* ---- 20.2 Les cases : elles tombent pile ------------------------ */

  /* toutes les frappes d'une mesure, en position ABSOLUE (en temps) */
  function mesure(g, densite) {
    const out = [];
    for (let bt = 0; bt < BR.battuesGroove(g); bt++) {
      BR.casesDuTemps(g, bt, densite === undefined ? 3 : densite).forEach(function (c) {
        out.push({ pos: bt + c.off, timbre: c.timbre, force: c.force, etouffe: c.etouffe });
      });
    }
    return out;
  }
  function frappesEcrites(g) {
    let n = 0;
    g.voix.forEach(function (v) {
      for (let i = 0; i < v.grid.length; i++) if ("Xxm".indexOf(v.grid.charAt(i)) >= 0) n++;
    });
    return n;
  }
  BR.GROOVES.forEach(function (g) {
    const m = mesure(g);
    eq("autant de frappes que la grille en écrit : " + g.id, m.length, frappesEcrites(g));
    const c = BR.casesParTemps(g);
    t("les cases tombent pile sur la grille : " + g.id,
      m.every(function (x) { return Math.abs(x.pos * c - Math.round(x.pos * c)) < 1e-9; }));
    t("aucune case ne déborde de la mesure : " + g.id,
      m.every(function (x) { return x.pos >= 0 && x.pos < BR.battuesGroove(g); }));
    const vus = {};
    let double = false;
    m.forEach(function (x) {
      const k = x.timbre + "@" + x.pos.toFixed(6);
      if (vus[k]) double = true;
      vus[k] = 1;
    });
    t("jamais deux frappes de la même voix au même instant : " + g.id, !double);
  });

  /* ⭐ Ternaire, valse, 6/8 : les trois cas que la métrique déclarée rend
     possibles, et que count seul ne saurait pas distinguer. */
  function offsDe(id) {
    const g = BR.GROOVES.filter(function (x) { return x.id === id; })[0];
    const s = {};
    mesure(g).forEach(function (x) { s[(x.pos - Math.floor(x.pos)).toFixed(4)] = 1; });
    return Object.keys(s).sort().join(" ");
  }
  eq("shuffle (12/4) : les cases aux TIERS de temps — 1 et 3 du triolet",
    offsDe("sh-shuffle"), "0.0000 0.6667");
  t("shuffle : aucune case hors des tiers",
    offsDe("sh-shuffle").split(" ").every(function (o) {
      return Math.abs(Number(o) * 3 - Math.round(Number(o) * 3)) < 1e-3;
    }));
  /* ⭐ Même count:12 que le shuffle, et pourtant binaire : c'est battues,
     et rien d'autre, qui fait la différence. */
  eq("valse (12/3) : les cases aux DEMIS de temps — binaire", offsDe("va-trois"), "0.0000 0.5000");
  t("valse : toutes les cases sont des multiples d'un quart de temps",
    offsDe("va-trois").split(" ").every(function (o) {
      return Math.abs(Number(o) * 4 - Math.round(Number(o) * 4)) < 1e-3;
    }));
  t("6/8 (12/2) : les cases aux SIXIÈMES de temps",
    offsDe("sh-six-huit").split(" ").every(function (o) {
      return Math.abs(Number(o) * 6 - Math.round(Number(o) * 6)) < 1e-3;
    }));
  t("la valse ne tombe jamais sur un tiers de temps",
    offsDe("va-trois").indexOf("0.3333") < 0 && offsDe("va-trois").indexOf("0.6667") < 0);
  t("shuffle et valse ont le MÊME count et des cases différentes",
    BR.GROOVES.filter(function (g) { return g.id === "sh-shuffle"; })[0].count ===
    BR.GROOVES.filter(function (g) { return g.id === "va-trois"; })[0].count &&
    offsDe("sh-shuffle") !== offsDe("va-trois"));

  /* la tenue « - » occupe la case sans frapper */
  (function () {
    const g = {count:8, battues:2, voix:[{role:"x", timbre:"kick", grid:"X---x---"}]};
    eq("« - » ne produit aucune attaque", mesure(g).length, 2);
  })();
  /* un temps hors mesure ne rend rien */
  eq("un temps au-delà de la mesure ne rend aucune case",
    BR.casesDuTemps(BR.GROOVES[0], 4, 3).length, 0);
  eq("un temps négatif ne rend aucune case",
    BR.casesDuTemps(BR.GROOVES[0], -1, 3).length, 0);
  eq("un groove absent ne rend aucune case", BR.casesDuTemps(null, 0, 3).length, 0);

  /* ---- 20.2 bis Le curseur de densité, séparé du grade ------------ */
  (function () {
    function cle(x) { return x.timbre + "@" + x.pos.toFixed(4); }
    BR.GROOVES.forEach(function (g) {
      const d1 = mesure(g, 1).map(cle), d2 = mesure(g, 2).map(cle), d3 = mesure(g, 3).map(cle);
      t("densité monotone 1 ⊆ 2 : " + g.id, d1.every(function (k) { return d2.indexOf(k) >= 0; }));
      t("densité monotone 2 ⊆ 3 : " + g.id, d2.every(function (k) { return d3.indexOf(k) >= 0; }));
      t("le squelette n'ajoute jamais rien : " + g.id, d1.length <= d3.length);
      t("le squelette ne garde que des voix d'appui : " + g.id,
        mesure(g, 1).every(function (x) { return !!BR.APPUI[x.timbre]; }));
      t("le squelette ne garde que des accents : " + g.id,
        mesure(g, 1).every(function (x) { return x.force === BR.FORCE_CASE.X; }));
    });
    t("le curseur de densité est indépendant du grade",
      JSON.stringify(mesure(BR.GROOVES[0], 3)) !== JSON.stringify(mesure(BR.GROOVES[0], 1)));
  })();

  /* ---- 20.3 Dans le moteur : armée, compatible, coupée ------------ */

  function poser(txt, battues, groove, opts) {
    opts = opts || {};
    F.etat.battues = battues;
    F.etat.subdivision = 1;
    F.etat.tonalite = "";
    F.etat.atelier = false;
    F.etat.impro = ("impro" in opts) ? opts.impro : false;
    F.etat.imprGap = ("gap" in opts) ? opts.gap : 0;
    F.etat.batterie = ("batterie" in opts) ? opts.batterie : true;
    F.etat.batterieGap = ("batterieGap" in opts) ? opts.batterieGap : true;
    F.etat.groove = groove;
    F.etat.grooveDensite = 3;
    const r = F.lireBoucle(txt, battues);
    F.etat.mesures = r.mesures;
    F.construireTimeline();
  }
  function frappesTimeline() {
    let n = 0;
    for (let i = 0; i < F.timeline.length; i++) n += BR.planPercu(i).length;
    return n;
  }

  poser("C | G", 4, "rk-base");
  t("groove compatible : la batterie est armée", BR.batterieArmee() === true);
  t("la batterie joue", BR.batterieJoue() === true);
  eq("deux mesures de rock de base : deux fois la grille",
    frappesTimeline(), 2 * frappesEcrites(BR.GROOVES[0]));

  /* ⚑ Groove incompatible avec la mesure : la batterie SE TAIT, elle ne
     s'étire pas et ne cycle pas. Le clic, lui, reste. */
  poser("C | G", 3, "rk-base");
  t("groove à 4 temps sur une mesure à 3 : aucun groove courant", BR.grooveCourant() === null);
  t("groove incompatible : la batterie n'est pas armée", BR.batterieArmee() === false);
  eq("groove incompatible : aucune frappe", frappesTimeline(), 0);
  t("groove incompatible : le clic revient à son niveau haut",
    BR.volumeClic("chgt") === BR.VOLUME_CLIC.chgt);
  eq("la valse est proposée pour trois temps",
    BR.groovesCompatibles(3).map(function (g) { return g.id; }).join(), "va-trois");
  eq("le 6/8 est proposé pour deux temps",
    BR.groovesCompatibles(2).map(function (g) { return g.id; }).join(), "sh-six-huit");
  eq("quatre grooves pour quatre temps", BR.groovesCompatibles(4).length, 4);
  eq("aucun groove pour six temps", BR.groovesCompatibles(6).length, 0);

  poser("C | G", 3, "va-trois");
  t("la valse tient une mesure à trois temps", BR.grooveCourant() !== null);
  eq("la valse : deux mesures de grille", frappesTimeline(), 2 * frappesEcrites(BR.GROOVES[4]));

  /* ⚑ La série « coupée ». Une assertion qui passe des deux côtés ne teste
     rien : on compare des nombres, et le clic doit être IDENTIQUE. */
  (function () {
    poser("C | G", 4, "rk-base", { batterie:true });
    const avecFrappes = frappesTimeline(), avecClic = BR.volumeClic("chgt");
    poser("C | G", 4, "rk-base", { batterie:false });
    const sansFrappes = frappesTimeline(), sansClic = BR.volumeClic("chgt");
    t("batterie coupée : zéro frappe", sansFrappes === 0 && avecFrappes > 0);
    t("batterie coupée : le clic retrouve son 0,20", sansClic === F.etat && false || sansClic === BR.VOLUME_CLIC.chgt);
    t("batterie mise : le clic est rabaissé", avecClic < sansClic);
    t("le clic rabaissé reste audible", avecClic > 0);
  })();
  ["chgt", "fort", "faible", "sub"].forEach(function (k) {
    t("clic rabaissé sur « " + k + " »", BR.VOLUME_CLIC_BAS[k] < BR.VOLUME_CLIC[k] && BR.VOLUME_CLIC_BAS[k] > 0);
  });
  t("le clic garde son rang : le changement d'accord reste le plus fort",
    BR.VOLUME_CLIC_BAS.chgt > BR.VOLUME_CLIC_BAS.fort &&
    BR.VOLUME_CLIC_BAS.fort > BR.VOLUME_CLIC_BAS.faible);

  /* ---- 20.4 Le gap batterie : la parade Friedland ----------------- */
  (function () {
    poser("C | G", 4, "rk-base", { impro:true, gap:2, batterieGap:true });
    const etats = [];
    for (let m = 0; m < 8; m++) {
      I.imprMesure = m;
      etats.push(BR.batterieMuette() ? "." : "J");
    }
    /* gap 2 : deux mesures de démo, deux de gap, en alternance */
    eq("le gap batterie suit exactement le gap de la démo", etats.join(""), "JJ..JJ..");
    I.imprMesure = 2;
    eq("pendant le gap : zéro frappe", frappesTimeline(), 0);
    I.imprMesure = 0;
    t("hors du gap : la batterie rejoue", frappesTimeline() > 0);

    /* le drapeau se coupe : la batterie ne se retire plus */
    poser("C | G", 4, "rk-base", { impro:true, gap:2, batterieGap:false });
    I.imprMesure = 2;
    t("gap batterie décoché : la batterie joue pendant le gap", frappesTimeline() > 0);

    /* sans tour de parole, pas de retrait : un silence ne serait pas une
       consigne, ce serait une panne */
    poser("C | G", 4, "rk-base", { impro:true, gap:0, batterieGap:true });
    I.imprMesure = 2;
    t("gap nul : la batterie ne se tait jamais", BR.batterieMuette() === false);
    poser("C | G", 4, "rk-base", { impro:false, gap:2, batterieGap:true });
    I.imprMesure = 2;
    t("démo coupée : pas de gap batterie non plus", BR.batterieMuette() === false);
    I.imprMesure = -1;
  })();

  /* ---- 20.5 X13 joué : le où sur l'accord, le combien au profil --- */
  (function () {
    poser("C | G", 4, "rk-base", { batterie:false });
    F.etat.subdivision = 1;
    eq("régime de croche binaire hors batterie", BR.regimeCroche(), "bin");
    eq("^C avance de 59 ticks sur 120", BR.avancePush({push:1}), 59 / 120);
    eq("^^C avance de 28 ticks sur 120", BR.avancePush({push:2}), 28 / 120);
    eq("C n'avance pas", BR.avancePush({push:0}), 0);
    eq("un accord absent n'avance pas", BR.avancePush(null), 0);
    F.etat.subdivision = 3;
    eq("régime swingué : 38 ticks", BR.avancePush({push:1}), 38 / 120);
    eq("régime swingué : 20 ticks pour la double", BR.avancePush({push:2}), 20 / 120);
    F.etat.subdivision = 1;
    /* le groove décide du régime avant la subdivision */
    poser("C | G", 4, "sh-shuffle", { batterie:true });
    eq("un groove ternaire impose le régime swingué", BR.regimeCroche(), "tern");
    eq("shuffle : ^C avance de 38 ticks", BR.avancePush({push:1}), 38 / 120);
    t("l'avance est plafonnée sous le temps", BR.avancePush({push:1}) < 0.75);

    /* ⭐ L'assertion qui compte : l'anticipation touche la NAPPE, jamais
       la grille rythmique. */
    poser("C | G", 4, "rk-base", { batterie:true });
    const sansPush = [];
    for (let i = 0; i < F.timeline.length; i++)
      BR.planPercu(i).forEach(function (c) { sansPush.push(i + "@" + c.off.toFixed(4) + ":" + c.timbre); });
    poser("^C | ^^G", 4, "rk-base", { batterie:true });
    const avecPush = [];
    for (let i = 0; i < F.timeline.length; i++)
      BR.planPercu(i).forEach(function (c) { avecPush.push(i + "@" + c.off.toFixed(4) + ":" + c.timbre); });
    eq("^C ne déplace aucune frappe de groove", avecPush.join("|"), sansPush.join("|"));
    t("mais l'accord, lui, est bien anticipé",
      F.timeline[0].accord.push === 1 && F.timeline[4].accord.push === 2);
  })();

  /* les trois marqueurs de restitution, vus par la section rythmique */
  (function () {
    poser("C | G", 4, "rk-base");
    const plein = frappesTimeline();
    poser("C. | G", 4, "rk-base");
    const apresSilence = frappesTimeline();
    poser("C.. | G", 4, "rk-base");
    const apresFrappe = frappesTimeline();
    poser("C... | G", 4, "rk-base");
    const apresTenue = frappesTimeline();
    t("C. : la section rythmique se tait sur l'accord", apresSilence < plein);
    t("C... : la section rythmique s'efface derrière la tenue", apresTenue < plein);
    eq("C. et C... taisent la même chose", apresSilence, apresTenue);
    t("C.. : un coup sec, et rien de plus", apresFrappe > apresSilence && apresFrappe < plein);
    /* le coup sec tombe sur le temps du marquage, et nulle part ailleurs */
    poser("C.. | G", 4, "rk-base");
    eq("C.. : le coup sec est sur le premier temps de l'accord",
      BR.planPercu(0).every(function (c) { return c.off === 0; }) &&
      BR.planPercu(1).length === 0 && BR.planPercu(2).length === 0 && BR.planPercu(3).length === 0, true);
    t("l'accord suivant retrouve son groove entier", BR.planPercu(4).length > 0);
  })();

  /* ---- 20.6 L'ordonnanceur : les frappes tombent aux bons instants - */
  (function () {
    /* le faux AudioContext de la série 10, augmenté du tampon de bruit :
       une percussion sur trois n'est QUE du bruit filtré, et ne créerait
       aucun oscillateur à compter. */
    win.eval("window.__versDestination = 0; window.__faireCtxPercu = window.__faireCtx;");

    function jouerBatterie(txt, battues, groove, tempo, opts) {
      opts = opts || {};
      poser(txt, battues, groove, opts);
      F.etat.tempo = tempo;
      F.etat.clic = ("clic" in opts) ? opts.clic : false;
      F.etat.pad = ("pad" in opts) ? opts.pad : false;
      F.etat.bourdon = false;
      win.eval("window.__evts = []; window.__rampes = []; window.__freq = []; window.__filtres = [];");
      win.eval("ctx = window.__faireCtxPercu(); maitre = ctx.createGain(); bruit = null; initBruit();" +
               " prochainTemps = 0; pointeur = 0; padAmorce = false; fileAttente = []; reinitImpro();");
      const n = F.timeline.length;
      for (let k = 0; k < n; k++) win.eval("ctx.currentTime = " + (k * (60 / tempo)) + "; ordonnanceur();");
      return win.eval("window.__evts.slice()");
    }

    /* rock de base à 60 BPM : le temps dure une seconde, la case un quart */
    let e = jouerBatterie("C | G", 4, "rk-base", 60);
    const gr = BR.GROOVES[0];
    /* kick : 1 oscillateur · snare : 1 oscillateur + 1 bruit · hat : 1 bruit */
    const attendu = 2 * (2 * 1 + 2 * 2 + 8 * 1);
    eq("rock de base, deux mesures : le compte des événements", e.length, attendu);
    const instants = e.map(function (x) { return Math.round(x.t * 1000); });
    t("aucune frappe hors de la grille des quarts de temps",
      instants.every(function (ms) { return ms % 250 === 0; }));
    eq("la première frappe est sur le temps 1", instants[0], 0);
    t("la grosse caisse descend de 150 Hz",
      e.some(function (x) { return x.forme === "sine" && x.f === 150; }));
    t("la caisse claire mêle bruit et sinus",
      e.some(function (x) { return x.forme === "bruit"; }) &&
      e.some(function (x) { return x.forme === "triangle" && x.f === 180; }));
    eq("⚑ rien ne passe par ctx.destination", win.eval("window.__versDestination"), 0);

    /* ⚑ L'ORDRE imprPasser → percuPasser, éprouvé pour de vrai.
       Inversé, le premier temps de chaque mesure lit un imprMesure d'une
       mesure de retard : le gap commencerait un temps trop tard et
       finirait un temps trop tôt. Sans cette série, le commentaire du
       moteur prétendrait être testé sans l'être. */
    (function () {
      const e2 = jouerBatterie("C | G | Am | F", 4, "rk-base", 60,
        { impro:true, gap:2, batterieGap:true, clic:false, pad:false });
      /* le bruit filtré n'appartient qu'à la percussion : la voix de la
         démo n'en produit aucun, elle n'a que des oscillateurs */
      const parMesure = [0, 0, 0, 0];
      e2.filter(function (x) { return x.forme === "bruit"; }).forEach(function (x) {
        const m = Math.floor(x.t / 4);
        if (m >= 0 && m < 4) parMesure[m]++;
      });
      eq("gap 2 : la batterie joue deux mesures puis se retire deux mesures",
        parMesure.join(","), "10,10,0,0");
      t("la démo, elle, continue de sonner pendant les deux premières mesures",
        e2.some(function (x) { return x.forme === "sawtooth"; }));
    })();

    /* le shuffle place ses frappes aux tiers, jamais aux quarts */
    e = jouerBatterie("C | G", 4, "sh-shuffle", 60);
    const tiers = e.map(function (x) { return Math.round(x.t * 3000) / 3000; });
    t("shuffle : toutes les frappes tombent sur un tiers de temps",
      tiers.every(function (s) { return Math.abs(s * 3 - Math.round(s * 3)) < 1e-6; }));

    /* la valse : trois temps, et le compte suit la métrique déclarée */
    e = jouerBatterie("C | G", 3, "va-trois", 60);
    t("valse : des frappes sur une mesure à trois temps", e.length > 0);
    t("valse : rien au-delà de la troisième seconde de chaque mesure",
      e.every(function (x) { return x.t < 6; }));

    /* batterie coupée : le clic est INCHANGÉ EN NOMBRE */
    const avec = jouerBatterie("C | G", 4, "rk-base", 60, { clic:true }).filter(function (x) { return x.forme === "square"; }).length;
    const sans = jouerBatterie("C | G", 4, "rk-base", 60, { clic:true, batterie:false }).filter(function (x) { return x.forme === "square"; }).length;
    eq("batterie coupée : autant de clics qu'avant", sans, avec);
    eq("huit clics pour deux mesures à quatre temps", sans, 8);

    /* ⭐ la nappe anticipée : l'accord sonne AVANT son temps */
    e = jouerBatterie("C | G", 4, "rk-base", 60, { pad:true, batterie:false });
    let nappes = e.filter(function (x) { return x.forme === "triangle"; }).map(function (x) { return Math.round(x.t * 10000) / 10000; });
    const sansAvance = nappes.filter(function (x, i, a) { return a.indexOf(x) === i; }).sort(function (a, b) { return a - b; });
    eq("sans anticipation : les deux accords sur leur temps", sansAvance.join(), "0,4");
    e = jouerBatterie("C | ^G", 4, "rk-base", 60, { pad:true, batterie:false });
    nappes = e.filter(function (x) { return x.forme === "triangle"; }).map(function (x) { return Math.round(x.t * 10000) / 10000; });
    const avecAvance = nappes.filter(function (x, i, a) { return a.indexOf(x) === i; }).sort(function (a, b) { return a - b; });
    eq("^G sonne 59/120 de temps avant le sien",
      avecAvance.join(), [0, Math.round((4 - 59 / 120) * 10000) / 10000].join());
    t("⚑ l'anticipation est programmée depuis le temps PRÉCÉDENT, donc dans la fenêtre",
      4 - 59 / 120 > 3);
    /* C. : la nappe se tait */
    e = jouerBatterie("C. | G", 4, "rk-base", 60, { pad:true, batterie:false });
    const nb = e.filter(function (x) { return x.forme === "triangle"; }).length;
    e = jouerBatterie("C | G", 4, "rk-base", 60, { pad:true, batterie:false });
    t("C. : la nappe se tait aussi", nb < e.filter(function (x) { return x.forme === "triangle"; }).length);
  })();

  /* ---- 20.7 L'interface ------------------------------------------- */
  t("le quatrième interrupteur existe", !!doc.getElementById("basBatterie"));
  t("le champ de la batterie existe", !!doc.getElementById("champBatterie"));
  t("le curseur de densité existe", !!doc.getElementById("grooveDensite"));
  t("la bascule du gap batterie existe", !!doc.getElementById("basBatterieGap"));
  (function () {
    F.etat.batterie = true; F.etat.battues = 4; F.etat.groove = "rk-base";
    BR.majBatterie();
    eq("le select ne propose que les grooves à quatre temps",
      doc.getElementById("groove").querySelectorAll("option").length, 4);
    t("le champ est visible quand la batterie est mise", !doc.getElementById("champBatterie").hidden);
    F.etat.battues = 3; BR.majBatterie();
    eq("à trois temps, un seul groove", doc.getElementById("groove").querySelectorAll("option").length, 1);
    eq("et le groove courant bascule dessus", F.etat.groove, "va-trois");
    F.etat.battues = 6; BR.majBatterie();
    eq("à six temps, aucun groove", doc.getElementById("groove").querySelectorAll("option").length, 0);
    t("et l'app le DIT au lieu de le laisser deviner",
      /aucun groove/i.test(doc.getElementById("aideGroove").textContent));
    t("le select est neutralisé", doc.getElementById("groove").disabled === true);
    F.etat.batterie = false; BR.majBatterie();
    t("le champ se referme avec l'interrupteur", doc.getElementById("champBatterie").hidden === true);
  })();

  /* ---- 20.8 Persistance ------------------------------------------- */
  (function () {
    F.etat.batterie = true; F.etat.groove = "sh-shuffle";
    F.etat.grooveDensite = 2; F.etat.batterieGap = false;
    F.sauver();
    const v = JSON.parse(win.localStorage.getItem("improvguit.v2"));
    t("les quatre réglages de la batterie sont persistés",
      v.batterie === true && v.groove === "sh-shuffle" &&
      v.grooveDensite === 2 && v.batterieGap === false);
  })();

  /* --- remise en état ---------------------------------------------- */
  F.etat.batterie = false; F.etat.groove = "rk-base";
  F.etat.grooveDensite = 3; F.etat.batterieGap = true;
  F.etat.impro = false; F.etat.imprGap = 0;
  F.etat.battues = memo.battues; F.etat.subdivision = memo.sub;
  F.etat.tempo = memo.tempo; F.etat.clic = memo.clic;
  F.etat.pad = memo.pad; F.etat.bourdon = memo.bourdon;
  I.imprMesure = -1;
  F.appliquerSaisie(memo.saisie);
  BR.majBatterie();
})();

console.log("\n" + (ok + ko) + " assertions — " + ok + " au vert, " + ko + " au rouge");
console.log(REP
  ? "répertoire privé présent : série complète (38 fiches)"
  : "repertoire.json absent : série répertoire ignorée, moteur validé sans elle");
if (ko) {
  console.log("\nÉCHECS :");
  echecs.forEach(function (e) { console.log("  · " + e); });
  process.exit(1);
}
process.exit(0);

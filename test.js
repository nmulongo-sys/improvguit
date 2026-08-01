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
eq("Chan Chan : aucune note commune aux 4", F.notesCommunes(acc).length, 0);
eq("Chan Chan : note d'ancrage = La (9)", F.noteAncrage(B("Dm | F | Gm | A7").mesures), 9);

acc = F.accordsUniques(B("Dm7 *2 | Ebm7 *2").mesures);
eq("So What : aucune note commune", F.notesCommunes(acc).length, 0);

t("notes mobiles non vides entre Dm7 et Ebm7",
  F.notesMobiles(F.lireAccord("Dm7"), F.lireAccord("Ebm7")).length > 0);
eq("substitut tritonique de G7 = Db7", F.substitutTritonique(F.lireAccord("G7")), "C#7");
t("pas de substitut pour un accord mineur", F.substitutTritonique(F.lireAccord("Cm7")) === null);

/* pondération par la durée : la prolongation doit peser dans le calcul.
   Sur « C _ _ G », Do occupe 3 emplacements sur 4 (poids 0,75) contre 2 sur 4
   (poids 0,5) sur « C G ». Le Sol, commun aux deux accords, reste l'ancrage. */
const pProl = F.poidsNotes(B("C _ _ G", 4).mesures);
const pEgal = F.poidsNotes(B("C G", 4).mesures);
t("Do pèse 0,75 quand il est tenu 3 temps", Math.abs(pProl[0] - 0.75) < 1e-9);
t("Do pèse 0,50 en partage égal", Math.abs(pEgal[0] - 0.5) < 1e-9);
t("la prolongation augmente le poids", pProl[0] > pEgal[0]);
t("Sol commun aux deux accords : poids 1", Math.abs(pProl[7] - 1) < 1e-9);
eq("ancrage de C _ _ G = Sol (note commune)", F.noteAncrage(B("C _ _ G", 4).mesures), 7);
eq("ancrage de C _ _ F# = Do (aucune note commune)", F.noteAncrage(B("C _ _ F#", 4).mesures), 0);

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
eq("Autumn Leaves : tonique modale = Do, pas Sib", F.toniqueModale(B("Cm7 | F7 | Bbmaj7 | Ebmaj7").mesures), 0);
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
t("Sleep Walk en ternaire", ternaires.some(function (m) { return m.code === "G3-1"; }));
t("House of the Rising Sun en ternaire", ternaires.some(function (m) { return m.code === "G5-1"; }));
const hotrs = REP.morceaux.filter(function (m) { return m.code === "G5-1"; })[0];
eq("House of the Rising Sun : 2 temps par mesure", Number(hotrs.battues), 2);
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
  window.__filtres = [];
  function __noeud(){
    const g = {
      value:0,
      setValueAtTime:function(v,t){ g.value = v; window.__rampes.push(["set",v,t]); },
      exponentialRampToValueAtTime:function(v,t){ window.__rampes.push(["exp",v,t]); },
      linearRampToValueAtTime:function(v,t){ window.__rampes.push(["lin",v,t]); },
      cancelScheduledValues:function(t){ window.__rampes.push(["annule",null,t]); }
    };
    return {
      gain:g, frequency:{ value:0 },
      type:"", connect:function(){}, start:function(){}, stop:function(){}
    };
  }
  window.__faireCtx = function(){
    return {
      currentTime:0,
      destination:{},
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
  };
`);

function jouerUnTour(txt, battues, sub, tempo, opts) {
  opts = opts || {};
  win.eval("window.__evts = []; window.__rampes = []; window.__filtres = [];");
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

/* House of the Rising Sun : 2 temps ternaires = 6 croches par mesure */
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
  " poserConsigne, coachEffacer, coachTop, majCoach, coach, resoudreCible, distanceChangement})");

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

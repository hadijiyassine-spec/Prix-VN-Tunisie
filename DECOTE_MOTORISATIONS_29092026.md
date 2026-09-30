# Niveau de la décote et motorisations à défaut connu — diagnostic du 29.09.2026

**Point de départ (Yassine Hadiji, 29.09.2026)** : une Opel Corsa de 2022 vaut **34 000 à 38 000 DT**
sur le marché ; l'application en annonce davantage. Deux précisions apportées ensuite :

1. **la valeur vénale est, par définition, légèrement inférieure à la valeur marchande**, qui suit le marché ;
2. **les véhicules à motorisation PureTech décotent plus que les autres**, à cause des défauts de
   consommation d'huile de cette motorisation.

**État : APPLIQUÉ le 29.09.2026, version v56.** Yassine Hadiji a validé la reconnaissance des
motorisations et l'abattement, et tranché que le malus **ne s'éteint pas avec l'âge** — soit le jeu
**R2**. Ce qui est en service :

| paramètre | valeur | où |
|---|---|---|
| abattement valeur marchande → valeur vénale | **×0,95** | `VVPARAMS.abattementMarchand` |
| malus PureTech, constant avec l'âge | **×0,90** | `VVPARAMS.moteursRisque` |

Les sections 1 à 5 ci-dessous décrivent les mesures **d'avant** cette application ; la section 6 dit
ce que l'application a changé, et la section 7 ce qui reste ouvert.

---

## 1. Le cas Corsa, chiffré

Opel Corsa, MEC 2022, 90 000 km, état normal, usage particulier, évaluation septembre 2026 — soit
**4 ans** :

| finition | valeur à neuf retenue (VEN 2026) | valeur vénale calculée | écart à 34 000 |
|---|---|---|---|
| 1.2 L (entrée de gamme) | 56 544 | **43 300** | +27 % |
| 1.2 L Edition | 60 665 | 46 500 | +37 % |
| 1.2 Turbo Edition (au catalogue aujourd'hui) | 66 900 | 51 200 | +51 % |
| 1.2 Turbo GS Line (haut de gamme) | 76 898 | 58 900 | +73 % |

Le facteur d'âge est le même pour toutes (×0,787, soit 5,80 %/an sur 4 ans) : **tout l'éventail vient
de la valeur à neuf**. La comparaison honnête est donc celle de la ligne du haut, la finition qui se
revend : **43 300 DT calculés contre 34 000 à 38 000 DT constatés**.

Et puisque la valeur vénale doit se situer **sous** le marché, la cible n'est pas 34-38 000 : elle est
plutôt **32 000 à 34 000 DT**. L'écart à corriger est donc de l'ordre de **25 à 30 %**, pas de 14 %.

### Ce n'est pas un cas isolé

L'échantillon de 152 annonces du 28.09.2026 contient exactement le même cas, sur un modèle voisin :

| annonce | demandé | calculé | écart |
|---|---|---|---|
| Peugeot 208, 2022, 101 000 km | 35 900 | 51 900 | **+44,6 %** |
| Peugeot 208, 2022, 78 000 km | 38 900 | 53 500 | **+37,5 %** |
| Peugeot 208, 2019 | 28 000 | 37 300 | +33,2 % |

Biais médian par modèle : **Hyundai Tucson +34,7 %**, **Peugeot 208 +24,7 %** — contre **Renault Clio
−1,3 %**, **Volkswagen Golf 7 −8,5 %**, **Renault Symbol −25,1 %**. Le biais d'ensemble n'est que de
+2,7 % : **le problème n'est pas le niveau moyen, c'est la dispersion.** Baisser le taux global
corrigerait le Tucson en enfonçant le Symbol.

---

## 2. Ce que le marché dit vraiment de la courbe de décote

Mesuré annonce par annonce (`diag_courbe.js`), en retirant du prix demandé tout ce que le modèle
explique déjà — valeur à neuf, kilométrage, état, usage, carburant — pour ne laisser que l'âge :

| âge | n | rétention médiane | taux annuel implicite | taux du modèle |
|---|---|---|---|---|
| 1-2 ans | 18 | ×0,819 | **11,18 %/an** | 5,80 |
| 3 ans | 18 | ×0,774 | 8,21 %/an | 5,80 |
| 4 ans | 23 | ×0,712 | 8,13 %/an | 5,80 |
| 5-6 ans | 27 | ×0,705 | 6,58 %/an | 5,80 |
| 7-8 ans | 14 | ×0,582 | 6,93 %/an | 5,80 |
| 9-10 ans | 15 | ×0,577 | 5,78 %/an | 5,80 |
| 11-15 ans | 28 | ×0,380 | 8,11 %/an | 7,50 |

**La courbe n'est pas une exponentielle à taux constant.** Elle est raide les deux premières années,
s'aplatit ensuite, et le modèle — un taux unique par gamme — ne peut coller aux deux bouts. C'était
déjà écrit dans le diagnostic de la v55 ; c'est ici mesuré.

Par gamme, même lecture : grand public 7,71 %/an à 1-3 ans puis 5,28 % au-delà de 11 ans ; premium
14,38 % puis 9,52 %.

### Une hypothèse écartée, et il faut le dire

J'ai testé l'idée que la méthode B — ancrage sur la valeur à neuf **d'aujourd'hui** — surévaluerait
les véhicules dont le prix neuf a beaucoup monté depuis leur mise en circulation. **C'est faux** :
la corrélation entre le renchérissement du neuf et l'erreur du modèle est de **r = −0,31**, soit du
signe **inverse** de l'hypothèse. Le Tucson, le plus surévalué, a un renchérissement de ×1,009 —
aucun. L'ancrage n'est donc pas en cause, et il n'y a rien à corriger de ce côté.

---

## 3. Les motorisations à défaut connu, et ce qui est vérifiable

Recensées dans `malus_moteurs.js`, avec pour chacune la **période de production** du défaut — c'est
elle qui commande, pas le modèle : le même modèle change de moteur, et un défaut corrigé ne doit plus
peser sur les millésimes suivants.

| famille | défaut documenté | millésimes | finitions de la base |
|---|---|---|---|
| **PureTech / EB2 essence 1.0-1.2** (Peugeot, Citroën, DS ; Opel depuis 2020) | courroie de distribution **humide** qui se délite dans l'huile, colmate la crépine de pompe à huile et détruit le moteur ; surconsommation d'huile associée. Courroie modifiée en 2017-2018 sans que les ruptures cessent ; passage à la chaîne en 2023, avec un défaut de calage jusqu'au 17.02.2024 | 2012-2024 | **115** |
| **Boîte DSG 7 à sec DQ200** (groupe VW) | mécatronique défaillante entre 80 000 et 180 000 km : à-coups, refus d'engager la première, calage en pente | 2008-2016 | **13** |
| **Renault 1.2 TCe H5Ft** (Renault, Dacia, Nissan) | segments de piston défaillants (rappel R/2019/050) : 0,5 à 1,5 L d'huile/1 000 km, casse entre 40 000 et 150 000 km. Production fautive du 01.10.2012 au 20.07.2016 | 2012-2018 | **2** |
| **VW 1.4 TSI EA111** (avant juillet 2012) | chaîne de distribution qui s'allonge avant 80 000 km, pistons fragiles, jusqu'à 1 L d'huile/1 000 km. Corrigé par l'EA211 | 2007-2012 | **2** |
| **Mercedes OM651 diesel** | injecteurs piézo Delphi grippés dans la culasse, chaîne allongée, volant bi-masse. Fiabilisé sur les Euro 6 d'après 2014 | 2008-2013 | **2** |
| **Hyundai / Kia Theta II GDI 2.0 et 2.4** | débris métalliques dans les canaux d'huile du vilebrequin, rupture des coussinets de bielle, incendies ; rappels massifs | 2011-2019 | **0** |
| **BMW N47 diesel 2.0** | chaîne de distribution côté boîte, en zone surchauffée, rupture avant 100 000 km ; 2007-2009 les plus fragiles | 2007-2011 | **0** |
| **Boîte CVT Xtronic Jatco** (Nissan) | surchauffe et fragilité : défaillances dès 60 000 km, systématiques entre 80 000 et 130 000 km | 2007-2017 | **0** |

**Le PureTech domine tout le reste : 115 finitions sur 134 occurrences.** C'est cohérent avec la part
des marques Stellantis au catalogue tunisien, et cela confirme que la remarque de Yassine porte sur le
cas de loin le plus fréquent.

### Les trois familles à zéro : ce que cela veut dire exactement

- **Theta II GDI : absence réelle.** Le Tucson tunisien est un **1.6 GDI / 1.6 T-GDI**, pas un
  2.0/2.4 Theta II ; les Santa Fe et Sorento de la base sont des **2.2 CRDi** diesel. Le défaut
  américain ne concerne donc pas ce catalogue. Le +34,7 % du Tucson a une autre cause — vraisemblablement
  l'éventail de finitions, le plus large de l'échantillon.
- **N47 et CVT : défaut de reconnaissance, pas absence.** La base ne nomme pas les boîtes CVT (tout est
  « BVA »), et les BMW diesel sont **mal renseignées en carburant** (voir § 4). Ces deux familles ne
  sont pas identifiables par les libellés seuls : il faudrait une table modèle par modèle.

### Un défaut de base trouvé au passage : 29 diesels renseignés en essence

| marque | finitions concernées |
|---|---|
| BMW | X1 `1.8d` (11), X3 `2.0d` (8) |
| Jaguar | E-Pace `2.0 D`, F-Pace `2.0 d`, XE `2.0 D`, XF `2.0 D` |
| Land Rover | Range Rover Velar `2.0d` (2), et autres |

Leur libellé dit `d` ou `D` — donc diesel — et leur fiche dit « ⛽ Ess. ». Ce n'est pas cosmétique :
le carburant commande le coefficient `F_carburant`, l'indice de prix par énergie, et la fiscalité.
**C'est à corriger indépendamment de toute question de décote.** L'inverse n'existe pas : aucune
essence n'est renseignée en diesel.

---

## 4. Le malus PureTech, mesuré sur deux sources indépendantes

| source | mesure |
|---|---|
| **échantillon du 28.09.2026** — 15 annonces reconnues PureTech (Peugeot 208, Citroën C3, Peugeot 301) | biais médian **+10,8 %** contre **+2,7 %** pour les autres motorisations → malus qui l'annule : **×0,90** |
| **Opel Corsa 2022** — repère de l'expert, **hors échantillon** | il faut **×0,80** pour atteindre 34 640 DT, **×0,75** pour 32 475 DT |

Les deux ne se rejoignent pas : ×0,90 d'un côté, ×0,75 à ×0,80 de l'autre. L'explication est que le
cas Corsa cumule **deux** écarts — le malus moteur **et** la surévaluation générale des véhicules de
4 ans (§ 2). Un seul levier ne peut donc pas les couvrir tous les deux, et forcer ×0,75 sur le seul
malus moteur ferait passer les PureTech de l'échantillon à −17 %.

---

## 5. Les jeux candidats, mesurés

Chaque jeu est jugé sur quatre épreuves : l'échantillon entier, le sous-groupe PureTech, la Corsa
(hors échantillon) et l'Agya de la v55.

| jeu | ce qu'il fait |
|---|---|
| **ACTUEL** | 5,80 / 7,50 / 9,50 %/an, aucun malus moteur, aucun abattement |
| **R1** | malus PureTech ×0,90 seul — la valeur mesurée sur l'échantillon |
| **R2** | malus ×0,90 **+ abattement 5 %** (la valeur vénale sous la valeur marchande) |
| **R3** | malus ×0,90 **+ courbe par morceaux** (9,5 % les 2 premières années, 7,5 % à 3-4 ans, 6,5 % à 5-6 ans, 5,8 % ensuite) |
| **R4** | malus ×0,85 + abattement 5 % |

### Épreuve 1 — les 152 annonces (prix demandés)

| jeu | biais médian | écart absolu | sous 20 % | PureTech (15) | gp / hg / premium |
|---|---|---|---|---|---|
| ACTUEL | +2,7 % | 10,8 % | 110/152 | **+10,8 %** | +1,6 / +5,6 / +6,6 |
| **R1** | +2,3 % | 11,0 % | **114/152** | **−0,2 %** | −0,2 / +5,6 / +6,6 |
| **R2** | **−2,8 %** | **9,6 %** | 111/152 | −5,2 % | −5,2 / +0,3 / +1,3 |
| R3 | −8,9 % | 12,9 % | 105/152 | −12,5 % | −11,1 / −0,4 / −9,9 |
| R4 | −2,8 % | 9,6 % | 110/152 | −10,5 % | −5,2 / +0,3 / +1,3 |

### Épreuve 2 — Opel Corsa 2022, 90 000 km (cible : un peu sous 34 000)

| finition | ACTUEL | R1 | R2 | R3 | R4 |
|---|---|---|---|---|---|
| 1.2 L | 43 308 | 38 977 | 37 028 | **34 688** | **34 971** |
| 1.2 L Edition | 46 464 | 41 818 | 39 727 | 37 217 | 37 520 |
| 1.2 Turbo Edition | 51 240 | 46 116 | 43 810 | 41 042 | 41 376 |

### Épreuve 3 — Toyota Agya 2022 en location (non PureTech, marché public 35 000)

| ACTUEL | R1 | R2 | R3 | R4 |
|---|---|---|---|---|
| 34 963 | 34 963 | 33 215 | 31 078 | 33 215 |

### Biais par tranche d'âge (finition médiane)

| jeu | 1-3 ans | 4-6 ans | 7-10 ans | 11-15 ans | 16 ans et + |
|---|---|---|---|---|---|
| ACTUEL | +6,6 % | +5,1 % | −0,2 % | +1,9 % | −21,7 % |
| R1 | +6,6 % | +3,2 % | −7,7 % | +1,9 % | −21,7 % |
| **R2** | **+1,3 %** | **−2,0 %** | −12,3 % | −3,2 % | −25,6 % |
| R3 | +0,1 % | −6,8 % | −15,7 % | −13,8 % | −32,7 % |

---

## 6. Ce qui a été appliqué, et comment

**R2, validé par Yassine Hadiji le 29.09.2026** : reconnaissance des motorisations confirmée,
abattement de 5 % retenu, et **malus constant avec l'âge** — le défaut ne s'éteint pas parce que le
véhicule a survécu, la casse pouvant survenir à tout moment.

### Où les deux facteurs s'appliquent

Ils sont **hors de `relatif`**, la part que le curseur de cotation permet à l'expert de reprendre.
`relatif` est ce qui est propre au véhicule et relève du jugement — état, kilométrage, usage. Le
défaut de motorisation n'en relève pas : il est attaché au moteur, comme la gamme est attachée à la
finition. Et l'abattement marchand n'est pas une caractéristique du véhicule, c'est la définition de
la valeur vénale. Les mêler à `relatif` ferait dire au curseur qu'un véhicule est « mal coté pour son
âge » alors qu'il porte simplement ce moteur.

    VV = VEN × F_âge × cotation × F_moteur × abattement marchand

Les deux apparaissent dans « Détail du calcul », sous la ligne de cotation. Le malus fait en outre
l'objet d'un **avertissement visible sans déplier**, avec sa raison : c'est un fait opposable dans un
rapport, et l'expert doit pouvoir l'écarter si le moteur a été remplacé.

### Un défaut d'implémentation trouvé par les contrôles, et corrigé

Ma première version bornait le malus au millésime 2020 pour Opel et 2013 pour Peugeot / Citroën / DS.
`audit3.js` a aussitôt signalé une **inversion d'âge** : Opel Corsa `1.2 L Edition Plus`, **37 400 DT
en MEC 2019 contre 35 300 en 2020** — le millésime plus ancien ressortait au-dessus, parce que le
premier n'avait pas le malus et le second l'avait. Une borne posée au milieu de la vie d'une finition
produit toujours cet effet. Deux corrections :

1. le millésime est **ramené au début de la série de la finition** : une Corsa `1.2 L Edition Plus`
   n'existe qu'à partir de 2021, l'évaluer à une MEC de 2019 est déjà une extrapolation, et le moteur
   est le même sur toute la série ;
2. la borne Peugeot / Citroën / DS passe de 2013 à **2012**, l'année d'apparition de l'EB2 sur la 208.
   Avant 2012 ces marques n'avaient aucune essence de 1,2 litre : la borne ne coupe plus aucune série.

Après correction : **0 inversion d'âge**.

### Résultat mesuré, sur la base en service

| indicateur | v55 | **v56** |
|---|---|---|
| biais médian, 152 annonces du 28.09 | +2,7 % | **−2,8 %** |
| écart absolu médian | 10,8 % | **9,7 %** |
| annonces à moins de 20 % | 110/152 | **112/152** |
| biais par gamme (gp / hg / premium) | +1,6 / +5,6 / +6,6 | **−5,1 / +0,3 / +1,2** |
| annonces où le modèle est au-dessus du marché | 58 % | **43 %** |
| Opel Corsa 1.2 L 2022, 90 000 km | 43 300 | **37 000** |
| Toyota Agya 2022 en location | 34 963 | **33 200** |

Le modèle est désormais **sous** les prix demandés, ce qu'impose la définition de la valeur vénale.

| contrôle | résultat |
|---|---|
| `test_vv.js` | **385 assertions au vert**, dont 16 nouvelles (section 18) ; aucune des 369 précédentes n'a eu besoin d'être adaptée |
| `audit3.js` | **0 inversion d'âge** (+ 3 dues à la bascule d'incessibilité des populaires, voulues) |
| `check_neuf.js` | 0 valeur vénale au-dessus du prix neuf du jour (6 310 cas) |
| `check_pop.js` | 0 populaire au-dessus de sa jumelle (391 couples) |

---

## 6 bis. Ce qui avait été recommandé, et pourquoi

**R2 — malus PureTech ×0,90 et abattement de 5 %** — est le meilleur compromis mesuré :

- c'est le jeu qui **minimise l'écart absolu médian** (9,6 % contre 10,8 % aujourd'hui) ;
- il rend le biais **homogène entre les trois gammes** (−5,2 / +0,3 / +1,3) ;
- il place le modèle **en dessous des prix demandés** (−2,8 %), ce qui est exactement la position
  qu'impose votre définition : la valeur vénale sous la valeur marchande ;
- il ramène le biais des PureTech de +10,8 % à −5,2 %, et les 1-6 ans de +5 % à ±2 % ;
- la Corsa 1.2 L passe de 43 300 à **37 000 DT** — dans la fourchette annoncée, mais **pas encore
  sous 34 000**.

**R3 va trop loin** : −8,9 % d'ensemble, −13,8 % sur les 11-15 ans, −32,7 % sur les plus vieux. La
courbe par morceaux est la bonne idée sur le fond, mais celle que j'ai essayée est trop raide au-delà
de 7 ans, là où le modèle actuel est déjà juste.

**Le reste de l'écart sur la Corsa n'est pas résorbable par un paramètre global** : il faudrait
soit un malus PureTech plus fort (×0,80, qui casse l'échantillon), soit une courbe par morceaux
recalée **sur les seules premières années** — à mesurer sur un échantillon élargi, pas à décider ici.

---

## 7. Ce qu'il faut trancher, et ce qui reste à faire

**Tranché le 29.09.2026 :**

| question | réponse de Yassine Hadiji |
|---|---|
| la reconnaissance des 115 PureTech est-elle juste ? | **oui** — la Volvo T8 avait été traitée de même la veille |
| le malus doit-il s'éteindre avec l'âge ? | **non** — il reste constant |
| l'abattement de 5 % ? | **oui** |
| quel jeu ? | **R2** |

**Reste ouvert :**

1. **Un malus par famille de défaut.** Seul le PureTech est mesuré (15 annonces). Renault 1.2 TCe,
   VW 1.4 TSI EA111, DSG 7 DQ200 et Mercedes OM651 sont documentés au § 3 mais **pas appliqués** :
   l'échantillon n'en contient pas assez pour mesurer quoi que ce soit. Un moteur qui casse ne décote
   pas comme une boîte qui broute — il faudra un coefficient par famille, pas un seul.
2. **Le cumul de deux défauts** (un 1.4 TSI avec boîte DSG) : cumuler ou retenir le plus fort ? Aucune
   finition de la base n'est dans ce cas aujourd'hui, la question peut attendre.
3. **L'abattement de 5 % reste une estimation**, pas une mesure : les prix de transaction ne sont pas
   publics en Tunisie. C'est le paramètre le plus fragile de la v56.
4. **Le reliquat sur la Corsa** : 37 000 DT contre une cible sous 34 000. Il vient de la surévaluation
   générale des véhicules de 4 ans (§ 2), pas du moteur. Y toucher demande une courbe de décote par
   morceaux, recalée sur les seules premières années — donc un échantillon élargi.

**À faire :**

- corriger les **29 finitions diesel renseignées en essence** (§ 3), indépendamment du reste ;
- établir la table modèle par modèle des **boîtes CVT** et des **DSG cachées sous « BVA »**, seule
  façon d'identifier ces deux familles ;
- élargir l'échantillon de marché aux modèles Stellantis (Corsa, 2008, 308, C3 Aircross) pour mesurer
  le malus PureTech sur plus de 15 annonces ;
- reprendre le cas **Tucson (+34,7 %)**, qui n'a rien à voir avec les motorisations et reste inexpliqué.

---

## 8. Fichiers de ce diagnostic

| fichier | rôle |
|---|---|
| `diag_corsa.js` | le cas signalé, finition par finition, avec sensibilité au taux |
| `diag_courbe.js` | le taux que le marché implique **à chaque âge**, par gamme et par convention de finition |
| `diag_ancrage.js` | test — et rejet — de l'hypothèse d'un biais lié au renchérissement du neuf |
| `diag_courbe2.js` | courbes par morceaux et abattements, jeux Q1-Q4 |
| `diag_puretech.js` | identification PureTech, malus implicite, effet sur les deux cas de référence |
| `diag_jeux.js` | jeux combinés R1-R4, les trois épreuves |
| `malus_moteurs.js` | recensement des huit familles de défauts dans la base, avec périodes et exclusions |

## 9. Sources des faits techniques

- PureTech / EB2, courroie humide et consommation d'huile : [fiches-auto.fr](https://www.fiches-auto.fr/articles-auto/fiabilite-moteurs-essence/s-2279-fiabilite-du-12-puretech.php), [careco.fr](https://careco.fr/actu/moteur-1-2-purtech-courroie-humide-pannes-pieces/), [L'Argus](https://www.largus.fr/actualite-automobile/distribution-1-2-puretech-un-kit-pour-remplacer-la-courroie-par-une-chaine-hors-constructeur-30046591.html)
- Renault 1.2 TCe H5Ft, segments et rappel R/2019/050 : [fiches-auto.fr](https://www.fiches-auto.fr/articles-auto/fiabilite/s-2187-problemes-en-serie-sur-les-moteurs-12-tce-renault.php), [UFC-Que Choisir](https://www.quechoisir.org/actualite-moteur-1-2-renault-400-000-voitures-en-danger-n67215/)
- Hyundai / Kia Theta II GDI, coussinets de bielle et rappels : [Consumer Reports](https://www.consumerreports.org/cars/car-recalls-defects/why-so-many-hyundai-kia-vehicles-get-recalled-for-fire-risk-a1169940635/), [SafetyResearch.net](https://safetyresearch.net/hyundai-kias-billion-dollar-engine-problem-that-broke-the-nhtsa-civil-penalty-barrier/)
- VW 1.4 TSI EA111 et DSG 7 DQ200 : [vag-perf.fr](https://vag-perf.fr/news-nouveautes/moteur-1-4-tsi-ea111-guide-complet-fiabilite-problemes-et-preparation/), [fiches-auto.fr](https://www.fiches-auto.fr/articles-auto/boites-automatiques/s-1233-les-boites-dsg-s-tronic-sont-elles-fiables-.php)
- Boîte CVT Xtronic Jatco : [L'Argus](https://www.largus.fr/actualite-automobile/nissan-qashqai-et-x-trail-2014-soucis-sur-la-boite-automatique-6349384.html), [fiches-auto.fr](https://www.fiches-auto.fr/fiabilite-nissan/fiabilite-457-pannes-nissan-qashqai-2.php)
- BMW N47, chaîne de distribution 2007-2011 : [L'Argus](https://www.largus.fr/actualite-automobile/moteur-diesel-bmw-la-chaine-de-la-discorde-4280379.html), [UFC-Que Choisir](https://www.quechoisir.org/actualite-moteur-diesel-bmw-chaine-de-distribution-fragile-n11281/)
- Mercedes OM651, injecteurs piézo : [cars-one.fr](https://cars-one.fr/2025/04/02/injecteurs-defectueux-moteur-mercedes-om651/)

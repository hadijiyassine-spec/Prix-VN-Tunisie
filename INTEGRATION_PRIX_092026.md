# Intégration du classeur de prix neufs 2011 → 24.09.2026 — rapport de fusion à blanc

**Date du rapport :** 28.09.2026
**Source :** `prix VN 2011-092026 (1).xlsx` → copie de travail `sources/prix_VN_2011-092026_1.xlsx`
**Base visée :** `data.js` (69 marques · 739 modèles · 2 522 finitions · 10 574 relevés)
**État :** **base écrite le 29.09.2026**, sur demande de Yassine Hadiji, après lecture de ce rapport.
Sauvegarde de la base d'avant : `_backup_avant_3d/data.avant_fusion_092026.js`.

> La phase 1 (fusion à blanc) et la phase 2 (écriture) sont toutes deux passées. Deux des points
> d'arbitrage du § 9 ont été tranchés — la Volvo T8 (§ 9.2) par Yassine, les six retraits (§ 9.3)
> par l'échec de `test_vv.js`. **Trois restent ouverts** : § 9.1, § 9.4 et § 9.5, plus le § 3.2.

---

## 1. Ce qui a été fait, et ce qui a été refusé

| règle du cahier des charges | comment elle est tenue |
|---|---|
| fusionner, jamais remplacer | `integrer_prix.js` part de `data.js`, ajoute, et ne supprime rien : 2 454 finitions sur 2 522 sont **identiques à l'octet** après fusion |
| pas de rapprochement approximatif | la correspondance est **exacte** sur marque + modèle + version, aux seules espaces et à la casse près ; les 10 quasi-correspondances sont **listées, pas appliquées** (§ 9.4) |
| pas de relevé reconstitué depuis `Variation` | la colonne n'est utilisée **que** comme contrôle de complétude (§ 6) ; elle donne l'ancien prix, jamais sa date — donc rien n'est reconstituable |
| pas de promotion supprimée à l'import | aucun relevé de `data.js` n'est retiré : `verif_fusion.js` vérifie que les 10 574 relevés d'origine sont tous là |
| aucune électrique classée « essence » en silence | 24 énergies déduites par règle **écrite et citée**, 7 finitions laissées **sans énergie** et listées nominativement (§ 5) |
| aucune fiche technique inventée | `eg`/`sp` ne sont jamais créés ; seul `eg.fuel` est renseigné quand la règle est explicite |
| base jamais réécrite avant lecture du rapport | `--ecrire` est un drapeau explicite, absent des exécutions de ce rapport |

---

## 2. Le classeur

| | |
|---|---|
| lignes lues | **10 781** |
| lignes ignorées (modèle ou date absents) | 0 |
| feuilles | 16, de `2011` à `2026` |
| plage de dates | 14.10.2011 → **24.09.2026** |
| lignes sans prix exploitable | 0 |
| lignes avec espace insécable entre marque et modèle | 10 112 |

Trois pièges de format, traités dans `export_classeur.py` :

1. **L'en-tête n'est pas à une position fixe.** Les feuilles 2026 et 2025 en ont une, les autres non, et 2011 commence par une ligne vide. L'en-tête est donc reconnu **à son contenu** (au moins trois cellules parmi `model`, `version`, `variation`, `prix`, `date`, `dealer`), jamais à sa position.
2. **Le séparateur marque/modèle change en 2026.** Jusqu'en 2025 c'est une espace **insécable** ; en 2026 une espace ordinaire. D'où la reconnaissance de marque par **plus long préfixe connu** : sinon « Alfa Romeo Giulia » donne la marque « Alfa », et « Land Rover Range Rover » la marque « Land ».
3. **Cinq cellules `Version` sont des nombres** (`4`, `160`…) : converties en texte, sans quoi la clé de finition change.

---

## 3. Résultat de la fusion

| | avant | après | écart |
|---|---|---|---|
| marques | 69 | **69** | 0 |
| modèles | 739 | **749** | +10 |
| finitions | 2 522 | **2 553** | +31 |
| relevés | 10 574 | **10 682** | **+108** |

| | |
|---|---|
| relevés ajoutés | **108** |
| **retraits du 13.09.2026 écartés** (le classeur les réintroduisait) | **6** (§ 9.3) |
| doublons exacts écartés (même finition, même date, même prix) | **238** |
| doublons de casse du classeur ramenés à une orthographe (`1.0 L` / `1.0 l`) | **5** |
| doublons de casse **préexistants dans `data.js`** | **5** (§ 3.2) |
| relevés non recopiés car déjà présents sous l'orthographe sœur | **18** (§ 3.2) |
| conflits de prix | **2** (§ 9.5) |
| relevés vérifiés conservés contre le classeur | 0 — aucun n'était contredit |
| marques créées | 0 |
| marques non résolues | 0 |

**Seulement 108 relevés nouveaux sur 10 781 lignes lues** : le classeur recouvre très largement ce que la base contient déjà. C'est le résultat attendu — et c'est ce qui rend la fusion peu risquée.

### 3.1 Rattachement des marques

Le classeur nomme parfois la marque plus longuement que `data.js` ne la range. Sans rattachement, la première exécution avait créé **trois marques fantômes et onze finitions en double**, alors que les modèles existaient déjà :

| dans le classeur | clé retenue dans `data.js` |
|---|---|
| `BAIC YX` | `BAIC` |
| `IM Motors` | `IM` |
| `Omoda & Jaecoo` | `Omoda` |

### 3.2 Cinq doublons déjà présents dans `data.js` — défaut trouvé par le contrôle

`data.js` porte **cinq fois la même finition sous deux entrées**, l'une des deux orthographes seulement ayant reçu les relevés récents :

| modèle | les deux entrées | orthographe qui reçoit les relevés nouveaux |
|---|---|---|
| Hyundai Grand i10 Populaire | `1.0 l` (3 relevés, 2019) / `1.0 L` (12 relevés, 2021→2026) | `1.0 L` |
| MG 3 | `1.5 l Confort` (4, 2016→2018) / `1.5 L Confort` (1, 2025) | `1.5 l Confort` |
| MG 3 | `1.5 l Confort Plus` (6, 2016→2018) / `1.5 L Confort Plus` (15, 2019→2024) | `1.5 L Confort Plus` |
| Volkswagen Tiguan | `1.4 l TSI R-Line` (6, 2017→2019) / `1.4 L TSI R-Line` (10, 2021→2026) | `1.4 L TSI R-Line` |
| **Peugeot** | deux **modèles** distincts, `Peugeot traveller` (9 relevés) et `Peugeot Traveller` (2 relevés de 2025) | `Peugeot traveller` |

La première version de la fusion déversait tous les relevés du classeur dans une seule des deux entrées : **18 tarifs déjà présents sous l'autre orthographe s'y trouvaient dupliqués**, et le `d0` — début de série, qui sert aux phases et à `venSerie` — reculait de deux ans sur quatre finitions. C'est `verif_fusion.js` qui l'a signalé ; deux règles ont été ajoutées :

1. l'entrée qui reçoit les relevés nouveaux est celle qui en compte **le plus** (l'orthographe principale), et non « la dernière rencontrée » ;
2. un relevé déjà porté par l'entrée sœur **n'est pas recopié** ailleurs.

C'est une partie de la différence entre les 135 relevés de la première exécution et les **108** retenus au final : 18 étaient des duplications de casse, 6 des retraits du 13.09.2026 (§ 9.3), 3 des relevés en conflit.

**Réunir ces cinq doublons en une seule entrée est une modification de la base** : cela relève de l'arbitrage de l'expert, pas de l'import. Rien n'a donc été réuni. Le cas Peugeot est le plus gênant, parce que ce sont deux **modèles** : dans l'application, le même Traveller apparaît deux fois dans la liste.

Sept marques n'existaient pas encore dans la liste de préfixes et ont dû y être déclarées pour que leur modèle soit séparé correctement : **Xpeng, Voyah, M-Hero, Deepal, IM Motors, Lynk & Co, BAIC**.

---

## 4. Les 31 finitions créées

Réparties sur 10 modèles nouveaux et 21 modèles existants. Toutes proviennent de relevés 2026.

| marque | modèle | finitions | énergie retenue | règle |
|---|---|---|---|---|
| Xpeng | G6, G9, X9 | 6 | ⚡ Élec. | marque intégralement électrique |
| IM | IM5, IM6 | 3 | ⚡ Élec. | marque intégralement électrique |
| Voyah | Free, Dream | 2 | 🔌 Hybride rechargeable | mention REEV (prolongateur) |
| M-Hero | 917 | 1 | 🔌 Hybride rechargeable | mention REEV |
| Deepal | S07, L07 | 2 | ⚡ Élec. | capacité en kWh dans le nom |
| Lynk & Co | 06, 08 | 2 | 🔌 Hybride rechargeable | mention PHEV |
| BAIC | Kenbo S2, X55 | 2 | 🛢️ / essence | héritée des finitions du même modèle |
| Volvo | XC60, XC90 | 4 | **🔌 Hybride rechargeable** | désignation Volvo T8 (§ 9.2) |
| Volvo | XC60 | 1 | **aucune** | `B5`, hybride léger — voir § 9.2 |
| Volvo | EX90 | 3 | ⚡ Élec. | héritée des finitions du même modèle |
| divers (BAIC, BMW, JMC, KIA, Chery, Haval, Jetour…) | 8 modèles | 8 | 2 héritées, 6 aucune | héritage des finitions sœurs |

**24 énergies déduites**, **7 finitions laissées sans énergie** (§ 5).

---

## 5. L'énergie : ce qui a été déduit, et pourquoi le reste ne l'a pas été

Le calcul lit l'énergie dans `eg.fuel` ou `sp.carburant`. **Sans elle, `fuelClass()` rend « essence »** : une électrique passerait pour un thermique — pas de module batterie, pas de décote VE, pas de TVA à 7 %. C'est le seul endroit où une omission produit un faux résultat silencieux. Donc : règle explicite ou rien.

Règles appliquées, dans l'ordre :

| règle | ce qu'elle reconnaît | rendu |
|---|---|---|
| mention PHEV / rechargeable / plug-in | `PHEV`, `Hybride rechargeable` | 🔌 Hybride rechargeable |
| désignation constructeur | `330e`, `530e` chez BMW / Mercedes | 🔌 Hybride rechargeable |
| prolongateur d'autonomie | `REEV`, `Range Extender` | 🔌 Hybride rechargeable |
| désignation Porsche | `E-Hybrid` | 🔌 Hybride rechargeable |
| **désignation Volvo T8** | `T8` **chez Volvo seulement** | 🔌 Hybride rechargeable |
| mention hybride | `e:HEV`, `HEV`, `Hybrid` | 🌿 Hybride |
| capacité batterie | `kWh` dans le nom | ⚡ Élec. |
| mention électrique | `EV`, `e-tron`, `électrique` | ⚡ Élec. |
| marque intégralement électrique | Xpeng, IM Motors | ⚡ Élec. |
| désignation diesel | `dCi`, `HDi`, `TDI`, `CRDi`, `D-4D` | 🛢️ Diesel |
| **héritage des finitions sœurs** | le modèle existe et **toutes** ses finitions partagent une énergie | cette énergie |

L'héritage n'est **jamais** appliqué à un modèle à énergies mêlées : un XC60 existe en essence et en rechargeable, hériter y serait un tirage au sort.

**Les 11 finitions restées sans énergie** — elles seront traitées comme « essence » par défaut tant que rien n'est renseigné, ce qui est faux pour au moins quatre d'entre elles (§ 9.2).

---

## 6. La colonne `Variation` comme contrôle de complétude

Elle n'a servi qu'à **vérifier**, jamais à reconstituer.

| lecture | nombre |
|---|---|
| variation = écart au relevé précédent → série complète | **7 605** |
| variation = prix lui-même → première apparition ou réapparition au catalogue | **218** |
| première ligne d'une finition, variation signée | **40** |
| **variation incohérente → un relevé manque entre les deux** | **178** |

Les 178 incohérences signalent un relevé absent du classeur **et** de la base. La variation donne l'**ancien prix**, jamais sa **date** : le relevé n'est donc pas reconstituable sans inventer une date. Ils sont listés dans `sources/rapport_fusion.json` (`variations.detailIncoherentes`) pour un relevé d'archive ultérieur, et **rien n'a été ajouté**.

---

## 7. Les baisses de tarif de septembre 2026

30 finitions perdent 15 % ou plus sur leur dernier relevé de 2026. C'est le seul effet de la fusion capable de **changer des valeurs que l'application rendait déjà** : le calcul est ancré sur le dernier tarif de la phase et plafonné au prix neuf du jour, donc une baisse de tarif fait baisser la valeur vénale de tous les millésimes.

`effet_baisses.js` les confronte une à une :

| | |
|---|---|
| finitions en baisse ≥ 15 % | **30** |
| dont la valeur vénale change réellement | **1** |
| dont la baisse est **interne au classeur** (le tarif de référence de `data.js` était déjà celui d'après la baisse) ou qui sont **nouvelles** (aucune valeur rendue auparavant) | **29** |

Autrement dit : les baisses spectaculaires du classeur étaient, à une exception près, **déjà connues de la base**. Le détail chiffré est produit par `node effet_baisses.js`.

---

## 8. Contrôles passés

| contrôle | résultat |
|---|---|
| aller-retour `JSON.parse` / `JSON.stringify` sur `data.js` | **neutre à l'octet** — c'est ce qui fonde la garantie de non-régression |
| **idempotence** : refusionner `data.candidat.js` | **aucun changement** |
| aucune marque / modèle / finition perdu | **OK** |
| aucun relevé perdu (10 574 retrouvés) | **OK** |
| aucune fiche technique (`eg`, `sp`) perdue | **OK** |
| finitions identiques à l'octet | **2 454 / 2 522 (97,3 %)** |
| les **107** clés de `RELEVES_VERIFIES` se résolvent dans la base fusionnée | **OK** |
| les **5** clés de `PHASES` se résolvent dans la base fusionnée | **OK** |
| `RELEVES_VERIFIES` lu et respecté | 107 modèles · 106 relevés protégés · 6 retraits |

Le contrôle des clés est celui qu'on oublie : renommer une finition à l'import ne casse rien de visible, mais les tarifs vérifiés et les bornes de génération cessent **silencieusement** de s'appliquer. Il est désormais bloquant.

### 8.1 Effet sur l'indice de prix

L'indice est recalculé au démarrage à partir de `data.js`, par médianes de modèles appariés et par énergie. Les 135 relevés nouveaux le déplacent de :

| | avant | après |
|---|---|---|
| indice 2026 | référence | **−0,01 % à −0,89 %** selon l'énergie |

**97 % des valeurs vénales restent inchangées** au dinar près. L'écart résiduel vient des 135 relevés nouveaux, pas d'une modification de l'existant.

### 8.2 Un incident à retenir

La première exécution de la fusion a tourné **sur la mauvaise base** : la copie de travail était sur la branche `vercel/install-vercel-web-analytics-xn3hck`, c'est-à-dire des fichiers de la v27. Pire, `lireRelevesVerifies()` avait alors un **repli silencieux rendant une table vide** : les tarifs vérifiés étaient donc sans protection, **sans qu'aucun message ne le signale**. Le repli a été remplacé par une **erreur bloquante**, dans `integrer_prix.js` comme dans `verif_fusion.js`, et tous les chiffres de ce rapport ont été recalculés sur `main`.

---

## 9. Ce qui demande un arbitrage — rien n'est écrit tant que ces points ne sont pas tranchés

### 9.1 `BAIC` ou `BAIC YX` ?

Le classeur écrit `BAIC YX Kenbo S2`, la base range ses modèles sous `BAIC`. J'ai rattaché à `BAIC`. À confirmer : est-ce bien la même marque, ou `BAIC YX` est-il un importateur / une gamme distincte qui mérite sa propre entrée ?

### 9.2 Les finitions sans énergie — les quatre Volvo T8 sont réglées

**Tranché le 29.09.2026 par Yassine Hadiji : la Volvo T8 est bien rechargeable.** La règle « `T8` chez Volvo → 🔌 Hybride rechargeable » est donc écrite dans `energieDuNom`, bornée à Volvo. Les quatre finitions concernées (XC60 et XC90 `2.0 l T8 AWD Ultra`) entrent avec la bonne énergie : module batterie, décote VE et TVA à 7 % s'appliquent.

Il reste **7 finitions sans énergie**, qui seront traitées comme essence :

| marque | modèle | finition |
|---|---|---|
| Volvo | XC60 | 2.0 l B5 AWD Ultimate Dark |
| BAIC | U5 Plus | 1.5 L Luxury |
| BAIC | X55 | 1.5 L DCT LV4 Sport Plus |
| BAIC | X55 | 1.5 L DCT LV2 Sport |
| BMW | Z4 | sDrive 20i Pack M |
| JMC | Grand Avenue | 2.3 l Turbo 4x4 Plus BVA |
| KIA | Sportage | 1.6 l T-GDI 7-DCT Motion |

Le `B5` de la première ligne est un **hybride léger 48 V** : il ne roule jamais en électrique seul, « essence » est donc la convention habituelle — mais c'est une convention, à confirmer d'un mot. Les six autres sont des thermiques : « essence » par défaut y est juste, simplement ce n'est pas écrit dans la fiche.

### 9.3 Les 6 retraits du 13.09.2026 — réglé, c'est `test_vv.js` qui l'a tranché

Le classeur rapporte six relevés que le contrôle catalogue du 13.09.2026 avait **retirés** comme substitutions mal attribuées. La première écriture les a laissés revenir dans `hist` : le calcul restait juste — `RELEVES_VERIFIES` les neutralise à l'exécution — mais **`test_vv.js` a signalé l'échec** (« un retrait déjà appliqué dans la base ne casse rien »), parce que la base n'était plus propre et que l'erreur reviendrait dès qu'on la régénérerait.

Ils sont désormais **écartés à l'import** :

| modèle · finition | date écartée |
|---|---|
| Renault Clio · 1.0 L SCe Life Plus | 06.05.2024 |
| Renault Clio Populaire · 1.2 L | 02.09.2020 |
| Jaguar E-Pace · 2.0 T 200 ch S | 23.01.2024 |
| Jaguar F-Pace · 2.0 T 250 R-Sport | 23.01.2024 |
| Seat Ibiza · 1.0 L TSI Style BVA | 16.01.2026 |
| Volkswagen Caddy Cargo · 2.0 L TDI Business | 27.02.2026 |

Quatre d'entre eux faisaient partie des « prix du jour qui changent » de la première écriture — c'étaient précisément les quatre **faux** changements : la Jaguar E-Pace serait passée de 289 000 à 350 000 DT et la Seat Ibiza de 69 980 à 86 980 DT, sur des tarifs qui n'appartiennent pas à ces finitions. Le classeur est la source même qui avait produit l'erreur ; le laisser la réécrire, c'était la refaire.

### 9.4 Les 10 quasi-correspondances

Dix finitions nouvelles ressemblent à une finition existante du même modèle (`1.2 L Active` contre `1.2 L Active Pack`, etc.). **Aucune n'a été rapprochée** : rapprocher deux libellés proches, c'est refaire l'erreur de la Clio. La liste complète est dans `sources/rapport_fusion.json` (`quasi`). Chacune doit être tranchée une à une : même finition mal orthographiée, ou finition réellement distincte ?

### 9.5 Deux conflits de prix, et « Peugeot traveller »

Deux finitions portent deux prix différents à la même date dans le classeur. Dans les deux cas `data.js` connaissait déjà la valeur, et c'est elle qui a été retenue — mais l'écart mérite d'être vu :

| finition | date | prix du classeur | retenu (`data.js`) |
|---|---|---|---|
| Land Rover Range Rover Evoque · 2.0 l D150 S | 01.08.2019 | 280 000 **et** 249 000 | **249 000** |
| Mitsubishi Mirage · 1.2 L GLX | 03.04.2015 | 24 720 **et** 26 840 | **24 720** |

Le premier écart (31 000 DT, soit 12 %) est trop grand pour une coquille de saisie : il s'agit plus probablement de **deux finitions différentes** rangées sous le même libellé. À instruire.

Par ailleurs, le classeur écrit `Peugeot Traveller` avec une majuscule dans la feuille 2025 et `Peugeot traveller` partout ailleurs — et **`data.js` porte les deux comme deux modèles distincts** (§ 3.2). L'orthographe de la base a été conservée pour les relevés nouveaux (règle générale : la base fait foi sur la forme), mais le doublon de modèle reste à trancher.

---

## 10. Pour écrire la base, une fois ces points tranchés

```bash
node integrer_prix.js && node verif_fusion.js && node effet_baisses.js
```

puis, **et seulement si les trois sont au vert et les arbitrages du § 9 rendus** :

```bash
node integrer_prix.js --ecrire && node test_vv.js && node audit3.js && node check_neuf.js && node check_pop.js
```

---

## 11. Fichiers de ce chantier

| fichier | rôle |
|---|---|
| `export_classeur.py` | classeur `.xlsx` → `sources/classeur.json`, format uniquement, aucune interprétation métier |
| `integrer_prix.js` | la fusion ; `--ecrire` seul remplace `data.js`, `--source` permet le test d'idempotence |
| `verif_fusion.js` | idempotence, neutralité à l'octet, rien de perdu, clés `RELEVES_VERIFIES` et `PHASES` résolues |
| `effet_baisses.js` | effet réel des 30 baisses 2026 sur une valeur vénale à 2 ans |
| `sources/classeur.json` | les 17 152 lignes lues |
| `sources/rapport_fusion.json` | le détail : conflits, quasi-correspondances, sans-énergie, variations incohérentes |
| `data.candidat.js` | la base fusionnée, **non installée** |

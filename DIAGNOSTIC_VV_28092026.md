# Diagnostic — niveau de la valeur vénale · 28 septembre 2026

**Aucun paramètre n'a été modifié.** Ce document est le livrable de l'étape 8.1 : il présente le diagnostic, les mesures et une proposition chiffrée, à valider avant toute application.

---

## 1. Le cas signalé, décomposé

Toyota **Agya 1.2 L VVTi BVM**, MEC 07/2022, **78 160 km**, usage location, évaluation 09/2026.

| facteur | valeur | effet cumulé |
|---|---|---|
| Valeur à neuf actualisée (fin de série 48 900 DT du 18.05.2023 × indice 1,011) | 49 453 DT | 49 453 DT |
| F_âge — 4,27 %/an sur 4 ans et 2 mois | ×0,834 | 41 231 DT |
| F_état — conforme | ×1,000 | 41 231 DT |
| F_km — 78 160 km contre un repère de 62 500 km | ×0,989 | 40 777 DT |
| F_usage — location | ×0,920 | 37 515 DT |
| **Valeur vénale affichée** | | **37 500 DT** |

En usage particulier : 40 800 DT.

**Le kilométrage n'est pas en cause** : 78 160 km à 4 ans et 2 mois, c'est 15 660 km au-dessus du repère, soit un malus de 1,1 %. Le problème est un problème de **niveau**.

### Vérification de la série tarifaire (préalable obligatoire)

| relevé | 12.02.2021 | 17.02.2022 | 07.05.2022 | 11.07.2022 | 01.09.2022 | 16.11.2022 | 18.05.2023 |
|---|---|---|---|---|---|---|---|
| prix | 39 900 | 40 900 | 42 900 | 44 900 | 45 900 | 46 900 | 48 900 |

Série propre : progression régulière, aucun creux promotionnel, aucune substitution de finition, aucun changement de génération. La finition quitte le catalogue en mai 2023.

**L'ancrage (méthode B) n'explique pas l'écart** : fin de série actualisée 49 453 DT contre tarif du millésime actualisé 48 307 DT, soit **+2,4 %**. Ce suspect est écarté pour ce cas.

---

## 2. Ce que dit le marché réel pour ce véhicule

Relevé du 28.09.2026, deux sources publiques indépendantes (détail dans `marche_agya_28092026.csv`) :

| source | année | km | prix demandé |
|---|---|---|---|
| automobile.tn | 2021 | 54 000 | 38 500 DT |
| automobile.tn | 2021 (BVA) | 44 000 | 40 000 DT |
| tayara.tn | 2022 | — | 35 000 DT |
| tayara.tn | 2023 (1ʳᵉ main) | — | 35 500 DT |
| tayara.tn | — | 51 000 | 40 000 DT |
| tayara.tn (10 annonces) | — | — | **32 000 à 40 000 DT** |

**Il faut le dire franchement : ces annonces ne confirment pas les 25 000–26 000 DT.** Une Agya de 2022 se demande autour de 35 000 DT, une de 2021 autour de 38 500 DT. Face à ces prix, le modèle (40 800 DT en particulier) est **+14 à +17 % trop haut** — ce qui correspond exactement au biais général déjà mesuré (+13,3 %), et non aux +47 % du cas signalé.

**D'où la question qui commande la suite :** les 25 000–26 000 DT que vous citez correspondent-ils à

- **(a)** un prix de **cession de flotte** (rachat en lot d'un loueur, prix de gros) ;
- **(b)** un prix de **transaction négociée** pour un ex-location, une fois la décote de statut appliquée ;
- **(c)** un véhicule particulier de l'affaire (état, historique) ?

Selon la réponse, la correction n'est pas la même : dans le cas (b) c'est le coefficient « location » qui est faux, dans le cas (a) c'est une notion différente de la valeur vénale d'expertise et le modèle n'a pas à la rendre.

Aucune annonce publique ne signale l'origine « ex-location » — la recherche sur tayara.tn ne renvoie rien. **Ce coefficient ne peut donc pas se mesurer sur les annonces** : il relèvera de votre pratique.

---

## 3. Les suspects, instruits et classés

### 3.1 Le taux de dépréciation : un artefact de composition — **contribution majeure**

Le taux « grand public » de 4,27 %/an vient d'un ajustement exponentiel sur **1 à 20 ans**. Or la courbe réelle n'est pas une exponentielle : elle est raide au début et s'aplatit ensuite. Le même ajustement, en bornant la fenêtre d'âge :

| bande de valeur à neuf | 1-20 ans | 1-10 ans | 1-8 ans | 1-6 ans | n |
|---|---|---|---|---|---|
| < 60 000 DT | 4,39 % | 4,46 % | **6,81 %** | **8,43 %** | 271 |
| 60 à 100 000 DT | 4,09 % | 2,57 % | 2,77 % | 5,64 % | 106 |
| 100 à 180 000 DT | 7,07 % | 5,14 % | 6,60 % | 6,84 % | 128 |
| ≥ 180 000 DT | 8,30 % | 8,59 % | — | — | 56 |

La bande basse passe de 4,4 % à 8,4 %/an selon qu'on regarde vingt ans ou six. Les véhicules à faible valeur à neuf sont surtout de **vieux** véhicules, déjà près du plancher de valeur résiduelle : ils aplatissent la pente, et cette pente aplatie est ensuite appliquée aux véhicules **récents**, qui sont précisément ceux qu'on expertise.

Comparaison directe, rétention observée sur les annonces (corrigée du kilométrage) contre le modèle :

| âge | n | observé | modèle 4,27 %/an | écart | modèle 6,50 %/an | écart |
|---|---|---|---|---|---|---|
| 3 ans | 44 | 0,734 | 0,877 | +20 % | 0,817 | +11 % |
| 4 ans | 60 | 0,701 | 0,840 | **+20 %** | 0,764 | +9 % |
| 5 ans | 50 | 0,675 | 0,804 | +19 % | 0,715 | +6 % |
| 6 ans | 36 | 0,585 | 0,770 | +32 % | 0,668 | +14 % |
| 8 ans | 36 | 0,573 | 0,705 | +23 % | 0,584 | +2 % |
| 10 ans | 45 | 0,587 | 0,646 | +10 % | 0,511 | −13 % |

Le modèle est au-dessus du marché **à tous les âges de 1 à 8 ans**, de 16 à 32 %. C'est le premier contributeur, et c'est lui qui pèse sur l'Agya : le marché implique **12,7 %/an** sur ce véhicule, le modèle en applique 4,27 %.

### 3.2 La pente kilométrique — **contribution réelle mais secondaire ici**

Mesurée sur les 545 annonces qui indiquent un kilométrage, après retrait de l'âge :

| taux d'âge retenu | pente mesurée | paramètre actuel |
|---|---|---|
| 4,27 %/an | 0,42 %/10 000 km | 0,70 % |
| 6,50 %/an | **0,91 %/10 000 km** | 0,70 % |

La pente dépend du taux d'âge retenu — les deux doivent donc être ajustés **ensemble**, jamais séparément. Avec un taux d'âge corrigé, la pente mesurée est de 0,91 %/10 000 km, soit +30 % par rapport au paramètre actuel.

**Le plafond de malus de −45 % n'est jamais atteint : 0 annonce sur 561.** Il ne sert à rien en pratique et peut être laissé tel quel sans conséquence.

Sur l'Agya, à 78 160 km, cette correction ne vaut que −0,5 % : elle ne joue que sur les véhicules très roulés.

### 3.3 Le coefficient d'usage « location » — **hypothèse, non mesurée**

Valeur actuelle 0,92, **posée par hypothèse** — le commentaire du code le dit : « valeurs de départ, non calibrées sur des transactions réelles ». Aucune annonce publique ne mentionne l'origine location, donc aucune mesure possible sur les sources ouvertes.

Si votre chiffre de 25 500 DT est bien un prix d'ex-location alors que le marché particulier est à 35 000 DT, la décote de statut serait de l'ordre de **−27 %**, soit un coefficient autour de **0,73**, contre 0,92 aujourd'hui. C'est cohérent avec ce qui s'observe ailleurs pour les ex-flottes de location de petites citadines, mais **cela reste à confirmer par vous** : je ne dispose d'aucune donnée pour le mesurer.

Attention au double comptage : le kilométrage est déjà traité à part, et le test existant vérifie que F_km est identique quel que soit l'usage. Le coefficient ne doit porter que le stigmate de statut — nombreux conducteurs, entretien minimal, revente en lot.

### 3.4 Un sous-segment « citadine d'entrée de gamme » — **non justifié en l'état**

La bande < 60 000 DT et la bande 60–100 000 DT ne se séparent pas proprement (2,77 % contre 6,81 % sur 1-8 ans, mais avec n = 106 et une forte dispersion). **Les données ne justifient pas de créer un segment supplémentaire** ; elles justifient de corriger la fenêtre d'ajustement. Créer un segment pour absorber le cas de l'Agya serait du sur-ajustement.

### 3.5 Le niveau général : la constante écartée — **à trancher**

La calibration produit une constante de **×0,961** (annonces / modèle). Elle a été écartée au motif que les annonces portent une marge vendeur. Le raisonnement était à moitié juste : la marge justifie de **corriger** la constante, pas de la supprimer — et elle joue dans le sens inverse de celui retenu, puisqu'une transaction se conclut **sous** le prix demandé.

Aujourd'hui le modèle est à **+13,3 %** au-dessus des prix **demandés**, donc plus loin encore des prix de **transaction**. Ce que je propose : un paramètre nommé **`abattementAnnonceTransaction`**, documenté et daté, qui porte explicitement le passage du prix de vitrine au prix de transaction. Sa valeur ne peut pas être mesurée sur des annonces — par construction. Elle doit venir de votre pratique. **Ordre de grandeur usuel : 5 à 10 %.**

---

## 4. Simulation : ce que donneraient les corrections

Paramètres surchargés en mémoire, `index.html` **non modifié**.

| jeu | taux grand public | pente km | location | abattement |
|---|---|---|---|---|
| ACTUEL (v54) | 4,27 % | 0,70 % | 0,92 | — |
| **P1** | **6,80 %** | **0,91 %** | 0,92 | — |
| **P2** | 6,80 % | 0,91 % | **0,80** | — |
| **P3** | 6,80 % | 0,91 % | 0,80 | **7 %** |

### Performance globale, face aux 561 annonces

| jeu | biais médian | écart absolu médian | groupes sous 20 % |
|---|---|---|---|
| ACTUEL (v54) | +13,3 % | 15,5 % | 35 / 56 |
| P1 | **+0,9 %** | 16,4 % | 35 / 56 |
| P2 | +0,9 % | 16,4 % | 35 / 56 |
| P3 | **−6,2 %** | **12,7 %** | 34 / 56 |

P1 supprime le biais face aux prix demandés. P3 place le modèle **6 % sous les prix demandés**, ce qui est la position attendue d'une valeur de transaction, et améliore nettement l'écart absolu médian.

La dispersion, elle, ne bouge presque pas (15,5 → 16,4 % en P1) : elle vient de la couverture du catalogue, pas de la formule — ce que le rapport établissait déjà. **Il ne faut pas espérer la réduire en jouant sur ces paramètres.**

### Les quinze cas de référence

| véhicule | MEC | km | usage | ACTUEL | P1 | P2 | P3 |
|---|---|---|---|---|---|---|---|
| **Toyota Agya 1.2 VVTi** | 2022 | 78 160 | **location** | **37 500** | 33 400 | 29 100 | **27 100** |
| Toyota Agya 1.2 VVTi | 2022 | 78 160 | particulier | 40 800 | 36 400 | 36 400 | 33 900 |
| Toyota Agya Populaire | 2022 | 80 000 | particulier | 29 000 | 25 800 | 25 800 | 24 000 |
| Hyundai i10 | 2022 | 60 000 | particulier | 25 300 | 22 700 | 22 700 | 21 100 |
| KIA Picanto | 2019 | 105 000 | particulier | 30 700 | 25 400 | 25 400 | 23 600 |
| Peugeot 208 Active | 2018 | 150 000 | particulier | 40 700 | 32 700 | 32 700 | 30 400 |
| Renault Clio | 2016 | 190 000 | particulier | 32 000 | 24 300 | 24 300 | 22 600 |
| Renault Symbol | 2013 | 250 000 | taxi | 22 000 | 15 300 | 15 300 | 14 200 |
| Volkswagen Golf 7 | 2015 | 180 000 | particulier | 48 100 | 35 700 | 35 700 | 33 200 |
| Nissan Qashqai | 2018 | 140 000 | particulier | 76 400 | 76 100 | 76 100 | 70 800 |
| Volkswagen Tiguan | 2022 | 70 000 | particulier | 112 200 | 112 000 | 112 000 | 104 200 |
| Hyundai Tucson | 2020 | 120 000 | société | 84 300 | 83 800 | 83 800 | 77 900 |
| BMW Série 3 | 2017 | 160 000 | particulier | 73 900 | 73 500 | 73 500 | 68 400 |
| Mercedes Classe C | 2013 | 260 000 | particulier | 55 800 | 55 000 | 55 000 | 51 200 |
| Dacia Sandero | 2021 | 90 000 | location | 32 200 | 28 000 | 24 400 | 22 700 |

Les véhicules **haut de gamme et premium ne bougent pas** en P1 : leurs taux (6,98 et 8,33 %/an) ne sont pas remis en cause par les mesures. Seule la gamme « grand public » est corrigée, plus la pente kilométrique sur les gros rouleurs (Clio 190 000 km : −24 %, Golf 180 000 km : −26 %).

---

## 5. Ce qu'il faut que vous tranchiez

1. **Les 25 000–26 000 DT de l'Agya** : prix de cession de flotte, ou prix de transaction d'un ex-location auprès d'un particulier ? Les annonces publiques sont à 32 000–40 000 DT.
2. **Le coefficient « location »** : le passer de 0,92 à une valeur de votre choix (0,73 à 0,80 selon la réponse ci-dessus). Non mesurable sur données publiques.
3. **L'abattement annonce → transaction** : le principe, et sa valeur (5 à 10 %). C'est lui qui distingue une valeur de vitrine d'une valeur d'indemnisation.
4. **Le taux « grand public » à 6,80 %/an** : mesuré sur la fenêtre 1-8 ans, qui est celle de l'expertise courante. Les taux haut de gamme et premium restent inchangés.
5. **La pente kilométrique à 0,91 %/10 000 km** : mesurée, à ajuster conjointement avec le taux d'âge.

---

## 6. Ce qui reste incertain, et que je ne masque pas

- **La dispersion par modèle ne sera pas résolue par ces paramètres** : elle vient des modèles à finition unique et des tarifs anciens.
- **La bande 60–100 000 DT** donne des taux instables selon la fenêtre (2,6 à 5,6 %) : n = 106 seulement.
- **`marche_occasion.csv` date du 28/08/2026** et ne contient aucune Agya. Son rafraîchissement et son extension (étape 3 du cahier des charges) restent à faire : je n'ai collecté que les 14 annonces d'Agya nécessaires à ce diagnostic.
- **La validation hors échantillon et le jackknife** (étape 4) n'ont pas été faits : ils n'ont de sens qu'une fois les paramètres arrêtés, sur un échantillon rafraîchi.
- **Aucune donnée publique ne documente la décote ex-location.**


---

# 7. Échantillonnage du marché et confrontation au calcul — 28.09.2026

## 7.1 L'échantillon

**152 annonces exploitables**, relevées le 28.09.2026 sur automobile.tn (rubrique occasion), 18 modèles couvrant les trois gammes (fichier `marche_occasion_28092026.csv` : date, source, modèle, année, kilométrage, prix demandé, ville, boîte). Chaque annonce est confrontée individuellement à la valeur calculée pour le même modèle, la même année et le même kilométrage — et non par groupe médian comme le fait `validation.js`.

## 7.2 L'usage n'est pas déclaré : ce que cela implique

**Une annonce ne dit pas l'usage du véhicule, et encore moins qu'il sort d'une société de location.** L'échantillon est donc un mélange : particuliers, véhicules de société, ex-location, ex-taxi. Le calcul, lui, suppose un usage — ici « particulier », le plus favorable.

Conséquence directe : **une part inconnue des prix demandés est déjà minorée par un usage que le calcul ignore**, et le modèle paraît d'autant plus haut. L'ordre de grandeur :

| part d'annonces non-particulier | coefficient moyen | biais médian lu |
|---|---|---|
| 0 % | ×1,000 | +13,6 % |
| 15 % avec un coefficient de 0,85 | ×0,978 | +11,0 % |
| 25 % avec un coefficient de 0,80 | ×0,950 | +7,9 % |
| 40 % avec un coefficient de 0,80 | ×0,920 | +4,5 % |

**Ce n'est pas mesurable sur les annonces** — c'est une fourchette de lecture, pas une correction à appliquer. Elle dit seulement qu'une partie du biais apparent tient à la composition de l'échantillon, et qu'il ne faut donc pas corriger les paramètres de la totalité de l'écart observé.

## 7.3 Le choix de la finition pèse autant que les paramètres

Les annonces ne précisent presque jamais la finition. Selon qu'on retient la finition **médiane en prix** (convention de `validation.js`) ou la **moins chère** — plus proche de ce qui se revend d'occasion :

| convention de finition | biais médian | écart absolu médian |
|---|---|---|
| médiane en prix | **+13,6 %** | 15,0 % |
| la moins chère | **+4,0 %** | 11,9 % |

Presque dix points d'écart, du seul fait de la convention. **C'est du même ordre que les corrections envisagées.** Toute recalibration doit donc fixer cette convention d'abord, sinon on grave dans les paramètres un artefact de comparaison.

## 7.4 Le biais actuel, décomposé

| découpage | n | biais médian | écart absolu | sous 20 % | au-dessus du marché |
|---|---|---|---|---|---|
| **tout l'échantillon** | 152 | **+13,6 %** | 15,0 % | 98/152 | 76 % |
| gamme grand public | 90 | +12,8 % | 14,1 % | 60/90 | 76 % |
| gamme haut de gamme | 33 | +7,1 % | 12,7 % | 24/33 | 70 % |
| gamme luxe / premium | 29 | **+19,3 %** | 22,4 % | 14/29 | 83 % |
| 0-3 ans | 37 | +10,4 % | 12,0 % | 26/37 | 78 % |
| 4-6 ans | 50 | +13,8 % | 15,0 % | 31/50 | 78 % |
| 7-10 ans | 29 | +11,1 % | 15,4 % | 19/29 | 66 % |
| 11-15 ans | 28 | +16,5 % | 16,5 % | 18/28 | 86 % |
| 16 ans et + | 8 | +1,2 % | 16,8 % | 4/8 | 50 % |

Le modèle est au-dessus du marché dans **76 % des cas**, à tous les âges. Le biais n'est donc pas un effet de queue : c'est bien un niveau.

Par modèle, du plus surévalué au moins :

| modèle | n | biais médian | | modèle | n | biais médian |
|---|---|---|---|---|---|---|
| Hyundai Tucson | 12 | +41,6 % | | Mercedes Classe C | 12 | +8,1 % |
| Peugeot 208 | 12 | +39,6 % | | KIA Picanto | 11 | +7,1 % |
| BMW Série 3 | 12 | +23,4 % | | Volkswagen Golf 7 | 12 | +5,0 % |
| Citroën C3 | 6 | +21,1 % | | Renault Clio | 12 | +3,5 % |
| Suzuki Swift | 6 | +14,6 % | | Dacia Sandero | 5 | +2,2 % |
| Hyundai i20 | 11 | +12,9 % | | Volkswagen Tiguan | 12 | +1,9 % |
| Nissan Qashqai | 10 | +12,3 % | | Renault Symbol | 5 | −8,8 % |
| Seat Ibiza | 6 | +10,8 % | | | | |

Les deux extrêmes (Tucson, 208) sont précisément les modèles à **large éventail de finitions** : c'est là que la convention du § 7.3 fait le plus de dégâts. Le Symbol, à finition quasi unique, est le seul en dessous du marché.

## 7.5 Ce que donneraient les corrections, mesuré sur cet échantillon

| jeu | taux gp / hg / lux | pente km | biais médian (finition médiane) | biais (finition mini) | écart absolu | sous 20 % |
|---|---|---|---|---|---|---|
| **ACTUEL** | 4,27 / 6,98 / 8,33 | 0,70 % | +13,6 % | +4,0 % | 15,0 % | 98/152 |
| P1 | 6,80 / 6,98 / 8,33 | 0,91 % | +0,9 % | −5,3 % | 14,3 % | 97/152 |
| P4 | 5,80 / 6,98 / 8,33 | 0,91 % | +5,6 % | −2,5 % | 13,0 % | 102/152 |
| **P5** | **5,80 / 7,50 / 9,50** | **0,91 %** | **+2,8 %** | **−4,0 %** | **10,8 %** | **110/152** |
| P3 (P1 + abattement 7 %) | 6,80 / 6,98 / 8,33 | 0,91 % | −6,2 % | −11,9 % | 13,2 % | 106/152 |

**P5 est la meilleure candidate** : c'est la seule qui rende le biais **homogène entre les trois gammes** (+1,7 / +5,7 / +6,3 % au lieu de +12,8 / +7,1 / +19,3 %), qui abaisse l'écart absolu médian de 15,0 à 10,8 %, et qui porte 110 annonces sur 152 à moins de 20 % au lieu de 98. Son biais encadre zéro selon la convention de finition (+2,8 % / −4,0 %), ce qui est exactement la position attendue d'une valeur de transaction face à des prix demandés.

**P1 corrige trop la gamme grand public** (−4,7 % dès la finition médiane), et **P3 va nettement trop bas** : ajouter un abattement de 7 % par-dessus une correction de taux revient à compter deux fois le même écart.

## 7.6 Ce que cet échantillon ne dit pas

- **Rien sur l'usage**, donc rien sur le coefficient « location » : la question de l'Agya reste entière.
- **Rien sur les prix de transaction** : ce sont des prix demandés. L'abattement annonce → transaction reste à trancher, et P5 ne l'inclut pas.
- Les gammes haut de gamme (33 annonces) et premium (29) restent **peu fournies** ; les taux 7,50 et 9,50 %/an proposés y sont moins solides que le 5,80 % de la gamme grand public.
- Aucune validation hors échantillon ni jackknife : à faire sur les paramètres retenus, une fois la convention de finition arrêtée.

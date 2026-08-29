# Prix VN Tunisie — rapport technique (v20)

Relecture du code, refonte des formules d'évaluation, **calibration et validation sur le marché réel de l'occasion**, et travail d'ergonomie sur `app.html` + `data.js`.

---

## 1. Intégrité de la base (`data.js`)

Vérification automatisée des 2 522 finitions et 10 474 points d'historique : syntaxe valide, 69 marques / 739 modèles conformes, aucune date mal formée, aucun `d0` postérieur à `d`, aucun historique non trié, aucun prix nul ou négatif, aucun doublon, aucune incohérence entre `eg.fuel` et `sp.carburant`, `GENS` cohérent avec `DB`.

`data.js` est livré **inchangé**.

Deux limites de couverture, à connaître car elles pèsent sur la précision des estimations :

- **418 finitions sur 2 522 (16,6 %)** n'ont pas de fiche technique détaillée (`sp`).
- **174 modèles sur 739** ont un tarif catalogue qui s'arrête avant 2020. Pour un modèle réellement retiré du marché (Peugeot 107, 206+…) c'est normal. Mais pour un modèle encore commercialisé, c'est une lacune qui dégrade l'estimation : la Hyundai i10 n'a que 2 finitions, dernier prix 2016, et c'est précisément le modèle où l'estimation s'écarte le plus du marché (−30 %). Compléter ces tarifs est le levier le plus rentable pour améliorer la précision.

---

## 2. Bugs corrigés

### 🔴 Résultat invisible sur tablette (769–1100 px)
La classe `.res-col.has-result` existait en CSS mais n'était **jamais posée en JavaScript** : sur toute tablette, après avoir choisi marque → modèle → finition, rien ne s'affichait. Corrigé, et complété : la grille tablette ne réservait aucune hauteur à la 2ᵉ rangée, le panneau se serait retrouvé écrasé dans une app en `height:100vh; overflow:hidden`. La rangée de sélection est bornée à 40 % de la hauteur, le résultat occupe le reste, chacun avec son défilement.

### 🔴 Véhicules d'avant 2011 impossibles à évaluer
Le champ « 1ère MEC » était borné à 2011 (profondeur de la base de prix). Conséquence : aucune valeur vénale calculable pour un véhicule plus ancien — alors que le marché de l'occasion et les dossiers d'expertise en comportent beaucoup. Trouvé en confrontant le modèle à des annonces de 2007-2010. La borne descend à 1990 ; au-delà de la profondeur de la base, la fiche signale simplement que le véhicule n'y était pas référencé et le calcul reste opérant.

### 🟠 Graphique absent sans explication hors connexion
Chart.js vient d'un CDN externe ; hors ligne, le bloc « Évolution du prix » restait une zone blanche muette. Un message clair s'affiche désormais.
**Reste à faire de votre côté** : pour un fonctionnement 100 % hors ligne, télécharger Chart.js et son plugin d'annotations (~230 Ko) à côté de `app.html` et remplacer les deux `<script src="https://cdnjs...">` par des chemins locaux. Mon environnement n'a pas accès à ce CDN.

### 🟡 Recherche sensible aux accents
Taper « citroen » ne trouvait pas Citroën. Normalisation appliquée aux quatre points de recherche.

---

## 3. Refonte des formules

    VV = ARRONDI( VEN × F_âge × F_état × F_km × F_usage × F_carburant , -2)

### 3.1 Un indice de prix automobile mesuré, au lieu de l'inflation générale

Le skill note que l'INS ne publie pas d'indice automobile et suggère l'IPC comme approximation. Mais **la base contient 10 474 prix catalogue observés** : le secteur peut être mesuré directement.

Méthode des **modèles appariés** (celle des indices de prix officiels) : pour chaque finition présente en année Y et Y+1, ratio de ses prix ; la médiane donne l'évolution « à modèle constant ». Chaque taux repose sur 115 à 320 paires réelles (`index_auto.js`).

| Année | Auto mesuré | IPC général | Écart |
|---|---|---|---|
| 2018 | **+19,03 %** | +7,31 % | +11,7 pts |
| 2020 | −1,37 % | +5,63 % | −7,0 pts |
| 2023 | +1,88 % | +9,30 % | −7,4 pts |
| 2024 | +1,46 % | +7,00 % | −5,5 pts |
| 2025 | 0,00 % | +5,30 % | −5,3 pts |

**Cumul 2012 → 2026 : ×1,81 mesuré contre ×2,14 avec l'IPC — 18 % d'écart.** L'IPC captait l'inflation alimentaire et énergétique, que les prix catalogue automobiles n'ont pas suivie.

### 3.2 La réforme fiscale 2026, mesurée au lieu d'être estimée

La version précédente appliquait un coefficient **spéculatif ×0,70** aux hybrides rechargeables, tiré d'une déclaration de presse. Cette baisse est **déjà visible dans vos données** :

| Énergie | 2025 → 2026 | Paires |
|---|---|---|
| **Hybride rechargeable** | **−24,75 %** | 29 (dont **29 en baisse**) |
| Électrique | −8,31 % | 22 |
| Hybride non rechargeable | −4,45 % | 17 |
| Essence | −3,33 % | 137 |
| Diesel | −0,80 % | 26 |

Robustesse : 5 marques distinctes (BMW −27,6 · Land Rover −34,2 · Mercedes −23,7 · Omoda −18,6 · Volvo −3,8), médiane des médianes par marque −23,65 %. La projection de presse (« jusqu'à 30 % ») est confirmée et chiffrée.

Le coefficient spéculatif est **supprimé** : l'étape 2026 de l'indice est différenciée par énergie. Cela élimine aussi un double comptage — une finition déjà tarifée en 2026 intègre la réforme et ne reçoit plus de correction (76 % des PHEV de la base). Vérifié par test.

Pour les **hybrides non rechargeables**, l'avertissement est fondé sur les données plutôt que sur un exemple de presse : les prix ont bougé de −12 % à +21 % selon le modèle, l'abattement de taxe de consommation étant réservé aux moteurs ≤1700cc essence / ≤2100cc diesel.

### 3.3 La VEN ancrée sur l'année de mise en circulation

La VEN partait du **dernier** prix catalogue de la finition. Pour un modèle encore vendu, cela revenait à comparer une Peugeot 208 de 2018 au tarif de la génération actuelle. La VEN part désormais du prix catalogue **le plus proche de l'année de MEC** dans l'historique de la finition, puis l'actualise — ce qui est aussi la définition du skill (L daté d'une année de référence M).

Précision utile : ce mécanisme n'opère que si la finition sélectionnée possède des prix de cette époque. Sélectionner une finition réellement commercialisée à la date de MEC — ce que l'application met déjà en tête de liste et signale par son bandeau de compatibilité — change sensiblement le résultat.

### 3.4 Double comptage usage / kilométrage — corrigé à la racine

Vous aviez signalé qu'un véhicule de location ou de taxi ressortait mieux coté qu'un véhicule de particulier. J'avais d'abord compensé en augmentant la dépréciation par usage — une rustine qui masquait la cause.

**La cause** : le kilométrage de référence variait selon l'usage. Un taxi à 100 000 km était comparé à une référence de 390 000 km, passait pour « peu roulé au regard de sa catégorie » et décrochait un bonus. La référence annulait le signal qu'elle mesurait.

**La correction** : référence **unique et absolue** (15 000 km/an), et décote professionnelle portée par un facteur **séparé**, qui existe indépendamment du compteur :

| Usage | F_usage |
|---|---|
| Particulier | 1,00 |
| Société / auto-école | 0,95 |
| Location | 0,92 |
| Taxi / VTC | 0,85 |

Les deux effets se cumulent correctement : un ex-taxi très roulé est pénalisé deux fois, un ex-taxi peu roulé seulement par la décote d'usage. L'ordre Particulier > Société > Location > Taxi est garanti par construction.

### 3.5 Dépréciation par âge : géométrique au lieu de linéaire

L'ancienne formule (linéaire, plafond 70 %) atteignait son plafond à 8,75 ans : **un véhicule de 9 ans et un de 20 ans avaient la même valeur d'âge**. Désormais `F_âge = max((1 − taux)^âge ; 0,12)`.

### 3.6 Malus kilométrique en kilomètres absolus

Le malus était calculé en **écart relatif** : à 2 ans la référence n'est que de 30 000 km, donc 100 000 km au compteur donnaient +233 % d'écart et le malus maximal — **un véhicule de 2 ans ressortait moins cher qu'un de 5 ans au même kilométrage**. Trouvé par les tests. Le malus dépend maintenant des kilomètres absolus d'écart, plafonné à −45 %, bonus à +15 %.

### 3.7 Indicateur de cotation — refondu

La jauge affichait la part de la valeur à neuf conservée (VV / VEN). Le chiffre était juste, mais **le libellé n'apprenait rien** : comme F_âge domine le produit, il ne faisait que reformuler l'âge. Vérification faite, avec état, kilométrage et usage neutres :

| Âge | Ancien libellé |
|---|---|
| 0 à 7 ans | Très bien coté |
| 8 à 11 ans | Bien coté |
| 12 à 18 ans | Cote dans la moyenne |
| 19 à 27 ans | Décote importante |

Un véhicule de 5 ans parfaitement banal était donc étiqueté « Très bien coté » parce qu'il est récent, et un véhicule de 15 ans en excellent état, peu roulé, ex-particulier restait « Cote dans la moyenne » alors qu'il est remarquable pour son âge.

Le libellé porte désormais sur **F_état × F_km × F_usage × F_carburant** — ce qui est propre à *ce* véhicule, hors âge et hors gamme, qui sont des caractéristiques subies. Il répond à la question utile en expertise : ce véhicule est-il bien ou mal coté **par rapport à la norme de son âge** ?

| Écart à la norme | Libellé |
|---|---|
| ≥ +10 % | Bien coté pour son âge |
| +3 à +10 % | Un peu au-dessus de la norme |
| −3 à +3 % | Conforme à son âge |
| −10 à −3 % | Un peu en dessous de la norme |
| < −10 % | Décoté pour son âge |

La jauge est centrée sur la norme, avec un repère fixe. La part de valeur à neuf conservée et la gamme retenue restent affichées dessous, comme information de niveau. Seuils indicatifs, non calibrés.

### 3.8 La cotation est réglable — c'est l'expert qui tranche

Le calcul **propose**, il ne décide pas. Le curseur se positionne sur la valeur conseillée et reste déplaçable à gauche ou à droite : la valeur vénale se recalcule en direct, et un repère fixe marque en permanence la position conseillée, de sorte que l'écart entre le modèle et le jugement de l'expert reste visible.

- Un ajustement manuel est signalé explicitement, avec rappel du montant que proposait le calcul.
- Un bouton « ↺ Revenir au conseil » apparaît dès qu'on s'écarte, et disparaît sinon.
- Modifier l'état, le kilométrage ou l'usage **remet le curseur sur le nouveau conseil** : un ajustement antérieur deviendrait trompeur puisque la recommandation a changé.
- Le détail du calcul indique la cotation retenue et, le cas échéant, celle qui était conseillée.

Choix technique : un `input type="range"` natif plutôt qu'un glisser-déposer maison — il fonctionne au clavier, au tactile et avec les technologies d'assistance. Le rendu ne reconstruit jamais le curseur pendant un mouvement (seules les valeurs affichées sont rafraîchies), sinon le glissement se coupe au premier pixel. Cible tactile élargie sur mobile.

### 3.9 Évaluation à une date antérieure

Un sinistre se règle à la valeur du véhicule **au jour du sinistre**, pas au jour du rapport. Un champ « Année d'évaluation » a donc été ajouté au module, réglé par défaut sur l'année courante et bornée entre la mise en circulation et aujourd'hui — on n'évalue un véhicule ni avant qu'il existe, ni au-delà des données disponibles.

Trois conséquences, toutes traitées :

**L'âge se compte à la date d'évaluation.** Un véhicule de 2016 évalué en 2022 a 6 ans, pas 10.

**L'évolution des prix s'arrête à cette date** — et c'est le point le plus important. Une réforme fiscale postérieure ne doit pas s'appliquer rétroactivement. Vérifié sur un hybride rechargeable : valeur à neuf de **346 286 DT** en évaluation 2024 contre **260 583 DT** en 2026, l'écart étant exactement la baisse de la loi de finances 2026. Évaluer un sinistre de 2024 avec les prix d'après-réforme aurait sous-estimé l'indemnisation d'un quart.

**Le calcul fonctionne dans les deux sens.** Si le prix catalogue retenu est postérieur à la date d'évaluation, l'indice **déflate** au lieu d'actualiser, au lieu de prendre le prix tel quel.

**Mise en page.** L'année d'évaluation est un *contexte* pour tout le bloc, pas une saisie au même rang que le kilométrage : elle est placée dans l'en-tête, à droite du titre. Les quatre champs alignés qui l'y précédaient ne laissaient que ~104 px chacun dans un panneau de 420 px — les intitulés s'enroulaient sur deux lignes et les menus tronquaient leur contenu. Les trois saisies restantes tiennent maintenant sur deux rangées : le kilométrage prend la largeur (six chiffres à lire), état et usage se partagent la suivante. Le libellé d'usage le plus long a été raccourci pour tenir sans troncature.

La pastille d'année vire à l'ambre dès qu'on s'écarte de l'année courante, et un rappel apparaît : *« pensez à saisir le kilométrage à cette date, et non celui d'aujourd'hui »*. Un défaut trouvé au passage : changer l'année ne reconstruit que la zone de résultat, si bien que l'en-tête restait figé — il est maintenant mis à jour séparément, sans reconstruire le bloc (ce qui refermerait le détail du calcul et ferait perdre le focus).

L'écart à l'année courante est signalé explicitement dans la fiche : *« Évaluation au 2022 et non à l'année courante (2026). L'âge retenu est de 6 ans, et l'évolution des prix postérieure à 2022 — réformes fiscales comprises — n'est pas appliquée. »*

### 3.10 Véhicules populaires : réintégration de la taxe douanière

Le véhicule populaire est vendu **hors taxe douanière**, sous conditions de revenu et de puissance (≤ 4 CV fiscaux), et il est **incessible pendant 2 ans**, sauf cas particuliers (mise à l'épave notamment). Passé ce délai il s'échange sur le marché normal — sa valeur vénale doit donc se comparer à un prix à neuf **taxé**, et non au prix subventionné du catalogue. Partir du prix subventionné sous-estimait mécaniquement ces véhicules.

**27 finitions sont concernées** dans la base : 24 réparties sur 17 modèles dédiés (Picanto, 208, C3, Clio, Ibiza, Grand i10, Celerio, Agya, Polo…), plus 3 finitions « Populaire » isolées à l'intérieur de modèles ordinaires. Le repérage se fait sur le nom, au démarrage.

**Règle appliquée**, conforme au régime :

| Ancienneté à la date d'évaluation | Valeur à neuf de référence |
|---|---|
| Moins de 2 ans — véhicule incessible | Prix **subventionné**, sans majoration |
| 2 ans et plus — marché normal | Prix subventionné **majoré de 30 %** (taxe douanière réintégrée) |

**Le taux de 30 % est celui des concessionnaires**, confirmé par Yassine Hadiji. C'est la référence retenue, et elle ne provient pas d'une déduction de ma part : les sources publiques ne permettaient pas de l'établir. Le portail des douanes (douane.gov.tn) refuse la consultation automatisée, les guides publics (automobile.tn) décrivent les conditions d'éligibilité sans détailler le barème, et le seul chiffre trouvé — « 25 ou 30 % des taxes douanières », sur argusautomobile.tn — porte sur le régime **FCR** (résidents à l'étranger), qui est autre chose.

Pour mémoire, j'avais tenté de le mesurer dans la base, qui contient les deux versions de plusieurs modèles : l'écart ressort à **+56 % en médiane sur 43 couples**. Ce chiffre n'est **pas** utilisable comme taux — la version normale est souvent bien mieux équipée, l'écart mélange donc l'exonération fiscale et la différence de finition, ce que confirme sa dispersion de +11 % à +102 %. Les couples les plus proches en équipement (VW Polo 2017 +11 %, Clio 2017 +15 %, Chery QQ 2016 +22 %) sont en revanche cohérents avec les 30 % retenus.

Le paramètre reste isolé dans `VVPARAMS.populaire` et se corrige d'une ligne si le taux évolue.

**Une discontinuité assumée.** À la levée de l'incessibilité, la valeur vénale *augmente* : sur une Chery QQ populaire, 21 200 DT à 1 an contre 26 100 DT à 3 ans. Ce n'est pas une anomalie de calcul — la majoration de 30 % dépasse deux années de dépréciation, et elle traduit un fait réel : le véhicule vient d'entrer sur un marché où il vaut ce que vaut son équivalent taxé. La fiche l'explique dans les deux états.

---

## 4. Calibration de la courbe sur le marché réel

**C'est le cœur de cette version.** Les paramètres de dépréciation étaient posés par hypothèse ; ils sont désormais ajustés sur des prix réels — mais avec une précaution méthodologique décisive.

### 4.1 Les annonces servent à la forme, pas au niveau

Un prix d'annonce est **majoré par le vendeur** : il ne peut pas servir de référence de valeur. On n'en tire donc que la **forme de la courbe de dévalorisation**.

Concrètement, la régression de log(F_âge) sur l'âge est faite avec une **constante libre** :

    log(rétention) = log(k) + âge × log(1 − taux)

La constante `k` absorbe la majoration vendeur et tout biais de niveau (mélange de finitions, base VEN) ; **seule la pente est retenue**. Le niveau, lui, reste ancré sur le prix catalogue, où F_âge(0) = 1 par construction.

La version précédente forçait la droite **par l'origine**. C'était une erreur : la pente devait alors absorber la majoration, et le taux en ressortait surestimé — 5,36 % au lieu de 4,94 %. La correction vient directement de votre remarque.

### 4.2 Source et volume

580 annonces relevées sur [autoprix.tn](https://www.autoprix.tn) le 28-29/08/2026, **une quarantaine de modèles** couvrant tous les segments : citadines et berlines grand public (Peugeot 208 et 301, KIA Picanto, Renault Clio et Symbol, Hyundai i10 et i20, Toyota Yaris, Seat Ibiza, Citroën C3, Dacia Sandero, Suzuki Swift, VW Polo), SUV (Duster, Qashqai, Tucson, Tiguan), et **haut de gamme** (BMW Séries 1/3/5/7 et X1/X3, Mercedes Classe A/C/E, CLA, GLA, GLC, GLE, Audi A3 et Q5, Volvo S60/XC60/XC90). Après nettoyage (prix fantaisistes type 1111, 12345, 850000, 999999, numéros de téléphone dans le champ prix, années aberrantes) : **562 annonces exploitables**.

### 4.3 Résultat

| Paramètre | Hypothèse initiale | Calibré |
|---|---|---|
| Dépréciation annuelle | 10 %/an, unique | **par gamme, voir §4.5** |
| Sensibilité kilométrique | 1,2 % / 10 000 km | **0,70 % / 10 000 km** |

Sur l'ensemble de l'échantillon, avant distinction de gamme, le taux ressortait à 4,94 %/an — contre 10 %/an posés initialement. L'occasion se maintient nettement mieux en Tunisie qu'en Europe : droits d'importation élevés, offre de neuf contrainte.

La constante estimée ressort à **×0,969**. Elle n'est pas reportée dans le modèle, conformément au principe ci-dessus. Sa valeur proche de 1 indique que la majoration vendeur et le biais de niveau (finitions médianes plus chères que le parc réellement en vente) se compensent à peu près — ce qui justifie *a posteriori* de ne pas avoir appliqué la minoration forfaitaire de 7 % de la version précédente, qui était une supposition.

### 4.4 Robustesse

- **Ajustement de la courbe** : écart absolu médian 8,1 % sur 19 tranches d'âge de 1 à 19 ans.
- **Jackknife par modèle** : en retirant un modèle à la fois, le taux ne varie qu'entre 4,56 et 5,36 %/an — amplitude 0,79 point. Aucun modèle ne porte le résultat à lui seul.

### 4.5 L'effet de gamme : d'abord mal testé, puis confirmé

Un premier test opposait **SUV et citadines** (4,44 % contre 7,10 %/an). Je l'avais écarté, à raison : les taux ajustés modèle par modèle allaient de −6,5 % (Toyota Yaris — une valeur qui *augmenterait* avec l'âge, donc absurde) à +8,3 %, deux citadines atteignaient le niveau des SUV, et l'échantillon SUV ne comptait que 2 modèles exploitables.

**Mais c'était le mauvais axe.** Un Dacia Duster est un SUV sans être haut de gamme ; une Mercedes Classe C est une berline haut de gamme. La variable pertinente est la **gamme**, pas la carrosserie — et l'échantillon ne contenait alors aucun véhicule premium. Après ajout de BMW, Mercedes, Audi et Volvo, et classement par **valeur à neuf** :

| Gamme (valeur à neuf) | n | modèles | Taux/an | Rétention à 10 ans |
|---|---|---|---|---|
| Grand public (< 100 000 DT) | 376 | 15 | **4,27 %** | 65 % |
| Haut de gamme (100–180 000 DT) | 140 | 12 | **6,98 %** | 48 % |
| Luxe / premium (≥ 180 000 DT) | 46 | 16 | **8,33 %** | 42 % |

Le classement est monotone et l'écart atteint **4 points de dépréciation annuelle** entre les extrêmes. Concrètement, à 10 ans et kilométrage identiques, une KIA Picanto conserve 65 % de sa valeur à neuf quand une Mercedes Classe C n'en conserve que 49 %.

**Contrôle d'artefact.** Cet écart pouvait n'être qu'un défaut d'ancrage de la VEN sur les modèles premium. Refait sur le seul sous-échantillon dont le prix catalogue existe **exactement** à l'année de mise en circulation (350 annonces, aucune extrapolation) : l'écart persiste à **2,83 points**, contre 2,98 sur l'échantillon complet. L'effet est réel.

**Robustesse.** Jackknife par modèle à l'intérieur de chaque palier : amplitude de 0,9 à 2,2 points selon la gamme — inférieure à l'écart entre paliers (~3 points). Contrairement au test SUV, la conclusion ne repose pas sur un modèle isolé.

La différence avec le premier test tient donc à deux choses : la bonne variable explicative, et un échantillon qui couvre réellement le haut de gamme.

### 4.6 L'indice se calibre désormais tout seul

L'indice de prix était une table que je recopiais à la main après avoir lancé un script. C'était le maillon fragile : à chaque mise à jour de `data.js`, quelqu'un devait penser à relancer le calcul et à reporter quinze taux.

**L'indice est maintenant recalculé au démarrage de l'application**, directement depuis `data.js`, par la même méthode des modèles appariés. Mettre à jour la base met l'indice à jour du même coup. Vérifié : le calcul automatique reproduit la table validée à la main à **0,005 point près** sur les quinze années.

Les valeurs mesurées restent inscrites dans le code, mais uniquement comme filet de sécurité si la base est absente ou trop pauvre pour que le calcul aboutisse.

**Détection automatique des réformes fiscales.** Les taux sont aussi calculés par énergie, et une mesure fiscale ciblée est reconnue à sa signature : un écart marqué au reste du marché. Le critère porte sur la **divergence**, pas sur le mouvement absolu — en 2018 l'essence a bougé de +19,9 %, mais tout le marché aussi (+19,0 %) : c'est de l'inflation, pas une réforme. À 5 points d'écart, une seule détection sur 2012-2026 : les hybrides rechargeables en 2026, à −20,4 points du marché. Aucun faux positif. Une prochaine réforme sera reconnue sans qu'on ait à la coder.

### 4.7 Taux prédit pour les années non encore publiées

L'année de calcul était figée à 2026. Elle suit maintenant le temps réel, sans jamais reculer sous l'année des données : `année de calcul = max(année système, dernière année de la base)`.

Concrètement, en janvier 2027 et avant que les tarifs ne soient mis à jour, l'âge des véhicules avance correctement — un véhicule de 2020 passe bien à 7 ans — et l'année manquante est actualisée par un **taux prédit**.

Ce taux est la **médiane des 5 dernières années mesurées**, soit **1,46 %/an** actuellement. La médiane plutôt que la moyenne parce qu'elle résiste aux à-coups isolés : ni la flambée de 2018 (+19 %, dévaluation du dinar) ni la chute de 2026 (réforme fiscale) ne l'emportent.

Il n'est jamais présenté comme une mesure. Dès que l'année de calcul dépasse la base, la fiche affiche : *« Base tarifaire arrêtée à 2026, année de calcul 2027. L'actualisation de l'année manquante utilise un taux prédit de 1,46 %/an, en attendant la mise à jour des tarifs officiels. »* La péremption devient visible au lieu d'être muette.

Les cinq occurrences de l'année qui traînaient en dur (borne du champ MEC, fin d'indice, axe des générations…) sont regroupées : la variable est établie en un seul endroit au démarrage.

---

## 5. Validation : valeur calculée vs marché

Comparaison par modèle et tranche d'âge, au kilométrage médian réellement observé, **contre le prix demandé brut** (aucune marge de négociation supposée). Le calcul, ancré sur le prix catalogue, devrait logiquement se situer un peu en dessous du prix demandé.

| Modèle | Âge | n | Marché (demandé) | Calculé | Écart |
|---|---|---|---|---|---|
| Seat Ibiza | 12-14 a | 5 | 29 800 | 29 800 | **0 %** |
| KIA Picanto | 3-5 a | 13 | 38 800 | 38 100 | **−2 %** |
| Citroën C3 | 3-5 a | 5 | 42 000 | 40 800 | **−3 %** |
| Audi A3 | 9-11 a | 5 | 54 900 | 53 200 | **−3 %** |
| Volkswagen Tiguan | 6-8 a | 4 | 90 000 | 92 500 | **+3 %** |
| Suzuki Swift | 3-5 a | 16 | 40 700 | 41 900 | +3 % |
| Nissan Qashqai | 9-11 a | 14 | 52 000 | 56 000 | +8 % |
| Volkswagen Golf | 12-14 a | 10 | 41 250 | 42 100 | +2 % |
| Renault Symbol | 15-17 a | 10 | 26 000 | 19 100 | −27 % |
| Hyundai i10 | 6-8 a | 4 | 34 000 | 23 500 | −31 % |
| Peugeot 208 | 3-5 a | 9 | 38 000 | 57 000 | +50 % |
| Citroën C3 | 6-8 a | 10 | 32 000 | 52 500 | +64 % |

*(extrait ; 55 groupes)*

**L'effet de la dépréciation par gamme est spectaculaire sur le haut de gamme** — c'est le premier passage de validation depuis son introduction :

| Modèle | Avant (taux unique) | Après (par gamme) |
|---|---|---|
| Volkswagen Tiguan 15-17 a | +86 % | **+13 %** |
| Volkswagen Golf 6-8 a | +52 % | **+31 %** |
| Volkswagen Tiguan 3-5 a | +18 % | **+8 %** |
| Nissan Qashqai 15-17 a | +45 % | **+12 %** |

Sur l'ensemble : l'écart absolu médian passe de **20,3 % à 12,9 %**, et la part des groupes à moins de 20 % d'écart de 48 % à **62 %**.

**Un point à surveiller** : l'écart médian est de **+7,6 %**, c'est-à-dire que le calcul se situe légèrement au-dessus des prix *demandés*. Comme ceux-ci sont déjà majorés par les vendeurs, l'estimation est vraisemblablement optimiste d'une dizaine de pour cent par rapport aux prix de transaction réels. Je ne l'ai pas corrigée : suivant votre principe, le niveau reste ancré sur le prix catalogue et non recalé sur des annonces. Le curseur de cotation permet de l'ajuster au cas par cas, et une correction systématique demanderait des prix de transaction réels — vos dossiers d'expertise.

### 5.1 D'où vient la dispersion restante

Elle ne vient ni de la courbe d'âge, ni de la gamme, mais de la **VEN propre à chaque modèle** — la qualité de son catalogue. En classant les modèles par écart :

| Modèles | Écart médian | Finitions au catalogue (médiane) |
|---|---|---|
| Bien estimés | ≤ 20 % | **10,5** |
| Mal estimés | > 20 % | **4** |

Les modèles mal estimés ont deux fois et demie moins de finitions référencées : aucune ne correspond vraiment au véhicule réel, et la VEN dérape. Cas extrême, la Hyundai i10 : 2 finitions, dernier tarif 2016 → −31 %.

### 5.2 Ce que cela implique en pratique

- Cette dispersion est un **majorant** de l'erreur réelle : la comparaison choisit automatiquement une finition médiane, alors que vous sélectionnez la finition exacte.
- Le **levier d'amélioration reste les données** : compléter les finitions des modèles peu couverts ferait plus pour la précision que tout nouvel ajustement de paramètre.
- Sur les modèles bien couverts, l'estimation est directement exploitable (0 à 12 % d'écart).

---

## 6. Ce qui reste non calibré

Désormais **mesurés sur données réelles** : l'indice de prix automobile, la réforme fiscale 2026, le taux de dépréciation, la sensibilité kilométrique.

Restent des estimations de départ, faute d'observations dédiées :

- les coefficients **F_usage** (décote professionnelle : société, location, taxi) — les annonces n'indiquent pas l'usage antérieur ;
- les coefficients **F_carburant** (préférence énergie sur l'occasion) ;
- l'échelle **F_état** (±10 %) — non observable dans une annonce ;
- la **valeur résiduelle plancher** (12 %, ne mord qu'au-delà d'environ 33 ans) ;
- les **seuils de la jauge de cotation**.

Tous sont regroupés et commentés dans le bloc `VVPARAMS` en tête du script, avec leur origine. Vos dossiers d'expertise passés, qui contiennent état et usage réels, permettraient de calibrer les trois premiers par la même méthode.

---

## 7. Ergonomie

### Refonte visuelle

L'application devait montrer qu'elle a changé de nature : d'un consultateur de prix neufs, elle est devenue un outil de cotation. Le travail visuel accompagne ce déplacement plutôt que de le décorer.

- **Palette retravaillée** — le bleu Material d'origine est remplacé par un bleu d'ancrage assombri et légèrement désaturé, plus proche d'un instrument technique. Les neutres sont volontairement biaisés vers le bleu plutôt que gris purs, pour que l'ensemble se lise comme une seule famille. Les couleurs sémantiques (correct / attention / défavorable) sont désormais des jetons distincts de l'accent : elles disent un état, pas une identité.
- **En-tête** — dégradé de profondeur au lieu d'un aplat, et sous-titre qui annonce la capacité nouvelle (« Prix neuf & valeur vénale ») plutôt que de répéter les compteurs.
- **Module de valeur vénale traité comme la pièce maîtresse** — surface propre en léger dégradé, filet d'accent à gauche, élévation, titre en couleur d'accent. Il ne se confond plus avec les autres sections de la fiche.
- **Chiffres en chasse fixe** (`tabular-nums`) partout où des montants s'alignent en colonnes — prix, deltas, écarts : les colonnes cessent de danser d'une ligne à l'autre.
- **Rayons et ombres** revus : ombres plus douces et en deux couches, angles légèrement plus généreux.

**Corrigé** : zoom tactile réactivé (il était bloqué, avec des textes de 8,5 px) · 16 tailles de police relevées, plus rien sous 9,5 px · bouton « ↑ Retour à la sélection » sur tablette · module de valeur vénale rendu découvrable (bouton amenant le focus sur le champ MEC au lieu d'une phrase passive) · champs réagencés sur mobile (kilométrage pleine largeur) · détail du calcul repliable pour ne plus noyer le montant · focus clavier visible, `<label>` liés, respect de `prefers-reduced-motion`.

**Analysé, non modifié** : entre 1101 et 1250 px, la barre du haut cumule logo, recherche, filtre MEC et 3 pastilles sans repli prévu · hauteur tactile des lignes de liste correcte mais pas généreuse.

---

## 8. Vérification

Suite automatisée `test_vv.js` : **26 assertions, toutes passantes** — ordre par usage, absence de double comptage, effet du kilométrage, décroissance stricte avec l'âge, échelle d'état, écart indice auto/IPC, application et non-réapplication de la réforme 2026, cohérence de la jauge, cas limites (véhicule neuf, kilométrage absent ou nul, MEC effacée), plus un parcours d'interface complet.

**Trois corrections ont été trouvées par les tests ou la confrontation au marché, pas par la relecture** : le malus kilométrique relatif (§3.6), la borne 2011 du champ MEC (§2), et le fait que la VEN devait être ancrée sur l'année de MEC (§3.3).

Reste non vérifié : le rendu visuel dans un navigateur. La liaison entre cette session et votre ordinateur ne s'est pas rétablie. Un aperçu est publié en artefact — vous pouvez l'ouvrir sur les trois formats.

---

## 9. Fichiers

| Fichier | Rôle |
|---|---|
| `app.html` | Application — formules refondues et calibrées, 4 bugs corrigés, ergonomie retravaillée |
| `data.js` | Base de prix, inchangée |
| `index_auto.js` | Calcul de l'indice de prix automobile depuis la base |
| `index_fuel.js` | Analyse des mouvements de prix 2026 par énergie |
| `marche_occasion.csv` | Les 580 annonces relevées (données brutes de calibration) |
| `calibrate4.js` | Calibration de la courbe (constante libre), jackknife |
| `calibrate5.js` | Test de la dépréciation par gamme, contrôle d'artefact, robustesse |
| `validation.js` | Comparaison valeur calculée vs marché, par modèle |
| `predict.js` | Prédictions de référence sur 18 modèles courants |
| `test_vv.js` | Suite de tests, curseur de cotation inclus (`npm install jsdom` puis `node test_vv.js`) |

---

## Sources

- Prix de l'occasion : [autoprix.tn](https://www.autoprix.tn) (relevé du 28/08/2026)
- Inflation générale (comparaison) : [macrotrends](https://www.macrotrends.net/countries/TUN/tunisia/inflation-rate-cpi) · [managers.tn 06/01/2024](https://managers.tn/2024/01/06/le-taux-dinflation-en-2023-grimpe-a-93-contre-83-en-2022/) · [kapitalis.com 07/01/2025](https://kapitalis.com/tunisie/2025/01/07/tunisie-un-taux-dinflation-de-7-pour-lannee-2024/) · [irbe7.com 06/01/2026](https://irbe7.com/actualites/articles/inflation-en-tunisie-5-3-en-2025-contre-7-en-2024/695d0c60bd06938ad4c0e018)
- Réforme fiscale 2026 : [automobile.tn 26/10/2025](https://www.automobile.tn/fr/magazine/actu/2025-10-26-projet-de-loi-de-finances-2026-la-tunisie-accelere-la-transition-vers-les-vehicules-hybrides-rechargeables.html) · [managers.tn](https://managers.tn/2026/03/17/voitures-hybrides-et-electriques-ce-que-vous-paierez-moins-cette-2026-en-tunisie/) · [africanmanager.com](https://africanmanager.com/le-gouvernement-deploie-un-arsenal-dincitations-pour-atteindre-50-mille-vehicules-en-2030/) · [webmanagercenter.com 17/12/2025](https://www.webmanagercenter.com/2025/12/17/558022/la-tribune-de-lia-fiscalite-verte-quand-la-loi-de-finances-2026-penalise-la-transition-quelle-pretend-accelerer/)

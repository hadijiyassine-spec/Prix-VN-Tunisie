# Prix VN Tunisie — rapport technique (v21)

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

### 3.11 bis  Téléphone : la marque n'était nulle part

Signalé par Yassine sur capture : à l'ouverture sur téléphone, **rien n'indique où choisir la marque**. L'écran affiche un hamburger, puis les blocs Modèle et Finition, et un message « ← Sélectionnez une marque » dont la flèche désigne une colonne de gauche qui, sur téléphone, n'existe pas.

**La cause.** La colonne des marques est masquée sous 768 px, remplacée par un tiroir ouvert depuis le hamburger. Une barre marque existait bien — mais en `display:none`, rendue visible seulement par une classe ajoutée *après* le premier choix. L'écran d'accueil, c'est-à-dire exactement le moment où l'utilisateur cherche par où commencer, était donc le seul où la première étape n'avait aucune représentation.

**Corrections :**

- **La barre marque est permanente** sur téléphone, avec deux états : « Choisir une marque · Parcourir » en accent plein tant que rien n'est choisi, puis les initiales, le nom de la marque et « ⇄ Changer » une fois le choix fait. C'est elle, et non le hamburger, qui porte la première étape.
- **C'est un vrai bouton**, avec un libellé accessible qui suit l'état, et un anneau de focus au clavier — c'était un `div` avec un `onclick`.
- **Les trois colonnes sont numérotées** ① Marque ② Modèle ③ Finition. La numérotation encode ici un ordre réel — on ne peut pas choisir un modèle avant une marque — et chaque pastille change d'aspect selon qu'elle est franchie, active ou pas encore ouverte.
- **Les invitations ne désignent plus une colonne absente** : la flèche pointe à gauche sur grand écran, vers le haut sur téléphone, et le texte devient « Choisissez d'abord une marque ».

Dix contrôles automatiques couvrent ce parcours, dont l'absence de toute dépendance à l'ancienne classe d'affichage conditionnel.

---

### 3.10 bis  La dévalorisation, chiffrée à l'écran

Signalé par Yassine sur une BMW i4 eDrive40 : la majoration de dévalorisation des véhicules à batterie n'apparaissait nulle part sous forme de chiffre. Une pastille annonçait « ⚡ Décote VE renforcée » sans jamais dire **de combien**, et le taux ne figurait que dans le bloc replié « Détail du calcul ». Un expert doit pouvoir citer ce taux et le défendre : il ne peut pas rester sous un pli.

Le panneau batterie porte désormais la ligne, à son propre rang, séparée du reste par un filet :

> **DÉVALORISATION RETENUE** — **9,00 %/an**
> luxe / premium 8,33 % **+8 %** au titre du véhicule à batterie → **×0,910** à 1 an

Trois éléments, et pas un de plus : le taux appliqué, sa décomposition entre le taux de gamme et la majoration, et le facteur d'âge qui en résulte. Sur un véhicule thermique la même ligne indique « aucune majoration ».

Le cas a par ailleurs mis en évidence un point à dire franchement : **la BMW i4 n'a pas de capacité batterie renseignée** dans la base, comme 60 des 130 finitions électriques. La part de la batterie y est donc forfaitaire (25 %), et le coût de remplacement ne peut pas être affiché. Le panneau l'indique explicitement — « capacité non renseignée dans la base, part forfaitaire » — plutôt que de laisser croire à une mesure.

---

### 3.10 ter  Repère de version

Une livraison a été rejetée par Yassine avec la remarque « aucun changement des codes de fichier n'a été aperçu ». Elle était fondée : le même `app.html` avait été renvoyé deux fois, et surtout **rien dans l'application ne permettait de savoir quelle build s'exécutait**. Un fichier remplacé mais servi depuis le cache du navigateur était indiscernable de l'ancien.

Un badge de version figure maintenant dans la barre du haut, à côté du titre, sur tous les supports. Il porte le numéro de build, et son infobulle la date et le contenu de la version ; le tout est également écrit dans la console au démarrage. Quatre contrôles garantissent qu'il ne disparaîtra pas — dont la vérification qu'il n'est pas masqué sur téléphone.

---

### 3.10 quater  Hybrides simples : une jauge impossible à remplir

En vérifiant le déploiement, un défaut de cohérence interne est apparu. Deux endroits décidaient séparément de ce qu'est un « véhicule à batterie » :

- le **calcul** reconnaissait `elec`, `phev` **et `hev`** — un hybride simple obtenait donc un panneau batterie ;
- le **formulaire** ne reconnaissait que `elec` et `phev` — il n'offrait aucun champ d'état de santé.

Résultat sur un Chery Tiggo 4 HEV : une jauge batterie affichée, et aucun moyen de la renseigner. Le défaut vient de la duplication elle-même, pas d'un oubli ponctuel : deux listes séparées finissent toujours par diverger.

La correction supprime la duplication — une fonction unique `aBatterie(fc)` sert des deux côtés — et un test parcourt **toutes les classes d'énergie de la base** (essence, diesel, elec, phev, hev) en vérifiant que le formulaire et le calcul sont d'accord sur chacune.

---

### 3.10 quinquies  Généralisation : tous les régimes douaniers de faveur

La voiture populaire n'était qu'un cas particulier. La même règle vaut pour **tout véhicule ayant bénéficié d'un avantage douanier** (Yassine Hadiji) : FCR, corps diplomatique et consulaire, taxis et louages sous décret, agences de voyages.

#### Un point de structure qui change tout

**Le régime n'est pas une propriété du modèle, c'est une propriété du véhicule.** Il figure sur la carte grise, pas au catalogue : une Picanto ordinaire peut avoir été importée sous FCR. Le régime se **saisit** donc ; le repérage par le nom du modèle ne sert plus qu'à pré-sélectionner « populaire ».

#### Un second point, qui inverse la logique selon les régimes

D'où vient l'avantage ?

- **Voiture populaire** — le **catalogue lui-même** est subventionné. La valeur à neuf doit donc réintégrer la taxe une fois le délai passé.
- **FCR, diplomatique, taxi, agence** — le véhicule est un modèle ordinaire dont le tarif catalogue **inclut déjà la taxe**. L'avantage a porté sur l'acheteur, pas sur le prix affiché. Y appliquer une majoration la compterait deux fois.

C'est le piège de cette généralisation, et il est verrouillé par un test : *seule* la populaire porte l'attribut « catalogue subventionné », et la majoration ne s'applique qu'à elle.

#### Ce qui a pu être documenté, et ce qui ne l'a pas été

| Régime | Délai | Assiette de la taxe | Statut |
|---|---|---|---|
| Voiture populaire | 2 ans | Poids (10,9 DT/kg) | Confirmé |
| FCR — exonération totale (RS) | 2 ans | **25 % de la valeur à neuf** | Confirmé |
| FCR — série TU (droits acquittés) | — | **Aucune** | Confirmé |
| Corps diplomatique / consulaire | **aucun** | Poids | Confirmé |
| Taxi / louage sous décret | 5 ans | Poids | Confirmé |
| Agence de voyages | 5 ans | Poids | Confirmé |

#### Le régime FCR, repris tel quel du guide officiel

Sur demande de Yassine, le guide automobile.tn fait désormais foi. Il **corrige trois points que j'avais mal posés**, dont deux venaient de sa propre indication antérieure — preuve qu'un texte de référence vaut mieux qu'un souvenir, y compris celui d'un praticien :

1. **L'incessibilité de la série RS est de durée ILLIMITÉE**, pas de deux ans. « Exonération totale des droits et taxes dus, avec interdiction de cession pour une durée illimitée. » Le véhicule reste hors marché tant qu'il n'est pas régularisé ; il n'y a aucun délai à laisser courir. Dans le calcul, `incessibilite: Infinity` reproduit cela exactement — un RS ne bascule jamais en « délai écoulé », quel que soit son âge, ce qu'un test vérifie à 2, 6 et 11 ans.
2. **La régularisation porte sur les droits et taxes, pas sur la valeur à neuf, et son taux est de 30 %**, non de 25 % : « seulement 30 % des droits et des taxes dus » pour lever l'interdiction de vente. Les 25 % concernent l'autre option — la franchise **partielle** en série TU — et se lisent également sur les droits.
3. **C'était une mesure transitoire, ouverte jusqu'au 31 décembre 2025.** Passée cette date, la fiche avertit au lieu d'appliquer un taux qui n'a peut-être plus cours.

Conséquence pratique : les droits et taxes dus dépendent de la valeur en douane, de la cylindrée et du barème du droit de consommation. Ils **ne se déduisent pas** d'un prix catalogue. Aucune estimation n'est donc fabriquée pour un FCR RS — le décompte de la recette des douanes est exigé, et son absence est signalée comme la réserve la plus lourde de l'indicateur de confiance.

---

### 3.15  Indicateur de confiance : dire sur quoi le chiffre repose

La dispersion résiduelle — 12,9 % d'écart absolu médian par modèle, dont 21 groupes sur 55 au-delà de 20 % — ne vient pas de la formule mais de l'épaisseur des données. Mesuré sur la base :

- **40 % des modèles n'ont qu'une seule finition** au catalogue ;
- **24 % ont un tarif qui s'arrête avant 2020** ;
- **72 % des véhicules à batterie n'ont pas de capacité renseignée** ;
- l'ancrage sur le millésime est exact dans 54 % des cas seulement, proche dans 31 %, corrigé par l'enveloppe dans 15 %.

Plutôt que d'afficher partout la même précision apparente, la fiche **nomme les fragilités**. Onze réserves possibles, pondérées, classent l'estimation en *bien étayée*, *à confirmer* ou *fragile* — avec le détail en toutes lettres : « un seul niveau de finition au catalogue pour ce modèle », « tarif catalogue arrêté avant 2013 », « état de santé de la batterie non mesuré », « décompte des douanes indispensable et absent »…

**L'indicateur a été validé, pas seulement construit.** Confronté aux 564 annonces exploitables du fichier de marché, il prédit réellement l'erreur :

| Niveau | n | Écart absolu médian au prix réel |
|---|---|---|
| Bien étayée | 211 | **13,4 %** |
| À confirmer | 315 | **16,4 %** |
| Fragile | 38 | **26,1 %** |

L'écart est **1,95 fois plus grand** sur les estimations que l'indicateur juge fragiles. Il n'est donc pas décoratif : il mérite sa place dans une fiche que l'expert doit défendre. La répartition n'est pas dégénérée non plus — 27 % bien étayées, 60 % à confirmer, 14 % fragiles.

Il ne corrige rien, et c'est délibéré : il avertit. Les réserves qu'il nomme sont aussi la feuille de route de ce qui améliorerait la base — compléter les finitions des modèles pauvres, rafraîchir les tarifs figés, renseigner les capacités batterie.

---

#### Vérification sur les textes de loi

Yassine a demandé que ces valeurs soient vérifiées avant d'être retenues — à raison, je les avais implémentées d'abord. La vérification, menée sur les textes qu'il a nommés, a **confirmé une règle que j'avais signalée comme incertaine** et **corrigé une affirmation de ma part** :

- **La TVA de 7 % s'applique bien aux hybrides rechargeables comme aux électriques.** J'avais noté cette extension comme « moins fermement sourcée ». L'analyse de la loi de finances 2026 donne le barème complet et identique pour les deux énergies — droit de consommation 0 %, TVA 7 % contre 19 %, droits de douane 0 %, carte grise et vignette réduites de moitié — et précise que « les véhicules hybrides rechargeables sont désormais alignés sur le même régime fiscal que les voitures 100 % électriques ». C'est la **rechargeabilité** qui déclenche le régime, pas l'absence de moteur thermique. Le recoupement tient : les tarifs PHEV de la base ont chuté de 24,7 % en 2026, davantage que toute autre énergie.

- **Il n'y a PAS de divergence sur le FCR RS, contrairement à ce que j'avais écrit.** Quatre sources publiques donnent « 25 ou 30 % » — mais elles décrivent le FCR **partiel à l'importation** (série TU), assis sur les **droits et taxes**. C'est une autre opération. Le coût de régularisation d'un véhicule **déjà en RS** n'est documenté nulle part : auto-prix.tn indique explicitement ne pas le donner. Les 25 % de la valeur à neuf ne sont donc pas contredits — ce sont deux « 25 % » qu'il ne faut pas confondre. J'ai corrigé le commentaire du code, qui annonçait à tort une divergence assumée.

- **Le régime taxi / louage / transport rural est le seul dont les textes ont pu être lus.** Loi n° 2011-7 (LF 2012, art. 19 à 23) et décret n° 2012-5 : exonération du droit de consommation et TVA réduite, **une fois tous les cinq ans** — ce qui confirme le délai retenu. Le taux réduit était de 6 %, porté à **7 % au 1er janvier 2018**. Et surtout, un point qui intéresse directement l'expertise : **le renouvellement du bénéfice peut intervenir avant le terme en cas d'endommagement du véhicule, de vol, ou de changement de catégorie du permis.** Un taxi détruit n'est donc pas bloqué comme l'est le propriétaire d'une populaire, qui doit attendre sept ans. La fiche le signale désormais.

- **L'agence de voyages n'est pas couverte** par ces textes : son régime reste appuyé sur la seule pratique.

Chaque régime porte maintenant sa **source** — `publie` ou `pratique` — et un test vérifie qu'aucun ne l'omet. Un rapport d'expertise doit pouvoir citer ses appuis.

Trois de ces règles ont demandé une correction de ce que j'avais posé, et deux d'entre elles étaient des erreurs de fond :

- **Le FCR en série TU n'est pas un régime de faveur.** C'est un véhicule tunisien qui **a acquitté ses droits** (25 % pour l'essence ≤ 2000 cm³, le diesel ≤ 2500 cm³, l'hybride et l'électrique ; 30 % au-delà). Il se traite comme tout véhicule TU. Lui appliquer une taxe d'épave aurait fait payer une seconde fois un assuré déjà en règle. Le régime reste proposé dans la liste, pour que l'expert puisse le consigner et voir écrit qu'il n'emporte aucune conséquence.
- **Le diplomatique n'a aucun délai.** Le véhicule est assimilé à un **véhicule étranger** disposant d'une autorisation permanente de circulation en Tunisie. Il n'y a donc pas de délai à laisser courir : les droits deviennent exigibles dès la sortie du régime.
- **Le FCR RS ne se régularise pas à 30 % des droits mais à 25 % de la valeur à neuf.** Les guides publics — automobile.tn, sayarti.tn — parlent de « 25 ou 30 % des **droits de douane** » selon la cylindrée ; ce n'est pas la même assiette, et cela donne un montant trois à quatre fois moindre. C'est la lecture de l'expert qui est retenue : il voit les décomptes réels, les guides compilent des textes. Un échelonnement selon l'âge reste à vérifier.

#### Électriques et rechargeables : la charge se résume à la TVA

Sur un véhicule électrique ou hybride rechargeable, il n'y a plus de droit de douane : la charge se réduit à une **TVA de 7 %** — pour les particuliers, les régimes RS et les concessionnaires indifféremment.

Cette règle intervient aux **deux** endroits où une charge douanière apparaît, et n'en oublier aucun était le vrai enjeu :

1. la réintégration de la taxe dans la valeur à neuf d'une populaire au-delà de son délai — 7 % au lieu de 30 % si le véhicule est rechargeable ;
2. la taxe de régularisation due à la mise à l'épave, **quelle que soit** l'assiette normalement prévue par le régime : la TVA prime sur le tarif au poids comme sur les 25 % de la valeur à neuf.

La négliger aurait réclamé à un assuré roulant en électrique une taxe calculée sur un barème thermique qui ne le concerne plus. Douze assertions couvrent les quatre régimes croisés avec les deux énergies.

#### Le décompte réel prime toujours

Un champ **« Montant du décompte »** a été ajouté : dès qu'il est renseigné, il l'emporte sur toute estimation, quelle que soit l'assiette. Un expert qui tient la pièce de la recette des douanes n'a aucune raison de se contenter d'un calcul.

La bascule « mise à l'épave » apparaît désormais pour **tout régime de faveur**, jamais pour le droit commun — et cocher le droit commun ne peut produire aucune taxe, ce qu'un test vérifie.

---

### 3.12  F_état : le jugement visuel de l'expert, et sa règle

Règle de métier posée par Yassine Hadiji : **un sinistre mal réparé se décèle et se sanctionne — mais un véhicule réparé selon les normes du constructeur, avec une finition quasi parfaite, ne subit aucun malus.** Le passé accidenté ne se déduit pas par principe ; seul le constat d'une réparation défectueuse le fait.

L'échelle précédente (Mauvais / Moyen / Normal / Bon / Très bon) était muette là-dessus et laissait l'expert deviner s'il devait pénaliser une réparation propre. Les libellés portent désormais la règle, chacun avec sa ligne d'aide affichée sous le champ :

| Niveau | Ce qu'il désigne | Effet |
|---|---|---|
| Réparation non conforme | jeux de tôlerie, écarts de teinte, reprises apparentes | −10 % |
| Réparation visible | travail correct mais finition imparfaite, ou usure marquée | −5 % |
| **Conforme — aucun malus** | véhicule sain, **ou réparé aux normes constructeur** | **0** |
| Bon entretien | usure inférieure à la moyenne de son âge | +5 % |
| Exceptionnel | présentation remarquable pour son âge | +10 % |

Le barème lui-même reste **posé**, non calibré : seuls des dossiers d'expertise clos permettraient de le mesurer.

---

### 3.13  Véhicules électriques : la courbe européenne, pas la tunisienne

Correction d'analyse apportée par Yassine : **un VE tunisien suit obligatoirement la courbe européenne.** Il est vendu au même coût qu'en Europe — droits de douane supprimés, TVA à 7 % — et roule dans des conditions comparables. Il ne bénéficie donc **pas** du soutien de valeur qui tient le marché tunisien de l'occasion thermique, lequel vient précisément des droits d'importation élevés et de l'offre de neuf contrainte.

Appliquer aux VE le taux d'une gamme thermique tunisienne (4,27 à 8,33 %/an) majoré de 8 %, comme le faisait la version précédente, était une erreur : ces taux mesurent une rareté qui n'existe pas pour l'électrique.

**Le taux brut, mesuré à l'étranger** — décote rapportée au prix d'achat d'origine :

| Source | Horizon | Décote | Taux annuel |
|---|---|---|---|
| Cox Automotive (nov. 2025) | 3 ans | 38–42 % | 15,7 %/an |
| iSeeCars (1,1 M de ventes) | 5 ans | 49,1 % | 12,7 %/an |
| Recharged (marché US 2025-26) | 5 ans | ~59 % | 16,4 %/an |

Médiane retenue : **15 %/an**.

**Un piège réel, mais que j'avais mal chiffré.** Une étude de valeur résiduelle rapporte la valeur au prix d'achat *d'origine* : elle englobe donc le mouvement du prix du **neuf** survenu depuis. Notre valeur à neuf étant déjà ramenée au prix du jour, il faut retrancher cette part du taux brut, sans quoi elle serait comptée deux fois.

J'avais posé **5 %/an**, en croyant que les prix du neuf électrique avaient beaucoup baissé en Europe. **C'est faux.** D'après Transport & Environment (mars 2026), le prix moyen d'un VE neuf dans l'UE a **augmenté de 5 000 € entre 2020 et 2024**, et n'a baissé qu'en 2025 — de 1 800 € (−4 %), à 42 700 €, première baisse depuis 2020. Sur la fenêtre des études de valeur résiduelle, le prix du neuf européen est donc à peu près **stable**, et non en chute.

En ne retranchant que la baisse réellement constatée — 1,3 %/an lissés — il reste **13,8 %/an** au lieu de 10,1 %. La correction est lourde, mais elle va dans le sens de la règle posée par Yassine : un VE tunisien suit la courbe européenne, et cette courbe est raide. Un test verrouille désormais le fait que cette correction reste marginale, pour qu'on ne retombe pas dans l'hypothèse d'un neuf en chute libre.

L'effondrement tarifaire tunisien de 2025-2026 n'est pas compté ici : il agit sur la valeur à neuf (indice par énergie et plafond du prix du jour), pas sur le rythme de dévalorisation. Les deux effets sont multiplicatifs et indépendants.

**Une conséquence inattendue, et un défaut trouvé.** Porter la décote de 10,1 à 13,8 %/an fait atteindre le plancher de valeur résiduelle dès **13 ans** au lieu de 18. Cinquante inversions d'âge sont aussitôt réapparues sur les millésimes anciens. Le diagnostic n'était pas celui que je croyais : ni l'ancrage ni l'enveloppe n'étaient en cause — une fois au plancher, `F_âge` cesse de croître avec le millésime et la valeur à neuf est identique, si bien que **le seul bonus kilométrique décidait du classement**, et il favorise le plus vieux (son kilométrage normal de référence est plus élevé).

La règle ajoutée est aussi la bonne économiquement : **au plancher de valeur résiduelle, il n'y a pas de prime au faible kilométrage.** Un véhicule parvenu à sa valeur de carcasse ne se revend pas 15 % plus cher parce qu'il a peu roulé. Le malus, lui, continue de s'appliquer : un kilométrage démesuré déprécie encore. Zéro inversion restante, et la validation marché s'est **améliorée** au passage — écart absolu médian de 12,9 % à **12,1 %**, biais médian de +7,3 % à +6,2 %, 35 groupes sur 55 sous les 20 % contre 34.

**Les deux corrections locales, et deux seulement :**

- **Le climat.** La Tunisie est plus chaude : +0,4 point de dégradation batterie par an (Geotab). L'effet sur la *valeur* est cette perte de capacité supplémentaire pondérée par le poids de la batterie — un surcroît d'usure ne coûte que ce que vaut la pièce. Soit +0,1 point pour une batterie pesant 25 % de la valeur.
- **L'infrastructure de recharge.** Environ **200 bornes pour un peu plus de 400 véhicules** en circulation, objectif de 10 000 bornes en 2030 (ANME, avril 2026). Cette rareté pèse sur la **demande**, pas sur le rythme d'usure : elle est portée par `F_carburant` (elec 0,95), pas par le taux de dépréciation. Ce coefficient trouve ainsi sa justification, même s'il reste posé.

Taux final pour un électrique courant : **10,1 %/an**, contre 9,0 % dans la version précédente et 8,33 % pour un thermique de même gamme. Un plancher garantit qu'un véhicule à batterie ne se déprécie jamais plus lentement que son équivalent thermique. La fiche affiche la décomposition complète : *« courbe européenne 15 % − 5 % déjà portés par le prix du jour + 0,1 % climat »*.

---

### 3.14  Le panneau de résultat en double — et ce que le module « épave » n'avait rien à faire là

Deux défauts signalés le même jour, l'un d'affichage, l'autre de conception. Ils se sont révélés liés.

#### Le doublon : un `</div>` de trop

La fiche apparaissait **deux fois** dans la colonne de droite, à l'identique. La cause est arithmétique : le bloc de saisie « mise à l'épave » émettait **une balise fermante de plus qu'il n'en ouvrait**. Ce `</div>` orphelin fermait `.vv-fields` trop tôt ; le `</div>` prévu pour `.vv-fields` fermait alors `#vvSect`, et **`#vvOut` — le conteneur du résultat — se retrouvait à l'extérieur de la section**, comme frère et non comme enfant.

C'est ce déplacement qui produisait le doublon. Cocher une case appelle `relance2`, qui remplace `#vvSect` par son `outerHTML` : le nouveau balisage apportait son propre `#vvOut`, pendant que **l'ancien, devenu orphelin, restait dans la page**. Chaque basculement ajoutait donc un panneau de plus. Le montant, la jauge, l'indicateur de confiance : tout se dupliquait.

Deux enseignements. D'abord, l'imbrication ne se voyait qu'à l'état où les champs poids et tarif étaient affichés — l'un des rares états de ce formulaire, et celui de la capture. Ensuite, un navigateur *répare* silencieusement un balisage déséquilibré, chacun à sa façon ; jsdom l'avait réparé autrement et n'avait rien montré. **Un test structurel a donc été ajouté** : pour chaque état du formulaire (ordinaire, populaire, à batterie, avec et sans privilège), `renderVVBlock` doit rendre **un seul élément racine**, avec autant de balises ouvrantes que de fermantes, et `#vvOut` doit se trouver **à l'intérieur** de `#vvSect`. Un second test bascule les cases plusieurs fois de suite et vérifie qu'il ne reste qu'un panneau.

#### Le module « épave » : hors sujet, et retiré

Le titre du montant basculait sur « **Indemnité — valeur vénale + taxe douanière** » dès qu'une taxe était calculée. Rappel de Yassine : *« c'est une plateforme pour calculer la valeur vénale, aucune relation avec une indemnité quelconque »*. C'est juste, et cela tranche une ambiguïté que je traînais depuis plusieurs versions.

La ligne est nette :

- **la taxe de régularisation due à la mise à l'épave est une charge du règlement de sinistre** — elle ne dit rien de ce que vaut le véhicule ;
- **le régime douanier, lui, change bel et bien la valeur vénale**, parce qu'il change la base de calcul (§ 3.17).

Le premier est parti, le second reste. Ont été supprimés : la case « mise à l'épave », les champs poids, tarif au kilo et montant du décompte, le calcul de la taxe et ses quatre assiettes, la décomposition sous le montant, la pastille, la notice, la réserve « décompte manquant » de l'indicateur de confiance, et les paramètres correspondants. Le titre du montant est désormais fixe : **« Valeur vénale estimée »**.

Un test garde la trace du retrait : treize identifiants (`taxePop`, `vvMarche`, `taxeBase`, `vvEpave`, `Indemnité`…) ne doivent réapparaître nulle part dans le fichier.

#### Nettoyage entraîné

- Sept règles `.spec-fuel` : composant retiré de longue date, feuille de style jamais nettoyée.
- `.vi-badge.fuel-ess` ne s'appliquait **jamais** : `fuelClass()` renvoie `essence`, pas `ess`. La pastille des véhicules à essence s'affichait en gris neutre depuis toujours, au lieu de sa couleur. Renommée.
- Les écouteurs, l'état de saisie et les fonctions d'accès aux champs supprimés.

Le fichier passe de 196 à 179 Ko. Un script de détection (`deadcode.js`) a été ajouté à la batterie : il liste les classes CSS jamais posées, les fonctions jamais appelées et les identifiants jamais lus.

---

### 3.21  Le curseur de cotation devait repartir du conseil

Défaut signalé par Yassine, capture à l'appui : le curseur s'affichait **décalé de son repère de conseil** — le trait vertical clair sur la piste — sans que rien dans la consultation en cours ne le justifie.

La cause tient à un choix délibéré, mal borné. L'état du module (`vvInputs`) vit **au niveau du module** et non de la fiche, pour que l'expert n'ait pas à ressaisir kilométrage, état et usage à chaque clic sur une finition. L'ajustement manuel du curseur y était rangé avec le reste — et survivait donc lui aussi au changement de véhicule.

Or ce n'est pas la même chose. Un kilométrage se reporte d'un véhicule à l'autre ; **un jugement de cotation, non** : il porte sur un exemplaire précis, sur ce que l'expert a vu de celui-là. Le conserver silencieusement, c'est appliquer à une voiture l'appréciation portée sur une autre.

Le remède est une clé d'appartenance : l'ajustement est étiqueté avec la finition, le modèle et l'année de 1ère MEC sur lesquels il a été porté. Dès que l'un des trois change, l'ajustement tombe et le curseur revient sur le conseil calculé.

Les trois champs de saisie remettaient déjà le curseur au conseil (`relance`), pour une raison différente mais convergente : modifier le kilométrage, l'état ou l'usage **change le conseil lui-même**, et un ajustement antérieur deviendrait trompeur. Ce qui manquait, ce sont les deux entrées qui ne passent pas par ces champs : **le changement de véhicule** et **le changement d'année de 1ère MEC**.

Un test parcourt désormais la séquence complète — ouverture, déplacement du curseur, autre finition, autre modèle, autre millésime — et vérifie à chaque étape que l'ajustement est tombé, puis que le curseur et son repère de conseil sont bien **superposés**.

---

### 3.20  Changements de phase : une série tarifaire, deux véhicules différents

Défaut signalé par Yassine sur la RAV 4 Hybride : *« le prix affiché est celui de la phase actuelle alors qu'elle est différente de la phase qui la précède »*. Il a raison, et le défaut est structurel.

#### Le mécanisme

La base suit **une finition par son nom** et empile ses tarifs successifs. Quand le concessionnaire remplace le modèle par sa génération suivante en gardant le même intitulé, les deux véhicules se retrouvent dans la **même série**. Le tarif du jour devient celui du nouveau modèle, et il sert alors de référence à des millésimes qui n'ont rien à voir avec lui.

Sur la RAV 4 Hybride 2.5 L, la série ne fait qu'une seule entrée de 2019 à 2026 :

| Date | Tarif | Ce que c'est réellement |
|---|---|---|
| 07.09.2019 → 09.09.2025 | 159 000 → 168 500 DT | **XA50**, 5ᵉ génération |
| 05.01.2026 | 189 800 DT | XA50, après la loi de finances 2026 |
| 04.03.2026 | 184 800 DT | XA50, dernier tarif connu |
| **14.06.2026** | **204 800 DT** | **XA60, 6ᵉ génération** |

Une RAV 4 Hybride de 2022 était donc affichée avec un prix catalogue de **204 800 DT** — le prix d'une voiture qui n'existait pas encore — et son plafond de valeur vénale était calé sur ce montant.

`GENS`, déjà présent dans la base, décrit des générations pour 117 modèles sur 739 — mais **uniquement pour l'affichage** (frise, badge, encadré des caractéristiques). Rien ne s'en servait dans le calcul, et sa couverture s'arrête à 2024. La RAV 4 Hybride n'y figure même pas.

#### La vérification, étendue à tout le catalogue

Plutôt que de corriger un cas, j'ai cherché **tous** les modèles susceptibles du même défaut. Le repère n'est pas la hausse absolue mais l'**écart au mouvement du marché** de la même énergie la même année — une hausse qui suit le marché n'a rien de suspect.

Sur les **2 522 finitions**, 655 présentent un tel saut ; en ne retenant que ceux qui aboutissent au **tarif courant d'un modèle encore vendu**, il reste **20 modèles**. Chacun a été vérifié sur internet (automobile.tn, sayarti, tunisie-tribune, ilboursa, largus, autoevolution).

**Résultat : un seul cas sur vingt est un vrai changement de génération.**

| Verdict | Modèles |
|---|---|
| **Nouvelle génération** | Toyota RAV 4 Hybride (XA60, lancée le 14.06.2026 à 204 800 DT) |
| Changement de millésime / définition produit | Land Rover Defender 110, Range Rover Velar, VW Crafter |
| **Substitution de finition** sous le même nom | Seat Ibiza (Style → Move), Seat Leon (Emotion retirée), Mercedes Classe A (180 → 200), Opel Crossland (Edition → Elegance) |
| Fin de campagne promotionnelle | BMW Série 2 Gran Coupé, Série 3, Série 4, X1, Mini Cooper 3 et 5 portes, Mini Countryman |
| Révision tarifaire de l'importateur | Mercedes GLE et GLE Coupé, EQS Berline et EQS SUV, VW Caddy Cargo, DFSK K01S, Peugeot Landtrek |

Deux enseignements de méthode, qui valent pour les prochaines mises à jour :

- **Une hausse de prix, même de 48 %, ne prouve rien.** Le Defender 110 P400 S bondit de 364 200 à 540 000 DT ; ce n'est pas une nouvelle génération (la L663 court depuis 2020) mais un changement de millésime avec montée en équipement — automobile.tn a d'ailleurs créé une fiche distincte, au slug `…-p400-2025-s`.
- **Les tarifs tunisiens intègrent des promotions récurrentes** (« Summer Days » chez BMW, « MINI Days »). Une remontée de tarif est souvent la fin d'une promo, pas une hausse. Le 218 Pack M est aujourd'hui affiché à 174 900 DT barré 206 900 DT : les deux valeurs de la série sont le même véhicule.

#### Ce qui a été implémenté

**Une table `PHASES`** tient les frontières **vérifiées**, chacune avec sa date, son motif et sa source. Elle ne contient aujourd'hui qu'une entrée — la RAV 4 Hybride — et c'est délibéré : on n'y inscrit qu'un changement de produit établi.

Trois conséquences dans le calcul :

1. **L'ancrage** — `venSerie` ne cherche le tarif d'un millésime que **dans sa propre phase**. Le tarif de la génération suivante ne dit rien de ce que valait celle-ci.
2. **Le plafond « prix neuf du jour »** — pour un véhicule d'une phase révolue, le prix de remplacement à neuf est le **dernier tarif de sa propre phase, actualisé**, et non celui du modèle qui lui a succédé. La RAV 4 de 2022 est désormais plafonnée à 184 800 DT et non à 204 800.
3. **L'affichage** — le bloc de prix met en avant le tarif de la phase du véhicule, avec un encadré qui nomme le tarif du jour, la date de la frontière et sa source. Sans année de MEC saisie, rien ne change : c'est bien le tarif du jour qui s'affiche.

**Le millésime à cheval** reçoit un traitement à part. Un véhicule de 2026 peut relever de l'une ou l'autre phase — la frontière tombe en cours d'année. L'application ne tranche pas : elle le signale, rappelle que la carte grise et le numéro de série font foi, et retient par prudence la phase **sortante**.

**Pour les dix-neuf autres modèles, on avertit sans corriger.** Une réserve de l'indicateur de confiance se déclenche dès qu'un saut divergeant du marché de plus de 12 points sépare le millésime du véhicule de l'année d'évaluation : « saut de tarif de 25 % en 2026, sans rapport avec le marché ». C'est honnête — ces séries mélangent bien deux choses différentes — et cela couvre les 739 modèles sans en coder aucun. L'indicateur y gagne : la séparation entre estimations solides et fragiles passe de 1,92 à **1,98 fois**, et l'écart médian des estimations dites « bonnes » descend de 13,8 % à **13,0 %**.

#### Une piste écartée, et pourquoi

La recherche a fait apparaître l'**article 47 de la loi de finances 2026** : depuis le 1ᵉʳ janvier 2026, les hybrides **non rechargeables de plus de 1 700 cm³** perdent l'abattement de 50 % sur le droit de consommation et repassent à la TVA de 19 %. BSB Toyota chiffrait publiquement l'impact sur la RAV 4 à plus de 30 000 DT. L'appliquer semblait s'imposer.

**La base dit le contraire, et c'est elle qui tranche.** Sur les 17 hybrides non rechargeables présents en 2025 et en 2026 :

| Cylindrée | Modèles | Variation médiane du tarif en 2026 |
|---|---|---|
| > 1 700 cm³ | 8 | **−3,3 %** |
| ≤ 1 700 cm³ | 9 | −5,6 % |

Aucune marche fiscale. Le seul modèle en hausse est la RAV 4 — et cette hausse est le changement de génération. Le Honda CR-V e:HEV est monté à 229 980 DT en janvier puis **redescendu à 184 990 DT**, sous son tarif de 2025. La mesure a été annoncée et contestée ; les tarifs finalement pratiqués ne la portent pas. Rien n'a donc été codé, et ce constat est écrit ici pour qu'on ne le redécouvre pas dans six mois en le prenant pour un oubli.

#### Limite à connaître

La détection ne voit que les changements de phase qui **déplacent le tarif**. Une génération qui arrive au même prix passe inaperçue — et ne fausse alors presque rien, ce qui est la raison de s'en accommoder. La table `PHASES` reste ouverte : une frontière s'y ajoute en trois lignes, date, motif et source.

---

### 3.16  Régimes de faveur : quatre erreurs de conception corrigées

Une capture d'écran de Yassine sur une Citroën C3 Populaire de 2016 a ouvert une série de corrections, dont trois de conception.

**1. Le catalogue subventionné est une propriété de la FINITION, pas du régime.** Je liais la réintégration de la taxe au régime déclaré : choisir « droit commun » sur une populaire faisait donc traiter le prix **subventionné** comme un prix de marché — 21 000 DT au lieu de 27 300, un quart trop bas sur un chiffre qui sert à indemniser. Le tarif d'une « C3 Populaire » est exonéré de taxe douanière quoi qu'il arrive : il faut l'y réintégrer pour obtenir une valeur de marché. Seule l'incessibilité du régime **populaire** gèle le prix subventionné — le délai d'un autre régime porte sur d'autres droits.

**2. Une voiture populaire ne relève que du régime populaire**, et réciproquement aucun autre modèle ne peut l'être. Les huit régimes étaient ouverts partout, autorisant des combinaisons impossibles — et c'est en en essayant une que l'incohérence ci-dessus est apparue. Le sélecteur est désormais restreint, et verrouillé sur les populaires.

**3. L'avantage d'un taxi ou d'une agence s'éteint à cinq ans.** Passé ce terme il est définitivement acquis : le véhicule redevient de droit commun et plus aucune taxe n'est due. Mais il a subi une **utilisation intensive** — la fiche rappelle à l'expert de vérifier que le champ Usage la traduit.

**4. Il n'existe qu'une seule immatriculation FCR : RS.** Le « FCR série TU » a été retiré de la liste : un véhicule passé en série TU a acquitté ses droits, c'est du droit commun. Le proposer comme régime distinct laissait croire à un statut qui n'existe pas.

---

### 3.17  La base de calcul n'est pas la même selon le régime

Correction de Yassine : *« la valeur vénale d'un véhicule en droit commun ne peut pas être égale à celle en corps diplomatique, car la base de calcul n'est pas la même »*. C'est exact, et je l'avais manqué.

Le prix catalogue de la base est un prix **tunisien taxé**. Or certains véhicules ne l'ont jamais acquitté : corps diplomatique et FCR RS sont entrés en franchise totale ; taxi, louage et agence sont exonérés du droit de consommation et taxés à 7 % de TVA au lieu de 19 % tant que l'affectation court. Leur valeur à neuf doit donc être **abattue** — le sens inverse exact de la voiture populaire, où l'on réintègre une taxe absente du catalogue.

**Combien retirer ? Pas le taux douanier** — et c'est la comparaison européenne demandée par Yassine qui l'a montré. Les droits de douane frappent la **valeur en douane**, pas le prix de détail : diviser un prix TTC par 1,30 en retire beaucoup trop.

Tarif tunisien **courant** contre prix français neuf converti (1 € = 3,3809 TND, cours BCT du 19/08/2026) :

| Modèle | Tunisie | France | converti | écart |
|---|---|---|---|---|
| Dacia Sandero | 58 450 DT | 13 290 € | 44 932 DT | **+30 %** |
| Renault Clio | 66 950 DT | 19 900 € | 67 280 DT | **0 %** |
| Peugeot 208 | 64 900 DT | 20 750 € | 70 154 DT | **−7 %** |
| Dacia Duster | 106 950 DT | 19 990 € | 67 584 DT | **+58 %** |
| | | | **médiane** | **+15 %** |

Un véhicule entré sans droits devrait valoir à peu près le prix européen : l'abattement qui l'y ramène est donc d'environ **13 %**, non de 23 %. La valeur retenue vient de cette mesure, pas du taux douanier.

**Ma première version de cette comparaison était fausse** et il faut le dire : je prenais le prix le plus bas toutes finitions confondues, donc des tarifs de 2012 pour des modèles encore vendus — d'où un « catalogue tunisien 52 % sous le prix français », absurde. La comparaison ne vaut que sur le tarif **en vigueur**.

**Faiblesse à connaître** : quatre modèles, dispersion large (−7 % à +58 %) parce que les finitions d'entrée ne se correspondent pas d'un marché à l'autre. C'est un ordre de grandeur, pas une calibration.

La majoration des populaires, elle, n'est pas concernée : elle repose sur une mesure interne à la base — l'écart entre le tarif populaire et celui de la jumelle non populaire la moins chère du même millésime, **100 paires sur 13 modèles, médiane +46 %** (Picanto +45, Grand i10 +35, Panda +29, Polo +24, QQ +22, Celerio +78). La majoration retenue, **+30 %**, reste volontairement en deçà : les finitions ne se correspondent pas exactement, et une part de l'écart tient à l'équipement plutôt qu'au régime.

**Enfin, la gamme se lit toujours au niveau de marché.** Classer un véhicule diplomatique sur sa valeur abattue le faisait glisser d'une gamme à l'autre et changeait son taux de dépréciation : un avantage fiscal ne transforme pas une berline premium en citadine.

---

### 3.18  Contrastes : le contrôle qui manquait

Une capture en thème sombre montrait l'en-tête de la fiche résultat quasi illisible. La cause : `--gn` sert de **fond** sous du texte blanc dans ce composant, alors que je l'avais éclairci pour le thème sombre — où il sert de **texte** ailleurs. Un jeton dont le rôle change ne peut pas servir aux deux.

L'audit précédent ne testait qu'une liste de paires choisies à la main. Il vérifie maintenant **toutes** les règles qui fixent à la fois un fond et une couleur, dans les deux thèmes, dégradés compris : **112 paires**. Il en a trouvé **23 défaillantes**, dont l'en-tête à 1,70:1. Toutes corrigées, par des jetons de rôle (`--sur-vert`, `--sur-bleu`, `--txt-orange`…) qui restent sombres ou clairs selon ce qu'ils portent, et non selon le thème.

Au passage, le chip « Modèle » fuyait sur grand écran : son `display:none` ne vivait qu'à l'intérieur du média téléphone, si bien qu'aucune règle ne s'appliquait en desktop. Même défaut que la barre marque, à l'envers.

---

### 3.19  Alléger la fiche

Sur demande de Yassine, la fenêtre de résultat ne garde que ce qui se lit d'un coup d'œil : le **montant** et sa composition, la **jauge de cotation**, et une **ligne de confiance**. Les pastilles, le panneau batterie, le détail du calcul et les notices passent sous le pli « Détail du calcul et règles appliquées ». La ligne de confiance n'est plus elle-même un bloc dépliable — le détail de ses réserves se lit au survol et se déplie avec le reste. Sept contrôles vérifient ce partage.

---

### 3.11  Interface : le résultat comme cadran

La fiche a été reprise là où elle était encore un formulaire prolongé plutôt qu'un instrument de mesure.

- **Le montant est le seul élément à cette échelle.** Un intitulé en capitales le nomme, l'unité est composée à part pour rester une unité, un filet d'accent tient le bloc à gauche, et l'ensemble est posé sur une carte propre plutôt qu'à la suite des champs de saisie.
- **Un bloc batterie** apparaît sur les véhicules à batterie : une jauge situe la capacité mesurée entre ce qu'on attend de cet âge et le seuil de garantie, avec la part de la batterie dans la valeur, l'effet chiffré sur l'estimation et l'ordre de grandeur d'un remplacement. Un champ de saisie du SOH est ajouté au formulaire, uniquement là où il a un sens.
- **Thème sombre complet.** Les composants ne lisent que des jetons ; seuls les jetons sont redéfinis, dans les deux états (préférence système et choix explicite), ce qui évite le défaut classique d'une couleur qui ne s'applique jamais dans l'état non marqué. Les contrastes ont été calculés : les neuf paires de référence passent le seuil AA dans les deux thèmes, de 3,53:1 pour le texte tertiaire à 17,88:1 pour le texte principal.
- **Détails d'exécution** : piles de repli typographiques réelles derrière Inter et Syne, `:focus-visible` visible partout, respect de `prefers-reduced-motion`, `theme-color` déclinée par thème, vrai signe moins dans les pourcentages signés.

Quatre contrôles automatiques gardent tout cela : parité des jetons entre les deux blocs sombres, absence de règle de composant à l'intérieur d'un bloc de thème, absence de couleur de texte littérale sans fond propre, et présence des règles de style essentielles (une refonte du CSS en avait déjà supprimé par accident, sans qu'aucun test ne bronche).

---

### 3.9 ter  Cohérence des millésimes — un véhicule plus récent ne peut pas valoir moins

Un audit systématique de la formule (211 finitions, tous millésimes de 2008 à 2026, paramètres identiques) a révélé **63 inversions d'âge** : un véhicule plus récent ressortant **moins cher** que son aîné, jusqu'à **−21 %**. Le pire cas : Renault Laguna Coupé 2.0 170 BVA, 56 300 DT pour un 2012 contre 46 100 DT pour un 2013.

**La cause.** Le tarif d'une finition ne monte pas toujours — restylage dépouillé, changement de fiscalité, baisse commerciale. La Laguna coûtait 79 900 DT au tarif 2012 et 65 900 DT en 2013. L'estimation, ancrée sur le tarif de l'époque du véhicule, héritait mécaniquement de cet écart. Or sur le marché de l'occasion, personne ne paie davantage un millésime plus ancien parce qu'il coûtait plus cher neuf : ce qui les sépare, c'est l'âge.

**Ce qu'il fallait corriger, exactement.** Pas que le tarif baisse — cela arrive et c'est un fait. Que la valeur **vénale** s'inverse. Or l'âge accorde déjà un écart : `VV(a) < VV(a+1)` tant que `VEN(a) < VEN(a+1)/(1−taux)`. La série des valeurs à neuf est donc balayée à rebours, millésime par millésime, en n'imposant que cette borne. Les creux de tarif légitimes sont préservés ; seules les vraies inversions cèdent.

Trois détails ont demandé deux itérations chacun :

- **Le taux de référence** est celui de la gamme qui se déprécie *le plus lentement* (4,27 %/an). C'est la contrainte la plus serrée, donc celle qui garantit l'ordre pour toutes les gammes.
- **Le kilométrage entre dans le compte.** À kilométrage égal, le repère normal d'un véhicule plus récent est plus bas, donc son bonus kilométrique est plus faible — de 1,05 %/an. Sans en tenir compte, l'enveloppe consommait toute la marge et l'ordre s'inversait quand même (Ford Ka 1.2 Titanium à 120 000 km : 25 800 DT en 2013 contre 25 400 DT en 2016). La borne annuelle retenue est donc `1/(1−taux) × (1−pente km) × 0,995`, le dernier facteur absorbant l'arrondi à la centaine.
- **La série est construite en une fois et mise en cache** par finition et par année d'évaluation : les contrôles appellent le calcul des dizaines de milliers de fois.

**Résultat : 0 inversion** sur le même échantillon. Les 4 discontinuités restantes sont celles, **voulues**, de la bascule d'incessibilité des véhicules populaires (§ 3.10). La validation sur les 580 annonces est inchangée (écart absolu médian 12,9 %).

L'audit a par ailleurs écarté une fausse alerte : 69 cas de valeur vénale « supérieure à la valeur à neuf ». L'écart maximal est de **49 DT** — c'est l'arrondi à la centaine, pas un défaut de formule.

---

### 3.9 quater  Véhicules électriques : la batterie comme poste de valeur

Sur un véhicule à batterie, la batterie est le premier poste de valeur et **le seul dont l'usure se mesure**. C'est elle qui fait l'écart entre deux exemplaires de même âge, et rien dans le modèle ne la représentait.

#### Ce que la base contient

**130 finitions électriques**, dont 70 avec une capacité exploitable, plus 84 hybrides rechargeables et 59 hybrides. Un premier piège, silencieux : le champ de capacité est une **chaîne avec son unité** (`"100kWh"`, `"42.5 kWh"`). Toute arithmétique directe dessus donne `NaN` — et un `NaN` dans une part de batterie ne lève aucune erreur, il désactive juste le module partout sans le dire. La lecture passe donc par un extracteur qui rejette aussi les valeurs absurdes, et un test vérifie qu'au moins 50 finitions restent exploitables.

Second constat, décisif : **la base ne contient qu'une seule finition électrique antérieure à 2023** (118 des 130 sont apparues en 2024 ou après). Il n'existe donc **aucune courbe de dévalorisation électrique tunisienne à mesurer**. Tout ce qui suit est étayé sur des sources externes, explicitement signalées comme telles.

#### Le contexte tunisien, qui domine tout le reste

La fiscalité des véhicules électriques a été refondue : **droits de douane ramenés de 30 % à zéro, TVA de 19 % à 7 %, taxe de circulation divisée par deux**, et puissance fiscale recalculée sur une grille propre aux électriques. Le parc commercialisé est passé d'environ 15 à plus de 60 modèles, avec des baisses dépassant **40 %** sur certains — un véhicule à 100 000 DT s'échangeant désormais autour de 58 000 DT (ANME, août 2026).

La base le confirme sur ses propres relevés : **30 des 37 finitions électriques suivies sur au moins deux ans ont un tarif en baisse**, jusqu'à −36 % (BMW iX xDrive40 Impressive, 424 900 → 269 900 DT). L'indice par énergie mesure −3,5 % en 2025 et −8,3 % en 2026 pour l'électrique, contre −4,3 % pour l'ensemble.

**Conséquence pratique : le plafond « prix neuf du jour » (§ 3.9 bis) est ce qui protège le plus les estimations de VE.** Un électrique acheté 100 000 DT en 2024 et remplaçable à 58 000 DT aujourd'hui ne peut pas être indemnisé au-dessus de 58 000 DT, et c'est cette borne — pas une hypothèse de dévalorisation — qui le garantit.

#### F_batterie : l'écart à la norme de l'âge, pas l'état absolu

Le facteur batterie est construit **comme F_km** : sur l'écart à ce qu'on attend de cet âge.

`F_batterie = 1 + part_batterie × (SOH_mesuré / SOH_attendu − 1)`

Sans mesure d'état de santé, le facteur vaut **1** et rien ne change : on ne présume pas d'une usure qu'on n'a pas constatée. La fiche invite alors à faire le relevé.

**SOH attendu** : dégradation de **2,4 %/an**, composée de 2,0 %/an pour les voitures particulières (Geotab 2025, 22 700 véhicules, 21 modèles) et de **+0,4 point de pénalité climat chaud** — la Tunisie en est un. La courbe donne 82,3 % de capacité à 8 ans, contre 81,6 % mesurés par Geotab : l'écart est de 0,7 point.

**Part de la batterie dans la valeur** : mesurée quand la capacité est connue (`capacité × 380 DT/kWh ÷ valeur à neuf`), forfaitaire sinon (25 % en électrique, 12 % en hybride rechargeable, 3 % en hybride), bornée entre 5 % et 40 %. Deux bases de coût sont distinguées et il ne faut pas les confondre : **380 DT/kWh** (bas de la fourchette client, 130 $/kWh au cours BCT du 19/08/2026) pour *pondérer* la batterie dans la valeur du véhicule, la marge et la main-d'œuvre d'un remplacement n'étant pas de la valeur incorporée ; **480 DT/kWh** pour le *devis indicatif affiché* à l'expert, pose comprise.

La forme est juste à ses deux extrêmes : batterie morte (SOH → 0) = perte de toute la part batterie ; batterie neuve = part intacte. Un test le vérifie sur toute la plage 40–102 %.

**Le seuil de garantie est signalé, pas chiffré.** Sous 70 % de capacité et dans les 8 ans / 160 000 km usuels, la batterie est remplacée au titre de la garantie — ce qui **relève** la valeur au lieu de l'abaisser. Le modèle ne peut pas le présumer (cela dépend du contrat) : la fiche le dit à l'expert, avec l'ordre de grandeur du remplacement.

#### Décote renforcée des véhicules à batterie

Les VE se déprécient plus vite : **38 à 42 % à trois ans contre 35 à 40 %** pour les thermiques (Cox Automotive, novembre 2025), soit un rythme annuel supérieur d'environ **8 %**. C'est ce **rapport** qui est appliqué au taux de la gamme — jamais les taux européens eux-mêmes, qui n'ont rien à voir avec le marché tunisien. Le niveau, lui, reste porté par l'indice par énergie et le plafond du prix neuf du jour.

**À remesurer** dès qu'un marché de l'occasion électrique existera en Tunisie. Il n'existe pas encore : 500 à 520 immatriculations sur toute l'année 2025, 185 sur les deux premiers mois de 2026.

---

### 3.9 bis  Plafond « prix neuf du jour » — quand le tarif catalogue baisse

Signalé par Yassine sur une **Chery Tiggo 4 Pro** de 2025 : valeur vénale estimée **81 900 DT** alors que le même véhicule **neuf** se vend **75 000 DT** en concession. Une occasion ne peut pas valoir plus que sa version neuve disponible le jour même — c'est la valeur de remplacement à neuf, et c'est une borne économique dure.

**La cause : un tarif en baisse.** L'historique de cette finition est décroissant — 88 490 DT en janvier 2025, 84 490 en août, 79 900 en janvier 2026, 75 000 en mars 2026. L'estimation partait, comme pour tout véhicule, du prix de l'époque de la mise en circulation (88 490 DT), qu'elle actualisait ensuite. Cette logique est la bonne pour un modèle retiré du catalogue : on n'a que le prix de son époque et il faut le porter à aujourd'hui. Elle devient absurde quand le prix d'aujourd'hui est **connu** et **plus bas**.

Le phénomène n'est pas marginal : sur les **394 finitions encore commercialisées en 2026**, **221 ont un tarif inférieur à leur maximum historique** — l'effet de la concurrence chinoise et des baisses de gamme sur le marché tunisien. **170** d'entre elles produisaient une valeur à neuf supérieure au prix du jour, jusqu'à +54 % (BMW X3 20i xDrive Pack M : 382 290 DT calculés contre 248 900 DT au tarif du jour).

**Deux bornes ont été posées**, l'une après l'autre parce que la première ne suffisait pas :

1. **Sur la valeur à neuf de référence.** Quand la finition est encore au catalogue à la date d'évaluation, sa valeur à neuf ne peut pas dépasser le prix qui y figure ce jour-là. Le plafond est appliqué *avant* la réintégration douanière des véhicules populaires : leur prix catalogue est le prix subventionné, la taxe se réintègre par-dessus.
2. **Sur le résultat lui-même.** Le premier plafond laissait encore passer les véhicules quasi neufs : à un âge nul, `F_âge` vaut 1 et les bonus d'état (jusqu'à +10 %) et de kilométrage (jusqu'à +15 %) repassaient au-dessus du prix neuf. La valeur vénale est donc bornée à son tour.

**Une exception, assumée** : une populaire au-delà de son délai d'incessibilité dépasse légitimement son prix subventionné, puisqu'elle s'échange précisément sur le marché **taxé**. La borne ne s'y applique pas — c'est l'objet même de la réintégration douanière décrite ci-dessous.

**Vérification** : 5 455 combinaisons finition × millésime × état ont été sondées sur les modèles encore commercialisés. **Aucune valeur vénale au-dessus du prix neuf du jour**, contre 980 avant correction. L'invariant est tenu par le jeu de tests (`test_vv.js`, section 12 ter). Chery Tiggo 4 Pro 2025 : **71 800 DT**, sous les 75 000 DT du neuf.

Quand la borne joue, la fiche l'affiche — pastille `🔻 Plafonnée au prix neuf du jour`, et une note rappelant le tarif du jour et, le cas échéant, la baisse constatée depuis l'époque du véhicule.

---

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

#### Le plafond par la version normale — correction d'une inversion

La majoration forfaitaire, appliquée seule, produisait un résultat faux et visible : **une populaire pouvait ressortir mieux valorisée que la voiture non subventionnée dont elle est la déclinaison.** Le cas signalé par Yassine : deux Chery QQ 2016, mêmes paramètres (125 000 km, état normal, usage particulier, évaluation 2026) — 22 900 DT pour la normale, **24 400 DT** pour la populaire.

La mécanique de l'erreur est arithmétique. Les deux versions sont bien ancrées sur leur prix catalogue 2016 : 22 900 DT pour la normale, 18 760 DT pour la populaire. Mais 18 760 × 1,30 = **24 388**, soit davantage que le prix à neuf réel de la version normale la même année. La réintégration de la taxe est censée ramener la populaire *sur* le marché normal ; ici elle la plaçait *au-dessus*.

Mesuré sur la base, l'écart réel entre version populaire et version normale au même millésime — en retenant de chaque côté la finition la moins chère — ressort à **+48,5 % en médiane sur 47 couples prix/année**, et il descend jusqu'à **+0 %** (KIA Picanto). Autrement dit : dans **19 % des couples**, un forfait de +30 % dépasse déjà le prix de la version normale. Le taux de 30 % n'est donc pas en cause — c'est bien le taux douanier — mais il ne peut pas s'appliquer sans borne, parce que le prix subventionné auquel on l'applique et le prix normal de référence ne sont pas séparés par la seule fiscalité.

**Deux règles ont donc été ajoutées**, l'une et l'autre appuyées sur la version normale du même modèle lorsqu'elle figure dans la base (**15 des 17 modèles populaires**, les deux exceptions — Chery Tiggo 1X, Renault Kwid — n'existant qu'en version populaire et conservant la majoration simple) :

1. **Plafonnement.** La valeur à neuf de la populaire ne peut pas dépasser celle de sa jumelle normale, calculée pour la même année de référence et la même date d'évaluation. On retient de la jumelle la finition **la moins chère** disponible à l'année : une populaire est par construction une entrée de gamme, la comparer à une finition haute la surévaluerait.
2. **Gamme héritée.** Le rythme de dépréciation se lit sur la valeur à neuf de la **version normale**, pas sur le prix subventionné. C'est le segment de marché qui commande la décote, pas la subvention. Sans cela, un simple franchissement de palier de gamme (99 000 DT à 4,27 %/an contre 101 000 DT à 6,98 %/an) aurait pu réinverser les deux versions sur un véhicule ancien, malgré le plafond.

**Vérification systématique** : 391 couples populaire/normale ont été comparés à paramètres identiques, sur toutes les finitions populaires jumelées et tous les millésimes 2010–2026. **Aucune inversion** — 149 à égalité (plafond actif), 242 en dessous. La règle est désormais tenue par le jeu de tests (`test_vv.js`, section 12 bis), avec le cas Chery QQ 2016 vérifié nommément : 22 900 DT des deux côtés.

Quand le plafond joue, la fiche le dit — la pastille devient `🏷️ Populaire · alignée sur la version normale`, et le détail du calcul indique la valeur à neuf sur laquelle le plafonnement a été fait.

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

### Affichage du résultat : le calcul se replie

La fiche exposait sa méthode au même rang que son résultat — trois paragraphes explicatifs (régime populaire, date d'évaluation, péremption des tarifs) déroulés sous le montant, plus une ligne détaillant la gamme et son taux annuel. Une fiche d'expertise doit livrer un résultat, pas un exposé.

Ce qui reste visible tient maintenant en trois éléments : le **montant**, la **jauge de cotation**, et une rangée de **pastilles** résumant ce qui a pesé — `74 % du neuf`, `Grand public`, `🏷️ Populaire · +30 %` (ou `🏷️ Populaire · alignée sur la version normale` quand le plafond joue), `📆 Évaluation 2023`, `⚖️ Réforme 2026`, `✏️ Cotation ajustée`. Les règles complètes sont repliées dans « Détail du calcul et règles appliquées », consultables à la demande.

Le montant a par ailleurs été remonté à 30 px et posé sur sa propre ligne.

### 🔴 Régression corrigée : les styles du module avaient disparu

Une substitution CSS d'une version précédente a supprimé, en même temps que les règles qu'elle visait, celles de la carte du module (`#vvSect`) et du montant (`.vv-prix`, `.vv-prix-val`, `.vv-prix-note`). Conséquence visible sur capture : le montant avait perdu sa typographie et se collait à sa mention — *« 38 200 DTestimation — hors barème compagnie »* — et la carte avait perdu son traitement de pièce maîtresse.

Aucun test ne l'avait détecté, et je ne pouvais pas le voir : la liaison avec l'ordinateur étant coupée, je n'ai aucun rendu visuel. **Une série d'assertions vérifie désormais la présence des règles de style essentielles** — carte du module, typographie du montant, mention séparée, pastilles, piste et poignée du curseur, sélecteur d'année, grille des champs. Elles ne jugent pas l'esthétique, elles garantissent qu'une règle ne disparaît plus en silence.

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

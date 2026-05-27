const nonInductiveApps = ["Lampes", "Téléviseur", "Chargeur", "Ordinateur", "Radio"];
const inductiveApps = ["Réfrigérateur", "Ventilateur", "Climatiseur", "Pompe", "Machine à laver"];

// --- 1. FONCTIONS DE GESTION DES LIGNES ---
function createRow(app = "", parentId) {
    const parent = document.getElementById(parentId);
    if (!parent) return;
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="row-number"></td>
        <td><input type="text" value="${app}" placeholder="Nom de l'appareil"></td>
        <td><input type="number" class="pwr" value="0" oninput="calculate()"></td>
        <td><input type="number" class="qty" value="0" oninput="calculate()"></td>
        <td><input type="number" class="dur" value="0" oninput="calculate()"></td>
        <td class="energy-cell">0 <button class="del-btn" onclick="removeRow(this)">x</button></td>
    `;
    parent.appendChild(row);
    updateNumbers();
}

function removeRow(btn) {
    btn.closest('tr').remove();
    updateNumbers();
    calculate();
}

function updateNumbers() {
    ['table-body', 'inductive-body'].forEach(id => {
        const rows = document.querySelectorAll(`#${id} tr:not(.header-row)`);
        rows.forEach((row, index) => {
            const numCell = row.querySelector('.row-number');
            if (numCell) numCell.innerText = index + 1;
        });
    });
}

function calculerLigne(row) {
    const pwr = parseFloat(row.querySelector('.pwr')?.value) || 0;
    const qty = parseFloat(row.querySelector('.qty')?.value) || 0;
    const dur = parseFloat(row.querySelector('.dur')?.value) || 0;
    const energy = pwr * qty * dur;
    const cell = row.querySelector('.energy-cell');
    if (cell) cell.firstChild.textContent = energy + " ";
    return energy;
}

function sommerPuissances(tbodyId) {
    let somme = 0;
    document.querySelectorAll(tbodyId + ' tr:not(.header-row)').forEach(row => {
        somme += (parseFloat(row.querySelector('.pwr')?.value) || 0) * (parseFloat(row.querySelector('.qty')?.value) || 0);
    });
    return somme;
}

// --- 2. FONCTION DE CALCUL PRINCIPALE (GÈRE TOUT) ---
function calculate() {
    let totalNonInductive = 0;
    let totalInductive = 0;

    document.querySelectorAll('#table-body tr:not(.header-row)').forEach(row => totalNonInductive += calculerLigne(row));
    document.querySelectorAll('#inductive-body tr:not(.header-row)').forEach(row => totalInductive += calculerLigne(row));

    if(document.getElementById('total-non-inductive')) document.getElementById('total-non-inductive').innerText = totalNonInductive;
    if(document.getElementById('total-inductive')) document.getElementById('total-inductive').innerText = totalInductive;
    
    const totalGlobal = totalNonInductive + totalInductive;
    if(document.getElementById('total-energy')) document.getElementById('total-energy').innerText = totalGlobal;

    // Onduleur
    const minOnd = (sommerPuissances('#inductive-body') + sommerPuissances('#table-body')) / 0.95;
    const maxOnd = ((sommerPuissances('#inductive-body') * 2) + sommerPuissances('#table-body')) / 0.95;
    const elOnd = document.getElementById('res-onduleur');
    if (elOnd) elOnd.innerText = Math.round(minOnd) + " W - " + Math.round(maxOnd) + " W";

    // Enchaînement des calculs dérivés
    calculatePanels();
    calculerBatteries();
    calculerCables();
}

// --- 3. PANNEAUX, BATTERIES, RÉGULATEUR, CÂBLES ---
function calculatePanels() {
    const totalEnergy = parseFloat(document.getElementById('total-energy')?.innerText) || 0;
    const panelPwr = parseFloat(document.getElementById('panel-pwr')?.value) || 0;
    
    // Calcul du nombre de panneaux
    if (panelPwr > 0) {
        document.getElementById('nb-panneaux').innerText = Math.ceil(totalEnergy / (panelPwr * 0.8 * 4));
    }
    
// Détermination de la tension du système
let systemVolt;
if (totalEnergy * 0.29 <= 500) {
    systemVolt = 12;
} else if (totalEnergy * 0.29 <= 2000) {
    systemVolt = 24;
} else {
    systemVolt = 48;
}

document.getElementById('system-volt').innerText = systemVolt;

    
    // --- NOUVELLE LOGIQUE POUR SERIE-INFO ---
    const elementSerie = document.getElementById('serie-info');
    if (elementSerie) {
        // La condition demandée : (tensionSysteme / 24) <= 1
        if ((systemVolt / 24) <= 1) {
            elementSerie.innerText = "Pas de panneau en série";
        } else {
            elementSerie.innerText = "2 Panneaux en série et le reste en dérivation selon le besoin";
        }
    }
    
    // Mise à jour de l'input caché pour les calculs suivants
    const voltInput = document.getElementById('system-volt-input');
    if(voltInput) voltInput.value = systemVolt;
    
    calculerRegulateur();
}

function calculerRegulateur() {
    const tensionSysteme = parseFloat(document.getElementById('system-volt-input')?.value) || 24;
    const nbPanneaux = parseInt(document.getElementById('nb-panneaux')?.innerText) || 0;
    const voc = parseFloat(document.getElementById('voc-input')?.value) || 0;
    const isc = parseFloat(document.getElementById('isc-input')?.value) || 0;
    
    document.getElementById('res-tension').innerText = Math.round((tensionSysteme / 24) * (voc * 1.2));
    document.getElementById('res-intensite').innerText = (nbPanneaux * isc * 1.2).toFixed(2);
}

function calculerBatteries() {
    const totalEnergy = parseFloat(document.getElementById('total-energy')?.innerText) || 0;
    const systemVolt = parseFloat(document.getElementById('system-volt')?.innerText) || 48;
    const autonomie = parseFloat(document.getElementById('autonomie')?.value) || 1.5;
    const cn = (totalEnergy * autonomie) / (systemVolt * 0.85 * 0.8);
    
    document.getElementById('res-bat-serie').innerText = Math.ceil(systemVolt / 12);
    document.getElementById('res-bat-paral').innerText = Math.ceil(cn / 250);
    document.getElementById('res-bat-total').innerText = Math.ceil(systemVolt / 12) * Math.ceil(cn / 250);
    document.getElementById('bat-info').innerText = "Capacité requise : " + cn.toFixed(2) + " Ah";
}

function calculerSections() {
    // 1. Récupération dynamique des longueurs saisies par l'utilisateur
    const L1 = parseFloat(document.getElementById('long-s1')?.value) || 0;
    const L2 = parseFloat(document.getElementById('long-s2')?.value) || 0;
    const L3 = parseFloat(document.getElementById('long-s3')?.value) || 0;

    // 2. Récupération des autres paramètres (Tension, Puissances, etc.)
    const tensionSysteme = parseFloat(document.getElementById('system-volt')?.innerText) || 48;
    const P_panneau = parseFloat(document.getElementById('panel-pwr')?.value) || 500;
    const nbPanneaux = parseFloat(document.getElementById('nb-panneaux')?.innerText) || 0;
    
    // Pour P_convertisseur, on récupère la valeur affichée dans votre plage
    const onduleurText = document.getElementById('res-onduleur')?.innerText || "0";
    const P_convertisseur = parseFloat(onduleurText.split(' - ')[1]) || 2347; // Prend la valeur max de la plage

    const rendement = 0.96;
    const constante = 0.032;
    const constante1 = 0.02;
    // 3. Application des formules avec les longueurs dynamiques (L1, L2, L3)
    let res1 = ((P_panneau / tensionSysteme) / (tensionSysteme * constante1)) * constante * L1;
    
    let res2 = (((P_panneau * nbPanneaux)/tensionSysteme) / (tensionSysteme *constante1)) * constante * L2;
    
    let res3 = ((P_convertisseur / tensionSysteme) / (tensionSysteme*constante1
    ) )* constante * L3;

    // 4. Fonction d'arrondi
    function getSection(valeur) {
        const standards = [1.5, 2, 2.5, 4, 6, 7, 10, 16, 25, 35, 36, 50, 70, 95];
        return standards.find(s => s >= valeur) || 95;
    }

    // 5. Mise à jour de l'affichage
    document.getElementById('res-s1').innerText = getSection(res1) + " mm²";
    document.getElementById('res-s2').innerText = getSection(res2) + " mm²";
    document.getElementById('res-s3').innerText = getSection(res3) + " mm²";
}


// --- 5. INITIALISATION FUSIONNÉE ---
window.onload = function() {
    // 1. Initialiser vos tableaux d'appareils
    nonInductiveApps.forEach(app => createRow(app, 'table-body'));
    inductiveApps.forEach(app => createRow(app, 'inductive-body'));
    
    // 2. Lancer les calculs initiaux
    calculate(); // Calcule l'énergie, les panneaux, etc.
    calculerBatteries();
    calculerSections(); // Calcule les câbles dès le chargement
};
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}



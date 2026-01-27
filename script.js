// Bestehender Code für System-Verwaltung
let systems = [];
let amortChart = null;

// Auto-Save Funktion
function autoSave() {
    const data = getAllData();
    localStorage.setItem('pv_planer_autosave', JSON.stringify(data));
    console.log('✅ Auto-Save erfolgreich');
}

// Auto-Load beim Seitenstart
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('pv_planer_autosave');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            loadAllData(data);
            console.log('✅ Daten automatisch geladen');
        } catch(err) {
            console.error('Fehler beim Auto-Load:', err);
        }
    }
});

const watchList = ['pvPower', 'pvCount', 'pvSinglePrice', 'wrPrice', 'batPrice', 'smPrice', 'mountPrice'];
watchList.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        updateLiveStats();
        autoSave();
    });
});

function updateLiveStats() {
    const pWp = parseFloat(document.getElementById('pvPower').value) || 0;
    const pCount = parseInt(document.getElementById('pvCount').value) || 0;
    const totalKWp = (pWp * pCount) / 1000;
    
    const pSinglePrice = parseFloat(document.getElementById('pvSinglePrice').value) || 0;
    const pvTotalSum = pCount * pSinglePrice;

    const others = ['wrPrice', 'batPrice', 'smPrice', 'mountPrice'].reduce((sum, id) => {
        return sum + (parseFloat(document.getElementById(id).value) || 0);
    }, 0);

    const grandTotal = pvTotalSum + others;

    document.getElementById('totalKWpDisplay').value = totalKWp.toFixed(2) + " kWp";
    document.getElementById('pvTotalDisplay').value = pvTotalSum.toLocaleString('de-DE') + " €";
    document.getElementById('totalPriceDisplay').value = grandTotal.toLocaleString('de-DE') + " €";

    return { totalKWp, grandTotal, pvTotalSum };
}

// Alle Eingabefelder für Komponenten mit Auto-Save
['sysName', 'pvBrand', 'pvTech', 'wrBrand', 'wrTech', 'batBrand', 'batTech', 'smBrand', 'smTech', 'mountBrand', 'mountTech', 'sysWarranty'].forEach(id => {
    document.getElementById(id).addEventListener('input', autoSave);
});

document.getElementById('addSystemBtn').addEventListener('click', () => {
    const stats = updateLiveStats();
    const system = {
        id: Date.now(),
        name: document.getElementById('sysName').value || "Unbenannt",
        totalKWp: stats.totalKWp.toFixed(2),
        totalPrice: stats.grandTotal,
        warranty: document.getElementById('sysWarranty').value || 0,
        components: [
            { n: 'Module', b: document.getElementById('pvBrand').value, t: `${document.getElementById('pvTech').value} (${document.getElementById('pvCount').value} Stk)`, p: stats.pvTotalSum },
            { n: 'WR', b: document.getElementById('wrBrand').value, t: document.getElementById('wrTech').value, p: document.getElementById('wrPrice').value },
            { n: 'Speicher', b: document.getElementById('batBrand').value, t: document.getElementById('batTech').value, p: document.getElementById('batPrice').value },
            { n: 'SmartMeter', b: document.getElementById('smBrand').value, t: document.getElementById('smTech').value, p: document.getElementById('smPrice').value },
            { n: 'Montage', b: document.getElementById('mountBrand').value, t: document.getElementById('mountTech').value, p: document.getElementById('mountPrice').value }
        ]
    };
    systems.push(system);
    render();
    updateSystemDropdown();
    autoSave();
    reset();
});

function render() {
    const container = document.getElementById('systemsContainer');
    container.innerHTML = '';
    systems.forEach(s => {
        const card = document.createElement('div');
        card.className = 'system-card';
        card.innerHTML = `
            <h3>${s.name} <br><small>${s.totalKWp} kWp</small></h3>
            <hr>
            ${s.components.map(c => `
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:5px;">
                    <span><strong>${c.n}:</strong> ${c.b || '-'}</span>
                    <span>${(parseFloat(c.p)||0).toLocaleString('de-DE')} €</span>
                </div>
                <div style="font-size:0.7rem; color:grey; margin-bottom:8px;">${c.t || ''}</div>
            `).join('')}
            <div style="margin-top:15px; padding-top:10px; border-top:2px solid #eee; font-weight:bold; font-size:1.1rem; display:flex; justify-content:space-between;">
                <span>Gesamt:</span>
                <span style="color:#60a5fa">${s.totalPrice.toLocaleString('de-DE')} €</span>
            </div>
            <div style="font-size:0.7rem; margin-top:5px;">Garantie: ${s.warranty} Jahre</div>
            <button onclick="deleteSys(${s.id})" style="width:100%; margin-top:15px; border:none; background:rgba(239, 68, 68, 0.1); color:#fca5a5; padding:5px; border-radius:4px; cursor:pointer;">Löschen</button>
        `;
        container.appendChild(card);
    });
}

function reset() {
    document.querySelectorAll('.config-area input:not([readonly])').forEach(i => i.value = '');
    updateLiveStats();
    autoSave();
}

function deleteSys(id) {
    systems = systems.filter(s => s.id !== id);
    render();
    updateSystemDropdown();
    autoSave();
}

// Dropdown für Systemauswahl aktualisieren
function updateSystemDropdown() {
    const select = document.getElementById('amort_system_select');
    select.innerHTML = '<option value="">-- Manuell eingeben --</option>';
    
    systems.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = `${s.name} (${s.totalKWp} kWp - ${s.totalPrice.toLocaleString('de-DE')} €)`;
        select.appendChild(option);
    });
}

// Event-Listener für Systemauswahl
document.getElementById('amort_system_select').addEventListener('change', (e) => {
    const selectedId = parseInt(e.target.value);
    
    if (!selectedId) {
        document.getElementById('amort_cost').value = '';
        document.getElementById('amort_power').value = '';
        document.getElementById('amort_cost').readOnly = false;
        document.getElementById('amort_power').readOnly = false;
        document.getElementById('amort_cost').style.background = '';
        document.getElementById('amort_power').style.background = '';
        autoSave();
        return;
    }
    
    const selectedSystem = systems.find(s => s.id === selectedId);
    
    if (selectedSystem) {
        document.getElementById('amort_cost').value = selectedSystem.totalPrice.toFixed(0);
        document.getElementById('amort_power').value = selectedSystem.totalKWp;
        document.getElementById('amort_cost').readOnly = true;
        document.getElementById('amort_power').readOnly = true;
        document.getElementById('amort_cost').style.background = 'rgba(16, 185, 129, 0.1)';
        document.getElementById('amort_power').style.background = 'rgba(16, 185, 129, 0.1)';
        autoSave();
    }
});

// Speichern & Laden mit Download/Upload - ERWEITERT
function getAllData() {
    // Komponenten-Eingaben
    const componentInputs = {
        sysName: document.getElementById('sysName').value,
        pvBrand: document.getElementById('pvBrand').value,
        pvPower: document.getElementById('pvPower').value,
        pvCount: document.getElementById('pvCount').value,
        pvSinglePrice: document.getElementById('pvSinglePrice').value,
        pvTech: document.getElementById('pvTech').value,
        wrBrand: document.getElementById('wrBrand').value,
        wrTech: document.getElementById('wrTech').value,
        wrPrice: document.getElementById('wrPrice').value,
        batBrand: document.getElementById('batBrand').value,
        batTech: document.getElementById('batTech').value,
        batPrice: document.getElementById('batPrice').value,
        smBrand: document.getElementById('smBrand').value,
        smTech: document.getElementById('smTech').value,
        smPrice: document.getElementById('smPrice').value,
        mountBrand: document.getElementById('mountBrand').value,
        mountTech: document.getElementById('mountTech').value,
        mountPrice: document.getElementById('mountPrice').value,
        sysWarranty: document.getElementById('sysWarranty').value
    };

    return {
        systems: systems,
        componentInputs: componentInputs,
        calculators: {
            calc1: {
                voc: document.getElementById('calc1_voc').value,
                vmpp: document.getElementById('calc1_vmpp').value,
                count: document.getElementById('calc1_count').value,
                tempcoeff_voc: document.getElementById('calc1_tempcoeff_voc').value,
                tempcoeff_vmpp: document.getElementById('calc1_tempcoeff_vmpp').value,
                mintemp: document.getElementById('calc1_mintemp').value,
                maxtemp: document.getElementById('calc1_maxtemp').value,
                stctemp: document.getElementById('calc1_stctemp').value
            },
            calc2: {
                maxvoltage: document.getElementById('calc2_maxvoltage').value,
                mppt_min: document.getElementById('calc2_mppt_min').value,
                mppt_max: document.getElementById('calc2_mppt_max').value,
                safety: document.getElementById('calc2_safety').value,
                voc: document.getElementById('calc2_voc').value,
                vmpp: document.getElementById('calc2_vmpp').value,
                tempcoeff_voc: document.getElementById('calc2_tempcoeff_voc').value,
                tempcoeff_vmpp: document.getElementById('calc2_tempcoeff_vmpp').value,
                mintemp: document.getElementById('calc2_mintemp').value,
                maxtemp: document.getElementById('calc2_maxtemp').value,
                stctemp: document.getElementById('calc2_stctemp').value
            },
            amort: {
                system_id: document.getElementById('amort_system_select').value,
                cost: document.getElementById('amort_cost').value,
                power: document.getElementById('amort_power').value,
                yield: document.getElementById('amort_yield').value,
                selfconsumption: document.getElementById('amort_selfconsumption').value,
                elec_price: document.getElementById('amort_elec_price').value,
                feed_in: document.getElementById('amort_feed_in').value,
                operating: document.getElementById('amort_operating').value,
                years: document.getElementById('amort_years').value
            }
        }
    };
}

function loadAllData(data) {
    systems = data.systems || [];
    render();
    updateSystemDropdown();
    
    // Komponenten-Eingaben laden
    if (data.componentInputs) {
        const ci = data.componentInputs;
        document.getElementById('sysName').value = ci.sysName || '';
        document.getElementById('pvBrand').value = ci.pvBrand || '';
        document.getElementById('pvPower').value = ci.pvPower || '';
        document.getElementById('pvCount').value = ci.pvCount || '';
        document.getElementById('pvSinglePrice').value = ci.pvSinglePrice || '';
        document.getElementById('pvTech').value = ci.pvTech || '';
        document.getElementById('wrBrand').value = ci.wrBrand || '';
        document.getElementById('wrTech').value = ci.wrTech || '';
        document.getElementById('wrPrice').value = ci.wrPrice || '';
        document.getElementById('batBrand').value = ci.batBrand || '';
        document.getElementById('batTech').value = ci.batTech || '';
        document.getElementById('batPrice').value = ci.batPrice || '';
        document.getElementById('smBrand').value = ci.smBrand || '';
        document.getElementById('smTech').value = ci.smTech || '';
        document.getElementById('smPrice').value = ci.smPrice || '';
        document.getElementById('mountBrand').value = ci.mountBrand || '';
        document.getElementById('mountTech').value = ci.mountTech || '';
        document.getElementById('mountPrice').value = ci.mountPrice || '';
        document.getElementById('sysWarranty').value = ci.sysWarranty || '';
        updateLiveStats();
    }
    
    if (data.calculators && data.calculators.calc1) {
        const c1 = data.calculators.calc1;
        document.getElementById('calc1_voc').value = c1.voc || '';
        document.getElementById('calc1_vmpp').value = c1.vmpp || '';
        document.getElementById('calc1_count').value = c1.count || '';
        document.getElementById('calc1_tempcoeff_voc').value = c1.tempcoeff_voc || '';
        document.getElementById('calc1_tempcoeff_vmpp').value = c1.tempcoeff_vmpp || '';
        document.getElementById('calc1_mintemp').value = c1.mintemp || '-10';
        document.getElementById('calc1_maxtemp').value = c1.maxtemp || '70';
        document.getElementById('calc1_stctemp').value = c1.stctemp || '25';
        calculateStringVoltage();
    }
    
    if (data.calculators && data.calculators.calc2) {
        const c2 = data.calculators.calc2;
        document.getElementById('calc2_maxvoltage').value = c2.maxvoltage || '';
        document.getElementById('calc2_mppt_min').value = c2.mppt_min || '';
        document.getElementById('calc2_mppt_max').value = c2.mppt_max || '';
        document.getElementById('calc2_safety').value = c2.safety || '95';
        document.getElementById('calc2_voc').value = c2.voc || '';
        document.getElementById('calc2_vmpp').value = c2.vmpp || '';
        document.getElementById('calc2_tempcoeff_voc').value = c2.tempcoeff_voc || '';
        document.getElementById('calc2_tempcoeff_vmpp').value = c2.tempcoeff_vmpp || '';
        document.getElementById('calc2_mintemp').value = c2.mintemp || '-10';
        document.getElementById('calc2_maxtemp').value = c2.maxtemp || '70';
        document.getElementById('calc2_stctemp').value = c2.stctemp || '25';
        calculateModuleCount();
    }
    
    if (data.calculators && data.calculators.amort) {
        const am = data.calculators.amort;
        document.getElementById('amort_system_select').value = am.system_id || '';
        
        const event = new Event('change');
        document.getElementById('amort_system_select').dispatchEvent(event);
        
        if (!am.system_id) {
            document.getElementById('amort_cost').value = am.cost || '';
            document.getElementById('amort_power').value = am.power || '';
        }
        
        document.getElementById('amort_yield').value = am.yield || '1000';
        document.getElementById('amort_selfconsumption').value = am.selfconsumption || '30';
        document.getElementById('amort_elec_price').value = am.elec_price || '35';
        document.getElementById('amort_feed_in').value = am.feed_in || '8.2';
        document.getElementById('amort_operating').value = am.operating || '150';
        document.getElementById('amort_years').value = am.years || '25';
    }
}

document.getElementById('saveBtn').addEventListener('click', () => {
    const data = JSON.stringify(getAllData(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pv-komplett-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    
    // Visuelles Feedback
    const btn = document.getElementById('saveBtn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Gespeichert!';
    btn.style.background = 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 2000);
});

document.getElementById('loadBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                loadAllData(data);
                
                // Visuelles Feedback
                const btn = document.getElementById('loadBtn');
                const originalText = btn.textContent;
                btn.textContent = '✅ Geladen!';
                btn.style.background = 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            } catch(err) {
                alert('Fehler beim Laden der Datei');
            }
        };
        reader.readAsText(file);
    };
    input.click();
});

// Rechner 1: Strangspannung und MPPT-Bereich berechnen
const calc1Inputs = ['calc1_voc', 'calc1_vmpp', 'calc1_count', 'calc1_tempcoeff_voc', 'calc1_tempcoeff_vmpp', 'calc1_mintemp', 'calc1_maxtemp', 'calc1_stctemp'];
calc1Inputs.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        calculateStringVoltage();
        autoSave();
    });
});

function calculateStringVoltage() {
    const voc = parseFloat(document.getElementById('calc1_voc').value);
    const vmpp = parseFloat(document.getElementById('calc1_vmpp').value);
    const count = parseInt(document.getElementById('calc1_count').value);
    const tempCoeffVoc = parseFloat(document.getElementById('calc1_tempcoeff_voc').value);
    const tempCoeffVmpp = parseFloat(document.getElementById('calc1_tempcoeff_vmpp').value);
    const minTemp = parseFloat(document.getElementById('calc1_mintemp').value);
    const maxTemp = parseFloat(document.getElementById('calc1_maxtemp').value);
    const stcTemp = parseFloat(document.getElementById('calc1_stctemp').value) || 25;

    if (!voc || !count || !tempCoeffVoc || isNaN(minTemp)) {
        document.getElementById('calc1_result').style.display = 'none';
        document.getElementById('calc1_mppt_result').style.display = 'none';
        return;
    }

    const tempDiffMin = minTemp - stcTemp;
    const vocCorrectedMin = voc * (1 + (tempCoeffVoc / 100) * tempDiffMin);
    const stringVoltageVoc = vocCorrectedMin * count;

    document.getElementById('calc1_voltage').textContent = stringVoltageVoc.toFixed(1) + ' V';
    document.getElementById('calc1_details').textContent = 
        `${count} Module × ${vocCorrectedMin.toFixed(2)} V (korrigiert bei ${minTemp}°C)`;
    document.getElementById('calc1_result').style.display = 'block';

    if (vmpp && tempCoeffVmpp && !isNaN(maxTemp)) {
        const vmppCorrectedMin = vmpp * (1 + (tempCoeffVmpp / 100) * tempDiffMin);
        const stringVoltageMppMax = vmppCorrectedMin * count;

        const tempDiffMax = maxTemp - stcTemp;
        const vmppCorrectedMax = vmpp * (1 + (tempCoeffVmpp / 100) * tempDiffMax);
        const stringVoltageMppMin = vmppCorrectedMax * count;

        document.getElementById('calc1_vmpp_min').textContent = stringVoltageMppMin.toFixed(1) + ' V';
        document.getElementById('calc1_vmpp_max').textContent = stringVoltageMppMax.toFixed(1) + ' V';
        document.getElementById('calc1_mppt_result').style.display = 'block';
    } else {
        document.getElementById('calc1_mppt_result').style.display = 'none';
    }
}

// Rechner 2: Modulanzahl und MPPT-Prüfung
const calc2Inputs = ['calc2_maxvoltage', 'calc2_mppt_min', 'calc2_mppt_max', 'calc2_safety', 'calc2_voc', 'calc2_vmpp', 'calc2_tempcoeff_voc', 'calc2_tempcoeff_vmpp', 'calc2_mintemp', 'calc2_maxtemp', 'calc2_stctemp'];
calc2Inputs.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        calculateModuleCount();
        autoSave();
    });
});

function calculateModuleCount() {
    const maxVoltage = parseFloat(document.getElementById('calc2_maxvoltage').value);
    const mpptMin = parseFloat(document.getElementById('calc2_mppt_min').value);
    const mpptMax = parseFloat(document.getElementById('calc2_mppt_max').value);
    const safety = parseFloat(document.getElementById('calc2_safety').value) || 95;
    const voc = parseFloat(document.getElementById('calc2_voc').value);
    const vmpp = parseFloat(document.getElementById('calc2_vmpp').value);
    const tempCoeffVoc = parseFloat(document.getElementById('calc2_tempcoeff_voc').value);
    const tempCoeffVmpp = parseFloat(document.getElementById('calc2_tempcoeff_vmpp').value);
    const minTemp = parseFloat(document.getElementById('calc2_mintemp').value);
    const maxTemp = parseFloat(document.getElementById('calc2_maxtemp').value);
    const stcTemp = parseFloat(document.getElementById('calc2_stctemp').value) || 25;

    if (!maxVoltage || !voc || !tempCoeffVoc || isNaN(minTemp)) {
        document.getElementById('calc2_result').style.display = 'none';
        document.getElementById('calc2_warning').style.display = 'none';
        document.getElementById('calc2_mppt_check').style.display = 'none';
        return;
    }

    const effectiveMaxVoltage = maxVoltage * (safety / 100);
    const tempDiffMin = minTemp - stcTemp;
    const vocCorrectedMin = voc * (1 + (tempCoeffVoc / 100) * tempDiffMin);
    const maxCount = Math.floor(effectiveMaxVoltage / vocCorrectedMin);
    const actualVoltageVoc = vocCorrectedMin * maxCount;

    document.getElementById('calc2_count').textContent = maxCount + ' Module';
    document.getElementById('calc2_details').textContent = 
        `Max. Strangspannung (Voc): ${actualVoltageVoc.toFixed(1)} V bei ${minTemp}°C (${((actualVoltageVoc/maxVoltage)*100).toFixed(1)}% der WR-Max.)`;
    document.getElementById('calc2_result').style.display = 'block';

    const warningDiv = document.getElementById('calc2_warning');
    if (actualVoltageVoc > maxVoltage) {
        warningDiv.className = 'warning-text';
        warningDiv.textContent = '⚠️ WARNUNG: Die berechnete Voc-Spannung überschreitet die WR-Grenze!';
        warningDiv.style.display = 'block';
    } else {
        warningDiv.className = 'success-text';
        warningDiv.textContent = `✓ Voc-Check OK: ${maxCount} Module sind unter der max. WR-Spannung.`;
        warningDiv.style.display = 'block';
    }

    if (vmpp && tempCoeffVmpp && !isNaN(maxTemp) && mpptMin && mpptMax) {
        const vmppCorrectedMin = vmpp * (1 + (tempCoeffVmpp / 100) * tempDiffMin);
        const stringVoltageMppMax = vmppCorrectedMin * maxCount;

        const tempDiffMax = maxTemp - stcTemp;
        const vmppCorrectedMax = vmpp * (1 + (tempCoeffVmpp / 100) * tempDiffMax);
        const stringVoltageMppMin = vmppCorrectedMax * maxCount;

        const mpptCheckDiv = document.getElementById('calc2_mppt_check');
        let mpptStatus = '';
        let mpptClass = '';

        const inRangeMin = stringVoltageMppMin >= mpptMin;
        const inRangeMax = stringVoltageMppMax <= mpptMax;

        if (inRangeMin && inRangeMax) {
            mpptStatus = '✓ MPPT-Bereich vollständig kompatibel';
            mpptClass = 'success-text';
        } else if (!inRangeMin && !inRangeMax) {
            mpptStatus = '✗ MPPT-Bereich nicht kompatibel (beide Grenzen überschritten)';
            mpptClass = 'warning-text';
        } else if (!inRangeMin) {
            mpptStatus = `⚠️ MPPT-Minimum unterschritten bei ${maxTemp}°C (${stringVoltageMppMin.toFixed(1)} V < ${mpptMin} V)`;
            mpptClass = 'warning-text';
        } else {
            mpptStatus = `⚠️ MPPT-Maximum überschritten bei ${minTemp}°C (${stringVoltageMppMax.toFixed(1)} V > ${mpptMax} V)`;
            mpptClass = 'warning-text';
        }

        mpptCheckDiv.className = mpptClass;
        mpptCheckDiv.innerHTML = `
            <strong>${mpptStatus}</strong>
            <div style="margin-top: 10px; font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>MPPT-Bereich WR:</span>
                    <span><strong>${mpptMin} V - ${mpptMax} V</strong></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>String Vmpp bei ${maxTemp}°C:</span>
                    <span class="${inRangeMin ? 'mppt-status-ok' : 'mppt-status-error'}">${stringVoltageMppMin.toFixed(1)} V</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>String Vmpp bei ${minTemp}°C:</span>
                    <span class="${inRangeMax ? 'mppt-status-ok' : 'mppt-status-error'}">${stringVoltageMppMax.toFixed(1)} V</span>
                </div>
            </div>
        `;
        mpptCheckDiv.style.display = 'block';
    } else {
        document.getElementById('calc2_mppt_check').style.display = 'none';
    }
}

// Amortisationsrechner
['amort_yield', 'amort_selfconsumption', 'amort_elec_price', 'amort_feed_in', 'amort_operating', 'amort_years', 'amort_cost', 'amort_power'].forEach(id => {
    document.getElementById(id).addEventListener('input', autoSave);
});

document.getElementById('calculateAmortBtn').addEventListener('click', calculateAmortization);

function calculateAmortization() {
    const cost = parseFloat(document.getElementById('amort_cost').value);
    const power = parseFloat(document.getElementById('amort_power').value);
    const yieldPerKwp = parseFloat(document.getElementById('amort_yield').value);
    const selfConsumption = parseFloat(document.getElementById('amort_selfconsumption').value);
    const elecPrice = parseFloat(document.getElementById('amort_elec_price').value);
    const feedIn = parseFloat(document.getElementById('amort_feed_in').value);
    const operating = parseFloat(document.getElementById('amort_operating').value);
    const years = parseInt(document.getElementById('amort_years').value);

    if (!cost || !power || !yieldPerKwp || !selfConsumption || !elecPrice || !feedIn || isNaN(operating) || !years) {
        alert('Bitte alle Felder ausfüllen!');
        return;
    }

    const annualProduction = power * yieldPerKwp;
    const selfConsumptionKwh = annualProduction * (selfConsumption / 100);
    const feedInKwh = annualProduction - selfConsumptionKwh;

    const savingsFromSelfConsumption = selfConsumptionKwh * (elecPrice / 100);
    const incomeFromFeedIn = feedInKwh * (feedIn / 100);
    const annualSaving = savingsFromSelfConsumption + incomeFromFeedIn - operating;

    const paybackTime = cost / annualSaving;

    const chartYears = [];

const cumulativeCashFlow = [];
const investmentLine = [];
let cumulative = -cost;

for (let i = 0; i <= years; i++) {
    chartYears.push(i);
    investmentLine.push(-cost);
    
    if (i === 0) {
        cumulativeCashFlow.push(cumulative);
    } else {
        cumulative += annualSaving;
        cumulativeCashFlow.push(cumulative);
    }
}

document.getElementById('amort_payback_time').textContent = paybackTime.toFixed(1) + ' Jahre';
document.getElementById('amort_annual_saving').textContent = annualSaving.toFixed(0).toLocaleString('de-DE') + ' €';
document.getElementById('amort_total_profit').textContent = ((annualSaving * years) - cost).toFixed(0).toLocaleString('de-DE') + ' €';
document.getElementById('amort_result').style.display = 'block';

const ctx = document.getElementById('amortChart').getContext('2d');

if (amortChart) {
    amortChart.destroy();
}

amortChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: chartYears,
        datasets: [
            {
                label: 'Kumulierter Cashflow',
                data: cumulativeCashFlow,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            },
            {
                label: 'Investition',
                data: investmentLine,
                borderColor: '#ef4444',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
            },
            {
                label: 'Break-Even',
                data: Array(chartYears.length).fill(0),
                borderColor: '#94a3b8',
                borderWidth: 1,
                borderDash: [2, 2],
                fill: false,
                pointRadius: 0
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: 'Amortisationsverlauf über ' + years + ' Jahre',
                font: {
                    size: 16,
                    weight: 'bold'
                },
                color: '#f1f5f9'
            },
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#cbd5e1'
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        label += new Intl.NumberFormat('de-DE', { 
                            style: 'currency', 
                            currency: 'EUR',
                            maximumFractionDigits: 0
                        }).format(context.parsed.y);
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: '#334155'
                },
                ticks: {
                    color: '#cbd5e1',
                    callback: function(value) {
                        return new Intl.NumberFormat('de-DE', { 
                            style: 'currency', 
                            currency: 'EUR',
                            maximumFractionDigits: 0
                        }).format(value);
                    }
                },
                title: {
                    display: true,
                    text: 'Kumulierter Gewinn/Verlust (€)',
                    color: '#cbd5e1'
                }
            },
            x: {
                grid: {
                    color: '#334155'
                },
                ticks: {
                    color: '#cbd5e1'
                },
                title: {
                    display: true,
                    text: 'Jahre',
                    color: '#cbd5e1'
                }
            }
        }
    }
});
}
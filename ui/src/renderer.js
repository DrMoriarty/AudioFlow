// Config
let configJSON;

const defaults = {
    amplifier: { toggle: false, g: 0 },
    equalizer: {
        toggle: false,
        f: [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000],
        q: [1.41, 1.41, 1.41, 1.41, 1.41, 1.41, 1.41, 1.41, 1.41, 1.41],
        g: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    reverb: { toggle: false, dw: 0, ir: '' },
    correction: { toggle: false, dw: 1.0, ir: '', recent: [] },
    bufferSize: 4096,
    ui: { expanded: { correcting: true, preamplifier: true, equalizer: true, reverb: true, settings: true } }
};

// DOM Elements
const autoPreampToggle = document.getElementById('autoPreampToggle');
const equalizerToggle = document.getElementById('equalizerToggle');
const reverbToggle = document.getElementById('reverbToggle');
const correctingToggle = document.getElementById('correctingToggle');

const preamplifierToggle = document.getElementById('preamplifierToggle');
const preamplifierBody = document.getElementById('preamplifierBody');
const preamplifierGainBox = document.getElementById('preamplifierGainBox');
const preampGainBox = preamplifierGainBox;

const preampSlider = document.getElementById('preampSlider');

const selectEqualizerPreset = document.getElementById('selectEqualizerPreset')
const sliderContainers = document.getElementsByClassName('eqSliderContainer');
let eqSliders = [];
let eqFBoxes = [];
let eqQBoxes = [];
let eqGainBoxes = [];

const selectReverbPreset = document.getElementById('selectReverbPreset')
const customIRButton = document.getElementById('customIRButton');
const drywetSlider = document.getElementById('drywetSlider');
const drywetBox = document.getElementById('drywetBox');

const correctingBody = document.getElementById('correctingBody');
const selectCorrectionIR = document.getElementById('selectCorrectionIR');
const correctionIRButton = document.getElementById('correctionIRButton');
const correctionDWSlider = document.getElementById('correctionDWSlider');
const correctionDWBox = document.getElementById('correctionDWBox');

const correctingChevron = document.getElementById('correctingChevron');
const preamplifierChevron = document.getElementById('preamplifierChevron');
const equalizerChevron = document.getElementById('equalizerChevron');
const reverbChevron = document.getElementById('reverbChevron');
const settingsChevron = document.getElementById('settingsChevron');

function updateDryWetBoxPosition() {
    const slider = drywetSlider;
    const box = drywetBox;
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = (val - min) / (max - min);

    const sliderRect = slider.getBoundingClientRect();
    const containerRect = slider.parentElement.getBoundingClientRect();

    const trackPadLeft = 6;
    const trackPadRight = 6;
    const thumbW = 8;

    const trackWidth = sliderRect.width - trackPadLeft - trackPadRight - thumbW;
    const px = trackPadLeft + percent * trackWidth + thumbW / 2;

    const offsetLeft = sliderRect.left - containerRect.left + px;
    box.style.left = offsetLeft - box.offsetWidth / 2 + 'px';
}

function updatePreampGainBoxPosition() {
    const slider = preampSlider;
    const box = preamplifierGainBox;
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = (val - min) / (max - min);

    const sliderRect = slider.getBoundingClientRect();
    const containerRect = slider.parentElement.getBoundingClientRect();

    const trackPadLeft = 6;
    const trackPadRight = 6;
    const thumbW = 8;

    const trackWidth = sliderRect.width - trackPadLeft - trackPadRight - thumbW;
    const px = trackPadLeft + percent * trackWidth + thumbW / 2;

    const offsetLeft = sliderRect.left - containerRect.left + px;
    box.style.left = offsetLeft - box.offsetWidth / 2 + 'px';
}

function updateCorrectionDWBoxPosition() {
    const slider = correctionDWSlider;
    const box = correctionDWBox;
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = (val - min) / (max - min);

    const sliderRect = slider.getBoundingClientRect();
    const containerRect = slider.parentElement.getBoundingClientRect();

    const trackPadLeft = 6;
    const trackPadRight = 6;
    const thumbW = 8;

    const trackWidth = sliderRect.width - trackPadLeft - trackPadRight - thumbW;
    const px = trackPadLeft + percent * trackWidth + thumbW / 2;

    const offsetLeft = sliderRect.left - containerRect.left + px;
    box.style.left = offsetLeft - box.offsetWidth / 2 + 'px';
}

const selectOutputDevice = document.getElementById('selectOutputDevice');

const equalizerBody = document.getElementById('equalizerBody');
const reverbBody = document.getElementById('reverbBody');

const settingsBody = document.getElementById('settingsBody');

const selectBufferSize = document.getElementById('selectBufferSize');

// Presets
let equalizerPresets = {};
let reverbPresets = {};

const writeConfigToFile = async function() {
    await window.electronAPI.writeConfig(configJSON);
};

const bandLefts = [
    94, 142, 190, 238, 286, 334, 382, 430, 478, 526
];

function updateSliderPositions() {
    const hzLabel = document.getElementById('hzLabel');
    const sliderLabelsDiv = document.getElementById('sliderLabels');
    const gainLabel = document.getElementById('gainLabel');
    const qLabel = document.getElementById('qLabel');
    const eqContainer = document.getElementById('equalizerContainer');
    if (!hzLabel || !sliderLabelsDiv || !gainLabel || !qLabel || !eqContainer) return;
    if (equalizerBody.style.display === 'none' || hzLabel.offsetParent === null) return;

    const containerTop = eqContainer.getBoundingClientRect().top;

    const fBoxTop = Math.round(hzLabel.getBoundingClientRect().top) - containerTop;
    const gainTop = Math.round(gainLabel.getBoundingClientRect().top) - containerTop;
    const qTop = Math.round(qLabel.getBoundingClientRect().top) - containerTop;

    const top30Top = Math.round(sliderLabelsDiv.children[0].getBoundingClientRect().top);
    const sliderTop = top30Top + 108 - containerTop;

    for (let i = 0; i < bandLefts.length; i++) {
        const f = document.getElementById('fBox' + i);
        const s = document.getElementById('eqSlider' + i);
        const g = document.getElementById('gainBox' + i);
        const q = document.getElementById('qBox' + i);
        if (!f || !s || !g || !q) continue;

        f.style.top = fBoxTop + 'px';
        s.style.top = sliderTop + 'px';
        g.style.top = gainTop + 'px';
        q.style.top = qTop + 'px';

        const lx = bandLefts[i] + 'px';
        const slx = (bandLefts[i] - 92) + 'px';
        f.style.left = lx;
        g.style.left = lx;
        q.style.left = lx;
        s.style.left = slx;
    }
}

const fitWindowToContent = function() {
    const body = document.body;
    const width = body.scrollWidth;
    let height = body.scrollHeight;
    for (let i = 0; i < 10; i++) {
        const el = document.getElementById('qBox' + i) || document.getElementById('eqSlider' + i);
        if (el) {
            const r = el.getBoundingClientRect();
            const bottom = Math.round(r.top + r.height);
            if (bottom > height) height = bottom;
        }
    }
    window.electronAPI.resizeWindow(width, height);
};

const renderConfig = function () {
    equalizerToggle.checked = configJSON['equalizer']['toggle'];
    reverbToggle.checked = configJSON['reverb']['toggle'];
    preamplifierToggle.checked = configJSON['amplifier']['toggle'];
    correctingToggle.checked = configJSON['correction']['toggle'];

    const expanded = configJSON['ui']['expanded'];
    correctingBody.style.display = expanded['correcting'] ? 'block' : 'none';
    preamplifierBody.style.display = expanded['preamplifier'] ? 'block' : 'none';
    equalizerBody.style.display = expanded['equalizer'] ? 'block' : 'none';
    reverbBody.style.display = expanded['reverb'] ? 'block' : 'none';
    settingsBody.style.display = expanded['settings'] ? 'block' : 'none';

    correctingChevron.classList.toggle('collapsed', !expanded['correcting']);
    preamplifierChevron.classList.toggle('collapsed', !expanded['preamplifier']);
    equalizerChevron.classList.toggle('collapsed', !expanded['equalizer']);
    reverbChevron.classList.toggle('collapsed', !expanded['reverb']);
    settingsChevron.classList.toggle('collapsed', !expanded['settings']);

    preampSlider.value = configJSON['amplifier']['g'];
    preamplifierGainBox.value = configJSON['amplifier']['g'];
    updatePreampSliderBg();

    for (let i = 0; i < sliderContainers.length; i++) {
        eqSliders[i].value = configJSON['equalizer']['g'][i];
        eqFBoxes[i].value = configJSON['equalizer']['f'][i];
        eqQBoxes[i].value = configJSON['equalizer']['q'][i];
        eqGainBoxes[i].value = configJSON['equalizer']['g'][i];
        updateEqSliderBg(i);
    }

    drywetSlider.value = Math.round(configJSON['reverb']['dw'] * 100);
    drywetBox.value = Math.round(configJSON['reverb']['dw'] * 100);
    updateDryWetSliderBg();

    const correctionDW = configJSON['correction']['dw'] !== undefined ? configJSON['correction']['dw'] : 1.0;
    correctionDWSlider.value = Math.round(correctionDW * 100);
    correctionDWBox.value = Math.round(correctionDW * 100);
    updateCorrectionDWSliderBg();

    const irName = configJSON['reverb']['ir'].split('/').pop().split('.')[0];
    const presetKeys = Object.keys(reverbPresets);
    const isPreset = presetKeys.includes(irName);

    const existingCustom = selectReverbPreset.querySelector('option[data-custom]');
    if (existingCustom) existingCustom.remove();

    if (isPreset) {
        selectReverbPreset.value = irName;
    } else {
        const customName = configJSON['reverb']['ir'].split('/').pop();
        const opt = document.createElement('option');
        opt.value = customName;
        opt.textContent = customName;
        opt.setAttribute('data-custom', 'true');
        selectReverbPreset.insertBefore(opt, selectReverbPreset.firstChild);
        selectReverbPreset.value = customName;
    }

    // Correction IR dropdown
    selectCorrectionIR.innerHTML = '';
    const correctionRecent = configJSON['correction']['recent'] || [];
    for (const filePath of correctionRecent) {
        const fileName = filePath.split('/').pop();
        const opt = document.createElement('option');
        opt.value = filePath;
        opt.textContent = fileName;
        selectCorrectionIR.appendChild(opt);
    }
    if (configJSON['correction']['ir']) {
        selectCorrectionIR.value = configJSON['correction']['ir'];
    }

    selectBufferSize.value = String(configJSON['bufferSize'] || 4096);

    updateSliderPositions();
    fitWindowToContent();
    requestAnimationFrame(updateDryWetBoxPosition);
    requestAnimationFrame(updatePreampGainBoxPosition);
    requestAnimationFrame(updateCorrectionDWBoxPosition);
}

const loadPresets = function () {
    equalizerPresets = window.electronAPI.getEqualizerPresets();
    reverbPresets = window.electronAPI.getReverbPresets();
    for (const key in equalizerPresets) {
        let node = document.createElement('option');
        node.value = key;
        node.text = key.charAt(0).toUpperCase() + key.slice(1);
        selectEqualizerPreset.appendChild(node);
    }
    for (const key in reverbPresets) {
        let node = document.createElement('option');
        node.value = key;
        node.text = key.charAt(0).toUpperCase() + key.slice(1);
        selectReverbPreset.appendChild(node);
    }
}

const loadOutputDevices = async function () {
    const devices = await window.electronAPI.getAvailableOutputDevices();
    const currentDevice = await window.electronAPI.getCurrentOutputDeviceName();

    selectOutputDevice.innerHTML = '';
    for (const device of devices) {
        let node = document.createElement('option');
        node.value = device;
        node.text = device;
        selectOutputDevice.appendChild(node);
    }
    selectOutputDevice.value = currentDevice;
    fitWindowToContent();
}

selectOutputDevice.addEventListener('change', async function () {
    const selectedDevice = selectOutputDevice.value;
    await window.electronAPI.setOutputDevice(selectedDevice);
    const currentDevice = await window.electronAPI.getCurrentOutputDeviceName();
    selectOutputDevice.value = currentDevice;
});

selectBufferSize.addEventListener('change', async function () {
    const value = parseInt(selectBufferSize.value);
    configJSON['bufferSize'] = value;
    writeConfigToFile();
    await window.electronAPI.setBufferSize(value);
});

// Set event listeners for presets
selectEqualizerPreset.addEventListener('change', async function () {
    if (selectEqualizerPreset.value != 'custom') {
        configJSON['equalizer']['f'] = [...equalizerPresets[selectEqualizerPreset.value]['f']];
        configJSON['equalizer']['q'] = [...equalizerPresets[selectEqualizerPreset.value]['q']];
        configJSON['equalizer']['g'] = [...equalizerPresets[selectEqualizerPreset.value]['g']];
        writeConfigToFile();
        for (let i = 0; i < sliderContainers.length; i++) {
            await window.electronAPI.setEqualizerBand(i, configJSON['equalizer']['f'][i], configJSON['equalizer']['q'][i], configJSON['equalizer']['g'][i]);
        }
    }
    renderConfig();
})
selectReverbPreset.addEventListener('change', async function () {
    const value = selectReverbPreset.value;
    if (reverbPresets[value]) {
        configJSON['reverb']['ir'] = reverbPresets[value];
    }
    writeConfigToFile();
    await window.electronAPI.setReverbIRFile(configJSON['reverb']['ir']);
    renderConfig();
})

customIRButton.addEventListener('click', async function () {
    const filePath = await window.electronAPI.showOpenFileDialog();
    if (filePath) {
        configJSON['reverb']['ir'] = filePath;
        writeConfigToFile();
        await window.electronAPI.setReverbIRFile(filePath);
        renderConfig();
    }
})

selectCorrectionIR.addEventListener('change', async function () {
    const filePath = selectCorrectionIR.value;
    if (filePath) {
        configJSON['correction']['ir'] = filePath;
        writeConfigToFile();
        await window.electronAPI.setCorrectionIRFile(filePath);
    }
})

correctionIRButton.addEventListener('click', async function () {
    const filePath = await window.electronAPI.showOpenFileDialog();
    if (filePath) {
        configJSON['correction']['ir'] = filePath;
        if (!configJSON['correction']['recent']) configJSON['correction']['recent'] = [];
        configJSON['correction']['recent'] = configJSON['correction']['recent'].filter(f => f !== filePath);
        configJSON['correction']['recent'].unshift(filePath);
        if (configJSON['correction']['recent'].length > 5) {
            configJSON['correction']['recent'] = configJSON['correction']['recent'].slice(0, 5);
        }
        writeConfigToFile();
        await window.electronAPI.setCorrectionIRFile(filePath);
        renderConfig();
    }
})

// Set event listeners for toggles
autoPreampToggle.oninput = function () {
    if (autoPreampToggle.checked) {
        const preamp = -Math.max(0, ...configJSON['equalizer']['g']);
        configJSON['amplifier']['g'] = preamp;
        writeConfigToFile();
        window.electronAPI.setAmplifierGain(preamp);
    }
    renderConfig();
}

preamplifierToggle.oninput = async function () {
    configJSON['amplifier']['toggle'] = this.checked;
    writeConfigToFile();
    await window.electronAPI.setAmplifierToggle(this.checked);
    renderConfig();
}

equalizerToggle.oninput = async function () {
    configJSON['equalizer']['toggle'] = this.checked;
    writeConfigToFile();
    await window.electronAPI.setEqualizerToggle(this.checked);
    renderConfig();
}

reverbToggle.oninput = async function () {
    configJSON['reverb']['toggle'] = this.checked;
    writeConfigToFile();
    await window.electronAPI.setReverbToggle(this.checked);
    renderConfig();
}

correctingToggle.oninput = async function () {
    configJSON['correction']['toggle'] = this.checked;
    writeConfigToFile();
    await window.electronAPI.setCorrectionToggle(this.checked);
    renderConfig();
}


// Chevron expand/collapse handlers
const expandSections = [
    { chevron: correctingChevron, key: 'correcting', body: correctingBody },
    { chevron: preamplifierChevron, key: 'preamplifier', body: preamplifierBody },
    { chevron: equalizerChevron, key: 'equalizer', body: equalizerBody },
    { chevron: reverbChevron, key: 'reverb', body: reverbBody },
    { chevron: settingsChevron, key: 'settings', body: settingsBody },
];
for (const section of expandSections) {
    section.chevron.addEventListener('click', function () {
        const expanded = configJSON['ui']['expanded'];
        expanded[section.key] = !expanded[section.key];
        writeConfigToFile();
        section.body.style.display = expanded[section.key] ? 'block' : 'none';
        section.chevron.classList.toggle('collapsed', !expanded[section.key]);
        updateSliderPositions();
        fitWindowToContent();
    });
}

// Load config values and set event listeners for preamp
preampSlider.oninput = async function () {
    autoPreampToggle.checked = false;
    const value = parseFloat(this.value);
    configJSON['amplifier']['g'] = value;
    writeConfigToFile();
    await window.electronAPI.setAmplifierGain(value);
    renderConfig();
    requestAnimationFrame(updatePreampGainBoxPosition);
};

preampGainBox.onkeydown = async function(e) {
    if (e.keyCode == 13) {
        preampGainBox.blur();
        if (!(isNaN(parseFloat(this.value)) || this.value < -30 || this.value > 30)) {
            autoPreampToggle.checked = false;
            const value = parseFloat(this.value);
            configJSON['amplifier']['g'] = value;
            writeConfigToFile();
            await window.electronAPI.setAmplifierGain(value);
        }
        renderConfig();
        requestAnimationFrame(updatePreampGainBoxPosition);
    }
}

// Set event listeners for all equalizer bands
for (let i = 0; i < sliderContainers.length; i++) {
    const slider = document.getElementById('eqSlider' + i);
    const fBox = document.getElementById('fBox' + i);
    const qBox = document.getElementById('qBox' + i);
    const gainBox = document.getElementById('gainBox' + i);
    eqSliders.push(slider);
    eqFBoxes.push(fBox);
    eqQBoxes.push(qBox);
    eqGainBoxes.push(gainBox);

    slider.oninput = async function() {
        configJSON['equalizer']['g'][i] = parseFloat(this.value);

        if (autoPreampToggle.checked) {
            const preamp = -Math.max(0, ...configJSON['equalizer']['g']);
            configJSON['amplifier']['g'] = preamp;
            await window.electronAPI.setAmplifierGain(preamp);
        }

        selectEqualizerPreset.value = 'custom';

        writeConfigToFile();
        await window.electronAPI.setEqualizerBand(i, configJSON['equalizer']['f'][i], configJSON['equalizer']['q'][i], configJSON['equalizer']['g'][i]);
        renderConfig();
        requestAnimationFrame(updatePreampGainBoxPosition);
    }

    fBox.onkeydown = async function(e) {
        if (e.keyCode == 13) {
            fBox.blur();
            if (!(isNaN(parseFloat(this.value)) || this.value <= 0 || this.value > 16000)) {
                configJSON['equalizer']['f'][i] = parseFloat(this.value);

                selectEqualizerPreset.value = 'custom';

                writeConfigToFile();
                await window.electronAPI.setEqualizerBand(i, configJSON['equalizer']['f'][i], configJSON['equalizer']['q'][i], configJSON['equalizer']['g'][i]);
            }
            renderConfig();
        }
    }

    qBox.onkeydown = async function(e) {
        if (e.keyCode == 13) {
            qBox.blur();
            if (!(isNaN(parseFloat(this.value)) || this.value <= 0 || this.value > 10)) {
                configJSON['equalizer']['q'][i] = parseFloat(this.value);

                selectEqualizerPreset.value = 'custom';

                writeConfigToFile();
                await window.electronAPI.setEqualizerBand(i, configJSON['equalizer']['f'][i], configJSON['equalizer']['q'][i], configJSON['equalizer']['g'][i]);
            }
            renderConfig();
        }
    }

    gainBox.onkeydown = async function(e) {
        if (e.keyCode == 13) {
            gainBox.blur();
            if (!(isNaN(parseFloat(this.value)) || this.value < -30 || this.value > 30)) {
                configJSON['equalizer']['g'][i] = parseFloat(this.value);

                if (autoPreampToggle.checked) {
                    const preamp = -Math.max(0, ...configJSON['equalizer']['g']);
                    configJSON['amplifier']['g'] = preamp;
                    await window.electronAPI.setAmplifierGain(preamp);
                }

                selectEqualizerPreset.value = 'custom';

                writeConfigToFile();
                await window.electronAPI.setEqualizerBand(i, configJSON['equalizer']['f'][i], configJSON['equalizer']['q'][i], configJSON['equalizer']['g'][i]);
            }
            renderConfig()
            requestAnimationFrame(updatePreampGainBoxPosition);
        }
    };
};

// Set event listeners for reverb unit
drywetSlider.oninput = async function () {
    const value = parseFloat(this.value) / 100;
    configJSON['reverb']['dw'] = value;
    writeConfigToFile();
    await window.electronAPI.setReverbDryWet(value);
    renderConfig();
};

drywetBox.onkeydown = async function(e) {
    if (e.keyCode == 13) {
        drywetBox.blur();
        if (!(isNaN(parseFloat(this.value)) || this.value < 0 || this.value > 100)) {
            const value = parseFloat(this.value) / 100;
            configJSON['reverb']['dw'] = value;
            writeConfigToFile();
            await window.electronAPI.setReverbDryWet(value);
        }
        renderConfig();
    }
}

// Set event listeners for correcting dry/wet
correctionDWSlider.oninput = async function () {
    const value = parseFloat(this.value) / 100;
    configJSON['correction']['dw'] = value;
    writeConfigToFile();
    await window.electronAPI.setCorrectionDryWet(value);
    renderConfig();
};

correctionDWBox.onkeydown = async function(e) {
    if (e.keyCode == 13) {
        correctionDWBox.blur();
        if (!(isNaN(parseFloat(this.value)) || this.value < 0 || this.value > 100)) {
            const value = parseFloat(this.value) / 100;
            configJSON['correction']['dw'] = value;
            writeConfigToFile();
            await window.electronAPI.setCorrectionDryWet(value);
        }
        renderConfig();
    }
}

const init = async () => {
    configJSON = await window.electronAPI.readConfig();
    if (!configJSON) configJSON = structuredClone(defaults);
    if (!configJSON['correction']) {
        configJSON['correction'] = structuredClone(defaults.correction);
    }
    if (configJSON['correction']['dw'] === undefined) {
        configJSON['correction']['dw'] = 1.0;
    }
    if (!configJSON['ui']) {
        configJSON['ui'] = structuredClone(defaults.ui);
    }
    if (!configJSON['ui']['expanded']) {
        configJSON['ui']['expanded'] = structuredClone(defaults.ui.expanded);
    }
    const exp = configJSON['ui']['expanded'];
    if (exp['correcting'] === undefined) exp['correcting'] = true;
    if (exp['preamplifier'] === undefined) exp['preamplifier'] = true;
    if (exp['equalizer'] === undefined) exp['equalizer'] = true;
    if (exp['reverb'] === undefined) exp['reverb'] = true;
    if (exp['settings'] === undefined) exp['settings'] = true;
    if (!configJSON['bufferSize']) {
        configJSON['bufferSize'] = 4096;
    }
    loadPresets();
    await loadOutputDevices();
    renderConfig();
};

// Slider dynamic background color
// t: 0 = blue (min), 0.5 = gray (neutral), 1 = red (max)
function sliderBgColor(t) {
    const blue = [46, 51, 111];
    const gray = [50, 58, 70];
    const red = [125, 18, 18];
    const c = t <= 0.5
        ? blue.map((b, i) => Math.round(b + (gray[i] - b) * (t * 2)))
        : gray.map((g, i) => Math.round(g + (red[i] - g) * ((t - 0.5) * 2)));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function updatePreampSliderBg() {
    const val = parseFloat(preampSlider.value);
    preampSlider.style.background = 'none';
    preampSlider.style.backgroundColor = sliderBgColor((val + 30) / 60);
}

function updateEqSliderBg(index) {
    const val = parseFloat(eqSliders[index].value);
    eqSliders[index].style.background = 'none';
    eqSliders[index].style.backgroundColor = sliderBgColor((val + 30) / 60);
}

function updateDryWetSliderBg() {
    const val = parseFloat(drywetSlider.value);
    drywetSlider.style.background = 'none';
    drywetSlider.style.backgroundColor = sliderBgColor(val / 100);
}

function updateCorrectionDWSliderBg() {
    const val = parseFloat(correctionDWSlider.value);
    correctionDWSlider.style.background = 'none';
    correctionDWSlider.style.backgroundColor = sliderBgColor(val / 100);
}

window.addEventListener('resize', updateDryWetBoxPosition);
window.addEventListener('resize', updatePreampGainBoxPosition);
window.addEventListener('resize', updateCorrectionDWBoxPosition);

init();

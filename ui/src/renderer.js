// Config
let configJSON = window.electronAPI.readConfig();

// DOM Elements
const autoPreampToggle = document.getElementById('autoPreampToggle');
const equalizerToggle = document.getElementById('equalizerToggle');
const reverbToggle = document.getElementById('reverbToggle');

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

const selectOutputDevice = document.getElementById('selectOutputDevice');

const equalizerBody = document.getElementById('equalizerBody');
const reverbBody = document.getElementById('reverbBody');

const settingsToggle = document.getElementById('settingsToggle');
const settingsBody = document.getElementById('settingsBody');

// Presets
let equalizerPresets = {};
let reverbPresets = {};

const writeConfigToFile = function() {
    window.electronAPI.writeConfig(configJSON);
};

const bandLefts = [
    94, 142, 190, 238, 286, 334, 382, 430, 478, 526
];

function updateSliderPositions() {
    const hzLabel = document.getElementById('hzLabel');
    const sliderLabelsDiv = document.getElementById('sliderLabels');
    const gainLabel = document.getElementById('gainLabel');
    const qLabel = document.getElementById('qLabel');
    if (!hzLabel || !sliderLabelsDiv || !gainLabel || !qLabel) return;

    const fBoxTop = Math.round(hzLabel.getBoundingClientRect().top);
    const gainTop = Math.round(gainLabel.getBoundingClientRect().top);
    const qTop = Math.round(qLabel.getBoundingClientRect().top);

    const top30Top = Math.round(sliderLabelsDiv.children[0].getBoundingClientRect().top);
    const sliderTop = top30Top + 108;

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

    equalizerBody.style.display = equalizerToggle.checked ? 'block' : 'none';
    reverbBody.style.display = reverbToggle.checked ? 'block' : 'none';
    preamplifierBody.style.display = preamplifierToggle.checked ? 'block' : 'none';
    settingsBody.style.display = settingsToggle.checked ? 'block' : 'none';

    preampSlider.value = configJSON['amplifier']['g'];
    preamplifierGainBox.value = configJSON['amplifier']['g'];

    for (let i = 0; i < sliderContainers.length; i++) {
        eqSliders[i].value = configJSON['equalizer']['g'][i];
        eqFBoxes[i].value = configJSON['equalizer']['f'][i];
        eqQBoxes[i].value = configJSON['equalizer']['q'][i];
        eqGainBoxes[i].value = configJSON['equalizer']['g'][i];
    }

    drywetSlider.value = Math.round(configJSON['reverb']['dw'] * 100);
    drywetBox.value = Math.round(configJSON['reverb']['dw'] * 100);

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

    updateSliderPositions();
    fitWindowToContent();
    requestAnimationFrame(updateDryWetBoxPosition);
    requestAnimationFrame(updatePreampGainBoxPosition);
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

settingsToggle.oninput = function () {
    renderConfig();
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

const init = () => {
    loadPresets();
    loadOutputDevices();
    renderConfig();
};

window.addEventListener('resize', updateDryWetBoxPosition);
window.addEventListener('resize', updatePreampGainBoxPosition);

init();
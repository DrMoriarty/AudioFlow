const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

const rootPath = path.resolve(path.dirname(__dirname), '..');
const assetsPath = path.join(rootPath, 'assets');
const equalizerPresetsPath = path.join(assetsPath, 'eq');
const reverbPresetsPath = path.join(assetsPath, 'ir');

contextBridge.exposeInMainWorld('electronAPI', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,

    readConfig: () => ipcRenderer.invoke('readConfig'),
    writeConfig: (configJSON) => ipcRenderer.invoke('writeConfig', configJSON),

    getEqualizerPresets: () => {
        const files = fs.readdirSync(equalizerPresetsPath);
        const filesDict = {};

        for (const file of files) {
            const presetJSON = JSON.parse(fs.readFileSync(path.join(equalizerPresetsPath, file)));
            const name = file.split('.')[0];
            filesDict[name] = presetJSON;
        }

        return filesDict;
    },
    getReverbPresets: () => {
        const files = fs.readdirSync(reverbPresetsPath);
        const filesDict = {};

        for (const file of files) {
            const name = file.split('.')[0];
            filesDict[name] = path.join('../assets/ir/', file);
        }

        return filesDict;
    },
    getAvailableOutputDevices: () => ipcRenderer.invoke('getAvailableOutputDevices'),
    getCurrentOutputDeviceName: () => ipcRenderer.invoke('getCurrentOutputDeviceName'),
    setOutputDevice: (name) => ipcRenderer.invoke('setOutputDevice', name),
    setReverbToggle: (toggle) => ipcRenderer.invoke('setReverbToggle', toggle),
    setReverbDryWet: (dryWet) => ipcRenderer.invoke('setReverbDryWet', dryWet),
    setReverbIRFile: (path) => ipcRenderer.invoke('setReverbIRFile', path),
    setCorrectionToggle: (toggle) => ipcRenderer.invoke('setCorrectionToggle', toggle),
    setCorrectionDryWet: (dryWet) => ipcRenderer.invoke('setCorrectionDryWet', dryWet),
    setCorrectionIRFile: (path) => ipcRenderer.invoke('setCorrectionIRFile', path),
    showOpenFileDialog: () => ipcRenderer.invoke('showOpenFileDialog'),
    setEqualizerToggle: (toggle) => ipcRenderer.invoke('setEqualizerToggle', toggle),
    setAmplifierToggle: (toggle) => ipcRenderer.invoke('setAmplifierToggle', toggle),
    setAmplifierGain: (gain) => ipcRenderer.invoke('setAmplifierGain', gain),
    setEqualizerBand: (index, f, q, g) => ipcRenderer.invoke('setEqualizerBand', index, f, q, g),
    setBufferSize: (value) => ipcRenderer.invoke('setBufferSize', value),
    resizeWindow: (width, height) => ipcRenderer.invoke('resizeWindow', width, height),
});

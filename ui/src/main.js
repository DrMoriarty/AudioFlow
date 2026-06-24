const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { spawn } = require('child_process');
const path = require('path')
const fs = require('fs');
const readline = require('readline');

const rootPath = path.resolve(path.dirname(__dirname), '..');

const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');
fs.mkdirSync(userDataPath, { recursive: true });

const backendProcess = spawn(path.join(rootPath, '/build/AudioFlow'), [configPath], {
    cwd: path.join(rootPath, '/build')
});

let commandCallbacks = [];
let responseBuffer = '';

const rl = readline.createInterface({
    input: backendProcess.stdout,
    terminal: false
});

const errRl = readline.createInterface({
    input: backendProcess.stderr,
    terminal: false
});

errRl.on('line', (line) => {
    console.error('[AudioFlow]', line);
});

rl.on('line', (line) => {
    if (commandCallbacks.length > 0) {
        const callback = commandCallbacks.shift();
        try {
            callback(JSON.parse(line));
        } catch (e) {
            callback({ error: 'Failed to parse response' });
        }
    }
});

function sendCommand(command) {
    return new Promise((resolve) => {
        commandCallbacks.push(resolve);
        backendProcess.stdin.write(JSON.stringify(command) + '\n');
    });
}

backendProcess.on('exit', (code) => {
    if (code !== 0) {
        console.error(`Process exited with code: ${code}`);
        app.quit();
    }
});

backendProcess.on('error', (error) => {
    console.error(`Error executing file: ${error}`);
    app.quit();
});

ipcMain.handle('readConfig', async () => {
    try {
        return JSON.parse(fs.readFileSync(configPath));
    } catch (e) {
        return null;
    }
});

ipcMain.handle('writeConfig', async (event, configJSON) => {
    const tempPath = configPath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(configJSON, null, 2));
    fs.renameSync(tempPath, configPath);
});

ipcMain.handle('getAvailableOutputDevices', async () => {
    const result = await sendCommand({ action: 'getAvailableOutputDevices' });
    return result.devices || [];
});

ipcMain.handle('getCurrentOutputDeviceName', async () => {
    const result = await sendCommand({ action: 'getCurrentOutputDeviceName' });
    return result.name || '';
});

ipcMain.handle('setOutputDevice', async (event, name) => {
    const result = await sendCommand({ action: 'setOutputDevice', name });
    return result.success || false;
});

ipcMain.handle('setReverbToggle', async (event, toggle) => {
    const result = await sendCommand({ action: 'setReverbToggle', toggle });
    return result.success || false;
});

ipcMain.handle('setReverbDryWet', async (event, dryWet) => {
    const result = await sendCommand({ action: 'setReverbDryWet', dryWet });
    return result.success || false;
});

ipcMain.handle('setReverbIRFile', async (event, path) => {
    const result = await sendCommand({ action: 'setReverbIRFile', path });
    return result.success || false;
});

ipcMain.handle('setCorrectionToggle', async (event, toggle) => {
    const result = await sendCommand({ action: 'setCorrectionToggle', toggle });
    return result.success || false;
});

ipcMain.handle('setCorrectionIRFile', async (event, path) => {
    const result = await sendCommand({ action: 'setCorrectionIRFile', path });
    return result.success || false;
});

ipcMain.handle('setCorrectionDryWet', async (event, dryWet) => {
    const result = await sendCommand({ action: 'setCorrectionDryWet', dryWet });
    return result.success || false;
});

ipcMain.handle('setEqualizerToggle', async (event, toggle) => {
    const result = await sendCommand({ action: 'setEqualizerToggle', toggle });
    return result.success || false;
});

ipcMain.handle('setAmplifierToggle', async (event, toggle) => {
    const result = await sendCommand({ action: 'setAmplifierToggle', toggle });
    return result.success || false;
});

ipcMain.handle('setAmplifierGain', async (event, gain) => {
    const result = await sendCommand({ action: 'setAmplifierGain', gain });
    return result.success || false;
});

ipcMain.handle('setEqualizerBand', async (event, index, f, q, g) => {
    const result = await sendCommand({ action: 'setEqualizerBand', index, f, q, g });
    return result.success || false;
});

ipcMain.handle('setBufferSize', async (event, value) => {
    const result = await sendCommand({ action: 'setBufferSize', value });
    return result.success || false;
});

ipcMain.handle('showOpenFileDialog', async () => {
    if (!win || win.isDestroyed()) return null;
    const result = await dialog.showOpenDialog(win, {
        title: 'Select Impulse Response',
        filters: [{ name: 'WAV Files', extensions: ['wav'] }],
        properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.handle('resizeWindow', async (event, width, height) => {
    if (win && !win.isDestroyed()) {
        win.setContentSize(width, height);
        if (!win.isVisible()) {
            win.show();
        }
    }
});

let win;

const createWindow = () => {
    win = new BrowserWindow({
        width: 600,
        height: 100,
        backGroundColor: '#0F172A',
        show: false,
        resizable: false,
        fullscreenable: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    win.loadFile('src/index.html');
}

app.on('ready', () => {
    createWindow();
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    backendProcess.kill();
});

const { app, BrowserWindow, ipcMain } = require('electron')
const { spawn } = require('child_process');
const path = require('path')
const readline = require('readline');

const rootPath = path.resolve(path.dirname(__dirname), '..');
const backendProcess = spawn(path.join(rootPath, '/build/AudioFlow'), [], {
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

ipcMain.handle('resizeWindow', async (event, width, height) => {
    if (win && !win.isDestroyed()) {
        win.setContentSize(width, height);
        if (!win.isVisible()) {
            win.show();
        }
    }
});

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
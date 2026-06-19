# AudioFlow - Agent Guide

## What It Is
macOS system audio equalizer (10-band EQ + convolution reverb). C++17, CoreAudio + Accelerate. macOS only.

## Build
```bash
cmake -B build -S .
cmake --build build
```
Output: `./build/AudioFlow`

No test framework, linter, or type checker is configured.

## Project Structure
- `src/` - Entry point (`main.cpp`) and top-level `Processing` class
- `processing/` - DSP modules: amplifier, equalizer, IIR filter, convolution reverb, smoother
- `fileutils/` - Config loading, globals, IR file reader
- `lib/` - Vendored nlohmann/json (`json.hpp`)
- `assets/` - Driver, impulse responses, EQ presets, icons
- `scripts/` - `installer.sh` / `uninstaller.sh` (requires sudo for HAL plugin install)
- `ui/` - Separate web UI (has own `package.json`, Tailwind)
- `config.json` - Runtime config (EQ bands, reverb IR path, toggles)

## Key Architecture
- `main.cpp` sets up CoreAudio IOProcs: captures from virtual "AudioFlow 2ch" driver, processes, outputs to real device
- `Processing` class owns amplifier, equalizer, convolution reverb; hot-reloads from `config.json` on change
- Globals in `fileutils/globals.cpp`: driver name, buffer size (4096), smoother steps, convolution chunk size
- Uses BlackHole loopback driver (in `assets/driver/`) to intercept system audio

## Constraints
- Requires macOS with CoreAudio
- Requires BlackHole driver installed to `/Library/Audio/Plug-Ins/HAL`
- Bluetooth audio devices are currently incompatible
- Builds are not notarized; installer script disables quarantine

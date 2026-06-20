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
- BlackHole delivers **interleaved stereo** (1 buffer, 2 channels, 8192 float samples = 4096 frames)

## Constraints
- Requires macOS with CoreAudio
- Requires BlackHole driver installed to `/Library/Audio/Plug-Ins/HAL`
- Bluetooth audio devices are currently incompatible
- Builds are not notarized; installer script disables quarantine

## Known Gotchas
- **Equalizer MUST process L and R channels independently** — the IIR filter processes interleaved stereo. Processing L then R on the same filter state causes 2× frequency doubling (filter sees 96 kHz instead of 48 kHz). Each channel needs its own filter state save/restore. See `equalizer.cpp` `process()`.
- All CoreAudio calls (notably `kAudioDevicePropertyNominalSampleRate`) return the nominal rate, which matches the actual rate for all known devices — confirmed as 48000 Hz for both BlackHole and SMSL.

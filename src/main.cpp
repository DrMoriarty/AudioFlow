#include <CoreFoundation/CoreFoundation.h>
#include <CoreAudio/CoreAudio.h>
#include <iostream>
#include <map>
#include <csignal>
#include <memory>
#include <thread>
#include <atomic>
#include "processing.h"
#include "../fileutils/globals.h"
#include "../lib/json.hpp"

using json = nlohmann::json;

UInt32 driverID;
UInt32 defaultDeviceID;

AudioDeviceIOProcID inputIOProcId;
AudioDeviceIOProcID outputIOProcID;

std::vector<float> sharedBuffer;
std::mutex bufferMutex;

std::unique_ptr<Processing> audioProcessor;
std::mutex audioProcessorMutex;

Config config;

std::atomic<bool> running{true};

std::map<UInt32 , std::string> getAudioDevices() {
    AudioObjectPropertyAddress propAddress;
    propAddress.mSelector = kAudioHardwarePropertyDevices;
    propAddress.mScope = kAudioObjectPropertyScopeGlobal;
    propAddress.mElement = kAudioObjectPropertyElementMain;

    UInt32 propSize;
    OSStatus status = AudioObjectGetPropertyDataSize(
            kAudioObjectSystemObject, &propAddress, 0, nullptr, &propSize);

    if (status != noErr) {
        std::cerr << "Error getting device list size." << std::endl;
        return std::map<unsigned int, std::string>{};
    }

    AudioDeviceID* devices = new AudioDeviceID[propSize / sizeof(AudioDeviceID)];

    status = AudioObjectGetPropertyData(
            kAudioObjectSystemObject, &propAddress, 0, nullptr, &propSize, devices);

    if (status != noErr) {
        std::cerr << "Error getting device list." << std::endl;
        delete[] devices;
        return std::map<unsigned int, std::string>{};
    }

    std::map<AudioDeviceID, std::string> m;
    for (UInt32 i = 0; i < propSize / sizeof(AudioDeviceID); ++i) {
        CFStringRef cfName;
        propAddress.mSelector = kAudioDevicePropertyDeviceName;
        propAddress.mScope = kAudioObjectPropertyScopeGlobal;
        propAddress.mElement = kAudioObjectPropertyElementMain;

        UInt32 size = sizeof(CFStringRef);
        status = AudioObjectGetPropertyData(
                devices[i], &propAddress, 0, nullptr, &size, &cfName);

        if (status != noErr) {
            std::cerr << "Error getting device list." << std::endl;
            delete[] devices;
            return std::map<unsigned int, std::string>{};
        }

        AudioDeviceID deviceId = devices[i];
        char deviceName[256];

        propAddress.mSelector = kAudioObjectPropertyName;
        propAddress.mScope = kAudioObjectPropertyScopeGlobal;
        propAddress.mElement = kAudioObjectPropertyElementMain;

        UInt32 dataSize = sizeof(CFStringRef);

        status = AudioObjectGetPropertyData(
                deviceId,
                &propAddress,
                0,
                nullptr,
                &dataSize,
                &cfName
        );

        if (status != noErr) {
            std::cerr << "Error getting device name: " << status << std::endl;
            return std::map<unsigned int, std::string>{};
        }

        CFStringGetCString(cfName, deviceName, sizeof(deviceName), kCFStringEncodingUTF8);
        CFRelease(cfName);

        m[deviceId] = deviceName;
    }

    delete[] devices;
    return m;
}

UInt32 getDefaultOutputDevice() {
    OSStatus status;
    AudioObjectPropertyAddress propertyAddress;
    AudioObjectID deviceID;

    propertyAddress.mSelector = kAudioHardwarePropertyDefaultOutputDevice;
    propertyAddress.mScope = kAudioObjectPropertyScopeGlobal;
    propertyAddress.mElement = kAudioObjectPropertyElementMain;

    UInt32 dataSize = sizeof(deviceID);
    status = AudioObjectGetPropertyData(kAudioObjectSystemObject, &propertyAddress, 0, nullptr, &dataSize, &deviceID);
    if (status != noErr) {
        std::cerr << "Error getting default output device ID." << std::endl;
        return 0; // Return 0 or another appropriate error value
    }

    return deviceID;
}

bool setDefaultSystemOutputDevice(UInt32 deviceID) {
    OSStatus status;
    AudioObjectPropertyAddress propertyAddress;

    propertyAddress.mSelector = kAudioHardwarePropertyDefaultSystemOutputDevice;
    propertyAddress.mScope = kAudioObjectPropertyScopeGlobal;
    propertyAddress.mElement = kAudioObjectPropertyElementMain;

    UInt32 dataSize = sizeof(deviceID);
    status = AudioObjectSetPropertyData(kAudioObjectSystemObject, &propertyAddress, 0, nullptr, dataSize, &deviceID);
    if (status != noErr) {
        std::cerr << "Error setting default system output device ID." << std::endl;
        return false;
    }

    return true;
}

bool setDefaultOutputDevice(UInt32 deviceID) {
    OSStatus status;
    AudioObjectPropertyAddress propertyAddress;

    propertyAddress.mSelector = kAudioHardwarePropertyDefaultOutputDevice;
    propertyAddress.mScope = kAudioObjectPropertyScopeGlobal;
    propertyAddress.mElement = kAudioObjectPropertyElementMain;

    UInt32 dataSize = sizeof(deviceID);
    status = AudioObjectSetPropertyData(kAudioObjectSystemObject, &propertyAddress, 0, nullptr, dataSize, &deviceID);
    if (status != noErr) {
        std::cerr << "Error setting default output device ID." << std::endl;
        return false;
    }

    return true;
}

bool setAudioDeviceBufferSize(AudioDeviceID deviceID, UInt32 bufferSizeInFrames) {
    OSStatus status;
    AudioObjectPropertyAddress propertyAddress;
    propertyAddress.mSelector = kAudioDevicePropertyBufferFrameSize;
    propertyAddress.mScope = kAudioObjectPropertyScopeGlobal;
    propertyAddress.mElement = kAudioObjectPropertyElementMain;

    status = AudioObjectSetPropertyData(deviceID, &propertyAddress, 0, nullptr, sizeof(UInt32), &bufferSizeInFrames);
    if (status != noErr) {
        std::cerr << "Error setting buffer size: " << status << std::endl;
        return false;
    }

    return true;
}

float getAudioDeviceVolume(UInt32 deviceID) {
    OSStatus status;
    float volume;

    AudioObjectPropertyAddress volumeAddress;
    volumeAddress.mSelector = kAudioDevicePropertyVolumeScalar;
    volumeAddress.mScope = kAudioDevicePropertyScopeOutput;
    volumeAddress.mElement = kAudioObjectPropertyElementMain;

    UInt32 dataSize = sizeof(float);
    status = AudioObjectGetPropertyData(deviceID, &volumeAddress, 0, nullptr, &dataSize, &volume);
    if (status != noErr) {
        std::cerr << "Error getting volume." << std::endl;
        return -1.0; // Return a negative value to indicate error
    }

    return volume;
}

bool setAudioDeviceVolume(UInt32 deviceID, float volume) {
    OSStatus status;

    AudioObjectPropertyAddress volumeAddress;
    volumeAddress.mSelector = kAudioDevicePropertyVolumeScalar;
    volumeAddress.mScope = kAudioDevicePropertyScopeOutput;
    volumeAddress.mElement = kAudioObjectPropertyElementMain;

    status = AudioObjectSetPropertyData(deviceID, &volumeAddress, 0, nullptr, sizeof(float), &volume);
    if (status != noErr) {
        std::cerr << "Error setting property data." << std::endl;
        return false;
    }

    UInt32 mute = floor(1 - volume);
    AudioObjectPropertyAddress muteAddress;
    muteAddress.mSelector = kAudioDevicePropertyMute;
    muteAddress.mScope = kAudioDevicePropertyScopeOutput;
    muteAddress.mElement = kAudioObjectPropertyElementMain;

    status = AudioObjectSetPropertyData(deviceID, &muteAddress, 0, nullptr, sizeof(UInt32), &mute);
    if (status != noErr) {
        std::cerr << "Error unmuting device." << std::endl;
        return false;
    }

    return true;
}

OSStatus defaultDeviceIOProc(
        AudioObjectID inDevice,
        const AudioTimeStamp* inNow,
        const AudioBufferList* inInputData,
        const AudioTimeStamp* inInputTime,
        AudioBufferList* outOutputData,
        const AudioTimeStamp* inOutputTime,
        void* inClientData
);

std::string getCurrentOutputDeviceName() {
    AudioObjectPropertyAddress propAddress;
    propAddress.mSelector = kAudioObjectPropertyName;
    propAddress.mScope = kAudioObjectPropertyScopeGlobal;
    propAddress.mElement = kAudioObjectPropertyElementMain;

    CFStringRef cfName;
    UInt32 size = sizeof(CFStringRef);
    OSStatus status = AudioObjectGetPropertyData(
            defaultDeviceID, &propAddress, 0, nullptr, &size, &cfName);
    if (status != noErr) {
        return "";
    }

    char name[256];
    CFStringGetCString(cfName, name, sizeof(name), kCFStringEncodingUTF8);
    CFRelease(cfName);
    return std::string(name);
}

std::vector<std::string> getAvailableOutputDevices() {
    std::vector<std::string> result;
    auto devices = getAudioDevices();

    for (auto const& [deviceID, name] : devices) {
        AudioObjectPropertyAddress propAddress;
        propAddress.mSelector = kAudioDevicePropertyStreams;
        propAddress.mScope = kAudioObjectPropertyScopeOutput;
        propAddress.mElement = kAudioObjectPropertyElementMain;

        UInt32 dataSize = 0;
        OSStatus status = AudioObjectGetPropertyDataSize(
                deviceID, &propAddress, 0, nullptr, &dataSize);
        if (status == noErr && dataSize > 0) {
            result.push_back(name);
        }
    }

    return result;
}

bool setOutputDevice(const std::string& name) {
    auto devices = getAudioDevices();
    UInt32 newDeviceID = 0;
    bool found = false;

    for (auto const& [id, deviceName] : devices) {
        if (deviceName == name) {
            newDeviceID = id;
            found = true;
            break;
        }
    }

    if (!found) {
        std::cerr << "Device not found: " << name << std::endl;
        return false;
    }

    if (newDeviceID == defaultDeviceID) {
        return true;
    }

    AudioDeviceStop(defaultDeviceID, outputIOProcID);
    AudioDeviceDestroyIOProcID(defaultDeviceID, outputIOProcID);

    float driverVolume = getAudioDeviceVolume(driverID);
    setAudioDeviceVolume(defaultDeviceID, driverVolume);
    defaultDeviceID = newDeviceID;
    setDefaultOutputDevice(defaultDeviceID);
    setDefaultSystemOutputDevice(defaultDeviceID);
    setAudioDeviceVolume(defaultDeviceID, 1);

    UInt32 bufferSizeInFrames = bufferSize;
    setAudioDeviceBufferSize(defaultDeviceID, bufferSizeInFrames);

    AudioDeviceCreateIOProcID(defaultDeviceID, defaultDeviceIOProc, nullptr, &outputIOProcID);
    AudioDeviceStart(defaultDeviceID, outputIOProcID);

    return true;
}

void handleCommand(const std::string& line) {
    try {
        auto cmd = json::parse(line);
        std::string action = cmd["action"];

        if (action == "getAvailableOutputDevices") {
            auto devices = getAvailableOutputDevices();
            json response = {{"devices", devices}};
            std::cout << response.dump() << std::endl;
        } else if (action == "getCurrentOutputDeviceName") {
            std::string name = getCurrentOutputDeviceName();
            json response = {{"name", name}};
            std::cout << response.dump() << std::endl;
        } else if (action == "setOutputDevice") {
            std::string deviceName = cmd["name"];
            bool success = setOutputDevice(deviceName);
            json response = {{"success", success}};
            std::cout << response.dump() << std::endl;
        } else {
            json response = {{"error", "unknown action"}};
            std::cout << response.dump() << std::endl;
        }
    } catch (const std::exception& e) {
        json response = {{"error", e.what()}};
        std::cout << response.dump() << std::endl;
    }
}

void commandLoop() {
    std::string line;
    while (running && std::getline(std::cin, line)) {
        if (!line.empty()) {
            handleCommand(line);
        }
    }
}

void cleanup(int signum) {
    running = false;
    float driverVolume = getAudioDeviceVolume(driverID);
    setAudioDeviceVolume(defaultDeviceID, driverVolume);
    setDefaultOutputDevice(defaultDeviceID);
    setDefaultSystemOutputDevice(defaultDeviceID);

    AudioDeviceStop(driverID, inputIOProcId);
    AudioDeviceStop(defaultDeviceID, outputIOProcID);

    AudioDeviceDestroyIOProcID(driverID, inputIOProcId);
    AudioDeviceDestroyIOProcID(defaultDeviceID, outputIOProcID);

    std::exit(signum);
}

void updateConfig() {
    bool upToDate = config.loadConfig();
    if (!upToDate || audioProcessor == nullptr) {
        auto updated = std::make_unique<Processing>(config, audioProcessor.get(), getAudioDeviceVolume(driverID));
        audioProcessorMutex.lock();
        audioProcessor = std::move(updated);
        audioProcessorMutex.unlock();
    }
}

OSStatus driverIOProc(
        AudioObjectID inDevice,
        const AudioTimeStamp* inNow,
        const AudioBufferList* inInputData,
        const AudioTimeStamp* inInputTime,
        AudioBufferList* outOutputData,
        const AudioTimeStamp* inOutputTime,
        void* inClientData
) {
    for (size_t i = 0; i < inInputData->mNumberBuffers; ++i) {
        AudioBuffer buffer = inInputData->mBuffers[i];
        float* audioData = (float*)buffer.mData;
        UInt32 numSamples = buffer.mDataByteSize / sizeof(float);

        updateConfig();

        bufferMutex.lock();
        for (size_t j = 0; j < numSamples; ++j) {
            sharedBuffer.push_back(audioData[j]);
        }

        if (sharedBuffer.size() == 2 * bufferSize) {
            audioProcessor->process(sharedBuffer);
        }
        bufferMutex.unlock();
    }

    return noErr;
}

OSStatus defaultDeviceIOProc(
        AudioObjectID inDevice,
        const AudioTimeStamp* inNow,
        const AudioBufferList* inInputData,
        const AudioTimeStamp* inInputTime,
        AudioBufferList* outOutputData,
        const AudioTimeStamp* inOutputTime,
        void* inClientData
) {
    for (size_t i = 0; i < outOutputData->mNumberBuffers; ++i) {
        AudioBuffer outBuffer = outOutputData->mBuffers[i];
        float* outputData = (float*)outBuffer.mData;
        UInt32 numSamples = outBuffer.mDataByteSize / sizeof(float);

        bufferMutex.lock();
        for (size_t j = 0; j < numSamples && !sharedBuffer.empty(); ++j) {
            outputData[j] = sharedBuffer.front();
            sharedBuffer.erase(sharedBuffer.begin());
        }
        bufferMutex.unlock();
    }

    return noErr;
}

int main() {
    // Get device IDs
    std::map<UInt32, std::string> ad = getAudioDevices();
    for (auto const& [key, val] : ad) {
        if (val == driver) {
            driverID = key;
        }
    }
    defaultDeviceID = getDefaultOutputDevice();

    // Volume and device swaps
    float defaultDeviceVolume = getAudioDeviceVolume(defaultDeviceID);
    setAudioDeviceVolume(driverID, defaultDeviceVolume);
    setDefaultOutputDevice(driverID);
    setDefaultSystemOutputDevice(driverID);
    setAudioDeviceVolume(defaultDeviceID, 1);

    // Set buffer size
    UInt32 bufferSizeInFrames = bufferSize; // Choose your desired buffer size
    if (!setAudioDeviceBufferSize(driverID, bufferSizeInFrames)) {
        std::cerr << "Failed to set buffer size for driver device." << std::endl;
    }
    if (!setAudioDeviceBufferSize(defaultDeviceID, bufferSizeInFrames)) {
        std::cerr << "Failed to set buffer size for default output device." << std::endl;
    }

    config.loadConfig();
    audioProcessor = std::make_unique<Processing>(config, getAudioDeviceVolume(driverID));
    audioProcessor = std::make_unique<Processing>(config, audioProcessor.get(), getAudioDeviceVolume(driverID));

    // Create audio device processes
    AudioDeviceCreateIOProcID(driverID, driverIOProc, nullptr, &inputIOProcId);
    AudioDeviceCreateIOProcID(defaultDeviceID, defaultDeviceIOProc, nullptr, &outputIOProcID);

    // Open the audio device for input or output
    AudioDeviceStart(driverID, inputIOProcId);
    AudioDeviceStart(defaultDeviceID, outputIOProcID);

    std::signal(SIGINT, cleanup);
    std::signal(SIGTERM, cleanup);

    std::thread cmdThread(commandLoop);
    cmdThread.detach();

    while (running) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
}


//
// Created by Jeremi Campagna on 2024-07-30.
//

#include "config.h"
#include "iostream"

using json = nlohmann::json;

Config::Config(const std::string& configPath) : configFilePath(configPath) {
    ampToggle = false;
    ampGain = 0.0f;

    equalizerToggle = false;
    equalizerF = {60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000};
    equalizerQ = {1, 1, 1, 1, 1, 1, 1, 1, 1, 1};
    equalizerG = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

    reverbToggle = false;
    reverbDryWet = 0.0f;
    irFilePath = "";

    loadConfig();
}

bool Config::loadConfig() {
    std::ifstream f(configFilePath);
    if (!f.is_open()) {
        std::cerr << "[Config] Cannot open config file: " << configFilePath << std::endl;
        return true;
    }
    std::cerr << "[Config] Loaded config from: " << configFilePath << std::endl;

    json data = json::parse(f);

    bool ampToggle = data.at("amplifier").at("toggle").get<bool>();
    float ampGain = data.at("amplifier").at("g").get<float>();

    bool equalizerToggle = data.at("equalizer").at("toggle").get<bool>();
    std::vector<float> equalizerF = data.at("equalizer").at("f").get<std::vector<float>>();
    std::vector<float> equalizerQ = data.at("equalizer").at("q").get<std::vector<float>>();
    std::vector<float> equalizerG = data.at("equalizer").at("g").get<std::vector<float>>();

    bool reverbToggle = data.at("reverb").at("toggle").get<bool>();
    float reverbDryWet = data.at("reverb").at("dw").get<float>();
    std::string irFilePath = data.at("reverb").at("ir").get<std::string>();

    if (ampToggle != this->ampToggle || ampGain != this->ampGain || equalizerToggle != this->equalizerToggle || equalizerF != this->equalizerF || equalizerQ != this->equalizerQ || equalizerG != this->equalizerG || reverbToggle != this->reverbToggle || reverbDryWet != this->reverbDryWet || irFilePath != this->irFilePath) {
        this->ampToggle = ampToggle;
        this->ampGain = ampGain;

        this->equalizerToggle = equalizerToggle;
        this->equalizerF = equalizerF;
        this->equalizerQ = equalizerQ;
        this->equalizerG = equalizerG;

        this->reverbToggle = reverbToggle;
        this->reverbDryWet = reverbDryWet;
        this->irFilePath = irFilePath;

        return false;
    }

    return true;
}

//
// Created by Jeremi Campagna on 2024-07-18.
//

#ifndef EQ_CPP_READIRFILE_H
#define EQ_CPP_READIRFILE_H

#include <vector>
#include <cstdint>

struct IRData {
    std::vector<float> audioData;   // only used for backwards compat, can be removed later
    std::vector<float> audioDataL;
    std::vector<float> audioDataR;
    uint32_t sampleRate;
    uint16_t numChannels = 0;
};

IRData readIRFile(const std::string &path);

#endif //EQ_CPP_READIRFILE_H

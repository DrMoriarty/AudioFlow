//
// Created by Jeremi Campagna on 2024-07-18.
//

#ifndef EQ_CPP_READIRFILE_H
#define EQ_CPP_READIRFILE_H

#include <vector>
#include <cstdint>

struct IRData {
    std::vector<float> audioData;
    uint32_t sampleRate;
};

IRData readIRFile(const std::string &path);

#endif //EQ_CPP_READIRFILE_H

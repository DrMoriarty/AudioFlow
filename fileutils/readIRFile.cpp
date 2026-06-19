//
// Created by Jeremi Campagna on 2024-07-18.
//

#include <iostream>
#include <fstream>
#include <vector>
#include <cstring>
#include "readIRFile.h"
#include "../fileutils/globals.h"

struct WAVHeader {
    char chunkID[4];
    uint32_t chunkSize;
    char format[4];
};

struct Chunk {
    char chunkID[4];
    uint32_t chunkSize;
    std::vector<char> data;
};

IRData readIRFile(const std::string &path) {
    IRData result;
    result.sampleRate = 0;

    std::ifstream file(path, std::ios::binary);
    if (!file) {
        std::cerr << "Cannot open file: " << path << std::endl;
        return result;
    }

    WAVHeader header;
    file.read(reinterpret_cast<char*>(&header), sizeof(header));
    if (std::strncmp(header.chunkID, "RIFF", 4) != 0 || std::strncmp(header.format, "WAVE", 4) != 0) {
        std::cerr << "Not a valid WAV file." << std::endl;
        return result;
    }

    std::vector<Chunk> chunks;

    while (file.tellg() < header.chunkSize + 8) {
        Chunk chunk;
        file.read(reinterpret_cast<char*>(&chunk.chunkID), sizeof(chunk.chunkID));
        file.read(reinterpret_cast<char*>(&chunk.chunkSize), sizeof(chunk.chunkSize));

        chunk.data.resize(chunk.chunkSize);
        file.read(chunk.data.data(), chunk.chunkSize);

        chunks.push_back(chunk);
    }

    uint16_t audioFormat;
    uint16_t numChannels;
    uint32_t sampleRate;
    uint16_t bitsPerSample;

    for (const auto& chunk : chunks) {
        if (std::string(chunk.chunkID, 4) == "fmt ") {
            if (chunk.chunkSize >= 16) {
                audioFormat = *reinterpret_cast<const uint16_t*>(chunk.data.data());
                numChannels = *reinterpret_cast<const uint16_t*>(chunk.data.data() + 2);
                sampleRate = *reinterpret_cast<const uint32_t*>(chunk.data.data() + 4);
                bitsPerSample = *reinterpret_cast<const uint16_t*>(chunk.data.data() + 14);

                bool isPCM = (audioFormat == 1);
                bool isFloat = (audioFormat == 3);
                bool validBits = (bitsPerSample == 16 || bitsPerSample == 24 || bitsPerSample == 32);

                if (numChannels != 2 || (!isPCM && !isFloat) || !validBits) {
                    std::cerr << "Only stereo WAV files (16/24/32-bit PCM or 32-bit float) are supported." << std::endl;
                    return result;
                }

                result.sampleRate = sampleRate;
            } else {
                std::cerr << "Unexpected fmt chunk size: " << chunk.chunkSize << std::endl;
                return result;
            }
        }

        if (std::string(chunk.chunkID, 4) == "data") {
            const char* data = chunk.data.data();
            size_t dataSize = chunk.data.size();

            if (bitsPerSample == 16) {
                for (size_t i = 0; i + 1 < dataSize; i += 2) {
                    int16_t sample;
                    std::memcpy(&sample, data + i, 2);
                    result.audioData.push_back(sample / 32768.0f / 8.0f);
                }
            } else if (bitsPerSample == 24) {
                for (size_t i = 0; i + 2 < dataSize; i += 3) {
                    int32_t sample = static_cast<unsigned char>(data[i])
                                  | (static_cast<unsigned char>(data[i + 1]) << 8)
                                  | (static_cast<unsigned char>(data[i + 2]) << 16);
                    if (sample & 0x800000) {
                        sample |= 0xFF000000;
                    }
                    result.audioData.push_back(sample / 8388608.0f / 8.0f);
                }
            } else if (bitsPerSample == 32) {
                if (audioFormat == 3) {
                    for (size_t i = 0; i + 3 < dataSize; i += 4) {
                        float sample;
                        std::memcpy(&sample, data + i, 4);
                        result.audioData.push_back(sample / 8.0f);
                    }
                } else {
                    for (size_t i = 0; i + 3 < dataSize; i += 4) {
                        int32_t sample;
                        std::memcpy(&sample, data + i, 4);
                        result.audioData.push_back(sample / 2147483648.0f / 8.0f);
                    }
                }
            } else {
                std::cerr << "Unsupported bits per sample: " << bitsPerSample << std::endl;
            }

            if (result.audioData.size() < convolutionChunkSize) {
                result.audioData.resize(convolutionChunkSize, 0.0f);
            }
        }
    }

    file.close();

    return result;
}

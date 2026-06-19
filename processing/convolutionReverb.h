//
// Created by Jeremi Campagna on 2024-07-17.
//

#ifndef EQ_CPP_CONVOLUTIONREVERB_H
#define EQ_CPP_CONVOLUTIONREVERB_H

#include <vector>
#include <string>
#include <Accelerate/Accelerate.h>
#include "smoother.h"
#include "audioProcessor.h"
#include "../fileutils/readIRFile.h"
#include "../fileutils/globals.h"


class ConvolutionReverb : public AudioProcessor {
public:
    std::string path;

    ConvolutionReverb(bool toggle, std::string path, double dryWet, float deviceSampleRate);
    ~ConvolutionReverb();

    double getDryWet();
    void setDryWet(double newDryWet);
    float getDeviceSampleRate() const;

    void process(std::vector<float>& input);
private:
    size_t chunkSize;
    size_t paddedSize;
    size_t numBins;
    float deviceSampleRate;
    uint32_t irSampleRate;
    bool sampleRateMismatch;
    Smoother dryWet;

    FFTSetup fftSetup;

    struct SplitComplex {
        std::vector<float> real;
        std::vector<float> imag;
        DSPSplitComplex dsp() { return { real.data(), imag.data() }; }
    };

    std::vector<SplitComplex> impulseResponseFFTs;
    std::vector<float> overlap;

    SplitComplex fftReal;
    SplitComplex fftImag;
    SplitComplex workerReal;
    SplitComplex workerImag;
    std::vector<float> iblitted;
    std::vector<float> overlapReverb;

    void fftZ(const std::vector<float>& input, float* outReal, float* outImag);
    void ifftZ(float* real, float* imag);
};


#endif //EQ_CPP_CONVOLUTIONREVERB_H

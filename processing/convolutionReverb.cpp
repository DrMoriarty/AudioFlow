//
// Created by Jeremi Campagna on 2024-07-17.
//

#include "convolutionReverb.h"
#include <iostream>

ConvolutionReverb::ConvolutionReverb(bool toggle, std::string path, double dryWet, float deviceSampleRate)
    : AudioProcessor(toggle), path(path), dryWet(Smoother(dryWet, dryWet, 0)), deviceSampleRate(deviceSampleRate) {

    chunkSize = convolutionChunkSize;
    paddedSize = chunkSize * 2;
    numBins = paddedSize / 2;

    IRData irData = readIRFile(path);
    std::vector<float> impulseResponse = std::move(irData.audioData);
    irSampleRate = irData.sampleRate;
    sampleRateMismatch = (irSampleRate != 0 && static_cast<uint32_t>(deviceSampleRate) != irSampleRate);

    if (sampleRateMismatch) {
        std::cerr << "IR sample rate (" << irSampleRate << ") does not match device sample rate ("
                  << deviceSampleRate << "). Reverb will be disabled." << std::endl;
    }

    size_t numChunks = static_cast<size_t>(std::ceil(static_cast<float>(impulseResponse.size()) / chunkSize));
    impulseResponse.resize(numChunks * chunkSize, 0.0f);

    fftSetup = vDSP_create_fftsetup(static_cast<vDSP_Length>(std::log2(paddedSize)), FFT_RADIX2);

    SplitComplex fftTmp{std::vector<float>(numBins), std::vector<float>(numBins)};
    std::vector<float> inputBuf(paddedSize, 0.0f);

    for (size_t i = 0; i < numChunks; ++i) {
        std::copy(impulseResponse.begin() + i * chunkSize,
                  impulseResponse.begin() + (i + 1) * chunkSize,
                  inputBuf.begin());
        std::fill(inputBuf.begin() + chunkSize, inputBuf.end(), 0.0f);

        fftZ(inputBuf, fftTmp.real.data(), fftTmp.imag.data());

        SplitComplex dst{std::vector<float>(numBins), std::vector<float>(numBins)};
        std::copy(fftTmp.real.begin(), fftTmp.real.end(), dst.real.begin());
        std::copy(fftTmp.imag.begin(), fftTmp.imag.end(), dst.imag.begin());
        impulseResponseFFTs.push_back(std::move(dst));
    }

    size_t totalSize = (numChunks + 2) * chunkSize;
    overlap.resize(totalSize, 0.0f);

    fftReal = {std::vector<float>(numBins), std::vector<float>(numBins)};
    fftImag = {std::vector<float>(numBins), std::vector<float>(numBins)};
    workerReal = {std::vector<float>(numBins), std::vector<float>(numBins)};
    workerImag = {std::vector<float>(numBins), std::vector<float>(numBins)};
    iblitted.resize(paddedSize, 0.0f);
    overlapReverb.resize(totalSize, 0.0f);
}

ConvolutionReverb::~ConvolutionReverb() {
    if (fftSetup) {
        vDSP_destroy_fftsetup(fftSetup);
    }
}

void ConvolutionReverb::fftZ(const std::vector<float>& input, float* outReal, float* outImag) {
    DSPSplitComplex sc = { outReal, outImag };
    vDSP_ctoz(reinterpret_cast<const DSPComplex*>(input.data()), 2, &sc, 1, numBins);
    vDSP_fft_zrip(fftSetup, &sc, 1, static_cast<vDSP_Length>(std::log2(paddedSize)), FFT_FORWARD);
    float scale = 0.5f;
    vDSP_vsmul(outReal, 1, &scale, outReal, 1, numBins);
    vDSP_vsmul(outImag, 1, &scale, outImag, 1, numBins);
}

void ConvolutionReverb::ifftZ(float* real, float* imag) {
    DSPSplitComplex sc = { real, imag };
    vDSP_fft_zrip(fftSetup, &sc, 1, static_cast<vDSP_Length>(std::log2(paddedSize)), FFT_INVERSE);
    vDSP_ztoc(&sc, 1, reinterpret_cast<COMPLEX*>(iblitted.data()), 2, numBins);
    const float factor = 1.0f / static_cast<float>(paddedSize);
    vDSP_vsmul(iblitted.data(), 1, &factor, iblitted.data(), 1, paddedSize);
}

void ConvolutionReverb::process(std::vector<float>& input) {
    if (sampleRateMismatch) {
        return;
    }

    if (mix.currentValueNoChange() <= 0 && mix.getRemaining() <= 0) {
        return;
    }

    const size_t inputSize = input.size();
    const size_t numChunks = impulseResponseFFTs.size();
    const size_t totalSize = (numChunks + 2) * chunkSize;

    std::vector<float> inputPadded(paddedSize, 0.0f);
    std::copy(input.begin(), input.end(), inputPadded.begin());
    fftZ(inputPadded, fftReal.real.data(), fftReal.imag.data());

    std::fill(overlapReverb.begin(), overlapReverb.end(), 0.0f);

    for (size_t i = 0; i < numChunks; ++i) {
        DSPSplitComplex inSc = fftReal.dsp();
        DSPSplitComplex irSc = impulseResponseFFTs[i].dsp();
        DSPSplitComplex outSc = workerReal.dsp();
        vDSP_zvmul(&inSc, 1, &irSc, 1, &outSc, 1, numBins, 1);

        std::copy(workerReal.real.begin(), workerReal.real.end(), workerImag.real.begin());
        std::copy(workerReal.imag.begin(), workerReal.imag.end(), workerImag.imag.begin());

        ifftZ(workerImag.real.data(), workerImag.imag.data());

        for (size_t k = 0; k < paddedSize; ++k) {
            overlapReverb[i * chunkSize + k] += iblitted[k];
        }
    }

    for (size_t k = 0; k < totalSize; ++k) {
        overlap[k] += overlapReverb[k];
    }

    bool mixConst = dryWet.getRemaining() <= 0 && mix.getRemaining() <= 0;
    if (mixConst) {
        float scale = static_cast<float>(dryWet.currentValueNoChange() * mix.currentValueNoChange());
        float oneMinusScale = 1.0f - scale;
        for (size_t i = 0; i < inputSize; ++i) {
            input[i] = overlap[i] * scale + input[i] * oneMinusScale;
        }
    } else {
        for (size_t i = 0; i < inputSize; ++i) {
            float wetScale = static_cast<float>(dryWet.currentValue() * mix.currentValue());
            input[i] = overlap[i] * wetScale + input[i] * (1.0f - wetScale);
        }
    }

    std::copy(overlap.begin() + inputSize, overlap.begin() + totalSize, overlap.begin());
    std::fill(overlap.begin() + (totalSize - inputSize), overlap.end(), 0.0f);
}

double ConvolutionReverb::getDryWet() {
    return dryWet.currentValueNoChange();
}

void ConvolutionReverb::setDryWet(double newDryWet) {
    dryWet = Smoother(dryWet.currentValueNoChange(), newDryWet, smootherSteps);
}

float ConvolutionReverb::getDeviceSampleRate() const {
    return deviceSampleRate;
}

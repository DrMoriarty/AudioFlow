//
// Created by Jeremi Campagna on 2024-07-17.
//

#include "equalizer.h"
#include "iostream"
#include <algorithm>


Equalizer::Equalizer(bool toggle, const std::vector<float> &fVector, const std::vector<float> &qVector, const std::vector<float> &gVector, float sampleRate) : AudioProcessor(toggle) {
    if (fVector.size() != qVector.size() || fVector.size() != gVector.size()) {
        throw std::invalid_argument("Equalizer vectors must be of the same size.");
    }

    filters = std::make_unique<std::vector<IIRFilter>>();
    for (size_t i = 0; i < fVector.size(); i++) {
        filters->emplace_back(IIRFilter(fVector[i], qVector[i], gVector[i], sampleRate));
    }
    std::reverse(filters->begin(), filters->end());
}

void Equalizer::process(std::vector<double>& input) {
    double currentMix = mix.currentValueNoChange();
    double mixRemaining = mix.getRemaining();

    if (currentMix <= 0 && mixRemaining <= 0) return;

    processed = input;
    for (auto &filter: *filters) {
        filter.process(processed);
    }

    if (mixRemaining <= 0) {
        double dw = currentMix;
        for (size_t i = 0; i < input.size(); ++i) {
            input[i] = processed[i] * dw + input[i] * (1.0 - dw);
        }
    } else {
        for (size_t i = 0; i < input.size(); ++i) {
            double dw = mix.currentValue();
            input[i] = processed[i] * dw + input[i] * (1.0 - dw);
        }
    }
}

std::vector<IIRFilter>& Equalizer::getFilters() {
    return *filters;
}
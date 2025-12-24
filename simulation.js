/**
 * FX Risk Exposure Simulator - Simulation Engine
 * 
 * This module handles the core simulation logic for calculating FX risk exposure,
 * including risk scores, value at risk (VaR), and other key metrics.
 */

// Sample exchange rates (in a real app, these would come from an API)
const EXCHANGE_RATES = {
    'USD': 1.0,
    'EUR': 1.08,    // 1 EUR = 1.08 USD
    'GBP': 1.25,    // 1 GBP = 1.25 USD
    'JPY': 0.0075,  // 1 JPY = 0.0075 USD
    'AUD': 0.65,    // 1 AUD = 0.65 USD
    'CAD': 0.75,    // 1 CAD = 0.75 USD
    'CHF': 1.10,    // 1 CHF = 1.10 USD
    'CNY': 0.14     // 1 CNY = 0.14 USD
};

// Volatility factors (annualized %)
const VOLATILITY_FACTORS = {
    1: 0.05,  // Very low volatility
    2: 0.10,  // Low volatility
    3: 0.15,  // Moderate volatility
    4: 0.25,  // High volatility
    5: 0.40   // Very high volatility
};

// Risk level thresholds
const RISK_THRESHOLDS = {
    LOW: 0.1,       // 0-10% of total exposure
    MEDIUM: 0.25,   // 10-25% of total exposure
    HIGH: 0.5,      // 25-50% of total exposure
    CRITICAL: 0.5   // >50% of total exposure
};

/**
 * Calculate simulation results based on input data
 * @param {Object} simulationData - The simulation input data
 * @returns {Object} Processed simulation results
 */
function calculateSimulationResults(simulationData) {
    const { exposures, baseCurrency, riskAppetite, timeHorizon } = simulationData;
    
    // Process each exposure
    const processedExposures = exposures.map(exposure => {
        const fromCurrency = exposure.currencyPair.from;
        const toCurrency = exposure.currencyPair.to;
        const amount = parseFloat(exposure.amount) || 0;
        const isHedged = exposure.isHedged || false;
        const volatilityFactor = exposure.volatilityFactor || 3;
        
        // Convert to base currency
        const baseAmount = convertToBaseCurrency(amount, fromCurrency, baseCurrency);
        
        // Calculate risk score (1-10 scale)
        const riskScore = calculateRiskScore(amount, fromCurrency, baseCurrency, isHedged, volatilityFactor, riskAppetite);
        
        return {
            currencyPair: `${fromCurrency}/${toCurrency}`,
            amount: amount,
            baseEquivalent: baseAmount,
            isHedged: isHedged,
            volatilityFactor: volatilityFactor,
            riskScore: riskScore,
            riskLevel: getRiskLevel(riskScore)
        };
    });
    
    // Calculate summary metrics
    const totalExposure = processedExposures.reduce((sum, exp) => sum + exp.baseEquivalent, 0);
    const hedgedExposure = processedExposures
        .filter(exp => exp.isHedged)
        .reduce((sum, exp) => sum + exp.baseEquivalent, 0);
    const unhedgedExposure = totalExposure - hedgedExposure;
    
    // Calculate Value at Risk (VaR) - simplified calculation
    const varValue = calculateVaR(processedExposures, baseCurrency, riskAppetite, timeHorizon);
    
    // Group by currency pair for the chart
    const currencyExposures = processedExposures.reduce((acc, exp) => {
        const existing = acc.find(item => item.currencyPair === exp.currencyPair);
        if (existing) {
            existing.amount += exp.baseEquivalent;
        } else {
            acc.push({
                currencyPair: exp.currencyPair,
                amount: exp.baseEquivalent
            });
        }
        return acc;
    }, []);
    
    // Calculate risk distribution
    const riskDistribution = processedExposures.reduce((acc, exp) => {
        const level = exp.riskLevel;
        acc[level] = (acc[level] || 0) + 1;
        return acc;
    }, {});
    
    // Count high and critical risks
    const highRiskExposureCount = processedExposures
        .filter(exp => exp.riskScore >= 5)
        .length;
    
    return {
        simulationName: simulationData.simulationName || 'FX Risk Analysis',
        baseCurrency: baseCurrency,
        totalExposure: totalExposure,
        hedgedExposure: hedgedExposure,
        unhedgedExposure: unhedgedExposure,
        varValue: varValue,
        riskAppetite: riskAppetite,
        timeHorizon: timeHorizon,
        currencyExposures: currencyExposures,
        riskDistribution: riskDistribution,
        exposureDetails: processedExposures,
        highRiskExposureCount: highRiskExposureCount,
        timestamp: new Date().toISOString()
    };
}

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} Converted amount
 */
function convertToBaseCurrency(amount, fromCurrency, toCurrency) {
    // If same currency, no conversion needed
    if (fromCurrency === toCurrency) return amount;
    
    // Convert to USD first if needed
    const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
    const toRate = EXCHANGE_RATES[toCurrency] || 1;
    
    // Convert via USD as base
    const usdAmount = amount * fromRate;
    return usdAmount / toRate;
}

/**
 * Calculate risk score for an exposure (1-10 scale)
 */
function calculateRiskScore(amount, fromCurrency, baseCurrency, isHedged, volatilityFactor, riskAppetite) {
    // Base score based on volatility (1-5)
    let score = volatilityFactor;
    
    // Increase risk for unhedged positions
    if (!isHedged) {
        score += 2; // Add 2 points for unhedged positions
    }
    
    // Adjust for currency risk (if different from base currency)
    if (fromCurrency !== baseCurrency) {
        // Higher risk for more volatile currency pairs
        const volatility = VOLATILITY_FACTORS[volatilityFactor] || 0.15;
        score += Math.min(3, Math.round(volatility * 10)); // Add up to 3 points for currency risk
    }
    
    // Normalize to 1-10 scale
    score = Math.max(1, Math.min(10, score));
    
    // Adjust based on risk appetite (lower appetite = higher perceived risk)
    const appetiteFactor = (5 - riskAppetite) * 0.5; // -1 to 1
    score = Math.max(1, Math.min(10, score + appetiteFactor));
    
    return Math.round(score);
}

/**
 * Get risk level based on risk score
 */
function getRiskLevel(riskScore) {
    if (riskScore <= 3) return 'Low';
    if (riskScore <= 5) return 'Medium';
    if (riskScore <= 8) return 'High';
    return 'Critical';
}

/**
 * Calculate Value at Risk (VaR) using variance-covariance method (simplified)
 */
function calculateVaR(exposures, baseCurrency, confidenceLevel, timeHorizonDays) {
    // Simplified VaR calculation
    // In a real application, this would use historical data and more sophisticated models
    
    // Calculate portfolio value
    const portfolioValue = exposures.reduce((sum, exp) => {
        return sum + exp.baseEquivalent;
    }, 0);
    
    if (portfolioValue <= 0) return 0;
    
    // Calculate weighted average volatility
    let portfolioVolatility = 0;
    exposures.forEach(exp => {
        const weight = exp.baseEquivalent / portfolioValue;
        const volatility = VOLATILITY_FACTORS[exp.volatilityFactor] || 0.15;
        portfolioVolatility += weight * volatility;
    });
    
    // Z-score for confidence level (simplified)
    const zScore = {
        1: 1.28, // 90%
        2: 1.65, // 95%
        3: 2.33, // 99%
        4: 2.58  // 99.5%
    }[confidenceLevel] || 1.96; // Default to 95%
    
    // Time horizon adjustment (square root of time rule)
    const timeFactor = Math.sqrt(timeHorizonDays / 252); // 252 trading days in a year
    
    // Calculate VaR
    const varValue = portfolioValue * zScore * portfolioVolatility * timeFactor;
    
    return varValue;
}

/**
 * Generate stress test scenarios
 */
function generateStressScenarios(exposures, baseCurrency) {
    // In a real application, this would generate various stress test scenarios
    // such as historical crises, parallel shifts, etc.
    
    return [
        {
            name: '2008 Financial Crisis',
            description: 'Simulates currency movements similar to the 2008 financial crisis',
            impact: 'High',
            change: -0.15 // 15% depreciation
        },
        {
            name: 'Strong USD',
            description: 'Simulates a scenario where USD strengthens by 10% against all currencies',
            impact: 'Medium',
            change: -0.10
        },
        {
            name: 'Market Correction',
            description: 'Simulates a moderate market correction',
            impact: 'Low',
            change: -0.05
        }
    ];
}

/**
 * Calculate stress test results
 */
function calculateStressTestResults(exposures, baseCurrency, scenarios) {
    return scenarios.map(scenario => {
        let totalImpact = 0;
        
        const exposureImpacts = exposures.map(exp => {
            // Skip if exposure is in base currency
            if (exp.currencyPair.endsWith(baseCurrency)) {
                return {
                    ...exp,
                    impact: 0,
                    newValue: exp.baseEquivalent
                };
            }
            
            // Calculate impact based on scenario
            const impact = exp.baseEquivalent * scenario.change;
            totalImpact += impact;
            
            return {
                ...exp,
                impact: impact,
                newValue: exp.baseEquivalent + impact
            };
        });
        
        return {
            ...scenario,
            totalImpact: totalImpact,
            exposureImpacts: exposureImpacts
        };
    });
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // For Node.js/CommonJS
    module.exports = {
        calculateSimulationResults,
        convertToBaseCurrency,
        calculateRiskScore,
        calculateVaR,
        generateStressScenarios,
        calculateStressTestResults
    };
} else {
    // For browser
    window.FXRES = window.FXRES || {};
    window.FXRES.simulation = {
        calculateSimulationResults,
        convertToBaseCurrency,
        calculateRiskScore,
        calculateVaR,
        generateStressScenarios,
        calculateStressTestResults
    };
}
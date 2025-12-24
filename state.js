/**
 * FX Risk Exposure Simulator - State Management
 * 
 * This module handles the application state management, including:
 * - Loading and saving simulation data to localStorage
 * - Managing the current simulation state
 * - Providing helper methods for state manipulation
 */

// Default simulation data structure
const DEFAULT_SIMULATION = {
    simulationName: 'New FX Exposure Analysis',
    baseCurrency: 'USD',
    riskAppetite: 3, // 1-5 scale (1=Low risk, 5=High risk)
    timeHorizon: 30, // days
    includeStressTests: true,
    notes: '',
    exposures: [],
    lastUpdated: new Date().toISOString()
};

// Default exposure template
const DEFAULT_EXPOSURE = {
    id: generateId(),
    currencyPair: { from: 'EUR', to: 'USD' },
    amount: '100000',
    isHedged: false,
    volatilityFactor: 3, // 1-5 scale (1=Low, 5=High)
    notes: ''
};

// Available currencies for selection
const CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'SGD',
    'SEK', 'NZD', 'MXN', 'NOK', 'KRW', 'INR', 'BRL', 'ZAR', 'RUB', 'TRY'
];

// Available risk appetite options
const RISK_APPETITE_OPTIONS = [
    { value: 1, label: 'Very Low' },
    { value: 2, label: 'Low' },
    { value: 3, label: 'Moderate' },
    { value: 4, label: 'High' },
    { value: 5, label: 'Very High' }
];

// Available time horizon options (in days)
const TIME_HORIZON_OPTIONS = [
    { value: 7, label: '1 Week' },
    { value: 14, label: '2 Weeks' },
    { value: 30, label: '1 Month' },
    { value: 60, label: '2 Months' },
    { value: 90, label: '3 Months' },
    { value: 180, label: '6 Months' },
    { value: 365, label: '1 Year' }
];

/**
 * Generate a unique ID
 * @returns {string} A unique identifier
 */
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Get the current simulation data from localStorage
 * @returns {Object} The current simulation data
 */
function getSimulationData() {
    try {
        const savedData = localStorage.getItem('fxresSimulationData');
        if (savedData) {
            return JSON.parse(savedData);
        }
    } catch (error) {
        console.error('Error loading simulation data:', error);
    }
    
    // Return a new default simulation if none exists
    return { ...DEFAULT_SIMULATION };
}

/**
 * Save the current simulation data to localStorage
 * @param {Object} data - The simulation data to save
 */
function saveSimulationData(data) {
    try {
        const dataToSave = {
            ...data,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('fxresSimulationData', JSON.stringify(dataToSave));
        return true;
    } catch (error) {
        console.error('Error saving simulation data:', error);
        return false;
    }
}

/**
 * Create a new simulation
 * @param {Object} options - Optional simulation options
 * @returns {Object} The new simulation data
 */
function createNewSimulation(options = {}) {
    const newSimulation = {
        ...DEFAULT_SIMULATION,
        ...options,
        id: generateId(),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
    
    saveSimulationData(newSimulation);
    return newSimulation;
}

/**
 * Add a new exposure to the current simulation
 * @param {Object} exposure - The exposure data to add
 * @returns {Object} The updated simulation data
 */
function addExposure(exposure) {
    const simulation = getSimulationData();
    const newExposure = {
        ...DEFAULT_EXPOSURE,
        ...exposure,
        id: generateId()
    };
    
    const updatedSimulation = {
        ...simulation,
        exposures: [...simulation.exposures, newExposure]
    };
    
    saveSimulationData(updatedSimulation);
    return updatedSimulation;
}

/**
 * Update an existing exposure
 * @param {string} exposureId - The ID of the exposure to update
 * @param {Object} updates - The updates to apply
 * @returns {Object} The updated simulation data
 */
function updateExposure(exposureId, updates) {
    const simulation = getSimulationData();
    const exposureIndex = simulation.exposures.findIndex(e => e.id === exposureId);
    
    if (exposureIndex === -1) {
        console.error(`Exposure with ID ${exposureId} not found`);
        return simulation;
    }
    
    const updatedExposures = [...simulation.exposures];
    updatedExposures[exposureIndex] = {
        ...updatedExposures[exposureIndex],
        ...updates
    };
    
    const updatedSimulation = {
        ...simulation,
        exposures: updatedExposures
    };
    
    saveSimulationData(updatedSimulation);
    return updatedSimulation;
}

/**
 * Remove an exposure from the current simulation
 * @param {string} exposureId - The ID of the exposure to remove
 * @returns {Object} The updated simulation data
 */
function removeExposure(exposureId) {
    const simulation = getSimulationData();
    const updatedExposures = simulation.exposures.filter(e => e.id !== exposureId);
    
    const updatedSimulation = {
        ...simulation,
        exposures: updatedExposures
    };
    
    saveSimulationData(updatedSimulation);
    return updatedSimulation;
}

/**
 * Update simulation settings
 * @param {Object} updates - The updates to apply to the simulation
 * @returns {Object} The updated simulation data
 */
function updateSimulation(updates) {
    const simulation = getSimulationData();
    const updatedSimulation = {
        ...simulation,
        ...updates
    };
    
    saveSimulationData(updatedSimulation);
    return updatedSimulation;
}

/**
 * Clear all simulation data
 */
function clearSimulationData() {
    try {
        localStorage.removeItem('fxresSimulationData');
        return true;
    } catch (error) {
        console.error('Error clearing simulation data:', error);
        return false;
    }
}

// Export the state management functions
const FXRES = window.FXRES || {};
FXRES.state = {
    // Constants
    CURRENCIES,
    RISK_APPETITE_OPTIONS,
    TIME_HORIZON_OPTIONS,
    
    // Defaults
    DEFAULT_SIMULATION,
    DEFAULT_EXPOSURE,
    
    // State management functions
    getSimulationData,
    saveSimulationData,
    createNewSimulation,
    addExposure,
    updateExposure,
    removeExposure,
    updateSimulation,
    clearSimulationData,
    
    // Helper functions
    generateId
};

// Make the state management functions available globally
window.FXRES = FXRES;
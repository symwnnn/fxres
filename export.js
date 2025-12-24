/**
 * FX Risk Exposure Simulator - Export Module
 * 
 * This module handles exporting simulation data to various formats:
 * - PDF reports
 * - Excel/CSV files
 * - JSON data
 */

// Dependencies: html2pdf.js and xlsx libraries are loaded via CDN in the HTML

/**
 * Export the simulation results to a PDF file
 * @param {HTMLElement} element - The DOM element to export as PDF
 * @param {Object} options - Export options
 * @returns {Promise} A promise that resolves when the PDF is generated
 */
function exportToPdf(element, options = {}) {
    const defaultOptions = {
        filename: 'fx-risk-report.pdf',
        margin: 10,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        },
        pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.page-break-before',
            after: '.page-break-after'
        },
        onProgress: null
    };

    const config = { ...defaultOptions, ...options };
    
    // Show loading state if callback provided
    if (typeof config.onProgress === 'function') {
        config.onProgress('Preparing PDF...', 0.2);
    }
    
    // Add timestamp to filename if not already present
    if (!config.filename.includes('_') && !config.filename.includes('.')) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        config.filename = `${config.filename.replace(/\.pdf$/i, '')}_${timestamp}.pdf`;
    }
    
    // Configure html2pdf
    const opt = {
        margin: config.margin,
        filename: config.filename,
        image: config.image,
        html2canvas: config.html2canvas,
        jsPDF: config.jsPDF,
        pagebreak: config.pagebreak
    };
    
    // Generate the PDF
    return new Promise((resolve, reject) => {
        // Clone the element to avoid modifying the original
        const elementToExport = element.cloneNode(true);
        
        // Add print-specific styles
        const style = document.createElement('style');
        style.textContent = `
            @media print {
                body, html {
                    background: white !important;
                    color: black !important;
                }
                .no-print, .no-print * {
                    display: none !important;
                }
                .print-only {
                    display: block !important;
                }
                .chart-container {
                    page-break-inside: avoid;
                }
                .results-summary {
                    page-break-after: avoid;
                }
            }
            .print-header {
                display: none;
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
            }
            .print-footer {
                display: none;
                text-align: center;
                margin-top: 20px;
                padding-top: 10px;
                border-top: 1px solid #eee;
                font-size: 0.8em;
                color: #666;
            }
        `;
        
        // Add print header and footer
        const header = document.createElement('div');
        header.className = 'print-header';
        header.innerHTML = `
            <h2>FX Risk Exposure Report</h2>
            <p>Generated on ${new Date().toLocaleString()}</p>
        `;
        
        const footer = document.createElement('div');
        footer.className = 'print-footer';
        footer.innerHTML = `
            <p>Confidential - For internal use only</p>
            <p>Page <span class="pageNumber"></span> of <span class="totalPages"></span></p>
        `;
        
        // Insert header and footer
        elementToExport.insertBefore(header, elementToExport.firstChild);
        elementToExport.appendChild(footer);
        
        // Add styles to the clone
        elementToExport.appendChild(style);
        
        // Make charts printable
        const charts = elementToExport.querySelectorAll('canvas');
        charts.forEach(chart => {
            const parent = chart.parentElement;
            if (parent) {
                parent.style.width = '100%';
                parent.style.height = 'auto';
            }
            chart.style.maxWidth = '100%';
            chart.style.height = 'auto';
        });
        
        // Create a temporary container
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.appendChild(elementToExport);
        document.body.appendChild(tempContainer);
        
        // Generate PDF
        const worker = html2pdf()
            .set(opt)
            .from(elementToExport)
            .toPdf()
            .get('pdf')
            .then(pdf => {
                // Add page numbers
                const totalPages = pdf.internal.getNumberOfPages();
                
                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    pdf.setFontSize(10);
                    pdf.setTextColor(150);
                    
                    // Page number
                    const pageNumber = `Page ${i} of ${totalPages}`;
                    const pageSize = pdf.internal.pageSize;
                    const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
                    
                    // Footer
                    pdf.text(pageNumber, (pageWidth / 2) - (pdf.getTextWidth(pageNumber) / 2), 285);
                    
                    // Add watermark for draft/confidential if needed
                    if (options.watermark) {
                        const text = options.watermark.text || 'CONFIDENTIAL';
                        const fontSize = options.watermark.fontSize || 48;
                        const opacity = options.watermark.opacity || 0.1;
                        const rotation = options.watermark.rotation || -20;
                        
                        pdf.setFontSize(fontSize);
                        pdf.setTextColor(150, 150, 150, opacity * 255);
                        
                        const textWidth = pdf.getTextWidth(text);
                        const textHeight = pdf.internal.getLineHeight() / pdf.internal.scaleFactor;
                        
                        // Center the watermark on the page
                        const centerX = pageWidth / 2;
                        const centerY = pageSize.height ? pageSize.height / 2 : 150;
                        
                        // Save the current graphics state
                        pdf.saveGraphicsState();
                        
                        // Move to center, rotate, then draw text centered
                        pdf.rotate(rotation, { origin: [centerX, centerY] });
                        pdf.text(text, centerX - (textWidth / 2), centerY);
                        
                        // Restore graphics state
                        pdf.restoreGraphicsState();
                        
                        // Reset text color
                        pdf.setTextColor(0, 0, 0);
                    }
                }
                
                return pdf;
            })
            .then(pdf => {
                if (typeof config.onProgress === 'function') {
                    config.onProgress('Finalizing PDF...', 0.9);
                }
                return pdf.save();
            })
            .then(() => {
                if (typeof config.onProgress === 'function') {
                    config.onProgress('PDF generated successfully!', 1.0);
                    setTimeout(() => config.onProgress('', 0), 2000);
                }
                
                // Clean up
                document.body.removeChild(tempContainer);
                resolve();
            })
            .catch(error => {
                console.error('Error generating PDF:', error);
                document.body.removeChild(tempContainer);
                
                if (typeof config.onProgress === 'function') {
                    config.onProgress('Error generating PDF', -1);
                }
                
                reject(error);
            });
    });
}

/**
 * Export the simulation data to an Excel file
 * @param {Object} data - The data to export
 * @param {string} filename - The name of the file (without extension)
 * @param {Object} options - Export options
 * @returns {Promise} A promise that resolves when the export is complete
 */
function exportToExcel(data, filename = 'fx-risk-data', options = {}) {
    return new Promise((resolve, reject) => {
        try {
            if (typeof XLSX === 'undefined') {
                throw new Error('SheetJS library (xlsx) is not loaded');
            }
            
            // Default options
            const defaultOptions = {
                bookType: 'xlsx', // 'xlsx', 'xls', 'csv', 'ods', etc.
                sheetName: 'FX Risk Data',
                onProgress: null
            };
            
            const config = { ...defaultOptions, ...options };
            
            // Update progress
            if (typeof config.onProgress === 'function') {
                config.onProgress('Preparing Excel export...', 0.3);
            }
            
            // Process data into worksheet
            const ws = XLSX.utils.json_to_sheet(data);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, config.sheetName);
            
            // Generate file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fullFilename = `${filename.replace(/\.(xlsx|xls|csv)$/i, '')}_${timestamp}.${config.bookType}`;
            
            // Update progress
            if (typeof config.onProgress === 'function') {
                config.onProgress('Generating file...', 0.8);
            }
            
            // Export file
            XLSX.writeFile(wb, fullFilename);
            
            // Final update
            if (typeof config.onProgress === 'function') {
                config.onProgress('Export completed!', 1.0);
                setTimeout(() => config.onProgress('', 0), 2000);
            }
            
            resolve();
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            
            if (typeof options.onProgress === 'function') {
                options.onProgress('Error exporting to Excel', -1);
            }
            
            reject(error);
        }
    });
}

/**
 * Export the simulation data to a CSV file
 * @param {Array} data - The data to export
 * @param {string} filename - The name of the file (without extension)
 * @param {Object} options - Export options
 * @returns {Promise} A promise that resolves when the export is complete
 */
function exportToCsv(data, filename = 'fx-risk-data', options = {}) {
    return exportToExcel(data, filename, { ...options, bookType: 'csv' });
}

/**
 * Export the simulation data as a JSON file
 * @param {Object} data - The data to export
 * @param {string} filename - The name of the file (without extension)
 * @param {Object} options - Export options
 * @returns {Promise} A promise that resolves when the export is complete
 */
function exportToJson(data, filename = 'fx-risk-data', options = {}) {
    return new Promise((resolve, reject) => {
        try {
            const defaultOptions = {
                pretty: true,
                onProgress: null
            };
            
            const config = { ...defaultOptions, ...options };
            
            // Update progress
            if (typeof config.onProgress === 'function') {
                config.onProgress('Preparing JSON export...', 0.5);
            }
            
            // Convert to JSON string
            const jsonString = config.pretty 
                ? JSON.stringify(data, null, 2) 
                : JSON.stringify(data);
            
            // Create blob
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            // Add timestamp to filename if not already present
            let fullFilename = filename;
            if (!fullFilename.endsWith('.json')) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                fullFilename = `${fullFilename.replace(/\.json$/i, '')}_${timestamp}.json`;
            }
            
            // Set up download
            a.href = url;
            a.download = fullFilename;
            document.body.appendChild(a);
            
            // Trigger download
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                if (typeof config.onProgress === 'function') {
                    config.onProgress('Export completed!', 1.0);
                    setTimeout(() => config.onProgress('', 0), 2000);
                }
                
                resolve();
            }, 100);
        } catch (error) {
            console.error('Error exporting to JSON:', error);
            
            if (typeof options.onProgress === 'function') {
                options.onProgress('Error exporting to JSON', -1);
            }
            
            reject(error);
        }
    });
}

// Export the functions
const FXRES = window.FXRES || {};
FXRES.export = {
    toPdf: exportToPdf,
    toExcel: exportToExcel,
    toCsv: exportToCsv,
    toJson: exportToJson
};

// Make the export functions available globally
window.FXRES = FXRES;
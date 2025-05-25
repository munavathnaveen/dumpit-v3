const fs = require("fs");
const csv = require("csv-parser");
const { Parser } = require("json2csv");
const path = require("path");

/**
 * Export data from MongoDB to CSV
 * @param {Array} data - Array of documents to export
 * @param {Array} fields - Fields to include in the CSV
 * @param {String} filename - Name for the output file (without extension)
 * @returns {String} - Path to the generated CSV file
 */
const exportToCSV = async (data, fields, filename) => {
    try {
        // Create directory if it doesn't exist
        const dir = path.join(__dirname, "../../exports");
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);

        const filePath = path.join(dir, `${filename}-${Date.now()}.csv`);
        fs.writeFileSync(filePath, csv);

        return filePath;
    } catch (error) {
        console.error("CSV export error:", error);
        throw new Error("Failed to export data to CSV");
    }
};

/**
 * Import data from CSV to MongoDB
 * @param {String} filePath - Path to the CSV file
 * @param {Function} processRow - Function to process each row and save to DB
 * @returns {Object} - Result with count of processed rows and errors
 */
const importFromCSV = async (filePath, processRow) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const errors = [];
        let processed = 0;

        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", async () => {
                try {
                    for (const row of results) {
                        try {
                            await processRow(row);
                            processed++;
                        } catch (err) {
                            errors.push({ row, error: err.message });
                        }
                    }
                    resolve({ processed, errors });
                } catch (error) {
                    reject(error);
                }
            })
            .on("error", (error) => {
                reject(error);
            });
    });
};

module.exports = {
    exportToCSV,
    importFromCSV,
};

/**
 * Format a number as currency (Indian Rupees)
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
};

/**
 * Format a date string to a readable format
 * @param dateString The date string to format
 * @param format The format type ('short', 'medium', 'long')
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, format: "short" | "medium" | "long" = "medium"): string => {
    const date = new Date(dateString);

    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: format === "short" ? "short" : "long",
        day: "numeric",
    };

    if (format === "long") {
        options.hour = "2-digit";
        options.minute = "2-digit";
    }

    return new Intl.DateTimeFormat("en-IN", options).format(date);
};

/**
 * Format a phone number for display (e.g., +91 98765 43210)
 * @param phone The phone number to format
 * @returns Formatted phone number
 */
export const formatPhone = (phone: string): string => {
    if (!phone) return "";

    // Handle international format
    if (phone.startsWith("+")) {
        // +91 98765 43210
        const countryCode = phone.substring(0, 3);
        const firstPart = phone.substring(3, 8);
        const secondPart = phone.substring(8);
        return `${countryCode} ${firstPart} ${secondPart}`;
    }

    // Handle 10-digit format
    if (phone.length === 10) {
        const firstPart = phone.substring(0, 5);
        const secondPart = phone.substring(5);
        return `${firstPart} ${secondPart}`;
    }

    return phone;
};

/**
 * Truncate text to a specified length with ellipsis
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (!text || text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
};

/**
 * Format a file size in bytes to a human-readable format
 * @param bytes The size in bytes
 * @returns Formatted size with appropriate unit
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

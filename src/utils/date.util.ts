import moment from "moment-timezone";

/**
 * Returns the current date and time in Vietnam timezone (UTC+7)
 * This function can be used as a value for the MongoDB timestamp option
 * or anywhere else in the application where Vietnam time is needed
 *
 * @returns {Date} Current date and time in Vietnam timezone
 */
export const getVietnamTime = (): Date => {
    return moment().tz("Asia/Ho_Chi_Minh").toDate();
};

/**
 * Converts a given date to Vietnam timezone (UTC+7)
 *
 * @param {Date | string | number} date - The date to convert
 * @returns {Date} The date converted to Vietnam timezone
 */
export const toVietnamTime = (date: Date | string | number): Date => {
    return moment(date).tz("Asia/Ho_Chi_Minh").toDate();
};

/**
 * Formats a date according to the specified format in Vietnam timezone
 *
 * @param {Date | string | number} date - The date to format
 * @param {string} format - The format string (e.g., 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} The formatted date string
 */
export const formatVietnamTime = (
    date: Date | string | number,
    format: string = "YYYY-MM-DD HH:mm:ss"
): string => {
    return moment(date).tz("Asia/Ho_Chi_Minh").format(format);
};

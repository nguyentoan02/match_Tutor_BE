export const HTTP_STATUS = {
    // Success codes
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,

    // Client Error codes
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    PAYLOAD_TOO_LARGE: 413,

    // Server Error codes
    INTERNAL_SERVER: 500,
    SERVICE_UNAVAILABLE: 503,
} as const;

export const REASON_STATUS_CODE = {
    // Success reasons
    OK: "Success",
    CREATED: "Created",
    ACCEPTED: "Accepted",
    NO_CONTENT: "No Content",

    // Client Error reasons
    BAD_REQUEST: "Bad Request",
    UNAUTHORIZED: "Unauthorized",
    PAYMENT_REQUIRED: "Payment Required",
    FORBIDDEN: "Forbidden",
    NOT_FOUND: "Not Found",
    CONFLICT: "Conflict",
    PAYLOAD_TOO_LARGE: "Payload Too Large",

    // Server Error reasons
    INTERNAL_SERVER: "Internal Server Error",
    SERVICE_UNAVAILABLE: "Service Unavailable",
} as const;

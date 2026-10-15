/**
 * Single shared error type so UI components can display
 * consistent messages regardless of which feature triggered the call.
 * `status` is 0 for network/timeout errors that never reached the server.
 */
export class ChurchToolsApiError extends Error {
    public readonly endpoint: string;
    public readonly status: number;

    constructor(endpoint: string, status: number, message: string) {
        super(message);
        this.name = 'ChurchToolsApiError';
        this.endpoint = endpoint;
        this.status = status;
    }
}

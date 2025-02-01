export class Logger {

    private enableLogging: boolean;

    constructor(enableLogging: boolean) {
        this.enableLogging = enableLogging;
    }

    /**
     * Log a query to the console
     * @param query The query to log
     * @param params The parameters for the query
     */
    logQuery(query: string, params?: any[]): void {
        if (this.enableLogging) {
            console.log(`Executing query: ${query}`);
            if(params && params.length){
                console.log(`With params: ${JSON.stringify(params)}`);
            }
        }
    }

    logError(error: Error): void {
        if (this.enableLogging) {
            console.error(`Error: ${error.message}`);
        }
    }

    logInfo(message: string): void {
        if (this.enableLogging) {
            console.log(`Info: ${message}`);
        }
    }
}
/**
 * Logger utility using the 'debug' package
 * Controlled via DEBUG environment variable
 * 
 * Usage:
 * - Set DEBUG=true or DEBUG=1 or DEBUG=* to enable all logs
 * - Set DEBUG=kitchen-center:stats to enable only stats logs
 * - Leave unset or set to false to disable all logs
 */

import createDebug from 'debug';

// Check if debug is enabled via environment variable
const isDebugEnabled = (): boolean => {
    const debugEnv = process.env.DEBUG;
    return debugEnv === 'true' || debugEnv === '1' || debugEnv === '*';
};

// Initialize debug namespaces
const createLogger = (namespace: string) => {
    const debug = createDebug(namespace);
    
    // The debug package automatically checks DEBUG env var, but we can force enable
    // if DEBUG is set to true/1/* or matches the namespace pattern
    const debugEnv = process.env.DEBUG;
    if (isDebugEnabled() || (debugEnv && debugEnv.includes(namespace))) {
        debug.enabled = true;
    }
    
    return debug;
};

// Create loggers for different namespaces
const generalDebug = createLogger('kitchen-center:general');
const statsDebug = createLogger('kitchen-center:stats');
const eventsDebug = createLogger('kitchen-center:events');
const errorDebug = createLogger('kitchen-center:error');
const warnDebug = createLogger('kitchen-center:warn');

export class Logger {
    static log(...args: unknown[]): void {
        if (isDebugEnabled()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (generalDebug as any)(...args);
        }
    }

    static error(...args: unknown[]): void {
        if (isDebugEnabled()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (errorDebug as any)(...args);
        }
    }

    static warn(...args: unknown[]): void {
        if (isDebugEnabled()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (warnDebug as any)(...args);
        }
    }

    static info(...args: unknown[]): void {
        if (isDebugEnabled()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (generalDebug as any)(...args);
        }
    }

    static debug(...args: unknown[]): void {
        if (isDebugEnabled()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (generalDebug as any)(...args);
        }
    }

    // Namespace-specific loggers for better control
    static stats = statsDebug;
    static events = eventsDebug;
}

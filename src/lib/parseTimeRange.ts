export default function parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/^(\d+)(hr|day|w|y)$/);

    if (!match) throw new Error(`Invalid time range: ${timeRange}`);

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 'hr':
            return value * 60 * 60 * 1000;
        case 'day':
            return value * 24 * 60 * 60 * 1000;
        case 'w':
            return value * 7 * 24 * 60 * 60 * 1000;
        case 'y':
            return value * 365 * 24 * 60 * 60 * 1000;
        default:
            throw new Error(`Unsupported time range unit: ${unit}`);
    }
}
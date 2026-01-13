export type LineCountFormatter = ({ count }: {
    count: number;
}) => string;
export declare const defaultLineCountText: LineCountFormatter;

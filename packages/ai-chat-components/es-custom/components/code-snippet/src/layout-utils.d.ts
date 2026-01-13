interface ContainerStyleConfig {
    expanded: boolean;
    maxCollapsed: number;
    maxExpanded: number;
    minCollapsed: number;
    minExpanded: number;
    rowHeight: number;
}
export declare function buildContainerStyles({ expanded, maxCollapsed, maxExpanded, minCollapsed, minExpanded, rowHeight, }: ContainerStyleConfig): string;
interface ShowMoreEvaluationInput {
    shadowRoot: ShadowRoot | null;
    rowHeight: number;
    expanded: boolean;
    maxCollapsed: number;
    maxExpanded: number;
    minExpanded: number;
}
export declare function evaluateShowMoreButton({ shadowRoot, rowHeight, expanded, maxCollapsed, maxExpanded, minExpanded, }: ShowMoreEvaluationInput): {
    shouldShowButton: boolean;
    shouldCollapse: boolean;
};
export {};

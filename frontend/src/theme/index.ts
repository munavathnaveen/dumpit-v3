import { colors } from "./colors";
import { spacing } from "./spacing";

export const theme = {
    colors,
    spacing,
    borderRadius: {
        small: 4,
        medium: 8,
        large: 16,
        roundButton: 24,
    },
    shadow: {
        small: {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 2,
        },
        medium: {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        large: {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
            elevation: 8,
        },
    },
};

export default theme;

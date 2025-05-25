import React, { ReactNode } from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { theme } from "../theme";

interface Card3DProps {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    elevation?: "small" | "medium" | "large";
}

const Card3D: React.FC<Card3DProps> = ({ children, style, elevation = "medium" }) => {
    const getElevationStyle = () => {
        switch (elevation) {
            case "small":
                return styles.elevationSmall;
            case "large":
                return styles.elevationLarge;
            case "medium":
            default:
                return styles.elevationMedium;
        }
    };

    return <View style={[styles.container, getElevationStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.cardBg,
        borderRadius: theme.borderRadius.large,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.18)",
        overflow: "hidden",
    },
    elevationSmall: {
        shadowColor: theme.colors.shadow,
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
    },
    elevationMedium: {
        shadowColor: theme.colors.shadow,
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.37,
        shadowRadius: 7.49,
        elevation: 12,
    },
    elevationLarge: {
        shadowColor: theme.colors.shadow,
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.58,
        shadowRadius: 16.0,
        elevation: 24,
    },
});

export default Card3D;

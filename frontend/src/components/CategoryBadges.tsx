import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { theme } from "../theme";

interface CategoryBadgesProps {
    categories: string[];
    selectedCategory: string | undefined;
    onSelect: (category: string) => void;
    label?: string;
    required?: boolean;
    error?: string;
}

const CategoryBadges: React.FC<CategoryBadgesProps> = ({ categories, selectedCategory, onSelect, label, required = false, error }) => {
    return (
        <View style={styles.container}>
            {label && (
                <Text style={styles.label}>
                    {label}
                    {required && <Text style={styles.requiredAsterisk}>*</Text>}
                </Text>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesContainer}>
                {categories.map((category) => (
                    <TouchableOpacity key={category} style={[styles.badge, selectedCategory === category && styles.selectedBadge]} onPress={() => onSelect(category)}>
                        <Text style={[styles.badgeText, selectedCategory === category && styles.selectedBadgeText]}>{category}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: 16,
        fontWeight: "500",
        color: theme.colors.dark,
        marginBottom: 6,
    },
    requiredAsterisk: {
        color: theme.colors.error,
        marginLeft: 4,
    },
    badgesContainer: {
        flexDirection: "row",
        flexWrap: "nowrap",
        paddingVertical: 8,
    },
    badge: {
        backgroundColor: theme.colors.bgLight,
        borderRadius: theme.borderRadius.medium,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    selectedBadge: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    badgeText: {
        fontSize: 14,
        color: theme.colors.dark,
    },
    selectedBadgeText: {
        color: theme.colors.white,
        fontWeight: "500",
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 14,
        marginTop: 4,
    },
});

export default CategoryBadges;

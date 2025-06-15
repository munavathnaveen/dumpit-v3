import React, { useState } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../theme";

interface SearchBarProps {
    placeholder?: string;
    onSearch: (text: string) => void;
    value?: string;
    style?: object;
}

const SearchBar: React.FC<SearchBarProps> = ({ placeholder = "Search...", onSearch, value, style }) => {
    const [searchText, setSearchText] = useState(value || "");

    const handleClear = () => {
        setSearchText("");
        onSearch("");
    };

    const handleChangeText = (text: string) => {
        setSearchText(text);
        onSearch(text);
    };

    return (
        <View style={[styles.container, style]}>
            <Feather name="search" size={18} color={theme.colors.textLight} style={styles.icon} />
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textLight}
                value={searchText}
                onChangeText={handleChangeText}
                returnKeyType="search"
                autoCapitalize="none"
            />
            {searchText ? (
                <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                    <Feather name="x" size={18} color={theme.colors.textLight} />
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.medium,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        marginVertical: theme.spacing.sm,
        ...theme.shadow.small,
    },
    icon: {
        marginRight: theme.spacing.xs,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
        height: 38,
    },
    clearButton: {
        padding: theme.spacing.xs,
    },
});

export default SearchBar;

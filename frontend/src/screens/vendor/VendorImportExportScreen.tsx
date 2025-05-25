import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform, Modal } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import Card3D from "../../components/Card3D";
import ScreenHeader from "../../components/ScreenHeader";
import VendorLocationHeader from "../../components/VendorLocationHeader";
import { theme } from "../../theme";
import { MainStackNavigationProp } from "../../navigation/types";
import { exportData, importData, ImportResult } from "../../api/analyticsApi";

type DataType = "products" | "orders" | "revenue";
type FormatType = "csv" | "excel";

const VendorImportExportScreen: React.FC = () => {
    const navigation = useNavigation<MainStackNavigationProp<"VendorImportExport">>();
    const [loading, setLoading] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string>("");
    const [showInstructions, setShowInstructions] = useState(false);
    const [formatGuidance, setFormatGuidance] = useState<{
        show: boolean;
        title: string;
        sample: string;
        fields: string[];
    }>({
        show: false,
        title: "",
        sample: "",
        fields: [],
    });

    // Sample format data for products import
    const productImportFormat = {
        title: "Product Import Format",
        sample: "name,description,type,category,price,units,stock,discount\nProduct 1,Description for product 1,Physical,Electronics,499,piece,10,5\nProduct 2,Description for product 2,Digital,Software,999,license,100,0",
        fields: [
            "name - Product name (required)",
            "description - Product description (required)",
            "type - Product type (e.g., Physical, Digital) (required)",
            "category - Product category (required)",
            "price - Product price in INR (required)",
            "units - Unit type (e.g., piece, kg, dozen) (required)",
            "stock - Available quantity (required)",
            "discount - Discount percentage (optional, default 0)",
            "images - Comma-separated image URLs (optional)",
        ],
    };

    // Sample format data for orders export (for reference only)
    const orderExportFormat = {
        title: "Order Export Format",
        sample: 'id,customer,date,total,status,items\nORD12345,John Doe,2023-01-01,1299,delivered,"Product 1 (x2), Product 2 (x1)"\nORD12346,Jane Smith,2023-01-02,499,processing,"Product 3 (x1)"',
        fields: [
            "id - Order ID",
            "customer - Customer name",
            "date - Order date (YYYY-MM-DD)",
            "total - Order total in INR",
            "status - Order status (pending, processing, shipped, delivered, cancelled)",
            "items - Items in the order",
        ],
    };

    const handleExport = async (dataType: DataType, format: FormatType) => {
        try {
            setLoading(`export-${dataType}-${format}`);
            setActionMessage(`Exporting ${dataType}...`);

            // Get the blob data from API
            const blobData = await exportData(dataType, format);

            // Create a temporary file name
            const extension = format === "csv" ? "csv" : "xlsx";
            const fileName = `${dataType}_export_${new Date().toISOString().slice(0, 10)}.${extension}`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

            // Convert blob to base64 for file system operations
            const reader = new FileReader();
            reader.readAsDataURL(blobData);
            reader.onloadend = async () => {
                try {
                    // Remove data URL prefix (e.g., 'data:application/octet-stream;base64,')
                    const base64Data = reader.result?.toString().split(",")[1];

                    if (base64Data) {
                        // Write the file
                        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                            encoding: FileSystem.EncodingType.Base64,
                        });

                        // Share the file
                        if (await Sharing.isAvailableAsync()) {
                            await Sharing.shareAsync(fileUri, {
                                mimeType: format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                dialogTitle: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Export`,
                            });
                            setActionMessage("Export completed successfully");
                        } else {
                            Alert.alert("Sharing not available", "Sharing is not available on this device");
                        }
                    }
                } catch (error) {
                    console.error("File handling error:", error);
                    Alert.alert("Export Error", "Failed to process the exported file");
                } finally {
                    setLoading(null);
                    setActionMessage("");
                }
            };

            reader.onerror = () => {
                setLoading(null);
                setActionMessage("");
                Alert.alert("Export Error", "Failed to read the exported file");
            };
        } catch (error) {
            console.error(`Error exporting ${dataType}:`, error);
            Alert.alert("Export Error", `Failed to export ${dataType}. Please try again.`);
            setLoading(null);
            setActionMessage("");
        }
    };

    const handleImport = async (dataType: DataType) => {
        try {
            setLoading(`import-${dataType}`);
            setActionMessage(`Picking file for ${dataType} import...`);

            // Pick a document
            const result = await DocumentPicker.getDocumentAsync({
                type: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "*/*"],
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                setLoading(null);
                setActionMessage("");
                return;
            }

            const fileAsset = result.assets?.[0];
            if (!fileAsset) {
                setLoading(null);
                setActionMessage("");
                return;
            }

            setActionMessage(`Importing ${dataType}...`);

            // Create FormData for API upload
            const formData = new FormData();

            // Properly format the file object for mobile upload
            formData.append("csv", {
                uri: Platform.OS === "android" ? fileAsset.uri : fileAsset.uri.replace("file://", ""),
                name: fileAsset.name || `${dataType}_import.csv`,
                type: fileAsset.mimeType || "text/csv",
            } as any);

            // Upload the file directly using FormData
            const importResponse = await importData(dataType as "products", formData);

            Alert.alert("Import Successful", `Successfully imported ${importResponse.processed || 0} ${dataType}`, [{ text: "OK" }]);

            // If importing products, refresh the products screen
            if (dataType === "products") {
                navigation.navigate("VendorProducts");
            }
        } catch (error: any) {
            console.error(`Error importing ${dataType}:`, error);

            // Check if this is our structured error result with format guidance
            if (error && error.format) {
                // Show format guidance modal
                setFormatGuidance({
                    show: true,
                    title: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Import Format`,
                    sample: error.format.sample,
                    fields: error.format.fields,
                });
            } else {
                // Show generic error
                Alert.alert("Import Error", error.message || `Failed to import ${dataType}. Please check your file format and try again.`);
            }
        } finally {
            setLoading(null);
            setActionMessage("");
        }
    };

    const renderExportCard = (title: string, description: string, icon: string, dataType: DataType) => (
        <Card3D style={styles.card} elevation="medium">
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: getDataTypeColor(dataType) }]}>
                    <Ionicons name={icon as any} size={24} color={theme.colors.white} />
                </View>
                <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardDescription}>{description}</Text>
                </View>
            </View>

            <View style={styles.formatButtons}>
                <TouchableOpacity style={[styles.formatButton, styles.csvButton]} onPress={() => handleExport(dataType, "csv")} disabled={loading === `export-${dataType}-csv`}>
                    {loading === `export-${dataType}-csv` ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <>
                            <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.csvButtonText}>Export as CSV</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.formatButton, styles.excelButton]} onPress={() => handleExport(dataType, "excel")} disabled={loading === `export-${dataType}-excel`}>
                    {loading === `export-${dataType}-excel` ? (
                        <ActivityIndicator size="small" color={theme.colors.accent} />
                    ) : (
                        <>
                            <Ionicons name="grid-outline" size={18} color={theme.colors.accent} />
                            <Text style={styles.excelButtonText}>Export as Excel</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </Card3D>
    );

    const renderImportCard = (title: string, description: string, icon: string, dataType: DataType) => (
        <Card3D style={styles.card} elevation="medium">
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.info }]}>
                    <Ionicons name={icon as any} size={24} color={theme.colors.white} />
                </View>
                <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardDescription}>{description}</Text>

                    {/* Info button for format guidance */}
                    <TouchableOpacity
                        style={styles.infoButton}
                        onPress={() => {
                            if (dataType === "products") {
                                setFormatGuidance({
                                    show: true,
                                    ...productImportFormat,
                                });
                            }
                        }}
                    >
                        <Ionicons name="information-circle" size={22} color={theme.colors.primary} />
                        <Text style={styles.infoButtonText}>Format Guide</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity style={styles.importButton} onPress={() => handleImport(dataType)} disabled={loading === `import-${dataType}`}>
                {loading === `import-${dataType}` ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                    <>
                        <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.white} />
                        <Text style={styles.importButtonText}>Import {title}</Text>
                    </>
                )}
            </TouchableOpacity>
        </Card3D>
    );

    // Add a format guidance modal
    const renderFormatGuidanceModal = () => (
        <Modal visible={formatGuidance.show} transparent={true} animationType="slide" onRequestClose={() => setFormatGuidance({ ...formatGuidance, show: false })}>
            <View style={styles.modalContainer}>
                <Card3D style={styles.modalContent} elevation="large">
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{formatGuidance.title}</Text>
                        <TouchableOpacity onPress={() => setFormatGuidance({ ...formatGuidance, show: false })} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.colors.gray} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScrollView}>
                        <Text style={styles.formatGuideTitle}>Required Fields:</Text>
                        {formatGuidance.fields.map((field, index) => (
                            <Text key={index} style={styles.formatField}>
                                • {field}
                            </Text>
                        ))}

                        {formatGuidance.sample && (
                            <>
                                <Text style={[styles.formatGuideTitle, { marginTop: theme.spacing.md }]}>Sample Format:</Text>
                                <View style={styles.sampleContainer}>
                                    <Text style={styles.sampleText}>{formatGuidance.sample}</Text>
                                </View>
                            </>
                        )}

                        <Text style={[styles.formatInstruction, { marginTop: theme.spacing.md }]}>
                            Your CSV file should follow this exact format. You can also export your data first to see the correct format.
                        </Text>
                    </ScrollView>

                    <TouchableOpacity style={styles.closeModalButton} onPress={() => setFormatGuidance({ ...formatGuidance, show: false })}>
                        <Text style={styles.closeModalButtonText}>Close</Text>
                    </TouchableOpacity>
                </Card3D>
            </View>
        </Modal>
    );

    const renderInstructionsModal = () => (
        <Modal visible={showInstructions} transparent={true} animationType="slide" onRequestClose={() => setShowInstructions(false)}>
            <View style={styles.modalOverlay}>
                <Card3D style={styles.modalContent} elevation="medium">
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Import/Export Instructions</Text>
                        <TouchableOpacity onPress={() => setShowInstructions(false)}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.instructionsContainer}>
                        <Text style={styles.instructionsTitle}>Import Guidelines:</Text>
                        <Text style={styles.instructionsText}>• Products: CSV/Excel file with columns: name, description, price, category, stock, images (comma-separated URLs)</Text>
                        <Text style={styles.instructionsText}>• Orders: CSV/Excel file with columns: orderId, customerName, items (JSON array), total, status</Text>
                        <Text style={styles.instructionsText}>• Revenue: CSV/Excel file with columns: date, amount, orderId, paymentMethod</Text>

                        <Text style={styles.instructionsTitle}>Export Guidelines:</Text>
                        <Text style={styles.instructionsText}>• Choose between CSV or Excel format</Text>
                        <Text style={styles.instructionsText}>• Data will be exported in the same format as required for import</Text>
                        <Text style={styles.instructionsText}>• Use the exported file as a template for future imports</Text>
                    </ScrollView>
                </Card3D>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Import/Export" showBackButton={true} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>{actionMessage || "Processing..."}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <VendorLocationHeader title="Import/Export" showBackButton={true} />

            {actionMessage ? (
                <View style={styles.actionMessageContainer}>
                    <Text style={styles.actionMessageText}>{actionMessage}</Text>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
            ) : null}

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
                <Text style={styles.sectionTitle}>Export Data</Text>
                {renderExportCard("Products", "Export your product catalog", "cube-outline", "products")}
                {renderExportCard("Orders", "Export your order history", "receipt-outline", "orders")}
                {renderExportCard("Revenue", "Export your revenue reports", "cash-outline", "revenue")}

                <Text style={styles.sectionTitle}>Import Data</Text>
                {renderImportCard("Products", "Import your product catalog", "cube-outline", "products")}

                <View style={styles.helpCard}>
                    <Text style={styles.helpTitle}>Need Help?</Text>
                    <Text style={styles.helpText}>For help with importing or exporting data, please refer to our documentation or contact support.</Text>
                    <TouchableOpacity style={styles.helpButton} onPress={() => setShowInstructions(true)}>
                        <Text style={styles.helpButtonText}>View Instructions</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {renderFormatGuidanceModal()}
            {renderInstructionsModal()}
        </View>
    );
};

const getDataTypeColor = (dataType: DataType): string => {
    switch (dataType) {
        case "products":
            return theme.colors.primary;
        case "orders":
            return theme.colors.success;
        case "revenue":
            return theme.colors.accent;
        default:
            return theme.colors.primary;
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: theme.spacing.md,
        backgroundColor: theme.colors.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.lightGray,
    },
    backButton: {
        padding: theme.spacing.xs,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.dark,
    },
    headerSpacer: {
        width: 40,
    },
    content: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl * 2,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: theme.colors.dark,
        marginBottom: theme.spacing.xs,
    },
    importSectionTitle: {
        marginTop: theme.spacing.xl,
    },
    sectionDescription: {
        fontSize: 14,
        color: theme.colors.gray,
        marginBottom: theme.spacing.md,
    },
    card: {
        marginBottom: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.white,
    },
    cardHeader: {
        flexDirection: "row",
        marginBottom: theme.spacing.md,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        marginRight: theme.spacing.md,
    },
    cardTitleContainer: {
        flex: 1,
        justifyContent: "center",
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: theme.colors.dark,
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: theme.colors.gray,
    },
    formatButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    formatButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.medium,
        flex: 1,
        marginHorizontal: theme.spacing.xs,
        borderWidth: 1,
    },
    csvButton: {
        borderColor: theme.colors.primary,
        backgroundColor: `${theme.colors.primary}10`,
    },
    csvButtonText: {
        color: theme.colors.primary,
        fontWeight: "500",
        marginLeft: theme.spacing.xs,
    },
    excelButton: {
        borderColor: theme.colors.accent,
        backgroundColor: `${theme.colors.accent}10`,
    },
    excelButtonText: {
        color: theme.colors.accent,
        fontWeight: "500",
        marginLeft: theme.spacing.xs,
    },
    importButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.info,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.medium,
        ...theme.shadow.small,
    },
    importButtonText: {
        color: theme.colors.white,
        fontWeight: "500",
        marginLeft: theme.spacing.xs,
    },
    importNote: {
        flexDirection: "row",
        backgroundColor: `${theme.colors.warning}10`,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.medium,
        marginTop: theme.spacing.sm,
    },
    importNoteText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.dark,
        marginLeft: theme.spacing.sm,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.dark,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: theme.spacing.md,
    },
    modalContent: {
        width: "90%",
        maxHeight: "80%",
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.large,
        padding: theme.spacing.md,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.lightGray,
        paddingBottom: theme.spacing.sm,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.dark,
    },
    closeButton: {
        padding: theme.spacing.xs,
    },
    modalScrollView: {
        maxHeight: "70%",
    },
    formatGuideTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.dark,
        marginBottom: theme.spacing.sm,
    },
    formatField: {
        fontSize: 14,
        color: theme.colors.dark,
        marginBottom: theme.spacing.xs,
        marginLeft: theme.spacing.sm,
    },
    sampleContainer: {
        backgroundColor: theme.colors.lightGray,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.small,
        marginVertical: theme.spacing.xs,
    },
    sampleText: {
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        fontSize: 12,
        color: theme.colors.dark,
    },
    formatInstruction: {
        fontSize: 14,
        color: theme.colors.gray,
        fontStyle: "italic",
    },
    closeModalButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.medium,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        alignItems: "center",
        marginTop: theme.spacing.md,
    },
    closeModalButtonText: {
        color: theme.colors.white,
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    instructionsContainer: {
        maxHeight: "80%",
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.primary,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    instructionsText: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    scrollView: {
        padding: theme.spacing.md,
    },
    contentContainer: {
        paddingBottom: theme.spacing.xl * 2,
    },
    infoButton: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: theme.spacing.xs,
    },
    infoButtonText: {
        fontSize: 12,
        color: theme.colors.primary,
        marginLeft: 4,
    },
    actionMessageContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: theme.spacing.md,
        backgroundColor: theme.colors.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.lightGray,
    },
    actionMessageText: {
        flex: 1,
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.dark,
    },
    helpCard: {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.medium,
        marginTop: theme.spacing.md,
    },
    helpTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.dark,
        marginBottom: theme.spacing.sm,
    },
    helpText: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    helpButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.medium,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        alignItems: "center",
    },
    helpButtonText: {
        color: theme.colors.white,
        fontWeight: "600",
    },
    scrollViewContent: {
        paddingBottom: theme.spacing.xl * 2,
    },
});

export default VendorImportExportScreen;

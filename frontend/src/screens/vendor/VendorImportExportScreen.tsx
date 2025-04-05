import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import Card3D from '../../components/Card3D';
import { theme } from '../../theme';
import { MainStackNavigationProp } from '../../navigation/types';
import { exportData, importData } from '../../api/analyticsApi';

type DataType = 'products' | 'orders' | 'revenue';
type FormatType = 'csv' | 'excel';

const VendorImportExportScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorImportExport'>>();
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (dataType: DataType, format: FormatType) => {
    try {
      setLoading(`export-${dataType}-${format}`);
      
      // Get the blob data from API
      const blobData = await exportData(dataType, format);
      
      // Create a temporary file name
      const extension = format === 'csv' ? 'csv' : 'xlsx';
      const fileName = `${dataType}_export_${new Date().toISOString().slice(0, 10)}.${extension}`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Convert blob to base64 for file system operations
      const reader = new FileReader();
      reader.readAsDataURL(blobData);
      reader.onloadend = async () => {
        try {
          // Remove data URL prefix (e.g., 'data:application/octet-stream;base64,')
          const base64Data = reader.result?.toString().split(',')[1];
          
          if (base64Data) {
            // Write the file
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Share the file
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri, {
                mimeType: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Export`,
              });
            } else {
              Alert.alert('Sharing not available', 'Sharing is not available on this device');
            }
          }
        } catch (error) {
          console.error('File handling error:', error);
          Alert.alert('Export Error', 'Failed to process the exported file');
        } finally {
          setLoading(null);
        }
      };
      
      reader.onerror = () => {
        setLoading(null);
        Alert.alert('Export Error', 'Failed to read the exported file');
      };
    } catch (error) {
      console.error(`Error exporting ${dataType}:`, error);
      Alert.alert('Export Error', `Failed to export ${dataType}`);
      setLoading(null);
    }
  };

  const handleImport = async (dataType: DataType) => {
    try {
      setLoading(`import-${dataType}`);
      
      // Pick a document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        setLoading(null);
        return;
      }
      
      const fileAsset = result.assets?.[0];
      if (!fileAsset) {
        setLoading(null);
        return;
      }
      
      // Create a file object for API upload
      const fileInfo = {
        uri: fileAsset.uri,
        name: fileAsset.name,
        type: fileAsset.mimeType,
      };
      
      // Convert the picked file to a Blob
      const response = await fetch(fileInfo.uri);
      const blob = await response.blob();
      const file = new File([blob], fileInfo.name, { type: fileInfo.type });
      
      // Upload the file
      const importResponse = await importData(dataType as 'products', file);
      
      Alert.alert(
        'Import Successful',
        `Successfully imported ${importResponse.count || 0} ${dataType}`,
        [{ text: 'OK' }]
      );
      
      // If importing products, refresh the products screen
      if (dataType === 'products') {
        navigation.navigate('VendorProducts');
      }
    } catch (error) {
      console.error(`Error importing ${dataType}:`, error);
      Alert.alert('Import Error', `Failed to import ${dataType}`);
    } finally {
      setLoading(null);
    }
  };

  const renderExportCard = (
    title: string,
    description: string,
    icon: string,
    dataType: DataType
  ) => (
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
        <TouchableOpacity
          style={[styles.formatButton, styles.csvButton]}
          onPress={() => handleExport(dataType, 'csv')}
          disabled={loading === `export-${dataType}-csv`}
        >
          {loading === `export-${dataType}-csv` ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.csvButtonText}>Export as CSV</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.formatButton, styles.excelButton]}
          onPress={() => handleExport(dataType, 'excel')}
          disabled={loading === `export-${dataType}-excel`}
        >
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

  const renderImportCard = (
    title: string,
    description: string,
    icon: string,
    dataType: DataType
  ) => (
    <Card3D style={styles.card} elevation="medium">
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.info }]}>
          <Ionicons name={icon as any} size={24} color={theme.colors.white} />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.importButton}
        onPress={() => handleImport(dataType)}
        disabled={loading === `import-${dataType}`}
      >
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import & Export</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Export Data</Text>
        <Text style={styles.sectionDescription}>
          Export your store data in CSV or Excel format
        </Text>
        
        {renderExportCard(
          'Products',
          'Export your product catalog with all details',
          'cube-outline',
          'products'
        )}
        
        {renderExportCard(
          'Orders',
          'Export all customer orders with transaction details',
          'receipt-outline',
          'orders'
        )}
        
        {renderExportCard(
          'Revenue',
          'Export revenue data with daily, weekly, and monthly breakdown',
          'stats-chart-outline',
          'revenue'
        )}
        
        <Text style={[styles.sectionTitle, styles.importSectionTitle]}>Import Data</Text>
        <Text style={styles.sectionDescription}>
          Import data from CSV files to update your store
        </Text>
        
        {renderImportCard(
          'Products',
          'Update your product catalog by importing a CSV file',
          'cloud-download-outline',
          'products'
        )}
        
        <View style={styles.importNote}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.warning} />
          <Text style={styles.importNoteText}>
            Note: Make sure your CSV file follows the required format. You can export an existing file first to see the correct format.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const getDataTypeColor = (dataType: DataType): string => {
  switch (dataType) {
    case 'products':
      return theme.colors.primary;
    case 'orders':
      return theme.colors.success;
    case 'revenue':
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  cardTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  formatButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '500',
    marginLeft: theme.spacing.xs,
  },
  excelButton: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}10`,
  },
  excelButtonText: {
    color: theme.colors.accent,
    fontWeight: '500',
    marginLeft: theme.spacing.xs,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.info,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    ...theme.shadow.small,
  },
  importButtonText: {
    color: theme.colors.white,
    fontWeight: '500',
    marginLeft: theme.spacing.xs,
  },
  importNote: {
    flexDirection: 'row',
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
});

export default VendorImportExportScreen; 
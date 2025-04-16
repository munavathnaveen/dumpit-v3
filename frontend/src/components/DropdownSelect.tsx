import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Animated,
  Keyboard,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface DropdownSelectProps {
  options: string[];
  selectedValue: string | undefined;
  onSelect: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
  required?: boolean;
  searchable?: boolean;
  testID?: string;
}

const DropdownSelect: React.FC<DropdownSelectProps> = ({
  options,
  selectedValue,
  onSelect,
  placeholder = 'Select an option',
  label,
  error,
  disabled = false,
  style,
  required = false,
  searchable = true,
  testID,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

  useEffect(() => {
    if (modalVisible) {
      setSearchQuery('');
      setFilteredOptions(options);
    }
  }, [modalVisible, options]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option => 
        option.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  };

  const openModal = () => {
    if (disabled) return;
    Keyboard.dismiss();
    setModalVisible(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  const handleSelect = (option: string) => {
    onSelect(option);
    closeModal();
  };

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}{required && <Text style={styles.requiredAsterisk}>*</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.selector,
          disabled && styles.disabledSelector,
          error ? styles.errorSelector : null
        ]}
        onPress={openModal}
        disabled={disabled}
        testID={testID}
      >
        <Text 
          style={[
            selectedValue ? styles.selectedText : styles.placeholderText,
            disabled && styles.disabledText
          ]}
          numberOfLines={1}
        >
          {selectedValue || placeholder}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color={disabled ? theme.colors.lightGray : theme.colors.gray} 
        />
      </TouchableOpacity>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closeModal}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              { transform: [{ translateY }] }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Select an option'}</Text>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Ionicons name="close" size={24} color={theme.colors.dark} />
              </TouchableOpacity>
            </View>
            
            {searchable && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={theme.colors.gray} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="always"
                />
              </View>
            )}
            
            {filteredOptions.length > 0 ? (
              <FlatList
                data={filteredOptions}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      selectedValue === item && styles.selectedOption
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text 
                      style={[
                        styles.optionText,
                        selectedValue === item && styles.selectedOptionText
                      ]}
                    >
                      {item}
                    </Text>
                    {selectedValue === item && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                style={styles.optionsList}
              />
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={40} color={theme.colors.lightGray} />
                <Text style={styles.noResultsText}>No results found</Text>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.dark,
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: theme.colors.error,
    marginLeft: 4,
  },
  selector: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.sm,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabledSelector: {
    backgroundColor: theme.colors.bgLight,
    borderColor: theme.colors.lightGray,
  },
  errorSelector: {
    borderColor: theme.colors.error,
  },
  selectedText: {
    fontSize: 16,
    color: theme.colors.dark,
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: theme.colors.gray,
    flex: 1,
  },
  disabledText: {
    color: theme.colors.lightGray,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgLight,
    margin: 16,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: 12,
    marginTop: 0,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: theme.colors.dark,
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  selectedOption: {
    backgroundColor: theme.colors.bgLight,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.dark,
  },
  selectedOptionText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 20,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: theme.colors.gray,
    marginTop: 10,
  },
});

export default DropdownSelect; 
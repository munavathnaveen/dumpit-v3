import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface RoleTabSelectorProps {
  selectedRole: 'customer' | 'vendor';
  onRoleChange: (role: 'customer' | 'vendor') => void;
}

const RoleTabSelector: React.FC<RoleTabSelectorProps> = ({ 
  selectedRole, 
  onRoleChange 
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.tab,
          selectedRole === 'customer' && styles.selectedTab
        ]}
        onPress={() => onRoleChange('customer')}
      >
        <Text 
          style={[
            styles.tabText,
            selectedRole === 'customer' && styles.selectedTabText
          ]}
        >
          Customer
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tab,
          selectedRole === 'vendor' && styles.selectedTab
        ]}
        onPress={() => onRoleChange('vendor')}
      >
        <Text 
          style={[
            styles.tabText,
            selectedRole === 'vendor' && styles.selectedTabText
          ]}
        >
          Vendor
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.large,
    padding: 4,
    marginBottom: theme.spacing.md,
    ...theme.shadow.small,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.medium,
  },
  selectedTab: {
    backgroundColor: theme.colors.white,
    ...theme.shadow.small,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  selectedTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default RoleTabSelector; 
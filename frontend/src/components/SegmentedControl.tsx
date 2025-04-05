import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../theme';

interface SegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: any;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  values,
  selectedIndex,
  onChange,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {values.map((value, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.segment,
              selectedIndex === index && styles.selectedSegment,
              index === 0 && styles.firstSegment,
              index === values.length - 1 && styles.lastSegment,
            ]}
            onPress={() => onChange(index)}
          >
            <Text
              style={[
                styles.segmentText,
                selectedIndex === index && styles.selectedSegmentText,
              ]}
            >
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bgLight,
    borderRadius: theme.borderRadius.large,
    padding: 2,
  },
  scrollContainer: {
    flexDirection: 'row',
  },
  segment: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSegment: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    ...theme.shadow.small,
  },
  firstSegment: {
    marginLeft: 2,
  },
  lastSegment: {
    marginRight: 2,
  },
  segmentText: {
    color: theme.colors.gray,
    fontWeight: '500',
    fontSize: 14,
  },
  selectedSegmentText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});

export default SegmentedControl; 
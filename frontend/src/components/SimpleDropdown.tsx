import React from 'react';
import { ViewStyle } from 'react-native';
import DropdownSelect from './DropdownSelect';

interface SimpleDropdownProps {
  label?: string;
  options: string[];
  selectedValue: string | undefined;
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const SimpleDropdown: React.FC<SimpleDropdownProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder,
  error,
  required,
  disabled,
  style,
  testID,
}) => {
  return (
    <DropdownSelect
      label={label}
      options={options}
      selectedValue={selectedValue}
      onSelect={onSelect}
      placeholder={placeholder}
      error={error}
      required={required}
      disabled={disabled}
      style={style}
      testID={testID}
    />
  );
};

export default SimpleDropdown; 
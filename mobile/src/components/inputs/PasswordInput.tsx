import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { CustomInput, CustomInputProps } from './CustomInput';
import { colors } from '../../theme';

export const PasswordInput: React.FC<CustomInputProps> = (props) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const toggleVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <CustomInput
      {...props}
      secureTextEntry={!isPasswordVisible}
      rightIcon={
        <TouchableOpacity onPress={toggleVisibility} activeOpacity={0.7}>
          {isPasswordVisible ? (
            <EyeOff color={colors.secondaryText} size={20} />
          ) : (
            <Eye color={colors.secondaryText} size={20} />
          )}
        </TouchableOpacity>
      }
    />
  );
};

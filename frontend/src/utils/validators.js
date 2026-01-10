// Form Validation Helpers

export const validators = {
  // Email validation
  email: (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return 'Email is required';
    if (!regex.test(value)) return 'Please enter a valid email address';
    return null;
  },

  // Required field
  required: (value, fieldName = 'This field') => {
    if (!value || value.trim() === '') return `${fieldName} is required`;
    return null;
  },

  // Number validation
  number: (value, fieldName = 'This field', min = 0) => {
    if (!value) return `${fieldName} is required`;
    const num = parseFloat(value);
    if (isNaN(num)) return `${fieldName} must be a number`;
    if (num < min) return `${fieldName} must be at least ${min}`;
    return null;
  },

  // URL validation
  url: (value) => {
    if (!value) return null; // URL is optional
    try {
      new URL(value);
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return 'URL must start with http:// or https://';
      }
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  // SKU format validation
  sku: (value) => {
    if (!value) return 'SKU is required';
    if (value.length < 3) return 'SKU must be at least 3 characters';
    if (!/^[A-Z0-9-]+$/i.test(value)) return 'SKU can only contain letters, numbers, and hyphens';
    return null;
  },

  // Phone validation (Malaysia format)
  phone: (value) => {
    if (!value) return null; // Phone is optional
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length < 10 || cleaned.length > 11) {
      return 'Please enter a valid phone number (10-11 digits)';
    }
    return null;
  },

  // Price validation
  price: (value, fieldName = 'Price') => {
    if (!value) return `${fieldName} is required`;
    const num = parseFloat(value);
    if (isNaN(num)) return `${fieldName} must be a number`;
    if (num <= 0) return `${fieldName} must be greater than 0`;
    if (num > 1000000) return `${fieldName} seems unreasonably high`;
    return null;
  }
};

// Check all validations and return first error
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const validator = rules[field];
    const error = validator(data[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

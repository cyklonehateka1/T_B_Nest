# Ghanaian Phone Number Validation Utility

This utility provides validation for Ghanaian phone numbers used in the application.

## Features

- Validates Ghanaian phone numbers with proper network prefix validation
- Supports multiple input formats (0XX, 233XX, +233XX)
- Normalizes phone numbers to a consistent format (0XXXXXXXXX)
- Provides helper methods for formatting and network detection
- Includes a custom class-validator decorator for use in DTOs

## Supported Phone Number Formats

The utility accepts the following formats:

- `0XXXXXXXXX` - Local format (10 digits starting with 0)
- `233XXXXXXXXX` - International format without + (12 digits)
- `+233XXXXXXXXX` - International format with + (12 digits)

Spaces, dashes, and parentheses are automatically removed during validation.

## Valid Network Prefixes

### MTN

- 024, 025, 053, 054, 055, 059

### Vodafone

- 020, 050

### AirtelTigo

- 026, 027, 056, 057

### Glo

- 023

## Usage

### 1. Using the PhoneValidationUtil Class

```typescript
import { PhoneValidationUtil } from './common/utils/phone-validation.util';

// Validate and normalize a phone number
try {
  const normalizedNumber =
    PhoneValidationUtil.validateGhanaianPhoneNumber('+233241234567');
  console.log(normalizedNumber); // Output: 0241234567
} catch (error) {
  console.error(error.message); // Invalid phone number error
}

// Check if a phone number is valid (without throwing exception)
const isValid = PhoneValidationUtil.isValidPhoneNumber('0241234567');
console.log(isValid); // Output: true

// Format a phone number for display
const formatted = PhoneValidationUtil.formatPhoneNumber('0241234567');
console.log(formatted); // Output: 024 123 4567

// Get the network name
const network = PhoneValidationUtil.getNetworkName('0241234567');
console.log(network); // Output: MTN
```

### 2. Using the @IsGhanaianPhone Decorator in DTOs

```typescript
import { IsGhanaianPhone } from './common/decorators/is-ghanaian-phone.decorator';
import { IsString, IsNotEmpty } from 'class-validator';

export class MobileMoneyPaymentDataDto {
  @IsString()
  @IsNotEmpty()
  @IsGhanaianPhone()
  accountNumber: string;
}
```

## Integration with Order Creation

The phone validation is automatically applied when creating orders:

1. **DTO Validation**: Phone numbers are validated at the DTO level using the `@IsGhanaianPhone` decorator
2. **Controller Normalization**: The controller normalizes phone numbers before passing to the service
3. **Service Layer**: The service layer stores normalized phone numbers in the database

This ensures that all phone numbers stored in the system are valid and in a consistent format.

## Example API Error Response

When an invalid phone number is provided, the API returns a validation error:

```json
{
  "statusCode": 400,
  "message": ["accountNumber must be a valid Ghanaian phone number"],
  "error": "Bad Request"
}
```

## Testing

Run the unit tests to verify the phone validation utility:

```bash
npm test -- phone-validation.util.spec.ts
```

## Notes

- All phone numbers are normalized to the local format (0XXXXXXXXX) for consistency
- Invalid prefixes are rejected to ensure only valid Ghanaian mobile numbers are accepted
- The validation is strict and does not allow numbers from other countries

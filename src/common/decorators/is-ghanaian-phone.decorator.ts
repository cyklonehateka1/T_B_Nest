import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { PhoneValidationUtil } from "../utils/phone-validation.util";
@ValidatorConstraint({ async: false })
export class IsGhanaianPhoneConstraint implements ValidatorConstraintInterface {
  validate(phoneNumber: any, args: ValidationArguments): boolean {
    if (typeof phoneNumber !== "string") {
      return false;
    }
    return PhoneValidationUtil.isValidPhoneNumber(phoneNumber);
  }
  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid Ghanaian phone number`;
  }
}
export function IsGhanaianPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsGhanaianPhoneConstraint,
    });
  };
}

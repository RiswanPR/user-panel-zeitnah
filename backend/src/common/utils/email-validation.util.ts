import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * RFC 2606 & RFC 6761 reserved domains that cannot receive real emails.
 * These are reserved exclusively for documentation and testing purposes.
 */
export const RESERVED_EMAIL_DOMAINS = [
  'example.com',
  'example.org',
  'example.net',
  'example.edu',
  'test.com',
  'invalid',
  'localhost',
];

/**
 * Checks whether an email address uses an RFC 2606 reserved documentation/testing domain.
 */
export function isReservedDocumentationDomain(email: string): boolean {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return false;
  }
  const domain = email.split('@').pop()?.toLowerCase().trim() || '';
  if (RESERVED_EMAIL_DOMAINS.includes(domain)) {
    return true;
  }
  if (
    domain.endsWith('.test') ||
    domain.endsWith('.example') ||
    domain.endsWith('.invalid') ||
    domain.endsWith('.localhost')
  ) {
    return true;
  }
  return false;
}

/**
 * Class-validator decorator to reject RFC 2606 reserved documentation domains.
 */
export function IsNotReservedEmailDomain(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotReservedEmailDomain',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message:
          'Email address cannot use reserved example or documentation domains (e.g. example.com). Please provide a valid active email address.',
        ...validationOptions,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') return true; // Handled by @IsEmail
          return !isReservedDocumentationDomain(value);
        },
      },
    });
  };
}

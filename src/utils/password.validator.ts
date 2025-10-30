import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments) {
    // 至少8位，包含大写字母、小写字母、数字和特殊字符
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  defaultMessage(args: ValidationArguments) {
    return '密码必须至少8位，包含大写字母、小写字母、数字和特殊字符(@$!%*?&)';
  }
}

export function IsStrongPassword() {
  return function (object: Object, propertyName: string) {
    // 使用装饰器注册
  };
}
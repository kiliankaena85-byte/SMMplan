import {
  TargetTypeEnum,
  normalizeTargetType,
  inferTargetTypeFromName,
  isTargetTypeCompatible,
  type ServiceTargetType
} from './target-type-mapper';

export {
  TargetTypeEnum,
  normalizeTargetType,
  inferTargetTypeFromName,
  isTargetTypeCompatible,
  type ServiceTargetType
};

export function inferTargetTypeFromCategory(categoryName: string | null | undefined): TargetTypeEnum {
  return inferTargetTypeFromName(categoryName);
}
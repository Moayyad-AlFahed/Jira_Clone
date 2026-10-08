export { DomainException } from './domain.exception';

export { BusinessException } from './business/business.exception';

export {
  isPrismaError,
  mapPrismaError,
  KNOWN_CODE_ACTIONS,
} from './infrastructure/prisma.exception';

export { InvalidProjectNameException } from './domain/project/invalid-project-name.exception';
export { ProjectNameRequiredException } from './domain/project/project-name-required.exception';

export { SprintEndDateBeforeStartDateException } from './domain/sprint/sprint-end-date-before-start-date.exception';
export { SprintAlreadyStartedException } from './domain/sprint/sprint-already-started.exception';
export { SprintAlreadyCompletedException } from './domain/sprint/sprint-already-completed.exception';

export { TaskNameRequiredException } from './domain/task/task-name-required.exception';
export { InvalidTaskNameException } from './domain/task/invalid-task-name.exception';
export { TaskSprintProjectMismatchException } from './domain/task/task-sprint-project-mismatch.exception';

export { InvalidStatusTransitionException } from './domain/status/invalid-status-transition.exception';
export { StatusCannotBeDeletedException } from './domain/status/status-cannot-be-deleted.exception';

export { CannotRemoveLastProjectAdminException } from './domain/project-user/cannot-remove-last-project-admin.exception';

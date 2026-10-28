# Part 01 - Foundation and backend contract

## Objective and entry gate

Establish the project and a verified API/UI contract map before feature work. Entry: user explicitly authorizes Part 01 implementation. Overall-plan approval alone is not completion approval. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Inspect existing target files and applicable project guidance; preserve unrelated work. Create the app at F:/Mazen/Projects/Brouj_front-end with the planning folder retained. Scaffold only missing files; do not use a scaffold command that overwrites the plans.
2. Initialize Vite React/TypeScript with strict checking, CSS Modules and npm. Pin compatible stable dependencies and runtime constraints, add a lockfile, document setup. Add scripts for dev, build, typecheck, lint, test and test:browser. ESLint must enforce hooks and prohibit runtime Axios imports outside API.tsx.
3. Create the required directories and a minimal app. Add Vitest/React Testing Library and Playwright configuration without implementing future feature tests. Keep test artifacts ignored. Do not install SignalR yet.
4. Configure HTTPS development using trusted local certificate paths supplied outside source control. Document https://localhost:5173 -> https://localhost:7249 and certificate trust. Do not weaken backend Secure cookies, TLS verification, or CORS to make HTTP development work.
5. Define public environment inputs for API origin, optional media delivery configuration, and business currency. Validate API origin as HTTPS. Client environment values are public; no signing keys, connection strings, credentials, or backend secrets belong here.
6. Read the endpoint JSON/Markdown, controllers, request DTOs, validators, handlers and enums. Produce a checked-in API/UI matrix covering all 101 business operations and CSRF separately. For each record: method/path, query/body, return type, feature service, context, screen/action, actor policy, implementation phase, and representative failure.
7. Record exact enum wire values from API serialization, nullable fields, pagination envelope, defaults, decimal handling and time formats. Database enum storage does not establish JSON enum encoding. Record unknown-member rejection and full-update PATCH semantics.
8. Record launch dependencies: currency supplied by owner/deployment, media URL delivery absent, initial SuperAdmin provisioned using the existing backend runbook, backend request/rate budgets and HTTPS origins supplied by deployment.

## Interfaces and contract priorities

Required base tree: src/{API.tsx,App.tsx,Services,Context,Router,Pages,Components,Types,Hooks,Styles,i18n}. Do not instantiate Axios until Part 03; a placeholder file is sufficient.

Feature families: Security, CustomerAuth, StaffAuth, CustomerProfile, StaffProfile, Cities, Areas, Projects, Units, Reservations, Orders, CustomersAdmin, StaffAdmin, TimePlans, Templates, Terms, ActivityLogs. Use subfolders inside Services and Context where this improves ownership.

The contract matrix must preserve:
- Unit detail/update/delete require query projectId alongside route id.
- Customer order detail uses the MemberOnly GET /api/v1/admin/orders/{id}; its URL does not imply staff-only authorization.
- AuthSessionDto has actorId/expiresAt, not role, accessToken or refreshToken.
- File creation sends exactly one File plus only approved metadata; per-file maximum is 5 MiB.
- Public read endpoints may also supply admin catalogue lists; do not invent admin GET endpoints.

## Verification and deliverables

Deliver the scaffold, environment example, setup README, contract matrix, dependency/runtime record, and phase completion report. Run install/build/typecheck/lint and a meaningful app smoke test. Confirm the matrix counts 101 business operations against the current source and accounts for supporting endpoints without turning health or Swagger into product screens.

Acceptance: no hardcoded secrets or fake APIs; required structure exists; HTTPS setup is documented; backend gaps are explicit; contract matrix is complete. Record dependency failures accurately rather than marking unrun checks passed.

## Approval gate

Mark Awaiting approval only after checks pass and known dependencies are reported. Stop implementation before Part 02 until the user approves Part 01.

## Backend operation inventory at planning time

Snapshot from the backend endpoint contracts on 2026-10-28. Reconcile with current source in Part 01. Phase means the primary UI implementation phase; services are established in Part 03 and identity hydration in Part 04. No inventory row authorizes implementing a later phase early.

| Method / route | Application request | Body/query | Response data | Policy | Success | Rate category | Primary UI phase |
|---|---|---|---|---|---|---|---|
| POST `/api/v1/auth/customers/register` | `RegisterCustomerCommand` | `RegisterCustomerInput`; — | `AuthSessionDto` | Anonymous | 201 | Authentication | Part 04 |
| POST `/api/v1/auth/customers/login` | `LoginCustomerCommand` | `LoginInput`; — | `AuthSessionDto` | Anonymous | 200 | Authentication | Part 04 |
| POST `/api/v1/auth/customers/refresh` | `RefreshCustomerSessionCommand` | —; — | `AuthSessionDto` | Anonymous | 200 | Authentication | Part 04 |
| POST `/api/v1/auth/customers/logout` | `LogoutCustomerCommand` | —; — | `Guid` | Anonymous | 200 | Authentication | Part 04 |
| POST `/api/v1/auth/users/login` | `LoginUserCommand` | `LoginInput`; — | `AuthSessionDto` | Anonymous | 200 | Authentication | Part 04 |
| POST `/api/v1/auth/users/refresh` | `RefreshUserSessionCommand` | —; — | `AuthSessionDto` | Anonymous | 200 | Authentication | Part 04 |
| POST `/api/v1/auth/users/logout` | `LogoutUserCommand` | —; — | `Guid` | Anonymous | 200 | Authentication | Part 04 |
| GET `/api/v1/customers/me` | `GetCurrentCustomerQuery` | —; — | `CurrentCustomerDto` | CustomerOnly | 200 | PublicReads | Part 07 |
| PATCH `/api/v1/customers/me` | `UpdateCustomerProfileCommand` | `CustomerProfileInput`; — | `Guid` | CustomerOnly | 200 | Authentication | Part 07 |
| POST `/api/v1/customers/me/change-password` | `ChangeCustomerPasswordCommand` | `PasswordChangeInput`; — | `Guid` | CustomerOnly | 200 | Authentication | Part 07 |
| GET `/api/v1/users/me` | `GetCurrentUserQuery` | —; — | `UserDto` | StaffOnly | 200 | PublicReads | Part 11 |
| POST `/api/v1/users/me/change-password` | `ChangeUserPasswordCommand` | `PasswordChangeInput`; — | `Guid` | StaffOnly | 200 | Authentication | Part 11 |
| GET `/api/v1/admin/users` | `GetUsersQuery` | —; `GetUsersParameters` | `PaginationResult<UserDto>` | SuperAdminOnly | 200 | PublicReads | Part 11 |
| GET `/api/v1/admin/users/{id}` | `GetUserByIdQuery` | —; — | `UserDto` | SuperAdminOnly | 200 | PublicReads | Part 11 |
| POST `/api/v1/admin/users` | `CreateUserCommand` | `CreateUserInput`; — | `Guid` | SuperAdminOnly | 201 | AdminWrites | Part 11 |
| PATCH `/api/v1/admin/users/{id}` | `UpdateUserCommand` | `UpdateUserInput`; — | `Guid` | SuperAdminOnly | 200 | AdminWrites | Part 11 |
| DELETE `/api/v1/admin/users/{id}` | `SoftDeleteUserCommand` | —; — | `Guid` | SuperAdminOnly | 200 | AdminWrites | Part 11 |
| POST `/api/v1/admin/users/{id}/restore` | `RestoreUserCommand` | —; — | `Guid` | SuperAdminOnly | 200 | AdminWrites | Part 11 |
| GET `/api/v1/admin/customers` | `GetCustomersQuery` | —; `GetCustomersParameters` | `PaginationResult<CustomerDto>` | AdminOnly | 200 | PublicReads | Part 09 |
| GET `/api/v1/admin/customers/{id}` | `GetCustomerByIdQuery` | —; — | `CustomerDto` | AdminOnly | 200 | PublicReads | Part 09 |
| DELETE `/api/v1/admin/customers/{id}` | `SoftDeleteCustomerCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 09 |
| POST `/api/v1/admin/customers/{id}/restore` | `RestoreCustomerCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 09 |
| GET `/api/v1/cities` | `GetCitiesQuery` | —; `GetCitiesParameters` | `PaginationResult<CityDto>` | Anonymous | 200 | PublicReads | Part 06 |
| GET `/api/v1/cities/{id}` | `GetCityByIdQuery` | —; — | `CityDto` | Anonymous | 200 | PublicReads | Part 06 |
| GET `/api/v1/cities/{cityId}/areas` | `GetAreasByCityQuery` | —; `GetAreasByCityParameters` | `PaginationResult<AreaListDto>` | Anonymous | 200 | PublicReads | Part 06 |
| GET `/api/v1/areas` | `GetAreasQuery` | —; `GetAreasParameters` | `PaginationResult<AreaListDto>` | Anonymous | 200 | PublicReads | Part 06 |
| GET `/api/v1/areas/{id}` | `GetAreaByIdQuery` | —; — | `AreaDto` | Anonymous | 200 | PublicReads | Part 06 |
| POST `/api/v1/admin/cities` | `CreateCityCommand` | `CityInput`; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 08 |
| PATCH `/api/v1/admin/cities/{id}` | `UpdateCityCommand` | `CityInput`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| DELETE `/api/v1/admin/cities/{id}` | `DeleteCityCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| POST `/api/v1/admin/areas` | `CreateAreaCommand` | `AreaInput`; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 08 |
| PATCH `/api/v1/admin/areas/{id}` | `UpdateAreaCommand` | `AreaInput`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| DELETE `/api/v1/admin/areas/{id}` | `DeleteAreaCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| PUT `/api/v1/admin/areas/{id}/amenities` | `ReplaceAreaAmenitiesCommand` | `ReplaceAreaAmenitiesRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| GET `/api/v1/projects` | `GetProjectsQuery` | —; `GetProjectsParameters` | `PaginationResult<ProjectListDto>` | Anonymous | 200 | PublicReads | Part 06 |
| GET `/api/v1/projects/{id}` | `GetProjectByIdQuery` | —; — | `ProjectDto` | Anonymous | 200 | PublicReads | Part 06 |
| GET `/api/v1/projects/{projectId}/units` | `GetUnitsByProjectQuery` | —; `GetUnitsByProjectParameters` | `PaginationResult<UnitListDto>` | Anonymous | 200 | PublicReads | Part 06 |
| GET `/api/v1/projects/{projectId}/time-plan` | `GetProjectTimePlanQuery` | —; — | `TimePlanDto` | MemberOnly | 200 | PublicReads | Part 07 |
| POST `/api/v1/admin/projects` | `CreateProjectCommand` | `ProjectInput`; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 08 |
| PATCH `/api/v1/admin/projects/{id}` | `UpdateProjectCommand` | `ProjectInput`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| DELETE `/api/v1/admin/projects/{id}` | `DeleteProjectCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| PUT `/api/v1/admin/projects/{id}/amenities` | `ReplaceProjectAmenitiesCommand` | `ReplaceProjectAmenitiesRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| POST `/api/v1/admin/projects/{id}/images` | `AddProjectImageCommand` | `AddProjectImageRequest`; — | `Guid` | AdminOnly | 201 | FileUploads | Part 08 |
| PATCH `/api/v1/admin/projects/{id}/images/{imageId}` | `UpdateProjectImageCommand` | `UpdateProjectImageRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| DELETE `/api/v1/admin/projects/{id}/images/{imageId}` | `DeleteProjectImageCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| POST `/api/v1/admin/projects/{projectId}/units` | `CreateUnitCommand` | `UnitInput`; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 08 |
| POST `/api/v1/admin/projects/{projectId}/time-plan` | `CreateTimePlanCommand` | `CreateTimePlanRequest`; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 10 |
| GET `/api/v1/units/{id}` | `GetUnitByIdQuery` | —; `GetUnitByIdParameters` | `UnitDto` | Anonymous | 200 | PublicReads | Part 06 |
| PATCH `/api/v1/admin/units/{id}` | `UpdateUnitCommand` | `UnitInput`; `UpdateUnitParameters` | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| DELETE `/api/v1/admin/units/{id}` | `DeleteUnitCommand` | —; `DeleteUnitParameters` | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| PUT `/api/v1/admin/units/{id}/amenities` | `ReplaceUnitAmenitiesCommand` | `ReplaceUnitAmenitiesRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| POST `/api/v1/admin/units/{id}/images` | `AddUnitImageCommand` | `AddUnitImageRequest`; — | `Guid` | AdminOnly | 201 | FileUploads | Part 08 |
| PATCH `/api/v1/admin/units/{id}/images/{imageId}` | `UpdateUnitImageCommand` | `UpdateUnitImageRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| DELETE `/api/v1/admin/units/{id}/images/{imageId}` | `DeleteUnitImageCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 08 |
| POST `/api/v1/reservations` | `CreateReservationCommand` | `CreateReservationRequest`; — | `Guid` | CustomerOnly | 201 | ReservationWrites | Part 07 |
| GET `/api/v1/reservations/me` | `GetMyReservationsQuery` | —; `GetMyReservationsParameters` | `PaginationResult<ReservationDto>` | CustomerOnly | 200 | PublicReads | Part 07 |
| GET `/api/v1/reservations/{id}` | `GetReservationByIdQuery` | —; — | `ReservationDto` | CustomerOnly | 200 | PublicReads | Part 07 |
| POST `/api/v1/reservations/{id}/cancel` | `CancelReservationCommand` | —; — | `Guid` | CustomerOnly | 200 | ReservationWrites | Part 07 |
| GET `/api/v1/admin/reservations` | `GetReservationsQuery` | —; `GetReservationsParameters` | `PaginationResult<ReservationDto>` | AdminOnly | 200 | PublicReads | Part 09 |
| GET `/api/v1/admin/reservations/{id}` | `GetReservationDetailsQuery` | —; — | `ReservationDto` | AdminOnly | 200 | PublicReads | Part 09 |
| POST `/api/v1/admin/reservations/{reservationId}/order` | `CreateOrderFromReservationCommand` | —; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 09 |
| GET `/api/v1/orders/me` | `GetMyOrdersQuery` | —; `GetMyOrdersParameters` | `PaginationResult<OrderDto>` | CustomerOnly | 200 | PublicReads | Part 07 |
| GET `/api/v1/admin/orders` | `GetOrdersQuery` | —; `GetOrdersParameters` | `PaginationResult<OrderDto>` | AdminOnly | 200 | PublicReads | Part 09 |
| GET `/api/v1/admin/orders/{id}` | `GetOrderByIdQuery` | —; — | `OrderDto` | MemberOnly | 200 | PublicReads | Part 09 |
| POST `/api/v1/admin/orders/{id}/complete` | `CompleteInitiativeOrderCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 09 |
| PATCH `/api/v1/admin/time-plans/{id}` | `UpdateTimePlanCommand` | `TimePlanInput`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| DELETE `/api/v1/admin/time-plans/{id}` | `DeleteTimePlanCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| POST `/api/v1/admin/time-plans/{timePlanId}/stages` | `AddTimePlanStageCommand` | `StageDraftInput`; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 10 |
| POST `/api/v1/admin/time-plans/{timePlanId}/stages/from-template` | `AddStageFromTemplateCommand` | `StageDraftInput`; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 10 |
| PATCH `/api/v1/admin/time-plans/{timePlanId}/stages/{id}` | `UpdateTimePlanStageCommand` | `TimePlanInput`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| DELETE `/api/v1/admin/time-plans/{timePlanId}/stages/{id}` | `DeleteTimePlanStageCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| PUT `/api/v1/admin/time-plans/{timePlanId}/stages/order` | `ReorderTimePlanStagesCommand` | `ReorderTimePlanStagesRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| POST `/api/v1/admin/time-plan-stages/{stageId}/items` | `AddPlanStageItemCommand` | `PlanStageItemInput`; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 10 |
| PATCH `/api/v1/admin/time-plan-stages/{stageId}/items/{id}` | `UpdatePlanStageItemCommand` | `PlanStageItemInput`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| DELETE `/api/v1/admin/time-plan-stages/{stageId}/items/{id}` | `DeletePlanStageItemCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| POST `/api/v1/admin/time-plan-stages/{stageId}/items/{id}/status` | `ChangePlanStageItemStatusCommand` | `ChangePlanStageItemStatusRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| PUT `/api/v1/admin/time-plan-stages/{stageId}/items/order` | `ReorderPlanStageItemsCommand` | `ReorderPlanStageItemsRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| POST `/api/v1/admin/time-plan-items/{itemId}/images` | `AddStageItemImageCommand` | `AddStageItemImageRequest`; — | `Guid` | AdminOnly | 201 | FileUploads | Part 10 |
| PATCH `/api/v1/admin/time-plan-items/{itemId}/images/{imageId}` | `UpdateStageItemImageCommand` | `UpdateStageItemImageRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| DELETE `/api/v1/admin/time-plan-items/{itemId}/images/{imageId}` | `DeleteStageItemImageCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| PUT `/api/v1/admin/time-plan-items/{itemId}/images/order` | `ReorderStageItemImagesCommand` | `ReorderStageItemImagesRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| GET `/api/v1/admin/stage-templates` | `GetStageTemplatesQuery` | —; `GetStageTemplatesParameters` | `PaginationResult<StageTemplateListDto>` | AdminOnly | 200 | PublicReads | Part 10 |
| GET `/api/v1/admin/stage-templates/{id}` | `GetStageTemplateByIdQuery` | —; — | `StageTemplateDto` | AdminOnly | 200 | PublicReads | Part 10 |
| POST `/api/v1/admin/stage-templates` | `CreateStageTemplateCommand` | `StageTemplateInput`; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 10 |
| PATCH `/api/v1/admin/stage-templates/{id}` | `UpdateStageTemplateCommand` | `StageTemplateInput`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| PUT `/api/v1/admin/stage-templates/{id}/active` | `SetStageTemplateActiveCommand` | `SetStageTemplateActiveRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| DELETE `/api/v1/admin/stage-templates/{id}` | `DeleteStageTemplateCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| PUT `/api/v1/admin/stage-templates/{id}/items` | `SetStageTemplateItemsCommand` | `SetStageTemplateItemsRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| GET `/api/v1/admin/item-templates` | `GetItemTemplatesQuery` | —; `GetItemTemplatesParameters` | `PaginationResult<ItemTemplateListDto>` | AdminOnly | 200 | PublicReads | Part 10 |
| GET `/api/v1/admin/item-templates/{id}` | `GetItemTemplateByIdQuery` | —; — | `ItemTemplateDto` | AdminOnly | 200 | PublicReads | Part 10 |
| POST `/api/v1/admin/item-templates` | `CreateItemTemplateCommand` | `ItemTemplateInput`; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 10 |
| PATCH `/api/v1/admin/item-templates/{id}` | `UpdateItemTemplateCommand` | `ItemTemplateInput`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| PUT `/api/v1/admin/item-templates/{id}/active` | `SetItemTemplateActiveCommand` | `SetItemTemplateActiveRequest`; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| DELETE `/api/v1/admin/item-templates/{id}` | `DeleteItemTemplateCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 10 |
| GET `/api/v1/terms-and-conditions/current` | `GetActiveTermsAndConditionsQuery` | —; — | `TermsDto` | Anonymous | 200 | PublicReads | Part 06 |
| GET `/api/v1/admin/terms-and-conditions` | `GetTermsAndConditionsVersionsQuery` | —; `GetTermsAndConditionsVersionsParameters` | `PaginationResult<TermsListDto>` | AdminOnly | 200 | PublicReads | Part 11 |
| GET `/api/v1/admin/terms-and-conditions/{id}` | `GetTermsAndConditionsByIdQuery` | —; — | `TermsDto` | AdminOnly | 200 | PublicReads | Part 11 |
| POST `/api/v1/admin/terms-and-conditions` | `CreateTermsAndConditionsVersionCommand` | `CreateTermsVersionInput`; — | `Guid` | AdminOnly | 201 | AdminWrites | Part 11 |
| POST `/api/v1/admin/terms-and-conditions/{id}/activate` | `ActivateTermsAndConditionsCommand` | —; — | `Guid` | AdminOnly | 200 | AdminWrites | Part 11 |
| GET `/api/v1/admin/activity-logs` | `GetActivityLogsQuery` | —; `GetActivityLogsParameters` | `PaginationResult<ActivityLogDto>` | AdminOnly | 200 | PublicReads | Part 11 |
| GET `/api/v1/admin/activity-logs/{id}` | `GetActivityLogByIdQuery` | —; — | `ActivityLogDto` | AdminOnly | 200 | PublicReads | Part 11 |

The MemberOnly admin-order GET is also used by the customer order-detail page in Part 07. The public project-time-plan GET is shared with Part 10 admin editing. Supporting CSRF is implemented in Part 03; health and development documentation are operational endpoints, not customer screens.

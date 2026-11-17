# Final API/UI source coverage

The verified inventory contains 104 operations. 103 have implemented feature consumers; the project lookup has a generated, service-tested client and an explicit UI exclusion required by the approved project-details redesign. CSRF is separately exercised through API.tsx. These are source references, not live-backend verification.

| Operation | Policy | Screen/action | Implemented source consumers |
|---|---|---|---|
| POST /api/v1/auth/customers/register | Anonymous | Customer authentication and session lifecycle / RegisterCustomer | src/Services/session.ts:16 |
| POST /api/v1/auth/customers/login | Anonymous | Customer authentication and session lifecycle / LoginCustomer | src/Services/session.ts:15 |
| POST /api/v1/auth/customers/refresh | Anonymous | Customer authentication and session lifecycle / RefreshCustomerSession | src/Services/session.ts:18 |
| POST /api/v1/auth/customers/logout | Anonymous | Customer authentication and session lifecycle / LogoutCustomer | src/Services/session.ts:19 |
| POST /api/v1/auth/users/login | Anonymous | Staff authentication and session lifecycle / LoginUser | src/Services/session.ts:17 |
| POST /api/v1/auth/users/refresh | Anonymous | Staff authentication and session lifecycle / RefreshUserSession | src/Services/session.ts:18 |
| POST /api/v1/auth/users/logout | Anonymous | Staff authentication and session lifecycle / LogoutUser | src/Services/session.ts:19 |
| GET /api/v1/customers/me | CustomerOnly | Customer account / profile and password / GetCurrentCustomer | src/Context/AccountDataProvider.tsx:37<br>src/Services/session.ts:13 |
| PATCH /api/v1/customers/me | CustomerOnly | Customer account / profile and password / UpdateCustomerProfile | src/Context/CustomerActionProvider.tsx:49 |
| POST /api/v1/customers/me/change-password | CustomerOnly | Customer account / profile and password / ChangeCustomerPassword | src/Context/CustomerActionProvider.tsx:53 |
| GET /api/v1/users/me | StaffOnly | Admin / staff profile and password / GetCurrentUser | src/Context/StaffAccountProvider.tsx:11<br>src/Services/session.ts:14 |
| POST /api/v1/users/me/change-password | StaffOnly | Admin / staff profile and password / ChangeUserPassword | src/Context/StaffAccountProvider.tsx:23 |
| GET /api/v1/admin/users | SuperAdminOnly | Admin / users / GetUsers | src/Context/StaffAdminProvider.tsx:34 |
| GET /api/v1/admin/users/{id} | SuperAdminOnly | Admin / users / GetUserById | src/Context/StaffAdminProvider.tsx:41<br>src/Context/StaffAdminProvider.tsx:72 |
| POST /api/v1/admin/users | SuperAdminOnly | Admin / users / CreateUser | src/Context/StaffAdminProvider.tsx:62 |
| PATCH /api/v1/admin/users/{id} | SuperAdminOnly | Admin / users / UpdateUser | src/Context/StaffAdminProvider.tsx:66 |
| DELETE /api/v1/admin/users/{id} | SuperAdminOnly | Admin / users / SoftDeleteUser | src/Context/StaffAdminProvider.tsx:68 |
| POST /api/v1/admin/users/{id}/restore | SuperAdminOnly | Admin / users / RestoreUser | src/Context/StaffAdminProvider.tsx:68 |
| GET /api/v1/admin/customers | AdminOnly | Admin / customers / GetCustomers | src/Context/CustomerOperationsProvider.tsx:28 |
| GET /api/v1/admin/customers/{id} | AdminOnly | Admin / customers / GetCustomerById | src/Context/CustomerOperationsProvider.tsx:24<br>src/Context/CustomerOperationsProvider.tsx:47 |
| DELETE /api/v1/admin/customers/{id} | AdminOnly | Admin / customers / SoftDeleteCustomer | src/Context/CustomerOperationsProvider.tsx:59 |
| POST /api/v1/admin/customers/{id}/restore | AdminOnly | Admin / customers / RestoreCustomer | src/Context/CustomerOperationsProvider.tsx:60 |
| GET /api/v1/cities | Anonymous | Website / cities; shared Admin catalogue reads / GetCities | src/Context/CatalogueListProvider.tsx:36<br>src/Features/Areas/CitySelector.tsx:42<br>src/Features/Cities/CityPage.tsx:42<br>src/Features/Cities/CityPage.tsx:58<br>src/Features/Cities/List.tsx:42 |
| GET /api/v1/cities/{id} | Anonymous | Website / cities; shared Admin catalogue reads / GetCityById | src/Context/CatalogueDetailProvider.tsx:31<br>src/Features/Areas/CitySelector.tsx:48<br>src/Features/Cities/CityForm.tsx:60<br>src/Features/Cities/useRecord.ts:26<br>src/Hooks/useLocationLookup.ts:15 |
| GET /api/v1/cities/{cityId}/areas | Anonymous | Website / areas; shared Admin catalogue reads / GetAreasByCity | src/Context/CatalogueListProvider.tsx:43 |
| GET /api/v1/areas | Anonymous | Website / areas; shared Admin catalogue reads / GetAreas | src/Context/CatalogueListProvider.tsx:44<br>src/Features/Areas/AreaPage.tsx:43<br>src/Features/Areas/AreaPage.tsx:59<br>src/Features/Areas/List.tsx:43<br>src/Features/Projects/AreaSelector.tsx:42 |
| GET /api/v1/areas/{id} | Anonymous | Website / areas; shared Admin catalogue reads / GetAreaById | src/Context/CatalogueDetailProvider.tsx:33<br>src/Features/Areas/AreaForm.tsx:61<br>src/Features/Areas/useRecord.ts:26<br>src/Features/Projects/AreaSelector.tsx:48<br>src/Hooks/useLocationLookup.ts:16 |
| POST /api/v1/admin/cities | AdminOnly | Admin / cities and media / CreateCity | src/Features/Cities/CityForm.tsx:53 |
| PATCH /api/v1/admin/cities/{id} | AdminOnly | Admin / cities and media / UpdateCity | src/Features/Cities/CityForm.tsx:52 |
| DELETE /api/v1/admin/cities/{id} | AdminOnly | Admin / cities and media / DeleteCity | src/Features/Cities/CityPage.tsx:38 |
| POST /api/v1/admin/areas | AdminOnly | Admin / areas and media / CreateArea | src/Features/Areas/AreaForm.tsx:54 |
| PATCH /api/v1/admin/areas/{id} | AdminOnly | Admin / areas and media / UpdateArea | src/Features/Areas/AreaForm.tsx:53 |
| DELETE /api/v1/admin/areas/{id} | AdminOnly | Admin / areas and media / DeleteArea | src/Features/Areas/AreaPage.tsx:39 |
| PUT /api/v1/admin/areas/{id}/amenities | AdminOnly | Admin / areas and media / ReplaceAreaAmenities | src/Features/Areas/Amenities.tsx:37 |
| GET /api/v1/projects | Anonymous | Website / projects; shared Admin catalogue reads / GetProjects | src/Context/CatalogueListProvider.tsx:48<br>src/Context/HomeProvider.tsx:13<br>src/Features/Planning/SourcePicker.tsx:52<br>src/Features/Projects/List.tsx:43<br>src/Features/Projects/ProjectPage.tsx:45<br>src/Features/Projects/ProjectPage.tsx:61<br>src/Features/Units/ProjectSelector.tsx:42 |
| GET /api/v1/projects/{id} | Anonymous | Website / projects; shared Admin catalogue reads / GetProjectById | src/Context/CatalogueDetailProvider.tsx:35<br>src/Features/Planning/Plans/TimePlanProvider.tsx:28<br>src/Features/Projects/ProjectForm.tsx:67<br>src/Features/Projects/useRecord.ts:26<br>src/Features/Units/ProjectSelector.tsx:48<br>src/Features/Units/UnitForm.tsx:37 |
| GET /api/v1/projects/{projectId}/units | Anonymous | Website / units; shared Admin catalogue reads / GetUnitsByProject | src/Components/Catalogue/UnitCarousel.tsx:40<br>src/Context/CatalogueListProvider.tsx:50<br>src/Features/Units/List.tsx:44<br>src/Features/Units/UnitPage.tsx:45<br>src/Features/Units/UnitPage.tsx:61 |
| GET /api/v1/projects/{projectId}/time-plan | Anonymous | Website / project schedule; Admin time plans / GetProjectTimePlan | src/Components/Catalogue/ProjectTimePlan.tsx:95<br>src/Context/AccountDataProvider.tsx:47<br>src/Features/Planning/Plans/TimePlanProvider.tsx:39 |
| POST /api/v1/admin/projects | AdminOnly | Admin / projects and media / CreateProject | src/Features/Projects/ProjectForm.tsx:60 |
| PATCH /api/v1/admin/projects/{id} | AdminOnly | Admin / projects and media / UpdateProject | src/Features/Projects/ProjectForm.tsx:59 |
| DELETE /api/v1/admin/projects/{id} | AdminOnly | Admin / projects and media / DeleteProject | src/Features/Projects/ProjectPage.tsx:41 |
| PUT /api/v1/admin/projects/{id}/amenities | AdminOnly | Admin / projects and media / ReplaceProjectAmenities | src/Features/Projects/Amenities.tsx:37 |
| POST /api/v1/admin/projects/{id}/images | AdminOnly | Admin / projects and media / AddProjectImage | src/Features/Projects/Images.tsx:129 |
| PATCH /api/v1/admin/projects/{id}/images/{imageId} | AdminOnly | Admin / projects and media / UpdateProjectImage | src/Features/Projects/Images.tsx:52 |
| DELETE /api/v1/admin/projects/{id}/images/{imageId} | AdminOnly | Admin / projects and media / DeleteProjectImage | src/Features/Projects/Images.tsx:62 |
| POST /api/v1/admin/projects/{projectId}/units | AdminOnly | Admin / units and media / CreateUnit | src/Features/Units/UnitForm.tsx:63 |
| POST /api/v1/admin/projects/{projectId}/time-plan | AdminOnly | Admin / time plans, stages, items and images / CreateTimePlan | src/Features/Planning/Plans/commands.ts:36 |
| GET /api/v1/units/{id} | Anonymous | Website / units; shared Admin catalogue reads / GetUnitById | src/Context/CatalogueDetailProvider.tsx:37<br>src/Features/Units/UnitForm.tsx:70<br>src/Features/Units/useRecord.ts:26 |
| PATCH /api/v1/admin/units/{id} | AdminOnly | Admin / units and media / UpdateUnit | src/Features/Units/UnitForm.tsx:62 |
| DELETE /api/v1/admin/units/{id} | AdminOnly | Admin / units and media / DeleteUnit | src/Features/Units/UnitPage.tsx:41 |
| PUT /api/v1/admin/units/{id}/amenities | AdminOnly | Admin / units and media / ReplaceUnitAmenities | src/Features/Units/Amenities.tsx:37 |
| POST /api/v1/admin/units/{id}/images | AdminOnly | Admin / units and media / AddUnitImage | src/Features/Units/Images.tsx:129 |
| PATCH /api/v1/admin/units/{id}/images/{imageId} | AdminOnly | Admin / units and media / UpdateUnitImage | src/Features/Units/Images.tsx:52 |
| DELETE /api/v1/admin/units/{id}/images/{imageId} | AdminOnly | Admin / units and media / DeleteUnitImage | src/Features/Units/Images.tsx:62 |
| POST /api/v1/reservations | CustomerOnly | Customer account / reservations / CreateReservation | src/Context/CustomerActionProvider.tsx:54<br>src/Hooks/useReservationBooking.ts:95 |
| GET /api/v1/reservations/me | CustomerOnly | Customer account / reservations / GetMyReservations | src/Context/AccountDataProvider.tsx:43 |
| GET /api/v1/reservations/{id} | CustomerOnly | Customer account / reservations / GetReservationById | src/Context/AccountDataProvider.tsx:44 |
| POST /api/v1/reservations/{id}/cancel | CustomerOnly | Customer account / reservations / CancelReservation | src/Context/CustomerActionProvider.tsx:55 |
| GET /api/v1/admin/reservations | AdminOnly | Admin / reservations / GetReservations | src/Context/ReservationsAdminProvider.tsx:29 |
| GET /api/v1/admin/reservations/{id} | AdminOnly | Admin / reservations / GetReservationDetails | src/Context/ReservationsAdminProvider.tsx:27<br>src/Context/ReservationsAdminProvider.tsx:47 |
| POST /api/v1/admin/reservations/{reservationId}/order | AdminOnly | Admin / orders / CreateOrderFromReservation | src/Context/ReservationsAdminProvider.tsx:78 |
| GET /api/v1/orders/me | CustomerOnly | Customer account / orders / GetMyOrders | src/Context/AccountDataProvider.tsx:45 |
| GET /api/v1/admin/orders | AdminOnly | Admin / orders / GetOrders | src/Context/OrdersAdminProvider.tsx:28 |
| GET /api/v1/admin/orders/{id} | MemberOnly | Customer account / order detail; Admin / order detail / GetOrderById | src/Context/AccountDataProvider.tsx:46<br>src/Context/OrdersAdminProvider.tsx:26<br>src/Context/OrdersAdminProvider.tsx:41<br>src/Context/ReservationsAdminProvider.tsx:60 |
| POST /api/v1/admin/orders/{id}/complete | AdminOnly | Admin / orders / CompleteInitiativeOrder | src/Context/OrdersAdminProvider.tsx:58 |
| PATCH /api/v1/admin/time-plans/{id} | AdminOnly | Admin / time plans, stages, items and images / UpdateTimePlan | src/Features/Planning/Plans/commands.ts:54 |
| DELETE /api/v1/admin/time-plans/{id} | AdminOnly | Admin / time plans, stages, items and images / DeleteTimePlan | src/Features/Planning/Plans/commands.ts:56 |
| POST /api/v1/admin/time-plans/{timePlanId}/stages | AdminOnly | Admin / time plans, stages, items and images / AddTimePlanStage | src/Features/Planning/Plans/commands.ts:61 |
| POST /api/v1/admin/time-plans/{timePlanId}/stages/from-template | AdminOnly | Admin / time plans, stages, items and images / AddStageFromTemplate | src/Features/Planning/Plans/commands.ts:60 |
| PATCH /api/v1/admin/time-plans/{timePlanId}/stages/{id} | AdminOnly | Admin / time plans, stages, items and images / UpdateTimePlanStage | src/Features/Planning/Plans/commands.ts:64 |
| DELETE /api/v1/admin/time-plans/{timePlanId}/stages/{id} | AdminOnly | Admin / time plans, stages, items and images / DeleteTimePlanStage | src/Features/Planning/Plans/commands.ts:66 |
| PUT /api/v1/admin/time-plans/{timePlanId}/stages/order | AdminOnly | Admin / time plans, stages, items and images / ReorderTimePlanStages | src/Features/Planning/Plans/commands.ts:69 |
| POST /api/v1/admin/time-plan-stages/{stageId}/items | AdminOnly | Admin / time plans, stages, items and images / AddPlanStageItem | src/Features/Planning/Plans/commands.ts:71 |
| PATCH /api/v1/admin/time-plan-stages/{stageId}/items/{id} | AdminOnly | Admin / time plans, stages, items and images / UpdatePlanStageItem | src/Features/Planning/Plans/commands.ts:73 |
| DELETE /api/v1/admin/time-plan-stages/{stageId}/items/{id} | AdminOnly | Admin / time plans, stages, items and images / DeletePlanStageItem | src/Features/Planning/Plans/commands.ts:75 |
| POST /api/v1/admin/time-plan-stages/{stageId}/items/{id}/status | AdminOnly | Admin / time plans, stages, items and images / ChangePlanStageItemStatus | src/Features/Planning/Plans/commands.ts:77 |
| PUT /api/v1/admin/time-plan-stages/{stageId}/items/order | AdminOnly | Admin / time plans, stages, items and images / ReorderPlanStageItems | src/Features/Planning/Plans/commands.ts:83 |
| POST /api/v1/admin/time-plan-items/{itemId}/images | AdminOnly | Admin / time plans, stages, items and images / AddStageItemImage | src/Features/Planning/Plans/commands.ts:85 |
| PATCH /api/v1/admin/time-plan-items/{itemId}/images/{imageId} | AdminOnly | Admin / time plans, stages, items and images / UpdateStageItemImage | src/Features/Planning/Plans/commands.ts:87 |
| DELETE /api/v1/admin/time-plan-items/{itemId}/images/{imageId} | AdminOnly | Admin / time plans, stages, items and images / DeleteStageItemImage | src/Features/Planning/Plans/commands.ts:89 |
| PUT /api/v1/admin/time-plan-items/{itemId}/images/order | AdminOnly | Admin / time plans, stages, items and images / ReorderStageItemImages | src/Features/Planning/Plans/commands.ts:92 |
| GET /api/v1/admin/stage-templates | AdminOnly | Admin / stage templates / GetStageTemplates | src/Features/Planning/SourcePicker.tsx:55<br>src/Features/Planning/Templates/TemplatesProvider.tsx:56 |
| GET /api/v1/admin/stage-templates/{id} | AdminOnly | Admin / stage templates / GetStageTemplateById | src/Features/Planning/Stages/StageComposer.tsx:27<br>src/Features/Planning/Templates/TemplatesProvider.tsx:70<br>src/Features/Planning/Templates/TemplatesProvider.tsx:106 |
| POST /api/v1/admin/stage-templates | AdminOnly | Admin / stage templates / CreateStageTemplate | src/Features/Planning/Templates/commands.ts:18 |
| PATCH /api/v1/admin/stage-templates/{id} | AdminOnly | Admin / stage templates / UpdateStageTemplate | src/Features/Planning/Templates/commands.ts:24 |
| PUT /api/v1/admin/stage-templates/{id}/active | AdminOnly | Admin / stage templates / SetStageTemplateActive | src/Features/Planning/Templates/commands.ts:37 |
| DELETE /api/v1/admin/stage-templates/{id} | AdminOnly | Admin / stage templates / DeleteStageTemplate | src/Features/Planning/Templates/commands.ts:32 |
| PUT /api/v1/admin/stage-templates/{id}/items | AdminOnly | Admin / stage templates / SetStageTemplateItems | src/Features/Planning/Templates/commands.ts:51 |
| GET /api/v1/admin/item-templates | AdminOnly | Admin / item templates / GetItemTemplates | src/Features/Planning/SourcePicker.tsx:55<br>src/Features/Planning/Templates/TemplatesProvider.tsx:57 |
| GET /api/v1/admin/item-templates/{id} | AdminOnly | Admin / item templates / GetItemTemplateById | src/Features/Planning/Templates/TemplatesProvider.tsx:71<br>src/Features/Planning/Templates/TemplatesProvider.tsx:108 |
| POST /api/v1/admin/item-templates | AdminOnly | Admin / item templates / CreateItemTemplate | src/Features/Planning/Templates/commands.ts:18 |
| PATCH /api/v1/admin/item-templates/{id} | AdminOnly | Admin / item templates / UpdateItemTemplate | src/Features/Planning/Templates/commands.ts:25 |
| PUT /api/v1/admin/item-templates/{id}/active | AdminOnly | Admin / item templates / SetItemTemplateActive | src/Features/Planning/Templates/commands.ts:38 |
| DELETE /api/v1/admin/item-templates/{id} | AdminOnly | Admin / item templates / DeleteItemTemplate | src/Features/Planning/Templates/commands.ts:33 |
| GET /api/v1/terms-and-conditions/current | Anonymous | Website / current terms / GetActiveTermsAndConditions | src/Context/CatalogueDetailProvider.tsx:39<br>src/Context/HomeProvider.tsx:16 |
| GET /api/v1/terms-and-conditions | AdminOnly | Admin / terms versions and activation / GetTermsAndConditionsVersions | src/Context/TermsAdminProvider.tsx:20 |
| GET /api/v1/terms-and-conditions/{id} | AdminOnly | Admin / terms versions and activation / GetTermsAndConditionsById | src/Context/TermsAdminProvider.tsx:24<br>src/Context/TermsAdminProvider.tsx:40 |
| POST /api/v1/admin/terms-and-conditions | AdminOnly | Admin / terms versions and activation / CreateTermsAndConditionsVersion | src/Context/TermsAdminProvider.tsx:38 |
| POST /api/v1/admin/terms-and-conditions/{id}/activate | AdminOnly | Admin / terms versions and activation / ActivateTermsAndConditions | src/Context/TermsAdminProvider.tsx:53 |
| GET /api/v1/admin/activity-logs | AdminOnly | Admin / staff activity log / GetActivityLogs | src/Context/ActivityLogsProvider.tsx:19 |
| GET /api/v1/admin/activity-logs/{id} | AdminOnly | Admin / staff activity log / GetActivityLogById | src/Context/ActivityLogsProvider.tsx:27 |
| GET /api/v1/cities/lookup | Anonymous | Website / cities; shared Admin catalogue reads / GetCitiesLookup | src/Services/LocationLookups.ts:8 |
| GET /api/v1/areas/lookup | Anonymous | Website / areas; shared Admin catalogue reads / GetAreasLookup | src/Services/LocationLookups.ts:13 |
| GET /api/v1/projects/lookup | Anonymous | Website / projects; shared Admin catalogue reads / GetProjectsLookup | Generated and service-tested; project-lookup UI is outside the approved redesign scope (docs/project-details-redesign-plan.md). |

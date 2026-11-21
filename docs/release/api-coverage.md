# Final API/UI source coverage

The verified inventory contains 107 operations. 104 have implemented feature consumers. Explicit UI exclusions cover project lookup and contact submissions. CSRF is separately exercised through API.tsx. These are source references, not live-backend verification.

| Operation | Policy | Screen/action | Implemented source consumers |
|---|---|---|---|
| POST /api/v1/contact-submissions | Anonymous | Website / contact submission / SubmitContactSubmission | Generated and service-tested; contact submissions UI is deferred (docs/contracts/unit-payment-plans.md). |
| GET /api/v1/admin/contact-submissions | AdminOnly | Admin / contact submissions / GetContactSubmissions | Generated and service-tested; contact submissions UI is deferred (docs/contracts/unit-payment-plans.md). |
| POST /api/v1/auth/customers/register | Anonymous | Customer authentication and session lifecycle / RegisterCustomer | src/Services/session.ts:16 |
| POST /api/v1/auth/customers/login | Anonymous | Customer authentication and session lifecycle / LoginCustomer | src/Services/session.ts:15 |
| POST /api/v1/auth/customers/refresh | Anonymous | Customer authentication and session lifecycle / RefreshCustomerSession | src/Services/session.ts:18 |
| POST /api/v1/auth/customers/logout | Anonymous | Customer authentication and session lifecycle / LogoutCustomer | src/Services/session.ts:19 |
| POST /api/v1/auth/users/login | Anonymous | Staff authentication and session lifecycle / LoginUser | src/Services/session.ts:17 |
| POST /api/v1/auth/users/refresh | Anonymous | Staff authentication and session lifecycle / RefreshUserSession | src/Services/session.ts:18 |
| POST /api/v1/auth/users/logout | Anonymous | Staff authentication and session lifecycle / LogoutUser | src/Services/session.ts:19 |
| GET /api/v1/customers/me | CustomerOnly | Customer account / profile and password / GetCurrentCustomer | src/Features/Profile/Customer/DataProvider.tsx:17<br>src/Services/session.ts:13 |
| PATCH /api/v1/customers/me | CustomerOnly | Customer account / profile and password / UpdateCustomerProfile | src/Features/Profile/Customer/ActionProvider.tsx:64 |
| POST /api/v1/customers/me/change-password | CustomerOnly | Customer account / profile and password / ChangeCustomerPassword | src/Features/Profile/Customer/ActionProvider.tsx:80 |
| GET /api/v1/users/me | StaffOnly | Admin / staff profile and password / GetCurrentUser | src/Features/Profile/Staff/StaffAccountProvider.tsx:11<br>src/Services/session.ts:14 |
| POST /api/v1/users/me/change-password | StaffOnly | Admin / staff profile and password / ChangeUserPassword | src/Features/Profile/Staff/StaffAccountProvider.tsx:24 |
| GET /api/v1/admin/users | SuperAdminOnly | Admin / users / GetUsers | src/Features/Staff/Admin/StaffAdminProvider.tsx:38 |
| GET /api/v1/admin/users/{id} | SuperAdminOnly | Admin / users / GetUserById | src/Features/Staff/Admin/StaffAdminProvider.tsx:53<br>src/Features/Staff/Admin/StaffAdminProvider.tsx:86 |
| POST /api/v1/admin/users | SuperAdminOnly | Admin / users / CreateUser | src/Features/Staff/Admin/StaffAdminProvider.tsx:76 |
| PATCH /api/v1/admin/users/{id} | SuperAdminOnly | Admin / users / UpdateUser | src/Features/Staff/Admin/StaffAdminProvider.tsx:80 |
| DELETE /api/v1/admin/users/{id} | SuperAdminOnly | Admin / users / SoftDeleteUser | src/Features/Staff/Admin/StaffAdminProvider.tsx:82 |
| POST /api/v1/admin/users/{id}/restore | SuperAdminOnly | Admin / users / RestoreUser | src/Features/Staff/Admin/StaffAdminProvider.tsx:82 |
| GET /api/v1/admin/customers | AdminOnly | Admin / customers / GetCustomers | src/Features/Customers/Admin/CustomerOperationsProvider.tsx:28 |
| GET /api/v1/admin/customers/{id} | AdminOnly | Admin / customers / GetCustomerById | src/Features/Customers/Admin/CustomerOperationsProvider.tsx:24<br>src/Features/Customers/Admin/CustomerOperationsProvider.tsx:47 |
| DELETE /api/v1/admin/customers/{id} | AdminOnly | Admin / customers / SoftDeleteCustomer | src/Features/Customers/Admin/CustomerOperationsProvider.tsx:59 |
| POST /api/v1/admin/customers/{id}/restore | AdminOnly | Admin / customers / RestoreCustomer | src/Features/Customers/Admin/CustomerOperationsProvider.tsx:60 |
| GET /api/v1/cities | Anonymous | Website / cities; shared Admin catalogue reads / GetCities | src/Features/Areas/Admin/CitySelector.tsx:42<br>src/Features/Cities/Admin/CityPage.tsx:41<br>src/Features/Cities/Admin/CityPage.tsx:57<br>src/Features/Cities/Admin/List.tsx:41<br>src/Features/Cities/Public/ListProvider.tsx:26 |
| GET /api/v1/cities/{id} | Anonymous | Website / cities; shared Admin catalogue reads / GetCityById | src/Features/Areas/Admin/CitySelector.tsx:47<br>src/Features/Cities/Admin/CityForm.tsx:58<br>src/Features/Cities/Admin/useRecord.ts:26<br>src/Features/Cities/Public/DetailProvider.tsx:13<br>src/Hooks/useLocationLookup.ts:15 |
| GET /api/v1/cities/{cityId}/areas | Anonymous | Website / areas; shared Admin catalogue reads / GetAreasByCity | src/Features/Areas/Public/ListProvider.tsx:36 |
| GET /api/v1/areas | Anonymous | Website / areas; shared Admin catalogue reads / GetAreas | src/Features/Areas/Admin/AreaPage.tsx:42<br>src/Features/Areas/Admin/AreaPage.tsx:58<br>src/Features/Areas/Admin/List.tsx:42<br>src/Features/Areas/Public/ListProvider.tsx:37<br>src/Features/Projects/Admin/AreaSelector.tsx:42 |
| GET /api/v1/areas/{id} | Anonymous | Website / areas; shared Admin catalogue reads / GetAreaById | src/Features/Areas/Admin/AreaForm.tsx:59<br>src/Features/Areas/Admin/useRecord.ts:26<br>src/Features/Areas/Public/DetailProvider.tsx:13<br>src/Features/Projects/Admin/AreaSelector.tsx:47<br>src/Hooks/useLocationLookup.ts:16 |
| POST /api/v1/admin/cities | AdminOnly | Admin / cities and media / CreateCity | src/Features/Cities/Admin/CityForm.tsx:51 |
| PATCH /api/v1/admin/cities/{id} | AdminOnly | Admin / cities and media / UpdateCity | src/Features/Cities/Admin/CityForm.tsx:51 |
| DELETE /api/v1/admin/cities/{id} | AdminOnly | Admin / cities and media / DeleteCity | src/Features/Cities/Admin/CityPage.tsx:37 |
| POST /api/v1/admin/areas | AdminOnly | Admin / areas and media / CreateArea | src/Features/Areas/Admin/AreaForm.tsx:52 |
| PATCH /api/v1/admin/areas/{id} | AdminOnly | Admin / areas and media / UpdateArea | src/Features/Areas/Admin/AreaForm.tsx:52 |
| DELETE /api/v1/admin/areas/{id} | AdminOnly | Admin / areas and media / DeleteArea | src/Features/Areas/Admin/AreaPage.tsx:38 |
| PUT /api/v1/admin/areas/{id}/amenities | AdminOnly | Admin / areas and media / ReplaceAreaAmenities | src/Features/Areas/Admin/Amenities.tsx:38 |
| GET /api/v1/projects | Anonymous | Website / projects; shared Admin catalogue reads / GetProjects | src/Features/Home/HomeProvider.tsx:13<br>src/Features/Planning/SourcePicker.tsx:52<br>src/Features/Projects/Admin/List.tsx:42<br>src/Features/Projects/Admin/ProjectPage.tsx:44<br>src/Features/Projects/Admin/ProjectPage.tsx:60<br>src/Features/Projects/Public/ListProvider.tsx:28<br>src/Features/Units/Admin/ProjectSelector.tsx:45 |
| GET /api/v1/projects/{id} | Anonymous | Website / projects; shared Admin catalogue reads / GetProjectById | src/Features/Planning/Plans/TimePlanProvider.tsx:28<br>src/Features/Projects/Admin/ProjectForm.tsx:65<br>src/Features/Projects/Admin/useRecord.ts:26<br>src/Features/Projects/Public/DetailProvider.tsx:13<br>src/Features/Units/Admin/useUnitProject.ts:6 |
| GET /api/v1/projects/{projectId}/units | Anonymous | Website / units; shared Admin catalogue reads / GetUnitsByProject | src/Features/Units/Admin/List.tsx:43<br>src/Features/Units/Admin/UnitPage.tsx:50<br>src/Features/Units/Admin/UnitPage.tsx:66<br>src/Features/Units/Public/UnitCarousel.tsx:40 |
| GET /api/v1/projects/{projectId}/time-plan | Anonymous | Website / project schedule; Admin time plans / GetProjectTimePlan | src/Features/Planning/Plans/TimePlanProvider.tsx:39<br>src/Features/Planning/Public/useTimePlan.ts:14 |
| POST /api/v1/admin/projects | AdminOnly | Admin / projects and media / CreateProject | src/Features/Projects/Admin/ProjectForm.tsx:58 |
| PATCH /api/v1/admin/projects/{id} | AdminOnly | Admin / projects and media / UpdateProject | src/Features/Projects/Admin/ProjectForm.tsx:58 |
| DELETE /api/v1/admin/projects/{id} | AdminOnly | Admin / projects and media / DeleteProject | src/Features/Projects/Admin/ProjectPage.tsx:40 |
| PUT /api/v1/admin/projects/{id}/amenities | AdminOnly | Admin / projects and media / ReplaceProjectAmenities | src/Features/Projects/Admin/Amenities.tsx:38 |
| POST /api/v1/admin/projects/{id}/images | AdminOnly | Admin / projects and media / AddProjectImage | src/Features/Projects/Admin/Images.tsx:129 |
| PATCH /api/v1/admin/projects/{id}/images/{imageId} | AdminOnly | Admin / projects and media / UpdateProjectImage | src/Features/Projects/Admin/Images.tsx:52 |
| DELETE /api/v1/admin/projects/{id}/images/{imageId} | AdminOnly | Admin / projects and media / DeleteProjectImage | src/Features/Projects/Admin/Images.tsx:62 |
| POST /api/v1/admin/projects/{projectId}/units | AdminOnly | Admin / units and media / CreateUnit | src/Features/Units/Admin/UnitForm.tsx:85 |
| POST /api/v1/admin/projects/{projectId}/time-plan | AdminOnly | Admin / time plans, stages, items and images / CreateTimePlan | src/Features/Planning/Plans/commands.ts:37 |
| GET /api/v1/units/{id} | Anonymous | Website / units; shared Admin catalogue reads / GetUnitById | src/Features/Units/Admin/UnitForm.tsx:92<br>src/Features/Units/Admin/useRecord.ts:26<br>src/Features/Units/Public/DetailProvider.tsx:13 |
| PATCH /api/v1/admin/units/{id} | AdminOnly | Admin / units and media / UpdateUnit | src/Features/Units/Admin/UnitForm.tsx:84 |
| DELETE /api/v1/admin/units/{id} | AdminOnly | Admin / units and media / DeleteUnit | src/Features/Units/Admin/UnitPage.tsx:46 |
| PUT /api/v1/admin/units/{id}/amenities | AdminOnly | Admin / units and media / ReplaceUnitAmenities | src/Features/Units/Admin/Amenities.tsx:38 |
| PUT /api/v1/admin/units/{id}/payment-plan | AdminOnly | Admin / units and media / ReplaceUnitPaymentPlan | src/Features/Units/Admin/UnitPaymentPlan.tsx:33 |
| POST /api/v1/admin/units/{id}/images | AdminOnly | Admin / units and media / AddUnitImage | src/Features/Units/Admin/Images.tsx:129 |
| PATCH /api/v1/admin/units/{id}/images/{imageId} | AdminOnly | Admin / units and media / UpdateUnitImage | src/Features/Units/Admin/Images.tsx:52 |
| DELETE /api/v1/admin/units/{id}/images/{imageId} | AdminOnly | Admin / units and media / DeleteUnitImage | src/Features/Units/Admin/Images.tsx:62 |
| POST /api/v1/reservations | CustomerOnly | Customer account / reservations / CreateReservation | src/Features/Reservations/Customer/useReservationBooking.ts:95 |
| GET /api/v1/reservations/me | CustomerOnly | Customer account / reservations / GetMyReservations | src/Features/Reservations/Customer/DataProvider.tsx:40 |
| GET /api/v1/reservations/{id} | CustomerOnly | Customer account / reservations / GetReservationById | src/Features/Reservations/Customer/DataProvider.tsx:41 |
| POST /api/v1/reservations/{id}/cancel | CustomerOnly | Customer account / reservations / CancelReservation | src/Features/Reservations/Customer/CancellationProvider.tsx:39 |
| GET /api/v1/admin/reservations | AdminOnly | Admin / reservations / GetReservations | src/Features/Reservations/Admin/ReservationsAdminProvider.tsx:29 |
| GET /api/v1/admin/reservations/{id} | AdminOnly | Admin / reservations / GetReservationDetails | src/Features/Reservations/Admin/ReservationsAdminProvider.tsx:27<br>src/Features/Reservations/Admin/ReservationsAdminProvider.tsx:47 |
| POST /api/v1/admin/reservations/{reservationId}/order | AdminOnly | Admin / orders / CreateOrderFromReservation | src/Features/Reservations/Admin/ReservationsAdminProvider.tsx:78 |
| GET /api/v1/orders/me | CustomerOnly | Customer account / orders / GetMyOrders | src/Features/Orders/Customer/DataProvider.tsx:40 |
| GET /api/v1/admin/orders | AdminOnly | Admin / orders / GetOrders | src/Features/Orders/Admin/OrdersAdminProvider.tsx:28 |
| GET /api/v1/admin/orders/{id} | MemberOnly | Customer account / order detail; Admin / order detail / GetOrderById | src/Features/Orders/Admin/OrdersAdminProvider.tsx:26<br>src/Features/Orders/Admin/OrdersAdminProvider.tsx:41<br>src/Features/Orders/Customer/DataProvider.tsx:41<br>src/Features/Reservations/Admin/ReservationsAdminProvider.tsx:60 |
| POST /api/v1/admin/orders/{id}/complete | AdminOnly | Admin / orders / CompleteInitiativeOrder | src/Features/Orders/Admin/OrdersAdminProvider.tsx:58 |
| PATCH /api/v1/admin/time-plans/{id} | AdminOnly | Admin / time plans, stages, items and images / UpdateTimePlan | src/Features/Planning/Plans/commands.ts:55 |
| DELETE /api/v1/admin/time-plans/{id} | AdminOnly | Admin / time plans, stages, items and images / DeleteTimePlan | src/Features/Planning/Plans/commands.ts:57 |
| POST /api/v1/admin/time-plans/{timePlanId}/stages | AdminOnly | Admin / time plans, stages, items and images / AddTimePlanStage | src/Features/Planning/Plans/commands.ts:64 |
| POST /api/v1/admin/time-plans/{timePlanId}/stages/from-template | AdminOnly | Admin / time plans, stages, items and images / AddStageFromTemplate | src/Features/Planning/Plans/commands.ts:62 |
| PATCH /api/v1/admin/time-plans/{timePlanId}/stages/{id} | AdminOnly | Admin / time plans, stages, items and images / UpdateTimePlanStage | src/Features/Planning/Plans/commands.ts:67 |
| DELETE /api/v1/admin/time-plans/{timePlanId}/stages/{id} | AdminOnly | Admin / time plans, stages, items and images / DeleteTimePlanStage | src/Features/Planning/Plans/commands.ts:69 |
| PUT /api/v1/admin/time-plans/{timePlanId}/stages/order | AdminOnly | Admin / time plans, stages, items and images / ReorderTimePlanStages | src/Features/Planning/Plans/commands.ts:72 |
| POST /api/v1/admin/time-plan-stages/{stageId}/items | AdminOnly | Admin / time plans, stages, items and images / AddPlanStageItem | src/Features/Planning/Plans/commands.ts:74 |
| PATCH /api/v1/admin/time-plan-stages/{stageId}/items/{id} | AdminOnly | Admin / time plans, stages, items and images / UpdatePlanStageItem | src/Features/Planning/Plans/commands.ts:76 |
| DELETE /api/v1/admin/time-plan-stages/{stageId}/items/{id} | AdminOnly | Admin / time plans, stages, items and images / DeletePlanStageItem | src/Features/Planning/Plans/commands.ts:78 |
| POST /api/v1/admin/time-plan-stages/{stageId}/items/{id}/status | AdminOnly | Admin / time plans, stages, items and images / ChangePlanStageItemStatus | src/Features/Planning/Plans/commands.ts:80 |
| PUT /api/v1/admin/time-plan-stages/{stageId}/items/order | AdminOnly | Admin / time plans, stages, items and images / ReorderPlanStageItems | src/Features/Planning/Plans/commands.ts:86 |
| POST /api/v1/admin/time-plan-items/{itemId}/images | AdminOnly | Admin / time plans, stages, items and images / AddStageItemImage | src/Features/Planning/Plans/commands.ts:88 |
| PATCH /api/v1/admin/time-plan-items/{itemId}/images/{imageId} | AdminOnly | Admin / time plans, stages, items and images / UpdateStageItemImage | src/Features/Planning/Plans/commands.ts:90 |
| DELETE /api/v1/admin/time-plan-items/{itemId}/images/{imageId} | AdminOnly | Admin / time plans, stages, items and images / DeleteStageItemImage | src/Features/Planning/Plans/commands.ts:92 |
| PUT /api/v1/admin/time-plan-items/{itemId}/images/order | AdminOnly | Admin / time plans, stages, items and images / ReorderStageItemImages | src/Features/Planning/Plans/commands.ts:95 |
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
| GET /api/v1/terms-and-conditions/current | Anonymous | Website / current terms / GetActiveTermsAndConditions | src/Features/Home/HomeProvider.tsx:16<br>src/Features/Terms/Public/TermsProvider.tsx:8 |
| GET /api/v1/terms-and-conditions | AdminOnly | Admin / terms versions and activation / GetTermsAndConditionsVersions | src/Features/Terms/Admin/TermsAdminProvider.tsx:20 |
| GET /api/v1/terms-and-conditions/{id} | AdminOnly | Admin / terms versions and activation / GetTermsAndConditionsById | src/Features/Terms/Admin/TermsAdminProvider.tsx:24<br>src/Features/Terms/Admin/TermsAdminProvider.tsx:40 |
| POST /api/v1/admin/terms-and-conditions | AdminOnly | Admin / terms versions and activation / CreateTermsAndConditionsVersion | src/Features/Terms/Admin/TermsAdminProvider.tsx:38 |
| POST /api/v1/admin/terms-and-conditions/{id}/activate | AdminOnly | Admin / terms versions and activation / ActivateTermsAndConditions | src/Features/Terms/Admin/TermsAdminProvider.tsx:53 |
| GET /api/v1/admin/activity-logs | AdminOnly | Admin / staff activity log / GetActivityLogs | src/Features/ActivityLogs/Admin/ActivityLogsProvider.tsx:20 |
| GET /api/v1/admin/activity-logs/{id} | AdminOnly | Admin / staff activity log / GetActivityLogById | src/Features/ActivityLogs/Admin/ActivityLogsProvider.tsx:37 |
| GET /api/v1/cities/lookup | Anonymous | Website / cities; shared Admin catalogue reads / GetCitiesLookup | src/Services/LocationLookups.ts:8 |
| GET /api/v1/areas/lookup | Anonymous | Website / areas; shared Admin catalogue reads / GetAreasLookup | src/Services/LocationLookups.ts:13 |
| GET /api/v1/projects/lookup | Anonymous | Website / projects; shared Admin catalogue reads / GetProjectsLookup | Generated and service-tested; project-lookup UI is outside the approved redesign scope (docs/project-details-redesign-plan.md). |

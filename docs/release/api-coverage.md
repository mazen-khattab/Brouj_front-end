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
| GET /api/v1/cities | Anonymous | Website / cities; shared Admin catalogue reads / GetCities | src/AdminCatalogue/model.ts:229<br>src/Components/AdminCatalogue/ParentSelector.tsx:41<br>src/Context/CatalogueListProvider.tsx:36<br>src/Pages/Admin/CatalogueList.tsx:47 |
| GET /api/v1/cities/{id} | Anonymous | Website / cities; shared Admin catalogue reads / GetCityById | src/AdminCatalogue/model.ts:187<br>src/Components/AdminCatalogue/ParentSelector.tsx:47<br>src/Context/CatalogueDetailProvider.tsx:19<br>src/Hooks/useLocationLookup.ts:15 |
| GET /api/v1/cities/{cityId}/areas | Anonymous | Website / areas; shared Admin catalogue reads / GetAreasByCity | src/Context/CatalogueListProvider.tsx:43 |
| GET /api/v1/areas | Anonymous | Website / areas; shared Admin catalogue reads / GetAreas | src/AdminCatalogue/model.ts:231<br>src/Components/AdminCatalogue/ParentSelector.tsx:41<br>src/Context/CatalogueListProvider.tsx:44<br>src/Pages/Admin/CatalogueList.tsx:51 |
| GET /api/v1/areas/{id} | Anonymous | Website / areas; shared Admin catalogue reads / GetAreaById | src/AdminCatalogue/model.ts:189<br>src/Components/AdminCatalogue/ParentSelector.tsx:47<br>src/Context/CatalogueDetailProvider.tsx:20<br>src/Hooks/useLocationLookup.ts:16 |
| POST /api/v1/admin/cities | AdminOnly | Admin / cities and media / CreateCity | src/AdminCatalogue/model.ts:200 |
| PATCH /api/v1/admin/cities/{id} | AdminOnly | Admin / cities and media / UpdateCity | src/AdminCatalogue/model.ts:200 |
| DELETE /api/v1/admin/cities/{id} | AdminOnly | Admin / cities and media / DeleteCity | src/AdminCatalogue/model.ts:215 |
| POST /api/v1/admin/areas | AdminOnly | Admin / areas and media / CreateArea | src/AdminCatalogue/model.ts:202 |
| PATCH /api/v1/admin/areas/{id} | AdminOnly | Admin / areas and media / UpdateArea | src/AdminCatalogue/model.ts:202 |
| DELETE /api/v1/admin/areas/{id} | AdminOnly | Admin / areas and media / DeleteArea | src/AdminCatalogue/model.ts:217 |
| PUT /api/v1/admin/areas/{id}/amenities | AdminOnly | Admin / areas and media / ReplaceAreaAmenities | src/AdminCatalogue/model.ts:240 |
| GET /api/v1/projects | Anonymous | Website / projects; shared Admin catalogue reads / GetProjects | src/AdminCatalogue/model.ts:233<br>src/Components/Planning/SourcePicker.tsx:52<br>src/Context/CatalogueListProvider.tsx:48<br>src/Context/HomeProvider.tsx:13<br>src/Pages/Admin/CatalogueList.tsx:55 |
| GET /api/v1/projects/{id} | Anonymous | Website / projects; shared Admin catalogue reads / GetProjectById | src/AdminCatalogue/model.ts:191<br>src/Context/CatalogueDetailProvider.tsx:21<br>src/Context/TimePlanProvider.tsx:27<br>src/Pages/Admin/CatalogueForm.tsx:36 |
| GET /api/v1/projects/{projectId}/units | Anonymous | Website / units; shared Admin catalogue reads / GetUnitsByProject | src/AdminCatalogue/model.ts:235<br>src/Components/Catalogue/UnitCarousel.tsx:40<br>src/Context/CatalogueListProvider.tsx:50<br>src/Pages/Admin/CatalogueList.tsx:59 |
| GET /api/v1/projects/{projectId}/time-plan | Anonymous | Website / project schedule; Admin time plans / GetProjectTimePlan | src/Components/Catalogue/ProjectTimePlan.tsx:57<br>src/Context/AccountDataProvider.tsx:47<br>src/Context/TimePlanProvider.tsx:38 |
| POST /api/v1/admin/projects | AdminOnly | Admin / projects and media / CreateProject | src/AdminCatalogue/model.ts:204 |
| PATCH /api/v1/admin/projects/{id} | AdminOnly | Admin / projects and media / UpdateProject | src/AdminCatalogue/model.ts:204 |
| DELETE /api/v1/admin/projects/{id} | AdminOnly | Admin / projects and media / DeleteProject | src/AdminCatalogue/model.ts:219 |
| PUT /api/v1/admin/projects/{id}/amenities | AdminOnly | Admin / projects and media / ReplaceProjectAmenities | src/AdminCatalogue/model.ts:240 |
| POST /api/v1/admin/projects/{id}/images | AdminOnly | Admin / projects and media / AddProjectImage | src/Pages/Admin/CatalogueImages.tsx:134 |
| PATCH /api/v1/admin/projects/{id}/images/{imageId} | AdminOnly | Admin / projects and media / UpdateProjectImage | src/Pages/Admin/CatalogueImages.tsx:55 |
| DELETE /api/v1/admin/projects/{id}/images/{imageId} | AdminOnly | Admin / projects and media / DeleteProjectImage | src/Pages/Admin/CatalogueImages.tsx:65 |
| POST /api/v1/admin/projects/{projectId}/units | AdminOnly | Admin / units and media / CreateUnit | src/AdminCatalogue/model.ts:208 |
| POST /api/v1/admin/projects/{projectId}/time-plan | AdminOnly | Admin / time plans, stages, items and images / CreateTimePlan | src/Planning/commands.ts:45 |
| GET /api/v1/units/{id} | Anonymous | Website / units; shared Admin catalogue reads / GetUnitById | src/AdminCatalogue/model.ts:193<br>src/Context/CatalogueDetailProvider.tsx:22 |
| PATCH /api/v1/admin/units/{id} | AdminOnly | Admin / units and media / UpdateUnit | src/AdminCatalogue/model.ts:207 |
| DELETE /api/v1/admin/units/{id} | AdminOnly | Admin / units and media / DeleteUnit | src/AdminCatalogue/model.ts:221 |
| PUT /api/v1/admin/units/{id}/amenities | AdminOnly | Admin / units and media / ReplaceUnitAmenities | src/AdminCatalogue/model.ts:240 |
| POST /api/v1/admin/units/{id}/images | AdminOnly | Admin / units and media / AddUnitImage | src/Pages/Admin/CatalogueImages.tsx:134 |
| PATCH /api/v1/admin/units/{id}/images/{imageId} | AdminOnly | Admin / units and media / UpdateUnitImage | src/Pages/Admin/CatalogueImages.tsx:55 |
| DELETE /api/v1/admin/units/{id}/images/{imageId} | AdminOnly | Admin / units and media / DeleteUnitImage | src/Pages/Admin/CatalogueImages.tsx:65 |
| POST /api/v1/reservations | CustomerOnly | Customer account / reservations / CreateReservation | src/Context/CustomerActionProvider.tsx:54 |
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
| PATCH /api/v1/admin/time-plans/{id} | AdminOnly | Admin / time plans, stages, items and images / UpdateTimePlan | src/Planning/commands.ts:63 |
| DELETE /api/v1/admin/time-plans/{id} | AdminOnly | Admin / time plans, stages, items and images / DeleteTimePlan | src/Planning/commands.ts:65 |
| POST /api/v1/admin/time-plans/{timePlanId}/stages | AdminOnly | Admin / time plans, stages, items and images / AddTimePlanStage | src/Planning/commands.ts:80 |
| POST /api/v1/admin/time-plans/{timePlanId}/stages/from-template | AdminOnly | Admin / time plans, stages, items and images / AddStageFromTemplate | src/Planning/commands.ts:79 |
| PATCH /api/v1/admin/time-plans/{timePlanId}/stages/{id} | AdminOnly | Admin / time plans, stages, items and images / UpdateTimePlanStage | src/Planning/commands.ts:83 |
| DELETE /api/v1/admin/time-plans/{timePlanId}/stages/{id} | AdminOnly | Admin / time plans, stages, items and images / DeleteTimePlanStage | src/Planning/commands.ts:85 |
| PUT /api/v1/admin/time-plans/{timePlanId}/stages/order | AdminOnly | Admin / time plans, stages, items and images / ReorderTimePlanStages | src/Planning/commands.ts:88 |
| POST /api/v1/admin/time-plan-stages/{stageId}/items | AdminOnly | Admin / time plans, stages, items and images / AddPlanStageItem | src/Planning/commands.ts:90 |
| PATCH /api/v1/admin/time-plan-stages/{stageId}/items/{id} | AdminOnly | Admin / time plans, stages, items and images / UpdatePlanStageItem | src/Planning/commands.ts:92 |
| DELETE /api/v1/admin/time-plan-stages/{stageId}/items/{id} | AdminOnly | Admin / time plans, stages, items and images / DeletePlanStageItem | src/Planning/commands.ts:94 |
| POST /api/v1/admin/time-plan-stages/{stageId}/items/{id}/status | AdminOnly | Admin / time plans, stages, items and images / ChangePlanStageItemStatus | src/Planning/commands.ts:96 |
| PUT /api/v1/admin/time-plan-stages/{stageId}/items/order | AdminOnly | Admin / time plans, stages, items and images / ReorderPlanStageItems | src/Planning/commands.ts:102 |
| POST /api/v1/admin/time-plan-items/{itemId}/images | AdminOnly | Admin / time plans, stages, items and images / AddStageItemImage | src/Planning/commands.ts:104 |
| PATCH /api/v1/admin/time-plan-items/{itemId}/images/{imageId} | AdminOnly | Admin / time plans, stages, items and images / UpdateStageItemImage | src/Planning/commands.ts:106 |
| DELETE /api/v1/admin/time-plan-items/{itemId}/images/{imageId} | AdminOnly | Admin / time plans, stages, items and images / DeleteStageItemImage | src/Planning/commands.ts:108 |
| PUT /api/v1/admin/time-plan-items/{itemId}/images/order | AdminOnly | Admin / time plans, stages, items and images / ReorderStageItemImages | src/Planning/commands.ts:111 |
| GET /api/v1/admin/stage-templates | AdminOnly | Admin / stage templates / GetStageTemplates | src/Components/Planning/SourcePicker.tsx:55<br>src/Context/TemplatesProvider.tsx:56 |
| GET /api/v1/admin/stage-templates/{id} | AdminOnly | Admin / stage templates / GetStageTemplateById | src/Components/Planning/StageComposer.tsx:146<br>src/Context/TemplatesProvider.tsx:70<br>src/Context/TemplatesProvider.tsx:106 |
| POST /api/v1/admin/stage-templates | AdminOnly | Admin / stage templates / CreateStageTemplate | src/Planning/commands.ts:131 |
| PATCH /api/v1/admin/stage-templates/{id} | AdminOnly | Admin / stage templates / UpdateStageTemplate | src/Planning/commands.ts:137 |
| PUT /api/v1/admin/stage-templates/{id}/active | AdminOnly | Admin / stage templates / SetStageTemplateActive | src/Planning/commands.ts:150 |
| DELETE /api/v1/admin/stage-templates/{id} | AdminOnly | Admin / stage templates / DeleteStageTemplate | src/Planning/commands.ts:145 |
| PUT /api/v1/admin/stage-templates/{id}/items | AdminOnly | Admin / stage templates / SetStageTemplateItems | src/Planning/commands.ts:164 |
| GET /api/v1/admin/item-templates | AdminOnly | Admin / item templates / GetItemTemplates | src/Components/Planning/SourcePicker.tsx:55<br>src/Context/TemplatesProvider.tsx:57 |
| GET /api/v1/admin/item-templates/{id} | AdminOnly | Admin / item templates / GetItemTemplateById | src/Context/TemplatesProvider.tsx:71<br>src/Context/TemplatesProvider.tsx:108 |
| POST /api/v1/admin/item-templates | AdminOnly | Admin / item templates / CreateItemTemplate | src/Planning/commands.ts:131 |
| PATCH /api/v1/admin/item-templates/{id} | AdminOnly | Admin / item templates / UpdateItemTemplate | src/Planning/commands.ts:138 |
| PUT /api/v1/admin/item-templates/{id}/active | AdminOnly | Admin / item templates / SetItemTemplateActive | src/Planning/commands.ts:151 |
| DELETE /api/v1/admin/item-templates/{id} | AdminOnly | Admin / item templates / DeleteItemTemplate | src/Planning/commands.ts:146 |
| GET /api/v1/terms-and-conditions/current | Anonymous | Website / current terms / GetActiveTermsAndConditions | src/Context/CatalogueDetailProvider.tsx:23<br>src/Context/HomeProvider.tsx:16 |
| GET /api/v1/admin/terms-and-conditions | AdminOnly | Admin / terms versions and activation / GetTermsAndConditionsVersions | src/Context/TermsAdminProvider.tsx:18 |
| GET /api/v1/admin/terms-and-conditions/{id} | AdminOnly | Admin / terms versions and activation / GetTermsAndConditionsById | src/Context/TermsAdminProvider.tsx:22<br>src/Context/TermsAdminProvider.tsx:35 |
| POST /api/v1/admin/terms-and-conditions | AdminOnly | Admin / terms versions and activation / CreateTermsAndConditionsVersion | src/Context/TermsAdminProvider.tsx:33 |
| POST /api/v1/admin/terms-and-conditions/{id}/activate | AdminOnly | Admin / terms versions and activation / ActivateTermsAndConditions | src/Context/TermsAdminProvider.tsx:48 |
| GET /api/v1/admin/activity-logs | AdminOnly | Admin / staff activity log / GetActivityLogs | src/Context/ActivityLogsProvider.tsx:19 |
| GET /api/v1/admin/activity-logs/{id} | AdminOnly | Admin / staff activity log / GetActivityLogById | src/Context/ActivityLogsProvider.tsx:27 |
| GET /api/v1/cities/lookup | Anonymous | Website / cities; shared Admin catalogue reads / GetCitiesLookup | src/Services/LocationLookups.ts:8 |
| GET /api/v1/areas/lookup | Anonymous | Website / areas; shared Admin catalogue reads / GetAreasLookup | src/Services/LocationLookups.ts:13 |
| GET /api/v1/projects/lookup | Anonymous | Website / projects; shared Admin catalogue reads / GetProjectsLookup | Generated and service-tested; project-lookup UI is outside the approved redesign scope (docs/project-details-redesign-plan.md). |

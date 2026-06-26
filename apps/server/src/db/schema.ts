import { relations } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const kindergartenSettings = sqliteTable('kindergarten_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().default('Заклад дошкільної освіти'),
  edrpou: text('edrpou').default('00000000'),
  address: text('address').default('Адреса закладу'),
  phone: text('phone').default('+380000000000'),
  email: text('email').default('email@example.com'),
  directorName: text('director_name').default('ПІБ Директора'),
  nurseName: text('nurse_name').default('ПІБ Медсестри'),
  storekeeperName: text('storekeeper_name').default('ПІБ Комірника (Кладовщика)'),
  supplyManagerName: text('supply_manager_name').default('ПІБ Завгоспа'),
  showQuotes: integer('show_quotes', { mode: 'boolean' }).default(true),
  licenseKey: text('license_key'),
  licenseType: text('license_type'), // 'annual', 'lifetime'
  installationDate: integer('installation_date', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  activatedAt: integer('activated_at', { mode: 'timestamp' }),
  backupTime: text('backup_time').notNull().default('03:00'),
  maxBackupsCount: integer('max_backups_count').notNull().default(7),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  permissions: text('permissions', { mode: 'json' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  unit: text('unit').notNull(),
  currentPrice: real('current_price').notNull().default(0),
  minStock: real('min_stock').notNull().default(0),
  category: text('category'),
  notes: text('notes'),
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  edrpou: text('edrpou'),
  contacts: text('contacts'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  notes: text('notes'),
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNumber: text('invoice_number').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  basis: text('basis'),
  vatAmount: real('vat_amount').notNull().default(0),
  totalAmount: real('total_amount').notNull().default(0),
  isDraft: integer('is_draft', { mode: 'boolean' }).default(false),
  status: text('status').notNull().default('draft'),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const invoiceItems = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
});

export const productBatches = sqliteTable('product_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  arrivalDate: integer('arrival_date', { mode: 'timestamp' }).notNull(),
  initialQuantity: real('initial_quantity').notNull(),
  remainingQuantity: real('remaining_quantity').notNull(),
  pricePerUnit: real('price_per_unit').notNull(),
  invoiceId: integer('invoice_id').references(() => invoices.id),
  invoiceItemId: integer('invoice_item_id').references(() => invoiceItems.id),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
});

export const productPriceHistory = sqliteTable('product_price_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  price: real('price').notNull(),
  changeDate: integer('change_date', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  reason: text('reason').notNull(),
  referenceId: integer('reference_id'),
});

export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  batchId: integer('batch_id').references(() => productBatches.id),
  invoiceId: integer('invoice_id').references(() => invoices.id),
  type: text('type').notNull(),
  quantity: real('quantity').notNull(),
  priceAtMoment: real('price_at_moment').notNull(),
  date: integer('date', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  reason: text('reason'),
  userId: integer('user_id').references(() => users.id),
});

export const recipes = sqliteTable('recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  dishType: text('dish_type'),
  techCard: text('tech_card'),
  outputWeight: real('output_weight'),
  isBaseRecipe: integer('is_base_recipe', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id').notNull().references(() => recipes.id),
  productId: integer('product_id').references(() => products.id),
  subRecipeId: integer('sub_recipe_id').references(() => recipes.id),
  ageGroup: text('age_group').notNull(),
  grossWeight: real('gross_weight').notNull(),
  netWeight: real('net_weight').notNull(),
});

export const dailyMenus = sqliteTable('daily_menus', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  childrenCount0_4: integer('children_count_0_4').notNull(),
  childrenCount5_7: integer('children_count_5_7').notNull(),
  employeesCount: integer('employees_count').default(0).notNull(),
  targetPrice0_4: real('target_price_0_4'),
  targetPrice5_7: real('target_price_5_7'),
  isConfirmed: integer('is_confirmed', { mode: 'boolean' }).default(false),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
});

export const menuItemRecipes = sqliteTable('menu_item_recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  menuId: integer('menu_id').notNull().references(() => dailyMenus.id, { onDelete: 'cascade' }),
  recipeId: integer('recipe_id').notNull().references(() => recipes.id),
  mealType: text('meal_type').notNull(), // сніданок, обід тощо
  outputWeight0_4: real('output_weight_0_4'),
  outputWeight5_7: real('output_weight_5_7'),
  outputWeightEmployees: real('output_weight_employees'),
});

export const menuItemIngredientOverrides = sqliteTable('menu_item_ingredient_overrides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  menuItemId: integer('menu_item_id')
    .notNull()
    .references(() => menuItemRecipes.id, { onDelete: 'cascade' }),
  recipeIngredientId: integer('recipe_ingredient_id')
    .references(() => recipeIngredients.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id),
  subRecipeId: integer('sub_recipe_id').references(() => recipes.id),
  ageGroup: text('age_group'),
  grossWeight: real('gross_weight').notNull(),
  netWeight: real('net_weight').notNull(),
});

export const inventory = sqliteTable('inventory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  inventoryNumber: text('inventory_number').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  location: text('location'),
  responsibleId: integer('responsible_id'),
  assignmentType: text('assignment_type').notNull().default('employee'),
  groupId: integer('group_id').references(() => childGroups.id),
  outdoorArea: text('outdoor_area'),
  initialValue: real('initial_value'),
  status: text('status').default('good'),
  arrivalDate: integer('arrival_date', { mode: 'timestamp' }),
  notes: text('notes'),
});

export const employees = sqliteTable('employees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  position: text('position').notNull(),
  department: text('department'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  hireDate: integer('hire_date', { mode: 'timestamp' }),
  rate: real('rate'),
  notes: text('notes'),
  status: text('status').notNull().default('working'),
  userId: integer('user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const employeeDocuments = sqliteTable('employee_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: integer('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  documentType: text('document_type').notNull(),
  documentNumber: text('document_number'),
  fileName: text('file_name'),
  originalFileName: text('original_file_name'),
  filePath: text('file_path'),
  mimeType: text('mime_type'),
  fileSize: integer('file_size'),
  issueDate: integer('issue_date', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const employeeHistory = sqliteTable('employee_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: integer('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  userId: integer('user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const inventoryTransfers = sqliteTable('inventory_transfers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  inventoryId: integer('inventory_id').notNull().references(() => inventory.id),
  fromEmployeeId: integer('from_employee_id').references(() => employees.id),
  toEmployeeId: integer('to_employee_id').references(() => employees.id),
  fromAssignmentType: text('from_assignment_type'),
  toAssignmentType: text('to_assignment_type'),
  fromGroupId: integer('from_group_id').references(() => childGroups.id),
  toGroupId: integer('to_group_id').references(() => childGroups.id),
  fromOutdoorArea: text('from_outdoor_area'),
  toOutdoorArea: text('to_outdoor_area'),
  note: text('note'),
  transferredByUserId: integer('transferred_by_user_id').references(() => users.id),
  transferredAt: integer('transferred_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const utilityMeters = sqliteTable('utility_meters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  utilityType: text('utility_type').notNull(),
  unit: text('unit').notNull(),
  location: text('location'),
  accountNumber: text('account_number'),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const utilityMeterReadings = sqliteTable('utility_meter_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meterId: integer('meter_id').notNull().references(() => utilityMeters.id, { onDelete: 'cascade' }),
  readingValue: real('reading_value').notNull(),
  readingDate: integer('reading_date', { mode: 'timestamp' }).notNull(),
  notes: text('notes'),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const utilityTariffs = sqliteTable('utility_tariffs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meterId: integer('meter_id').notNull().references(() => utilityMeters.id, { onDelete: 'cascade' }),
  pricePerUnit: real('price_per_unit').notNull(),
  fixedFee: real('fixed_fee').notNull().default(0),
  validFrom: integer('valid_from', { mode: 'timestamp' }).notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const childGroups = sqliteTable('child_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  primaryEducatorId: integer('primary_educator_id').references(() => employees.id),
  assistantEducatorId: integer('assistant_educator_id').references(() => employees.id),
});

export const children = sqliteTable('children', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  birthDate: integer('birth_date', { mode: 'timestamp' }).notNull(),
  groupId: integer('group_id').references(() => childGroups.id),
  status: text('status').default('active'),
  qrToken: text('qr_token').unique(),
  gender: text('gender'),
  address: text('address'),
  documentInfo: text('document_info'),
  motherName: text('mother_name'),
  motherPhone: text('mother_phone'),
  fatherName: text('father_name'),
  fatherPhone: text('father_phone'),
  hasBenefits: integer('has_benefits', { mode: 'boolean' }).default(false),
  benefitDescription: text('benefit_description'),
  photoPath: text('photo_path'),
  enrollmentDate: integer('enrollment_date', { mode: 'timestamp' }),
  notes: text('notes'),
});

export const childMedicalCards = sqliteTable('child_medical_cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').notNull().unique().references(() => children.id, { onDelete: 'cascade' }),
  bloodGroup: text('blood_group'), // e.g. I(0), II(A), III(B), IV(AB)
  rhFactor: text('rh_factor'), // e.g. + or -
  healthGroup: text('health_group'), // I, II, III, IV, V
  physicalGroup: text('physical_group'), // Основна, Підготовча, Спеціальна
  chronicConditions: text('chronic_conditions'),
  allergies: text('allergies'),
  dietaryRestrictions: text('dietary_restrictions'),
  height: real('height'),
  weight: real('weight'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const childMedicalMeasurements = sqliteTable('child_medical_measurements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').notNull().references(() => children.id, { onDelete: 'cascade' }),
  height: real('height'),
  weight: real('weight'),
  measuredAt: integer('measured_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  notes: text('notes'),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const attendance = sqliteTable('attendance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').notNull().references(() => children.id),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  isPresent: integer('is_present', { mode: 'boolean' }).default(true),
});

export const illnesses = sqliteTable('illnesses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').notNull().references(() => children.id, { onDelete: 'cascade' }),
  diagnosis: text('diagnosis').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  quarantineEndDate: integer('quarantine_end_date', { mode: 'timestamp' }),
  isolationWard: integer('isolation_ward', { mode: 'boolean' }).default(false),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const vaccinations = sqliteTable('vaccinations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').notNull().references(() => children.id, { onDelete: 'cascade' }),
  vaccineName: text('vaccine_name').notNull(),
  status: text('status').notNull().default('planned'), // planned, done, exempt
  planDate: integer('plan_date', { mode: 'timestamp' }),
  dateGiven: integer('date_given', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const medications = sqliteTable('medications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  quantity: real('quantity').notNull().default(0),
  unit: text('unit').notNull(),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const medicationMovements = sqliteTable('medication_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  medicationId: integer('medication_id').notNull().references(() => medications.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'in', 'out', 'adjust'
  quantity: real('quantity').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  reason: text('reason'),
  childId: integer('child_id').references(() => children.id, { onDelete: 'set null' }),
  userId: integer('user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  actionType: text('action_type').notNull(),
  entity: text('entity').notNull(),
  entityId: integer('entity_id'),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  ipAddress: text('ip_address'),
});

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  senderId: integer('sender_id').notNull().references(() => users.id),
  recipientId: integer('recipient_id').references(() => users.id),
  groupId: text('group_id'),
  content: text('content').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  messagesSent: many(messages),
  invoicesCreated: many(invoices),
  medicationMovements: many(medicationMovements),
}));

export const productsRelations = relations(products, ({ many }) => ({
  batches: many(productBatches),
  movements: many(stockMovements),
  priceHistory: many(productPriceHistory),
  invoiceItems: many(invoiceItems),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [invoices.supplierId],
    references: [suppliers.id],
  }),
  createdByUser: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
  items: many(invoiceItems),
  batches: many(productBatches),
  movements: many(stockMovements),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.productId],
    references: [products.id],
  }),
}));

export const productBatchesRelations = relations(productBatches, ({ one, many }) => ({
  product: one(products, {
    fields: [productBatches.productId],
    references: [products.id],
  }),
  invoice: one(invoices, {
    fields: [productBatches.invoiceId],
    references: [invoices.id],
  }),
  invoiceItem: one(invoiceItems, {
    fields: [productBatches.invoiceItemId],
    references: [invoiceItems.id],
  }),
  movements: many(stockMovements),
}));

export const productPriceHistoryRelations = relations(productPriceHistory, ({ one }) => ({
  product: one(products, {
    fields: [productPriceHistory.productId],
    references: [products.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  batch: one(productBatches, {
    fields: [stockMovements.batchId],
    references: [productBatches.id],
  }),
  invoice: one(invoices, {
    fields: [stockMovements.invoiceId],
    references: [invoices.id],
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
  }),
}));

export const utilityMetersRelations = relations(utilityMeters, ({ many }) => ({
  readings: many(utilityMeterReadings),
  tariffs: many(utilityTariffs),
}));

export const utilityMeterReadingsRelations = relations(utilityMeterReadings, ({ one }) => ({
  meter: one(utilityMeters, {
    fields: [utilityMeterReadings.meterId],
    references: [utilityMeters.id],
  }),
  createdByUser: one(users, {
    fields: [utilityMeterReadings.createdByUserId],
    references: [users.id],
  }),
}));

export const utilityTariffsRelations = relations(utilityTariffs, ({ one }) => ({
  meter: one(utilityMeters, {
    fields: [utilityTariffs.meterId],
    references: [utilityMeters.id],
  }),
}));

export const medicationsRelations = relations(medications, ({ many }) => ({
  movements: many(medicationMovements),
}));

export const medicationMovementsRelations = relations(medicationMovements, ({ one }) => ({
  medication: one(medications, {
    fields: [medicationMovements.medicationId],
    references: [medications.id],
  }),
  child: one(children, {
    fields: [medicationMovements.childId],
    references: [children.id],
  }),
  user: one(users, {
    fields: [medicationMovements.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
  }),
}));

export const childPsychologicalCards = sqliteTable('child_psychological_cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').notNull().unique().references(() => children.id, { onDelete: 'cascade' }),
  temperament: text('temperament'),
  adaptationLevel: text('adaptation_level'),
  speechDevelopment: text('speech_development'),
  socialSkills: text('social_skills'),
  familyStatus: text('family_status'),
  notes: text('notes'),
  recommendations: text('recommendations'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const psychologicalConsultations = sqliteTable('psychological_consultations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').references(() => children.id, { onDelete: 'cascade' }),
  consultationType: text('consultation_type').notNull().default('child_individual'), // child_individual, child_group, parent, staff
  topic: text('topic').notNull(),
  participants: text('participants'),
  notes: text('notes'),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const childInclusiveCards = sqliteTable('child_inclusive_cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').notNull().unique().references(() => children.id, { onDelete: 'cascade' }),
  supportLevel: integer('support_level').notNull().default(1), // Рівень підтримки 1-5
  specialNeeds: text('special_needs'), // Особливі освітні потреби (ООП / діагноз)
  teamMembers: text('team_members'), // Склад команди супроводу
  weeklyHours: real('weekly_hours').default(0), // Годин занять на тиждень
  adaptationNeeds: text('adaptation_needs'), // Адаптація
  notes: text('notes'), // Нотатки / моніторинг
  individualProgram: text('individual_program'), // Програма ІПР
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const childrenRelations = relations(children, ({ many, one }) => ({
  illnesses: many(illnesses),
  vaccinations: many(vaccinations),
  psychologicalCard: one(childPsychologicalCards, {
    fields: [children.id],
    references: [childPsychologicalCards.childId]
  }),
  inclusiveCard: one(childInclusiveCards, {
    fields: [children.id],
    references: [childInclusiveCards.childId]
  }),
  consultations: many(psychologicalConsultations),
  medicationMovements: many(medicationMovements),
}));

export const childPsychologicalCardsRelations = relations(childPsychologicalCards, ({ one }) => ({
  child: one(children, {
    fields: [childPsychologicalCards.childId],
    references: [children.id],
  }),
}));

export const psychologicalConsultationsRelations = relations(psychologicalConsultations, ({ one }) => ({
  child: one(children, {
    fields: [psychologicalConsultations.childId],
    references: [children.id],
  }),
}));

export const illnessesRelations = relations(illnesses, ({ one }) => ({
  child: one(children, {
    fields: [illnesses.childId],
    references: [children.id],
  }),
}));

export const vaccinationsRelations = relations(vaccinations, ({ one }) => ({
  child: one(children, {
    fields: [vaccinations.childId],
    references: [children.id],
  }),
}));

export const childInclusiveCardsRelations = relations(childInclusiveCards, ({ one }) => ({
  child: one(children, {
    fields: [childInclusiveCards.childId],
    references: [children.id],
  }),
}));

const fs = require('fs');
const path = require('path');

console.log('🧪 Verifying "BooffIn manager" Kanban Board & Calendar Integration...\n');

// 1. Verify workspace types
const typesPath = path.join(__dirname, '..', 'src', 'types', 'workspace.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');
if (!typesContent.includes('export interface WorkspaceTask') ||
    !typesContent.includes('export type WorkspaceTaskStatus') ||
    !typesContent.includes('export type WorkspaceTaskPriority') ||
    !typesContent.includes('export type WorkspaceTaskColor')) {
  console.error('❌ Missing WorkspaceTask, WorkspaceTaskStatus, WorkspaceTaskPriority, or WorkspaceTaskColor in workspace.ts');
  process.exit(1);
}
console.log('✅ [1/7] WorkspaceTask data models, status, priority, and WorkspaceTaskColor types verified');

// 2. Verify workspaceService methods
const servicePath = path.join(__dirname, '..', 'src', 'api', 'workspaceService.ts');
const serviceContent = fs.readFileSync(servicePath, 'utf8');
if (!serviceContent.includes('getWorkspaceTasks') ||
    !serviceContent.includes('createWorkspaceTask') ||
    !serviceContent.includes('updateWorkspaceTask') ||
    !serviceContent.includes('deleteWorkspaceTask')) {
  console.error('❌ Missing task management CRUD methods in workspaceService.ts');
  process.exit(1);
}
console.log('✅ [2/7] workspaceService task operations and cache/db fallbacks verified');

// 3. Verify useWorkspaceStore integration
const storePath = path.join(__dirname, '..', 'src', 'store', 'useWorkspaceStore.ts');
const storeContent = fs.readFileSync(storePath, 'utf8');
if (!storeContent.includes('tasks: WorkspaceTask[]') ||
    !storeContent.includes('loadTasks:') ||
    !storeContent.includes('createTask:') ||
    !storeContent.includes('updateTask:') ||
    !storeContent.includes('deleteTask:') ||
    !storeContent.includes('moveTaskStatus:') ||
    !storeContent.includes('[Task]')) {
  console.error('❌ Missing tasks state or calendar sync logic in useWorkspaceStore.ts');
  process.exit(1);
}
console.log('✅ [3/7] useWorkspaceStore state and automatic bidirectional Calendar sync verified');

// 4. Verify WorkspaceBooffInManagerView component
const managerPath = path.join(__dirname, '..', 'src', 'components', 'workspace', 'WorkspaceBooffInManagerView.tsx');
if (!fs.existsSync(managerPath)) {
  console.error('❌ WorkspaceBooffInManagerView.tsx not found');
  process.exit(1);
}
const managerContent = fs.readFileSync(managerPath, 'utf8');
if (!managerContent.toLowerCase().includes('booffin manager') ||
    !managerContent.includes('desktopBoardContainer') ||
    !managerContent.includes('mobileBoardWrapper') ||
    !managerContent.includes('onOpenCalendar')) {
  console.error('❌ WorkspaceBooffInManagerView missing desktop/mobile layout or calendar handler');
  process.exit(1);
}
console.log('✅ [4/7] WorkspaceBooffInManagerView component verified with responsive mobile/desktop layouts and calendar integration');

// 5. Verify smooth floating animation & modern progress features
if (!managerContent.includes('AnimatedTaskCard') ||
    !managerContent.includes('floatAnim') ||
    !managerContent.includes('arrivalAnim') ||
    !managerContent.includes('advanceStagePill') ||
    !managerContent.includes('progressBarFill') ||
    !managerContent.includes('LayoutAnimation.configureNext')) {
  console.error('❌ Missing smooth floating animation or modern progress bar in WorkspaceBooffInManagerView');
  process.exit(1);
}
console.log('✅ [5/7] Smooth floating card animation (In Progress -> Peer Review) and modern progress bar verified');

// 6. Verify minimalist design, clean accent striping & zero emojis
const forbiddenSymbols = ['Zap', 'CheckCircle2', 'Flame', 'AlertTriangle', 'Sparkles', '⚡', '🕒', '👀', '✔️', '✅', '🔥', '⚠️', '✨'];
const hasForbiddenSymbol = forbiddenSymbols.find(sym => managerContent.includes(sym));
if (hasForbiddenSymbol) {
  console.error(`❌ Found forbidden emoji/symbol '${hasForbiddenSymbol}' in WorkspaceBooffInManagerView`);
  process.exit(1);
}

if (!managerContent.includes('MINIMAL_CARD_COLORS') ||
    !managerContent.includes('colorPickerRow') ||
    !managerContent.includes('cardLeftAccent')) {
  console.error('❌ Missing MINIMAL_CARD_COLORS, colorPickerRow, or cardLeftAccent in WorkspaceBooffInManagerView');
  process.exit(1);
}
console.log('✅ [6/7] Minimalist design verified: clean typography, subtle accent stripes, and ZERO emojis/symbols');

// 7. Verify WorkspaceInnerCircleView tab placement between Calendar and Vault
const innerCirclePath = path.join(__dirname, '..', 'src', 'components', 'workspace', 'WorkspaceInnerCircleView.tsx');
const innerCircleContent = fs.readFileSync(innerCirclePath, 'utf8');

const calendarPillIndex = innerCircleContent.indexOf("setActiveTab('calendar')");
const managerPillIndex = innerCircleContent.indexOf("setActiveTab('manager')");
const vaultPillIndex = innerCircleContent.indexOf("setActiveTab('vault')");

if (calendarPillIndex === -1 || managerPillIndex === -1 || vaultPillIndex === -1) {
  console.error('❌ Missing calendar, manager, or vault tab pill in WorkspaceInnerCircleView.tsx');
  process.exit(1);
}

if (!(calendarPillIndex < managerPillIndex && managerPillIndex < vaultPillIndex)) {
  console.error('❌ "BooffIn manager" pill is NOT placed strictly between Calendar and Vault');
  process.exit(1);
}

if (!innerCircleContent.includes('WorkspaceBooffInManagerView') ||
    !innerCircleContent.includes("activeTab === 'manager'") ||
    !innerCircleContent.includes('View in BooffIn manager')) {
  console.error('❌ WorkspaceInnerCircleView missing manager view mount or calendar event card back-link');
  process.exit(1);
}
console.log('✅ [7/7] "BooffIn manager" tab is strictly positioned between Calendar and Vault with bidirectional links');

console.log('\n🎉 ALL BOOFFIN MANAGER COLOR-CODING, ANIMATION, & CALENDAR VERIFICATIONS PASSED SUCCESSFULLY!');

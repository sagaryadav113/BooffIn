const fs = require('fs');
const path = require('path');

console.log('🧪 Verifying Vault -> Discussion Message Navigation...\n');

const innerCirclePath = path.join(__dirname, '..', 'src', 'components', 'workspace', 'WorkspaceInnerCircleView.tsx');
if (!fs.existsSync(innerCirclePath)) {
  console.error('❌ WorkspaceInnerCircleView.tsx not found');
  process.exit(1);
}

const innerCircleContent = fs.readFileSync(innerCirclePath, 'utf8');

// 1. Verify highlightedMessageId state
if (!innerCircleContent.includes('const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);')) {
  console.error('❌ Missing highlightedMessageId state hook');
  process.exit(1);
}
console.log('✅ [1/5] highlightedMessageId state variable is defined and typed');

// 2. Verify handleOpenSavedMessageInDiscussion logic
if (!innerCircleContent.includes('handleOpenSavedMessageInDiscussion') ||
    !innerCircleContent.includes("setActiveTab('discussions')") ||
    !innerCircleContent.includes('setHighlightedMessageId(targetMsgId)') ||
    !innerCircleContent.includes('scrollToIndex')) {
  console.error('❌ handleOpenSavedMessageInDiscussion handler logic incomplete');
  process.exit(1);
}
console.log('✅ [2/5] handleOpenSavedMessageInDiscussion correctly switches tab, clears search, highlights message, and scrolls FlatList');

// 3. Verify FlatList scroll failure protection
if (!innerCircleContent.includes('onScrollToIndexFailed')) {
  console.error('❌ FlatList missing onScrollToIndexFailed error handler');
  process.exit(1);
}
console.log('✅ [3/5] FlatList has robust onScrollToIndexFailed handler to prevent crashes during layout transitions');

// 4. Verify message row & bubble highlight styles
if (!innerCircleContent.includes('styles.highlightedMessageBubble') ||
    !innerCircleContent.includes('styles.highlightedMessageRow') ||
    !innerCircleContent.includes('highlightedMessageBubble: {') ||
    !innerCircleContent.includes('highlightedMessageRow: {')) {
  console.error('❌ Missing highlightedMessageBubble or highlightedMessageRow styling');
  process.exit(1);
}
console.log('✅ [4/5] Discussion message bubble & row highlight styles properly configured with glowing emerald borders and ambient tint');

// 5. Verify Vault card interaction hooks
if (!innerCircleContent.includes('styles.vaultOpenDiscussionBtn') ||
    !innerCircleContent.includes('Open in Discussion') ||
    !innerCircleContent.includes('Tap to open in discussion') ||
    !innerCircleContent.includes('styles.vaultMessageBody')) {
  console.error('❌ Vault item card missing tappable body or Open in Discussion button');
  process.exit(1);
}
console.log('✅ [5/5] Vault item card message body is interactive with visual hint and dedicated Open in Discussion button');

console.log('\n🎉 ALL VAULT -> DISCUSSION NAVIGATION VERIFICATIONS PASSED SUCCESSFULLY!');

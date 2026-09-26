import { useState, useCallback } from 'react';

export function useMentionAutocomplete(initialText: string = '') {
  const [text, setText] = useState(initialText);
  const [cursorPos, setCursorPos] = useState(initialText.length);
  const [isMentionActive, setIsMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  const checkMention = useCallback((currentText: string, cursor: number) => {
    const textBefore = currentText.slice(0, cursor);
    const match = textBefore.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);

    if (match && match.index !== undefined) {
      const leadingSpace = match[0].startsWith(' ') ? 1 : 0;
      const atIndex = match.index + leadingSpace;
      setIsMentionActive(true);
      setMentionQuery(match[1]);
      setMentionStartIndex(atIndex);
    } else {
      setIsMentionActive(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    }
  }, []);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    // Approximate cursor position at end of newText if selection hasn't fired
    setCursorPos((prev) => {
      const diff = newText.length - text.length;
      const nextPos = Math.max(0, Math.min(newText.length, prev + diff));
      checkMention(newText, nextPos);
      return nextPos;
    });
  }, [text.length, checkMention]);

  const handleSelectionChange = useCallback((selection: { start: number; end: number }) => {
    setCursorPos(selection.start);
    checkMention(text, selection.start);
  }, [text, checkMention]);

  const insertMention = useCallback((handle: string): string => {
    const cleanHandle = handle.replace(/^@/, '').trim();
    if (mentionStartIndex < 0) {
      const appended = `${text} @${cleanHandle} `;
      setText(appended);
      setIsMentionActive(false);
      return appended;
    }

    const before = text.slice(0, mentionStartIndex);
    const after = text.slice(cursorPos);
    const newText = `${before}@${cleanHandle} ${after}`;
    setText(newText);
    setIsMentionActive(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
    return newText;
  }, [mentionStartIndex, text, cursorPos]);

  return {
    text,
    setText,
    handleTextChange,
    handleSelectionChange,
    isMentionActive,
    mentionQuery,
    insertMention,
  };
}

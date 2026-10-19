import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useContactMessages,
  useCurrentUser,
  useOwnContactRequests,
  useSendContactMessage,
  type ContactMessage,
} from '@pfotennetz/supabase';
import { formatDate } from '@pfotennetz/shared';
import { ErrorBox, LoadingView, appFonts, usePalette } from '../../../components/ui';

function MessageBubble({ message, own }: { message: ContactMessage; own: boolean }) {
  const c = usePalette();
  return (
    <View style={[styles.messageRow, own ? styles.messageRowOwn : styles.messageRowOther]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: own ? c.primary : c.surfaceContainerLowest,
            borderColor: own ? c.primary : c.outlineVariant,
          },
        ]}
      >
        <Text style={[styles.messageText, { color: own ? c.onPrimary : c.onSurface }]}>
          {message.content}
        </Text>
        <Text style={[styles.messageTime, { color: own ? c.primaryFixed : c.onSurfaceVariant }]}>
          {formatDate(message.created_at, { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

export default function ContactChatScreen() {
  const c = usePalette();
  const params = useLocalSearchParams<{ contactRequestId?: string | string[] }>();
  const rawId = params.contactRequestId;
  const contactRequestId = Array.isArray(rawId) ? rawId[0] : rawId;
  const requestsQuery = useOwnContactRequests();
  const messagesQuery = useContactMessages(contactRequestId);
  const userQuery = useCurrentUser();
  const sendMessage = useSendContactMessage();
  const [draft, setDraft] = useState('');
  const request = useMemo(
    () => requestsQuery.data?.find((item) => item.id === contactRequestId) ?? null,
    [contactRequestId, requestsQuery.data]
  );
  const otherPerson = request
    ? request.requester_id === userQuery.data?.id
      ? request.helperProfile
      : request.requesterProfile
    : null;
  const chatOpen = request?.status === 'pending' || request?.status === 'accepted';

  const send = () => {
    if (!contactRequestId || draft.trim() === '' || sendMessage.isPending) return;
    const content = draft;
    setDraft('');
    sendMessage.mutate({ contactRequestId, content }, { onError: () => setDraft(content) });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.container}
      >
        <View style={[styles.header, { borderBottomColor: c.outlineVariant }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chat schließen"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={c.onSurface} />
          </Pressable>
          <View style={[styles.personAvatar, { backgroundColor: c.secondaryContainer }]}>
            <MaterialCommunityIcons name="paw" size={22} color={c.secondary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: c.onSurface }]}>
              {otherPerson?.display_name ?? 'Kennenlern-Chat'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: c.onSurfaceVariant }]}>
              Privater Austausch
            </Text>
          </View>
        </View>

        {contactRequestId === undefined || requestsQuery.isError || messagesQuery.isError ? (
          <ErrorBox
            message={
              requestsQuery.error?.message ??
              messagesQuery.error?.message ??
              'Privater Chat konnte nicht geladen werden.'
            }
          />
        ) : requestsQuery.isPending || messagesQuery.isPending || userQuery.isPending ? (
          <LoadingView label="Chat wird geladen …" />
        ) : request === null ? (
          <ErrorBox message="Diese Kennenlernanfrage wurde nicht gefunden." />
        ) : (
          <FlatList
            contentContainerStyle={styles.messages}
            data={messagesQuery.data ?? []}
            keyExtractor={(message) => message.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} own={item.sender_id === userQuery.data?.id} />
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: c.onSurfaceVariant }]}>
                Noch keine Nachrichten. Stellt euch vor und besprecht eure Fragen.
              </Text>
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {sendMessage.isError ? <ErrorBox message={sendMessage.error.message} /> : null}
        {chatOpen ? (
          <View style={[styles.composer, { borderTopColor: c.outlineVariant }]}>
            <TextInput
              accessibilityLabel="Private Nachricht"
              editable={!sendMessage.isPending}
              multiline
              onChangeText={setDraft}
              onSubmitEditing={send}
              placeholder="Nachricht schreiben …"
              placeholderTextColor={c.outline}
              style={[styles.input, { backgroundColor: c.surfaceContainerLow, color: c.onSurface }]}
              value={draft}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nachricht senden"
              disabled={draft.trim() === '' || sendMessage.isPending}
              onPress={send}
              style={[
                styles.sendButton,
                { backgroundColor: c.primary, opacity: draft.trim() === '' ? 0.45 : 1 },
              ]}
            >
              <MaterialCommunityIcons name="send" size={19} color={c.onPrimary} />
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  personAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: appFonts.bold, fontSize: 16, lineHeight: 22 },
  headerSubtitle: { fontFamily: appFonts.regular, fontSize: 11, lineHeight: 16, marginTop: 1 },
  messages: { padding: 16, gap: 10, flexGrow: 1, justifyContent: 'flex-end' },
  messageRow: { flexDirection: 'row', width: '100%' },
  messageRowOwn: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageText: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 21 },
  messageTime: {
    fontFamily: appFonts.regular,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 24,
    fontFamily: appFonts.regular,
    fontSize: 14,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontFamily: appFonts.regular,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

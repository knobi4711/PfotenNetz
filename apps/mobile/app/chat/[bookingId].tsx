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
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useBooking,
  useBookingMessages,
  useCurrentUser,
  useSendBookingMessage,
  type Message,
} from '@pfotennetz/supabase';
import { formatDate } from '@pfotennetz/shared';
import { ErrorBox, LoadingView, appFonts, usePalette } from '../../components/ui';

function MessageBubble({ message, own }: { message: Message; own: boolean }) {
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
          {message.content ?? ''}
        </Text>
        <Text style={[styles.messageTime, { color: own ? c.primaryFixed : c.onSurfaceVariant }]}>
          {formatDate(message.created_at, { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const c = usePalette();
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const rawBookingId = params.bookingId;
  const bookingId = Array.isArray(rawBookingId) ? rawBookingId[0] : rawBookingId;
  const bookingQuery = useBooking(bookingId);
  const messagesQuery = useBookingMessages(bookingId);
  const userQuery = useCurrentUser();
  const sendMessage = useSendBookingMessage();
  const [draft, setDraft] = useState('');

  const booking = bookingQuery.data ?? null;
  const messages = messagesQuery.data ?? [];
  const otherPerson = useMemo(() => {
    if (booking === null || userQuery.data?.id === undefined) return null;
    return booking.seeker_id === userQuery.data.id ? booking.helperProfile : booking.seekerProfile;
  }, [booking, userQuery.data?.id]);

  const send = () => {
    if (bookingId === undefined || draft.trim() === '' || sendMessage.isPending) return;
    const content = draft;
    setDraft('');
    sendMessage.mutate({ bookingId, content }, { onError: () => setDraft(content) });
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
              {otherPerson?.display_name ?? 'Nachrichtenaustausch'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: c.onSurfaceVariant }]}>
              {booking?.pet?.name ? `Betreuung für ${booking.pet.name}` : 'PfotenNetz Chat'}
            </Text>
          </View>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={c.onSurfaceVariant} />
        </View>

        {bookingId === undefined || bookingQuery.isError || messagesQuery.isError ? (
          <ErrorBox
            message={
              bookingQuery.error?.message ??
              messagesQuery.error?.message ??
              'Chat konnte nicht geladen werden.'
            }
          />
        ) : bookingQuery.isPending || messagesQuery.isPending || userQuery.isPending ? (
          <LoadingView label="Chat wird geladen …" />
        ) : (
          <FlatList
            contentContainerStyle={styles.messages}
            data={messages}
            keyExtractor={(message) => message.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} own={item.sender_id === userQuery.data?.id} />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}

        {sendMessage.isError ? <ErrorBox message={sendMessage.error.message} /> : null}
        <View
          style={[
            styles.composer,
            { backgroundColor: c.surfaceContainerLowest, borderTopColor: c.outlineVariant },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Anhang hinzufügen"
            style={styles.composerIcon}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={27} color={c.primary} />
          </Pressable>
          <TextInput
            accessibilityLabel="Nachricht"
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
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  composerIcon: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 10,
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

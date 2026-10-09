import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_KIND_LABELS,
  useCreateMarketplaceInquiry,
  useCreateMarketplaceListing,
  useCurrentUser,
  useMarketplaceListings,
  useSetMarketplaceListingStatus,
  type MarketplaceListingKind,
  type MarketplaceListingWithOwner,
} from '@pfotennetz/supabase';
import {
  ActionButton,
  AppHeader,
  BackButton,
  Card,
  Chip,
  ChipRow,
  EmptyText,
  ErrorBox,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from '../components/ui';

const KINDS = Object.entries(MARKETPLACE_KIND_LABELS) as [MarketplaceListingKind, string][];

function ListingCard({
  listing,
  currentUserId,
}: {
  listing: MarketplaceListingWithOwner;
  currentUserId: string | undefined;
}) {
  const c = usePalette();
  const inquiry = useCreateMarketplaceInquiry();
  const status = useSetMarketplaceListingStatus();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('Hallo, ist der Eintrag noch aktuell?');
  const own = listing.owner_id === currentUserId;
  return (
    <Card>
      <View style={styles.cardTop}>
        <Text style={[styles.kind, { color: c.secondary }]}>
          {MARKETPLACE_KIND_LABELS[listing.kind]}
        </Text>
        <Text style={[styles.category, { color: c.onSurfaceVariant }]}>{listing.category}</Text>
      </View>
      <Text style={[styles.cardTitle, { color: c.onSurface }]}>{listing.title}</Text>
      <Text style={[styles.description, { color: c.onSurfaceVariant }]}>{listing.description}</Text>
      <View style={styles.metaRow}>
        {listing.location_area ? (
          <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>
            📍 {listing.location_area}
          </Text>
        ) : null}
        {listing.condition ? (
          <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>
            Zustand: {listing.condition}
          </Text>
        ) : null}
        {listing.price_eur_cents !== null ? (
          <Text style={[styles.price, { color: c.primary }]}>
            {(listing.price_eur_cents / 100).toLocaleString('de-DE', {
              style: 'currency',
              currency: 'EUR',
            })}
          </Text>
        ) : null}
      </View>
      {listing.exchange_for ? (
        <Text style={[styles.exchange, { color: c.secondary }]}>
          Gesucht zum Tausch: {listing.exchange_for}
        </Text>
      ) : null}
      <Text style={[styles.owner, { color: c.onSurfaceVariant }]}>
        Von {listing.owner?.display_name ?? 'Mitglied'}
      </Text>
      {own ? (
        <View style={styles.actions}>
          <ActionButton
            title="Erledigt"
            variant="secondary"
            pending={status.isPending}
            onPress={() => status.mutate({ listingId: listing.id, status: 'completed' })}
          />
          <ActionButton
            title="Zurückziehen"
            variant="secondary"
            pending={status.isPending}
            onPress={() => status.mutate({ listingId: listing.id, status: 'withdrawn' })}
          />
        </View>
      ) : (
        <>
          <ActionButton title="Interesse senden" onPress={() => setOpen((value) => !value)} />
          {open ? (
            <View>
              <TextInput
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={1000}
                placeholder="Kurze Nachricht …"
                placeholderTextColor={c.outline}
                style={[
                  styles.input,
                  styles.multiline,
                  { color: c.onSurface, borderColor: c.outlineVariant },
                ]}
              />
              <ActionButton
                title="Geschützt senden"
                variant="secondary"
                pending={inquiry.isPending}
                onPress={() => inquiry.mutate({ listingId: listing.id, message })}
              />
              {inquiry.isSuccess ? (
                <Text style={[styles.success, { color: c.secondary }]}>Nachricht gesendet.</Text>
              ) : null}
              {inquiry.isError ? <ErrorBox message={inquiry.error.message} /> : null}
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

export default function MarketplaceScreen() {
  const c = usePalette();
  const user = useCurrentUser();
  const [kind, setKind] = useState<MarketplaceListingKind | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [exchangeFor, setExchangeFor] = useState('');
  const [locationArea, setLocationArea] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const listings = useMarketplaceListings({
    ...(kind ? { kind } : {}),
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
  });
  const create = useCreateMarketplaceListing();

  const submit = () => {
    setFormError(null);
    const value = price.trim() ? Number(price.replace(',', '.')) : null;
    if (!title.trim() || !description.trim())
      return setFormError('Bitte Titel und Beschreibung ausfüllen.');
    if (kind === 'sell' && (!value || value <= 0))
      return setFormError('Für Verkäufe ist ein Preis über 0 € nötig.');
    create.mutate(
      {
        kind: kind ?? 'giveaway',
        category: category ?? MARKETPLACE_CATEGORIES[0],
        title,
        description,
        condition,
        priceEur: value,
        exchangeFor,
        locationArea,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setCondition('');
          setPrice('');
          setExchangeFor('');
          setShowCreate(false);
        },
      }
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AppHeader title="Tauschbörse" subtitle="Tierbedarf in der Nachbarschaft weitergeben." />
      <BackButton onPress={() => router.back()} />
      <ActionButton
        title={showCreate ? 'Formular schließen' : 'Angebot oder Gesuch einstellen'}
        variant="secondary"
        onPress={() => setShowCreate((value) => !value)}
      />
      {showCreate ? (
        <Card>
          <SectionTitle>Neuer Eintrag</SectionTitle>
          <Text style={[styles.label, { color: c.onSurface }]}>Art</Text>
          <ChipRow>
            {KINDS.map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={(kind ?? 'giveaway') === value}
                onPress={() => setKind(value)}
              />
            ))}
          </ChipRow>
          <Text style={[styles.label, { color: c.onSurface }]}>Kategorie</Text>
          <ChipRow>
            {MARKETPLACE_CATEGORIES.map((value) => (
              <Chip
                key={value}
                label={value}
                selected={(category ?? MARKETPLACE_CATEGORIES[0]) === value}
                onPress={() => setCategory(value)}
              />
            ))}
          </ChipRow>
          <TextInput
            placeholder="Titel"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={c.outline}
            style={[styles.input, { color: c.onSurface, borderColor: c.outlineVariant }]}
          />
          <TextInput
            placeholder="Beschreibung, Menge, Übergabe …"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholderTextColor={c.outline}
            style={[
              styles.input,
              styles.multiline,
              { color: c.onSurface, borderColor: c.outlineVariant },
            ]}
          />
          <TextInput
            placeholder="Zustand (optional)"
            value={condition}
            onChangeText={setCondition}
            placeholderTextColor={c.outline}
            style={[styles.input, { color: c.onSurface, borderColor: c.outlineVariant }]}
          />
          {kind === 'sell' ? (
            <TextInput
              placeholder="Preis in €"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholderTextColor={c.outline}
              style={[styles.input, { color: c.onSurface, borderColor: c.outlineVariant }]}
            />
          ) : null}
          {kind === 'swap' ? (
            <TextInput
              placeholder="Was suchst du im Tausch?"
              value={exchangeFor}
              onChangeText={setExchangeFor}
              placeholderTextColor={c.outline}
              style={[styles.input, { color: c.onSurface, borderColor: c.outlineVariant }]}
            />
          ) : null}
          <TextInput
            placeholder="Stadtteil oder PLZ (optional)"
            value={locationArea}
            onChangeText={setLocationArea}
            placeholderTextColor={c.outline}
            style={[styles.input, { color: c.onSurface, borderColor: c.outlineVariant }]}
          />
          {formError ? <ErrorBox message={formError} /> : null}
          {create.isError ? <ErrorBox message={create.error.message} /> : null}
          <ActionButton title="Veröffentlichen" pending={create.isPending} onPress={submit} />
        </Card>
      ) : null}
      <Card>
        <TextInput
          placeholder="Suche nach Futter, Zubehör …"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={c.outline}
          style={[styles.input, { color: c.onSurface, borderColor: c.outlineVariant }]}
        />
        <Text style={[styles.label, { color: c.onSurface }]}>Filtern nach</Text>
        <ChipRow>
          <Chip label="Alles" selected={!kind} onPress={() => setKind(undefined)} />
          {KINDS.map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={kind === value}
              onPress={() => setKind(value)}
            />
          ))}
        </ChipRow>
        <ChipRow>
          {
            <Chip
              label="Alle Kategorien"
              selected={!category}
              onPress={() => setCategory(undefined)}
            />
          }
          {MARKETPLACE_CATEGORIES.map((value) => (
            <Chip
              key={value}
              label={value}
              selected={category === value}
              onPress={() => setCategory(value)}
            />
          ))}
        </ChipRow>
      </Card>
      {listings.isPending ? (
        <LoadingView label="Einträge werden geladen …" />
      ) : listings.isError ? (
        <ErrorBox
          message={`Tauschbörse konnte nicht geladen werden: ${listings.error.message}`}
          onRetry={() => void listings.refetch()}
        />
      ) : listings.data?.length ? (
        listings.data.map((listing) => (
          <ListingCard key={listing.id} listing={listing} currentUserId={user.data?.id} />
        ))
      ) : (
        <Card>
          <EmptyText>Noch keine passenden Einträge. Stelle selbst etwas ein.</EmptyText>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  kind: { fontFamily: appFonts.bold, fontSize: 12, textTransform: 'uppercase' },
  category: { fontFamily: appFonts.semibold, fontSize: 12 },
  cardTitle: { fontFamily: appFonts.extrabold, fontSize: 19, lineHeight: 26, marginTop: 10 },
  description: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 20, marginTop: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  meta: { fontFamily: appFonts.regular, fontSize: 12 },
  price: { fontFamily: appFonts.extrabold, fontSize: 14 },
  exchange: { fontFamily: appFonts.semibold, fontSize: 13, marginTop: 10 },
  owner: { fontFamily: appFonts.regular, fontSize: 11, marginTop: 12 },
  actions: { gap: 4 },
  success: { fontFamily: appFonts.bold, fontSize: 13, marginTop: 6 },
  label: {
    fontFamily: appFonts.bold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    marginTop: 10,
    fontFamily: appFonts.regular,
    fontSize: 14,
  },
  multiline: { minHeight: 90, paddingTop: 14, textAlignVertical: 'top' },
});

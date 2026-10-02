# Umsetzung der ursprünglichen Anforderung

## Technisch umgesetzt

- Deutschlandweite Nutzung mit standortbasierter Suche und Radiusfiltern
- Haustierprofile mit Tierart, Foto und Betreuungsbedarf
- Helferprofile mit Profilfoto, Kurzvorstellung, Trust-Level und Bewertungen
- Angebote nach Betreuungsart, Tierart, Entfernung und Wochentag
- Geschützter Buchungs-Chat statt Veröffentlichung privater Kontaktdaten
- Unverbindliche Kontaktanfragen an verifizierte Helfer:innen vor der Buchung
- Dringende Betreuungsanfragen mit serverseitiger Kennzeichnung
- Hinweis auf Probetreffen, eigenen Versicherungsschutz und Haftungsabgrenzung
- Entwürfe für Nutzungsbedingungen und Datenschutzhinweise

## Vor Veröffentlichung erforderlich

1. Migrationen `050_original-requirements.sql`, `051_helper-search-filters.sql`, `052_contact_requests.sql`, `053_contact_notifications.sql`, `054_contact_request_deduplication.sql`, `055_fix_helper_search_booking_type.sql`, `056_fix_helper_search_candidate_alias.sql`, `057_fix_helper_search_group_alias.sql` und `058_fix_helper_search_species_alias.sql` nach Remote-Preflight anwenden.
2. Nutzungsbedingungen, Datenschutzhinweise, Impressum und Haftungsklauseln rechtlich prüfen lassen.
3. Verantwortliche Stelle, Löschfristen und produktive Löschjobs ergänzen.
4. Push-Zustellung dringender Anfragen auf echten Android- und iOS-Geräten testen.
5. Regionale Pilotdaten und reale Helferprofile einpflegen.
